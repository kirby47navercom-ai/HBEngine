// Utility nodes: Format Text, Get Platform Name, Is Game Paused, Now, Get Viewport Size (runProject viewportSize 800x600),
// and the game-window requests from Launch URL / Copy to Clipboard / Take Screenshot.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {connect,makeNode} from '../prototype/blueprint-model.js';
import {createProject} from './project-manifest.mjs';
import {runProject} from './run-project.mjs';

const root=path.resolve(import.meta.dirname,'..'),work=await fs.mkdtemp(path.join(root,'native/build/utility-nodes-'));
process.env.HB_USER_DATA_DIR=path.join(work,'UserData');
try{
  const record=await createProject('Utility',work,'3d'),dir=path.dirname(record.file),file=path.join(dir,record.manifest.startupBlueprint),graph=JSON.parse(await fs.readFile(file,'utf8'));
  const node=(key,values={})=>{const n=makeNode(key);n.inputValues={...n.inputValues,...values};graph.nodes.push(n);return n;};
  const wire=(a,ap,b,bp)=>assert.ok(connect(graph,{node:a,pin:ap},{node:b,pin:bp}).ok,a+'.'+ap+' -> '+b+'.'+bp);
  const chain=[];const step=n=>{chain.push(n);return n;};
  const format=node('formatText',{format:'{0}-{1}!',arg0:'a',arg1:'b'}),p1=step(node('print'));wire(format.id,'return',p1.id,'message');
  const platform=node('getPlatformName'),p2=step(node('print'));wire(platform.id,'return',p2.id,'message');
  const paused=node('isGamePaused'),b1=step(node('branch')),running=node('print',{message:'running'});wire(paused.id,'return',b1.id,'condition');
  const now=node('now'),p3=node('print');wire(now.id,'text',p3.id,'message');
  const size=node('getViewportSize'),eq=node('intEqual',{b:800}),b2=node('branch'),sized=node('print',{message:'size ok'});wire(size.id,'width',eq.id,'a');wire(eq.id,'return',b2.id,'condition');
  const url=node('launchURL',{url:'https://example.com/docs'}),clip=node('copyToClipboard',{text:'copied'}),shot=node('takeScreenshot');
  const begin=graph.nodes.find(n=>n.key==='beginPlay');
  wire(begin.id,'then',p1.id,'exec');wire(p1.id,'then',p2.id,'exec');wire(p2.id,'then',b1.id,'exec');wire(b1.id,'false',running.id,'exec');wire(running.id,'then',p3.id,'exec');wire(p3.id,'then',b2.id,'exec');wire(b2.id,'true',sized.id,'exec');
  wire(sized.id,'then',url.id,'exec');wire(url.id,'then',clip.id,'exec');wire(clip.id,'then',shot.id,'exec');
  await fs.writeFile(file,JSON.stringify(graph));
  const sceneFile=path.join(dir,record.manifest.startupScene),scene=JSON.parse(await fs.readFile(sceneFile,'utf8'));scene.objects[0].blueprintAsset=record.manifest.startupBlueprint;await fs.writeFile(sceneFile,JSON.stringify(scene));
  const logs=[],windows=[];
  await runProject(record.file,{frames:2,viewportSize:()=>[800,600],onLog:line=>logs.push(String(line?.text??line)),onWindow:s=>windows.push(s)});
  const has=t=>logs.some(l=>l.includes(t));
  assert.ok(has('a-b!'),'format text: '+JSON.stringify(logs.slice(0,8)));
  assert.ok(has('Windows'),'platform name');
  assert.ok(has('running'),'not paused');
  assert.ok(logs.some(l=>/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(l)),'now text');
  assert.ok(has('size ok'),'viewport width 800');
  assert.deepEqual(windows,[{openUrl:'https://example.com/docs'},{clipboard:'copied'},{screenshot:true}]);
  console.log(JSON.stringify({passed:true,logs:logs.length,windows:windows.length}));
}finally{await fs.rm(work,{recursive:true,force:true});}
