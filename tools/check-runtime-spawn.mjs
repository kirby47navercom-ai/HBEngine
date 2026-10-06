import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import * as THREE from 'three';
import {createAsset} from '../prototype/asset-documents.js';
import {makeNode} from '../prototype/blueprint-model.js';
import {makeSceneComponent} from '../prototype/scene-components.js';
import {prepareSpawnCatalog,instantiateSpawn} from '../prototype/runtime-spawn.js';
import {BlueprintRuntime} from '../prototype/blueprint-runtime.js';
import {engineOperations} from '../prototype/engine-services.js';

const dir=await fs.mkdtemp(path.resolve(import.meta.dirname,'../native/build/runtime-spawn-')),cases=[];
try{
  const parent=createAsset('blueprint','BP_Enemy'),child=createAsset('blueprint','BP_Skeleton','Assets/BP_Enemy.hbblueprint.json');
  child.nodes=[];child.edges=[];child.components=[];child.variables=[];
  parent.components=[makeSceneComponent('SpriteRenderer',{width:3}),makeSceneComponent('PooledActor',{maxInactive:2})];
  parent.variables=[{id:'hp',name:'HP',type:'float',container:'single',value:7.25},{id:'label',name:'Label',type:'string',container:'single',value:'root'}];
  child.settings.variableDefaults={hp:10};
  const logGraph=(key,message)=>{const entry=makeNode(key),print=makeNode('print');print.inputValues={message};return {nodes:[entry,print],edges:[{from:{node:entry.id,pin:'then'},to:{node:print.id,pin:'exec'}}],comments:[]};};
  Object.assign(parent,logGraph('beginPlay','begin'));parent.construction=logGraph('construction','construction');
  const prefab=createAsset('prefab','PF_Enemy');prefab.objects=[{id:'root',name:'root',kind:'empty',visible:true,position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],components:[makeSceneComponent('Camera',{followTarget:'mesh'})]},{id:'mesh',name:'mesh',kind:'cube',visible:true,parent:'root',position:[1,0,0],rotation:[0,0,0],scale:[1,1,1]}];
  const selfDestroy=createAsset('blueprint','BP_SelfDestroy'),begin=makeNode('beginPlay'),destroy=makeNode('sceneDestroy');destroy.inputValues={target:'self'};Object.assign(selfDestroy,{nodes:[begin,destroy],edges:[{from:{node:begin.id,pin:'then'},to:{node:destroy.id,pin:'exec'}}]});
  const assets=new Map([['Assets/BP_Enemy.hbblueprint.json',parent],['Assets/BP_Skeleton.hbblueprint.json',child],['Assets/PF_Enemy.hbprefab.json',prefab],['Assets/BP_SelfDestroy.hbblueprint.json',selfDestroy]]),catalog=await prepareSpawnCatalog([...assets.keys()].map(path=>({path,kind:path.includes('prefab')?'prefab':'blueprint'})),{readAsset:async path=>structuredClone(assets.get(path)),readText:async()=>'',buildNative:()=>{throw Error('unexpected native build');},builds:new Map()});
  let failUpdate=false,deferredReady,onBuild;
  const messages=[],groups=new Map(),services=engineOperations({spawnCatalog:catalog,readAsset:async path=>structuredClone(assets.get(path)),physicsOptions:{backend:'legacy',gravity:[0,0,0]},build:o=>{const g=new THREE.Group();if(deferredReady){g.userData.ready=deferredReady;onBuild(o);}groups.set(o.id,g);return g;},update(){if(failUpdate){failUpdate=false;throw Error('intentional render failure');}},remove:o=>groups.delete(o.id),mesh:id=>groups.get(id)}),vm=new BlueprintRuntime([],[],{...services,log:m=>messages.push(m)});
  await vm.start();const binding={self:'director',root:{components:[]}},transform={position:[11,22,0],rotation:[0,0,90],scale:[2,2,1]},op=(key,args)=>services.operation(key,args,binding,vm);
  try{
    const id=(await op('sceneSpawn',{blueprintOrPrefab:'BP_Skeleton',transform})).return,o=vm.object(id),b=vm.bindings.find(b=>b.self===id);
    assert.equal(o.kind,'sprite');assert.deepEqual(o.position,[11,22,0]);assert.equal(o.components.find(c=>c.type==='SpriteRenderer').properties.width,3);assert.equal(b.variables.get('hp'),10);assert.equal(b.variables.get('label'),'root');assert.deepEqual(messages,['construction','begin']);assert.deepEqual((await op('sceneFindClass',{className:'BP_Enemy',includeInactive:false})).return,[id]);cases.push('spawn an unplaced inherited BP with class overrides, components, transform and ordered lifecycle');
    b.variables.set('hp',1);vm.jobs.push({owner:id,at:10});vm.core.timers.set('timer',{owner:id});vm.subscriptions.set(id+':signal',[{b}]);
    await op('sceneDestroy',{target:id});assert.equal(vm.object(id).poolActive,false);assert.equal(vm.bindings.length,0);assert.equal(vm.jobs.length,0);assert.equal(vm.core.timers.size,0);assert.equal(vm.subscriptions.size,0);assert.deepEqual((await op('sceneFindTag',{tag:'Enemy',includeInactive:false})).return,[]);
    const again=(await op('sceneSpawn',{blueprintOrPrefab:'Assets/BP_Skeleton.hbblueprint.json',transform})).return;assert.equal(again,id);assert.equal(vm.object(id),o);assert.equal(vm.bindings[0].variables.get('hp'),10);assert.deepEqual(messages,['construction','begin','construction','begin']);cases.push('automatic pool retains actor identity, resets exposed defaults, removes work and initializes exactly once per reuse');
    const third=(await op('sceneSpawn',{blueprintOrPrefab:'BP_Skeleton',transform})).return;assert.notEqual(third,id);const fourth=(await op('sceneSpawn',{blueprintOrPrefab:'BP_Skeleton',transform})).return;
    await op('sceneDestroy',{target:id});await op('sceneDestroy',{target:third});await op('sceneDestroy',{target:fourth});assert.equal(vm.object(fourth),undefined);assert.equal(vm.objects.filter(o=>o.spawnRoot===o.id).length,2);await op('sceneDestroy',{target:null});await op('sceneDestroy',{target:'missing'});cases.push('pool grows on demand, respects inactive capacity and accepts null/already removed targets');
    const prefabId=(await op('sceneSpawn',{blueprintOrPrefab:'PF_Enemy',transform})).return;const rows=vm.objects.filter(o=>o.spawnRoot===prefabId);assert.equal(rows.length,2);assert.deepEqual(vm.object(prefabId).position,transform.position);assert.equal(rows.find(o=>o.name==='mesh').parent,prefabId);assert.equal(rows[0].components.find(c=>c.type==='Camera').properties.followTarget,rows[1].id);assert.deepEqual(rows.find(o=>o.name==='mesh').position,[1,0,0]);assert.equal(groups.get(rows[1].id).parent,groups.get(prefabId));await op('sceneDestroy',{target:prefabId});assert.ok(rows.every(o=>!vm.object(o.id)));cases.push('prefab hierarchy clones independently, keeps local child transform, attaches render groups and destroys descendants');
    const before=vm.objects.length;await assert.rejects(op('sceneSpawn',{blueprintOrPrefab:'Absent',transform}));await assert.rejects(op('sceneSpawn',{blueprintOrPrefab:'Actor',transform:{...transform,scale:[0,1,1]}}));assert.equal(vm.objects.length,before);cases.push('invalid assets and transforms leave the world unchanged');
    failUpdate=true;const saved=structuredClone(o);await assert.rejects(op('sceneSpawn',{blueprintOrPrefab:'BP_Skeleton',transform}),/intentional render failure/);assert.equal(vm.object(id),o);assert.deepEqual(o,saved);assert.equal(vm.bindings.length,0);assert.equal((await op('sceneSpawn',{blueprintOrPrefab:'BP_Skeleton',transform})).return,id);await op('sceneDestroy',{target:id});cases.push('failed pool acquisition restores the inactive actor without losing its identity or reuse capacity');
    assert.equal((await op('sceneSpawn',{blueprintOrPrefab:'BP_SelfDestroy',transform})).return,null);assert.equal(vm.objects.length,before);assert.equal(vm.bindings.length,0);cases.push('BeginPlay self-destruction returns null and leaves no stale binding or render group');
    let finishReady;deferredReady=new Promise(r=>finishReady=r);let announceBuild;const built=new Promise(r=>announceBuild=r);onBuild=announceBuild;
    const pending=op('sceneSpawn',{blueprintOrPrefab:'Actor',transform}),rejected=assert.rejects(pending,/게임 실행이 종료/),loading=await built,sentinel={id:'survivor',name:'Survivor',kind:'empty',visible:true,position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]};vm.objects.splice(vm.objects.indexOf(loading),1);vm.objects.push(sentinel);await vm.stop();finishReady();await rejected;assert.equal(vm.object('survivor'),sentinel);assert.equal(vm.objects.length,before+1);cases.push('Stop while an asset is loading cannot remove another actor after the pending actor has already been removed');
  }finally{await vm.stop();services.dispose();}
  await fs.writeFile(path.join(dir,'acceptance.json'),JSON.stringify({passed:true,cases},null,2));console.log(JSON.stringify({dir,passed:true,cases}));
}catch(error){await fs.writeFile(path.join(dir,'failure.json'),JSON.stringify({passed:false,error:error.stack},null,2));console.error(JSON.stringify({dir,passed:false,error:error.message}));throw error;}
