import assert from 'node:assert/strict';
import {NativeHost} from './native-host.mjs';
import {NativeWorldClient,canDeferNativeFrames} from '../prototype/native-transport.js';
const compiled=new Map([['A',{token:'A'}],['B',{token:'B'}]]),actor={nativeClass:'ActorA',blueprintAsset:'A'};assert.equal(canDeferNativeFrames([actor],compiled),true);assert.equal(canDeferNativeFrames([actor,{nativeClass:'ActorB',blueprintAsset:'B',poolActive:false}],compiled),false);assert.equal(canDeferNativeFrames([{nativeClass:'Unknown'}],compiled),false);

const header=`#include <HBEngine/Game.hpp>
HB_CLASS() class FrameProbe:public hb::Library {public:
 HB_FUNCTION(BlueprintPure) static float Time();
 HB_FUNCTION(BlueprintPure) static float Delta();
 HB_FUNCTION(BlueprintCallable) static void Start(float duration);
 HB_FUNCTION(BlueprintCallable) static void Pause();
 HB_FUNCTION(BlueprintCallable) static void Resume();
 HB_FUNCTION(BlueprintCallable) static void Fail();
};`,source=`std::string handle;
float FrameProbe::Time(){return hb::Clock::GetGameTime();}
float FrameProbe::Delta(){return hb::Clock::GetWorldDeltaSeconds();}
void FrameProbe::Start(float duration){handle=hb::Timers::SetTimer(duration,false,"pulse");}
void FrameProbe::Pause(){hb::Timers::PauseTimer(handle);}
void FrameProbe::Resume(){hb::Timers::ResumeTimer(handle);}
void FrameProbe::Fail(){throw std::runtime_error("frame failure");}`;
const host=new NativeHost();
try{
 const build=await host.build(header,source),client=new NativeWorldClient(),packets=[],objects=[{id:'actor',position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]}];
 const send=packet=>{packets.push(structuredClone(packet));return host.call(build.token,packet);},call=request=>client.call({...request,objects:request.command?[]:objects},build.metadata,send);
 const invoke=(name,args={})=>call({key:'nativeCall',nativeId:'FrameProbe.'+name,args,self:'actor'}),step=(delta=.1,scale=1,paused=false,deferFrame=true)=>call({command:'frame',delta,clock:{scale,paused},deferFrame});
 await call({command:'reset'});assert.equal((await invoke('Time')).outputs.result,0);
 const before=packets.length;let expected=0;
 for(const [delta,scale,paused] of [[.1,1,false],[.2,.5,false],[.4,2,true]]){await step(delta,scale,paused);expected=Math.fround(expected+(paused?0:Math.fround(Math.fround(delta)*Math.fround(scale))));}
 assert.equal(packets.length,before,'timer-free clock steps share the next C++ RPC');assert.equal((await invoke('Time')).outputs.result,expected);assert.equal(packets.at(-1).frameAdvances.length,3);assert.equal((await invoke('Delta')).outputs.result,0);
 await call({command:'reset'});expected=0;for(let i=0;i<64;i++){await step(.01);expected=Math.fround(expected+Math.fround(.01));}
 assert.equal(packets.at(-1).command,'frame');assert.equal(packets.at(-1).frameAdvances.length,63,'idle C++ worlds retain a bounded clock queue');assert.equal((await invoke('Time')).outputs.result,expected);
 await call({command:'reset'});await invoke('Start',{duration:.15});const timerPackets=packets.length;await step(.1);const fired=await step(.1);assert.equal(packets.length,timerPackets+2,'active C++ timers advance before BP Tick');assert.equal(fired.timerCallbacks[0].event,'pulse');assert.equal(fired.timerCallbacks[0].owner,'actor');assert.equal(fired.clockBatchable,true);
 await invoke('Start',{duration:.15});await invoke('Pause');await step(.5);await invoke('Resume');assert.equal(packets.at(-1).frameAdvances.length,1);assert.equal((await step(.1)).timerCallbacks.length,0);assert.equal((await step(.1)).timerCallbacks[0].event,'pulse','paused timer elapsed is not advanced by deferred clock steps');
 await invoke('Start',{duration:1});await assert.rejects(host.call(build.token,{key:'nativeCall',nativeId:'FrameProbe.Time',args:{},self:'actor',objects,frameAdvances:[{delta:.1,clock:{scale:1,paused:false}}]}),/timer dependency/,'a forged delayed frame cannot run past an active timer');
 await call({command:'reset'});await step(.1);const failurePackets=packets.length;await assert.rejects(invoke('Fail'),/frame failure/);assert.equal(packets.length,failurePackets+1);assert.equal((await invoke('Time')).outputs.result,Math.fround(.1));assert.equal(packets.at(-1).frameAdvances,undefined,'failed calls are not retried with their original frame steps');
 const immediate=packets.length;await step(.1,1,false,false);assert.equal(packets.length,immediate+1,'multi-module callers can explicitly keep immediate clock order');
 await call({command:'reset'});await step(.1,.5);await call({command:'frame',delta:.2});assert.equal((await invoke('Time')).outputs.result,Math.fround(Math.fround(.05)+Math.fround(.1)),'legacy frames with no clock keep the previous step and scale');
 await call({command:'reset'});assert.equal((await step(.1,1/3)).clock.scale,Math.fround(1/3),'deferred frames return the same float32 time scale as C++');
 await call({command:'reset'});for(let i=0;i<3;i++)await step(1,1e38);await assert.rejects(step(1,1e38),/시간 출력 오류/,'time overflow is rejected on its original frame');
 await call({command:'reset'});await assert.rejects(step(.1,1e100),/invalid time scale/);
 for(const delta of [NaN,-1,1.1])await assert.rejects(step(delta),/프레임 시간 오류/);
 await assert.rejects(host.call(build.token,{key:'nativeCall',nativeId:'FrameProbe.Time',args:{},objects,frameAdvances:Array(64).fill({delta:.1,clock:{scale:1,paused:false}})}),/프레임 묶음/);
 console.log('Actual C++ frame batching: exact float clock/scales/pause, bounded idle queue, timer-before-Tick boundary, pause/resume, forged packet rejection, no failed-call retry and immediate module fallback passed');
}finally{host.close();}
