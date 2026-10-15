import fs from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createProject} from './project-manifest.mjs';
import {editorCommand} from './hb.mjs';
import {makeSceneComponent} from '../prototype/scene-components.js';
import {pruneTestArtifacts} from './test-artifacts.mjs';

const root=path.resolve(import.meta.dirname,'..'),dir=await fs.mkdtemp(path.join(root,'native/build/compilation-profiler-window-')),sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(test,label){const end=Date.now()+45000;while(Date.now()<end){const value=await test();if(value)return value;await sleep(100);}throw Error(label+' timeout');}
const record=await createProject('integration-qa-'+Date.now(),dir,'3d'),proof=path.join(dir,'shell.json');
const sceneFile=path.join(record.root,record.manifest.startupScene),scene=JSON.parse(await fs.readFile(sceneFile,'utf8'));const backend=process.argv.includes('--webgl')?'webgl2':'webgpu';scene.runtime.renderBackend=backend;scene.objects.push({id:'Post145',name:'Post145',kind:'empty',visible:true,position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],components:[makeSceneComponent('PostProcessVolume',{bloomEnabled:false,pathTracingEnabled:true,pathTracingSamples:1,pathTracingSamplesPerFrame:1,pathTracingBounces:2})]});await fs.writeFile(sceneFile,JSON.stringify(scene));
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

  const scenePath=record.manifest.startupScene,before=await call('document.get',{path:scenePath});
  await call('window.open',{kind:'profiler'});const profiler=await until(async()=>{const p=await call('profiler.read');return p.rendering?.some(r=>r.pipelinePreparation?.currentStage==='ready')?p:null;},'shader preparation diagnostics');
  assert.equal(profiler.recording,false);const main=profiler.rendering.find(r=>r.id==='뷰포트');assert.equal(main.backend,backend);if(backend==='webgl2')assert.equal(typeof main.pipelinePreparation.parallelSupported,'boolean');assert.equal(main.pipelinePreparation.error,null);assert.ok(main.pipelinePreparation.stages.length>0);
  await until(()=>evaluate('document.querySelector(".profiler-panel")?.textContent.includes("셰이더 준비")'),'profiler table');const text=await evaluate('document.querySelector(".profiler-panel").textContent');assert.ok(text.includes('준비됨')&&text.includes('경로 추적'));assert.equal((await call('document.get',{path:scenePath})).revision,before.revision);assert.equal((await call('profiler.read')).frames.length,0);
  const visible=await evaluate('(()=>{const p=document.querySelector(".profiler-panel"),row=p.querySelector(".profiler-details tbody tr").getBoundingClientRect(),bounds=p.getBoundingClientRect();return {firstRowVisible:row.top>=bounds.top&&row.bottom<=bounds.bottom,chartHidden:getComputedStyle(p.querySelector(".profiler-frame-chart")).display==="none",detailHeight:p.querySelector(".profiler-details").clientHeight};})()');assert.ok(visible.firstRowVisible&&visible.chartHidden&&visible.detailHeight>60,JSON.stringify(visible));
  const idleCall=(method,params)=>until(async()=>{try{return await call(method,params);}catch(error){if(error.code==='EDITOR_BUSY')return false;throw error;}},'idle '+method);
  const patch=await idleCall('document.patch',{path:scenePath,expectedRevision:before.revision,operations:[{op:'replace',path:'/sceneName',value:'Profiler validation'}]});await idleCall('editor.undo',{path:scenePath,expectedRevision:patch.revision});assert.deepEqual((await call('document.get',{path:scenePath})).data,before.data);
  const restored=await call('document.get',{path:scenePath});await idleCall('document.save',{path:scenePath,expectedRevision:restored.revision});assert.equal((await call('document.get',{path:scenePath})).dirty,false);
  await cdp('Page.enable');const shot=await cdp('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(dir,'compilation-profiler.png'),Buffer.from(shot.data,'base64'));assert.equal(errors.length,0);
  const closeState=await call('editor.state');await fs.writeFile(path.join(dir,'before-close.json'),JSON.stringify(closeState,null,2));
  await evaluate("window.chrome.webview.postMessage('hbengine.acceptance.finished')");await Promise.race([exit,sleep(10000)]);if(!ended)await fs.writeFile(path.join(dir,'close-dialogs.json'),JSON.stringify(await evaluate('[...document.querySelectorAll("dialog[open]")].map(d=>d.textContent)'),null,2));assert.equal(ended?.code,0);
  await fs.writeFile(path.join(dir,'acceptance.json'),JSON.stringify({passed:true,dir,rendering:profiler.rendering,withoutFrameRecording:true,sameHumanAndAI:true,sceneRevisionUnchanged:true,ordinaryPatchUndo:true,visible,errors,exit:ended},null,2));console.log('셰이더 프로파일러·AI 조회·기록 없는 진단·일반 수정/Undo PASS: '+dir);
} catch(error){await fs.writeFile(path.join(dir,'failure.json'),JSON.stringify({error:error.stack,output,errors},null,2));throw error;}
finally {socket?.close();for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error('check ended'));}if(!ended)child.kill();await Promise.race([exit,sleep(3000)]);await pruneTestArtifacts(dir);}
