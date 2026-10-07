import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRigidPhysics,validPhysicsSnapshot,physicsContract} from '../prototype/physics-world.js';
import {makeSceneComponent as component} from '../prototype/scene-components.js';
import {NativePhysicsQueries} from '../prototype/native-physics-query.js';
import {NativeHost} from './native-host.mjs';

const dir=await fs.mkdtemp(path.resolve(import.meta.dirname,'../native/build/physics-capacity-')),cases=[],timings=[];
const actor=(id,dim,position)=>({id,name:id,kind:'empty',visible:true,position,rotation:[0,0,0],scale:[1,1,1],components:[component(dim===2?'BoxCollider2D':'BoxCollider',{extent:[.25,.25,.25]},'shape')]});
const args=dimension=>({dimension,mask:-1,includeTriggers:false,ignore:null});
async function world(objects,run){const physics=createRigidPhysics(objects),start=performance.now();try{await physics.ready();await run(physics);timings.push({objects:objects.length,ms:Math.round(performance.now()-start)});}finally{physics.dispose();}}

for(const dim of [2,3]){
  const row=Array.from({length:1201},(_,i)=>actor('row-'+String(i).padStart(4,'0'),dim,[i*2,0,0]));
  await world(row,p=>{
    const ray={...args(dim),start:[-1,0,0],end:[2402,0,0]},all=p.query('physicsRaycastAll',ray);
    assert.equal(all.length,row.length,'All query must not silently stop at 1,000');
    assert.deepEqual(all.map(hit=>hit.actor),row.map(o=>o.id));
    assert.equal(p.query('physicsRaycast',ray).actor,row[0].id);
    assert.equal(p.query('physicsRaycastAll',{...ray,ignore:row[0].id}).length,1200);
    assert.deepEqual(p.query('physicsRaycastAll',{...ray,mask:0}),[]);
  });cases.push(dim+'D 1,201 sorted ray hits, nearest ray, ignore and layer filter');

  const grid=Array.from({length:10001},(_,i)=>actor('grid-'+i,dim,[i%101*3,Math.floor(i/101)*3,0]));
  assert.ok(validPhysicsSnapshot(grid),'collider snapshot must not reject 8,001+ colliders');
  await world(grid,p=>{
    assert.equal(p.inspect().dimensions.find(d=>d.dimension===dim).bodies.length,grid.length);
    p.step(1/60);
    const found=p.query('physicsOverlapBox',{...args(dim),center:[150,150,0],extent:[151,151,1],rotation:[0,0,0]});
    assert.deepEqual(found,grid.map(o=>o.id).sort());
    grid.at(-1).components[0].properties.enabled=false;
    assert.equal(p.query('physicsOverlapBox',{...args(dim),center:[150,150,0],extent:[151,151,1]}).length,10000);
  });cases.push(dim+'D 10,001 actual Rapier colliders, simulation step and all overlaps');

  const joints=Array.from({length:600},(_,i)=>{
    const o=actor('joint-'+i,dim,[i*3,0,0]);o.components.push(component(dim===2?'Rigidbody2D':'Rigidbody',{useGravity:false},'body'),component(dim===2?'PhysicsConstraint2D':'PhysicsConstraint',{jointType:'fixed'},'joint'));return o;
  });await world(joints,p=>{assert.equal(p.inspect().dimensions.find(d=>d.dimension===dim).joints.length,600);p.step(1/60);});cases.push(dim+'D 600 actual joints and a solver step');
}

const tileActor=actor('tiles',2,[0,0,0]);tileActor.components=[];
tileActor.tileColliders=Array.from({length:8001},(_,i)=>component('BoxCollider2D',{center:[i%100,Math.floor(i/100),0],extent:[.1,.1,.1]},'tile-'+i));
assert.ok(validPhysicsSnapshot([tileActor]));
await world([tileActor],p=>{assert.equal(p.inspect().dimensions.find(d=>d.dimension===2).bodies[0].colliders,8001);assert.deepEqual(p.query('physicsOverlapBox',{...args(2),center:[50,40,0],extent:[51,41,1]}),['tiles']);});
cases.push('8,001 tile colliders on one actor; overlap actor IDs deduplicated');
const malformed=structuredClone(tileActor);malformed.tileColliders.at(-1).properties.extent[0]=-1;assert.equal(validPhysicsSnapshot([malformed]),false);
assert.equal(validPhysicsSnapshot([tileActor,tileActor]),false);cases.push('invalid collider shape and duplicate actor IDs still rejected');

const nativeObjects=Array.from({length:1201},(_,i)=>actor('cpp-'+String(i).padStart(4,'0'),3,[i*2,0,0])),queries=new NativePhysicsQueries(nativeObjects);
try{
  const result=await queries.query({key:'physicsRaycastAll',args:{...args(3),start:[-1,0,0],end:[2402,0,0]},objects:nativeObjects});assert.equal(result.length,1201);
  const bad=structuredClone(nativeObjects);bad.at(-1).components[0].properties.extent[0]=-1;
  await assert.rejects(queries.query({key:'physicsRaycastAll',args:{...args(3),start:[-1,0,0],end:[2402,0,0]},objects:bad}),/물리 월드 범위/);
}finally{queries.close();}cases.push('C++ query snapshot returns 1,201 hits and rejects malformed geometry');

const host=new NativeHost();try{
  const header='#include <HBEngine/Game.hpp>\nHB_CLASS()\nclass PhysicsCapacityProbe : public hb::Library {public: HB_FUNCTION(BlueprintPure) static int CountRay(); HB_FUNCTION(BlueprintPure) static int CountOverlap();};';
  const source='#include "User.h"\nint PhysicsCapacityProbe::CountRay(){return int(hb::Physics::RaycastAll({-1,0,0},{2402,0,0}).size());}\nint PhysicsCapacityProbe::CountOverlap(){return int(hb::Physics::OverlapBox({1200,0,0},{1202,1,1},{0,0,0}).size());}';
  const build=await host.build(header,source);
  for(const name of ['CountRay','CountOverlap']){const reply=await host.call(build.token,{key:'nativeCall',nativeId:'PhysicsCapacityProbe.'+name,args:{},objects:nativeObjects});assert.equal(reply.outputs.result,1201);}
}finally{host.close();}cases.push('actual compiled C++ Physics::RaycastAll / OverlapBox receive 1,201 results');

for(const key of ['collidersPerDimension','querySnapshotColliders','querySnapshotObjects','jointsPerDimension','queryResults'])assert.equal(physicsContract.limits[key],null);
const checkedFiles={};for(const name of ['prototype/physics-world.js','prototype/native-physics-query.js'])checkedFiles[name]=createHash('sha256').update(await fs.readFile(path.resolve(import.meta.dirname,'..',name))).digest('hex');
await fs.writeFile(path.join(dir,'acceptance.json'),JSON.stringify({passed:true,cases,timings,checkedFiles,performanceBenchmark:false,countsAreTestInputsNotLimits:true},null,2));
console.log(JSON.stringify({passed:true,dir,cases:cases.length,timings}));
