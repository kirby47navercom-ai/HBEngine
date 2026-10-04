import assert from 'node:assert/strict';
import {NativeHost} from './native-host.mjs';
import {worldPatch} from './native-world-patch.mjs';
import {nativeRequestWorld} from '../prototype/native-model.js';
const host=new NativeHost(),object=(id,x)=>({id,name:id,position:[x,0,0],rotation:[0,0,0],scale:[1,1,1],velocity:[0,0,0],poolActive:false,components:[],nested:{'a~/b':[1,2]}});
try{
  const header='#include <HBEngine/Game.hpp>\nHB_CLASS()\nclass PatchProbe : public hb::Library { public: HB_FUNCTION(BlueprintPure) static hb::Vec3 Read(hb::Actor* target); HB_FUNCTION(BlueprintPure) static int Nested(); HB_FUNCTION(BlueprintCallable) static void Fail(); };',source='#include "User.h"\nhb::Vec3 PatchProbe::Read(hb::Actor* target){ return hb::Scene::GetPosition(target)+hb::Physics::GetVelocity(target); }\nint PatchProbe::Nested(){return hb::bridgeWorld.at(0).at("nested").at("a~/b").at(1).get<int>();}\nvoid PatchProbe::Fail(){throw std::runtime_error("probe failure");}';
  const build=await host.build(header,source),objects=[object('a',1),object('b',2)],request={key:'nativeCall',nativeId:'PatchProbe.Read',args:{target:'a'},objects};
  assert.equal(build.metadata.workerProtocol,2);assert.deepEqual((await host.call(build.token,request)).outputs.result,[1,0,0]);
  assert.deepEqual(nativeRequestWorld(objects,new Set(),{command:'frame'},build.metadata),[],'새 clock 프로토콜은 프론트엔드에서도 세계 직렬화를 생략');
  assert.equal(nativeRequestWorld(objects,new Set(),{command:'frame'},{}).length,2,'이전 worker의 전체 세계 전달 유지');
  objects[0].position=[3,4,5];objects[0].velocity=[1,2,3];objects[0].nested['a~/b'][1]=7;
  assert.deepEqual((await host.call(build.token,request)).outputs.result,[4,6,8]);assert.equal((await host.call(build.token,{...request,nativeId:'PatchProbe.Nested',args:{}})).outputs.result,7,'JSON Pointer 특수 문자와 중첩 배열 변경');
  await host.call(build.token,{command:'frame',delta:.01,objects:[]});objects[0].position=[6,7,8];assert.deepEqual((await host.call(build.token,request)).outputs.result,[7,9,11],'clock frame은 입력 세계 캐시를 바꾸지 않는다');
  delete objects[0].velocity;objects[0].nested.extra=true;objects.splice(1);assert.deepEqual((await host.call(build.token,request)).outputs.result,[6,7,8],'필드·Actor 삭제와 배열 크기 변경');
  await assert.rejects(host.call(build.token,{...request,nativeId:'PatchProbe.Fail',args:{}}),/probe failure/);objects[0].position=[9,0,0];assert.deepEqual((await host.call(build.token,request)).outputs.result,[9,0,0],'실패 뒤 전체 스냅샷으로 복구');
  await host.call(build.token,{command:'reset',objects});objects[0].position=[11,0,0];assert.deepEqual((await host.call(build.token,request)).outputs.result,[11,0,0],'장면 reset 뒤 캐시 초기화');
  const session=host.sessions.get(build.token),child=session.process;await new Promise(resolve=>{child.once('exit',resolve);child.kill();});objects[0].position=[13,0,0];assert.deepEqual((await host.call(build.token,request)).outputs.result,[13,0,0],'worker 재시작 뒤 전체 스냅샷');
  const large=Array.from({length:480},(_,i)=>object('actor'+i,i)),next=structuredClone(large);next[200].position[0]+=.1;const patch=worldPatch(large,next);assert.equal(patch.length,1);assert.ok(JSON.stringify(patch).length<JSON.stringify(next).length/1000);assert.equal(worldPatch(large,next,0),null,'변경 작업 한도 초과 시 전체 스냅샷');
  console.log('실제 C++ 세계 차이 전송·중첩 배열/JSON Pointer·삭제·clock 분리·오류/장면 reset/worker 재시작 복구 통과');
}finally{host.close();}
