import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {NativeHost} from './native-host.mjs';
const host=new NativeHost();
try {
  const header=await fs.readFile(new URL('../prototype/examples/DoorController.h',import.meta.url),'utf8');
  const source=await fs.readFile(new URL('../prototype/examples/DoorController.cpp',import.meta.url),'utf8');
  const {token}=await host.build(header,source);
  let objects=[{id:'door',nativeClass:'DoorController',position:[1,2,3],rotation:[0,0,0],scale:[1,1,1],nativeProperties:{OpenAngle:70}}];
  const call=async(nativeId,args={},key='nativeCall',overrides=[])=>{
    const result=await host.call(token,{key,nativeId,args:{target:'door',...args},objects,overrides});
    objects=objects.map(o=>({...o,...result.objects.find(x=>x.id===o.id)}));return result;
  };
  let r=await call('DoorController.Open',{Angle:90},'nativeCall',['DoorController.OnOpened']);
  assert.deepEqual(objects[0].rotation,[0,70,0]);
  assert.deepEqual(r.events,[{nativeId:'DoorController.OnOpened',target:'door',args:{Position:[1,2,3]}}]);
  assert.deepEqual((await call('DoorController.GetDoorPosition')).outputs.result,[1,2,3]);
  assert.equal((await call('DoorController.GetDoorTarget')).outputs.result,'door');
  await call('DoorController.OpenAngle',{value:40},'nativeSet');
  assert.equal((await call('DoorController.OpenAngle',{},'nativeGet')).outputs.value,40);
  await host.call(token,{command:'frame',delta:.1,objects});
  await host.call(token,{command:'reset',objects:[]});
  await assert.rejects(call('DoorController.Open',{Angle:'bad'}),/자료형/);
  await assert.rejects(host.call(token,{command:'frame',delta:.1,clock:{scale:'bad',paused:false},objects}),/시간/);
  const badHeader=header.replace('};','HB_FUNCTION(BlueprintPure) float InvalidOutput() const;\n};'),badSource=source+'\nfloat DoorController::InvalidOutput() const {return std::numeric_limits<float>::infinity();}\n';
  const bad=await host.build(badHeader,badSource);await assert.rejects(host.call(bad.token,{key:'nativeCall',nativeId:'DoorController.InvalidOutput',args:{target:'door'},objects}),/출력 자료형/);
  assert.deepEqual((await host.call(token,{command:'frame',delta:0,objects:[]})).objects,[],'삭제한 객체는 C++ 스냅샷에 남지 않아요.');
  await assert.rejects(host.build(header,source+'\ninvalid source!'),/error/);
  const serviceHeader='#include <HBEngine/Game.hpp>\nusing namespace hb;\nHB_CLASS(Blueprintable) class ServiceActor : public Character { public: HB_FUNCTION(BlueprintCallable) Vec3 Move(const Vec3& goal); };';
  const serviceSource='#include "UserGame.h"\nVec3 ServiceActor::Move(const Vec3& goal){ Scene::SetWorldPosition(this,goal); Physics::SetVelocity(this,{3,2,0}); Physics::AddForce(this,{10,0,0}); Gameplay::Possess(Gameplay::GetPlayerController(),this); return Scene::GetWorldPosition(this); }';
  const service=await host.build(serviceHeader,serviceSource),serviceObjects=[{id:'parent',position:[3,5,7],rotation:[23,42,17],scale:[2,3,4]},{id:'hero',nativeClass:'ServiceActor',parent:'parent',position:[1,2,3],rotation:[0,0,0],scale:[1,1,1]},{id:'controller',frameworkRole:'playerController',position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]}];
  const moved=await host.call(service.token,{key:'nativeCall',nativeId:'ServiceActor.Move',args:{target:'hero',goal:[7,11,13]},objects:serviceObjects});
  moved.outputs.result.forEach((value,i)=>assert.ok(Math.abs(value-[7,11,13][i])<1e-4,'C++ 부모 회전·크기 월드 변환'));
  assert.deepEqual(moved.operations.map(o=>o.key),['setWorldPosition','setVelocity','addForce','possess'],'사용자 C++ 호출이 BP와 같은 엔진 작업을 전송');
  const {sceneWorldPosition}=await import('../prototype/scene-runtime.js');const state=serviceObjects.map(o=>({...o,...moved.objects.find(v=>v.id===o.id)}));sceneWorldPosition(state[1],state).forEach((value,i)=>assert.ok(Math.abs(value-[7,11,13][i])<1e-4,'C++와 게임 월드 변환 일치'));
  console.log('사용자 C++ 컴파일·공통 API·객체/속성·반환·BP 이벤트 연결 검사 통과');
} finally { host.close(); }
