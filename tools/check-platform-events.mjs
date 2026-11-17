// Window focus / gamepad connection events: player ticks (focused, gamepad mask) go through platformEvents like the native
// runner does. The first tick is the baseline; focus loss/gain and pad 1 connect/disconnect each print once with their pins.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {connect,makeNode} from '../prototype/blueprint-model.js';
import {platformEvents} from '../prototype/platform-events.js';
import {createProject} from './project-manifest.mjs';
import {runProject} from './run-project.mjs';

const root=path.resolve(import.meta.dirname,'..'),work=await fs.mkdtemp(path.join(root,'native/build/platform-events-'));
process.env.HB_USER_DATA_DIR=path.join(work,'UserData');
try{
  const record=await createProject('Platform',work,'3d'),dir=path.dirname(record.file),file=path.join(dir,record.manifest.startupBlueprint),graph=JSON.parse(await fs.readFile(file,'utf8'));
  const wire=(a,ap,b,bp)=>assert.ok(connect(graph,{node:a,pin:ap},{node:b,pin:bp}).ok,a+'.'+ap+' -> '+b+'.'+bp);
  const focus=makeNode('windowFocusChanged'),pad=makeNode('gamepadConnectionChanged'),focusBranch=makeNode('branch'),lost=makeNode('print'),gained=makeNode('print'),padBranch=makeNode('branch'),on=makeNode('print'),off=makeNode('print');
  lost.inputValues={message:'focus lost'};gained.inputValues={message:'focus gained'};on.inputValues={message:'pad on'};off.inputValues={message:'pad off'};
  graph.nodes.push(focus,pad,focusBranch,lost,gained,padBranch,on,off);
  wire(focus.id,'then',focusBranch.id,'exec');wire(focus.id,'focused',focusBranch.id,'condition');wire(focusBranch.id,'true',gained.id,'exec');wire(focusBranch.id,'false',lost.id,'exec');
  wire(pad.id,'then',padBranch.id,'exec');wire(pad.id,'connected',padBranch.id,'condition');wire(padBranch.id,'true',on.id,'exec');wire(padBranch.id,'false',off.id,'exec');
  await fs.writeFile(file,JSON.stringify(graph));
  const sceneFile=path.join(dir,record.manifest.startupScene),scene=JSON.parse(await fs.readFile(sceneFile,'utf8'));scene.objects[0].blueprintAsset=record.manifest.startupBlueprint;await fs.writeFile(sceneFile,JSON.stringify(scene));
  // Baseline focused + no pads, then: lose focus, regain, connect pad 1 (bit 1), unchanged, disconnect.
  const ticks=[{focused:true,gamepads:0},{focused:false,gamepads:0},{focused:true,gamepads:0},{focused:true,gamepads:2},{focused:true,gamepads:2},{focused:true,gamepads:0}];
  const logs=[];let state=null;
  await runProject(record.file,{frames:ticks.length,onLog:line=>logs.push(String(line?.text??line)),beforeFrame:async(frame,vm)=>{state=await platformEvents(state,ticks[frame],vm);}});
  const seen=logs.map(l=>['focus lost','focus gained','pad on','pad off'].find(t=>l.includes(t))).filter(Boolean);
  assert.deepEqual(seen,['focus lost','focus gained','pad on','pad off'],JSON.stringify(logs.slice(0,10)));
  assert.equal(await platformEvents(null,{focused:true},null),null,'ticks without the fields keep no state');
  console.log(JSON.stringify({passed:true,seen}));
}finally{await fs.rm(work,{recursive:true,force:true});}
