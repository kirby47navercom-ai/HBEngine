import fs from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createProject} from './project-manifest.mjs';
import {editorCommand} from './hb.mjs';
import {createAsset} from '../prototype/asset-documents.js';
import {pruneTestArtifacts} from './test-artifacts.mjs';

const root=path.resolve(import.meta.dirname,'..'),dir=await fs.mkdtemp(path.join(root,'native/build/editor-tools-window-')),sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(test,label){const end=Date.now()+45000;while(Date.now()<end){const value=await test();if(value)return value;await sleep(100);}throw Error(label+' timeout');}
const record=await createProject('integration-qa-'+Date.now(),dir,'2d'),proof=path.join(dir,'shell.json');
const toolPath='Assets/ET_Window.hbeditortool.json';await fs.writeFile(path.join(record.root,toolPath),JSON.stringify(createAsset('editortool','ET_Window')));
const reserve=net.createServer();await new Promise(r=>reserve.listen(0,'127.0.0.1',r));const port=reserve.address().port;await new Promise(r=>reserve.close(r));
const env={...process.env,HB_USER_DATA_DIR:path.join(dir,'UserData'),HB_EDITOR_ACCEPTANCE:'1',WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:'--remote-debugging-port='+port+' --disable-renderer-backgrounding --disable-background-timer-throttling --disable-backgrounding-occluded-windows'};delete env.PORT;delete env.HB_PROJECT_DIR;delete env.HB_PROJECT_FILE;
const child=spawn(path.join(root,'HBEngine.exe'),['--smoke-test',proof,record.file],{cwd:dir,env,windowsHide:true,stdio:'pipe'});let output='',ended,socket,sequence=0,checker;
child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);const exit=new Promise(r=>child.once('exit',(code,signal)=>{ended={code,signal};r();}));
const pending=new Map(),errors=[];
try {
  const shell=await until(async()=>{if(ended)throw Error(output);try{return JSON.parse(await fs.readFile(proof,'utf8'));}catch{}},'isolated editor');assert.ok(shell.ok);
  const base='http://127.0.0.1:'+shell.port,call=(method,params)=>editorCommand(base,method,params);
  await until(async()=>{const state=await(await fetch(base+'/api/automation')).json();return state.clients.length===1;},'editor registration');
  const target=await until(async()=>{try{return (await(await fetch('http://127.0.0.1:'+port+'/json/list')).json()).find(t=>t.type==='page'&&t.url.startsWith(base));}catch{}},'isolated editor debugger');
  socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
  socket.onmessage=({data})=>{const m=JSON.parse(data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}}else if(m.method==='Runtime.exceptionThrown')errors.push(m);};
  const cdp=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout'));},15000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text);return r.result.value;};
  await cdp('Runtime.enable');

  const scenePath=record.manifest.startupScene;await call('document.open',{path:scenePath});const before=await call('document.get',{path:scenePath});await call('document.open',{path:toolPath});const tool=await call('document.get',{path:toolPath});
  assert.equal(await evaluate('document.querySelector(".editor-tool [data-tool-action=place]")?.textContent'),'배치');assert.equal(await evaluate('getComputedStyle(document.querySelector(".editor-tool-form")).display'),'grid');
  await call('editorTool.run',{path:toolPath,expectedRevision:tool.revision,action:'place',inputs:{kind:'skyLight',position:[2,3,4]}});const after=await call('document.get',{path:scenePath}),added=after.data.objects.find(o=>!before.data.objects.some(p=>p.id===o.id));assert.equal(added.kind,'skyLight');assert.deepEqual(added.position,[2,3,4]);
  await call('editor.undo',{path:scenePath,expectedRevision:after.revision});assert.deepEqual((await call('document.get',{path:scenePath})).data,before.data);
  await call('document.open',{path:toolPath});const edited=await call('document.patch',{path:toolPath,expectedRevision:tool.revision,operations:[{op:'replace',path:'/actions/0/label',value:'광원 배치'}]});assert.equal(await evaluate('document.querySelector(".editor-tool [data-tool-action=place]")?.textContent'),'광원 배치');
  const revision=(await call('document.get',{path:toolPath})).revision;await call('document.save',{path:toolPath,expectedRevision:revision});assert.equal(JSON.parse(await fs.readFile(path.join(record.root,toolPath),'utf8')).actions[0].label,'광원 배치');
  await evaluate('document.querySelector(".editor-tool [data-tool-action=place]").click()');await until(async()=>(await call('document.get',{path:scenePath})).data.objects.length===before.data.objects.length+1,'tool button');const clicked=await call('document.get',{path:scenePath});assert.equal(clicked.data.objects.at(-1).kind,'cube');await call('editor.undo',{path:scenePath,expectedRevision:clicked.revision});
  await call('document.open',{path:toolPath});await cdp('Page.enable');const shot=await cdp('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(dir,'editor-tool.png'),Buffer.from(shot.data,'base64'));assert.equal(errors.length,0);
  const restoredScene=await call('document.get',{path:scenePath});assert.deepEqual(restoredScene.data,before.data);await call('document.save',{path:scenePath,expectedRevision:restoredScene.revision});
  await evaluate("window.chrome.webview.postMessage('hbengine.acceptance.finished')");await Promise.race([exit,sleep(10000)]);assert.equal(ended?.code,0);
  await fs.writeFile(path.join(dir,'acceptance.json'),JSON.stringify({passed:true,dir,toolPath,apiAndHumanButton:true,typedInputs:true,sceneUndo:true,liveToolPatch:true,persisted:true,errors,exit:ended,authoredSceneRestored:true},null,2));console.log('편집기 도구 API·버튼·Undo·정의 편집·저장 PASS: '+dir);
} catch(error){await fs.writeFile(path.join(dir,'failure.json'),JSON.stringify({error:error.stack,output,errors},null,2));throw error;}
finally {socket?.close();for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error('check ended'));}if(!ended)child.kill();await Promise.race([exit,sleep(3000)]);await pruneTestArtifacts(dir);}
