import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {WebSocket} from 'ws';
import {createProject} from './project-manifest.mjs';
import {buildGame,digest,inspectBuild} from './build-game.mjs';
import {defaultBuildProfile,validBuildProfile} from '../prototype/build-profile.js';
import {mobileBackend} from '../prototype/mobile-player.js';
import {webNative,webStorage} from '../prototype/web-player.js';
import {startWebServer} from './web-server.mjs';
import {webFiles} from './publish-web.mjs';

const root=path.resolve(import.meta.dirname,'..');await fs.mkdir(path.join(root,'native/build'),{recursive:true});
const work=await fs.mkdtemp(path.join(root,'native/build/web-export-')),cpp=process.argv.includes('--cpp'),browser=process.argv.includes('--browser');
const values=new Map(),store=webStorage({getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)},'saves');
await store('storageWrite',{slot:'한글 저장'});assert.equal((await store('storageRead')).items.slot,'한글 저장');await store('storageWrite',{slot:null});assert.deepEqual((await store('storageRead')).items,{});
let active=0,maximum=0;const wasm={async ccall(_name,_return,_types,[module,packet]){maximum=Math.max(maximum,++active);await new Promise(resolve=>setTimeout(resolve,5));const value=await this.hbQuery({key:'probe',args:{module}});active--;return JSON.stringify({ok:true,value,packet:JSON.parse(packet)});}},invoke=webNative(wasm);
const rows=await Promise.all([invoke(0,{a:1},async()=>11),invoke(1,{b:2},async()=>22)]);assert.equal(maximum,1);assert.equal(rows[0].value.value,11);assert.equal(rows[1].value.value,22);assert.equal(wasm.hbQuery,undefined);
const outputs=[],reused=process.env.HB_WEB_REUSE?JSON.parse(await fs.readFile(process.env.HB_WEB_REUSE,'utf8')):[];
for(const template of [cpp?'shooter2d':'gameplay2d','gameplay3d']){
  const record=await createProject('HBEngine Web '+template,work,template),profile={...defaultBuildProfile(record.manifest),id:'web',target:'web',configuration:'development'};
  if(template==='shooter2d'){
    const header='Source/TopDownShooter.h',source='Source/TopDownShooter.cpp';
    const h=await fs.readFile(await record.project.resolve(header),'utf8'),c=await fs.readFile(await record.project.resolve(source),'utf8');
    await record.project.write(header,h.replace('private:','HB_FUNCTION(BlueprintCallable) bool Probe();\nprivate:'));
    await record.project.write(source,c+'\nbool TopDownShooter::Probe(){return hb::Physics::Raycast({0,3,0},{0,-3,0},2,-1,false,this).hit;}\n');
  }
  assert.equal(validBuildProfile(profile),true);assert.equal(validBuildProfile({...profile,target:'bad'}),false);
  const validation=await buildGame(record,profile,{dryRun:true});assert.equal(validation.target,'web');assert.equal(validation.renderer,'Browser/WebGL2');
  const result=reused.find(r=>r.output.includes('Web '+template+'/')||r.output.includes('Web '+template+'\\'))||await buildGame(record,profile,{onProgress:stage=>console.log(template+': '+stage)}),manifest=JSON.parse(await fs.readFile(path.join(result.output,'game.hbpack.json'),'utf8'));
  assert.deepEqual(manifest.nativeModules.map(m=>m.signature).sort(),[...(await inspectBuild(record,profile)).natives.keys()].sort(),'current fixture C++ signatures');
  const html=await fs.readFile(result.artifact,'utf8');assert.match(html,/startWebPlayer/);assert.doesNotMatch(html,/"\/(?:prototype|node_modules)\//);assert.equal(result.artifactType,'web');
  assert.equal(manifest.files.some(f=>/node\.exe|\.exe$|serve\.mjs|app\.js$/.test(f.path)),false);assert.ok(manifest.files.some(f=>f.path.includes('rapier2d-compat')));assert.ok(manifest.files.some(f=>f.path.includes('rapier3d-compat')));
  for(const file of manifest.files){const bytes=await fs.readFile(path.join(result.output,file.path));assert.equal(bytes.length,file.bytes);assert.equal(digest(bytes),file.sha256);if(file.path.startsWith('prototype/')||file.path.startsWith('node_modules/'))assert.equal(digest(await fs.readFile(path.join(root,file.path))),file.sha256,'reused runtime source: '+file.path);}
  const backend=mobileBackend(manifest,{read:async()=>new Response('{}'),request:store,mobile:false,baseURL:'https://example.test/HBEngine/'});
  const config=await (await backend('/api/player')).json();assert.equal(config.mobile,false);assert.equal(config.targetFrameRate,120);assert.match(backend.fileUrl(manifest.startupScene),/^https:\/\/example.test\/HBEngine\/Content\//);await assert.rejects(async()=>backend.fileUrl('../escape'),/경로/);
  const uploaded=await webFiles(result.output);assert.equal(uploaded.files.has('build-report.json'),false);assert.equal(uploaded.files.size,manifest.files.length+1);
  const server=await startWebServer(result.output,{prefix:'/HBEngine/'});
  try{
    assert.equal((await fetch(server.url)).status,200);assert.equal((await fetch(new URL('missing',server.url))).status,404);assert.equal((await fetch(new URL('index.html',server.url),{method:'POST'})).status,405);
    const range=await fetch(new URL('index.html',server.url),{headers:{Range:'bytes=0-9'}});assert.equal(range.status,206);assert.equal((await range.arrayBuffer()).byteLength,10);
    if(browser)result.browser=await checkBrowser(template==='shooter2d'&&process.env.HB_WEB_PUBLIC_URL||server.url,template,result.output);
  }finally{await server.close();}
  outputs.push(result);
}
const proof={ok:true,cpp,browser,outputs};await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify(proof,null,2));
if(process.env.HB_WEB_PROOF_EXPORT)await fs.writeFile(process.env.HB_WEB_PROOF_EXPORT,JSON.stringify(proof,null,2));
console.log('Web export: static subdirectory, package hashes, storage, native queue, 2D/3D'+(cpp?', actual Wasm C++':'')+(browser?', browser render and physical input':'')+' passed: '+work);

async function checkBrowser(url,template,out){
  const profile=await fs.mkdtemp(path.join(work,'chrome-')),binary=process.env.HB_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe';
  const child=spawn(binary,['--headless=new','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+profile,'--window-size=1280,720','about:blank'],{windowsHide:true,stdio:'ignore'});
  let socket;const errors=[],httpErrors=[],pending=new Map();let sequence=0;
  const until=async(fn,label)=>{const deadline=Date.now()+60000;while(Date.now()<deadline){const value=await fn();if(value)return value;await new Promise(resolve=>setTimeout(resolve,100));}throw Error(label+' timeout: '+JSON.stringify({errors,httpErrors}));};
  try{
    const port=await until(async()=>{try{return (await fs.readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];}catch{return null;}},'Chrome port');
    const targets=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
    await new Promise((resolve,reject)=>{socket.once('open',resolve);socket.once('error',reject);});
    const cdp=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(Error(method+' timeout'));},15000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));});
    socket.on('message',bytes=>{const value=JSON.parse(bytes);if(value.id){const item=pending.get(value.id);if(item){pending.delete(value.id);clearTimeout(item.timer);value.error?item.reject(Error(value.error.message)):item.resolve(value.result);}}else if(value.method==='Runtime.exceptionThrown')errors.push(value.params.exceptionDetails.exception?.description||value.params.exceptionDetails.text);else if(value.method==='Network.responseReceived'&&value.params.response.status>=400)httpErrors.push({url:value.params.response.url,status:value.params.response.status});});
    const evaluate=async expression=>{const result=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;};
    await cdp('Runtime.enable');await cdp('Network.enable');await cdp('Page.navigate',{url});await until(()=>evaluate('window.hbPlayerDebug?.ready()'),'Web player ready');
    const initial=await evaluate('window.hbPlayerDebug.inspect().objects.find(o=>o.id==="Player").position');
    await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'d',code:'KeyD',windowsVirtualKeyCode:68});await new Promise(resolve=>setTimeout(resolve,300));await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'d',code:'KeyD',windowsVirtualKeyCode:68});
    await until(async()=>{const position=await evaluate('window.hbPlayerDebug.inspect().objects.find(o=>o.id==="Player").position');return Math.abs(position[0]-initial[0])>.05;},'physical keyboard movement');
    if(template==='shooter2d'){
      await cdp('Input.dispatchMouseEvent',{type:'mouseMoved',x:900,y:300});await cdp('Input.dispatchMouseEvent',{type:'mousePressed',x:900,y:300,button:'left',buttons:1,clickCount:1});
      await until(()=>evaluate('window.hbPlayerDebug.inspect().objects.some(o=>o.id.startsWith("Bullet")&&o.poolActive)'),'C++ mouse attack');
      await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',x:900,y:300,button:'left',buttons:0,clickCount:1});
      const probe=await evaluate('window.hbPlayerDebug.call("Player","TopDownShooter.Probe")');assert.equal(probe.outputs.result,false);
    }
    const report=await evaluate('window.hbPlayerDebug.report()');assert.equal(report.error,null);assert.equal(errors.length,0,JSON.stringify(errors));assert.equal(httpErrors.length,0,JSON.stringify(httpErrors));
    await fs.writeFile(path.join(work,template+'.png'),Buffer.from((await cdp('Page.captureScreenshot',{format:'png'})).data,'base64'));
    await evaluate('(async()=>{const s=await import("./prototype/project-session.js");s.storage.setItem(s.storageKey("hbengine.savegame.webtest"),"한글 저장");await s.flushStorage();})()');
    await cdp('Page.reload');await until(()=>evaluate('window.hbPlayerDebug?.ready()'),'saved game reload');
    assert.equal(await evaluate('(async()=>{const s=await import("./prototype/project-session.js");return s.storage.getItem(s.storageKey("hbengine.savegame.webtest"));})()'),'한글 저장');
    if(template==='shooter2d'){
      await cdp('Emulation.setDeviceMetricsOverride',{width:800,height:450,deviceScaleFactor:1,mobile:true});await cdp('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
      await cdp('Page.reload');await until(()=>evaluate('window.hbPlayerDebug?.ready()'),'touch browser ready');
      assert.equal(await evaluate('(async()=> (await(await fetch("/api/player")).json()).targetFrameRate)()'),60);
      const attack=await evaluate('(()=>{const e=[...document.querySelectorAll("#game-ui button")].find(e=>e.dataset.widgetName==="Attack");const r=e?.getBoundingClientRect();return r&&r.width>0?{x:r.x+r.width/2,y:r.y+r.height/2}:null;})()');assert.ok(attack,'visible mobile attack button');
      await cdp('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...attack,id:1}]});
      await until(()=>evaluate('window.hbPlayerDebug.inspect().objects.some(o=>o.id.startsWith("Bullet")&&o.poolActive)'),'touch C++ attack');
      await cdp('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    }
    assert.equal(errors.length,0,JSON.stringify(errors));assert.equal(httpErrors.length,0,JSON.stringify(httpErrors));
    await evaluate('window.hbEngineRequestClose()');await cdp('Browser.close').catch(()=>{});return {ready:true,keyboard:true,cppMouseAttack:template==='shooter2d',errors,httpErrors,frames:report.frames};
  }finally{socket?.close();for(const item of pending.values()){clearTimeout(item.timer);item.reject(Error('browser closed'));}if(child.exitCode===null)child.kill();}
}
