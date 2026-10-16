import {randomUUID} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {NativeHost} from './native-host.mjs';
import {makeSceneComponent as c} from '../prototype/scene-components.js';
import {createWorldAsset,terrainMesh,meshColliderChunks} from '../prototype/world-assets.js';
import {retainTestEvidence} from './test-artifacts.mjs';
const sessionId=randomUUID(),benchmarkId=randomUUID();
const work=await fs.mkdtemp(path.resolve('native/build/engine-180-native-'));retainTestEvidence(work);const host=new NativeHost();
const actor=(id='Cube')=>({id,name:id,kind:'empty',position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],components:[c('BoxCollider')]});
const header=name=>'#include <HBEngine/Game.hpp>\nHB_CLASS() class '+name+' : public hb::Library { public: HB_FUNCTION(BlueprintPure) static float Cast();HB_FUNCTION(BlueprintCallable) static bool MoveThenCast(float x); };';
const source=name=>'#include "User.h"\nfloat '+name+'::Cast(){auto hit=hb::Physics::Raycast({0,5,0},{0,-5,0});return hit.hit?hit.position.y:-999;}bool '+name+'::MoveThenCast(float x){auto* a=hb::Scene::FindActorById("Cube");a->transform.position.x=x;return hb::Physics::Raycast({0,5,0},{0,-5,0}).hit;}';
try{
 const a=await host.build(header('PhysicsCacheA'),source('PhysicsCacheA')),b=await host.build(header('PhysicsCacheB'),source('PhysicsCacheB')),rows=[actor()],invoke=(token,name,objects=rows,args={},session='game')=>host.call(token,{key:'nativeCall',nativeId:name,args,objects,gameSession:{id:session==='benchmark'?benchmarkId:sessionId,actor:null,state:{},arguments:{}}});
 const first=await invoke(a.token,'PhysicsCacheA.Cast');assert.ok(Math.abs(first.outputs.result-.5)<1e-5);assert.equal(first.transport.physicsQueryCount,1);const second=await invoke(b.token,'PhysicsCacheB.Cast');assert.equal(second.transport.physicsCacheReused,true);assert.equal(host.inspectResources().physicsQueries.worldBuilds,1);
 const far=structuredClone(rows);far[0].position[0]=20;const concurrent=await Promise.all([invoke(a.token,'PhysicsCacheA.Cast',rows),invoke(b.token,'PhysicsCacheB.Cast',far)]);assert.ok(Math.abs(concurrent[0].outputs.result-.5)<1e-5);assert.equal(concurrent[1].outputs.result,-999);
 const moved=await invoke(a.token,'PhysicsCacheA.MoveThenCast',rows,{x:20});assert.equal(moved.outputs.result,false);const restored=await invoke(a.token,'PhysicsCacheA.MoveThenCast',rows,{x:0});assert.equal(restored.outputs.result,true);assert.equal(host.inspectResources().physicsQueries.worldBuilds,1);
 const terrain=createWorldAsset('terrain','Bench');terrain.resolution=[65,65];terrain.heights=Array(65*65).fill(0);terrain.weights=Array(65*65).fill(0).map(()=>[1]);const mesh=actor('Terrain');mesh.components=[];mesh.tileColliders=meshColliderChunks(terrainMesh(terrain)).map((chunk,i)=>c('MeshCollider',{...chunk,mode:'mesh'},'mesh'+i));const fresh=[],cached=[];
 for(let i=0;i<5;i++){
  host.physicsQueryPool.maxIdleWorlds=0;host.physicsQueryPool.clear();let at=performance.now();const old=await invoke(a.token,'PhysicsCacheA.Cast',[mesh],{},'benchmark');fresh.push({rpcMs:performance.now()-at,...old.transport});
  host.physicsQueryPool.maxIdleWorlds=1;host.physicsQueryPool.clear();await invoke(a.token,'PhysicsCacheA.Cast',[mesh],{},'benchmark');at=performance.now();const next=await invoke(a.token,'PhysicsCacheA.Cast',[mesh],{},'benchmark');cached.push({rpcMs:performance.now()-at,...next.transport});assert.equal(next.transport.physicsCacheReused,true);assert.equal(next.outputs.result,old.outputs.result);
 }
 const beforeRelease=host.inspectResources().physicsQueries;await host.release(a.token);await host.release(b.token);assert.equal(host.inspectResources().physicsQueries.worlds,0);
 const result={passed:true,sharedAcrossCppModules:true,concurrentWorldIsolation:true,cppTransformReadAfterWrite:true,releaseClearsPool:true,first:first.transport,second:second.transport,beforeRelease,paired:{triangles:8192,fresh,cached,scope:'Same compiled C++ function/worker and Node process; per-call cache retention toggled. CPU/RPC evidence only, not game FPS'}};await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({work,...result}));
}catch(error){await fs.writeFile(path.join(work,'failure.json'),JSON.stringify({error:error.stack,resources:host.inspectResources()},null,2));throw error;}finally{host.close();}
