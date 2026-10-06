import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {readProjectManifest} from './project-manifest.mjs';
import {buildGame} from './build-game.mjs';
import {defaultBuildProfile} from '../prototype/build-profile.js';
import {auricSessionActions} from './auric-session-actions.mjs';

const root=path.resolve(import.meta.dirname,'..'),directory=await fs.realpath(path.resolve(process.argv[2]||'')),base=await fs.realpath(path.join(root,'native/build'));
assert.ok(directory.startsWith(base+path.sep)&&path.basename(directory).startsWith('auric-spawn-'));
const fixture=JSON.parse(await fs.readFile(path.join(directory,'fixture.json'),'utf8')),record=await readProjectManifest(path.join(directory,'AuricLoop/AuricLoop.hbproject'));
const profile=defaultBuildProfile(record.manifest);profile.configuration='development';profile.productName='Auric GameInstance 검사';profile.scenes=['Hub','Dungeon_0','Dungeon_1'].map(name=>({path:'Assets/Scenes/'+name+'.hbscene.json',enabled:true}));
const work=await fs.mkdtemp(path.join(directory,'session-window-')),built=await buildGame(record,profile);await fs.writeFile(path.join(work,'build.json'),JSON.stringify(built,null,2));
const sleep=ms=>new Promise(r=>setTimeout(r,ms)),errors=[];let child,ended,exit,socket,sequence=0;const pending=new Map();
async function until(fn,label,timeout=60000){const end=Date.now()+timeout;while(Date.now()<end){if(ended)throw Error('검사 창 종료 '+JSON.stringify(ended));const v=await fn();if(v)return v;await sleep(100);}throw Error(label+' 시간 초과');}
const cdp=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP '+method));},45000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));});
async function evaluate(expression){const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;}
async function launch(){
 const server=net.createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;await new Promise(r=>server.close(r));ended=null;
 child=spawn(built.executable,['--smoke-test',path.join(work,'shell-'+sequence+'.json')],{cwd:work,windowsHide:true,stdio:'ignore',env:{...process.env,HB_USER_DATA_DIR:path.join(work,'UserData'),HB_PLAYER_ACCEPTANCE:'1',AURIC_MUTE:'1',WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:'--remote-debugging-port='+port+' --disable-renderer-backgrounding --disable-background-timer-throttling --disable-backgrounding-occluded-windows'}});
 exit=new Promise(r=>child.once('exit',(code,signal)=>{ended={code,signal};r();}));
 const target=await until(async()=>{try{return(await(await fetch('http://127.0.0.1:'+port+'/json/list')).json()).find(t=>t.type==='page'&&t.url.startsWith('http://127.0.0.1:'));}catch{}},'분리 게임 창');
 socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j;});socket.onmessage=({data})=>{const m=JSON.parse(data);if(m.id){const p=pending.get(m.id);if(p){clearTimeout(p.timer);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}}else if(m.method==='Runtime.exceptionThrown')errors.push(m);};await cdp('Runtime.enable');
 await until(()=>evaluate('(()=>{const error=document.querySelector("#error");if(error&&!error.hidden)throw Error(error.textContent);return window.hbPlayerDebug?.ready();})()'),'게임 실행 준비');
}
async function release(){if(!child||ended)return;await evaluate('window.chrome.webview.postMessage("hbengine.ready.player")');await Promise.race([exit,sleep(10000)]);assert.equal(ended?.code,0);socket.close();socket=null;}
try{
 await launch();const result=await auricSessionActions({evaluate,until,release,restart:launch});
 const screenshot=await cdp('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(work,'restarted.png'),Buffer.from(screenshot.data,'base64'));assert.equal(errors.length,0);await release();
 await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify({...result,fixture,errors,build:built.executable},null,2));console.log(JSON.stringify({work,...result}));
}catch(error){await fs.writeFile(path.join(work,'failure.json'),JSON.stringify({error:error.stack,errors},null,2));console.error('실제 GameInstance 창 증거: '+work);throw error;}
finally{socket?.close();for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error('종료'));}if(child&&!ended)child.kill();if(exit)await Promise.race([exit,sleep(3000)]);}
