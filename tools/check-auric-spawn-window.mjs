import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {readProjectManifest} from './project-manifest.mjs';
import {buildGame} from './build-game.mjs';
import {defaultBuildProfile} from '../prototype/build-profile.js';
import {editorCommand} from './hb.mjs';

const root=path.resolve(import.meta.dirname,'..'),directory=await fs.realpath(path.resolve(process.argv[2]||'')),mode=process.argv[3]||'player';
const workspace=await fs.realpath(path.join(root,'native/build'));
assert.ok(directory.startsWith(workspace+path.sep)&&path.basename(directory).startsWith('auric-spawn-'),'격리 Auric 복사본을 지정하세요.');
assert.ok(['editor','player'].includes(mode));
const fixture=JSON.parse(await fs.readFile(path.join(directory,'fixture.json'),'utf8')),work=await fs.mkdtemp(path.join(directory,mode+'-window-'));
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),cases=[],errors=[];
async function until(fn,label,timeout=45000){const end=Date.now()+timeout;while(Date.now()<end){const value=await fn();if(value)return value;await sleep(100);}throw Error(label+' 시간 초과');}
const temporary=path.join(work,'Temp');await fs.mkdir(temporary);process.env.TEMP=process.env.TMP=temporary;process.env.AURIC_MUTE='1';
let executable;
if(mode==='player'){
 const record=await readProjectManifest(fixture.project),profile=defaultBuildProfile(record.manifest);
 profile.productName='Auric P0 격리 검사';profile.configuration='development';profile.scenes=[{path:fixture.stressScene,enabled:true}];
 const built=await buildGame(record,profile);executable=built.executable;await fs.writeFile(path.join(work,'package.json'),JSON.stringify(built,null,2));
}else{
 // An isolated shell/code copy keeps the user's running editor and installed
 // version untouched. Shared dependencies and hashed native binaries are local.
 const engine=path.join(work,'Engine');await fs.mkdir(engine);
 for(const name of ['prototype','tools'])await fs.cp(path.join(root,name),path.join(engine,name),{recursive:true});
 await fs.cp(path.join(root,'native/include'),path.join(engine,'native/include'),{recursive:true});
 await fs.symlink(path.join(root,'native/build'),path.join(engine,'native/build'),'junction');
 await fs.symlink(path.join(root,'node_modules'),path.join(engine,'node_modules'),'junction');
 await fs.cp(path.join(root,'dist/HBEngine/runtime'),path.join(engine,'runtime'),{recursive:true});
 await fs.copyFile(path.join(root,'package.json'),path.join(engine,'package.json'));
 await fs.copyFile(path.join(root,'dist/HBEngine/WebView2Loader.dll'),path.join(engine,'WebView2Loader.dll'));
 executable=path.join(engine,'HBEngine.exe');await fs.copyFile(path.join(root,'HBEngine.exe'),executable);
}
const reserve=net.createServer();await new Promise(r=>reserve.listen(0,'127.0.0.1',r));const port=reserve.address().port;await new Promise(r=>reserve.close(r));
const env={...process.env,HB_USER_DATA_DIR:path.join(work,'UserData'),[mode==='editor'?'HB_EDITOR_ACCEPTANCE':'HB_PLAYER_ACCEPTANCE']:'1',WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:'--remote-debugging-port='+port+' --disable-renderer-backgrounding --disable-background-timer-throttling --disable-backgrounding-occluded-windows'};
for(const key of ['PORT','HB_PROJECT_DIR','HB_PROJECT_FILE'])delete env[key];
const proof=path.join(work,'shell.json'),child=spawn(executable,['--smoke-test',proof,...(mode==='editor'?[fixture.project]:[])],{cwd:work,env,windowsHide:true,stdio:'pipe'});
let ended,output='',socket,sequence=0;const pending=new Map();child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);
const exit=new Promise(r=>child.once('exit',(code,signal)=>{ended={code,signal};r();}));
try{
 const target=await until(async()=>{if(ended)throw Error('격리 창 종료 '+JSON.stringify(ended)+output);try{return(await(await fetch('http://127.0.0.1:'+port+'/json/list')).json()).find(t=>t.type==='page'&&t.url.startsWith('http://127.0.0.1:'));}catch{}},'격리 실행 창');
 socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j;});
 socket.onmessage=({data})=>{const message=JSON.parse(data);if(message.id){const request=pending.get(message.id);if(request){pending.delete(message.id);clearTimeout(request.timer);message.error?request.reject(Error(JSON.stringify(message.error))):request.resolve(message.result);}}else if(message.method==='Runtime.exceptionThrown')errors.push(message);};
 const cdp=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP '+method));},45000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const result=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;};
 await cdp('Runtime.enable');const base=new URL(target.url).origin,call=(method,params)=>editorCommand(base,method,params);
 if(mode==='editor')await until(async()=>{try{return(await(await fetch(base+'/api/automation')).json()).clients.length===1;}catch{}},'편집기 자동화 등록');
 else await until(()=>evaluate('window.hbPlayerDebug?.ready()'),'게임 준비');

 let measured;
 if(mode==='editor'){
  await call('document.open',{path:fixture.stressScene});await call('runtime.play');await sleep(6000);await call('profiler.record',{recording:true});await call('profiler.clear');
  const snapshot=await until(async()=>{const p=await call('profiler.read');return p.frames.filter(f=>f.label==='게임 프레임').length>=120&&p;},'120개 생성 탄막 편집기 프레임');
  const frames=snapshot.frames.filter(f=>f.label==='게임 프레임'),times=frames.map(f=>f.duration).sort((a,b)=>a-b);
  measured={frames:frames.length,workMs:{mean:times.reduce((a,b)=>a+b,0)/times.length,p95:times[Math.floor((times.length-1)*.95)]},vmFramesPerSecond:1000/((frames.at(-1).start-frames[0].start)/(frames.length-1))};await call('profiler.record',{recording:false});
 }else{
  await sleep(6000);await evaluate('window.hbPlayerDebug.resetProfile()');measured=await until(async()=>{const p=await evaluate('window.hbPlayerDebug.profile()');return p.frames>=240&&p;},'240개 생성 탄막 게임 프레임');
 }
 const state=mode==='editor'?await call('runtime.state'):await evaluate('window.hbPlayerDebug.inspect()'),stats=state.objects.find(o=>o.id==='Director').nativeProperties;
 assert.ok(stats.StressShots>=25,'알레아 .15초 간격 실제 생성');assert.ok(stats.StressBullets>=48,'12발 x 두 번 이상 실제 생성');assert.ok(stats.StressPeak>=30,'탄막과 연사 동시에 활성');
 const rendered=await evaluate('Array.from(document.querySelectorAll("canvas")).map(c=>({id:c.id,width:c.width,height:c.height,clientWidth:c.clientWidth,clientHeight:c.clientHeight}))');await fs.writeFile(path.join(work,"canvas.json"),JSON.stringify({rendered,measured,stats},null,2));
 const titleHidden=await evaluate("(()=>{const image=document.querySelector(\'[data-widget-name=\"TitleScreen\"]\');return image&&image.hidden&&getComputedStyle(image).display===\"none\";})()");assert.equal(titleHidden,true,"runtime image hiding survives image source refresh");
 const screenshot=await cdp('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(work,'runtime.png'),Buffer.from(screenshot.data,'base64'));
 assert.ok(rendered.some(c=>c.clientWidth>=320&&c.clientHeight>=200),'actual rendered viewport');
 assert.equal(errors.length,0);const report={passed:measured.workMs.mean<=16.667&&measured.workMs.p95<=16.667,mode,performance:measured,stats,objects:state.objects.length,stress:fixture.stress,errors,executable};await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify(report,null,2));
 if(mode==='editor')await call('runtime.stop');await evaluate('window.chrome.webview.postMessage('+JSON.stringify(mode==='editor'?'hbengine.acceptance.finished':'hbengine.ready.player')+')');await Promise.race([exit,sleep(10000)]);assert.equal(ended?.code,0);
 console.log(JSON.stringify({mode,work,performance:measured,passed:report.passed}));assert.ok(report.passed,'생성 탄막 60fps CPU 프레임 예산 초과');
}catch(error){await fs.writeFile(path.join(work,'failure.json'),JSON.stringify({error:error.stack,output,cases,errors},null,2));console.error('실제 창 검사 증거: '+work);throw error;}
finally{socket?.close();for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error('검사 종료'));}if(!ended)child.kill();await Promise.race([exit,sleep(2000)]);}
