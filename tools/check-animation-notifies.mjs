import assert from 'node:assert/strict';
import * as THREE from 'three';
import {animationSyncFixture} from './animation-sync-fixture.mjs';
import {AnimationGraphPlayer} from '../prototype/animation-graph-runtime.js';
import {makeAnimationNotify,makeAnimationNotifyState} from '../prototype/animation-sync.js';
import {validAnimationGraph} from '../prototype/animation-graph-assets.js';
import {createAsset} from '../prototype/asset-documents.js';
import {makeNode} from '../prototype/blueprint-model.js';
import {engineOperations} from '../prototype/engine-services.js';
import {BlueprintRuntime} from '../prototype/blueprint-runtime.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,a+' != '+b);
const object=()=>({id:'Root',name:'Notify actor',kind:'empty',position:[3,-2,.1],rotation:[0,0,0],scale:[1,1,1],components:[]});
function fixture(){const f=animationSyncFixture();f.blend.properties.parameter='';f.blend.properties.alpha=0;f.a.properties.sync.method='none';f.a.properties.notifies=[];f.a.properties.notifyStates=[makeAnimationNotifyState('Hit',.25,.5)];return f;}
const load=f=>AnimationGraphPlayer.load(f.data,{object:object(),group:new THREE.Group(),asset:async name=>name,readAsset:async name=>structuredClone(f.assets[name]),update:()=>{}});
const events=p=>{const list=p.takeEvents();for(const event of list)p.acknowledgeEvent(event);return list;};
{
 const f=fixture(),p=await load(f);await p.tick(.5);let list=events(p);assert.deepEqual(list.map(e=>e.name),['HitBegin','HitTick']);near(list[1].deltaSeconds,.25);near(list[1].progress,.5);assert.equal(p.publishedState.notifyStates.length,1);await p.tick(0);assert.equal(events(p).length,0);p.paused=true;await p.tick(1);assert.equal(events(p).length,0);p.paused=false;await p.tick(.25);list=events(p);assert.deepEqual(list.map(e=>e.name),['HitTick','HitEnd']);near(list[0].deltaSeconds,.25);assert.equal(list[1].reason,'completed');assert.equal(p.cancelNotifyStates().length,0);await p.tick(4);list=events(p);assert.deepEqual(list.map(e=>e.name),['HitBegin','HitTick','HitEnd','HitBegin','HitTick','HitEnd']);assert.deepEqual(list.filter(e=>e.phase==='notifyEnd').map(e=>e.cycle),[1,2]);assert.equal(p.publishedState.notifyStates.length,0);
}
{
 const f=fixture();f.a.properties.offset=.5;f.a.properties.rate=2;const p=await load(f);await p.tick(0);let list=events(p);assert.deepEqual(list.map(e=>e.phase),['notifyBegin']);near(list[0].progress,.5);await p.tick(.2);list=events(p);assert.deepEqual(list.map(e=>e.phase),['notifyTick','notifyEnd']);near(list[0].deltaSeconds,.125);near(list[1].progress,1);
}
{
 const f=fixture();f.a.properties.loop=false;f.a.properties.notifyStates=[makeAnimationNotifyState('Full',0,2)];const p=await load(f);await p.tick(0);assert.equal(events(p)[0].phase,'notifyBegin');await p.tick(3);assert.deepEqual(events(p).map(e=>e.phase),['notifyTick','notifyEnd']);await p.tick(3);assert.equal(events(p).length,0);
}
{
 const f=fixture(),p=await load(f);await p.tick(.5);events(p);p.data.nodes.find(n=>n.id===f.blend.id).properties.alpha=1;await p.tick(0);assert.equal(events(p).find(e=>e.phase==='notifyEnd').reason,'irrelevant');p.data.nodes.find(n=>n.id===f.blend.id).properties.alpha=0;await p.tick(0);assert.equal(events(p)[0].phase,'notifyBegin');p.resetContext(p.mainContext,.25);await p.tick(0);const list=events(p);assert.deepEqual(list.map(e=>e.phase),['notifyEnd','notifyBegin']);assert.equal(list[0].reason,'restarted');assert.notEqual(list[0].instance,list[1].instance);const canceled=p.cancelNotifyStates('reset');assert.equal(canceled.length,1);assert.equal(canceled[0].name,'HitEnd');assert.equal(canceled[0].reason,'reset');assert.equal(p.cancelNotifyStates().length,0);p.dispose();assert.equal(p.syncGroups.notifies.active.size,0);
}
{
 const f=fixture();f.blend.properties.alpha=.5;f.a.properties.notifyStates[0].minWeight=.6;const p=await load(f);await p.tick(.5);assert.equal(events(p).length,0,'range suppressed below its minimum contribution');p.data.nodes.find(n=>n.id===f.blend.id).properties.alpha=.25;await p.tick(0);assert.equal(events(p)[0].phase,'notifyBegin');p.data.nodes.find(n=>n.id===f.blend.id).properties.alpha=.5;await p.tick(0);assert.equal(events(p)[0].reason,'filtered');
}
{
 const f=fixture(),point=makeAnimationNotify('Data',.5);point.parameters=[{name:'Damage',type:'int',value:12},{name:'Direction',type:'vec2',value:[1,2]},{name:'Label',type:'string',value:'한글'},{name:'Owner',type:'object',value:'Root'}];f.a.properties.notifies=[point];f.a.properties.notifyStates[0].parameters=[{name:'Strength',type:'float',value:.75}];assert.equal(validAnimationGraph(f.data),true);const p=await load(f);await p.tick(.5);const list=events(p),hit=list.find(e=>e.name==='Data');assert.equal(hit.Damage,12);assert.deepEqual(hit.Direction,[1,2]);hit.Direction[0]=99;assert.deepEqual(p.nodes.get(f.a.id).properties.notifies[0].parameters[1].value,[1,2]);assert.equal(hit.Label,'한글');assert.equal(hit.Owner,'Root');assert.equal(list.find(e=>e.phase==='notifyTick').Strength,.75);for(const bad of ['phase','__proto__','constructor']){point.parameters[0].name=bad;assert.equal(validAnimationGraph(f.data),false);}point.parameters[0].name='Damage';point.parameters[0].value=1.5;assert.equal(validAnimationGraph(f.data),false);point.parameters[0].value=12;point.parameters.push({...point.parameters[0]});assert.equal(validAnimationGraph(f.data),false);
}
{
 const f=fixture();f.a.properties.notifyStates[0].duration=3;assert.equal(validAnimationGraph(f.data),true);await assert.rejects(()=>load(f),/클립 안/);f.a.properties.notifyStates[0].duration=0;assert.equal(validAnimationGraph(f.data),false);f.a.properties.notifyStates[0].duration=.5;const p=await load(f);await assert.rejects(()=>p.tick(9000),/구간 알림 경계/);
}
async function serviceFixture(){const f=fixture(),o=object(),calls=[],bp=createAsset('blueprint','BP_Notify'),services=engineOperations({readAsset:async name=>name==='Assets/AG.hbanimgraph.json'?f.data:f.assets[name],asset:async(name,kind)=>kind==='animgraph'?'Assets/AG.hbanimgraph.json':name,mesh:()=>new THREE.Group(),update:()=>{},remove:()=>{},physicsOptions:{backend:'legacy'}}),binding={self:o.id,root:bp},vm=new BlueprintRuntime([o],[binding],{...services});vm.active=true;vm.custom=async(b,name,args)=>{calls.push({name,...args});};const op=(key,a={})=>services.operation(key,{target:o.id,...a},binding,vm);return {f,o,calls,services,binding,vm,op};}
{
 const f=fixture(),p=await load(f);await p.tick(.5);events(p);p.mainContext.elapsed.set(f.a.id,1);await p.tick(0);assert.equal(events(p)[0].reason,'timeChanged','a changed group clock closes a previously active range');assert.equal(p.cancelNotifyStates().length,0);
}
{
 const s=await serviceFixture();s.f.a.properties.notifies=[makeAnimationNotify('Cancel',.1)];await s.op('animGraphPlay',{asset:'Graph'});s.vm.custom=async(b,name,args)=>{s.calls.push({name,...args});if(name==='Cancel')await s.op('animGraphStop');};await s.services.physics(1,s.vm);assert.deepEqual(s.calls.map(e=>e.name),['Cancel'],'pending undispatched Begin never generates a gameplay End');s.services.dispose();
}
{
 const s=await serviceFixture();await s.op('animGraphPlay',{asset:'Graph'});await s.services.physics(.5,s.vm);await s.op('animGraphStop');assert.deepEqual(s.calls.map(e=>e.name),['HitBegin','HitTick','HitEnd']);assert.equal(s.calls.at(-1).reason,'stopped');assert.equal(s.o.gameplayDebug.animationGraph,undefined);s.services.dispose();
}
{
 const s=await serviceFixture();await s.op('animGraphPlay',{asset:'Graph'});s.vm.custom=async(b,name,args)=>{s.calls.push({name,...args});if(name==='HitBegin')await s.op('animGraphStop');};await s.services.physics(1,s.vm);assert.deepEqual(s.calls.map(e=>e.name),['HitBegin','HitEnd'],'stop inside Begin cancels stale pending Tick/completed End');assert.equal(s.calls[1].reason,'stopped');s.services.dispose();
}
{
 const s=await serviceFixture();await s.op('animGraphPlay',{asset:'Graph'});await s.services.physics(.5,s.vm);await s.op('animGraphPlay',{asset:'Graph'});assert.equal(s.calls.at(-1).reason,'replaced');await s.services.physics(.5,s.vm);await s.vm.stop();assert.equal(s.calls.at(-1).reason,'worldStopped');assert.equal(s.vm.active,false);assert.equal(s.o.gameplayDebug.animationGraph,undefined);s.services.dispose();
}
{
 const s=await serviceFixture();await s.op('animGraphPlay',{asset:'Graph'});await s.services.physics(.5,s.vm);await s.op('destroy');assert.equal(s.calls.at(-1).reason,'released');assert.equal(s.vm.objects.length,0);assert.equal(s.vm.bindings.length,0);s.services.dispose();
}
{
 const s=await serviceFixture();await s.op('animGraphPlay',{asset:'Graph'});await s.services.physics(.5,s.vm);let replaced=false;s.vm.custom=async(b,name,args)=>{s.calls.push({name,...args});if(name==='HitEnd'&&!replaced){replaced=true;s.f.a.properties.offset=.6;await s.op('animGraphPlay',{asset:'Graph'});}};await s.op('animGraphPlay',{asset:'Graph'});assert.equal(s.o.gameplayDebug.animationGraph.notifyStates.length,1);near(s.o.gameplayDebug.animationGraph.notifyStates[0].progress,.7);near(s.o.position[0],.3);await s.op('animGraphStop');s.services.dispose();
}
{
 const s=await serviceFixture();s.f.a.properties.notifyStates.push(makeAnimationNotifyState('Other',.25,.5));await s.op('animGraphPlay',{asset:'Graph'});await s.services.physics(.5,s.vm);s.vm.custom=async(b,name,args)=>{s.calls.push({name,...args});if(name==='HitEnd')throw Error('cleanup callback failure');};await assert.rejects(()=>s.op('animGraphStop'),/cleanup callback failure/);assert.equal(s.calls.at(-1).name,'OtherEnd','one failing End callback does not skip other cleanup');assert.equal(s.o.gameplayDebug.animationGraph,undefined);s.services.dispose();
}
{
 const s=await serviceFixture();await s.op('animGraphPlay',{asset:'Graph'});await s.services.physics(.5,s.vm);await s.op('poolRelease');assert.equal(s.calls.at(-1).reason,'released');assert.equal(s.o.poolActive,false);assert.equal(s.o.gameplayDebug.animationGraph,undefined);s.services.dispose();
}
{
 const f=fixture(),sprite=createAsset('spriteanimation','SA_Notify');sprite.frames=[{sprite:'Assets/S0.hbsprite.json',duration:1},{sprite:'Assets/S1.hbsprite.json',duration:1}];f.a.properties.clip='Assets/SA_Notify.hbspriteanimation.json';f.assets[f.a.properties.clip]=sprite;const o=object();let frame;const p=await AnimationGraphPlayer.load(f.data,{object:o,group:new THREE.Group(),asset:async name=>name,readAsset:async name=>structuredClone(f.assets[name]),spriteFrame:async(_,name)=>{frame=name;},update:()=>{}});await p.tick(.5);assert.equal(frame,'Assets/S0.hbsprite.json');assert.deepEqual(events(p).map(e=>e.phase),['notifyBegin','notifyTick']);await p.tick(.6);assert.equal(frame,'Assets/S1.hbsprite.json');assert.deepEqual(events(p).map(e=>e.phase),['notifyTick','notifyEnd']);assert.deepEqual(o.position,[3,-2,.1],'2D sprite notify ranges preserve placed transforms');
}
{
 const f=fixture();f.a.properties.notifies=[{...makeAnimationNotify('Data',.5),parameters:[{name:'Damage',type:'int',value:12}]}];const bp=createAsset('blueprint','BP_Data'),event=makeNode('customEvent'),set=makeNode('setVariable');bp.nodes=[event,set];bp.variables=[{id:'damage',name:'Damage',type:'int',container:'single',value:0}];event.options={eventName:'Data'};event.customOutputs=[{id:'Damage',label:'Damage',type:'int',array:false}];set.variableId='damage';bp.edges=[{from:{node:event.id,pin:'then'},to:{node:set.id,pin:'exec'}},{from:{node:event.id,pin:'Damage'},to:{node:set.id,pin:'value'}}];const o=object(),binding={self:o.id,root:bp},services=engineOperations({readAsset:async name=>name==='Graph'?f.data:f.assets[name],asset:async(name,kind)=>kind==='animgraph'?'Graph':name,mesh:()=>new THREE.Group(),update:()=>{},physicsOptions:{backend:'legacy'}}),vm=new BlueprintRuntime([o],[binding],{...services});vm.active=true;await services.operation('animGraphPlay',{target:o.id,asset:'Graph'},binding,vm);await services.physics(.5,vm);assert.equal(vm.bindings[0].variables.get('damage'),12,'typed notify data reaches actual Blueprint custom output');await vm.stop();services.dispose();
}
console.log('Animation notifies: ranges/loops/offset/rate/pause, filtering/reentry, typed BP data, stop/replacement/world/destroy cleanup, canceled pending callbacks and limits passed');
