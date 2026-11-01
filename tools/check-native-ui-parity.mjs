import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import WebSocket from 'ws';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {NativeWidgetLayer} from './native-widget-layer.mjs';
import {createWidgetAsset,createWidgetNode} from '../prototype/ui-assets.js';
import {activeInstalledVersions} from './install-editor.mjs';
import {retainTestEvidence} from './test-artifacts.mjs';

assert.deepEqual(await activeInstalledVersions('C:/Users/kirby/HBEngine'),[]);
const root=process.cwd(),work=await fs.mkdtemp(path.resolve('native/build/native-ui-parity-'));retainTestEvidence(work);
const assets=path.join(work,'Assets');await fs.mkdir(assets);const art=createCanvas(40,20),paint=art.getContext('2d');paint.fillStyle='#0088ff';paint.fillRect(0,0,40,20);await fs.writeFile(path.join(assets,'wide.png'),art.toBuffer('image/png'));
await fs.writeFile(path.join(assets,'wide.svg'),'<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20"><rect width="40" height="20" fill="#00cc55"/></svg>');
await fs.writeFile(path.join(assets,'slice.svg'),'<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30"><rect width="30" height="30" fill="#ff2200"/><rect x="5" y="5" width="20" height="20" fill="#3344cc"/></svg>');
const data=createWidgetAsset('Parity');Object.assign(data,{referenceSize:[800,450],scaleMode:'scale',scaleRule:'height',safeArea:true,safeAreaPadding:[11,17,23,29]});
const add=(type,id,rect,p={},parent='root')=>{const n=createWidgetNode(type,id,parent);n.name=id;n.slot.offset=rect;Object.assign(n.properties,p);data.nodes.push(n);return n;};
add('Image','contain',[20,20,120,100],{texture:'Assets/wide.png',vectorTexture:'Assets/wide.svg',imageFit:'contain'});
add('Image','cover',[160,20,120,100],{texture:'Assets/wide.png',imageFit:'cover'});
add('Image','slice',[300,20,160,100],{texture:'Assets/slice.svg',nineSlice:[5,5,5,5]});
add('Button','button',[490,20,150,60],{text:'게임 시작',background:'#203040',hover:'#426080',pressed:'#102030',borderWidth:2});
add('Text','text',[20,145,220,90],{text:'가나다 Game\n두 번째 줄',fontSize:24,color:'#ffffff'});
add('Text','wrap',[250,145,200,100],{text:'한글과 English words wrap to the next line',fontSize:20});
add('HorizontalBox','horizontal',[20,275,400,60],{padding:6,gap:10});add('Button','fixed',[0,0,70,40],{text:'A'},'horizontal');const a=add('Button','fillA',[0,0,20,40],{text:'B'},'horizontal');a.slot.fill=1;const b=add('Button','fillB',[0,0,20,40],{text:'C'},'horizontal');b.slot.fill=2;
add('Panel','fade',[480,145,160,100],{opacity:.5,background:'#00000000'});add('Image','fadeImage',[10,10,100,60],{texture:'Assets/wide.png',imageFit:'fill',opacity:.5},'fade');
add('Panel','reuseHost',[480,265,180,100],{background:'#00000000'});add('Canvas','reuse',[0,0,200,100],{widgetReferenceSize:[360,200]},'reuseHost');add('Button','reuseButton',[10,10,200,60],{text:'재사용'},'reuse');
const anchored=add('Button','corner',[-20,-20,100,40],{text:'모서리'});anchored.slot.anchors=[1,1,1,1];anchored.slot.alignment=[1,1];
await fs.writeFile(path.join(work,'fixture.json'),JSON.stringify(data,null,2));
let child,ws;const pending=new Map(),reads=new Set();let serial=0;
const html='<html><head><script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/webgpu":"/node_modules/three/build/three.webgpu.js","three/tsl":"/node_modules/three/build/three.tsl.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script><link rel="stylesheet" href="/prototype/ui-runtime.css"><style>html,body{margin:0;width:100%;height:100%;background:transparent}#host{position:absolute;inset:0}</style></head><body><div id="host"></div><script type="module">import {renderWidgetTree} from "/prototype/ui-runtime.js";window.mount=async data=>{window.view?.dispose();window.view=renderWidgetTree(document.querySelector("#host"),data,{fileUrl:p=>"/"+p});await window.view.fontsReady();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return [...window.view.elements].map(([id,el])=>{const r=el.getBoundingClientRect();return {id,x:r.x,y:r.y,w:r.width,h:r.height};});};window.ready=true;</script></body></html>';
const server=http.createServer(async(req,res)=>{try{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1);if(!name){res.setHeader('Content-Type','text/html');res.end(html);return;}if(name.split('/').includes('..')||name==='prototype/player.js'||!name.startsWith('prototype/')&&!name.startsWith('Assets/')&&!name.startsWith('node_modules/three/')){res.writeHead(403).end();return;}const file=name.startsWith('Assets/')?path.join(work,name):path.join(root,name),bytes=await fs.readFile(file);reads.add(name);res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.svg')?'image/svg+xml':'image/png');res.end(bytes);}catch{res.writeHead(404).end();}});server.listen(0,'127.0.0.1');await once(server,'listening');
const rpc=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
const evaluate=async expression=>{const r=await rpc('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||JSON.stringify(r.exceptionDetails));return r.result.value;};
const checks=[];
try{
 const profile=await fs.mkdtemp(path.join(work,'chrome-'));child=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});
 let port;for(let i=0;i<100;i++){const p=await fs.readFile(path.join(profile,'DevToolsActivePort'),'utf8').catch(()=>null);if(p){port=Number(p.split('\n')[0]);break;}await new Promise(r=>setTimeout(r,100));}assert(port);const tab=(await(await fetch('http://127.0.0.1:'+port+'/json/list')).json()).find(t=>t.type==='page');ws=new WebSocket(tab.webSocketDebuggerUrl);await once(ws,'open');ws.on('message',bytes=>{const p=JSON.parse(bytes);if(p.id){const job=pending.get(p.id);pending.delete(p.id);p.error?job.reject(Error(JSON.stringify(p.error))):job.resolve(p.result);}});
 await rpc('Page.enable');await rpc('Emulation.setDefaultBackgroundColorOverride',{color:{r:0,g:0,b:0,a:0}});await rpc('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'});
 for(let i=0;i<100&&!await evaluate('!!window.ready');i++)await new Promise(r=>setTimeout(r,50));
 for(const ratio of [1,1.5]){
  await rpc('Emulation.setDeviceMetricsOverride',{width:800,height:450,deviceScaleFactor:ratio,mobile:false});const browser=await evaluate('window.mount('+JSON.stringify(data)+')');
  const layer=new NativeWidgetLayer({resolve:async name=>path.join(work,name)},async()=>{});layer.layout=[];layer.create(structuredClone(data),{acceptInput:()=>true,event:()=>{},input:()=>{}},{owner:'test',instance:'HUD'});await layer.draw(800*ratio,450*ratio,ratio);
  const differences=[];for(const r of browser){const n=layer.layout.find(n=>n.id===r.id);for(const field of ['x','y','w','h'])if(Math.abs(r[field]*ratio-n[field])>.1)differences.push({id:r.id,field,browser:r[field]*ratio,native:n[field]});}
  const screenshot=await rpc('Page.captureScreenshot',{format:'png'}),browserImage=await loadImage(Buffer.from(screenshot.data,'base64')),combined=createCanvas(800*ratio,900*ratio),ctx=combined.getContext('2d');ctx.drawImage(browserImage,0,0);ctx.drawImage(layer.canvas,0,450*ratio);await fs.writeFile(path.join(work,'comparison-'+ratio+'.png'),combined.toBuffer('image/png'));
  const browserCanvas=createCanvas(800*ratio,450*ratio),bc=browserCanvas.getContext('2d');bc.drawImage(browserImage,0,0);const samples=[];for(const [id,ux,uy] of [['contain',.5,.1],['contain',.5,.5],['cover',.2,.2],['slice',.01,.5],['slice',.5,.5],['fadeImage',.5,.5],['button',.1,.1]]){const r=browser.find(r=>r.id===id),x=Math.floor((r.x+r.w*ux)*ratio),y=Math.floor((r.y+r.h*uy)*ratio),expected=[...bc.getImageData(x,y,1,1).data],actual=[...layer.canvas.getContext('2d').getImageData(x,y,1,1).data];samples.push({id,expected,actual,passed:expected.every((n,i)=>Math.abs(n-actual[i])<=3)});}
  checks.push({ratio,rectangles:browser.length,differences,samples,passed:!differences.length&&samples.every(s=>s.passed)});layer.dispose();
 }
 const result={passed:checks.every(c=>c.passed),checks,protectedPlayerRead:reads.has('prototype/player.js'),scope:'Actual browser DOM/CSS and native Skia at 1x/1.5x: safe area, anchors, image fit/vector/nine-slice, flex and parent opacity. Text is visually captured; glyph rasterization is not asserted pixel-identical.'};await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({work,...result}));assert(result.passed);
}catch(error){await fs.writeFile(path.join(work,'failure.json'),JSON.stringify({error:error.stack},null,2));throw error;}
finally{if(ws?.readyState===WebSocket.OPEN){await rpc('Browser.close').catch(()=>{});ws.close();}if(child&&child.exitCode===null){await Promise.race([once(child,'exit'),new Promise(r=>setTimeout(r,3000))]);if(child.exitCode===null)child.kill();}await new Promise(r=>server.close(r));}
