import {visualComponentSignature} from '../prototype/scene-rendering.js';
import {componentDefaults,componentDefaultValues} from '../prototype/scene-components.js';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {RuntimeInput,inputKey,validInputPacket,validInputSnapshot,bindRuntimePointer} from '../prototype/runtime-input.js';
import {bindVirtualControl,stickValue} from '../prototype/virtual-controls.js';
import {createWidgetAsset,createWidgetNode,addMobileControls,validWidgetAsset} from '../prototype/ui-assets.js';
import {createAsset} from '../prototype/asset-documents.js';
import {BlueprintRuntime} from '../prototype/blueprint-runtime.js';
import {makeNode,connect,validBlueprint} from '../prototype/blueprint-model.js';
import {makeSceneComponent} from '../prototype/scene-components.js';
import {preparePlayWorld} from '../prototype/play-world.js';
import {engineOperations} from '../prototype/engine-services.js';
import {NativeHost} from './native-host.mjs';
import {nativeWorld} from '../prototype/native-model.js';

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-5,`${a} != ${b}`),vnear=(a,b)=>a.forEach((v,i)=>near(v,b[i]));
const object=(id,kind='sprite')=>({id,name:id,kind,visible:true,position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],components:[makeSceneComponent('Transform'),makeSceneComponent('SpriteRenderer')]});
const graph=()=>{const g=createAsset('blueprint','BP_Input');g.nodes=[];g.edges=[];g.components=[];g.variables=[];return g;};
const add=(g,key,id,values={})=>{const node={...makeNode(key),id,inputValues:values};g.nodes.push(node);return node;};
const link=(g,a,out,b,input='exec')=>assert.ok(connect(g,{node:a,pin:out},{node:b,pin:input}).ok);
const input=new RuntimeInput(),camera=new THREE.OrthographicCamera(-10,10,5,-5,.1,100);camera.position.set(3,4,20);camera.updateProjectionMatrix();
assert.equal(inputKey('SpaceBar'),' ');assert.equal(inputKey('Mouse0'),'leftmousebutton');
assert.ok(validInputPacket({pointer:{position:[400,100],size:[800,400]}}));assert.equal(validInputPacket({key:'',value:1}),false);assert.equal(validInputPacket({pointer:{position:[0,0],size:[0,1]}}),false);
assert.equal(input.query('mousePosition').return,false);input.pointerSample({position:[600,100],size:[800,400]});input.snapshot(camera);vnear(input.query('mouseWorldPlane',{normal:[0,0,1],point:[0,0,0]}).position,[8,6.5,0]);assert.ok(validInputSnapshot(input.snapshot(camera)));
assert.equal(input.query('mouseWorldPlane',{normal:[0,1,0],point:[0,0,0]}).return,false);assert.equal(input.query('mouseWorldPlane',{normal:[0,0,1],point:[0,0,30]}).return,false);
input.pointerSample({position:[800,400],size:[800,400],inside:false});input.snapshot(camera);assert.equal(input.query('mouseRay').return,false);input.clear();
const perspective=new THREE.PerspectiveCamera(60,2,.1,100);perspective.position.set(0,8,8);perspective.lookAt(0,0,0);input.pointerSample({position:[400,200],size:[800,400]});input.snapshot(perspective);vnear(input.query('mouseWorldPlane',{normal:[0,1,0],point:[0,0,0]}).position,[0,0,0]);
input.set('d',1,'keyboard');input.set('d',.5,'joystick');input.set('d',0,'joystick');assert.equal(input.query('inputAxisValue',{key:'D'}).return,1);input.set('d',0,'keyboard');assert.equal(input.query('inputKeyDown',{key:'d'}).return,false);
assert.deepEqual(stickValue(.1,0,.15),[0,0]);vnear(stickValue(2,0),[1,0]);near(Math.hypot(...stickValue(1,1)),1);

let g=graph(),messages=[];add(g,'input','click').options={key:'LeftMouseButton'};add(g,'print','press',{message:'pressed'});add(g,'print','release',{message:'released'});link(g,'click','then','press');link(g,'click','released','release');
const action=add(g,'inputAction','fire');action.options={action:'Assets/IA_Fire.hbinputaction.json'};for(const pin of ['started','triggered','completed']){add(g,'print',pin,{message:pin});link(g,'fire',pin,pin);}assert.ok(validBlueprint(g));
const inputAssets={contexts:new Map([['Assets/IMC.hbinputmapping.json',{priority:0,mappings:[{action:action.options.action,key:'Mouse0',axis:0,scale:1}]}]]),actions:new Map([[action.options.action,{name:'Fire',valueType:'bool',deadZone:0,consumeInput:false,trigger:'pressed'}]])};g.settings.inputMapping='Assets/IMC.hbinputmapping.json';
let vm=new BlueprintRuntime([object('player')],[{root:g,self:'player'}],{inputAssets,inputCamera:()=>camera,log:v=>messages.push(v)});await vm.start();await vm.dispatchInput({pointer:{position:[400,200],size:[800,400]},key:'Mouse0'});await vm.input('LeftMouseButton',1);await vm.input('Mouse0',0);assert.deepEqual(messages,['pressed','started','triggered','released','completed']);
await vm.input('Mouse0',1);vm.pause();assert.equal(vm.inputSnapshot().keys.leftmousebutton,undefined);assert.equal(vm.inputSnapshot().pointer.valid,false);vm.continue();await vm.input('Mouse0',1);assert.equal(messages.filter(v=>v==='pressed').length,3);await vm.releaseInput();await vm.input('MouseWheelAxis',1);await vm.tick(.01);assert.equal(vm.inputSnapshot().keys.mousewheelaxis,undefined);await vm.stop();

// Native DOM event ownership, outside releases and simultaneous virtual inputs.
class Element extends EventTarget {
  constructor(doc){super();this.ownerDocument=doc;this.style={};this.children=[];this.classes=new Set();this.classList={add:k=>this.classes.add(k),remove:k=>this.classes.delete(k),toggle:(k,on)=>on?this.classes.add(k):this.classes.delete(k)};}
  append(child){this.children.push(child);}setAttribute(){}getBoundingClientRect(){return {left:100,top:50,width:400,height:200};}focus(){}setPointerCapture(){}releasePointerCapture(){}
}
const win=new EventTarget(),doc=new EventTarget();doc.defaultView=win;doc.createElement=()=>new Element(doc);
const event=(target,type,props={})=>{const e=new Event(type,{cancelable:true});Object.assign(e,{clientX:300,clientY:150,pointerId:1,pointerType:'mouse',button:0,isPrimary:true,...props});target.dispatchEvent(e);return e;};
g=graph();vm=new BlueprintRuntime([object('player')],[],{inputCamera:()=>camera});await vm.start();const canvas=new Element(doc),unbind=bindRuntimePointer(canvas,{runtime:()=>vm,error:e=>{throw e;}});
event(canvas,'pointerdown');await vm.flushInput();assert.equal(vm.inputSnapshot().keys.leftmousebutton,1);assert.deepEqual(vm.inputSnapshot().pointer.position,[200,100]);event(doc,'pointerup',{clientX:900});await vm.flushInput();assert.equal(vm.inputSnapshot().keys.leftmousebutton,undefined);assert.equal(vm.inputSnapshot().pointer.inside,false);
const stickNode=createWidgetNode('Joystick'),buttonNode=createWidgetNode('TouchButton'),stickEl=new Element(doc),buttonEl=new Element(doc),controls=[];
const options={input:(key,value,source)=>vm.dispatchInput({key,value,source}),accept:()=>vm.active&&!vm.paused};controls.push(bindVirtualControl(stickEl,stickNode,options),bindVirtualControl(buttonEl,buttonNode,options));
event(stickEl,'pointerdown',{pointerType:'touch',pointerId:10,clientX:480});event(buttonEl,'pointerdown',{pointerType:'touch',pointerId:11});await vm.flushInput();assert.ok(vm.inputSnapshot().keys.d>0);assert.equal(vm.inputSnapshot().keys[' '],1);
event(doc,'pointerup',{pointerId:11});await vm.flushInput();assert.ok(vm.inputSnapshot().keys.d>0);assert.equal(vm.inputSnapshot().keys[' '],undefined);await vm.dispatchInput({key:'d',value:1});event(doc,'pointerup',{pointerId:10});await vm.flushInput();assert.equal(vm.inputSnapshot().keys.d,1,'터치 해제가 물리 키보드 입력을 지우지 않는다');
event(canvas,'pointerdown',{pointerType:'touch',pointerId:20});await vm.flushInput();assert.equal(vm.inputSnapshot().keys.leftmousebutton,1);event(win,'blur');await new Promise(setImmediate);await vm.flushInput();assert.deepEqual(vm.inputSnapshot().keys,{});controls.forEach(c=>c.dispose());
const dpadNode=createWidgetNode('DPad'),padNode=createWidgetNode('TouchPad'),dpadEl=new Element(doc),padEl=new Element(doc),dpad=bindVirtualControl(dpadEl,dpadNode,options),pad=bindVirtualControl(padEl,padNode,options);
event(dpadEl,'pointerdown',{pointerId:30,clientX:470,clientY:60});await vm.flushInput();near(vm.inputSnapshot().keys.d,1/Math.SQRT2);near(vm.inputSnapshot().keys.w,1/Math.SQRT2);event(win,'resize');await vm.flushInput();assert.deepEqual(vm.inputSnapshot().keys,{});
event(padEl,'pointerdown',{pointerId:31,clientX:200,clientY:100});event(padEl,'pointermove',{pointerId:31,clientX:240,clientY:90});await vm.flushInput();near(vm.inputSnapshot().keys.lookx,.4);near(vm.inputSnapshot().keys.looky,.2);pad.endFrame();await vm.flushInput();assert.deepEqual(vm.inputSnapshot().keys,{});dpad.dispose();pad.dispose();
const keyboardButton=bindVirtualControl(buttonEl,buttonNode,options);event(buttonEl,'keydown',{key:'Enter'});await vm.flushInput();assert.equal(vm.inputSnapshot().keys[' '],1);event(buttonEl,'keyup',{key:'Enter'});await vm.flushInput();assert.equal(vm.inputSnapshot().keys[' '],undefined);keyboardButton.dispose();
const adoptedDoc=new EventTarget();adoptedDoc.defaultView=new EventTarget();canvas.ownerDocument=adoptedDoc;unbind.refreshDocument();await vm.flushInput();event(canvas,'pointerdown',{pointerId:42});await vm.flushInput();event(doc,'pointerup',{pointerId:42});await vm.flushInput();assert.equal(vm.inputSnapshot().keys.leftmousebutton,1,'옛 창의 이벤트가 분리 창 입력을 해제하지 않는다');event(adoptedDoc,'pointerup',{pointerId:42});await vm.flushInput();assert.equal(vm.inputSnapshot().keys.leftmousebutton,undefined);unbind();await vm.stop();
const defaultsA=componentDefaults('Rigidbody2D'),defaultsB=componentDefaults('Rigidbody2D');defaultsA.freezePosition[0]=1;assert.equal(defaultsB.freezePosition[0],0);assert.ok(Object.isFrozen(componentDefaultValues('Rigidbody2D').freezePosition));const renderObject=object('signature');renderObject.components=[makeSceneComponent('Transform'),makeSceneComponent('SpriteRenderer'),makeSceneComponent('Rigidbody2D')];const signature=visualComponentSignature(renderObject);renderObject.components.find(c=>c.type==='Transform').properties.position=[4,5,6];renderObject.components.find(c=>c.type==='Rigidbody2D').properties.velocity=[1,2,3];assert.equal(visualComponentSignature(renderObject),signature,'물리 미러 변경은 렌더 자원을 재생성하지 않는다');renderObject.components.find(c=>c.type==='SpriteRenderer').properties.flipX=true;assert.notEqual(visualComponentSignature(renderObject),signature);

const mobile=createWidgetAsset('W_Mobile');assert.equal(addMobileControls(mobile).length,3);assert.ok(validWidgetAsset(mobile));assert.ok(mobile.safeArea&&mobile.adaptiveOrientation);for(const type of ['Joystick','DPad','TouchButton','TouchPad'])assert.ok(validWidgetAsset({...createWidgetAsset('UI'),nodes:[...createWidgetAsset('UI').nodes,createWidgetNode(type)]}));

// A top-down movement component in a Blueprint (not just the scene) is possessed.
g=graph();g.components=[makeSceneComponent('TopDownMovement2D',{autoPossess:true})];const player=object('player');player.blueprintAsset='Assets/BP_Player.hbblueprint.json';
const prepared=await preparePlayWorld([player],{dimension:'2d',autoSpawnPlayer:false},{readAsset:async()=>g,readText:async()=>'',buildNative:()=>{throw Error('불필요한 C++ 빌드');}});assert.equal(prepared.gameplay.pawn,'player');
const services=engineOperations({gameplay:prepared.gameplay,physicsOptions:prepared.physicsOptions,build:()=>{},update:()=>{},remove:()=>{},readAsset:async()=>null});vm=new BlueprintRuntime(prepared.objects,prepared.bindings,{...services,inputCamera:()=>camera});await vm.start();assert.equal((await services.operation('getPlayerPawn',{},vm.bindings[0],vm)).return,'player');
const collider=makeSceneComponent('BoxCollider2D');player.components.push(collider);const originalCollider=structuredClone(collider);await services.operation('spriteFlip',{target:'player',flipX:true,flipY:false},vm.bindings[0],vm);assert.equal(player.components.find(c=>c.type==='SpriteRenderer').properties.flipX,true);assert.deepEqual(collider,originalCollider);assert.deepEqual(player.scale,[1,1,1]);

const host=new NativeHost();try{
  const header='#include <HBEngine/Game.hpp>\nHB_CLASS()\nclass InputProbe : public hb::Library { public: HB_FUNCTION(BlueprintPure) static bool Read(hb::Vec2& position,hb::Vec3& origin,hb::Vec3& direction,hb::Vec3& aim,hb::Vec2& delta,bool& down); HB_FUNCTION(BlueprintPure) static hb::Actor* Player(); HB_FUNCTION(BlueprintCallable) static void Flip(hb::Actor* target,bool& x,bool& y); };';
  const source='#include "User.h"\nbool InputProbe::Read(hb::Vec2& position,hb::Vec3& origin,hb::Vec3& direction,hb::Vec3& aim,hb::Vec2& delta,bool& down){hb::Input::GetMousePosition(position);hb::Input::DeprojectMousePositionToWorld(origin,direction);delta=hb::Input::GetMouseDelta();down=hb::Input::IsKeyDown("Mouse0");return hb::Input::GetMouseWorldPosition({0,0,1},{0,0,0},aim);}\nhb::Actor* InputProbe::Player(){return hb::Gameplay::GetPlayerPawn();}\nvoid InputProbe::Flip(hb::Actor* target,bool& x,bool& y){hb::Sprites::SetFlip(target,true,true);hb::Sprites::GetFlip(target,x,y);}';
  const build=await host.build(header,source);await vm.dispatchInput({key:'LeftMouseButton',pointer:{position:[600,100],size:[800,400]}});const snapshot=vm.inputSnapshot(),objects=nativeWorld(vm.objects,new Set()),request={key:'nativeCall',nativeId:'InputProbe.Read',args:{},objects,input:snapshot};
  const reply=await host.call(build.token,request);assert.equal(reply.outputs.result,true);assert.equal(reply.outputs.down,true);vnear(reply.outputs.aim,vm.inputState.query('mouseWorldPlane',{normal:[0,0,1],point:[0,0,0]}).position);assert.deepEqual(reply.outputs.position,[600,100]);
  assert.equal((await host.call(build.token,{...request,nativeId:'InputProbe.Player'})).outputs.result,'player');const flipped=await host.call(build.token,{...request,nativeId:'InputProbe.Flip',args:{target:'player'}});assert.ok(flipped.outputs.x&&flipped.outputs.y);for(const op of flipped.operations)await services.operation(op.key,op.args,vm.bindings[0],vm);assert.deepEqual((await services.operation('spriteGetFlip',{target:'player'},vm.bindings[0],vm)),{flipX:true,flipY:true});
  await assert.rejects(host.call(build.token,{...request,input:{...snapshot,pointer:{...snapshot.pointer,direction:[2,0,0]}}}),/입력 상태/);
}finally{host.close();await vm.stop();services.dispose();}
console.log('마우스 좌표·2D/3D 조준·클릭 Pressed/Released·입력 액션·포커스/정지·터치 멀티입력·키보드 동시입력·모바일 위젯·탑다운 제어·스프라이트 반전·실제 C++ 입력 검사 통과');
