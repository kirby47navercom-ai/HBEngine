import {worldPatch} from '../prototype/native-transport.js';
import {nativeWidgetRowSnapshot} from '../prototype/ui-runtime.js';
import {Worker} from 'node:worker_threads';
import {NativeWidgetFontConnection} from './native-widget-fonts.mjs';
import {resetNativeUIFrame} from './native-ui-frame.mjs';

const viewKey=view=>JSON.stringify([view.state.owner,view.state.instance]);
// One UI raster job, one immutable message, one acknowledged surface at a time.
// Input and the game world stay on their original owner thread.
export class NativeWidgetRasterWorker {
 constructor(layer,directory,queued,directPipe){this.directPipe=directPipe;this.layer=layer;this.directory=directory;this.queued=queued;this.views=new Map();this.listStates=new Map();this.nodeSnapshots=new Map();this.readySnapshots=new Set();this.deltaNodes=0;this.fullNodes=0;this.dirty=new Map();this.serial=0;this.active=false;this.failure=null;}
 trustSnapshots(view){if(!view.disposed)this.readySnapshots.add(view);}
 invalidate(view,nodes){this.readySnapshots.delete(view);if(view.disposed)return;if(!nodes||!this.dirty.has(view))this.dirty.set(view,nodes?new Set(nodes):null);else if(this.dirty.get(view))for(const node of nodes)this.dirty.get(view).add(node);}
 forget(view){this.readySnapshots.delete(view);this.nodeSnapshots.delete(view);this.listStates.delete(view);this.dirty.delete(view);const key=viewKey(view);if(this.views.get(key)===view)this.views.delete(key);}
 supports(){return true;}
 start(){
  if(this.worker)return;this.fontConnection=new NativeWidgetFontConnection();this.worker=new Worker(new URL('./native-widget-raster-thread.mjs',import.meta.url),{workerData:{directory:this.directory,rawFrames:!!this.directPipe||this.layer.rawFrames,directPipe:this.directPipe,profile:this.layer.profile},execArgv:[]});
  this.worker.on('message',message=>{
   if(message.type==='font'){this.fontConnection.request(message).then(value=>this.worker?.postMessage({type:'fontResponse',id:message.id,value}),error=>this.worker?.postMessage({type:'fontResponse',id:message.id,error:error.message}));return;}
   if(message.type==='frame'){
    const frame=message.frame;if(frame.pixels instanceof Uint8Array)frame.pixels=Buffer.from(frame.pixels.buffer,frame.pixels.byteOffset,frame.pixels.byteLength);
    Promise.resolve().then(()=>this.layer.send('ui',frame)).then(value=>this.worker?.postMessage({type:'ack',id:message.id,value}),error=>this.worker?.postMessage({type:'ack',id:message.id,error:error.message}));return;
   }
   if(!this.pending||message.id!==this.pending.id){this.fail(Error('Native UI raster response mismatch'));return;}
   const pending=this.pending;this.pending=null;if(message.error)pending.reject(Error(message.error));else pending.resolve(message);
  });
  this.worker.on('error',error=>this.fail(error));this.worker.on('exit',code=>{if(!this.closing)this.fail(Error('Native UI raster worker exited: '+code));});
 }
 fail(error){this.fontConnection?.dispose();this.failure??=error;if(this.pending){this.pending.reject(this.failure);this.pending=null;}}
 request(message){if(this.failure)return Promise.reject(this.failure);if(this.pending)return Promise.reject(Error('Native UI raster job already active'));this.start();const id=++this.serial;return new Promise((resolve,reject)=>{this.pending={id,resolve,reject};try{this.worker.postMessage({...message,id});}catch(error){this.pending=null;reject(error);}});}
 async fallback(){if(!this.active)return;await this.request({type:'reset'});this.views.clear();this.nodeSnapshots.clear();this.readySnapshots.clear();this.dirty.clear();this.active=false;this.layer.stamp='';if(this.layer.canvas)resetNativeUIFrame(this.layer.canvas);}
 async draw(width,height,pixelRatio){
  if(this.failure)throw this.failure;const layer=this.layer,stamp=width+':'+height+':'+pixelRatio+':'+layer.revision;
  if(this.active&&stamp===layer.stamp&&!this.animated){this.queued?.();if(layer.profile)layer.lastProfile={changed:false,assetsMS:0,paintMS:0,encodeMS:0,submitMS:0,totalMS:0};return;}
  if(!this.active&&!layer.views.size&&!layer.flashes?.size){this.queued?.();layer.stamp=stamp;return;}
  const rows=[],live=new Set(),scrollBefore=new Map();for(const view of layer.views){const key=viewKey(view);live.add(key);scrollBefore.set(view,new Map(view.scrollOffsets));const old=this.views.get(key),dirty=this.dirty.get(view),changed=this.dirty.has(view);let update;
   if(!old||old!==view||changed&&!dirty){update={data:view.data};this.nodeSnapshots.set(view,new Map(view.data.nodes.map(node=>[node.id,nativeWidgetRowSnapshot(view.state,node)])));}
   else if(changed){const sent=this.nodeSnapshots.get(view)||new Map(),nodes=[],nodeDeltas=[];this.nodeSnapshots.set(view,sent);for(const node of dirty){
    const snapshot=nativeWidgetRowSnapshot(view.state,node),previous=sent.get(node.id),patch=this.readySnapshots.has(view)&&snapshot&&previous&&!['ListView','TreeView','Widget','NamedSlot'].includes(node.type)?worldPatch(previous,snapshot):null;
    if(patch){const keys=new Set(patch.map(edit=>edit.path.slice(1).split('/')[0].replace(/~1/g,'/').replace(/~0/g,'~'))),{properties,slot,...envelope}=node,propertyEdits=[];for(const key of keys)if(key!=='slot'&&key!=='type')propertyEdits.push([key,Object.hasOwn(properties,key),properties[key]]);nodeDeltas.push({...envelope,propertyEdits,...keys.has('slot')?{slot}:{}});this.deltaNodes++;}
    else{nodes.push(node);this.fullNodes++;}sent.set(node.id,snapshot);
   }update={...nodes.length?{nodes}:{},...nodeDeltas.length?{nodeDeltas}:{}};}
   const lists=[];let versions=this.listStates.get(view);if(!versions){versions=new Map();this.listStates.set(view,versions);}for(const [id,list]of view.lists){const state=list.paintState();if(update?.data||versions.get(id)!==state.revision){lists.push([id,state]);versions.set(id,state.revision);}}
   rows.push({key,owner:view.state.owner,instance:view.state.instance,worldBox:view.worldBox,...update,...lists.length?{lists}:{},scrollOffsets:[...view.scrollOffsets]});this.views.set(key,view);this.dirty.delete(view);
  }
  for(const key of this.views.keys())if(!live.has(key)){this.readySnapshots.delete(this.views.get(key));this.nodeSnapshots.delete(this.views.get(key));this.views.delete(key);}
  const reference=hit=>hit?{key:viewKey(hit.view),id:hit.node.id}:null;
  const job=this.request({type:'draw',width,height,pixelRatio,rows,flashes:[...(layer.flashes||[])],down:reference(layer.down),hover:reference(layer.hover),focus:reference(layer.focus),listDrop:layer.listDrop?{...reference(layer.listDrop.hit),y:layer.listDrop.y,h:layer.listDrop.h}:null,touch:layer.touch,touches:[...layer.touches].map(([source,hit])=>[source,reference(hit)]),layout:Array.isArray(layer.layout)});this.queued?.();
  const result=await job;this.active=true;this.animated=result.animated;
  const lookup=(key,id)=>{const view=this.views.get(key),node=view?.data.nodes.find(node=>node.id===id);return view&&node?{view,node}:null;};
  const hit=row=>{const target=lookup(row.key,row.id);if(!target)return null;return {...row,...target,...row.list?{list:target.view.lists.get(target.node.id)}:{},clips:row.clips.map(clip=>({...clip}))};};
  layer.hits=result.hits.map(hit).filter(Boolean);
  for(const row of layer.hits)if(row.measurements&&row.measurementItems===row.node.properties.listItems)row.list?.applyMeasurements(row.measurements);layer.scrollHits=result.scrollHits.map(hit).filter(Boolean);
  // Input for N+1 can arrive while N paints. Clamp only offsets that input has
  // not changed since N was submitted; an old completion cannot undo a scroll.
  for(const row of result.rows){const view=this.views.get(row.key),before=scrollBefore.get(view);if(!view||!before||!layer.views.has(view))continue;for(const [id,value]of row.scrollOffsets)if(Object.is(view.scrollOffsets.get(id),before.get(id)))view.scrollOffsets.set(id,value);}
  for(const key of ['focus','down']){const previous=layer[key];if(previous){const next=layer.hits.find(hit=>hit.view===previous.view&&hit.node===previous.node)||previous;if(key==='down'&&previous.pressedRow!==undefined)next.pressedRow=previous.pressedRow;layer[key]=next;}}
  for(const [source,previous] of layer.touches){const next=layer.hits.find(hit=>hit.view===previous.view&&hit.node===previous.node);if(next){next.pressedRow=previous.pressedRow;layer.touches.set(source,next);}else layer.releaseTouch(source);}
  if(Array.isArray(layer.layout))layer.layout.splice(0,layer.layout.length,...result.layout);layer.stamp=stamp;layer.uiFrames+=result.submitted?1:0;layer.lastProfile=result.profile;this.stats=result.diagnostics;
 }
 diagnostics(){return {enabled:true,directTransport:!!this.directPipe,thread:this.worker?.threadId??null,dirtyViews:this.dirty.size,deltaNodes:this.deltaNodes,fullNodes:this.fullNodes,trackedViews:this.views.size,...this.stats};}
 async capture(){return this.request({type:'capture'});}
 async dispose(){this.closing=true;if(this.worker&&!this.pending&&!this.failure)try{await this.request({type:'dispose'});}catch{}this.fail(Error('Native UI raster disposed'));const worker=this.worker;this.worker=null;if(worker)await worker.terminate();this.views.clear();this.nodeSnapshots.clear();this.readySnapshots.clear();this.listStates.clear();this.dirty.clear();}
}
