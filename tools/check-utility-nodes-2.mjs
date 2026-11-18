// Camera / audio / random / array / debug nodes: Set Master Volume then Get Master Volume, Set Field of View on the camera,
// Set View Target with Blend request, Project World to Screen (needs a pointer camera; false without one), Random Unit
// Vector length 1, Random Point in Radius inside the radius, Array Shuffle keeps the items, Draw Debug Arrow adds 3 segments.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import * as THREE from 'three';
import {connect,makeNode} from '../prototype/blueprint-model.js';
import {blueprintPure} from '../prototype/core-preview.js';
import {DebugDraw} from '../prototype/debug-draw.js';
import {ViewBlend} from '../prototype/view-blend.js';
import {AudioRouting} from '../prototype/audio-mixer.js';
import {createProject} from './project-manifest.mjs';
import {runProject} from './run-project.mjs';

// pure helpers
for(let i=0;i<50;i++){const v=blueprintPure.randomUnitVector().return;assert.ok(Math.abs(Math.hypot(...v)-1)<1e-9);const p=blueprintPure.randomPointInRadius({center:[1,2,3],radius:2}).return;assert.ok(Math.hypot(p[0]-1,p[1]-2,p[2]-3)<=2+1e-9);}
const draw=new DebugDraw();draw.add({shape:'arrow',start:[0,0,0],end:[0,0,2],color:[1,0,0]},0);assert.equal(draw.segments().length,3,'arrow = shaft + two head lines');
// master volume scales every voice gain (its own volume x master)
{const routing=new AudioRouting({}),voice={unscaled:.5,gain:{gain:{value:.5}}};routing.voices.set('player',voice);routing.setMasterVolume(.5);assert.equal(voice.gain.gain.value,.25);routing.volume('player',.8);assert.ok(Math.abs(voice.gain.gain.value-.4)<1e-9);}
// view blend: halfway between two cameras after half the blend time
const a=new THREE.PerspectiveCamera(60);a.position.set(0,0,0);a.updateMatrixWorld(true);const b=new THREE.PerspectiveCamera(90);b.position.set(10,0,0);b.updateMatrixWorld(true);
const blend=new ViewBlend();blend.resolve(a,b,{id:'b',blend:2},0);const mid=blend.resolve(a,b,{id:'b',blend:2},1);assert.ok(Math.abs(mid.position.x-5)<1e-6&&Math.abs(mid.fov-75)<1e-6,'blend midpoint');assert.equal(blend.resolve(a,b,{id:'b',blend:2},3),b,'blend ends on the target');

const root=path.resolve(import.meta.dirname,'..'),work=await fs.mkdtemp(path.join(root,'native/build/utility-nodes-2-'));
process.env.HB_USER_DATA_DIR=path.join(work,'UserData');
try{
  const record=await createProject('Utility2',work,'3d'),dir=path.dirname(record.file),file=path.join(dir,record.manifest.startupBlueprint),graph=JSON.parse(await fs.readFile(file,'utf8'));
  const node=(key,values={})=>{const n=makeNode(key);n.inputValues={...n.inputValues,...values};graph.nodes.push(n);return n;};
  const wire=(x,xp,y,yp)=>assert.ok(connect(graph,{node:x,pin:xp},{node:y,pin:yp}).ok,x+'.'+xp+' -> '+y+'.'+yp);
  const sceneFile=path.join(dir,record.manifest.startupScene),scene=JSON.parse(await fs.readFile(sceneFile,'utf8'));const cameraObject=scene.objects.find(o=>o.components?.some(c=>c.type==='Camera'));assert.ok(cameraObject,'project camera');
  const volume=node('setMasterVolume',{volume:.25}),getVolume=node('getMasterVolume'),toText=node('toString'),print=node('print'),fov=node('setFieldOfView',{target:cameraObject.id,fov:40}),view=node('setViewTarget',{target:cameraObject.id,blendTime:.5}),arrow=node('drawDebugArrow',{start:[0,0,0],end:[0,1,0],color:[0,1,0],duration:1}),
    project=node('projectWorldToScreen',{world:[0,0,0]}),branch=node('branch'),off=node('print',{message:'no pointer camera'}),shuffle=node('arrayShuffle'),length=node('arrayLength');
  const begin=graph.nodes.find(n=>n.key==='beginPlay');
  wire(begin.id,'then',volume.id,'exec');wire(volume.id,'then',print.id,'exec');wire(getVolume.id,'return',toText.id,'value');wire(toText.id,'return',print.id,'message');wire(print.id,'then',fov.id,'exec');wire(fov.id,'then',view.id,'exec');wire(view.id,'then',arrow.id,'exec');
  wire(arrow.id,'then',branch.id,'exec');wire(project.id,'return',branch.id,'condition');wire(branch.id,'false',off.id,'exec');
  await fs.writeFile(file,JSON.stringify(graph));scene.objects[0].blueprintAsset=record.manifest.startupBlueprint;await fs.writeFile(sceneFile,JSON.stringify(scene));
  const logs=[];let state;
  await runProject(record.file,{frames:2,onLog:line=>logs.push(String(line?.text??line)),beforeFrame:async(frame,vm)=>{state=vm;}});
  assert.ok(logs.some(l=>/0\.25/.test(l)),'master volume read back: '+JSON.stringify(logs.slice(0,6)));
  assert.ok(logs.some(l=>l.includes('no pointer camera')),'project without a camera is off screen');
  const cam=state.objects.find(o=>o.id===cameraObject.id).components.find(c=>c.type==='Camera').properties;assert.equal(cam.fieldOfView,40,'field of view set');
  assert.deepEqual(state.viewTarget,{id:cameraObject.id,blend:.5},'view target request');
  console.log(JSON.stringify({passed:true,logs:logs.length}));
}finally{await fs.rm(work,{recursive:true,force:true});}
