import assert from 'node:assert/strict';
import {collisionGeometryCases,geometryObject,lMesh,lPath} from '../prototype/tests/collision-geometry-cases.js';
import {NativeHost} from './native-host.mjs';
import {assetReferences} from './project-service.mjs';
import {renameAssetReferences} from '../prototype/asset-documents.js';
import {engineSchema} from './editor-automation.mjs';
import {editComponentProperty,componentDefaults,validComponentProperties,physicsGeometryError} from '../prototype/scene-components.js';

console.log('실제 2D·3D 편집/실행 형상 검사',await collisionGeometryCases());
const schema=engineSchema();assert.equal(schema.physics.geometry.polygon.decomposition,'exact ear-clipped triangles in one compound collider');assert.ok(schema.commands['collision.bake']);for(const type of ['Rigidbody','Rigidbody2D','MeshCollider','PolygonCollider2D','PooledActor','UIWidget'])assert.ok(schema.components[type],'Schema component: '+type);
for(const type of ['Rigidbody','Rigidbody2D']){const kinematic=editComponentProperty(type,componentDefaults(type),'bodyType','kinematic'),dynamic=editComponentProperty(type,kinematic,'isKinematic',false);assert.equal(dynamic.bodyType,'dynamic');assert.equal(dynamic.isKinematic,false);}
for(const type of ['PhysicsConstraint','PhysicsConstraint2D']){const spring=editComponentProperty(type,{...componentDefaults(type),jointType:'hinge',enableLimit:true,useMotor:true},'jointType','spring');assert.equal(spring.enableLimit,false);assert.equal(spring.useMotor,false);assert.ok(validComponentProperties(type,spring));}
assert.match(physicsGeometryError(geometryObject('dynamic','MeshCollider',{mode:'mesh'},{}).components),/동적 강체/);
const refs={components:[{properties:{sourceMesh:'Assets/Cube.obj'}}]};assert.deepEqual(assetReferences(refs,'BP.hbblueprint.json'),['Assets/Cube.obj']);assert.ok(renameAssetReferences(refs,'Assets/Cube.obj','Assets/New.obj'));assert.equal(refs.components[0].properties.sourceMesh,'Assets/New.obj');
const host=new NativeHost();
try{
  const build=await host.build(`#include <HBEngine/Game.hpp>\nusing namespace hb;\nHB_CLASS(Blueprintable) class ShapeProbe : public Actor {public: HB_FUNCTION(BlueprintPure) HitResult Probe(Vec3 start,Vec3 end,int dimension); HB_FUNCTION(BlueprintPure) std::vector<Actor*> Nearby(Vec3 point,int dimension);};`,`HitResult ShapeProbe::Probe(Vec3 start,Vec3 end,int dimension){return Physics::Raycast(start,end,dimension);} std::vector<Actor*> ShapeProbe::Nearby(Vec3 point,int dimension){return Physics::OverlapSphere(point,.1,dimension);}`);
  const owner={id:'cpp',name:'Cpp',nativeClass:'ShapeProbe',kind:'empty',position:[20,0,0],rotation:[0,0,0],scale:[1,1,1],components:[]};
  for(const [type,p,dimension,start,end,inside,gap] of [['MeshCollider',lMesh,3,[.5,1.5,2],[.5,1.5,-2],[.5,1.5,0],[1.5,1.5,0]],['PolygonCollider2D',{paths:[lPath]},2,[-1,1.5,0],[1,1.5,0],[.5,1.5,0],[1.5,1.5,0]],['EdgeCollider2D',{points:[[-2,0],[2,0]]},2,[0,2,0],[0,-2,0],[0,0,0],[0,1,0]],['MeshCollider',{},3,[0,2,0],[0,-2,0],[0,0,0],[2,0,0]]]){
    const target=geometryObject('shape',type,p),call=(name,args)=>host.call(build.token,{key:'nativeCall',nativeId:'ShapeProbe.'+name,args:{target:owner.id,nativeTarget:owner.id,...args},self:owner.id,objects:[owner,target]});
    assert.equal((await call('Probe',{start,end,dimension})).outputs.result.actor,'shape');assert.deepEqual((await call('Nearby',{point:inside,dimension})).outputs.result,['shape']);assert.deepEqual((await call('Nearby',{point:gap,dimension})).outputs.result,[]);
  }
  console.log('실제 C++ 사용자 함수의 볼록/삼각형/오목 다각형/선분 동기 질의와 AI 스키마·참조 검사 통과');
}finally{host.close();}
