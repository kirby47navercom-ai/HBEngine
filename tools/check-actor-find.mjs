import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {NativeHost} from './native-host.mjs';
import {actorClassNames,findRuntimeActors} from '../prototype/runtime-actors.js';
import {engineOperations} from '../prototype/engine-services.js';

const dir=await fs.mkdtemp(path.resolve(import.meta.dirname,'../native/build/actor-find-'));
try{
const row=(id,kind='cube')=>({id,name:id,kind,visible:true,position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],components:[]});
const root={name:'BP_Skeleton',settings:{parentClass:'EnemyStats'},native:{classes:[{name:'EnemyStats',base:'Character'}]},inheritance:{ancestors:['Assets/BP_Enemy.hbblueprint.json']}};
const objects=[{...row('s0'),blueprintAsset:'Assets/BP_Skeleton.hbblueprint.json',nativeClass:'EnemyStats',nativeProperties:{MaxHp:10},tags:['Enemy']},{...row('s1'),blueprintAsset:'Assets/BP_Skeleton.hbblueprint.json',nativeClass:'EnemyStats',nativeProperties:{MaxHp:7.25},poolActive:false,tags:['Enemy']},{...row('camera','camera'),tags:['MainCamera']},{...row('dead'),destroying:true,tags:['Enemy']},row('widget','widget'),row('component','component')];
for(const o of objects)o.actorClasses=actorClassNames(o,o.id.startsWith('s')?root:null);
const cases=[];
for(const name of ['EnemyStats','BP_Skeleton','BP_Enemy','Assets/BP_Enemy.hbblueprint.json','Character','Pawn']){assert.deepEqual(findRuntimeActors(objects,'sceneFindClass',{className:name,includeInactive:false}).return,['s0']);assert.deepEqual(findRuntimeActors(objects,'sceneFindClass',{className:name,includeInactive:true}).return,['s0','s1']);}
assert.deepEqual(findRuntimeActors(objects,'sceneFindClass',{className:'Actor',includeInactive:false}).return,['s0','camera']);assert.deepEqual(findRuntimeActors(objects,'sceneFindClass',{className:'',includeInactive:false}).return,[]);assert.deepEqual(findRuntimeActors(objects,'sceneFindTag',{tag:'MainCamera',includeInactive:false}).return,['camera']);assert.equal(findRuntimeActors(objects,'sceneFindId',{id:'s1',includeInactive:false}).return,null);assert.equal(findRuntimeActors(objects,'sceneFindId',{id:'s1',includeInactive:true}).return,'s1');assert.equal(findRuntimeActors(objects,'sceneFindId',{id:'missing',includeInactive:true}).return,null);assert.throws(()=>findRuntimeActors(objects,'sceneFindId',{id:'s0',includeInactive:'yes'}));cases.push('JS BP/native/builtin ancestry, active/inactive, exact tags, ID/null and invalid inputs');
const services=engineOperations({readAsset:async()=>{throw Error('unexpected asset read');}}),vm={objects,object:id=>objects.find(o=>o.id===id)},binding={self:'s0',root};
try{assert.deepEqual(await services.operation('sceneFindClass',{className:'Pawn',includeInactive:false},binding,vm),{return:['s0']});assert.deepEqual(await services.operation('sceneFindTag',{tag:'MainCamera',includeInactive:false},binding,vm),{return:['camera']});assert.deepEqual(await services.operation('sceneFindId',{id:'missing',includeInactive:false},binding,vm),{return:null});cases.push('shared Editor/Player/headless engine service returns the same results');}finally{services.dispose();}
const header=`#include <HBEngine/Game.hpp>
HB_CLASS(Blueprintable) class EnemyStats:public hb::Character{public:HB_PROPERTY(BlueprintReadWrite) float MaxHp=7.25;};
HB_CLASS() class Finder:public hb::Library{public:
 HB_FUNCTION(BlueprintPure) static std::vector<hb::Actor*> ByClass(const std::string& name,bool inactive);
 HB_FUNCTION(BlueprintPure) static std::vector<hb::Actor*> ByTag(const std::string& tag,bool inactive);
 HB_FUNCTION(BlueprintPure) static hb::Actor* ById(const std::string& id,bool inactive);
 HB_FUNCTION(BlueprintPure) static float ActualClassHp();
 HB_FUNCTION(BlueprintCallable) static int TagAndFind(hb::Actor* target);
};`,source=`std::vector<hb::Actor*> Finder::ByClass(const std::string& name,bool inactive){return hb::Scene::GetAllActorsOfClass(name,inactive);}
std::vector<hb::Actor*> Finder::ByTag(const std::string& tag,bool inactive){return hb::Scene::GetActorsWithTag(tag,inactive);}
hb::Actor* Finder::ById(const std::string& id,bool inactive){return hb::Scene::FindActorById(id,inactive);}
float Finder::ActualClassHp(){auto* e=dynamic_cast<EnemyStats*>(hb::Scene::FindActorById("s0"));return e?e->MaxHp:-1;}
int Finder::TagAndFind(hb::Actor* target){hb::Tags::Add(target,"MainCamera");return static_cast<int>(hb::Scene::GetActorsWithTag("MainCamera").size());}`;
const host=new NativeHost();try{const build=await host.build(header,source),cppObjects=objects.filter(o=>!['widget','component'].includes(o.kind)),call=async(member,args={})=>host.call(build.token,{key:'nativeCall',nativeId:'Finder.'+member,self:'s0',args,objects:cppObjects});
  for(const name of ['EnemyStats','BP_Skeleton','BP_Enemy','Assets/BP_Enemy.hbblueprint.json','Character','Pawn'])for(const inactive of [false,true])assert.deepEqual((await call('ByClass',{name,inactive})).outputs.result,findRuntimeActors(objects,'sceneFindClass',{className:name,includeInactive:inactive}).return);
  assert.deepEqual((await call('ByTag',{tag:'MainCamera',inactive:false})).outputs.result,['camera']);assert.equal((await call('ById',{id:'missing',inactive:true})).outputs.result,null);assert.equal((await call('ById',{id:'s1',inactive:false})).outputs.result,null);assert.equal((await call('ById',{id:'s1',inactive:true})).outputs.result,'s1');assert.equal((await call('ActualClassHp')).outputs.result,10);const changed=await call('TagAndFind',{target:'s0'});assert.equal(changed.outputs.result,2);assert.equal(changed.operations.length,1);cases.push('compiled C++ matches shared search, dynamic_cast reads HP10, and preceding tag writes are visible in the same function');
}finally{host.close();}
await fs.writeFile(path.join(dir,'acceptance.json'),JSON.stringify({passed:true,cases},null,2));console.log(JSON.stringify({dir,passed:true,cases}));

}catch(error){await fs.writeFile(path.join(dir,"failure.json"),JSON.stringify({passed:false,error:error.stack},null,2));console.error(JSON.stringify({dir,passed:false,error:error.message}));throw error;}
