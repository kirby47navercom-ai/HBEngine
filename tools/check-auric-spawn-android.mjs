import {auricSessionActions} from './auric-session-actions.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import os from 'node:os';
import {spawn} from 'node:child_process';
import {readProjectManifest} from './project-manifest.mjs';
import {buildGame} from './build-game.mjs';
import {defaultBuildProfile} from '../prototype/build-profile.js';
import {androidSdk,runTool} from './mobile-android.mjs';
import {deployAndroid} from './android-deploy.mjs';

const root=path.resolve(import.meta.dirname,'..'),directory=await fs.realpath(path.resolve(process.argv[2]||'')),workspace=await fs.realpath(path.join(root,'native/build'));
assert.ok(directory.startsWith(workspace+path.sep)&&path.basename(directory).startsWith('auric-spawn-'),'격리 Auric 복사본을 지정하세요.');
const fixture=JSON.parse(await fs.readFile(path.join(directory,'fixture.json'),'utf8')),work=await fs.mkdtemp(path.join(directory,'android-window-'));
const sessionProof=!!fixture.gameInstance;const record=await readProjectManifest(fixture.project||path.join(directory,'AuricLoop/AuricLoop.hbproject')),profile=defaultBuildProfile(record.manifest);
Object.assign(profile,{id:'android-p0',target:'android',productName:'Auric P0 격리 검사',configuration:'development',scenes:sessionProof?['Hub','Dungeon_0','Dungeon_1'].map(name=>({path:'Assets/Scenes/'+name+'.hbscene.json',enabled:true})):[{path:fixture.stressScene,enabled:true}],mobile:{applicationId:'com.hbengine.auricspawnproof',orientation:'landscape',abis:['x86_64'],format:'apk'}});
const reuse=process.argv[3],build=reuse?JSON.parse(await fs.readFile(path.resolve(reuse),'utf8')):await buildGame(record,profile,{onProgress:console.log});
assert.ok(build.output.startsWith(path.join(record.root,'Builds')+path.sep)&&build.mobile?.applicationId===profile.mobile.applicationId,'격리 Auric 검사 APK만 재사용해요.');await fs.writeFile(path.join(work,'build.json'),JSON.stringify(build,null,2));
const sdk=androidSdk(),adb=path.join(sdk,'platform-tools/adb.exe'),emulator=path.join(sdk,'emulator/emulator.exe'),temporary=await fs.mkdtemp(path.join(os.tmpdir(),'HBEngine-Auric-P0-'));
const cores=Number(process.env.HB_ANDROID_PROOF_CORES||2);assert.ok([2,4].includes(cores),'명시한 2코어/4코어 기기로 검증해요.');
const gpu=process.env.HB_ANDROID_PROOF_GPU||'swiftshader';assert.ok(['swiftshader','host'].includes(gpu),'명시한 소프트웨어/호스트 GPU로 검증해요.');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));let port;
for(let candidate=5654;candidate<5682;candidate+=2){const sockets=[];try{for(const number of [candidate,candidate+1]){const socket=net.createServer();sockets.push(socket);await new Promise((r,j)=>{socket.once('error',j);socket.listen(number,'127.0.0.1',r);});}port=candidate;}catch{}finally{await Promise.all(sockets.map(s=>new Promise(r=>s.close(r))));}if(port)break;}
assert.ok(port);const serial='emulator-'+port,reserveAdb=net.createServer();await new Promise(r=>reserveAdb.listen(0,'127.0.0.1',r));const adbPort=reserveAdb.address().port;await new Promise(r=>reserveAdb.close(r));
// The test owns this server; disable USB, emulator scanning and wireless auto-connect.
const env={...process.env,ADB_SERVER_SOCKET:'tcp:'+adbPort,ANDROID_ADB_SERVER_PORT:String(adbPort),ADB_LOCAL_TRANSPORT_MAX_PORT:'0',ADB_MDNS_AUTO_CONNECT:'0',ANDROID_AVD_HOME:path.join(temporary,'avd'),ANDROID_EMULATOR_HOME:path.join(temporary,'emulator'),ANDROID_USER_HOME:path.join(temporary,'user'),ANDROID_SDK_ROOT:sdk},avd=path.join(env.ANDROID_AVD_HOME,'AuricP0.avd');
const run=(args,timeout=15000)=>runTool(adb,['-s',serial,...args],{env,timeout,maxOutput:300000});let serverStarted=false;
await fs.writeFile(path.join(work,'adb-isolation.json'),JSON.stringify({adbPort,serial,emulatorScan:false,wirelessAutoConnect:false,usbSerialFilter:serial},null,2));
for(const directory of [avd,env.ANDROID_EMULATOR_HOME,env.ANDROID_USER_HOME])await fs.mkdir(directory,{recursive:true});
await fs.writeFile(path.join(env.ANDROID_AVD_HOME,'AuricP0.ini'),'avd.ini.encoding=UTF-8\npath='+avd+'\ntarget=android-36\n');
const config='AvdId=AuricP0\nabi.type=x86_64\nhw.cpu.arch=x86_64\nhw.cpu.ncore='+cores+'\nhw.ramSize=2048\nhw.lcd.width=720\nhw.lcd.height=1280\nhw.lcd.density=240\nhw.gpu.enabled=yes\nhw.gpu.mode='+gpu+'\nhw.keyboard=yes\nhw.mainKeys=no\ndisk.dataPartition.size=2048M\ntag.id=default\nimage.sysdir.1='+path.join(sdk,'system-images/android-36/default/x86_64')+'\n';
await fs.writeFile(path.join(avd,'config.ini'),config);await fs.writeFile(path.join(work,'avd-config.ini'),config);
const child=spawn(emulator,['-avd','AuricP0','-no-window','-no-audio','-no-snapshot','-accel','on','-gpu',gpu,'-memory','2048','-cores',String(cores),'-port',String(port),'-camera-back','none','-camera-front','none'],{env,windowsHide:true,stdio:['ignore','pipe','pipe']});
let ended,output='',socket,forwardPort,sequence=0;const pending=new Map(),errors=[],cases=[];
child.stdout.on('data',b=>output=(output+b).slice(-50000));child.stderr.on('data',b=>output=(output+b).slice(-50000));child.once('error',error=>{ended={error:error.message};});const exit=new Promise(r=>child.once('close',(code,signal)=>{ended={code,signal};r();}));
async function until(fn,label,timeout=90000){const deadline=Date.now()+timeout;while(Date.now()<deadline){if(ended)throw Error('검사 기기 종료 '+JSON.stringify(ended));const result=await fn();if(result)return result;await sleep(250);}throw Error(label+' 시간 초과');}
try{
 await runTool(adb,['--one-device',serial,'start-server'],{env,timeout:15000});serverStarted=true;
 console.log('독립 Android36 가상 기기 부팅: '+serial);
 await until(async()=>{try{return(await run(['shell','getprop','sys.boot_completed'],5000)).trim()==='1';}catch{}},'Android 부팅',180000);
 const cpuOnline=(await run(['shell','cat','/sys/devices/system/cpu/online'])).trim();assert.equal(cpuOnline,cores===2?'0-1':'0-3','실제 부팅한 가상 CPU 수를 확인해요.');await fs.writeFile(path.join(work,'cpu-online.txt'),cpuOnline+'\n');
 await run(['shell','input','keyevent','KEYCODE_WAKEUP']);await run(['shell','wm','dismiss-keyguard']);const deployed=await deployAndroid(build,serial,{env,onProgress:console.log});await fs.writeFile(path.join(work,'deployment.json'),JSON.stringify(deployed,null,2));assert.ok(deployed.runtimeReady||sessionProof&&deployed.runtimeProbeError==='모바일 도구 시간 초과',deployed.runtimeReport?.error||deployed.runtimeProbeError||'게임 준비 실패');
 const reserve=net.createServer();await new Promise(r=>reserve.listen(0,'127.0.0.1',r));forwardPort=reserve.address().port;await new Promise(r=>reserve.close(r));await run(['forward','tcp:'+forwardPort,'localabstract:webview_devtools_remote_'+deployed.pid]);
 const target=await until(async()=>{try{return(await(await fetch('http://127.0.0.1:'+forwardPort+'/json/list')).json()).find(t=>t.type==='page'&&t.url==='https://hbengine.local/prototype/player.html');}catch{}},'검사 앱 WebView');
 socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j;});socket.onmessage=({data})=>{const message=JSON.parse(data);if(message.id){const request=pending.get(message.id);if(request){pending.delete(message.id);clearTimeout(request.timer);message.error?request.reject(Error(JSON.stringify(message.error))):request.resolve(message.result);}}else if(message.method==='Runtime.exceptionThrown')errors.push(message);};
 const cdp=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP '+method));},45000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const result=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;};await cdp('Runtime.enable');
 const graphics=await evaluate('(()=>{const gl=document.querySelector("canvas")?.getContext("webgl2");if(!gl)return null;const ext=gl.getExtension("WEBGL_debug_renderer_info");return {vendor:gl.getParameter(ext?.UNMASKED_VENDOR_WEBGL||gl.VENDOR),renderer:gl.getParameter(ext?.UNMASKED_RENDERER_WEBGL||gl.RENDERER)};})()');assert.ok(graphics,'실제 게임의 WebGL 컨텍스트를 확인해요.');const surface=await run(['shell','dumpsys','SurfaceFlinger']);await fs.writeFile(path.join(work,'graphics.json'),JSON.stringify(graphics,null,2));await fs.writeFile(path.join(work,'surfaceflinger.txt'),surface);

 if(sessionProof){
   await until(()=>evaluate('(()=>{const error=document.querySelector("#error");if(error&&!error.hidden)throw Error(error.textContent);return window.hbPlayerDebug?.ready();})()'),'CDP 실제 게임 실행 준비');
   const proof=await auricSessionActions({evaluate,until,
     background:async()=>{const previous=await evaluate('window.hbPlayerDebug.report()');await run(['shell','input','keyevent','KEYCODE_HOME']);await sleep(1500);await run(['shell','am','start','-W','-n',build.mobile.applicationId+'/com.hbengine.player.HBActivity']);await until(async()=>{const r=await evaluate('window.hbPlayerDebug.report()');return r.mobileActive&&r.frames>previous.frames;},'백그라운드 복귀');},
     release:async()=>{socket.close();await run(['shell','am','force-stop',build.mobile.applicationId]);},
     restart:async()=>{await run(['shell','am','start','-W','-n',build.mobile.applicationId+'/com.hbengine.player.HBActivity']);const pid=(await run(['shell','pidof',build.mobile.applicationId])).trim().split(/\s+/)[0];await run(['forward','tcp:'+forwardPort,'localabstract:webview_devtools_remote_'+pid]);const next=await until(async()=>{try{return(await(await fetch('http://127.0.0.1:'+forwardPort+'/json/list')).json()).find(t=>t.type==='page');}catch{}},'재실행 WebView');socket=new WebSocket(next.webSocketDebuggerUrl);await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j;});socket.onmessage=({data})=>{const m=JSON.parse(data),p=pending.get(m.id);if(p){pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m);};await cdp('Runtime.enable');await until(()=>evaluate('window.hbPlayerDebug?.ready()'),'앱 재실행 준비');}
   });
   assert.equal(errors.length,0);await run(['shell','screencap','-p','/data/local/tmp/hb-session-proof.png']);await run(['pull','/data/local/tmp/hb-session-proof.png',path.join(work,'device.png')]);
   await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify({...proof,serial,device:deployed.device,gpu,graphics,cores,cpuOnline,physicalDeviceVerified:false,errors},null,2));console.log(JSON.stringify({work,...proof}));
 }else{
 for(let repeat=0;repeat<2;repeat++){
  await evaluate('window.hbPlayerDebug.operation("openScene",{scene:'+JSON.stringify(fixture.stressScene)+'})');await until(async()=>{const r=await evaluate('window.hbPlayerDebug.report()');assert.ok(r.ok,r.error);return r.scene===fixture.stressScene;},'생성 탄막 장면');await sleep(6000);
  await evaluate('window.hbPlayerDebug.resetProfile()');const performance=await until(async()=>{const p=await evaluate('window.hbPlayerDebug.profile()');return p.frames>=180&&p;},'180개 실제 Android 생성 탄막 프레임');
  const report=await evaluate('window.hbPlayerDebug.report()');assert.ok(report.ok,report.error);const stats=report.objects.find(o=>o.id==='Director').nativeProperties;assert.ok(stats.StressShots>=25&&stats.StressBullets>=48&&stats.StressPeak>=30,'원형 탄막·6.7발/초 연사 실제 동시 실행');
  cases.push({phase:'batch',repeat,performance,stats,objects:report.objects.length,nativeTransport:report.nativeTransport});await fs.writeFile(path.join(work,'cases.json'),JSON.stringify(cases,null,2));
 }
 const fps=cases.filter(c=>c.phase==='batch').map(c=>c.performance.fps);assert.equal(errors.length,0);
 const titleHidden=await evaluate("(()=>{const image=document.querySelector('[data-widget-name=\"TitleScreen\"]');return image&&image.hidden&&getComputedStyle(image).display===\"none\";})()");assert.equal(titleHidden,true,'실제 이미지 숨김 상태');
 const screenshot=await cdp('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(work,'runtime.png'),Buffer.from(screenshot.data,'base64'));
 await run(['shell','screencap','-p','/data/local/tmp/hb-auric-spawn-proof.png']);await run(['pull','/data/local/tmp/hb-auric-spawn-proof.png',path.join(work,'device.png')]);
 await fs.writeFile(path.join(work,'render-surface.json'),JSON.stringify(await evaluate('(async()=>({canvases:[...document.querySelectorAll("canvas")].map(c=>({width:c.width,height:c.height,clientWidth:c.clientWidth,clientHeight:c.clientHeight,rect:c.getBoundingClientRect().toJSON(),hidden:c.hidden,display:getComputedStyle(c).display})),report:await window.hbPlayerDebug.report()}))()'),null,2));
 await fs.writeFile(path.join(work,'logcat.txt'),await run(['logcat','-d','--pid='+deployed.pid]));
 const report={passed:fps.every(fps=>fps>=30)&&cases.every(c=>c.performance.workMs.mean<=33.333&&c.performance.workMs.p95<=33.333),cases,errors,build:build.artifact,serial,device:deployed.device,headlessEmulator:true,gpu,graphics,cores,cpuOnline,requestedMemoryMB:2048,memoryMB:Number(/Increasing RAM size to (\d+)MB/.exec(output)?.[1]||2048),softwareGPU:/swiftshader|lavapipe|software/i.test(graphics.renderer),physicalDeviceVerified:false,audioHeard:false};await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({work,gpu,graphics,cores,cpuOnline,fps,passed:report.passed}));assert.ok(report.passed,'Android 생성 탄막 장면 30fps 기준 실패');
 }}catch(error){await fs.writeFile(path.join(work,'failure.json'),JSON.stringify({error:error.stack,cases,errors},null,2));if(!ended){try{await fs.writeFile(path.join(work,'runtime-failure.json'),await run(['shell','run-as',build.mobile.applicationId,'cat','files/runtime-report.json'],5000));}catch{}try{await fs.writeFile(path.join(work,'logcat.txt'),await run(['logcat','-d','-t','200'],5000));}catch{}}console.error('Android Auric 검사 증거: '+work);throw error;}
finally{
 socket?.close();for(const request of pending.values()){clearTimeout(request.timer);request.reject(Error('검사 종료'));}if(forwardPort)try{await run(['forward','--remove','tcp:'+forwardPort],5000);}catch{}
 if(!ended)try{await run(['emu','kill'],10000);}catch{}await Promise.race([exit,sleep(30000)]);if(!ended&&child.exitCode===null)try{await runTool('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{timeout:10000});}catch{}await Promise.race([exit,sleep(5000)]);if(serverStarted)try{await runTool(adb,['kill-server'],{env,timeout:5000});}catch{}await fs.writeFile(path.join(work,'emulator-log.txt'),output);
 const actual=await fs.realpath(temporary),base=await fs.realpath(os.tmpdir());assert.ok(actual.startsWith(base+path.sep)&&path.basename(actual).startsWith('HBEngine-Auric-P0-'));assert.ok(ended,'가상 기기 종료 전에 데이터를 지우지 않아요.');await fs.rm(actual,{recursive:true});
}
