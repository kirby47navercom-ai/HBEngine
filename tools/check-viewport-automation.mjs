import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {PerspectiveCamera,OrthographicCamera} from 'three';
import {createViewportControls,validViewportCameraState} from '../prototype/viewport-controls.js';
import {ViewportPresentation,viewportDirections} from '../prototype/viewport-presentation.js';

// Execute the registered application handler without opening or moving a GUI.
const source=await fs.readFile(new URL('../prototype/app.js',import.meta.url),'utf8');
const start=source.indexOf("  'viewport.configure':"),end=source.indexOf("  'viewport.action':",start);
assert.ok(start>=0&&end>start,'실제 편집기 명령 등록을 검사한다');
const controlsFor=camera=>createViewportControls(camera,{style:{},tabIndex:0,ownerDocument:{defaultView:{addEventListener(){},removeEventListener(){}},addEventListener(){},removeEventListener(){}},addEventListener(){},removeEventListener(){}});
function fixture(extra=false){
  const camera=new PerspectiveCamera(60,1,.05,100000),orthoCamera=new OrthographicCamera(-5,5,5,-5,.05,100000);
  camera.userData.viewportDirection='3d';orthoCamera.userData.viewportDirection='top';camera.position.z=10;orthoCamera.position.z=10;
  const controls=controlsFor(camera),presentation=new ViewportPresentation();
  let extraView;
  const context={automationEditable(){},automationViewport(id){assert.equal(id,extra?'viewport:1':'scene');return extraView;},viewportDirections,viewMode:'3d',camera,orthoCamera,activeCamera:camera,orbit:controls,mainPresentation:presentation,pilotObject:null,pilotWrites:0,navigationWrites:0,navigatingScene:false,clone:structuredClone,ViewportPresentation,validViewportCameraState,mainViewportToolbar:{sync(){}},saveViewportPreferences(){},viewportAction(action){assert.equal(action,'unpilot');context.pilotObject=null;},setView(direction){context.viewMode=direction;context.activeCamera=direction==='3d'?camera:orthoCamera;context.orbit.object=context.activeCamera;context.activeCamera.userData.viewportDirection=direction;}};
  controls.addEventListener('change',()=>{if(!extra&&context.pilotObject)context.pilotWrites++;});
  controls.addEventListener('end',()=>{if(extra?!extraView.navigating:!context.navigatingScene)context.navigationWrites++;});
  if(extra)extraView={mode:'3d',camera,controls,presentation,cameras:{perspective:camera,orthographic:orthoCamera},toolbar:{sync(){}},setDirection(direction){this.mode=direction;this.camera=direction==='3d'?camera:orthoCamera;this.controls.object=this.camera;this.camera.userData.viewportDirection=direction;}};
  const command=vm.runInNewContext('({'+source.slice(start,end)+'})',context)['viewport.configure'],call=params=>command({id:extra?'viewport:1':'scene',...params});
  const snapshot=()=>JSON.stringify({state:controls.getState(),presentation:presentation.settings,direction:extraView?.mode||context.viewMode,piloting:context.pilotObject,pilotWrites:context.pilotWrites,navigationWrites:context.navigationWrites});
  return {context,camera,orthoCamera,controls,presentation,call,snapshot,dispose(){controls.dispose();presentation.dispose();}};
}
let cases=0;
for(const extra of [false,true]){
  const f=fixture(extra);
  try{
    f.call({state:{position:[0,0,10],target:[0,0,0],far:10,fov:35}});
    assert.equal(f.presentation.settings.camera.far,100000,'카메라 상태 복원은 표시 설정 기본값과 독립적');
    f.context.pilotObject='qa-camera';
    const before=f.snapshot();assert.throws(()=>f.call({presentation:{camera:{near:20}},controls:{speed:30}}));assert.equal(f.snapshot(),before,'실제 far를 넘는 부분 near 요청은 카메라·설정·조종 변경 전에 거부');cases++;
    assert.throws(()=>f.call({controls:{speed:'invalid'}}));assert.equal(f.snapshot(),before,'입력 설정 거부 뒤 조종 Actor 쓰기와 탐색 이력을 추가하지 않음');cases++;
    assert.throws(()=>f.call({controls:{speed:30},state:{position:[0,0,10],target:[0,0,0],settings:{speed:'invalid'}}}));assert.equal(f.snapshot(),before,'일부 설정 적용 뒤 실패해도 설정·조종 Actor 쓰기·탐색 이력을 복원');cases++;
    f.call({presentation:{camera:{far:30}}});assert.equal(f.camera.far,30);assert.equal(f.camera.near,.05);assert.equal(f.camera.fov,35,'부분 클립 변경은 실제 시야각을 보존');cases++;
    f.call({state:{position:[0,0,10],target:[0,0,0],near:20,far:100}});const highNear=f.snapshot();assert.throws(()=>f.call({presentation:{camera:{far:10}}}));assert.equal(f.snapshot(),highNear,'실제 near보다 작은 부분 far를 거부');cases++;
    f.call({presentation:{camera:{near:2,far:10}}});assert.equal(f.camera.near,2);assert.equal(f.camera.far,10);cases++;
    f.call({direction:'top',state:{position:[0,0,10],target:[0,0,0],far:10}});const orthoBefore=f.snapshot();assert.throws(()=>f.call({presentation:{camera:{near:20}}}));assert.equal(f.snapshot(),orthoBefore,'직교 카메라도 현재 클립을 검증');cases++;
    f.call({presentation:{camera:{far:30}}});assert.equal(f.orthoCamera.far,30);cases++;
    f.call({direction:'3d',state:{position:[0,0,10],target:[0,0,0],near:2,far:100,fov:40},presentation:{camera:{far:200}}});assert.equal(f.camera.far,100,'state의 명시적 카메라 값을 표시 설정으로 덮어쓰지 않음');assert.equal(f.camera.fov,40);cases++;
    f.call({state:{position:[0,0,10],target:[0,0,0],near:.05,far:250000}});f.call({presentation:{camera:{near:200000}}});assert.equal(f.camera.near,200000);assert.equal(f.camera.far,250000,'저장된 표시 설정보다 넓은 실제 far를 기준으로 유효한 near 요청을 허용');cases++;
  }finally{f.dispose();}
}
console.log(`실제 뷰포트 AI 명령·부분 클립·실패 원자성·직교·추가 뷰포트 ${cases}개 회귀 검사 통과`);
