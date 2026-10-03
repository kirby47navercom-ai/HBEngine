import assert from 'node:assert/strict';
import {OrthographicCamera,PerspectiveCamera,Vector3} from 'three';
import {createViewportControls,validViewportCameraState} from '../prototype/viewport-controls.js';

let checks=0;
const check=(value,message)=>{assert.ok(value,message);checks++;};
const near=(a,b,message)=>check(Math.abs(a-b)<1e-8,message||`${a} ≈ ${b}`);
const vec=(actual,expected,message)=>check(actual.distanceTo(new Vector3(...expected))<1e-8,message||`${actual.toArray()} ≈ ${expected}`);
class EventSurface{
  constructor(){this.listeners=new Map();}
  addEventListener(type,fn){if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(fn);}
  removeEventListener(type,fn){this.listeners.get(type)?.delete(fn);}
  emit(type,values={}){const event={type,target:this,button:0,buttons:0,pointerId:1,clientX:400,clientY:300,shiftKey:false,ctrlKey:false,altKey:false,metaKey:false,preventDefault(){this.defaultPrevented=true;},stopPropagation(){this.propagationStopped=true;},...values};for(const fn of this.listeners.get(type)||[])fn(event);return event;}
  count(){return [...this.listeners.values()].reduce((n,set)=>n+set.size,0);}
}
const setup=(orthographic=false,options={})=>{
  const window=new EventSurface(),document=new EventSurface(),canvas=new EventSurface();document.defaultView=window;document.hidden=false;canvas.ownerDocument=document;canvas.style={touchAction:'pan-x'};canvas.tabIndex=-1;canvas.attributes=new Map();canvas.captures=new Set();canvas.getBoundingClientRect=()=>({left:100,top:50,width:800,height:600});canvas.getAttribute=name=>canvas.attributes.get(name)??null;canvas.setAttribute=(name,value)=>canvas.attributes.set(name,value);canvas.removeAttribute=name=>canvas.attributes.delete(name);canvas.focus=()=>document.activeElement=canvas;canvas.contains=node=>node===canvas;canvas.setPointerCapture=id=>canvas.captures.add(id);canvas.hasPointerCapture=id=>canvas.captures.has(id);canvas.releasePointerCapture=id=>canvas.captures.delete(id);
  const camera=orthographic?new OrthographicCamera(-8,8,6,-6,.001,1e7):new PerspectiveCamera(60,4/3,.001,1e7);camera.position.set(0,0,10);camera.lookAt(0,0,0);camera.updateMatrixWorld();const controls=createViewportControls(camera,canvas,options);canvas.focus();return {window,document,canvas,camera,controls,dispose:()=>controls.dispose()};
};
const down=(f,button=2,values={})=>f.canvas.emit('pointerdown',{button,buttons:[1,4,2][button],...values});
const up=f=>f.canvas.emit('pointerup',{button:2,buttons:0});
const key=(f,code,values={})=>f.window.emit('keydown',{code,target:f.canvas,...values});
const move=(f,dx,dy,values={})=>f.canvas.emit('pointermove',{clientX:400+dx,clientY:300+dy,buttons:2,...values});
const advance=(f,seconds)=>{for(let i=0;i<Math.round(seconds/.05);i++)f.controls.update(.05);};

for(const [code,direction] of [['KeyW',[0,0,-6]],['ArrowUp',[0,0,-6]],['Numpad8',[0,0,-6]],['KeyS',[0,0,6]],['ArrowDown',[0,0,6]],['Numpad2',[0,0,6]],['KeyA',[-6,0,0]],['ArrowLeft',[-6,0,0]],['Numpad4',[-6,0,0]],['KeyD',[6,0,0]],['ArrowRight',[6,0,0]],['Numpad6',[6,0,0]],['KeyE',[0,6,0]],['PageUp',[0,6,0]],['Numpad9',[0,6,0]],['KeyQ',[0,-6,0]],['PageDown',[0,-6,0]],['Numpad7',[0,-6,0]]]){
  const f=setup(),initial=f.camera.position.clone();down(f);const event=key(f,code);advance(f,1);vec(f.camera.position.clone().sub(initial),direction,code+' flies in documented direction');vec(f.controls.target,direction,'the focus pivot moves with the free camera');check(event.defaultPrevented&&event.propagationStopped,'flying keys do not change transform tools');up(f);const ended=f.camera.position.clone();advance(f,.5);vec(f.camera.position,ended.toArray(),'release stops flight');f.dispose();
}
{
  const f=setup();key(f,'KeyW');advance(f,1);vec(f.camera.position,[0,0,10],'W alone leaves camera for the editor transform tool');down(f);key(f,'KeyW',{shiftKey:true});key(f,'KeyD',{shiftKey:true});advance(f,1);near(f.camera.position.distanceTo(new Vector3(0,0,10)),24,'diagonal is normalized; Shift is exactly 4×');f.dispose();
}
{
  const f=setup();down(f);const initial=f.camera.position.clone(),direction=f.camera.getWorldDirection(new Vector3());move(f,100,50);vec(f.camera.position,initial.toArray(),'RMB rotates from a fixed camera position');check(f.camera.getWorldDirection(new Vector3()).distanceTo(direction)>.2,'RMB changes look direction');near(f.camera.position.distanceTo(f.controls.target),10,'look maintains orbit pivot distance');const before=f.camera.position.clone();const event=f.canvas.emit('wheel',{deltaY:-120,buttons:2});check(f.controls.getSettings().speed>6,'RMB wheel changes flight speed');vec(f.camera.position,before.toArray(),'RMB wheel does not dolly the camera');check(event.defaultPrevented&&event.propagationStopped,'wheel stays in active viewport');key(f,'KeyZ');advance(f,.5);check(f.camera.fov>60,'Z widens FOV while flying');up(f);near(f.camera.fov,60,'FOV returns after RMB release');f.dispose();
}
{
  const f=setup();down(f);move(f,0,-120);key(f,'KeyE');const initial=f.camera.position.clone();advance(f,.5);vec(f.camera.position.clone().sub(initial),[0,3,0],'E always moves in global vertical');f.window.emit('keyup',{code:'KeyE'});key(f,'KeyR');const local=f.camera.position.clone(),upVector=new Vector3(0,1,0).applyQuaternion(f.camera.quaternion);advance(f,.5);vec(f.camera.position.clone().sub(local),upVector.multiplyScalar(3).toArray(),'R moves along camera local up');f.dispose();
}
{
  let focused=0;const f=setup(false,{onFocus:()=>focused++});const event=key(f,'KeyF');near(focused,1,'F delegates object bounds focus to editor');check(event.defaultPrevented,'focus shortcut consumed');down(f);key(f,'KeyF');advance(f,.5);near(focused,1,'RMB F is local down, not frame selection');near(f.camera.position.y,-3);f.dispose();
}
{
  const f=setup();down(f,0);move(f,50,100,{buttons:1});near(f.camera.position.y,0,'LMB forward movement stays on ground plane');check(f.camera.position.z<10,'LMB dy moves camera forward');check(f.camera.getWorldDirection(new Vector3()).x>0,'LMB dx looks toward mouse movement');f.dispose();
}
for(const combination of ['middle','both']){
  const f=setup(),quaternion=f.camera.quaternion.clone();if(combination==='middle')down(f,1);else{down(f,0);down(f,2,{buttons:3});}move(f,100,50,{buttons:combination==='middle'?4:3});check(f.camera.position.x<0&&f.camera.position.y>0,'MMB / LMB+RMB pans on view plane');check(f.camera.quaternion.angleTo(quaternion)<1e-8,'pan preserves rotation');near(f.camera.position.distanceTo(f.controls.target),10,'pan preserves pivot distance');f.dispose();
}
{
  const f=setup();down(f,0,{altKey:true});move(f,200,-2000,{buttons:1,altKey:true});vec(f.controls.target,[0,0,0],'Alt LMB keeps selected pivot');near(f.camera.position.length(),10,'orbit preserves radius');check(f.camera.position.y<0,'orbit crosses beneath ground; former half-sphere clamp is removed');f.dispose();
}
{
  const f=setup();down(f,2,{altKey:true});move(f,0,400,{altKey:true});check(f.camera.position.z>100,'Alt RMB dollies beyond former 28-unit map clamp');vec(f.controls.target,[0,0,0],'dolly preserves orbit pivot');f.dispose();
}
{
  const f=setup();f.controls.setSettings({speed:1e6});down(f);key(f,'KeyD');advance(f,1);near(f.camera.position.x,1e6,'free camera can inspect large world coordinates');f.dispose();
}
for(const cameraView of ['front','top']){
  const f=setup(true);if(cameraView==='top'){f.camera.position.set(50,10,60);f.controls.target.set(50,0,60);f.controls.update(0);}const world=new Vector3(.6,.5,0).unproject(f.camera),event=f.canvas.emit('wheel',{deltaY:-400,clientX:740,clientY:200});check(event.defaultPrevented,'ortho wheel is handled');const screen=world.clone().project(f.camera);near(screen.x,.6,cameraView+' cursor anchored zoom x');near(screen.y,.5,cameraView+' cursor anchored zoom y');check(f.camera.zoom>1,'wheel up zooms in');const quaternion=f.camera.quaternion.clone();down(f);move(f,100,50);check(f.camera.quaternion.angleTo(quaternion)<1e-8,'ortho RMB pans without orbit');up(f);f.canvas.emit('wheel',{deltaY:16000});check(f.camera.zoom<.001,'ortho can zoom out to view large maps');f.dispose();
}
{
  const stages=[],f=setup(true,{onMarquee:e=>stages.push(e)});down(f,0,{shiftKey:true});move(f,50,80,{buttons:1,shiftKey:true});f.canvas.emit('pointerup',{button:0,buttons:0,clientX:450,clientY:380,shiftKey:true});check(stages.map(e=>e.stage).join(',')==='start,move,end','ortho selection has begin/move/end lifecycle');check(stages.every(e=>e.mode==='add'),'Shift marquee adds');near(stages.at(-1).x1,300,'selection rectangle is canvas-local');vec(f.camera.position,[0,0,10],'marquee does not pan');stages.length=0;down(f,2,{ctrlKey:true});move(f,10,10,{ctrlKey:true});f.canvas.emit('pointercancel',{clientX:410,clientY:310});check(stages.at(-1).stage==='cancel'&&stages.at(-1).mode==='subtract','Ctrl RMB subtract marquee cancels safely');f.dispose();
}
{
  const stages=[],f=setup(true,{onMarquee:e=>stages.push(e)});down(f,0);move(f,10,10,{buttons:1});down(f,2,{buttons:3,clientX:410,clientY:310});move(f,10,80,{buttons:3});check(stages.at(-1).stage==='cancel','adding RMB cancels active ortho marquee');check(f.camera.zoom<1,'LMB+RMB zoom replaces ortho selection even when LMB was pressed first');f.dispose();
}
{
  let selected=0,context=0;const f=setup(false,{onSelect:()=>selected++,onContextMenu:()=>context++});down(f,0);f.canvas.emit('pointerup',{button:0});near(selected,1);down(f);up(f);near(context,1);down(f);move(f,100,0);up(f);near(context,1,'RMB drag never opens context menu');check(f.controls.wasDragged(),'editor can suppress selection after camera drag');f.dispose();
}
for(const stop of ['blur','visibility','disable','cancel','capture','escape']){
  const f=setup();down(f);key(f,'KeyW');advance(f,.1);const before=f.camera.position.clone();if(stop==='blur')f.window.emit('blur');else if(stop==='visibility'){f.document.hidden=true;f.document.emit('visibilitychange');}else if(stop==='disable')f.controls.enabled=false;else if(stop==='cancel')f.canvas.emit('pointercancel');else if(stop==='capture')f.canvas.emit('lostpointercapture');else key(f,'Escape');advance(f,1);vec(f.camera.position,before.toArray(),stop+' clears held movement');check(!f.controls.isFlying&&!f.controls.isNavigating,stop+' releases active camera gesture');check(f.canvas.captures.size===0,stop+' releases capture');f.dispose();
}
{
  const f=setup();down(f);key(f,'KeyW',{target:{closest:()=>({tagName:'INPUT'})}});advance(f,.5);vec(f.camera.position,[0,0,10],'typing in numeric/text fields never moves camera');f.dispose();
}
{
  const f=setup();const state=f.controls.getState();check(f.controls.saveBookmark(3),'save bookmark');f.controls.target.set(20,5,-20);f.camera.position.set(25,12,-12);f.controls.update(0);check(f.controls.restoreBookmark(3),'restore bookmark');vec(f.camera.position,state.position,'bookmark restores exact camera position');vec(f.controls.target,state.target,'bookmark restores orbit pivot');const copy=f.controls.getBookmarks();copy[0].state.position[0]=999;near(f.controls.getBookmark(3).position[0],0,'bookmarks are copy-safe JSON');check(!f.controls.setState({...state,position:[NaN,0,0]}),'nonfinite camera state rejected');check(!f.controls.setState({...state,zoom:-1}),'invalid zoom rejected');check(!f.controls.setState({...state,projection:'orthographic'}),'projection selection stays external');check(!f.controls.setState({...state,near:1e8}),'near plane cannot exceed far plane');assert.throws(()=>f.controls.setSettings({speed:Infinity}));assert.throws(()=>f.controls.setSettings({flightMode:'other'}));const ortho=new OrthographicCamera(-8,8,6,-6,.1,1e7);ortho.position.set(0,10,.0001);f.controls.object=ortho;check(ortho.getWorldDirection(new Vector3()).dot(new Vector3(0,-1,0))>.999999,'object setter aims replacement camera at retained target');f.dispose();check(f.canvas.style.touchAction==='pan-x','dispose restores CSS touch behavior');check(f.canvas.count()===0&&f.window.count()===0&&f.document.count()===0,'dispose removes all canvas/document/window input listeners');
}
{
  const f=setup(false,{settings:{flightMode:'always'}});key(f,'KeyW');advance(f,.5);near(f.camera.position.z,7,'optional always-active flight preference');f.controls.setSettings({flightMode:'never'});down(f);key(f,'KeyD');advance(f,.5);near(f.camera.position.x,0,'never flight leaves shortcuts for editor');f.dispose();
}
{
  const f=setup(false,{shouldHandle:()=>false});const event=down(f);check(!event.defaultPrevented&&!f.controls.isNavigating,'transform gizmo can decline camera input');f.dispose();
}
for(const explicitEvent of [true,false]){
  const f=setup(),childWindow=new EventSurface(),childDocument=new EventSurface();childDocument.defaultView=childWindow;childDocument.hidden=false;childDocument.activeElement=f.canvas;down(f);key(f,'KeyW');f.canvas.ownerDocument=childDocument;if(explicitEvent)f.canvas.emit('hb:document-moved');else f.controls.update(0);check(f.window.count()===0&&f.document.count()===0,'detaching removes input capture from the previous window');check(!f.controls.isNavigating,'detaching clears any in-flight pointer operation');f.canvas.focus=()=>childDocument.activeElement=f.canvas;down(f);const event=childWindow.emit('keydown',{code:'KeyD',target:f.canvas});advance(f,.5);near(f.camera.position.x,3,'detached native/browser window has working keyboard flight');check(event.defaultPrevented&&event.propagationStopped,'detached window flight still prevents transform shortcuts');childWindow.emit('blur');const position=f.camera.position.clone();advance(f,.5);vec(f.camera.position,position.toArray(),'detached window blur stops held input');f.dispose();check(childWindow.count()===0&&childDocument.count()===0,'disposing detached viewport cleans child document listeners');
}
{
  const f=setup(true);f.camera.userData.viewportDirection='top';f.camera.up.set(0,0,-1);f.camera.position.set(0,10,0);f.camera.lookAt(f.controls.target);f.controls.update(0);f.controls.saveBookmark(2);const stored=f.controls.getBookmark(2);check(stored.direction==='top','bookmark preserves named viewport direction');check(stored.up.join(',')==='0,0,-1','bookmark preserves top-view up basis');f.camera.userData.viewportDirection='front';f.camera.up.set(0,1,0);f.camera.position.set(0,0,10);f.controls.update(0);check(f.controls.restoreBookmark(2),'same-projection bookmark restores direction');check(f.camera.userData.viewportDirection==='top','camera direction metadata restored');vec(f.camera.up,[0,0,-1],'top camera basis restored before focus operations');check(!validViewportCameraState({...stored,up:[0,0,0]}),'zero up basis rejected');check(!validViewportCameraState({...stored,direction:'unsupported'}),'unknown direction rejected');check(!validViewportCameraState({...stored,direction:'3d'}),'inconsistent direction and projection rejected');f.dispose();
}
{
  let restored;const f=setup(true,{onRestoreBookmark:(state,slot)=>{restored={state,slot};return true;}});f.camera.userData.viewportDirection='top';f.camera.up.set(0,0,-1);f.controls.saveBookmark(4);check(f.controls.restoreBookmark(4),'same-direction bookmark still delegates piloting ownership');check(restored.slot===4&&restored.state.direction==='top','same-direction restore hook receives complete state');f.controls.object=new PerspectiveCamera(60,1,.1,1e7);f.camera=f.controls.camera;f.camera.userData.viewportDirection='3d';check(f.controls.restoreBookmark(4),'cross-projection bookmark delegates camera switch to editor');check(restored.slot===4&&restored.state.direction==='top'&&restored.state.projection==='orthographic','restore hook receives complete named camera state');check(f.controls.camera.isPerspectiveCamera,'input module does not replace editor-owned camera itself');f.dispose();
}
console.log(`뷰포트 입력·실제 Three 카메라 수학·대형 맵 탐색·직교 커서 확대·북마크·입력 정리 ${checks}개 검사 통과`);
