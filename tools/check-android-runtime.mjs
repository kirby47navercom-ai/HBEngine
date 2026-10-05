import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {androidSdk,runTool} from './mobile-android.mjs';
import {deployAndroid} from './android-deploy.mjs';

const root=path.resolve(import.meta.dirname,'..'),proof=JSON.parse(await fs.readFile(process.argv[2],'utf8')),build=proof.apk,expectedTransport=process.argv.includes('--javascript-interface')?'javascript-interface':'message-port';
assert.ok(proof.ok&&build?.output.startsWith(path.join(root,'native/build/mobile-player-')),'격리된 실제 Android 빌드 검사 결과를 사용해요.');
const out=await fs.mkdtemp(path.join(root,'native/build/android-runtime-')),temporary=await fs.mkdtemp(path.join(os.tmpdir(),'HBEngine-Android-')),sdk=androidSdk(),emulator=path.join(sdk,'emulator/emulator'+(process.platform==='win32'?'.exe':'')),adb=path.join(sdk,'platform-tools/adb'+(process.platform==='win32'?'.exe':''));
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(test,label,timeout=90000){const deadline=Date.now()+timeout;while(Date.now()<deadline){if(ended)throw Error('가상 기기 종료: '+JSON.stringify(ended)+'\n'+output.slice(-6000));const value=await test();if(value)return value;await sleep(500);}throw Error(label+' 시간 초과');}
let port;for(let candidate=5554;candidate<5682;candidate+=2){const servers=[];try{for(const number of [candidate,candidate+1]){const server=net.createServer();servers.push(server);await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(number,'127.0.0.1',resolve);});}port=candidate;}catch{}finally{await Promise.all(servers.map(s=>new Promise(resolve=>s.close(resolve))));}if(port)break;}
assert.ok(port,'독립 가상 기기 포트가 없어요.');const serial='emulator-'+port,run=args=>runTool(adb,['-s',serial,...args],{timeout:120000,maxOutput:300000});
const env={...process.env,ANDROID_AVD_HOME:path.join(temporary,'avd'),ANDROID_EMULATOR_HOME:path.join(temporary,'emulator'),ANDROID_USER_HOME:path.join(temporary,'user'),ANDROID_SDK_ROOT:sdk},avd=path.join(env.ANDROID_AVD_HOME,'HBProof.avd');
await fs.mkdir(avd,{recursive:true});await fs.mkdir(env.ANDROID_EMULATOR_HOME);await fs.mkdir(env.ANDROID_USER_HOME);
await fs.writeFile(path.join(env.ANDROID_AVD_HOME,'HBProof.ini'),'avd.ini.encoding=UTF-8\npath='+avd+'\ntarget=android-36\n');
const config='AvdId=HBProof\nabi.type=x86_64\nhw.cpu.arch=x86_64\nhw.cpu.ncore=2\nhw.ramSize=2048\nhw.lcd.width=720\nhw.lcd.height=1280\nhw.lcd.density=240\nhw.gpu.enabled=yes\nhw.gpu.mode=swiftshader\nhw.keyboard=yes\nhw.mainKeys=no\ndisk.dataPartition.size=2048M\ntag.id=default\nimage.sysdir.1='+path.join(sdk,'system-images/android-36/default/x86_64')+'\n';
await fs.writeFile(path.join(avd,'config.ini'),config);await fs.writeFile(path.join(out,'avd-config.ini'),config);
const args=['-avd','HBProof','-no-window','-no-audio','-no-snapshot','-accel','on','-gpu','swiftshader','-memory','2048','-cores','2','-port',String(port),'-camera-back','none','-camera-front','none'];
const child=spawn(emulator,args,{env,windowsHide:true,stdio:['ignore','pipe','pipe']});let ended,output='';child.stdout.on('data',b=>output=(output+b).slice(-50000));child.stderr.on('data',b=>output=(output+b).slice(-50000));child.once('error',error=>{ended={error:error.message};});const exit=new Promise(resolve=>child.once('close',(code,signal)=>{ended={code,signal};resolve();}));
let result,socket,forwardPort;const pending=new Map(),network=[];let sequence=0;
try{
  console.log('독립 Android36 가상 기기 부팅: '+serial);
  await until(async()=>{try{return (await run(['shell','getprop','sys.boot_completed'])).trim()==='1';}catch{return false;}},'Android 부팅',180000);
  await run(['shell','input','keyevent','KEYCODE_WAKEUP']);await run(['shell','wm','dismiss-keyguard']);
  const deployed=await deployAndroid(build,serial,{onProgress:console.log});assert.ok(deployed.installVerified&&deployed.activityStarted);
  const report=async()=>JSON.parse(await run(['shell','run-as',build.mobile.applicationId,'cat','files/runtime-report.json']));
  let ready=await until(async()=>{let data;try{data=await report();}catch{return false;}assert.equal(data.ok,true,data.error);return data.frames>=10?data:false;},'실제 게임 첫 프레임');
  assert.equal(ready.ok,true,ready.error);assert.ok(ready.drawCalls>0);assert.equal(ready.mobileHost.transport||'javascript-interface',expectedTransport);
  assert.equal(ready.audio.state,'running');assert.ok(ready.audio.voices.some(v=>v.clip==='Assets/MobileTone.wav'&&v.playing&&v.time>0));
  for(const [i,count] of [[0,1],[1,10]]){const actor=ready.objects.find(o=>o.id==='mobile-probe-'+i);assert.equal(actor.nativeProperties.Count,count);assert.equal(actor.nativeProperties.GroundHit,true);assert.deepEqual(actor.position,[i?2:-2,1,0]);}
  await fs.writeFile(path.join(out,'android-first-frame.json'),JSON.stringify(ready,null,2));
  const reserve=net.createServer();await new Promise(resolve=>reserve.listen(0,'127.0.0.1',resolve));forwardPort=reserve.address().port;await new Promise(resolve=>reserve.close(resolve));await run(['forward','tcp:'+forwardPort,'localabstract:webview_devtools_remote_'+deployed.pid]);
  const target=await until(async()=>{try{return (await(await fetch('http://127.0.0.1:'+forwardPort+'/json/list')).json()).find(t=>t.type==='page'&&t.url==='https://hbengine.local/prototype/player.html');}catch{return false;}},'검사용 앱 WebView');
  socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});socket.onmessage=({data})=>{const reply=JSON.parse(data);if(reply.id){const item=pending.get(reply.id);if(item){pending.delete(reply.id);clearTimeout(item.timer);reply.error?item.reject(Error(JSON.stringify(reply.error))):item.resolve(reply.result);}}else if(reply.method?.startsWith('Network.')&&network.length<300)network.push(reply);};
  const cdp=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(Error('앱 CDP 응답 시간 초과: '+method));},30000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const result=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;};
  const channel=await evaluate('window.hbMobileChannel')||null;if(expectedTransport==='message-port')assert.ok(channel&&['','https://hbengine.local'].includes(channel.origin)&&(channel.sourceNull||channel.sourceIsWindow));else assert.equal(channel,null);await fs.writeFile(path.join(out,'android-channel.json'),JSON.stringify({transport:expectedTransport,...channel},null,2));
  const audio=await until(async()=>{const state=await evaluate('window.hbPlayerDebug.audio()');return state.levels['Assets/MobileMixer.hbmixer.json']?.master>1e-6?state:false;},'실제 오디오 믹서 신호');
  const ui=await evaluate('(()=>{const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};const image=document.querySelector("[data-widget-name=Vector]");return {title:document.querySelector("[data-widget-name=Title]").textContent,svg:{complete:image.complete,src:image.src,width:image.naturalWidth},fonts:document.fonts.status,viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,joystick:rect(document.querySelector(".hb-ui-Joystick")),attack:rect(document.querySelector(".hb-ui-TouchButton")),input:window.hbPlayerDebug.inspect().input};})()');
  assert.equal(ui.title,'주인님 안녕하세요');assert.ok(ui.svg.complete&&ui.svg.src.endsWith('MobileVector.svg')&&ui.svg.width>0);assert.equal(ui.fonts,'loaded');
  for(const control of [ui.joystick,ui.attack])assert.ok(control.x>=0&&control.y>=0&&control.right<=ui.viewport[0]+1&&control.bottom<=ui.viewport[1]+1,'모바일 조작 UI가 앱 콘텐츠 안에 있어야 해요.');assert.ok(ready.mobileHost.safeInsets.some(v=>v>0),'Android 시스템 안전 영역을 적용해야 해요.');
  await cdp('Network.enable');
  const ranges=await evaluate('(async()=>{const url="/Content/Assets/MobileVector.svg",whole=await(await fetch(url)).text(),parallel=await Promise.all(Array.from({length:8},async()=>{const r=await fetch(url);return r.status===200&&await r.text()===whole;})),results=[];for(const [range,expected] of [["BYTES=0-7",whole.slice(0,8)],["bytes=-8",whole.slice(-8)]]){const r=await fetch(url,{headers:{rAnGe:range}});results.push(r.status===206&&await r.text()===expected);}let invalid;try{invalid=(await fetch(url,{headers:{Range:"bytes=invalid"}})).status;}catch(e){invalid=e.name;}return {parallel:parallel.every(Boolean),ranges:results.every(Boolean),invalid,external:(await fetch("/Native/Bridge.cpp")).status};})()');
  await fs.writeFile(path.join(out,'android-network.json'),JSON.stringify({ranges,network},null,2));assert.ok(ranges.parallel&&ranges.ranges);assert.equal(ranges.external,404);if(ranges.invalid==='TypeError')assert.ok(network.some(e=>e.method==='Network.loadingFailed'&&e.params.errorText==='net::ERR_REQUEST_RANGE_NOT_SATISFIABLE'),'잘못된 Range의 플랫폼 거절을 확인해야 해요.');else assert.equal(ranges.invalid,416);
  const fingers=[{id:1,x:ui.joystick.x+ui.joystick.width*.85,y:ui.joystick.y+ui.joystick.height/2},{id:2,x:ui.attack.x+ui.attack.width/2,y:ui.attack.y+ui.attack.height/2}];
  await cdp('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:fingers});await until(()=>evaluate('(()=>{const k=window.hbPlayerDebug.inspect().input.keys;return k.d>.2&&k[" "]===1&&document.querySelectorAll(".is-held").length===2;})()'),'두 손가락 이동/공격');
  await cdp('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await until(()=>evaluate('Object.keys(window.hbPlayerDebug.inspect().input.keys).length===0&&document.querySelectorAll(".is-held").length===0'),'터치 해제');
  await fs.writeFile(path.join(out,'android-ui.json'),JSON.stringify({ui,ranges,multitouch:true,touchReleased:true},null,2));
  await evaluate('window.hbPlayerDebug.resetProfile()');await sleep(4500);const performance=await evaluate('window.hbPlayerDebug.profile()');assert.ok(performance.frames>=10);const nativeTransport=(await evaluate('window.hbPlayerDebug.report()')).nativeTransport;assert.ok(nativeTransport.some(t=>t.queryCount===1&&Number.isFinite(t.queryMs)));await fs.writeFile(path.join(out,'android-active-performance.json'),JSON.stringify({performance,nativeTransport,audio,channel,transport:expectedTransport,renderer:await evaluate('window.hbPlayerDebug.inspect().renderer'),headless:true,softwareGPU:true,physicalDevice:false,seconds:4.5},null,2));
  await run(['shell','screencap','-p','/data/local/tmp/hb-proof.png']);await run(['pull','/data/local/tmp/hb-proof.png',path.join(out,'android-simulator.png')]);
  console.log('백그라운드 18초 뒤 같은 앱 복귀');await run(['shell','input','keyevent','KEYCODE_HOME']);await sleep(3000);const paused=await report();assert.equal(paused.mobileActive,false);assert.equal(paused.audio.state,'suspended');await sleep(18000);const background=await report();assert.equal(background.ok,true,background.error);assert.equal(background.frames,paused.frames);
  await run(['shell','am','start','-W','-n',build.mobile.applicationId+'/com.hbengine.player.HBActivity']);
  ready=await until(async()=>{const data=await report();assert.equal(data.ok,true,data.error);return data.frames>paused.frames&&data.audio.state==='running'?data:false;},'게임 복귀');assert.equal(ready.mobileActive,true);assert.equal(ready.mobileHost.transport||'javascript-interface',expectedTransport);
  for(const [i,count] of [[0,1],[1,10]]){const actor=ready.objects.find(o=>o.id==='mobile-probe-'+i);assert.equal(actor.nativeProperties.Count,count);assert.equal(actor.nativeProperties.GroundHit,true);}
  assert.equal(await evaluate('Object.keys(window.hbPlayerDebug.inspect().input.keys).length'),0,'복귀 후 입력이 남지 않아야 해요.');
  await fs.writeFile(path.join(out,'android-meminfo.txt'),await run(['shell','dumpsys','meminfo',build.mobile.applicationId]));
  await fs.writeFile(path.join(out,'android-logcat.txt'),await run(['logcat','-d','--pid='+deployed.pid]));
  result={ok:true,buildProof:path.resolve(process.argv[2]),serial,device:deployed.device,installVerified:true,activityStarted:true,runtimeVerified:true,cppBlueprint:true,physicsEveryTick:true,koreanHUD:true,svgUI:true,safeInsets:true,multitouch:true,assetRangeVerified:true,audioSignalVerified:true,audioBackgroundPaused:true,audioResumed:true,backgroundPaused:true,resumePreservesWorld:true,physicalDeviceVerified:false,audioHeard:false,headless:true,report:ready};
  await fs.writeFile(path.join(out,'android-runtime-report.json'),JSON.stringify(result,null,2));
}catch(error){await fs.writeFile(path.join(out,'failure.json'),JSON.stringify({error:error.stack},null,2));try{await fs.writeFile(path.join(out,'android-failure-report.json'),await run(['shell','run-as',build.mobile.applicationId,'cat','files/runtime-report.json']));}catch{}try{await fs.writeFile(path.join(out,'android-logcat.txt'),await run(['logcat','-d']));}catch{}console.error('Android 실행 검사 증거: '+out);throw error;}
finally{
  socket?.close();for(const item of pending.values()){clearTimeout(item.timer);item.reject(Error('검사 종료'));}if(forwardPort)try{await run(['forward','--remove','tcp:'+forwardPort]);}catch{}
  if(!ended)try{await run(['emu','kill']);}catch{}await Promise.race([exit,sleep(30000)]);if(!ended)child.kill();await Promise.race([exit,sleep(5000)]);
  await fs.writeFile(path.join(out,'emulator-log.txt'),output);
  const actual=await fs.realpath(temporary),tempRoot=await fs.realpath(os.tmpdir());assert.ok(actual.startsWith(tempRoot+path.sep+'HBEngine-Android-'),'검사 가상 기기 폴더만 삭제해요.');assert.ok(ended,'가상 기기가 종료되기 전에 데이터를 지우지 않아요.');await fs.rm(actual,{recursive:true});
}
await fs.writeFile(path.join(out,'acceptance.json'),JSON.stringify({...result,temporaryCleaned:true,emulatorExited:true},null,2));console.log('실제 Android 앱·C++/BP·물리·백그라운드/복귀·독립 기기 종료 통과: '+out);
