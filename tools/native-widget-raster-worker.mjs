import {Worker} from 'node:worker_threads';
import {resetNativeUIFrame} from './native-ui-frame.mjs';

const viewKey=view=>JSON.stringify([view.state.owner,view.state.instance]);
// One UI raster job, one immutable message, one acknowledged surface at a time.
// Input and the game world stay on their original owner thread.
export class NativeWidgetRasterWorker {
 constructor(layer,directory,queued){this.layer=layer;this.directory=directory;this.queued=queued;this.views=new Map();this.dirty=new Map();this.serial=0;this.active=false;this.failure=null;}
 invalidate(view,nodes){if(!nodes||!this.dirty.has(view))this.dirty.set(view,nodes?new Set(nodes):null);else if(this.dirty.get(view))for(const node of nodes)this.dirty.get(view).add(node);}
 supports(){return ![...this.layer.views].some(view=>view.data.nodes.some(node=>['ListView','TreeView'].includes(node.type)));}
 start(){
  if(this.worker)return;this.worker=new Worker(new URL('./native-widget-raster-thread.mjs',import.meta.url),{workerData:{directory:this.directory,rawFrames:this.layer.rawFrames,profile:this.layer.profile},execArgv:[]});
  this.worker.on('message',message=>{
   if(message.type==='frame'){
    const frame=message.frame;if(frame.pixels instanceof Uint8Array)frame.pixels=Buffer.from(frame.pixels.buffer,frame.pixels.byteOffset,frame.pixels.byteLength);
    Promise.resolve().then(()=>this.layer.send('ui',frame)).then(value=>this.worker?.postMessage({type:'ack',id:message.id,value}),error=>this.worker?.postMessage({type:'ack',id:message.id,error:error.message}));return;
   }
   if(!this.pending||message.id!==this.pending.id){this.fail(Error('Native UI raster response mismatch'));return;}
   const pending=this.pending;this.pending=null;if(message.error)pending.reject(Error(message.error));else pending.resolve(message);
  });
  this.worker.on('error',error=>this.fail(error));this.worker.on('exit',code=>{if(!this.closing)this.fail(Error('Native UI raster worker exited: '+code));});
 }
 fail(error){this.failure??=error;if(this.pending){this.pending.reject(this.failure);this.pending=null;}}
 request(message){if(this.failure)return Promise.reject(this.failure);if(this.pending)return Promise.reject(Error('Native UI raster job already active'));this.start();const id=++this.serial;return new Promise((resolve,reject)=>{this.pending={id,resolve,reject};try{this.worker.postMessage({...message,id});}catch(error){this.pending=null;reject(error);}});}
 async fallback(){if(!this.active)return;await this.request({type:'reset'});this.views.clear();this.dirty.clear();this.active=false;this.layer.stamp='';if(this.layer.canvas)resetNativeUIFrame(this.layer.canvas);}
 async draw(width,height,pixelRatio){
  if(this.failure)throw this.failure;const layer=this.layer,stamp=width+':'+height+':'+pixelRatio+':'+layer.revision;
  if(this.active&&stamp===layer.stamp&&!this.animated){this.queued?.();if(layer.profile)layer.lastProfile={changed:false,assetsMS:0,paintMS:0,encodeMS:0,submitMS:0,totalMS:0};return;}
  if(!this.active&&!layer.views.size&&!layer.flashes?.size){this.queued?.();layer.stamp=stamp;return;}
  const rows=[],live=new Set(),scrollBefore=new Map();for(const view of layer.views){const key=viewKey(view);live.add(key);scrollBefore.set(view,new Map(view.scrollOffsets));const old=this.views.get(key),dirty=this.dirty.get(view),changed=this.dirty.has(view);let update;
   if(!old||old!==view||changed&&!dirty)update={data:view.data};else if(changed)update={nodes:[...dirty]};
   rows.push({key,owner:view.state.owner,instance:view.state.instance,...update,scrollOffsets:[...view.scrollOffsets]});this.views.set(key,view);this.dirty.delete(view);
  }
  for(const key of this.views.keys())if(!live.has(key))this.views.delete(key);
  const reference=hit=>hit?{key:viewKey(hit.view),id:hit.node.id}:null;
  const job=this.request({type:'draw',width,height,pixelRatio,rows,flashes:[...(layer.flashes||[])],down:reference(layer.down),hover:reference(layer.hover),focus:reference(layer.focus),layout:Array.isArray(layer.layout)});this.queued?.();
  const result=await job;this.active=true;this.animated=result.animated;
  const lookup=(key,id)=>{const view=this.views.get(key),node=view?.data.nodes.find(node=>node.id===id);return view&&node?{view,node}:null;};
  const hit=row=>{const target=lookup(row.key,row.id);if(!target)return null;return {...row,...target,clips:row.clips.map(clip=>({...clip}))};};
  layer.hits=result.hits.map(hit).filter(Boolean);layer.scrollHits=result.scrollHits.map(hit).filter(Boolean);
  // Input for N+1 can arrive while N paints. Clamp only offsets that input has
  // not changed since N was submitted; an old completion cannot undo a scroll.
  for(const row of result.rows){const view=this.views.get(row.key),before=scrollBefore.get(view);if(!view||!before||!layer.views.has(view))continue;for(const [id,value]of row.scrollOffsets)if(Object.is(view.scrollOffsets.get(id),before.get(id)))view.scrollOffsets.set(id,value);}
  for(const key of ['focus','down']){const previous=layer[key];if(previous)layer[key]=layer.hits.find(hit=>hit.view===previous.view&&hit.node===previous.node)||previous;}
  if(Array.isArray(layer.layout))layer.layout.splice(0,layer.layout.length,...result.layout);layer.stamp=stamp;layer.uiFrames+=result.submitted?1:0;layer.lastProfile=result.profile;this.stats=result.diagnostics;
 }
 diagnostics(){return {enabled:true,thread:this.worker?.threadId??null,...this.stats};}
 async capture(){return this.request({type:'capture'});}
 async dispose(){this.closing=true;this.fail(Error('Native UI raster disposed'));const worker=this.worker;this.worker=null;if(worker)await worker.terminate();this.views.clear();this.dirty.clear();}
}
