import fs from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createProject} from './project-manifest.mjs';
import {editorCommand} from './hb.mjs';
import {makeNode,connect} from '../prototype/blueprint-model.js';

const root=path.resolve(import.meta.dirname,'..'),dir=await fs.mkdtemp(path.join(root,'native/build/editor-api-window-')),sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(test,label){const end=Date.now()+45000;while(Date.now()<end){const value=await test();if(value)return value;await sleep(100);}throw Error(label+' timeout');}
const record=await createProject('integration-qa-'+Date.now(),dir,'2d'),proof=path.join(dir,'shell.json');
const reserve=net.createServer();await new Promise(r=>reserve.listen(0,'127.0.0.1',r));const port=reserve.address().port;await new Promise(r=>reserve.close(r));
const env={...process.env,HB_USER_DATA_DIR:path.join(dir,'UserData'),HB_EDITOR_ACCEPTANCE:'1',WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:'--remote-debugging-port='+port+' --disable-renderer-backgrounding --disable-background-timer-throttling --disable-backgrounding-occluded-windows'};delete env.PORT;delete env.HB_PROJECT_DIR;delete env.HB_PROJECT_FILE;
const child=spawn(path.join(root,'HBEngine.exe'),['--smoke-test',proof,record.file],{cwd:dir,env,windowsHide:true,stdio:'pipe'});let output='',ended,socket,sequence=0,checker;
child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);const exit=new Promise(r=>child.once('exit',(code,signal)=>{ended={code,signal};r();}));
const pending=new Map(),errors=[];
try {
  const shell=await until(async()=>{if(ended)throw Error(output);try{return JSON.parse(await fs.readFile(proof,'utf8'));}catch{}},'isolated editor');assert.ok(shell.ok);
  const base='http://127.0.0.1:'+shell.port,call=(method,params)=>editorCommand(base,method,params);
  await until(async()=>{const state=await(await fetch(base+'/api/automation')).json();return state.clients.length===1;},'editor registration');
  checker=spawn(process.execPath,[path.join(root,'tools/check-editor-api.mjs'),base],{cwd:root,windowsHide:true,stdio:'inherit'});
  await new Promise((resolve,reject)=>{checker.once('error',reject);checker.once('exit',code=>code===0?resolve():reject(Error('editor API check exit '+code)));});
  const target=await until(async()=>{try{return (await(await fetch('http://127.0.0.1:'+port+'/json/list')).json()).find(t=>t.type==='page'&&t.url.startsWith(base));}catch{}},'isolated editor debugger');
  socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
  socket.onmessage=({data})=>{const m=JSON.parse(data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}}else if(m.method==='Runtime.exceptionThrown')errors.push(m);};
  const cdp=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout'));},15000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text);return r.result.value;};
  await cdp('Runtime.enable');
  const bpPath='Assets/BP_AutomationNative.hbblueprint.json';await call('document.open',{path:bpPath});const bp=await call('document.get',{path:bpPath}),graph=structuredClone(bp.data);
  graph.nodes=[{...makeNode('beginPlay'),id:'start'},{...makeNode('nativeCall'),id:'move',nativeId:'AutomationActor.Move'},{...makeNode('input'),id:'key',options:{key:'X'}},{...makeNode('nativeCall'),id:'inputMove',nativeId:'AutomationActor.Move'}];graph.edges=[];assert.ok(connect(graph,{node:'start',pin:'then'},{node:'move',pin:'exec'}).ok);assert.ok(connect(graph,{node:'key',pin:'then'},{node:'inputMove',pin:'exec'}).ok);
  await call('document.patch',{path:bpPath,expectedRevision:bp.revision,operations:[{op:'replace',path:'/nodes',value:graph.nodes},{op:'replace',path:'/edges',value:graph.edges}]});
  const built=await call('native.build',{path:bpPath});assert.ok(built.built);const saved=await call('document.get',{path:bpPath});assert.equal(saved.data.native.workerProtocol,3);await call('document.save',{path:bpPath,expectedRevision:saved.revision});
  const scenePath=record.manifest.startupScene;await call('document.open',{path:scenePath});const scene=await call('document.get',{path:scenePath});
  const probe={id:'BridgeProbe',name:'BridgeProbe',kind:'cube',visible:true,position:[0,3,0],rotation:[0,0,0],scale:[1,1,1],blueprintAsset:bpPath,components:[]};
  await call('document.patch',{path:scenePath,expectedRevision:scene.revision,operations:[{op:'add',path:'/objects/'+scene.data.objects.length,value:probe}]});
  const positions=[];for(let attempt=0;attempt<2;attempt++){
    await call('runtime.play');const state=await call('runtime.state');const actual=state.objects.find(o=>o.id==='BridgeProbe');assert.equal(actual.position[0],1,'BP BeginPlay executes user C++ and returns changed transform in the real editor');
    await call('runtime.input',{key:'x',value:1});const moved=(await call('runtime.state')).objects.find(o=>o.id==='BridgeProbe');assert.equal(moved.position[0],2,'next C++ call receives the changed world after clock frames');positions.push(moved.position);await call('runtime.input',{key:'x',value:0});await call('runtime.stop');
    assert.deepEqual((await call('document.get',{path:scenePath})).data.objects.find(o=>o.id==='BridgeProbe').position,probe.position,'Stop restores authored data');
  }
  const current=await call('document.get',{path:scenePath});await call('editor.undo',{path:scenePath,expectedRevision:current.revision});const restored=await call('document.get',{path:scenePath});assert.deepEqual(restored.data,scene.data);await call('document.save',{path:scenePath,expectedRevision:restored.revision});
  assert.equal(errors.length,0);await fs.writeFile(path.join(dir,'acceptance.json'),JSON.stringify({date:new Date().toISOString(),dir,project:record.file,shell,protocol:3,positions,errors},null,2));
  await evaluate("window.chrome.webview.postMessage('hbengine.acceptance.finished')");await Promise.race([exit,sleep(10000)]);assert.equal(ended?.code,0);
  console.log('실제 격리 에디터 API·사용자 C++→BP 실행/재실행·원본 복구 통과:',dir);
} catch(error){await fs.writeFile(path.join(dir,'failure.json'),JSON.stringify({error:error.stack,output,errors},null,2));console.error('검사 증거:',dir);throw error;}
finally {checker?.kill();socket?.close();for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error('check ended'));}if(!ended)child.kill();await Promise.race([exit,sleep(3000)]);}
