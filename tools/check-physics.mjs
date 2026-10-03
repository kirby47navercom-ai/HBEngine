import assert from 'node:assert/strict';
import {physicsCases} from '../prototype/tests/physics-cases.js';
import {NativeHost} from './native-host.mjs';
import {makeSceneComponent as c} from '../prototype/scene-components.js';
import {createRigidPhysics} from '../prototype/physics-world.js';
import {engineOperations} from '../prototype/engine-services.js';
import {BlueprintRuntime} from '../prototype/blueprint-runtime.js';
import {createAsset} from '../prototype/asset-documents.js';
import {makeNode,connect,defaultInputValue,catalog} from '../prototype/blueprint-model.js';

console.log('2D·3D 실제 WASM 강체·회전·관절·CCD·형상 질의',await physicsCases());
const host=new NativeHost(),header=`#include <HBEngine/Game.hpp>
using namespace hb;
HB_CLASS(Blueprintable) class PhysicsActor : public Actor {
public:
HB_FUNCTION(BlueprintPure) HitResult Probe(const Vec3& start,const Vec3& end,int dimension);
HB_FUNCTION(BlueprintPure) std::vector<HitResult> ProbeAll(const Vec3& start,const Vec3& end,int dimension);
HB_FUNCTION(BlueprintPure) std::vector<Actor*> Nearby(const Vec3& center,int dimension);
HB_FUNCTION(BlueprintCallable) HitResult MoveAndProbe(Actor* target);
HB_FUNCTION(BlueprintCallable) void Push(Actor* target);
HB_FUNCTION(BlueprintPure) int CountActors(const std::vector<Actor*>& actors);
};`;
const source=`HitResult PhysicsActor::Probe(const Vec3& start,const Vec3& end,int dimension){return Physics::Raycast(start,end,dimension);}
std::vector<HitResult> PhysicsActor::ProbeAll(const Vec3& start,const Vec3& end,int dimension){return Physics::RaycastAll(start,end,dimension);}
std::vector<Actor*> PhysicsActor::Nearby(const Vec3& center,int dimension){return Physics::OverlapSphere(center,1,dimension);}
HitResult PhysicsActor::MoveAndProbe(Actor* target){Scene::SetLocalPosition(target,{5,0,0});auto before=Physics::Raycast({0,3,0},{0,-3,0});auto after=Physics::Raycast({5,3,0},{5,-3,0});if(before.hit||!after.hit)throw std::runtime_error("query did not see C++ transform");Physics::SetCollisionEnabled(target,false);if(Physics::Raycast({5,3,0},{5,-3,0}).hit)throw std::runtime_error("query did not see C++ collision flag");return after;}
void PhysicsActor::Push(Actor* target){Physics::ApplyForce(target,{2,0,0},"velocityChange");Physics::AddAngularImpulse(target,{0,0,1});}
int PhysicsActor::CountActors(const std::vector<Actor*>& actors){return int(actors.size());}`;
try{
  const build=await host.build(header,source),actor={id:'actor',kind:'empty',name:'Cpp',nativeClass:'PhysicsActor',position:[20,0,0],rotation:[0,0,0],scale:[1,1,1],components:[]};
  for(const dimension of [2,3]){
    const target={id:'target',kind:'empty',name:'Target',position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],components:[c(dimension===2?'CircleCollider2D':'SphereCollider',{},'sphere'),c(dimension===2?'Rigidbody2D':'Rigidbody',{useGravity:false},'body')]},objects=[actor,target];
    const call=(name,args)=>host.call(build.token,{key:'nativeCall',nativeId:'PhysicsActor.'+name,args:{target:actor.id,nativeTarget:actor.id,...args},self:actor.id,objects});
    assert.equal((await call('Probe',{start:[0,3,0],end:[0,-3,0],dimension})).outputs.result.actor,target.id);
    assert.equal((await call('ProbeAll',{start:[0,3,0],end:[0,-3,0],dimension})).outputs.result.length,1);
    assert.deepEqual((await call('Nearby',{center:[0,0,0],dimension})).outputs.result,['target']);
    assert.equal((await call('CountActors',{actors:[actor.id,target.id,null]})).outputs.result,3);
    await assert.rejects(call('CountActors',{actors:['unknown']}),/참조 오류/);
    const world=createRigidPhysics(objects);await world.ready();const pushed=await call('Push',{target:target.id});const services=engineOperations({update:()=>{},readAsset:async()=>null}),vm=new BlueprintRuntime(objects,[],services);await vm.start();for(const op of pushed.operations)await services.operation(op.key,op.args,{self:target.id},vm);await vm.tick(1/60);assert.ok(target.velocity[0]>1.9&&Math.abs(target.angularVelocity[2])>.1);await vm.stop();services.dispose();world.dispose();
    if(dimension===3){target.position=[0,0,0];assert.equal((await call('MoveAndProbe',{target:target.id})).outputs.result.actor,'target');}
  }
  const scene=[{id:'bp',kind:'empty',name:'Bp',position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],components:[]},{id:'hit',kind:'empty',name:'Hit',position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],components:[c('SphereCollider')]}],graph=createAsset('blueprint','BP_Physics','Actor');graph.nodes=[];graph.edges=[];
  const event=makeNode('beginPlay'),probe=makeNode('physicsRaycast'),members=makeNode('members'),print=makeNode('print');probe.inputValues={start:[0,3,0],end:[0,-3,0]};probe.splitPins=['out:return'];graph.nodes.push(event,probe,members,print);connect(graph,{node:event.id,pin:'then'},{node:print.id,pin:'exec'});assert.ok(connect(graph,{node:probe.id,pin:'return.actor'},{node:members.id,pin:'target'}).ok);assert.ok(connect(graph,{node:members.id,pin:'name'},{node:print.id,pin:'message'}).ok);
  const logs=[],svc=engineOperations({update:()=>{},readAsset:async()=>null}),vm=new BlueprintRuntime(scene,[{root:graph,self:'bp'}],{...svc,log:m=>logs.push(m)});await vm.start();assert.deepEqual(logs,['Hit']);await vm.stop();svc.dispose();
  const spec=catalog.find(n=>n.key==='physicsRaycast');assert.equal(defaultInputValue(probe,spec.inputs.find(p=>p.id==='dimension')),3);assert.equal(defaultInputValue(probe,spec.inputs.find(p=>p.id==='mask')),-1);
  console.log('실제 C++ 동기 질의·HitResult/배열·함수 안 이동/충돌 변경·힘/각 충격량·블루프린트 분할 핀 검사 통과');
}finally{host.close();}
