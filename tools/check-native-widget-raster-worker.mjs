import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {OrthographicCamera} from 'three';
import {createWidgetAsset,createWidgetNode} from '../prototype/ui-assets.js';
import {retainTestEvidence} from './test-artifacts.mjs';
const engine=path.resolve(process.argv[2]||'.'),{NativeWidgetLayer}=await import(pathToFileURL(path.join(engine,'tools/native-widget-layer.mjs')));
const work=await fs.mkdtemp('native/build/widget-raster-worker-');retainTestEvidence(work);await fs.mkdir(work+'/Content/Assets',{recursive:true});
await fs.writeFile(work+'/Content/Assets/picture.svg','<svg xmlns="http://www.w3.org/2000/svg" width="24" height="16"><rect width="24" height="16" fill="#30a5ef"/><circle cx="12" cy="8" r="5" fill="#ffc040"/></svg>');
await fs.writeFile(work+'/game.hbpack.json',JSON.stringify({version:1,windowsRuntime:'native',entries:[{path:'Assets/picture.svg'}],nativeModules:[]}));
const data=createWidgetAsset('raster worker');Object.assign(data,{referenceSize:[640,360],safeArea:true,safeAreaPadding:[5,7,11,13]});
const add=(type,id,offset,properties={},parent='root')=>{const node=createWidgetNode(type,id,parent);node.name=id;node.slot.offset=offset;Object.assign(node.properties,properties);data.nodes.push(node);return node;};
add('Text','text',[12,10,300,48],{text:'한글 글자와 English',fontSize:22});add('Image','picture',[380,10,130,70],{texture:'Assets/picture.svg',imageFit:'cover'});
add('Button','button',[20,90,160,45],{text:'누르기',borderWidth:2,background:'#354962'});add('CheckBox','check',[210,90,140,45],{text:'선택',checked:true});add('Slider','slider',[380,100,170,36],{value:.75});
add('Panel','panel',[20,165,180,100],{rotation:12,opacity:.6});add('Text','child',[5,5,160,70],{text:'회전과 투명\n두 번째 줄'},'panel');
add('ScrollBox','scroll',[235,165,180,95],{background:'#152030'});add('Text','scrollChild',[0,80,160,95],{text:'스크롤 내용'},'scroll');
const pack={resolve:async name=>path.resolve(work,'Content',name)},layers=[],last=[],queued=[];
for(let index=0;index<2;index++){const layer=new NativeWidgetLayer(pack,async(op,frame)=>{assert.equal(op,'ui');if(frame.encoding==='pipe-rgba8-premultiplied-tiles'){const packet=frame.pixels;let at=4;for(let i=0;i<packet.readUInt32LE(0);i++){const [x,y,w,h]=[0,4,8,12].map(n=>packet.readUInt32LE(at+n));at+=16;for(let row=0;row<h;row++){packet.copy(last[index],((y+row)*frame.width+x)*4,at,at+w*4);at+=w*4;}}assert.equal(at,packet.length);}else last[index]=Buffer.from(frame.pixels);return {ok:true,nativeUiDecodeMS:0,nativeUiPresentMS:0};},{rawFrames:true,...index?{rasterPackage:path.resolve(work),queued:()=>queued.push(performance.now())}:{}});const copy=structuredClone(data),view=layer.create(copy,{acceptInput:()=>true,event(){},input(){}},{owner:'owner',instance:'HUD'});layer.layout=[];layers.push({layer,view});}
const cases=[];
try{
 for(let frame=0;frame<16;frame++){
  for(const {layer,view}of layers){const text=view.data.nodes.find(n=>n.id==='text');text.properties.text='한글 '+frame;text.slot.offset[0]=12+frame*.375;text.properties.opacity=frame%3===0?.35:1;view.update(new Set([text]));view.scrollOffsets.set('scroll',frame*3);if(frame===3)layer.down={view,node:view.data.nodes.find(n=>n.id==='button')};if(frame===4)layer.down=null;}
  const width=frame<8?640:960,height=frame<8?360:540,ratio=frame<8?1:1.5;await layers[0].layer.draw(width,height,ratio);const before=queued.length,job=layers[1].layer.draw(width,height,ratio);assert(queued.length>before,'queue signal precedes raster completion');await job;assert.deepEqual(last[0],last[1],'all premultiplied pixels match frame '+frame);
  const describe=layer=>layer.hits.map(h=>({id:h.node.id,w:h.w,h:h.h,matrix:[h.matrix.a,h.matrix.b,h.matrix.c,h.matrix.d,h.matrix.e,h.matrix.f],clips:h.clips.map(c=>({w:c.w,h:c.h,matrix:[c.matrix.a,c.matrix.b,c.matrix.c,c.matrix.d,c.matrix.e,c.matrix.f]}))}));assert.deepEqual(describe(layers[0].layer),describe(layers[1].layer));assert.deepEqual(layers[0].layer.layout,layers[1].layer.layout);cases.push({frame,width,height,bytes:last[0].length});
 }
 const worker=layers[1].layer.raster.worker;assert(worker.threadId>0);const capture=await layers[1].layer.raster.capture();assert.equal(capture.width,960);await fs.writeFile(work+'/worker.png',capture.png);
 const listViews=[];for(const {layer}of layers){const asset=createWidgetAsset('list fixture'),list=createWidgetNode('ListView','list');list.name='list';list.parent='root';list.slot.offset=[450,210,150,100];asset.nodes.push(list);listViews.push(layer.create(asset,{acceptInput:()=>true,event(){},input(){}},{owner:'owner',instance:'List'}));}
 await layers[1].layer.draw(960,540,1.5);assert.equal(layers[1].layer.raster.active,true,'lists retain owner-thread input while painting on the worker');
 for(const view of listViews)view.dispose();
 await layers[0].layer.draw(960,540,1.5);await layers[1].layer.draw(960,540,1.5);assert.deepEqual(last[0],last[1]);
 const {layer,view}=layers[1],send=layer.send;let received,release;const arrived=new Promise(r=>received=r),gate=new Promise(r=>release=r);layer.send=async(...args)=>{received();await gate;return send(...args);};view.data.nodes.find(n=>n.id==='text').properties.text='비동기 스크롤';view.update();const pending=layer.draw(960,540,1.5);await arrived;view.scrollOffsets.set('scroll',71);layer.revision++;release();await pending;assert.equal(view.scrollOffsets.get('scroll'),71,'old raster completion must not overwrite new input');layer.send=send;
 const baseline=layers[0];
 baseline.view.data.nodes.find(n=>n.id==='text').properties.text='비동기 스크롤';baseline.view.update();baseline.view.scrollOffsets.set('scroll',71);
 await layers[0].layer.draw(960,540,1.5);
 await layers[1].layer.draw(960,540,1.5);
 assert.ok(last[0].equals(last[1]),'touch starts from the same previous frame');
 const touchReports=[];
 for(const {layer} of layers){
  const asset=createWidgetAsset('터치 검증'),stick=createWidgetNode('Joystick','joystick','root'),button=createWidgetNode('TouchButton','attack','root');
  asset.referenceSize=[640,360];
  stick.slot.offset=[15,200,135,320];button.slot.offset=[515,200,620,320];
  Object.assign(stick.properties,{deviceVisibility:'touch',keyRight:'d',inputMode:'keys'});
  Object.assign(button.properties,{deviceVisibility:'touch',inputKey:'f'});
  asset.nodes.push(stick,button);
  const keys=new Map(),events=[];
  const view=layer.create(asset,{acceptInput:()=>true,event:(node,event)=>events.push([node.id,event]),input:(key,value,source)=>keys.set(source+':'+key,value)},{owner:'touch',instance:'Controls'});
  const point=(id,x,y)=>{const {matrix:m,w,h}=layer.hits.find(hit=>hit.node.id===id);return [m.e+m.a*w*x+m.c*h*y,m.f+m.b*w*x+m.d*h*y];};
  const send=(id,position,key,value,cancelled)=>layer.input({device:'touch',source:'contact:'+id,key,value,cancelled,pointer:{position,size:[960,540],inside:true}});
  await layer.draw(960,540,1.5);
  assert.ok(!layer.hits.some(hit=>hit.node.id==='joystick'));
  layer.setTouch(true);await layer.draw(960,540,1.5);
  const move=point('joystick',.9,.5),attack=point('attack',.5,.5);
  assert.equal(send(1,move,'leftmousebutton',1),true);
  assert.equal(send(2,attack,'leftmousebutton',1),true);
  assert.ok(keys.get('contact:1:d')>0);
  assert.equal(keys.get('contact:2:f'),1);
  await layer.draw(960,540,1.5);
  touchReports.push(Buffer.from(last[layers.findIndex(row=>row.layer===layer)]));
  assert.equal(send(2,attack,'leftmousebutton',0),true);
  assert.equal(keys.get('contact:2:f'),0);
  assert.ok(keys.get('contact:1:d')>0);
  assert.ok(events.some(([node,event])=>node==='attack'&&event==='click'));
  assert.equal(send(1,move,'leftmousebutton',0,true),true);
  assert.equal(keys.get('contact:1:d'),0);
  assert.equal(layer.touches.size,0);
  send(1,move,'leftmousebutton',1);view.dispose();
  assert.equal(keys.get('contact:1:d'),0);
  layer.setTouch(false);
 }
 assert.ok(touchReports[0].equals(touchReports[1]),'two simultaneous touch presses produce equal worker pixels');
 const lists=[];
 for(const {layer} of layers){
  const data=createWidgetAsset('자동 높이'),list=createWidgetNode('ListView','auto','root');
  list.slot.offset=[300,120,150,175];
  Object.assign(list.properties,{autoRows:true,wrap:true,rowHeight:24,fontSize:20,listItems:JSON.stringify(['여러 줄을 만드는 긴 한글과 영문 텍스트. Long text for measurement.','짧음','세 번째'])});
  data.nodes.push(list);
  const view=layer.create(data,{acceptInput:()=>true,event(){},input(){}},{owner:'auto',instance:'Rows'});lists.push(view);
  await layer.draw(960,540,1.5);
  assert.ok(view.lists.get('auto').layout.rows[0].height>48);
 }
 assert.ok(last[0].equals(last[1]),'auto rows produce equal pixels');
 assert.equal(lists[0].lists.get('auto').offset(1),lists[1].lists.get('auto').offset(1));
 lists.forEach(view=>view.dispose());
 const camera=new OrthographicCamera(-4,4,2,-2,.1,100);camera.position.z=5;camera.updateMatrixWorld();
 const anchor={id:'marker',position:[1,0,0],rotation:[0,0,0],scale:[1,1,1],visible:true,components:[{type:'UIWidget',properties:{instance:'Marker',space:'tracked',drawWidth:320,drawHeight:180,pivotX:.5,pivotY:.5}}]};
 const vm={objects:[anchor],object:id=>id===anchor.id?anchor:null};
 const tracked=[];
 for(const {layer} of layers){
  const data=createWidgetAsset('추적 UI'),button=createWidgetNode('Button','tracked','root');button.slot.offset=[0,0,120,40];data.nodes.push(button);
  tracked.push(layer.create(data,{acceptInput:()=>true,event(){},input(){}},{owner:'marker',instance:'Marker'}));
 }
 for(const x of [1,2,30]){
  anchor.position[0]=x;
  for(const {layer} of layers){layer.placeWorld(vm,camera,960,540);await layer.draw(960,540,1.5);}
  assert.ok(last[0].equals(last[1]),'tracked UI produces equal worker pixels');
  if(x<30){
   assert.equal(tracked[0].worldBox.x,480+120*x-160);
   assert.ok(layers[1].layer.hits.some(hit=>hit.node.id==='tracked'));
  }else{
   assert.equal(tracked[0].worldBox,false);
   assert.ok(!layers[1].layer.hits.some(hit=>hit.node.id==='tracked'));
  }
 }
 const report={passed:true,touchControls:true,trackedWidgets:true,cases,allPixelsEqual:true,korean:true,svg:true,safeArea:true,fractionalTransforms:true,opacity:true,pressedButton:true,scroll:true,inputHitGeometry:true,scale150Percent:true,oneWorker:true,queuedBeforeRaster:true,listsRemainOnWorker:true,workerResume:true,concurrentScrollPreserved:true};await fs.writeFile(work+'/acceptance.json',JSON.stringify(report,null,2));console.log(JSON.stringify({work,...report,cases:cases.length}));
}finally{await Promise.all(layers.map(({layer})=>layer.dispose()));}
