import fs from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createProject} from './project-manifest.mjs';
import {createAsset} from '../prototype/asset-documents.js';
import {createWidgetNode} from '../prototype/ui-assets.js';
import {editorCommand} from './hb.mjs';

const root=path.resolve(import.meta.dirname,'..'),dir=await fs.mkdtemp(path.join(root,'native/build/ui-editor-window-')),sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label){const end=Date.now()+40000;while(Date.now()<end){const result=await fn();if(result)return result;await sleep(100);}throw Error(label+' 시간 초과');}
const project=await createProject('UI 제작창 검증',dir,'2d'),asset=createAsset('widget','W_UI'),image=createWidgetNode('Image','icon');image.name='Icon';asset.nodes.push(image);
const assetPath='Assets/W_UI.hbwidget.json',svgPath='Assets/Icon.svg';await project.project.write(assetPath,JSON.stringify(asset));await project.project.write(svgPath,'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><style>path{fill:#57bbed}</style><path d="M8 8h48v48H8z"/></svg>');
const sceneBefore=await fs.readFile(path.join(project.root,project.manifest.startupScene));
const reserve=net.createServer();await new Promise(r=>reserve.listen(0,'127.0.0.1',r));const port=reserve.address().port;await new Promise(r=>reserve.close(r));
const proof=path.join(dir,'shell.json'),env={...process.env,HB_USER_DATA_DIR:path.join(dir,'UserData'),HB_EDITOR_ACCEPTANCE:'1',WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:'--remote-debugging-port='+port+' --disable-renderer-backgrounding --disable-background-timer-throttling --disable-backgrounding-occluded-windows'};delete env.PORT;delete env.HB_PROJECT_DIR;delete env.HB_PROJECT_FILE;
const child=spawn(path.join(root,'HBEngine.exe'),['--smoke-test',proof,project.file],{cwd:dir,env,windowsHide:true,stdio:'pipe'});let ended,output='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);const exit=new Promise(r=>child.on('exit',(code,signal)=>{ended={code,signal};r();}));
let socket,seq=0;const pending=new Map(),errors=[];
try{
  const shell=await until(async()=>{if(ended)throw Error('편집기 종료 '+JSON.stringify(ended)+output);try{return JSON.parse(await fs.readFile(proof,'utf8'));}catch{}},'실제 에디터');assert.ok(shell.ok);const base='http://127.0.0.1:'+shell.port;
  const target=await until(async()=>{try{return (await(await fetch('http://127.0.0.1:'+port+'/json/list')).json()).find(t=>t.type==='page'&&t.url.startsWith(base));}catch{}},'격리 디버거');
  socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j;});socket.onmessage=({data})=>{const m=JSON.parse(data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}}else if(m.method==='Runtime.exceptionThrown')errors.push(m);};
  const cdp=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq,timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP '+method));},30000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
  const call=(method,params)=>editorCommand(base,method,params,{timeout:20000}),change=async(selector,value)=>evaluate('(()=>{const e=document.querySelector('+JSON.stringify(selector)+');e.value='+JSON.stringify(value)+';e.dispatchEvent(new Event("change",{bubbles:true}));})()');
  await cdp('Runtime.enable');await call('document.open',{path:assetPath});await until(()=>evaluate('!!document.querySelector("[data-ui-rule]")'),'UI 배율 메뉴');
  assert.equal(await evaluate('document.querySelector("[data-ui-rule]").options.length'),5);
  await evaluate('document.querySelector("[data-ui-scale]").click();document.querySelector("[data-ui-safe-area]").click()');assert.equal(await evaluate('document.querySelector("[data-ui-rule]").disabled'),false);
  await change('[data-ui-rule]','height');await change('[data-ui-canvas=safeAreaPadding][data-ui-index="0"]','12');
  let doc=await call('document.get',{path:assetPath});assert.equal(doc.data.scaleRule,'height');assert.deepEqual(doc.data.safeAreaPadding,[12,0,0,0]);
  await evaluate('document.querySelector("[data-ui-select=icon]").click()');await until(()=>evaluate(`!!document.querySelector('[data-ui-field="properties.vectorTexture"]')`),'SVG 이미지 선택');
  assert.equal(await evaluate(`!![...document.querySelector('[data-ui-field="properties.texture"]').options].find(o=>o.value==='Assets/Icon.svg')`),true);
  await change('[data-ui-field="properties.vectorTexture"]',svgPath);doc=await call('document.get',{path:assetPath});assert.equal(doc.data.nodes.find(n=>n.id==='icon').properties.vectorTexture,svgPath);
  await until(()=>evaluate('document.querySelector(".ui-preview-host img")?.naturalWidth>0'),'SVG 미리 보기');assert.equal(await evaluate('document.querySelector(".ui-preview-host img").style.imageRendering'),'auto');
  const svgResponse=await fetch(base+'/api/file?path='+encodeURIComponent(svgPath));assert.equal(svgResponse.headers.get('content-type'),'image/svg+xml');assert.ok(svgResponse.headers.get('content-security-policy').includes("style-src 'unsafe-inline'"));
  await evaluate(`document.querySelector('[data-ui-field="properties.vectorTexture"]').scrollIntoView({block:'center'})`);const preview=await cdp('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(dir,'svg-editor.png'),Buffer.from(preview.data,'base64'));
  const original=doc.revision,operations=[{op:'replace',path:'/scaleRule',value:'match'},{op:'add',path:'/scaleMatch',value:.75}];
  const dry=await call('document.patch',{path:assetPath,expectedRevision:original,operations,dryRun:true});assert.ok(dry.valid);assert.equal((await call('document.get',{path:assetPath})).revision,original);
  await call('document.patch',{path:assetPath,expectedRevision:original,operations});doc=await call('document.get',{path:assetPath});assert.equal(doc.data.scaleMatch,.75);assert.equal(await evaluate('Number(document.querySelector("[data-ui-match]").value)'),.75);
  await assert.rejects(call('document.patch',{path:assetPath,expectedRevision:original,operations}),/revision|변경/);
  const undo=await call('editor.undo',{path:assetPath,expectedRevision:doc.revision});assert.equal(undo.revision,original);await call('editor.redo',{path:assetPath,expectedRevision:undo.revision});
  await change('[data-ui-rule]','height');doc=await call('document.get',{path:assetPath});await call('document.save',{path:assetPath,expectedRevision:doc.revision});
  const saved=JSON.parse(await fs.readFile(path.join(project.root,assetPath),'utf8'));assert.equal(saved.scaleRule,'height');assert.equal(saved.nodes.find(n=>n.id==='icon').properties.vectorTexture,svgPath);assert.deepEqual(await fs.readFile(path.join(project.root,project.manifest.startupScene)),sceneBefore);assert.equal(errors.length,0);
  await fs.writeFile(path.join(dir,'acceptance.json'),JSON.stringify({ok:true,shell,saved,svgHeaders:{mime:svgResponse.headers.get('content-type'),policy:svgResponse.headers.get('content-security-policy')},errors,scenePreserved:true},null,2));
  await evaluate("window.chrome.webview.postMessage('hbengine.acceptance.finished')");await Promise.race([exit,sleep(10000)]);assert.equal(ended?.code,0);await until(async()=>{try{await fetch(base+'/api/project');return false;}catch{return true;}},'검사 서버 종료');
  console.log('실제 편집기 UI 배율·SVG 선택/표시·AI dryRun/충돌·Undo/Redo·저장·원본 보존 검사 통과:',dir);
}finally{socket?.close();for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error('검사 종료'));}if(!ended){child.kill();await Promise.race([exit,sleep(5000)]);}}
