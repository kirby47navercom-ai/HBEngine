import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {retainTestEvidence} from './test-artifacts.mjs';

const roots=process.argv.slice(2,4).map(p=>path.resolve(p));assert.equal(roots.length,2);
const work=await fs.mkdtemp('native/build/widget-delta-worker-');retainTestEvidence(work);
await fs.mkdir(work+'/Content');
await fs.writeFile(work+'/game.hbpack.json',JSON.stringify({version:1,windowsRuntime:'native',entries:[],nativeModules:[]}));
const load=(root,name)=>import(pathToFileURL(path.join(root,name)));
const {createWidgetAsset,createWidgetNode}=await load(roots[0],'prototype/ui-assets.js'),asset=createWidgetAsset('delta');
for(let i=0;i<80;i++){const node=createWidgetNode('Text','label'+i);node.name=node.id;node.parent=asset.nodes[0].id;node.slot.offset=[i%10*60,Math.floor(i/10)*35,58,30];node.properties.text='한'+i;node.properties.background='#00000000';asset.nodes.push(node);}
const states=[],pixels=[],messages=[{bytes:0,deltas:0,full:0},{bytes:0,deltas:0,full:0}];
function decode(frame,index){if(frame.encoding==='pipe-rgba8-premultiplied'){pixels[index]=Buffer.from(frame.pixels);return;}assert.equal(frame.encoding,'pipe-rgba8-premultiplied-tiles');const packet=frame.pixels,result=Buffer.from(pixels[index]);let at=4;for(let i=0;i<packet.readUInt32LE(0);i++){const x=packet.readUInt32LE(at),y=packet.readUInt32LE(at+4),w=packet.readUInt32LE(at+8),h=packet.readUInt32LE(at+12);at+=16;for(let row=0;row<h;row++){packet.copy(result,((y+row)*frame.width+x)*4,at,at+w*4);at+=w*4;}}assert.equal(at,packet.length);pixels[index]=result;}
try{
 for(const [index,root]of roots.entries()){
  const {WidgetSystem}=await load(root,'prototype/ui-runtime.js'),{NativeWidgetLayer}=await load(root,'tools/native-widget-layer.mjs');
  const layer=new NativeWidgetLayer({},async(_op,frame)=>{decode(frame,index);return {};},{rasterPackage:path.resolve(work),rawFrames:true}),owner={id:'actor',components:[]},vm={objects:[owner],object:id=>id===owner.id?owner:null,generation:1,active:true,stopping:false,bindings:[]},ui=new WidgetSystem({readAsset:async()=>structuredClone(asset),createView:layer.create}),call=(key,element,args)=>ui.operation(key,{target:'actor',instance:'HUD',element,...args},{self:'actor'},vm);
  const request=layer.raster.request.bind(layer.raster);layer.raster.request=message=>{if(message.type==='draw')for(const row of message.rows){messages[index].bytes+=Buffer.byteLength(JSON.stringify(row));messages[index].deltas+=row.nodeDeltas?.length||0;messages[index].full+=row.nodes?.length||0;}return request(message);};
  states.push({layer,ui,vm,owner,call});await call('uiShow',null,{asset:'Assets/UI/fixture.hbwidget.json'});
 }
 let cases=0;
 for(let frame=0;frame<48;frame++){
  for(const {layer,ui,vm,call}of states){
   await ui.writeBatch(async()=>{for(let i=0;i<24;i++){const id='label'+((frame*7+i)%80);await call('uiSetPosition',id,{position:[i%8*70+frame*.375,Math.floor(i/8)*45+frame*.125]});await call('uiSetOpacity',id,{opacity:(frame+i)%5/4});if(frame%3===0)await call('uiSetText',id,{text:'한글 '+frame+':'+i});if(frame%4===0)await call('uiSetRotation',id,{rotation:(frame+i)%17-8});}if(frame===13||frame===14)await call('uiSetVisible','label0',{visible:frame===14});},vm);
   const state=ui.state('actor','HUD');if(frame===18){const node=state.data.nodes.find(n=>n.name==='label3');node.properties.color='#ff8844';node.properties.scale=[1.25,.8];ui.refresh(state,vm,node);}
   if(frame===23){const node=state.data.nodes.find(n=>n.name==='label4');node.name='renamed';ui.refresh(state,vm,node);}
   if(frame===25){const node=state.data.nodes.find(n=>n.name==='renamed');node.name='label4';node.type='Button';ui.refresh(state,vm,node);}
   if(frame===27){const node=state.data.nodes.find(n=>n.name==='label4');node.type='Text';ui.refresh(state,vm,node);}
   if(frame===31||frame===32){state.data.nodes=[...state.data.nodes].reverse();ui.refresh(state,vm);}
   if(frame===34){const node=state.data.nodes.find(n=>n.name==='label6');node.properties.text='뷰 직접 수정';node.properties.fontSize=27;state.view.update(new Set([node]));}
   layer.layout=frame===19?[]:undefined;
  }
  for(const index of frame%2?[1,0]:[0,1])await states[index].layer.draw(frame<35?640:960,frame<35?360:540,frame<35?1:1.5);
  assert(pixels[0].equals(pixels[1]),'complete premultiplied UI pixels frame '+frame);const hits=layer=>layer.hits.map(h=>({id:h.node.id,w:h.w,h:h.h,m:[h.matrix.a,h.matrix.b,h.matrix.c,h.matrix.d,h.matrix.e,h.matrix.f]}));assert.deepEqual(hits(states[0].layer),hits(states[1].layer));assert.deepEqual(states[0].owner.gameplayDebug.ui,states[1].owner.gameplayDebug.ui);cases++;
 }
 assert(messages[1].deltas>500);assert(messages[1].bytes<messages[0].bytes*.5,'worker change stream carries fewer bytes without changing pixels');
 assert(messages[1].full>0,'direct view edits use full nodes instead of stale immutable rows');
 const result={passed:true,frames:cases,completePixelsEqual:true,inputGeometryEqual:true,CPPStateEqual:true,scalarAndSlotChanges:true,manualRefresh:true,untrackedViewEditFallback:true,renameAndTypeChange:true,topologyRebuild:true,scale150Percent:true,workerMessages:messages,diagnostics:states[1].layer.raster.diagnostics(),scope:'Actual common WidgetSystem -> native UI worker, full-pixel/input parity; payload bytes exclude native pixel transport and are not FPS.'};await fs.writeFile(work+'/acceptance.json',JSON.stringify(result,null,2));console.log(JSON.stringify({work,...result}));
}finally{for(const {ui,vm,layer}of states){await ui.dispose(vm);await layer.dispose();}}
