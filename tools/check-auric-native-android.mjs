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
assert.ok(directory.startsWith(workspace+path.sep)&&path.basename(directory).startsWith('auric-native-p0-'),'격리 Auric 복사본을 지정하세요.');
const fixture=JSON.parse(await fs.readFile(path.join(directory,'fixture.json'),'utf8')),work=await fs.mkdtemp(path.join(directory,'android-window-'));
const record=await readProjectManifest(fixture.project),profile=defaultBuildProfile(record.manifest);
Object.assign(profile,{id:'android-p0',target:'android',productName:'Auric P0 격리 검사',configuration:'development',scenes:[{path:fixture.scenes.batch,enabled:true},{path:fixture.scenes.baseline,enabled:true},{path:fixture.scenes.classes,enabled:true}],mobile:{applicationId:'com.hbengine.auricp0proof',orientation:'landscape',abis:['x86_64'],format:'apk'}});
const reuse=process.argv[3],build=reuse?JSON.parse(await fs.readFile(path.resolve(reuse),'utf8')):await buildGame(record,profile,{onProgress:console.log});
assert.ok(build.output.startsWith(path.join(record.root,'Builds')+path.sep)&&build.mobile?.applicationId===profile.mobile.applicationId,'격리 Auric 검사 APK만 재사용해요.');await fs.writeFile(path.join(work,'build.json'),JSON.stringify(build,null,2));
const sdk=androidSdk(),adb=path.join(sdk,'platform-tools/adb.exe'),emulator=path.join(sdk,'emulator/emulator.exe'),temporary=await fs.mkdtemp(path.join(os.tmpdir(),'HBEngine-Auric-P0-'));
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));let port;
for(let candidate=5554;candidate<5682;candidate+=2){const sockets=[];try{for(const number of [candidate,candidate+1]){const socket=net.createServer();sockets.push(socket);await new Promise((r,j)=>{socket.once('error',j);socket.listen(number,'127.0.0.1',r);});}port=candidate;}catch{}finally{await Promise.all(sockets.map(s=>new Promise(r=>s.close(r))));}if(port)break;}
assert.ok(port);const serial='emulator-'+port,run=args=>runTool(adb,['-s',serial,...args],{timeout:120000,maxOutput:300000});
const env={...process.env,ANDROID_AVD_HOME:path.join(temporary,'avd'),ANDROID_EMULATOR_HOME:path.join(temporary,'emulator'),ANDROID_USER_HOME:path.join(temporary,'user'),ANDROID_SDK_ROOT:sdk},avd=path.join(env.ANDROID_AVD_HOME,'AuricP0.avd');
for(const directory of [avd,env.ANDROID_EMULATOR_HOME,env.ANDROID_USER_HOME])await fs.mkdir(directory,{recursive:true});
await fs.writeFile(path.join(env.ANDROID_AVD_HOME,'AuricP0.ini'),'avd.ini.encoding=UTF-8\npath='+avd+'\ntarget=android-36\n');
const config='AvdId=AuricP0\nabi.type=x86_64\nhw.cpu.arch=x86_64\nhw.cpu.ncore=2\nhw.ramSize=2048\nhw.lcd.width=720\nhw.lcd.height=1280\nhw.lcd.density=240\nhw.gpu.enabled=yes\nhw.gpu.mode=swiftshader\nhw.keyboard=yes\nhw.mainKeys=no\ndisk.dataPartition.size=2048M\ntag.id=default\nimage.sysdir.1='+path.join(sdk,'system-images/android-36/default/x86_64')+'\n';
await fs.writeFile(path.join(avd,'config.ini'),config);await fs.writeFile(path.join(work,'avd-config.ini'),config);
const child=spawn(emulator,['-avd','AuricP0','-no-window','-no-audio','-no-snapshot','-accel','on','-gpu','swiftshader','-memory','2048','-cores','2','-port',String(port),'-camera-back','none','-camera-front','none'],{env,windowsHide:true,stdio:['ignore','pipe','pipe']});
let ended,output='',socket,forwardPort,sequence=0;const pending=new Map(),errors=[],cases=[];
child.stdout.on('data',b=>output=(output+b).slice(-50000));child.stderr.on('data',b=>output=(output+b).slice(-50000));child.once('error',error=>{ended={error:error.message};});const exit=new Promise(r=>child.once('close',(code,signal)=>{ended={code,signal};r();}));
async function until(fn,label,timeout=90000){const deadline=Date.now()+timeout;while(Date.now()<deadline){if(ended)throw Error('검사 기기 종료 '+JSON.stringify(ended));const result=await fn();if(result)return result;await sleep(250);}throw Error(label+' 시간 초과');}
try{
 console.log('독립 Android36 가상 기기 부팅: '+serial);
 await until(async()=>{try{return(await run(['shell','getprop','sys.boot_completed'])).trim()==='1';}catch{}},'Android 부팅',180000);
 await run(['shell','input','keyevent','KEYCODE_WAKEUP']);await run(['shell','wm','dismiss-keyguard']);const deployed=await deployAndroid(build,serial,{onProgress:console.log});assert.ok(deployed.runtimeReady,deployed.runtimeReport?.error||'게임 준비 실패');
 const reserve=net.createServer();await new Promise(r=>reserve.listen(0,'127.0.0.1',r));forwardPort=reserve.address().port;await new Promise(r=>reserve.close(r));await run(['forward','tcp:'+forwardPort,'localabstract:webview_devtools_remote_'+deployed.pid]);
 const target=await until(async()=>{try{return(await(await fetch('http://127.0.0.1:'+forwardPort+'/json/list')).json()).find(t=>t.type==='page'&&t.url==='https://hbengine.local/prototype/player.html');}catch{}},'검사 앱 WebView');
 socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j;});socket.onmessage=({data})=>{const message=JSON.parse(data);if(message.id){const request=pending.get(message.id);if(request){pending.delete(message.id);clearTimeout(request.timer);message.error?request.reject(Error(JSON.stringify(message.error))):request.resolve(message.result);}}else if(message.method==='Runtime.exceptionThrown')errors.push(message);};
 const cdp=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP '+method));},45000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const result=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;};await cdp('Runtime.enable');
 for(const phase of ['baseline','batch','batch','baseline']){
  await evaluate('window.hbPlayerDebug.operation("openScene",{scene:'+JSON.stringify(fixture.scenes[phase])+'})');await until(async()=>{const r=await evaluate('window.hbPlayerDebug.report()');assert.ok(r.ok,r.error);return r.scene===fixture.scenes[phase];},'장면 전환');await sleep(2000);
  const start=await evaluate('window.hbPlayerDebug.inspect()'),stats=start.objects.filter(o=>o.id.startsWith('P0_Stats_'));assert.equal(stats.length,50);if(cases.length)assert.equal(start.objects.length,cases[0].objects);
  await evaluate('window.hbPlayerDebug.resetProfile()');const performance=await until(async()=>{const p=await evaluate('window.hbPlayerDebug.profile()');return p.frames>=180&&p;},'180개 실제 Android 프레임');
  const report=await evaluate('window.hbPlayerDebug.report()');assert.ok(report.ok,report.error);
  if(phase==='batch')assert.ok(report.objects.filter(o=>o.id.startsWith('P0_Stats_')).every((o,i)=>o.nativeProperties.Ticks>=stats[i].nativeProperties.Ticks+150),'50개 C++ Tick이 실제 앱에서 모두 실행돼야 해요.');
  const native=report.nativeTransport.filter(sample=>sample.callCount>0),timings=Object.fromEntries(['workerMs','rpcMs','frontendMs','decodeMs','validateMs','replyValidationMs','patchMs','syncMs'].map(key=>{const values=native.map(sample=>sample[key]).filter(Number.isFinite).sort((a,b)=>a-b);return [key,values.length?{count:values.length,mean:values.reduce((a,b)=>a+b,0)/values.length,p50:values[Math.floor(values.length*.5)],p95:values[Math.floor(values.length*.95)]}:null];}));
  cases.push({phase,objects:start.objects.length,performance,nativeTimings:timings,nativeTransport:report.nativeTransport});await fs.writeFile(path.join(work,'cases.json'),JSON.stringify(cases,null,2));
 }
 const fps=cases.filter(c=>c.phase==='batch').map(c=>c.performance.fps);assert.equal(errors.length,0);
 const screenshot=await cdp('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(work,'runtime.png'),Buffer.from(screenshot.data,'base64'));
 await fs.writeFile(path.join(work,'logcat.txt'),await run(['logcat','-d','--pid='+deployed.pid]));
 const report={passed:fps.every(fps=>fps>=30),cases,errors,build:build.artifact,serial,device:deployed.device,headlessEmulator:true,softwareGPU:true,physicalDeviceVerified:false,audioHeard:false};await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({work,fps,passed:report.passed}));assert.ok(report.passed,'Android 50개 C++ Tick 장면 30fps 기준 실패');
}catch(error){await fs.writeFile(path.join(work,'failure.json'),JSON.stringify({error:error.stack,cases,errors},null,2));if(!ended){try{await fs.writeFile(path.join(work,'runtime-failure.json'),await run(['shell','run-as',build.mobile.applicationId,'cat','files/runtime-report.json']));}catch{}try{await fs.writeFile(path.join(work,'logcat.txt'),await run(['logcat','-d']));}catch{}}console.error('Android Auric 검사 증거: '+work);throw error;}
finally{
 socket?.close();for(const request of pending.values()){clearTimeout(request.timer);request.reject(Error('검사 종료'));}if(forwardPort)try{await run(['forward','--remove','tcp:'+forwardPort]);}catch{}
 if(!ended)try{await run(['emu','kill']);}catch{}await Promise.race([exit,sleep(30000)]);if(!ended&&child.exitCode===null)try{await runTool('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{timeout:10000});}catch{}await Promise.race([exit,sleep(5000)]);await fs.writeFile(path.join(work,'emulator-log.txt'),output);
 const actual=await fs.realpath(temporary),base=await fs.realpath(os.tmpdir());assert.ok(actual.startsWith(base+path.sep)&&path.basename(actual).startsWith('HBEngine-Auric-P0-'));assert.ok(ended,'가상 기기 종료 전에 데이터를 지우지 않아요.');await fs.rm(actual,{recursive:true});
}
