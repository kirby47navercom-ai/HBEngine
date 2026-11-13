import {NativeWidgetRasterWorker} from './native-widget-raster-worker.mjs';
import {NativeWidgetList} from './native-widget-lists.mjs';
import {nativeWidgetVisible,visibleWidgetAssets} from './native-widget-assets.mjs';
import {encodeNativeUIFrame,acknowledgeNativeUIFrame,resetNativeUIFrame,nativeUIFrameMemory} from './native-ui-frame.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createCanvas} from '@napi-rs/canvas';
import {NativeWidgetFonts} from './native-widget-fonts.mjs';
import {widgetScale,widgetDefaults,createWidgetAsset,createWidgetNode,widgetImageSource,widgetContainers} from '../prototype/ui-assets.js';
import {paintWidgetImage,paintWidgetText,widgetFlexBox,clearWidgetPaintCaches,beginWidgetPaint,invalidateWidgetTextState} from './native-widget-paint.mjs';
import {nativeWidgetImage,NativeWebPAnimation,NativeSVGImage} from './native-webp-animation.mjs';
import {stickValue} from '../prototype/virtual-controls.js';
import {worldWidgetPlacement} from '../prototype/world-widget.js';
import {componentDefaults} from '../prototype/scene-components.js';

const interactive=new Set(['Button','TouchButton','Slider','CheckBox','TextInput','Joystick','DPad','TouchPad','ListView','TreeView']);
const textWidgets=new Set(['Text','Button','TouchButton','TextInput','CheckBox']);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const local=(hit,x,y)=>{const m=hit.matrix,d=m.a*m.d-m.b*m.c,dx=x-m.e,dy=y-m.f;return d?[(m.d*dx-m.c*dy)/d,(m.a*dy-m.b*dx)/d]:[Infinity,Infinity];};
const within=(hit,x,y)=>{const [lx,ly]=local(hit,x,y);return lx>=0&&ly>=0&&lx<hit.w&&ly<hit.h;};
const contains=(hit,x,y)=>hit.enabled&&within(hit,x,y)&&(hit.clips||[]).every(clip=>within(clip,x,y));

export class NativeWidgetLayer {
 constructor(pack,send,{profile=false,rawFrames=false,rasterPackage,rasterPipe,queued}={}){this.profile=profile;this.rawFrames=rawFrames;this.raster=rasterPackage?new NativeWidgetRasterWorker(this,rasterPackage,queued,rasterPipe):null;this.pack=pack;this.send=send;this.views=new Set();this.ownedViews=new Set();this.images=new Map();this.fontStore=new NativeWidgetFonts(pack);this.fonts=this.fontStore.families;this.stamp='';this.hits=[];this.pointer=[0,0];this.focus=null;this.down=null;this.uiFrames=0;this.revision=1;this.scrollHits=[];this.modifiers={};this.touch=false;this.touches=new Map();}
 legacy=(key,a,b,vm)=>{this.legacyWidgets??=new Map();if(key==='createWidget'){if(!['Text','Button','Panel'].includes(a.class))throw Error('지원 위젯 클래스: Text, Button, Panel');const id=crypto.randomUUID(),data=createWidgetAsset(a.class),node=createWidgetNode(a.class,'value');data.nodes.push(node);const view=this.create(data,{acceptInput:()=>vm.active&&!vm.stopping,event:()=>{},input:()=>{}},{owner:id,instance:id});this.views.delete(view);this.legacyWidgets.set(id,view);vm.objects.push({id,name:a.class,kind:'widget',visible:false,position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]});return {widget:id};}const view=this.legacyWidgets.get(a.widget);if(!view)throw Error('위젯 참조가 없어요.');if(key==='setText'){view.data.nodes[1].properties.text=a.text;vm.object(a.widget).text=a.text;this.raster?.invalidate(view);}else{this.views.add(view);vm.object(a.widget).visible=true;}this.revision++;return {};};
 flash=({color})=>{const layer=this,entry={color,alpha:1};this.flashes??=new Set();this.flashes.add(entry);this.revision++;return {style:{set opacity(v){entry.alpha=Number(v);layer.revision++;}},remove(){layer.flashes.delete(entry);layer.revision++;}};};
 create=(data,options,state)=>{const thisLayer=this,view={data,options,state,nativeSnapshotsReady:()=>this.raster?.trustSnapshots(view),elements:new Map(),lists:new Map(),scrollOffsets:new Map(),update:nodes=>{this.revision++;this.raster?.invalidate(view,nodes);if(this.down?.view===view&&(this.down.node.properties.enabled===false||this.down.node.properties.visible===false))this.release();for(const [source,hit] of this.touches)if(hit.view===view&&(!nativeWidgetVisible(hit.node,this.touch)||hit.node.properties.enabled===false))this.releaseTouch(source);},fontsReady:async(assets=visibleWidgetAssets(data,view.assetScale||1,this.touch))=>{if(view.disposed)return;const revision=this.fontStore.revision;await this.fontStore.prepare(assets);this.defaultFont=this.fontStore.defaultsReady;if(this.fontStore.revision!==revision&&this.canvas)clearWidgetPaintCaches(this.canvas.getContext('2d'));if(view.disposed){this.pruneFonts();return;}for(const name of assets.images)if(!this.images.has(name))this.images.set(name,await nativeWidgetImage(this.pack.readBytes?await this.pack.readBytes(name):await fs.readFile(await this.pack.resolve(name))));this.pruneImages();this.pruneFonts();},endFrame:()=>{},resetControls:()=>{if(this.down?.view===view)this.release();for(const [source,hit] of this.touches)if(hit.view===view)this.releaseTouch(source);},dispose:()=>{if(view.disposed)return;view.disposed=true;this.raster?.forget(view);view.resetControls();for(const list of view.lists.values())list.dispose();view.lists.clear();this.views.delete(view);this.ownedViews.delete(view);this.hits=this.hits.filter(hit=>hit.view!==view);this.scrollHits=this.scrollHits.filter(hit=>hit.view!==view);if(this.scrollDrag?.view===view)this.scrollDrag=null;this.pruneImages();this.pruneFonts();this.revision++;if(this.focus?.view===view)this.focus=null;}};for(const node of data.nodes)view.elements.set(node.id,{get scrollTop(){return view.scrollOffsets.get(node.id)||0;},set scrollTop(value){if(!Number.isFinite(value))throw Error('스크롤 위치를 확인하세요.');view.scrollOffsets.set(node.id,Math.max(0,value));thisLayer.revision++;},querySelector:()=>null,focus:()=>{const hit=this.hits.find(h=>h.view===view&&h.node===node);this.event(this.focus,'blur');this.focus=hit;this.event(hit,'focus');}});for(const node of data.nodes)if(['ListView','TreeView'].includes(node.type))view.lists.set(node.id,new NativeWidgetList(node,{changed:node=>view.options.event(node,'changed'),invalidate:()=>{this.revision++;this.raster?.invalidate(view,new Set([node]));}}));const prepare=view.fontsReady;let assetStamp,assetPlan,assetPlanKey;
view.visibleAssets=(scale=view.assetScale||1)=>{const planKey=view.nativeAssetRevision===undefined?null:scale+':'+view.nativeAssetRevision+':'+this.touch;if(planKey===null||planKey!==assetPlanKey){assetPlan=visibleWidgetAssets(data,scale,this.touch);assetPlanKey=planKey;}return assetPlan;};
view.fontsReady=async(scale=view.assetScale||1)=>{view.assetScale=scale;if(this.raster?.supports())return;const assets=view.visibleAssets(scale),stamp=Number(assets.text)+':'+[...assets.fonts].sort().join('\0')+':'+[...assets.images].sort().join('\0');if(stamp===assetStamp&&(!assets.text||this.fontStore.defaultsReady)&&[...assets.fonts].every(name=>this.fonts.has(name))&&[...assets.images].every(name=>this.images.has(name)))return;await prepare(assets);assetStamp=stamp;};this.ownedViews.add(view);this.views.add(view);this.revision++;return view;};
 pruneFonts(){const used=new Set();for(const view of this.views)for(const name of view.visibleAssets().fonts)used.add(name);const before=this.fontStore.revision;this.fontStore.prune(used);if(this.canvas&&before!==this.fontStore.revision)clearWidgetPaintCaches(this.canvas.getContext('2d'));}
 pruneImages(){const used=new Set();for(const view of this.ownedViews)for(const name of visibleWidgetAssets(view.data,view.assetScale||1,this.touch).images)used.add(name);for(const name of this.images.keys())if(!used.has(name)){this.images.get(name)?.dispose?.();this.images.delete(name);}}
 event(hit,type){this.revision++;if(hit)this.raster?.invalidate(hit.view,new Set([hit.node]));if(hit?.view.options.acceptInput())hit.view.options.event(hit.node,type);}
 placeWorld(vm,camera,width,height){
  for(const view of this.views){
   const object=vm.object(view.state.owner),component=object?.components?.find(row=>row.type==='UIWidget'&&row.properties?.enabled!==false&&(row.properties?.instance||'HUD')===view.state.instance);
   const p=component?.properties;
   if(p?.space!=='tracked'&&view.worldBox==null)continue;
   let box=null;
   if(p?.space==='tracked'){
    const settings={...componentDefaults('UIWidget'),...p};
    const placed=worldWidgetPlacement(object,vm.objects,camera,width,height,settings);
    if(placed.visible){
     const w=settings.drawWidth*placed.scale,h=settings.drawHeight*placed.scale;
     box={x:placed.x-w*settings.pivotX,y:placed.y-h*settings.pivotY,w,h,depth:placed.depth};
    }else box=false;
   }
   const old=view.worldBox;
   if(old!==box&&(!old||!box||old.x!==box.x||old.y!==box.y||old.w!==box.w||old.h!==box.h||old.depth!==box.depth)){
    view.worldBox=box;this.revision++;
    if(box===false)view.resetControls();
   }
  }
 }
 setTouch(enabled){
  if(this.touch===enabled)return;
  this.touch=enabled;this.revision++;
  if(!enabled)for(const source of this.touches.keys())this.releaseTouch(source);
 }
 pressed(node,view){for(const hit of this.touches.values())if(hit.node===node&&hit.view===view)return true;return false;}
 releaseInput(){this.modifiers={};this.release();for(const source of this.touches.keys())this.releaseTouch(source);}
 releaseTouch(source){
  const hit=this.touches.get(source);
  if(!hit)return null;
  this.touches.delete(source);this.virtual(hit,0,0,false,source);this.event(hit,'released');return hit;
 }
 touchInput(packet){
  if(!packet.source)return false;
  if(packet.cancelled)return !!this.releaseTouch(packet.source);
  if(!packet.pointer)return false;
  const {source,key,value}=packet,point=packet.pointer.position;
  const current=this.touches.get(source);
  if(current&&!key){
   if(current.view.disposed||!nativeWidgetVisible(current.node,this.touch)||current.node.properties.enabled===false||!current.view.options.acceptInput()){this.releaseTouch(source);return true;}
   this.virtual(current,...point,true,source);if(current.node.type==='Slider')this.slider(current,point);return true;
  }
  if(key!=='leftmousebutton')return false;
  const hit=this.hits.findLast(row=>contains(row,...point)&&nativeWidgetVisible(row.node,this.touch)&&row.node.properties.enabled!==false&&row.view.options.acceptInput());
  if(value){
   if(!hit)return false;
   if(current)this.releaseTouch(source);
   if(this.focus!==hit){this.event(this.focus,'blur');this.focus=hit;this.event(hit,'focus');}
   this.touches.set(source,hit);this.event(hit,'pressed');this.virtual(hit,...point,true,source);
   if(hit.node.type==='Slider')this.slider(hit,point);
   if(hit.list)hit.pressedRow=hit.list.layout.at((local(hit,...point)[1]+(hit.view.scrollOffsets.get(hit.node.id)||0))/hit.scale);
   return true;
  }
  const old=this.releaseTouch(source);
  if(!old)return false;
  if(hit?.node===old.node&&hit.view===old.view){
   if(hit.list){
    const [x,y]=local(hit,...point),offset=hit.view.scrollOffsets.get(hit.node.id)||0;
    if(old.pressedRow===hit.list.layout.at((y+offset)/hit.scale))hit.list.click(x,y,hit.scale,offset,this.modifiers);
   }else if(hit.node.type==='CheckBox'){hit.node.properties.checked=!hit.node.properties.checked;this.event(hit,'changed');}
   else if(['Button','TouchButton'].includes(hit.node.type))this.event(hit,'click');
  }
  return true;
 }
 release(){this.scrollDrag=null;const hit=this.down;if(!hit)return;this.down=null;this.virtual(hit,0,0,false);this.event(hit,'released');}
 virtual(hit,x,y,pressed,contact=''){if(!hit)return;const p={...widgetDefaults,...hit.node.properties},type=hit.node.type,source=contact||'native-ui:'+hit.view.state.owner+':'+hit.node.id,write=(key,value)=>hit.view.options.input(key,value,source);if(type==='TouchButton'){write(p.inputKey,pressed?1:0);return;}if(!['Joystick','DPad','TouchPad'].includes(type))return;const point=local(hit,x,y);let [ax,ay]=pressed?stickValue(clamp(point[0]/(hit.w/2)-1,-1,1),clamp(1-point[1]/(hit.h/2),-1,1),p.deadZone):[0,0];if(type==='DPad'){ax=Math.round(ax);ay=Math.round(ay);}if(p.inputMode==='axes'||type==='TouchPad'){write(p.axisX,ax);write(p.axisY,ay);}else{write(p.keyRight,Math.max(0,ax));write(p.keyLeft,Math.max(0,-ax));write(p.keyUp,Math.max(0,ay));write(p.keyDown,Math.max(0,-ay));}}
 scrollLocal(hit){const m=hit.matrix,d=m.a*m.d-m.b*m.c,dx=this.pointer[0]-m.e,dy=this.pointer[1]-m.f;return [(m.d*dx-m.c*dy)/d,(m.a*dy-m.b*dx)/d];}
 scrollTo(hit,value){const next=clamp(value,0,hit.max);if(next!==hit.view.scrollOffsets.get(hit.node.id)){hit.view.scrollOffsets.set(hit.node.id,next);this.revision++;}return true;}
 input(packet){
  if(packet.device==='touch')return this.touchInput(packet);
  if(packet.device==='keyboard'&&['shift','control','alt'].includes(packet.key))this.modifiers[packet.key==='shift'?'shiftKey':packet.key==='control'?'ctrlKey':'altKey']=Boolean(packet.value);
  if(packet.device==='keyboard'&&packet.value&&this.focus?.list&&this.focus.enabled&&this.focus.node.properties.enabled!==false&&this.focus.node.properties.visible!==false&&this.focus.view.options.acceptInput()){const hit=this.focus;if(hit.list.key(packet.key,this.modifiers)){const list=hit.list,y=list.layout.offsets[list.focus]*hit.scale,bottom=list.layout.offsets[list.focus+1]*hit.scale,top=hit.view.scrollOffsets.get(hit.node.id)||0;if(Number.isFinite(y)){if(y<top)this.scrollTo(hit,y);else if(bottom>top+hit.h)this.scrollTo(hit,bottom-hit.h);}return true;}}

  if(packet.device==='mouse'&&String(packet.key).toLowerCase()==='mousewheelaxis'){const hit=this.scrollHits.findLast(h=>h.max>0&&contains(h,...this.pointer)&&h.view.options.acceptInput());return hit?this.scrollTo(hit,(hit.view.scrollOffsets.get(hit.node.id)||0)-packet.value*48):false;}
  if(packet.pointer){this.pointer=packet.pointer.position;if(this.scrollDrag){const hit=this.scrollDrag;if(hit.view.disposed||!hit.view.options.acceptInput()){this.scrollDrag=null;return false;}return this.scrollTo(hit,(this.scrollLocal(hit)[1]-hit.grab)/(hit.h-hit.thumb)*hit.max);}const hover=this.hits.findLast(h=>contains(h,...this.pointer));if(hover?.node!==this.hover?.node||hover?.view!==this.hover?.view){this.hover=hover;this.revision++;}if(this.down){this.virtual(this.down,...this.pointer,true);if(this.down.node.type==='Slider')this.slider(this.down);}if(packet.key===undefined)return;}if(packet.device==='mouse'&&packet.key==='leftmousebutton'){
   if(!packet.value&&this.scrollDrag){this.scrollDrag=null;return true;}
   if(packet.value){const hit=this.scrollHits.findLast(h=>h.max>0&&contains(h,...this.pointer)&&this.scrollLocal(h)[0]>=h.w-12&&h.view.options.acceptInput());if(hit){const y=this.scrollLocal(hit)[1],top=(hit.view.scrollOffsets.get(hit.node.id)||0)/hit.max*(hit.h-hit.thumb);hit.grab=y>=top&&y<=top+hit.thumb?y-top:hit.thumb/2;this.scrollDrag=hit;return this.scrollTo(hit,(y-hit.grab)/(hit.h-hit.thumb)*hit.max);}}
  const hit=this.hits.findLast(h=>contains(h,...this.pointer)&&h.view.options.acceptInput());if(packet.value){this.release();if(this.focus!==hit){this.event(this.focus,'blur');this.focus=hit;this.event(hit,'focus');}this.down=hit;if(hit?.list)hit.pressedRow=hit.list.layout.at((local(hit,...this.pointer)[1]+(hit.view.scrollOffsets.get(hit.node.id)||0))/hit.scale);this.event(hit,'pressed');this.virtual(hit,...this.pointer,true);if(hit?.node.type==='Slider')this.slider(hit);}else{const old=this.down;this.release();if(old&&hit&&old.node===hit.node&&old.view===hit.view){if(hit.list){const [x,y]=local(hit,...this.pointer),offset=hit.view.scrollOffsets.get(hit.node.id)||0;if(old.pressedRow===hit.list.layout.at((y+offset)/hit.scale))hit.list.click(x,y,hit.scale,offset,this.modifiers);}else if(hit.node.type==='CheckBox'){hit.node.properties.checked=!hit.node.properties.checked;this.event(hit,'changed');}else if(['Button','TouchButton'].includes(hit.node.type))this.event(hit,'click');}}return !!hit;}if(packet.device==='keyboard'&&packet.value&&this.focus?.enabled&&this.focus.node.properties.enabled!==false&&this.focus?.node.type==='TextInput'){const p=this.focus.node.properties;if(packet.key==='backspace'){p.text=Array.from(p.text||'').slice(0,-1).join('');this.event(this.focus,'changed');}else if(packet.key==='enter')this.event(this.focus,'submit');return true;}return false;}
 text(text){if(this.focus?.node.type!=='TextInput'||!this.focus.enabled||this.focus.node.properties.enabled===false||this.focus.node.properties.visible===false||!this.focus.view.options.acceptInput())return;const p=this.focus.node.properties;p.text=Array.from((p.text||'')+text).slice(0,p.maxLength??256).join('');this.event(this.focus,'changed');}
 slider(hit,point=this.pointer){const p=hit.node.properties,step=p.step||.01,next=clamp(p.min+Math.round(clamp(local(hit,...point)[0]/hit.w,0,1)*(p.max-p.min)/step)*step,p.min,p.max);if(next!==p.value){p.value=next;this.event(hit,'changed');}}
 async draw(width,height,pixelRatio=1){
  if(this.raster?.supports())return this.raster.draw(width,height,pixelRatio);if(this.raster)await this.raster.fallback();
  const start=this.profile?performance.now():0;let assetsMS=0;
  for(const animation of this.activeAnimations||[])if(await animation.advance(performance.now()))this.revision++;
  const stamp=width+':'+height+':'+pixelRatio+':'+this.revision;if(stamp===this.stamp){if(this.profile)this.lastProfile={changed:false,assetsMS:0,paintMS:0,encodeMS:0,submitMS:0,totalMS:performance.now()-start};return;}if(!this.canvas&&!this.views.size&&!this.flashes?.size){this.stamp=stamp;return;}
  this.pruneFonts();const canvas=this.canvas??=createCanvas(width,height);if(canvas.width!==width)canvas.width=width;if(canvas.height!==height)canvas.height=height;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,width,height);this.hits=[];this.scrollHits=[];this.activeAnimations=new Set();if(this.layout)this.layout.length=0;
  const finishPaint=beginWidgetPaint(ctx);try{const views=[...this.views].filter(view=>view.worldBox!==false);
  if(views.some(view=>view.worldBox))views.sort((a,b)=>(b.worldBox?.depth??-2)-(a.worldBox?.depth??-2));
  for(const view of views){
   const root=view.data.nodes.find(node=>!node.parent);if(root&&!nativeWidgetVisible(root,this.touch))continue;
   const pad=view.data.safeArea?view.data.safeAreaPadding||[0,0,0,0]:[0,0,0,0];
   const area=view.worldBox||{x:0,y:0,w:width,h:height};
   const box={x:area.x+pad[3]*pixelRatio,y:area.y+pad[0]*pixelRatio,w:area.w-(pad[1]+pad[3])*pixelRatio,h:area.h-(pad[0]+pad[2])*pixelRatio};
   const scale=pixelRatio*widgetScale(view.data,(view.data.scaleRule?area.w:box.w)/pixelRatio,(view.data.scaleRule?area.h:box.h)/pixelRatio),children=new Map();const assetStart=this.profile?performance.now():0;await view.fontsReady(scale);if(this.profile)assetsMS+=performance.now()-assetStart;
   if(view.nativeTreeRevision!==undefined&&view.nativeTreePlan?.revision===view.nativeTreeRevision){for(const [key,list]of view.nativeTreePlan.children)children.set(key,list);}else{for(const n of view.data.nodes){const list=children.get(n.parent)||[];list.push(n);children.set(n.parent,list);}for(const list of children.values())list.sort((a,b)=>(a.slot.zIndex||0)-(b.slot.zIndex||0));if(view.nativeTreeRevision!==undefined)view.nativeTreePlan={revision:view.nativeTreeRevision,children};}const clips=[];
   const draw=async(node,parentBox,parentType='Canvas',index=0,siblings=[],parentEnabled=true,parentMatrix)=>{
    if(!nativeWidgetVisible(node,this.touch))return;const p=node.properties;
    const reference=p.widgetReferenceSize,fit=reference?Math.min(parentBox.w/(reference[0]*scale),parentBox.h/(reference[1]*scale)):1,r=reference?{x:parentBox.x,y:parentBox.y,w:reference[0]*scale,h:reference[1]*scale}:node.parent?widgetFlexBox(node,parentBox,parentType,index,siblings,scale):parentBox,{x,y,w,h}=r;if(w<=0||h<=0)return;const active=parentEnabled&&p.enabled;
    if(parentMatrix&&node.type==='Text'&&!children.has(node.id)&&!reference&&!this.layout&&this.focus?.node!==node&&this.down?.node!==node&&p.borderWidth===0&&p.background.length===9&&p.background.endsWith('00')){if(!p.text)return;const m=parentMatrix,alpha=ctx.globalAlpha;ctx.translate(x+w/2,y+h/2);ctx.rotate((p.rotation??widgetDefaults.rotation)*Math.PI/180);ctx.scale(...(p.scale??widgetDefaults.scale));ctx.translate(-w/2,-h/2);ctx.globalAlpha=alpha*p.opacity;paintWidgetText(ctx,node.type,p,w,h,scale,p.font?'"'+this.fonts.get(p.font)+'"':'"HBSystemUI", "HBKorean"');ctx.setTransform(m);ctx.globalAlpha=alpha;return;}

    invalidateWidgetTextState(ctx);ctx.save();ctx.globalAlpha*=p.opacity;if(reference){ctx.translate(x,y);ctx.scale(fit,fit);}else{ctx.translate(x+w/2,y+h/2);ctx.rotate((p.rotation??widgetDefaults.rotation)*Math.PI/180);ctx.scale(...(p.scale??widgetDefaults.scale));ctx.translate(-w/2,-h/2);}
    let matrix;const matrixOf=()=>matrix??=ctx.getTransform(),needsHit=interactive.has(node.type)||node.type==='ScrollBox'||this.layout||this.focus?.node===node||this.down?.node===node,hit=needsHit?{view,node,x,y,w,h,enabled:active,matrix:matrixOf(),scale,clips:[...clips]}:null;if(this.focus?.view===view&&this.focus.node===node)this.focus=hit;if(this.down?.view===view&&this.down.node===node){hit.pressedRow=this.down.pressedRow;this.down=hit;}if(interactive.has(node.type))this.hits.push(hit);if(this.touches.size)for(const [source,previous] of this.touches)if(hit&&previous.node===node&&previous.view===view){hit.pressedRow=previous.pressedRow;this.touches.set(source,hit);}if(this.layout){const xs=[0,w,0,w].map((vx,i)=>matrix.a*vx+matrix.c*([0,0,h,h][i])+matrix.e),ys=[0,w,0,w].map((vx,i)=>matrix.b*vx+matrix.d*([0,0,h,h][i])+matrix.f);this.layout.push({id:node.id,x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys),...(this.preview?{scale}:{})});}
    const border=p.borderWidth*scale;const fillColor=(this.down?.node===node||this.touches.size&&this.pressed(node,view))?p.pressed:this.hover?.node===node&&node.type==='Button'?p.hover:p.background;if(fillColor.length!==9||!fillColor.endsWith('00')){ctx.fillStyle=fillColor;ctx.beginPath();ctx.roundRect(0,0,w,h,Math.min(p.radius*scale,w/2,h/2));ctx.fill();}if(border){ctx.strokeStyle=p.borderColor;ctx.lineWidth=border;ctx.beginPath();ctx.roundRect(border/2,border/2,Math.max(0,w-border),Math.max(0,h-border),Math.max(0,p.radius*scale-border/2));ctx.stroke();}
    for(const name of node.type==='ProgressBar'?[p.backgroundTexture,p.fillTexture]:['Image','Button','TouchButton'].includes(node.type)?[widgetImageSource(p,scale)]:[]){const svg=this.images.get(name);if(svg instanceof NativeSVGImage){const m=matrixOf();await svg.prepare(w*Math.hypot(m.a,m.b),h*Math.hypot(m.c,m.d));}}
    const image=name=>{const value=this.images.get(name);if(value instanceof NativeSVGImage)return value.image;if(value instanceof NativeWebPAnimation){this.activeAnimations.add(value);return value.canvas;}return value;};if(node.type==='ProgressBar'&&image(p.backgroundTexture))ctx.drawImage(image(p.backgroundTexture),0,0,w,h);
    if(['Image','Button','TouchButton'].includes(node.type))paintWidgetImage(ctx,image(widgetImageSource(p,scale)),w,h,p,scale);
    if(node.type==='ProgressBar'||node.type==='Slider'){
     const t=clamp((p.value-p.min)/(p.max-p.min||1),0,1);ctx.fillStyle=p.accent;
     if(node.type==='Slider'){ctx.fillRect(0,h*.4,w,h*.2);ctx.beginPath();ctx.arc(w*t,h*.5,h*.25,0,Math.PI*2);ctx.fill();}
     else {ctx.save();const reverse=['rightToLeft','bottomToTop'].includes(p.fillDirection),vertical=['topToBottom','bottomToTop'].includes(p.fillDirection);ctx.beginPath();if(p.fillDirection==='radial'){ctx.moveTo(w/2,h/2);ctx.arc(w/2,h/2,Math.hypot(w,h),-Math.PI/2,-Math.PI/2+Math.PI*2*t);ctx.closePath();}else ctx.rect(vertical?0:reverse?w*(1-t):0,vertical&&reverse?h*(1-t):0,vertical?w:w*t,vertical?h*t:h);ctx.clip();if(image(p.fillTexture))ctx.drawImage(image(p.fillTexture),0,0,w,h);else ctx.fillRect(0,0,w,h);ctx.restore();}
    }
    if(node.type==='CheckBox'){const size=20*scale,top=(h-size)/2;ctx.strokeStyle=p.color;ctx.lineWidth=scale;ctx.strokeRect(0,top,size,size);if(p.checked){ctx.fillStyle=p.accent;ctx.fillRect(3*scale,top+3*scale,size-6*scale,size-6*scale);}}
    if(textWidgets.has(node.type))paintWidgetText(ctx,node.type,p,w,h,scale,p.font?'"'+this.fonts.get(p.font)+'"':'"HBSystemUI", "HBKorean"');
    if(['ListView','TreeView'].includes(node.type)){const list=view.lists.get(node.id);list.node=node;hit.list=list;const metrics=list.paint(ctx,w,h,scale,p.font?'"'+this.fonts.get(p.font)+'"':'"HBSystemUI", "HBKorean"',view.scrollOffsets.get(node.id)||0);Object.assign(hit,metrics);view.scrollOffsets.set(node.id,metrics.offset);this.scrollHits.push(hit);if(hit.max>0){ctx.fillStyle=p.color;ctx.fillRect(w-8,hit.offset/hit.max*(h-hit.thumb),6,hit.thumb);}}
    const list=children.get(node.id)||[],absolute=['Canvas','Panel','Widget','NamedSlot'].includes(node.type),padding=absolute?0:widgetContainers.has(node.type)?p.padding*scale:0,childBox={x:x+border+padding,y:y+border+padding,w:w-2*(border+padding),h:h-2*(border+padding),gap:p.gap*scale,columns:p.columns};
    let scroll;
    if(node.type==='ScrollBox'){const bottom=Math.max(h,...list.map((child,i)=>{const r=widgetFlexBox(child,childBox,node.type,i,list,scale);return r.y+r.h-y;})),max=Math.max(0,bottom-h),offset=clamp(view.scrollOffsets.get(node.id)||0,0,max);view.scrollOffsets.set(node.id,offset);scroll={...hit,max,offset,thumb:Math.min(h,Math.max(24,h*h/bottom))};this.scrollHits.push(scroll);ctx.beginPath();ctx.rect(0,0,w,h);ctx.clip();ctx.translate(0,-offset);clips.push(hit);}
    ctx.translate(-x,-y);const childMatrix=list.some(node=>node.type==='Text')?ctx.getTransform():undefined;for(let i=0;i<list.length;i++)await draw(list[i],childBox,node.type,i,list,active,childMatrix);
    if(scroll)clips.pop();if(scroll?.max>0){ctx.translate(x,y+scroll.offset);ctx.globalAlpha*=.65;ctx.fillStyle=p.color;ctx.fillRect(w-8,scroll.offset/scroll.max*(h-scroll.thumb),6,scroll.thumb);}ctx.restore();invalidateWidgetTextState(ctx);
   };
   for(const root of children.get('')||[])await draw(root,box);
  }
  for(const [source,hit] of this.touches)if(!this.hits.includes(hit))this.releaseTouch(source);
  for(const flash of this.flashes||[]){ctx.fillStyle='rgba('+flash.color.slice(0,3).map(v=>Math.round(v*255)).join(',')+','+flash.color[3]*flash.alpha+')';ctx.fillRect(0,0,width,height);}
  }finally{finishPaint();}
  if(this.preview){this.stamp=stamp;return;}
  const encoding=this.profile?{}:undefined,painted=this.profile?performance.now():0,frame=await encodeNativeUIFrame(canvas,{raw:this.rawFrames,timing:encoding}),encoded=this.profile?performance.now():0;if(!frame){this.stamp=stamp;if(this.profile)this.lastProfile={changed:true,submitted:false,pixelsUnchanged:true,assetsMS,paintMS:painted-start-assetsMS,encodeMS:encoded-painted,submitMS:0,totalMS:encoded-start};return;}let acknowledgment;try{acknowledgment=await this.send('ui',frame);if(frame.encoding)acknowledgeNativeUIFrame(canvas,frame);}catch(error){resetNativeUIFrame(canvas);throw error;}if(this.profile){const end=performance.now();this.lastProfile={changed:true,submitted:true,encoding:frame.encoding||"png",pixelBytes:(frame.rect?frame.rect[2]*frame.rect[3]:width*height)*4,wireBytes:Buffer.isBuffer(frame.pixels)?frame.pixels.length:undefined,encodingSteps:encoding,assetsMS,paintMS:painted-start-assetsMS,encodeMS:encoded-painted,submitMS:end-encoded,nativeDecodeMS:acknowledgment?.nativeUiDecodeMS||0,nativePresentMS:acknowledgment?.nativeUiPresentMS||0,totalMS:end-start};}this.uiFrames++;this.stamp=stamp;
 }

 diagnostics(){if(this.raster?.active)return {...this.raster.stats,frames:this.uiFrames,instances:this.views.size,hitTargets:this.hits.length,rasterWorker:this.raster.diagnostics(),...this.profile?{timing:this.lastProfile}:{}};return {frames:this.uiFrames,instances:this.views.size,hitTargets:this.hits.length,images:this.images.size,fonts:this.fontStore.diagnostics(),sourceImagePixels:[...this.images.values()].reduce((n,image)=>n+(image.width||image.canvas?.width||image.image?.width||0)*(image.height||image.canvas?.height||image.image?.height||0),0),frameMemory:this.canvas?nativeUIFrameMemory(this.canvas):{acknowledgedBytes:0,scratchBytes:0,pendingBytes:0},...this.profile?{timing:this.lastProfile}: {}};}

 dropLegacy(){for(const view of this.legacyWidgets?.values()||[])view.dispose();this.legacyWidgets?.clear();this.flashes?.clear();this.revision++;}
 dispose(){if(this.raster){const raster=this.raster;this.raster=null;return raster.dispose().then(()=>this.dispose());}this.dropLegacy();for(const view of [...this.ownedViews])view.dispose();const fontsDisposed=this.fontStore.dispose();for(const image of this.images.values())image.dispose?.();this.activeAnimations?.clear();this.images.clear();this.fonts.clear();this.hits=[];this.focus=null;if(this.canvas){resetNativeUIFrame(this.canvas);clearWidgetPaintCaches(this.canvas.getContext('2d'));this.canvas.width=1;this.canvas.height=1;this.canvas=null;}return fontsDisposed;}
}
