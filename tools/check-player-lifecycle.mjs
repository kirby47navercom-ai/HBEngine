import {disposeSceneEnvironment} from '../prototype/scene-environment.js';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';

// Execute the current Player functions; only browser/VM/storage dependencies are doubles.
const source=await fs.readFile(new URL('../prototype/player.js',import.meta.url),'utf8');
const line=prefix=>{const value=source.split('\n').find(s=>s.startsWith(prefix));assert.ok(value,'Player function missing: '+prefix);return value;};
// Native autoplay starts audio without blocking BeginPlay on a suspended context.
{
  let calls=0;const run=new Function('config','services',line('  if(config.mobile)void services.unlockAudio();'));
  const services={unlockAudio:()=>{calls++;return new Promise(()=>{});}};
  run({mobile:false},services);assert.equal(calls,0,'PC/browser gesture behavior remains unchanged');
  run({mobile:true},services);assert.equal(calls,1,'Native mobile audio must start explicitly even with no user activation');
}
// Reusing a baseline covers only this exact mobile startup change in the shared Player.
if(process.env.SHARED_REVISION){
  assert.match(process.env.SHARED_REVISION,/^[0-9a-f]{40}$/);
  let base=execFileSync('git',['show',process.env.SHARED_REVISION+':prototype/player.js'],{encoding:'utf8',windowsHide:true});
  const marker='  vm=new BlueprintRuntime(objects,prepared.bindings,',added='  // Native mobile hosts explicitly allow audio playback; do not rely on incidental bridge user activation.\n  if(config.mobile)void services.unlockAudio();\n';
  if(!base.includes(added))base=base.replace(marker,added+marker);
  base=base.replace('const frameStart=performance.now()','const frameStart=profiler.time(performance.now())');
  base=base.replace('simulationEnd=performance.now();','simulationEnd=profiler.time(performance.now());');
  base=base.replace('const renderStart=performance.now();','const renderStart=profiler.time(performance.now());');
  base=base.replace('profiler.frame(frameStart,performance.now(),simulationEnd-frameStart,performance.now()-renderStart)','profiler.frame(frameStart,profiler.time(performance.now()),simulationEnd-frameStart,profiler.time(performance.now())-renderStart)');
  base=base.replace('const changed=mobileActive!==active;','const changed=mobileActive!==active;profiler.setActive(active,performance.now());');
  assert.equal(source,base,'Other shared Player changes require the full checks');
}
const releaseSource=line('async function release('),failSource=line('async function fail(');
const closeSource=line('window.hbEngineRequestClose=').split(";$('#quit')")[0]+';';
const factory=new Function('vm','services','objects','groups','world','remove','report','flushStorage','window','$','console','setTimeout','disposeSceneEnvironment','visuals','primitives','frameLoop',`
  const kiosk={enabled:false},config={},operatorMenu=false;let closed=false,closing=false,busy=false,failureCleanup,sceneEpoch=0;
  ${releaseSource}
  ${failSource}
  ${closeSource}
  return {fail,close:window.hbEngineRequestClose,setBusy:value=>{busy=value;},state:()=>({closed,closing,sceneEpoch,failureCleanup})};
`);
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
const settle=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
function fixture({reportGate,endGate,flushGate,flushFailures=0,reportError=false,endError=false}={}){
  const events=[],saved=[],pending=[],timers=[],elements=new Map(),groups=new Map([['actor',{}]]);let flushes=0,frameStops=0;
  const vm={active:true,async stop(reason){events.push('EndPlay:'+reason);if(endGate)await endGate.promise;if(endError){this.active=false;throw Error('EndPlay fixture failure');}pending.push('EndPlay-save');this.active=false;events.push('EndPlay-saved');}};
  const services={dispose:()=>events.push('services-disposed')},world={userData:{},traverse:callback=>{events.push('render-disposed');callback({geometry:{dispose(){}},material:{dispose(){}}});},environment:{dispose(){events.push('environment-disposed');}}};
  const report=async()=>{events.push('report-start');if(reportGate)await reportGate.promise;if(reportError)throw Error('report fixture failure');events.push('report-done');};
  const flushStorage=async()=>{const attempt=++flushes;events.push('flush-start:'+attempt);if(flushGate&&attempt===1)await flushGate.promise;if(attempt<=flushFailures){events.push('flush-failed:'+attempt);throw Error('storage fixture failure');}saved.push(...pending.splice(0));events.push('flush-done:'+attempt);};
  const window={chrome:{webview:{postMessage:value=>events.push(value)}}};
  const $=selector=>{if(!elements.has(selector))elements.set(selector,{hidden:false,textContent:''});return elements.get(selector);};
  const api=factory(vm,services,[{id:'actor'}],groups,world,object=>events.push('removed:'+object.id),report,flushStorage,window,$,{warn:()=>events.push('warning'),error:()=>events.push('failure-reported')},callback=>{timers.push(callback);},disposeSceneEnvironment,{dispose2D:()=>events.push('2d-lighting-disposed')},{dispose:()=>events.push('primitives-disposed')},{stop(){frameStops++;}});
  return {...api,events,saved,pending,timers,vm,groups,elements,frameStops:()=>frameStops};
}
const count=(events,value)=>events.filter(event=>event===value).length;

// A close during fatal diagnostics must also wait for EndPlay and its first flush.
{
  const reportGate=deferred(),endGate=deferred(),flushGate=deferred(),f=fixture({reportGate,endGate,flushGate});
  const failure=f.fail(Error('fatal fixture failure')),cleanup=f.state().failureCleanup;
  assert.ok(cleanup instanceof Promise);assert.equal(f.state().closed,true);assert.equal(f.frameStops(),1);
  const close=f.close();await f.close();await f.fail(Error('duplicate failure'));
  assert.equal(f.state().failureCleanup,cleanup);assert.deepEqual(f.events,['report-start']);
  reportGate.resolve();await settle();assert.deepEqual(f.events,['report-start','report-done','EndPlay:Failed']);
  endGate.resolve();await settle();assert.equal(f.events.at(-1),'flush-start:1');assert.equal(f.pending.length,1);assert.equal(f.saved.length,0);
  assert.equal(count(f.events,'hbengine.close'),0);await f.close();assert.equal(count(f.events,'EndPlay:Failed'),1);
  flushGate.resolve();await Promise.all([failure,close]);
  assert.deepEqual(f.saved,['EndPlay-save']);assert.equal(f.events.at(-1),'hbengine.close');assert.equal(count(f.events,'hbengine.close'),1);
  assert.ok(f.events.indexOf('EndPlay-saved')<f.events.indexOf('flush-start:1'));assert.ok(f.events.indexOf('flush-done:2')<f.events.indexOf('hbengine.close'));
  assert.equal(f.state().sceneEpoch,1);assert.equal(f.vm.active,false);assert.equal(f.groups.size,0);assert.equal(count(f.events,'primitives-disposed'),1);
}

// Optional diagnostics and EndPlay failures cannot bypass resource disposal.
{
  const f=fixture({reportError:true,endError:true});await f.fail(Error('fatal fixture failure'));await f.close();
  assert.equal(count(f.events,'services-disposed'),1);assert.equal(count(f.events,'removed:actor'),1);assert.equal(f.groups.size,0);
  assert.equal(count(f.events,'warning'),1);assert.equal(f.events.at(-1),'hbengine.close');
}

// Fatal cleanup and the first close can both fail storage; a later close retries it.
{
  const f=fixture({flushFailures:2});await f.fail(Error('fatal fixture failure'));
  await f.close();assert.equal(f.state().closing,false);assert.equal(count(f.events,'hbengine.close'),0);
  assert.match(f.elements.get('#error').textContent,/게임 저장 실패/);assert.deepEqual(f.pending,['EndPlay-save']);
  await f.close();assert.deepEqual(f.saved,['EndPlay-save']);assert.equal(count(f.events,'EndPlay:Failed'),1);
  assert.equal(count(f.events,'hbengine.close'),1);assert.equal(f.events.at(-2),'flush-done:3');
}

// A normal close waits for a running frame and suppresses simultaneous requests.
{
  const f=fixture();f.setBusy(true);const close=f.close();await f.close();assert.deepEqual(f.events,[]);assert.equal(f.timers.length,1);
  f.setBusy(false);f.timers.shift()();await close;
  assert.deepEqual(f.saved,['EndPlay-save']);assert.equal(count(f.events,'EndPlay:Stopped'),1);assert.equal(count(f.events,'hbengine.close'),1);
  assert.ok(f.events.indexOf('EndPlay-saved')<f.events.indexOf('flush-start:1'));assert.equal(count(f.events,'2d-lighting-disposed'),1);assert.equal(count(f.events,'primitives-disposed'),1);assert.equal(f.events.at(-1),'hbengine.close');assert.equal(f.frameStops(),1);
}

// A normal shutdown save failure remains recoverable without sending an early close.
{
  const f=fixture({flushFailures:2});await f.close();assert.equal(count(f.events,'hbengine.close'),0);assert.equal(f.state().closed,true);assert.equal(f.state().closing,false);
  assert.equal(count(f.events,'EndPlay:Stopped'),1);assert.equal(count(f.events,'EndPlay:Failed'),0);assert.deepEqual(f.pending,['EndPlay-save']);
  await f.close();assert.deepEqual(f.saved,['EndPlay-save']);assert.equal(count(f.events,'hbengine.close'),1);assert.equal(f.events.at(-2),'flush-done:3');
}
// Capability and request failures belong to the pause menu, not fatal game cleanup.
{
  const fullSource=line("$('#fullscreen').hidden="),elements=new Map(),$=key=>{if(!elements.has(key))elements.set(key,{});return elements.get(key);};
  let requests=0,exits=0,reject=false;const document={fullscreenEnabled:true,documentElement:{requestFullscreen:async()=>{requests++;if(reject)throw Error('platform rejection');}},exitFullscreen:async()=>{exits++;}};
  const setup=new Function('$','document','const kiosk={enabled:false};'+fullSource);setup($,document);assert.equal($('#fullscreen').hidden,false);await $('#fullscreen').onclick();assert.equal(requests,1);
  reject=true;await $('#fullscreen').onclick();assert.equal($('#pause-status').hidden,false);assert.match($('#pause-status').textContent,/전환/);
  reject=false;document.fullscreenElement={};await $('#fullscreen').onclick();assert.equal(exits,1);assert.equal($('#pause-status').hidden,true);
  document.fullscreenEnabled=false;setup($,document);await $('#fullscreen').onclick();assert.equal($('#fullscreen').hidden,true);assert.equal(requests,2);
  document.fullscreenEnabled=true;delete document.documentElement.requestFullscreen;setup($,document);assert.equal($('#fullscreen').hidden,true);
}
// Run the current mobile lifecycle source without waiting for a physical app switch.
{
  const events=[],window={hbMobileHostLifecycle:value=>events.push('host:'+value)},menu={open:false};let now=10;
  const create=new Function('window','performance','menu','schedule','releaseKeys','flushStorage','services','fail','config','report','frameLoop','profiler',`let mobileActive=true,mobileSuspended=false,closed=false,closing=false,last=0,queued=1;${line('window.hbMobileLifecycle=')}return {activate:window.hbMobileLifecycle,suspend:()=>{mobileSuspended=true;},close:()=>{closed=true;},state:()=>({mobileActive,mobileSuspended,last,queued})};`);
  const profileActivity=[];const api=create(window,{now:()=>now},menu,()=>events.push('schedule'),()=>events.push('release'),async()=>events.push('save'),{pauseAudio:async value=>events.push('audio:'+value)},error=>{throw error;},{configuration:'development'},async()=>events.push('report'),{stop:()=>events.push('frame-stop')},{setActive:(active,t)=>profileActivity.push([active,t])});
  api.activate(false);assert.deepEqual(api.state(),{mobileActive:false,mobileSuspended:true,last:10,queued:0});assert.deepEqual(events,['host:false','frame-stop','release','save','audio:true']);
  api.suspend();now=500000;api.activate(true);api.activate(true);assert.equal(events.filter(e=>e==='schedule').length,1);assert.equal(api.state().last,500000);assert.equal(api.state().queued,0);
  assert.deepEqual(profileActivity,[[false,10],[true,500000],[true,500000]]);
  await settle();assert.equal(events.filter(e=>e==='report').length,2,'수명 전환마다 오디오 상태를 보고하고 중복 활성화는 보고하지 않아야 해요.');
  menu.open=true;api.activate(true);assert.equal(events.at(-1),'audio:true');api.suspend();api.close();api.activate(true);assert.equal(events.filter(e=>e==='schedule').length,1);
}
console.log('Player 실제 함수 원문 검사 통과: 실패/저장/종료·전체 화면 기능 감지/거절·모바일 입력/저장/오디오/복귀 스케줄');

// Scene transitions expose no disposed service snapshot; a live snapshot carries game time.
{
 const inspectSource=line('  inspect:').trim().replace(/^inspect:/,'').replace(/,$/,'');
 const inspect=new Function('services','vm','objects','activeCamera','THREE','groups','renderer','currentScene','return ('+inspectSource+')();');
 assert.equal(inspect(null,{active:true},[],null,null,null,null,'Travel'),null);
 assert.equal(inspect({}, {active:false},[],null,null,null,null,'Travel'),null);
 const services={animationState:()=>[],spriteSkinState:()=>[],physicsState:()=>[],projectileState:()=>[]},vm={active:true,core:{time:2.5},inspectWork:()=>[],inputSnapshot:()=>({keys:{w:1}})},camera={type:'Camera',getWorldPosition:()=>({toArray:()=>[0,0,0]})},renderer={getContext:()=>({getParameter:()=>''}),info:{render:{},memory:{},programs:[{diagnostics:{runnable:true}},{diagnostics:{runnable:false}}]}};
 const snapshot=inspect(services,vm,[],camera,{Vector3:class{}},new Map(),renderer,'Boss');assert.equal(snapshot.time,2.5);assert.equal(snapshot.scene,'Boss');assert.equal(snapshot.input.keys.w,1);assert.deepEqual(snapshot.renderer.programs,[{runnable:true},{runnable:false}]);assert.deepEqual(snapshot.lights2d,[]);
}

// The shared deadline loop is checked in check-frame-rate; verify Player gates it.
{
 const scheduleSource=line('const schedule='),factory=new Function('frameLoop','closed','closing','kioskResetting','mobileActive',scheduleSource+'return schedule;');
 let starts=0;const loop={start:()=>starts++};for(const flags of [[true,false,false,true],[false,true,false,true],[false,false,true,true],[false,false,false,false]])factory(loop,...flags)();assert.equal(starts,0);factory(loop,false,false,false,true)();assert.equal(starts,1);
}
