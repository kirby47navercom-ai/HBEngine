import {animationStatesFixture} from './animation-state-fixture.mjs';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createAsset} from '../prototype/asset-documents.js';
import {makeAnimationNode,validAnimationGraph,validateAnimationProgram,addAnimationStatePose} from '../prototype/animation-graph-assets.js';
import {addAnimationState,addAnimationTransition,removeAnimationState} from '../prototype/animation-state-assets.js';
import {crossedAnimationExit} from '../prototype/animation-state-runtime.js';
import {AnimationGraphPlayer} from '../prototype/animation-graph-runtime.js';
import {engineOperations} from '../prototype/engine-services.js';
import {BlueprintRuntime} from '../prototype/blueprint-runtime.js';
import {makeSceneComponent} from '../prototype/scene-components.js';
const near=(a,b,label='')=>assert.ok(Math.abs(a-b)<1e-6,label+' '+a+' != '+b);

const object=()=>({id:'actor',name:'Hero',kind:'empty',visible:true,position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],components:[makeSceneComponent('Transform')]}),hooks=(f,o)=>({object:o,group:new THREE.Group(),update:()=>{},asset:async name=>f.assets[name]?name:null,readAsset:async name=>structuredClone(f.assets[name])}),load=async f=>AnimationGraphPlayer.load(f.data,hooks(f,object()));
{
 const f=animationStatesFixture(),p=await load(f),m=p.machine('Locomotion');await p.tick(0);assert.equal(m.snapshot().stateName,'Idle');assert.deepEqual(p.takeEvents().map(e=>e.name),['IdleEnter']);p.setParameter('Moving',true);await p.tick(.25);near(p.object.position[0],2.5);near(m.snapshot().transition.progress,.25);near(m.snapshot().states.find(s=>s.id===f.run.id).weight,.25);assert.deepEqual(p.takeEvents().map(e=>e.name),['IdleExit','RunEnter','MoveStart']);await p.tick(.75);assert.equal(m.snapshot().stateName,'Run');near(m.snapshot().time,1);assert.deepEqual(p.takeEvents().map(e=>e.name),['MoveEnd','RunFull']);p.setParameter('Moving',false);await p.tick(.1);near(p.object.position[0],5);await p.tick(.1);assert.equal(m.snapshot().stateName,'Idle');p.paused=true;const time=p.time;await p.tick(1);near(p.time,time);p.dispose();assert.equal(p.machines.size,0);
}
{
 const f=animationStatesFixture(),p=await load(f);await p.tick(0);p.setParameter('Moving',true);await p.tick(.3);const before=p.object.position[0];p.setParameter('Attack',true,'trigger');await p.tick(0);near(p.object.position[0],before,'interrupt preserves blended pose');assert.equal(p.getParameter('Attack'),false);await p.tick(.1);near(p.object.position[0],before*.5+10);assert.equal(p.machine(f.machine.id).snapshot().nextName,'Attack');await p.tick(.1);assert.equal(p.machine(f.machine.id).snapshot().stateName,'Attack');assert.throws(()=>p.setParameter('Mode',.5,'int'),/자료형/);p.setParameter('Mode',2,'int');assert.equal(p.getParameter('Mode'),2);assert.throws(()=>p.setParameter('Mode',1,'float'),/자료형/);
}
{
 const f=animationStatesFixture();f.forward.hasExitTime=true;f.forward.exitTime=.75;f.forward.duration=0;const p=await load(f);await p.tick(.5);p.setParameter('Moving',true);await p.tick(.5);assert.equal(p.machine('Locomotion').snapshot().stateName,'Idle');await p.tick(.5);assert.equal(p.machine('Locomotion').snapshot().stateName,'Run');
 const once=animationStatesFixture();once.forward.hasExitTime=true;once.forward.exitTime=3.5;once.forward.duration=0;const q=await load(once);q.setParameter('Moving',true);await q.tick(6.9);assert.equal(q.machine('Locomotion').snapshot().stateName,'Idle');await q.tick(.1);assert.equal(q.machine('Locomotion').snapshot().stateName,'Run');
 assert.equal(crossedAnimationExit(.8,1,.75,true),false);assert.equal(crossedAnimationExit(1.7,1.8,.75,true),true);assert.equal(crossedAnimationExit(4,5,3.5,true),false);
}
{
 const f=animationStatesFixture();f.machine.inputs[f.run.input]=f.clips[0].id;f.forward.offset=.5;const clip=f.assets[f.clips[0].properties.clip];clip.timeline.tracks[0].keys[1].value=[2,0,0];const p=await load(f);await p.tick(.2);p.setParameter('Moving',true);await p.tick(.1);const m=p.machine('Locomotion'),a=m.stateContext(f.idle.id),b=m.stateContext(f.run.id);near(a.elapsed.get(f.clips[0].id),.3);near(b.elapsed.get(f.clips[0].id),1.1);assert.notEqual(a.poses.get(f.clips[0].id)[0],b.poses.get(f.clips[0].id)[0]);near(p.object.position[0],.38);const buffer=b.poses.get(f.clips[0].id)[0];await p.tick(.1);assert.equal(b.poses.get(f.clips[0].id)[0],buffer);
}
{
 const f=animationStatesFixture();f.run.resetOnEntry=false;f.forward.duration=f.reverse.duration=0;const p=await load(f);p.setParameter('Moving',true);await p.tick(.4);near(p.machine('Locomotion').stateContext(f.run.id).elapsed.get(f.clips[1].id),.4);p.setParameter('Moving',false);await p.tick(.2);p.setParameter('Moving',true);await p.tick(.1);near(p.machine('Locomotion').stateContext(f.run.id).elapsed.get(f.clips[1].id),.5);
 const limited=animationStatesFixture();limited.forward.conditions=[{parameter:'Mode',op:'eq',value:0}];limited.reverse.conditions=[{parameter:'Mode',op:'eq',value:0}];limited.forward.duration=limited.reverse.duration=0;limited.machine.properties.maxTransitions=3;const q=await load(limited);await q.tick(0);assert.equal(q.machine('Locomotion').snapshot().limited,true);
}
{
 const f=animationStatesFixture(),lower=addAnimationTransition(f.machine,f.idle.id,f.attack.id,f.data.parameters);lower.conditions=[{parameter:'Mode',op:'eq',value:1}];lower.priority=1;const p=await load(f);p.setParameter('Moving',true);await p.tick(.1);p.setParameter('Mode',1);await p.tick(.1);assert.equal(p.machine('Locomotion').snapshot().nextName,'Run','ordered interruption stops at active rule');f.forward.ordered=false;const q=await load(f);q.setParameter('Moving',true);await q.tick(.1);q.setParameter('Mode',1);await q.tick(0);assert.equal(q.machine('Locomotion').snapshot().nextName,'Attack','unordered interruption accepts later eligible rule');
}
{
 for(const reset of [true,false]){const f=animationStatesFixture(),select=makeAnimationNode('select'),rest=makeAnimationNode('rest');select.properties={parameter:'UseMachine',duration:0};select.inputs={true:f.machine.id,false:rest.id};f.data.parameters.push({name:'UseMachine',type:'bool',value:true});f.data.nodes.push(select,rest);f.data.nodes.find(n=>n.type==='output').inputs.pose=select.id;f.machine.properties.reinitialize=reset;const p=await load(f);await p.tick(.4);p.setParameter('UseMachine',false);await p.tick(.2);p.setParameter('UseMachine',true);await p.tick(.1);near(p.machine('Locomotion').snapshot().time,reset?.1:.5,'becoming relevant reset/keep');}
}
{
 const f=animationStatesFixture();for(const [i,n] of f.clips.entries()){n.properties.clip='Assets/SA_'+i+'.hbspriteanimation.json';const a=createAsset('spriteanimation','SA_'+i);a.frames=[{sprite:'Assets/S'+i+'0.hbsprite.json',duration:1},{sprite:'Assets/S'+i+'1.hbsprite.json',duration:1}];f.assets[n.properties.clip]=a;}const o=object();o.position=[3,-2,.1];let sprite;const p=await AnimationGraphPlayer.load(f.data,{...hooks(f,o),spriteFrame:async(_,path)=>{sprite=path;}});await p.tick(0);assert.equal(sprite,'Assets/S00.hbsprite.json');p.setParameter('Moving',true);await p.tick(.75);assert.equal(sprite,'Assets/S10.hbsprite.json');await p.tick(.5);assert.equal(sprite,'Assets/S11.hbsprite.json');assert.deepEqual(o.position,[3,-2,.1],'2D frame animation does not overwrite placed transform');
}
{
 const f=animationStatesFixture(),copy=structuredClone(f.data);copy.nodes.find(n=>n.id===f.machine.id).properties.transitions[0].conditions[0].parameter='Missing';assert.equal(validAnimationGraph(copy),false);assert.ok(validAnimationGraph(f.data));const draft=structuredClone(f.data);delete draft.nodes.find(n=>n.id===f.machine.id).inputs[f.idle.input];assert.ok(validAnimationGraph(draft));assert.throws(()=>validateAnimationProgram(draft),/포즈를 연결/);removeAnimationState(f.machine,f.run.id);assert.ok(validAnimationGraph(f.data));assert.equal(f.machine.properties.transitions.some(t=>t.from===f.run.id||t.to===f.run.id),false);
}
{
 const f=animationStatesFixture(),state=addAnimationStatePose(f.data,f.machine,{name:'Owned'}),rest=f.machine.inputs[state.input];assert.ok(validAnimationGraph(f.data));removeAnimationState(f.machine,state.id,f.data);assert.ok(validAnimationGraph(f.data));assert.equal(f.data.nodes.some(n=>n.id===rest),false,'owned pose is removed with its state');
 const shared=addAnimationStatePose(f.data,f.machine,{name:'Shared'}),sharedRoot=f.machine.inputs[shared.input];f.machine.inputs[f.run.input]=sharedRoot;removeAnimationState(f.machine,shared.id,f.data);assert.ok(validAnimationGraph(f.data));assert.ok(f.data.nodes.some(n=>n.id===sharedRoot&&!n.scope),'outside shared pose is preserved and released from removed scope');f.machine.inputs[f.run.input]=f.clips[1].id;
 const p=await load(f);await p.tick(0);p.setParameter('Moving',true);p.machine('Locomotion').crossFade('Run',.4,.25);await p.tick(.1);near(p.machine('Locomotion').snapshot().transition.duration,.4,'manual crossfade keeps requested duration');near(p.machine('Locomotion').snapshot().transition.progress,.25);near(p.machine('Locomotion').stateContext(f.run.id).elapsed.get(f.clips[1].id),.6);
}
{
 const f=animationStatesFixture();f.assets[f.clips[0].properties.clip].timeline.tracks[0].keys[1].value=[2,0,0];const p=await load(f);await p.tick(.6);near(p.object.position[0],.6);p.machine('Locomotion').crossFade('Idle',.2,0);await p.tick(.1);near(p.object.position[0],.35,'self reentry freezes previous pose before clock reset');near(p.machine('Locomotion').snapshot().states.find(s=>s.id===f.idle.id).weight,1,'same state remains total weight1');
}
{
 const f=animationStatesFixture(),outer=makeAnimationNode('stateMachine');outer.name='Outer';outer.inputs[outer.properties.states[0].input]=f.machine.id;f.data.nodes.push(outer);f.data.nodes.find(n=>n.type==='output').inputs.pose=outer.id;const p=await load(f);await p.tick(.5);near(p.machine('Outer').snapshot().normalized,.25,'nested relevancy reads inner clip context');
 const second=addAnimationState(outer,{name:'Second'});outer.inputs[second.input]=f.machine.id;const q=await load(f);await q.tick(0);assert.throws(()=>q.machine('Locomotion'),/중복/);const matches=[...q.machines.values()].filter(m=>m.node.name==='Locomotion');assert.equal(matches.length,2);assert.equal(q.machine(matches[0].key),matches[0]);assert.notEqual(matches[0].stateContext(f.idle.id).poses.get(f.clips[0].id)[0],matches[1].stateContext(f.idle.id).poses.get(f.clips[0].id)[0]);
}
{
 const f=animationStatesFixture();let child=f.clips[0];for(let i=0;i<30;i++){const blend=makeAnimationNode('blend');blend.inputs={a:child.id,b:child.id};f.data.nodes.push(blend);child=blend;}f.machine.inputs[f.idle.input]=child.id;const p=await load(f);await p.tick(.1);near(p.machine('Locomotion').snapshot().normalized,.05,'shared DAG relevance is memoized');assert.ok(p.poseBytes<64*1024*1024);const bytes=p.poseBytes;await p.tick(.1);assert.equal(p.poseBytes,bytes,'no pose buffer allocation on tick');
}
{
 const f=animationStatesFixture(),o=object();o.components.push(makeSceneComponent('AnimationGraph',{asset:'Assets/AG.hbanimgraph.json'}));const group=new THREE.Group(),services=engineOperations({readAsset:async name=>name==='Assets/AG.hbanimgraph.json'?f.data:f.assets[name],asset:async(name,kind)=>kind==='animgraph'?'Assets/AG.hbanimgraph.json':name,mesh:()=>group,update:()=>{},physicsOptions:{backend:'legacy'}}),vm=new BlueprintRuntime([o],[],{...services});await vm.start();const op=(key,args={})=>services.operation(key,{target:o.id,...args},{self:o.id},vm);await op('animGraphSetInt',{key:'Mode',value:2});assert.equal((await op('animGraphGetInt',{key:'Mode'})).return,2);await op('animGraphCrossFade',{machine:'Locomotion',state:'Run',duration:1,offset:.25});await services.physics(.25,vm);near((await op('animGraphStateWeight',{machine:'Locomotion',state:'Run'})).return,.25);assert.equal((await op('animGraphTransitioning',{machine:'Locomotion'})).return,true);near((await op('animGraphTransitionProgress',{machine:'Locomotion'})).return,.25);await op('animGraphSetTrigger',{key:'Attack'});await op('animGraphResetTrigger',{key:'Attack'});await vm.stop();services.dispose();
}
{
 const f=animationStatesFixture();f.idle.onFullyBlended='StaleAfterStop';const o=object(),bp=createAsset('blueprint','BP'),calls=[],services=engineOperations({readAsset:async name=>name==='Assets/AG.hbanimgraph.json'?f.data:f.assets[name],asset:async(name,kind)=>kind==='animgraph'?'Assets/AG.hbanimgraph.json':name,mesh:()=>new THREE.Group(),update:()=>{},physicsOptions:{backend:'legacy'}}),vm=new BlueprintRuntime([o],[{self:o.id,root:bp}],{...services});vm.active=true;vm.custom=async(b,name)=>{calls.push(name);await services.operation('animGraphStop',{target:o.id},b,vm);};await services.operation('animGraphPlay',{target:o.id,asset:'AG'},{self:o.id},vm);assert.deepEqual(calls,['IdleEnter'],'stopping in a callback cancels stale graph events');assert.equal(o.gameplayDebug.animationGraph,undefined);services.dispose();
}
{
 const f=animationStatesFixture();let child=f.clips[0];for(let i=0;i<34;i++){const n=makeAnimationNode('blend');n.inputs={a:child.id,b:child.id};f.data.nodes.push(n);child=n;}for(const state of f.machine.properties.states)f.machine.inputs[state.input]=child.id;while(f.machine.properties.states.length<64){const state=addAnimationState(f.machine);f.machine.inputs[state.input]=child.id;}assert.ok(validAnimationGraph(f.data));await assert.rejects(()=>load(f),/문맥 제한2048/,'expanded shared state DAG is bounded before execution');
}
console.log('Animation pose states: transitions/exit/interrupt, triggers/int, shared clip clocks, reset/resume, memory/limits, common runtime passed');
