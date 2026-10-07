import assert from 'node:assert/strict';
import {advanceNativeFrames,canParallelNativeFrames,nativeWorldClient} from '../prototype/native-transport.js';
import {NativeHost} from './native-host.mjs';

const builds=new Map(['A','B'].map(token=>[token,{token,metadata:{workerProtocol:3,nativeFrameBatch:1}}]));
const owner={active:true,core:{scale:1,paused:false},objects:[{id:'a',nativeClass:'A',blueprintAsset:'A'},{id:'b',nativeClass:'B',nativeBuildAsset:'B'}],bindings:[{self:'a'},{self:'b'}],hooks:{nativeBuild:id=>builds.get(id.toUpperCase())},nativeTimers:async()=>{}};
const reply=time=>({objects:[],events:[],operations:[],timerCallbacks:[],clock:{time,delta:0,scale:1,paused:false},clockBatchable:true});
for(const build of builds.values())await nativeWorldClient(build,owner).call({command:'reset'},build.metadata,async()=>reply(0));
for(const build of builds.values())assert.equal(await nativeWorldClient(build,owner).queue,undefined,'client ordering queue must not retain the complete native reply');
assert.equal(canParallelNativeFrames(builds.values(),owner,.1),true);
const started=[],waiters=[];const concurrent=advanceNativeFrames(builds,owner,.1,async(request,build)=>{started.push(build.token);assert.equal(request.deferFrame,false);return new Promise(resolve=>waiters.push(resolve));});
assert.deepEqual(started,['A','B'],'both timer-free steps are sent before waiting for either host reply');waiters[1](reply(.1));waiters[0](reply(.1));await concurrent;

const a=nativeWorldClient(builds.get('A'),owner),b=nativeWorldClient(builds.get('B'),owner);
await a.call({command:'initialize'},builds.get('A').metadata,async()=>({...reply(0),foreign:[{token:'B',result:{...reply(0),clockBatchable:false}}]}));
assert.equal(canParallelNativeFrames(builds.values(),owner,.1),false,'a foreign call invalidates the receiver timer proof until its next frame');
await a.call({command:'initialize'},builds.get('A').metadata,async()=>({...reply(0),foreign:[{token:'B',result:reply(.25)}]}));assert.equal(canParallelNativeFrames(builds.values(),owner,.1),true,'a completed foreign reply can prove its receiver still has no timers');assert.equal(b.clockState.time,.25);
b.clockBatchable=true;for(const [field,value] of [['pendingCalls',1],['frames',[{delta:.1}]]]){const previous=b[field];b[field]=value;assert.equal(canParallelNativeFrames(builds.values(),owner,.1),false,field+' requires a sequential boundary');b[field]=previous;}
let complete;const old=b.call({command:'initialize'},builds.get('B').metadata,()=>new Promise(resolve=>complete=resolve));await Promise.resolve();await a.call({command:'initialize'},builds.get('A').metadata,async()=>({...reply(0),foreign:[{token:'B',result:{...reply(.5),clockBatchable:false}}]}));complete(reply(.1));await old;assert.equal(b.clockBatchable,false,'an older in-flight reply cannot erase a newer foreign timer change');await b.call({command:'initialize'},builds.get('B').metadata,async()=>reply(.5));
owner.core.scale=1e100;assert.equal(canParallelNativeFrames(builds.values(),owner,.1),false);owner.core.scale=1;b.clockState.time=3e38;owner.core.scale=3e38;assert.equal(canParallelNativeFrames(builds.values(),owner,1),false,'overflow stays on the original sequential step');owner.core.scale=1;b.clockState.time=0;

a.clockBatchable=false;owner.objects.splice(1);const requests=[];owner.nativeTimers=async(result,bindings)=>{if(bindings[0]?.self==='a'){owner.core.scale=2;owner.objects.push({id:'b',nativeClass:'B',nativeBuildAsset:'B'});}};
await advanceNativeFrames(builds,owner,.1,async(request,build)=>{requests.push({token:build.token,...request});return reply(0);});
assert.equal(requests[0].clock.scale,1);assert.equal(requests[1].clock.scale,2,'a timer callback takes effect before the next module step');assert.equal(requests[0].deferFrame,true);assert.equal(requests[1].deferFrame,false,'new foreign actors are reconsidered after each callback');
owner.active=true;owner.nativeTimers=async()=>{owner.active=false;};let count=0;await advanceNativeFrames(builds,owner,.1,async()=>{count++;return reply(0);});assert.equal(count,1,'stopping during a callback prevents later module calls');

const host=new NativeHost();
try{
  const header='#include <HBEngine/Game.hpp>\nHB_CLASS() class ClockProbe:public hb::Library {public: HB_FUNCTION(BlueprintPure) static float Time(); HB_FUNCTION(BlueprintCallable) static void Start(); HB_FUNCTION(BlueprintCallable) static float OtherTime(hb::Actor* other);};',source='float ClockProbe::Time(){return hb::Clock::GetGameTime();} void ClockProbe::Start(){hb::Timers::SetTimer(.15f,false,"Pulse");} float ClockProbe::OtherTime(hb::Actor* other){return hb::Native::Call(other,"Time").at("result").get<float>();}';
  const first=await host.build(header,source),second=await host.build(header,source+'\n// independent module'),actual=new Map([['A',first],['B',second]]),world={active:true,core:{scale:1,paused:false},objects:[{id:'a',nativeClass:'ActorA',blueprintAsset:'A'},{id:'b',nativeClass:'ActorB',blueprintAsset:'B'}],bindings:[],hooks:{},nativeTimers:async()=>{}};
  const packets=[],invoke=(request,build)=>nativeWorldClient(build,world).call({...request,objects:[]},build.metadata,packet=>{packets.push({token:build.token,packet});return host.call(build.token,packet);});
  for(const build of actual.values())await invoke({command:'reset'},build);
  assert.equal(canParallelNativeFrames(actual.values(),world,.1),true);
  packets.length=0;
  for(let i=0;i<3;i++)await advanceNativeFrames(actual,world,.1,invoke);
  assert.equal(packets.length,0,'timer-free clocks wait for the next native read without frontend round trips');
  let expected=0;for(let i=0;i<3;i++)expected=Math.fround(expected+Math.fround(.1));
  for(const build of actual.values())assert.equal((await invoke({key:'nativeCall',nativeId:'ClockProbe.Time',args:{}},build)).outputs.result,expected,'actual C++ modules preserve each float32 clock step');
  assert.equal(packets[0].packet.frameAdvances.length,3);assert.equal(packets[0].packet.moduleFrames[0].steps.length,3);assert.equal(packets[0].packet.moduleFrames[0].token,second.token,'the other clock flushes before the user call in the same frontend round trip');
  for(const moduleFrames of [[{token:first.token,steps:[{delta:.1,clock:{scale:1,paused:false}}]}],[{token:second.token,steps:[]}],[{token:'missing',steps:[{delta:.1,clock:{scale:1,paused:false}}]}]])await assert.rejects(host.call(first.token,{key:'nativeCall',nativeId:'ClockProbe.Time',args:{},objects:[],moduleFrames}),/프레임/);
  for(const build of actual.values())await invoke({command:'reset'},build);await advanceNativeFrames(actual,world,.125,invoke);const pose={position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]},nativeBindings=[{id:'a',token:first.token,className:'ClockProbe',overrides:[]},{id:'b',token:second.token,className:'ClockProbe',properties:{},overrides:[]}];const foreignClock=await nativeWorldClient(first,world).call({key:'nativeCall',nativeId:'ClockProbe.OtherTime',args:{other:'b'},nativeBindings,objects:[{...pose,id:'a',nativeClass:'ClockProbe',nativeProperties:{}},{...pose,id:'b'}]},first.metadata,packet=>host.call(first.token,packet));assert.equal(foreignClock.outputs.result,.125,'a synchronous foreign C++ read observes its already-flushed module clock');assert.equal(foreignClock.foreign[0].result.clock.time,.125);
  await invoke({key:'nativeCall',nativeId:'ClockProbe.Start',args:{}},second);assert.equal(canParallelNativeFrames(actual.values(),world,.1),false,'an actual native timer keeps the callback boundary sequential');
  console.log('Native frame concurrency: timer-free overlap, foreign/pending/deferred/overflow guards, timer scale/spawn/stop order and two actual C++ clocks passed');
}finally{host.close();}
