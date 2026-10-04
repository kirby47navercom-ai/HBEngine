import assert from 'node:assert/strict';
import {createGameplayAsset,makeState,validGameplayAsset,addState,reparentState,removeState,stateAncestors} from '../prototype/gameplay-assets.js';
import {StateMachineRunner,gameplaySystems} from '../prototype/gameplay-runtime.js';
import {NativeHost} from './native-host.mjs';
import {engineSchema} from './editor-automation.mjs';

const asset=createGameplayAsset('statemachine','FSM_Hierarchy');asset.states=[];asset.parameters=[{name:'Ready',type:'bool',value:false}];
const state=(id,parent='')=>{const s={...makeState(id),id,parent,onEnter:'Enter'+id,onExit:'Exit'+id,onUpdate:'Update'+id};asset.states.push(s);return s;};
const root=state('Root'),idle=state('Idle','Root'),run=state('Run','Root'),other=state('Other');root.initialChild='Idle';asset.initial='Root';
const transition=(id,from,to,extra={})=>({id,from,to,event:'',hasExitTime:false,exitTime:1,conditions:[],...extra});
assert.ok(validGameplayAsset('statemachine',asset));assert.deepEqual(stateAncestors(asset,'Idle').map(s=>s.id),['Root','Idle']);
for(const change of [s=>s.states[0].parent='Idle',s=>s.states[0].initialChild='Other',s=>s.states[1].parent='missing',s=>s.states[1].enterConditions=[{key:'Ready',operator:'equal',value:1}],s=>s.transitions=[transition('bad','Idle','Other',{reenter:'yes'})]]){const copy=structuredClone(asset);change(copy);assert.equal(validGameplayAsset('statemachine',copy),false);}
const legacy=structuredClone(asset);legacy.states=legacy.states.filter(s=>!s.parent);for(const s of legacy.states){delete s.parent;delete s.initialChild;delete s.enterConditions;}assert.ok(validGameplayAsset('statemachine',legacy));
const log=[],make=(data=asset,hooks={})=>new StateMachineRunner(data,{event:async n=>log.push(n),animation:async()=>{},...hooks});
const machine=make();await machine.enter('Root');assert.deepEqual(log,['EnterRoot','EnterIdle']);assert.equal(machine.current.id,'Idle');await machine.tick(.3);assert.equal(machine.times.get('Root'),.3);log.length=0;
await machine.enter('Run');assert.deepEqual(log,['ExitIdle','EnterRun']);assert.equal(machine.times.get('Root'),.3);assert.equal(machine.elapsed,0);
log.length=0;await machine.enter('Root');assert.deepEqual(log,['ExitRun','ExitRoot','EnterRoot','EnterIdle']);assert.equal(machine.times.get('Root'),0);
// Child-specific transition wins over parent/global transitions, regardless of array placement.
machine.asset.transitions=[transition('global','any','Other'),transition('parent','Root','Other'),transition('child','Idle','Run')];await machine.tick(.2);assert.equal(machine.current.id,'Run');assert.equal(machine.times.get('Root'),.2);
machine.asset.transitions=[transition('after','Root','Other',{hasExitTime:true,exitTime:.5})];await machine.tick(.2);assert.equal(machine.current.id,'Run');await machine.tick(.1);assert.equal(machine.current.id,'Other');
const conditional=structuredClone(asset);conditional.states.find(s=>s.id==='Idle').enterConditions=[{key:'Ready',operator:'equal',value:true}];const selected=make(conditional);await selected.enter('Root');assert.equal(selected.current.id,'Run');selected.board.set('Ready',true);await selected.enter('Root');assert.equal(selected.current.id,'Idle');selected.board.set('Ready',false);await assert.rejects(selected.enter('Idle'),/진입 조건/);assert.equal(selected.current.id,'Idle','failed selection preserves the current state');
selected.asset.transitions=[transition('denied','Idle','Idle',{reenter:true}),transition('allowed','Idle','Other')];await selected.tick(.1);assert.equal(selected.current.id,'Other');
const reentry=make();await reentry.enter('Root');reentry.asset.transitions=[transition('restart','Idle','Idle',{event:'Again',reenter:true})];await reentry.tick(.2);reentry.events.add('Again');log.length=0;await reentry.tick(.1);assert.equal(reentry.elapsed,0);assert.ok(Math.abs(reentry.times.get('Root')-.3)<1e-10);assert.deepEqual(log,['UpdateRoot','UpdateIdle','ExitIdle','EnterIdle']);
log.length=0;await reentry.stop();assert.deepEqual(log,['ExitIdle','ExitRoot']);assert.equal(reentry.current,null);assert.deepEqual(reentry.snapshot().active,[]);await reentry.tick(10);assert.deepEqual(log,['ExitIdle','ExitRoot']);
let queued;queued=make(asset,{event:async n=>{log.push(n);if(n==='EnterIdle')await queued.enter('Other');}});log.length=0;await queued.enter('Root');assert.deepEqual(log,['EnterRoot','EnterIdle','ExitIdle','ExitRoot','EnterOther']);assert.equal(queued.current.id,'Other');
let interrupted;interrupted=make(asset,{event:async n=>{log.push(n);if(n==='UpdateRoot')await interrupted.enter('Other');}});await interrupted.enter('Root');log.length=0;await interrupted.tick(.1);assert.ok(!log.includes('UpdateIdle'));assert.equal(interrupted.current.id,'Other');
let looping;looping=make(asset,{event:async n=>{if(n==='EnterIdle')await looping.enter('Idle');}});await assert.rejects(looping.enter('Root'),/제한/);assert.equal(looping.running,false);assert.equal(looping.current,null);
const edited=structuredClone(asset),group=addState(edited,{name:'Nested',parent:'Root',submachine:true});assert.ok(validGameplayAsset('statemachine',edited));assert.throws(()=>reparentState(edited,'Root',group),/순환/);reparentState(edited,'Idle','Other');assert.equal(edited.states.find(s=>s.id==='Root').initialChild,'');assert.ok(validGameplayAsset('statemachine',edited));const removed=removeState(edited,group);assert.equal(removed.length,2);assert.ok(validGameplayAsset('statemachine',edited));

// The same processed state is readable from BP service operations and actual C++.
const owner={id:'owner',name:'Owner',position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]},events=[];
const vm={active:true,objects:[owner],bindings:[{self:'owner',root:{components:[]}}],object:id=>id==='owner'?owner:null,custom:async(_b,n)=>events.push(n)};
const systems=gameplaySystems({asset:async()=> 'FSM',readAsset:async()=>asset,operation:async()=>({})}),binding=vm.bindings[0];await systems.operation('startStateMachine',{target:'owner',asset:'FSM'},binding,vm);await systems.tick(.125,vm);
assert.deepEqual((await systems.operation('stateGetPath',{target:'owner'},binding,vm)).return,['Root','Idle']);assert.equal((await systems.operation('stateIsActive',{target:'owner',state:'Root'},binding,vm)).return,true);assert.equal((await systems.operation('stateElapsed',{target:'owner'},binding,vm)).return,.125);
for(const target of [null,undefined,'self'])assert.deepEqual((await systems.operation('stateGetPath',{target},binding,vm)).return,['Root','Idle'],'self resolves to the binding owner');
assert.deepEqual(owner.gameplayDebug.stateMachine.active.map(s=>s.id),['Root','Idle']);
const host=new NativeHost();try{const header='#include <HBEngine/Game.hpp>\nHB_CLASS(Blueprintable)\nclass FSMProbe : public hb::Actor {public: HB_FUNCTION(BlueprintPure) std::vector<std::string> Path(); HB_FUNCTION(BlueprintPure) bool Active(const std::string& name); HB_FUNCTION(BlueprintPure) float Elapsed(); HB_FUNCTION(BlueprintCallable) void Emit();};',source='std::vector<std::string> FSMProbe::Path(){return hb::States::GetPath(this);} bool FSMProbe::Active(const std::string& name){return hb::States::IsInState(this,name);} float FSMProbe::Elapsed(){return hb::States::GetElapsed(this);} void FSMProbe::Emit(){hb::States::SendEvent(this,"FromCpp");}';
  const built=await host.build(header,source),objects=[{...owner,nativeClass:'FSMProbe'}],call=(name,args={})=>host.call(built.token,{key:'nativeCall',nativeId:'FSMProbe.'+name,args:{target:'owner',...args},objects});
  assert.deepEqual((await call('Path')).outputs.result,['Root','Idle']);assert.equal((await call('Active',{name:'Root'})).outputs.result,true);assert.equal((await call('Active',{name:'Other'})).outputs.result,false);assert.equal((await call('Elapsed')).outputs.result,.125);const emitted=await call('Emit');assert.equal(emitted.operations[0].key,'stateEvent');await systems.operation(emitted.operations[0].key,emitted.operations[0].args,binding,vm);
}finally{host.close();}
await systems.operation('stateStop',{target:'owner'},binding,vm);assert.equal(owner.gameplayDebug.stateMachine,null);assert.deepEqual(events.slice(-2),['ExitIdle','ExitRoot']);systems.dispose();
const schema=engineSchema();assert.ok(schema.gameplay.stateMachine.stateFields.includes('parent'));assert.ok(schema.blueprint.nodes.some(n=>n.key==='stateGetPath'));
// Exit callbacks may start a replacement; an older Start must not overwrite it.
const replacement=structuredClone(asset);replacement.initial='Other';let restartOnce=false,services;
const restartVM={...vm,custom:async(_b,n)=>{if(n==='ExitRoot'&&!restartOnce){restartOnce=true;await services.operation('startStateMachine',{asset:'Replacement'},binding,restartVM);}}};
services=gameplaySystems({asset:async name=>name,readAsset:async name=>name==='Replacement'?replacement:asset,operation:async()=>({})});
await services.operation('startStateMachine',{asset:'First'},binding,restartVM);await services.operation('startStateMachine',{asset:'OlderRestart'},binding,restartVM);
assert.equal((await services.operation('stateGet',{},binding,restartVM)).return,'Other');services.dispose();
// Asset-read completion order must not reverse the order of Start requests.
let finishSlow;const slow=new Promise(resolve=>finishSlow=resolve);services=gameplaySystems({asset:async name=>name,readAsset:async name=>name==='Slow'?slow:replacement,operation:async()=>({})});
const pendingStart=services.operation('startStateMachine',{asset:'Slow'},binding,vm);await Promise.resolve();await services.operation('startStateMachine',{asset:'Fast'},binding,vm);finishSlow(asset);await pendingStart;
assert.equal((await services.operation('stateGet',{},binding,vm)).return,'Other');services.dispose();
console.log('계층 FSM: 진입/종료·부모 시간·하위 우선 전환·조건 선택·재진입/중단·재귀 한도·편집 검증·BP/실제 C++ 조회 검사 통과');
