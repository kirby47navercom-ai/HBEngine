import {nativeReloadPlan} from '../prototype/native-reload.js';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';import path from 'node:path';
import {createAsset} from '../prototype/asset-documents.js';
import {makeNode} from '../prototype/blueprint-model.js';
import {parseNativeHeader,validNative} from '../prototype/native-model.js';
import {nativeLifecycleEvents,installNativeLifecycle} from '../prototype/native-lifecycle.js';
import {BlueprintRuntime} from '../prototype/blueprint-runtime.js';
import {initializeSpawn} from '../prototype/runtime-spawn.js';
import {retainTestEvidence,pruneTestArtifacts} from './test-artifacts.mjs';
const work=await fs.mkdtemp(path.resolve('native/build/native-lifecycle-263-'));retainTestEvidence(work);const checks=[];
const cpp={float:'float',string:'const std::string&',object:'hb::Actor*',hit:'const hb::HitResult&'};
const declarations=Object.entries(nativeLifecycleEvents).map(([phase,ports])=>`HB_FUNCTION(BlueprintCallable, Lifecycle="${phase}") void On_${phase}(${ports.map(([name,type])=>cpp[type]+' '+name).join(',')});`).join('\n');
const header=`#include <HBEngine/Game.hpp>\nHB_CLASS(Blueprintable) class Lifecycle : public hb::Actor {public: ${declarations} HB_FUNCTION(BlueprintCallable) void Tick(float delta);};`;
try{
 const native=parseNativeHeader(header);assert.equal(native.classes[0].functions.filter(f=>f.lifecycle).length,10);assert.ok(validNative(native));
 for(const bad of [header.replace('Lifecycle="tick"','Lifecycle="missing"'),header.replace('void On_tick(float delta)','void On_tick(int delta)'),header.replace('void On_tick(float delta)','static void On_tick(float delta)'),header.replace('void On_tick(float delta)','float On_tick(float delta)'),header.replace('Lifecycle="endPlay"','Lifecycle="beginPlay"'),header.replace('Lifecycle="tick"','BlueprintPure, Lifecycle="tick"')])assert.throws(()=>parseNativeHeader(bad),/Lifecycle/);
 const changed=structuredClone(native);delete changed.classes[0].functions.find(f=>f.lifecycle==='tick').lifecycle;assert.throws(()=>nativeReloadPlan(native,changed,[]),/다시 실행/);const added=structuredClone(native);added.classes[0].functions=added.classes[0].functions.filter(f=>f.lifecycle!=='tick');assert.throws(()=>nativeReloadPlan(added,native,[]),/Lifecycle 추가/);assert.deepEqual(nativeReloadPlan(native,structuredClone(native),[]),[]);
 const invalid=structuredClone(native);invalid.classes[0].functions[0]=null;assert.equal(validNative(invalid),false);checks.push('ten explicit phases, strict signature/static/pure/output/duplicate validation; legacy Tick remains ordinary');
 const root=createAsset('blueprint','BP_Lifecycle');root.settings.parentClass='Lifecycle';root.native=native;root.settings.tickInterval=.05;
 const authored=makeNode('nativeCall');authored.nativeId='Lifecycle.Tick';authored.inputValues={delta:99};root.nodes.push(authored);root.edges.push({from:{node:'begin',pin:'then'},to:{node:authored.id,pin:'exec'}});
 // Use the actual starter Begin Play ID, rather than assuming a sample ID.
 root.edges.at(-1).from.node=root.nodes.find(n=>n.key==='beginPlay').id;
 const original=JSON.stringify(root),objects=[{id:'actor',kind:'empty',name:'Actor',position:[5,2,1],rotation:[0,0,0],scale:[1,1,1],nativeClass:'Lifecycle',components:[]},{id:'other',kind:'empty',position:[1,0,0],rotation:[0,0,0],scale:[1,1,1],components:[]}],calls=[];
 let contacts=[];const vm=new BlueprintRuntime(objects,[{root,self:'actor'}],{native:async request=>{calls.push(request);return{outputs:{},events:[],operations:[]};},contacts:()=>contacts});
 await vm.start();assert.deepEqual(calls.map(r=>r.nativeId),['Lifecycle.On_construction','Lifecycle.On_beginPlay','Lifecycle.Tick']);assert.deepEqual(objects[0].position,[5,2,1]);assert.equal(calls[2].args.delta,99);assert.equal(JSON.stringify(root),original);checks.push('construction → native begin → authored Blueprint, source graph and placed transform preserved');
 calls.length=0;await vm.tick(.02);await vm.tick(.03);assert.deepEqual(calls.map(r=>r.nativeId),['Lifecycle.On_tick']);assert.ok(Math.abs(calls[0].args.delta-.05)<1e-6);vm.paused=true;await vm.tick(.1);assert.equal(calls.length,1);vm.paused=false;objects[0].poolActive=false;await vm.tick(.1);assert.equal(calls.length,1);objects[0].poolActive=true;vm.bindings[0].root.settings.tickEnabled=false;await vm.tick(.1);assert.equal(calls.length,1);vm.bindings[0].root.settings.tickEnabled=true;checks.push('scaled interval delta, pause, inactive pool and tick-disabled guards');
 const contact={a:'actor',b:'other',componentA:'shapeA',componentB:'shapeB',trigger:true,position:[1,2,3],normal:[0,1,0]};contacts=[contact];calls.length=0;await vm.collisions(.016);await vm.collisions(.016);contacts=[];await vm.collisions(.016);assert.deepEqual(calls.map(r=>r.nativeId),['Lifecycle.On_beginOverlap','Lifecycle.On_overlapStay','Lifecycle.On_endOverlap']);assert.equal(calls[0].args.other,'other');assert.equal(calls[1].args.delta,.016);
 contacts=[{...contact,trigger:false}];calls.length=0;await vm.collisions(.016);await vm.collisions(.016);contacts=[];await vm.collisions(.016);assert.deepEqual(calls.map(r=>r.nativeId),['Lifecycle.On_hitEvent','Lifecycle.On_hitStay','Lifecycle.On_endHit']);assert.deepEqual(calls[0].args.hit.normal,[0,1,0]);assert.equal(calls.at(-1).args.hit.hit,false);checks.push('same contact boundary routes begin/stay/end overlap and hit, typed other/delta/HitResult');
 calls.length=0;await vm.stop('TestStop');await vm.stop('Duplicate');assert.deepEqual(calls.map(r=>r.nativeId),['Lifecycle.On_endPlay']);assert.equal(calls[0].args.reason,'TestStop');await vm.tick(.1);assert.equal(calls.length,1);checks.push('EndPlay reason once, no callback after stop');
 const next=new BlueprintRuntime(objects,[],{native:vm.hooks.native});await next.start();const spawnedBindings=next.addBindings([{root,self:'actor'}]);calls.length=0;await initializeSpawn(next,spawnedBindings,{startActor:async()=>{},startSystems:async()=>{}},[objects[0]]);assert.deepEqual(calls.map(r=>r.nativeId),['Lifecycle.On_construction','Lifecycle.On_beginPlay','Lifecycle.Tick']);await next.tickBindings('beginPlay',{});assert.equal(calls.length,3);await next.stop();checks.push('late spawn binds generated entries and begins once using existing spawn initialization');
 // Authored names that collide with the private prefix must remain reachable.
 const collision=structuredClone(root);collision.nodes[0].id='__hbLifecycle_beginPlay';installNativeLifecycle(collision,'Lifecycle');assert.equal(new Set(collision.nodes.map(n=>n.id)).size,collision.nodes.length);checks.push('private generated ID collision avoidance; no per-frame root rebuild');
 await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify({passed:true,checks},null,2));console.log(JSON.stringify({work,passed:true,checks:checks.length}));
}finally{await pruneTestArtifacts(work);}
