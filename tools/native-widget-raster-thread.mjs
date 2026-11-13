import {openNativeUIPipe} from './native-ui-pipe.mjs';
const nativeAssetFields=new Set(['visible','deviceVisibility','font','texture','vectorTexture','backgroundTexture','fillTexture']);
import {parentPort,workerData,isMarkedAsUntransferable} from 'node:worker_threads';
import {NativeRuntimeTelemetry} from './native-runtime-telemetry.mjs';
import {NativeWidgetLayer} from './native-widget-layer.mjs';
import {receiveNativeWidgetFontResponse} from './native-widget-fonts.mjs';
import {openNativeContent} from './native-package-content.mjs';

const pack=await openNativeContent(workerData.directory),views=new Map(),directPipe=await openNativeUIPipe(workerData.directPipe,{acknowledged:true});let serial=0,current=0,ack;
const send=async(op,frame)=>{if(op!=='ui'||ack)throw Error('Native UI raster packet order');const id=++serial;if(directPipe)return directPipe.write(frame,id);
 const response=new Promise((resolve,reject)=>{ack={id,resolve,reject};});
 if(Buffer.isBuffer(frame.pixels)){const exclusive=frame.encoding==='pipe-rgba8-premultiplied-tiles'&&frame.pixels.byteOffset===0&&frame.pixels.byteLength===frame.pixels.buffer.byteLength&&!isMarkedAsUntransferable(frame.pixels.buffer),bytes=exclusive?new Uint8Array(frame.pixels.buffer):new Uint8Array(frame.pixels);parentPort.postMessage({type:'frame',id,frame:{...frame,pixels:bytes}},[bytes.buffer]);}else parentPort.postMessage({type:'frame',id,frame});return response;
};
const telemetry=new NativeRuntimeTelemetry({enabled:workerData.profile,label:'ui-raster'});let drawings=0,threadProfile;
let layer=new NativeWidgetLayer(pack,send,{rawFrames:workerData.rawFrames,profile:workerData.profile});
const transform=m=>({a:m.a,b:m.b,c:m.c,d:m.d,e:m.e,f:m.f});
const clip=hit=>({w:hit.w,h:hit.h,matrix:transform(hit.matrix)});
const measurements=new WeakMap();
const changedMeasurements=list=>{
 if(measurements.get(list)===list.measurementRevision)return {};
 measurements.set(list,list.measurementRevision);return {measurements:[...list.measurements],measurementItems:list.node.properties.listItems};
};
const serialize=hit=>({key:hit.view.key,id:hit.node.id,x:hit.x,y:hit.y,w:hit.w,h:hit.h,enabled:hit.enabled,scale:hit.scale,matrix:transform(hit.matrix),clips:hit.clips.map(clip),...hit.row?{row:{list:hit.row.node.id,index:hit.row.index,node:hit.node,item:hit.row.item,bindings:hit.row.bindings}}:{},...hit.list?{list:true,...hit.node.properties.autoRows?changedMeasurements(hit.list):{}}:{},...hit.max!==undefined?{max:hit.max,offset:hit.offset,thumb:hit.thumb}:{}});
parentPort.on('message',async message=>{
 if(receiveNativeWidgetFontResponse(message))return;
 if(message.type==='ack'){if(!ack||message.id!==ack.id)throw Error('Native UI raster ACK mismatch');const pending=ack;ack=null;message.error?pending.reject(Error(message.error)):pending.resolve(message.value);return;}
 if(current){parentPort.postMessage({id:message.id,error:'Native UI raster concurrency'});return;}current=message.id;
 try{
  if(message.type==='capture'){if(!layer.canvas)throw Error('Native UI raster has no surface');parentPort.postMessage({id:message.id,png:layer.canvas.toBuffer('image/png'),width:layer.canvas.width,height:layer.canvas.height});return;}
  if(message.type==='dispose'){await layer.dispose();await directPipe?.close();await pack.close();parentPort.postMessage({id:message.id});return;}
  if(message.type==='reset'){await layer.dispose();views.clear();layer=new NativeWidgetLayer(pack,send,{rawFrames:workerData.rawFrames,profile:workerData.profile});parentPort.postMessage({id:message.id});return;}
  if(message.type!=='draw')throw Error('Native UI raster command invalid');
  const live=new Set(message.rows.map(row=>row.key));for(const [key,view]of views)if(!live.has(key)){view.dispose();views.delete(key);}
  for(const row of message.rows){let view=views.get(row.key);if(row.data){view?.dispose();view=layer.create(row.data,{acceptInput:()=>false,event(){},input(){}},{owner:row.owner,instance:row.instance});view.key=row.key;view.nativeTreeRevision=0;view.nativeAssetRevision=0;views.set(row.key,view);}if(!view)throw Error('Native UI raster view missing');view.worldBox=row.worldBox;
   if(row.nodes){const nodes=view.nativeNodes??=new Map(view.data.nodes.map(node=>[node.id,node]));for(const node of row.nodes){const previous=nodes.get(node.id);if(!previous)continue;const topology=previous.id!==node.id||previous.parent!==node.parent||previous.slot.zIndex!==node.slot.zIndex;if(topology)view.nativeTreeRevision++;if(topology||previous.type!==node.type||(previous.properties.opacity===0)!==(node.properties.opacity===0)||!previous.properties.text!==!node.properties.text||!previous.properties.placeholder!==!node.properties.placeholder||['visible','deviceVisibility','font','texture','vectorTexture','backgroundTexture','fillTexture'].some(key=>previous.properties[key]!==node.properties[key]))view.nativeAssetRevision++;Object.assign(previous,node);}}
   if(row.nodeDeltas){const nodes=view.nativeNodes??=new Map(view.data.nodes.map(node=>[node.id,node]));for(const delta of row.nodeDeltas){
    const previous=nodes.get(delta.id);if(!previous)throw Error('Native UI delta target missing');
    const {propertyEdits,...envelope}=delta,topology=previous.parent!==envelope.parent||envelope.slot&&previous.slot.zIndex!==envelope.slot.zIndex;let assets=!!topology||previous.type!==envelope.type;
    for(const [key,exists,value]of propertyEdits){const old=previous.properties[key],next=exists?value:undefined;if(nativeAssetFields.has(key)&&old!==next||key==='opacity'&&(old===0)!==(next===0)||(key==='text'||key==='placeholder')&&!old!==!next)assets=true;if(!exists)delete previous.properties[key];else if(Object.hasOwn(previous.properties,key))previous.properties[key]=value;else Object.defineProperty(previous.properties,key,{value,writable:true,enumerable:true,configurable:true});}
    Object.assign(previous,envelope);if(topology)view.nativeTreeRevision++;if(assets)view.nativeAssetRevision++;
   }}for(const [id,state]of row.lists||[])view.lists.get(id)?.applyPaintState(state);view.scrollOffsets=new Map(row.scrollOffsets);
  }
  const reference=row=>{const view=views.get(row?.key),node=view?.data.nodes.find(node=>node.id===(row?.row?.list??row?.id));return view&&node?row.row?{view,node:{id:row.id},row:{node,index:row.row.index}}:{view,node}:null;};layer.setTouch(!!message.touch);layer.touches=new Map((message.touches||[]).map(([source,row])=>[source,reference(row)]).filter(([,hit])=>hit));const drop=reference(message.listDrop);layer.listDrop=drop?{hit:drop,y:message.listDrop.y,h:message.listDrop.h}:null;layer.down=reference(message.down);layer.hover=reference(message.hover);layer.focus=reference(message.focus);layer.flashes=new Set(message.flashes);layer.revision++;layer.layout=message.layout?[]:undefined;const before=layer.uiFrames;
  await layer.draw(message.width,message.height,message.pixelRatio);if(workerData.profile&&drawings++%30===0){telemetry.sample(drawings);threadProfile=telemetry.snapshot();}
  parentPort.postMessage({id:message.id,hits:layer.hits.map(serialize),scrollHits:layer.scrollHits.map(serialize),rows:[...views].map(([key,view])=>({key,scrollOffsets:[...view.scrollOffsets]})),layout:layer.layout||[],animated:!!layer.activeAnimations?.size,submitted:layer.uiFrames!==before,profile:layer.lastProfile,diagnostics:{...layer.diagnostics(),...threadProfile?{runtimeTelemetry:threadProfile}:{}}});
 }catch(error){parentPort.postMessage({id:message.id,error:error.stack});}finally{current=0;}
});
