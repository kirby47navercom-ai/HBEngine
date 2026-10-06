import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import * as THREE from 'three';
import {NativeHost} from './native-host.mjs';
import {createAsset} from '../prototype/asset-documents.js';
import {makeSceneComponent} from '../prototype/scene-components.js';
import {parseNativeHeader,nativeRequestWorld} from '../prototype/native-model.js';
import {preparePlayWorld} from '../prototype/play-world.js';
import {BlueprintRuntime} from '../prototype/blueprint-runtime.js';
import {engineOperations} from '../prototype/engine-services.js';
import {nativeSpawnRequest} from '../prototype/native-spawn.js';
import {nativeWorldClient} from '../prototype/native-transport.js';

const dir=await fs.mkdtemp(path.resolve(import.meta.dirname,'../native/build/native-spawn-')),host=new NativeHost(),cases=[];
try{
  const header=`#include <HBEngine/Game.hpp>
HB_CLASS(Blueprintable) class EnemyStats:public hb::Character{public:HB_PROPERTY(BlueprintReadWrite) float MaxHp=7.25;HB_PROPERTY(BlueprintReadWrite) float Speed=3;HB_PROPERTY(BlueprintReadWrite) hb::Actor* Peer=nullptr;HB_PROPERTY(BlueprintReadWrite) std::string Label="root";HB_FUNCTION(BlueprintPure) float ReadHp();HB_FUNCTION(BlueprintCallable) std::string StartOwnedTimer();};
HB_CLASS() class Spawner:public hb::Library{public:
 HB_FUNCTION(BlueprintCallable) static hb::Actor* Create(const std::string& asset,const hb::Transform& at);
 HB_FUNCTION(BlueprintCallable) static void Remove(hb::Actor* target);
 HB_FUNCTION(BlueprintCallable) static bool ReuseInOneCall(const std::string& asset);
 HB_FUNCTION(BlueprintCallable) static std::vector<hb::Actor*> Burst(const std::string& asset,int count);
 HB_FUNCTION(BlueprintPure) static int CountRefs(const std::vector<hb::Actor*>& refs);
 HB_FUNCTION(BlueprintCallable) static bool PrefabRefs(const std::string& asset);
 HB_FUNCTION(BlueprintCallable) static std::string TimerThenDestroy(const std::string& asset);
 HB_FUNCTION(BlueprintCallable) static void FailAfterSpawn(const std::string& asset);
};`,source=`float EnemyStats::ReadHp(){return MaxHp;}
std::string EnemyStats::StartOwnedTimer(){return hb::Timers::SetTimer(.01f,false,"Expired");}
bool Spawner::PrefabRefs(const std::string& asset){auto* root=dynamic_cast<EnemyStats*>(hb::Scene::Spawn(asset,{}));auto* peer=dynamic_cast<EnemyStats*>(root->Peer);return peer&&peer!=root&&peer->Peer==peer&&root->Label=="root"&&peer->MaxHp==10;}
std::string Spawner::TimerThenDestroy(const std::string& asset){auto* actor=hb::Scene::Spawn(asset,{});const auto result=hb::Native::Call(actor,"StartOwnedTimer");const auto handle=result.at("result").get<std::string>();if(!hb::Timers::IsTimerActive(handle))throw std::runtime_error("timer was not created");hb::Scene::Destroy(actor);if(hb::Timers::IsTimerActive(handle))throw std::runtime_error("destroy must clear timer owner");return handle;}
hb::Actor* Spawner::Create(const std::string& asset,const hb::Transform& at){auto* actor=hb::Scene::Spawn(asset,at);auto* typed=dynamic_cast<EnemyStats*>(actor);if(!typed)throw std::runtime_error("spawn must be an actual EnemyStats instance");if(typed->MaxHp!=10)throw std::runtime_error("inherited default was not applied before return");typed->MaxHp=8;typed->transform.position.x+=2;if(hb::Scene::GetAllActorsOfClass("EnemyStats").empty())throw std::runtime_error("spawn not visible to same-call search");return actor;}
void Spawner::Remove(hb::Actor* target){hb::Scene::Destroy(target);hb::Scene::Destroy(target);}
bool Spawner::ReuseInOneCall(const std::string& asset){hb::Transform at;auto* first=hb::Scene::Spawn(asset,at);dynamic_cast<EnemyStats*>(first)->MaxHp=1;hb::Scene::Destroy(first);auto* next=hb::Scene::Spawn(asset,at);return next==first&&dynamic_cast<EnemyStats*>(next)->MaxHp==10;}
std::vector<hb::Actor*> Spawner::Burst(const std::string& asset,int count){std::vector<hb::Actor*> actors;for(int i=0;i<count;i++){hb::Transform at;at.position.x=i;actors.push_back(hb::Scene::Spawn(asset,at));}return actors;}
int Spawner::CountRefs(const std::vector<hb::Actor*>& refs){int n=0;for(auto* ref:refs)if(ref)n++;return n;}
void Spawner::FailAfterSpawn(const std::string& asset){hb::Scene::Spawn(asset,{});throw std::runtime_error("intentional spawn failure");}`;
  const native={...parseNativeHeader(header),header,source,headerPath:'Source/Game.h',sourcePath:'Source/Game.cpp'},director=createAsset('blueprint','BP_Director'),parent=createAsset('blueprint','BP_Enemy'),child=createAsset('blueprint','BP_Skeleton','Assets/BP_Enemy.hbblueprint.json');
  director.variables.push({id:'missing',name:'Missing',type:'object',container:'array',value:['Ghost','Ghost']});director.native=structuredClone(native);parent.native=structuredClone(native);parent.settings.parentClass='EnemyStats';parent.components=[makeSceneComponent('SpriteRenderer'),makeSceneComponent('PooledActor',{maxInactive:30})];child.nodes=[];child.edges=[];child.variables=[];child.components=[];child.settings.nativeDefaults={'EnemyStats.MaxHp':10};
  const assets=new Map([['Assets/BP_Director.hbblueprint.json',director],['Assets/BP_Enemy.hbblueprint.json',parent],['Assets/BP_Skeleton.hbblueprint.json',child]]),objects=[{id:'director',name:'Director',kind:'empty',visible:true,position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],blueprintAsset:'Assets/BP_Director.hbblueprint.json'}],prepared=await preparePlayWorld(objects,{autoSpawnPlayer:false,dimension:'2d'},{readAsset:async p=>structuredClone(assets.get(p)),readText:async p=>p.endsWith('.h')?header:source,buildNative:(h,s)=>host.build(h,s),listAssets:async()=>[...assets.keys()].map(path=>({path,kind:'blueprint'}))});
  const prefab=createAsset('prefab','PF_Refs');prefab.root='root';prefab.objects=['root','mesh'].map(id=>({id,name:id,kind:'empty',visible:true,position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],...(id==='mesh'?{parent:'root'}:{}),blueprintAsset:'Assets/BP_Skeleton.hbblueprint.json',overrides:{nativeProperties:{Peer:'mesh'}}}));assets.set('Assets/PF_Refs.hbprefab.json',prefab);
  const {prepareSpawnCatalog}=await import('../prototype/runtime-spawn.js');prepared.spawnCatalog=await prepareSpawnCatalog([...assets.keys()].map(path=>({path,kind:path.includes('prefab')?'prefab':'blueprint'})),{readAsset:async p=>structuredClone(assets.get(p)),readText:async p=>p.endsWith('.h')?header:source,buildNative:(h,s)=>host.build(h,s),builds:prepared.builds,nativeBuilds:prepared.nativeBuilds});
  assert.ok(prepared.spawnCatalog);assert.equal(new Set([...prepared.builds.values()].map(b=>b.token)).size,1);
  const warnings=[],groups=new Map(),services=engineOperations({spawnCatalog:prepared.spawnCatalog,readAsset:async p=>structuredClone(assets.get(p)),gameplay:prepared.gameplay,physicsOptions:{backend:'legacy',gravity:[0,0,0]},build:o=>{const g=new THREE.Group();groups.set(o.id,g);return g;},update(){},remove:o=>groups.delete(o.id),mesh:id=>groups.get(id)}),vm=new BlueprintRuntime(objects,prepared.bindings,{...services,inputAssets:prepared.inputAssets,log:m=>warnings.push(m)}),build=prepared.builds.get('Assets/BP_Director.hbblueprint.json');
  await vm.start();const paths=new Set(prepared.builds.keys()),call=async(name,args={})=>{
    const request={key:'nativeCall',nativeId:'Spawner.'+name,self:'director',args,objects:nativeRequestWorld(objects,paths,{},build.metadata),...nativeSpawnRequest(vm,build,prepared.spawnCatalog)},before=JSON.stringify(request.objects),reply=await nativeWorldClient(build,vm).call(request,build.metadata,p=>host.call(build.token,p));assert.equal(JSON.stringify(request.objects),before,'protocol validation must not mutate the request world');
    for(const state of reply.objects){const o=vm.object(state.id);if(o)Object.assign(o,state);}for(const op of reply.operations)await services.operation(op.key,op.args,vm.bindings[0],vm);return reply;
  };
  try{
    assert.deepEqual(vm.bindings[0].variables.get('missing'),[null,null]);assert.equal(warnings.length,1);assert.equal((await call('CountRefs',{refs:vm.bindings[0].variables.get('missing')})).outputs.result,0);assert.deepEqual(director.variables.find(v=>v.id==='missing').value,['Ghost','Ghost']);cases.push('missing BP actor arrays become C++ nullptr entries, warn once and preserve authored data');
    const at={position:[11,22,0],rotation:[0,0,90],scale:[2,2,1]},reply=await call('Create',{asset:'BP_Skeleton',at}),id=reply.outputs.result;
    assert.equal(reply.operations.length,1);assert.deepEqual(vm.object(id).position,[13,22,0]);assert.equal(vm.object(id).nativeProperties.MaxHp,8);assert.equal(vm.object(id).nativeClass,'EnemyStats');assert.equal(vm.bindings.find(b=>b.self===id).root.name,'BP_Skeleton');cases.push('compiled Spawn returns the real derived C++ object with inherited HP10, exposes same-call search and commits C++ transform/property writes');
    await call('Remove',{target:id});assert.equal(vm.object(id).poolActive,false);const reused=await call('Create',{asset:'Assets/BP_Skeleton.hbblueprint.json',at});assert.equal(reused.outputs.result,id);assert.equal(vm.object(id).nativeProperties.MaxHp,8);await call('Remove',{target:id});assert.equal((await call('ReuseInOneCall',{asset:'BP_Skeleton'})).outputs.result,true);assert.equal(vm.objects.find(o=>o.spawnAsset==='Assets/BP_Skeleton.hbblueprint.json').nativeProperties.MaxHp,10);cases.push('Spawn/Destroy/Spawn in one C++ call reuses the same actual pointer and resets inherited defaults');
    const burst=await call('Burst',{asset:'BP_Skeleton',count:24});assert.equal(new Set(burst.outputs.result).size,24);assert.equal(burst.outputs.result.filter(id=>vm.object(id)?.poolActive).length,24);cases.push('24 actors are created from C++ without authored pool objects');
    assert.equal((await call('PrefabRefs',{asset:'PF_Refs'})).outputs.result,true);cases.push('prefab forward actor references resolve to real derived objects after all children are registered; plain strings stay authored');
    const timer=(await call('TimerThenDestroy',{asset:'BP_Skeleton'})).outputs.result;assert.match(timer,/^timer_/);const frame=await host.call(build.token,{command:'frame',delta:.1,objects:[],...nativeSpawnRequest(vm,build,prepared.spawnCatalog)});assert.deepEqual(frame.timerCallbacks,[]);cases.push('destroying a spawned actor clears its actual native timer and prevents stale callbacks');
    const before=vm.objects.length;await assert.rejects(call('FailAfterSpawn',{asset:'BP_Skeleton'}),/intentional spawn failure/);assert.equal(vm.objects.length,before);const after=await call('Burst',{asset:'BP_Skeleton',count:1});assert.equal(after.outputs.result.length,1);cases.push('failed C++ spawn applies no VM operations and the following call recovers');
    const beforeBatch=vm.objects.length,batchRequest={self:'director',calls:[{key:'nativeCall',nativeId:'Spawner.CountRefs',self:'director',args:{refs:[]}},{key:'nativeCall',nativeId:'Spawner.FailAfterSpawn',self:'director',args:{asset:'Actor'}}],objects:nativeRequestWorld(objects,paths,{},build.metadata),...nativeSpawnRequest(vm,build,prepared.spawnCatalog)},batch=await nativeWorldClient(build,vm).call(batchRequest,build.metadata,p=>host.call(build.token,p));assert.equal(batch.results.length,1);assert.equal(batch.results[0].outputs.result,0);assert.match(batch.nativeError,/intentional spawn failure/);assert.deepEqual(batch.operations,[]);assert.equal(vm.objects.length,beforeBatch);assert.equal((await call('CountRefs',{refs:[]})).outputs.result,0);cases.push('a failed generic Actor Spawn in a batch preserves the preceding result, emits no commands and recovers without out-of-range rollback');
  }finally{await vm.stop();services.dispose();}
  await fs.writeFile(path.join(dir,'acceptance.json'),JSON.stringify({passed:true,cases},null,2));console.log(JSON.stringify({dir,passed:true,cases}));
}catch(error){await fs.writeFile(path.join(dir,'failure.json'),JSON.stringify({passed:false,error:error.stack},null,2));console.error(JSON.stringify({dir,passed:false,error:error.message}));throw error;}finally{host.close();}
