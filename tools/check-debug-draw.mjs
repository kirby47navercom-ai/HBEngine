// Debug draw: a Draw Debug Sphere node at BeginPlay puts coloured line segments into the game world for its duration;
// a zero-duration line lasts one frame. DebugDraw keeps only live shapes.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import * as THREE from 'three';
import {connect,makeNode} from '../prototype/blueprint-model.js';
import {DebugDraw} from '../prototype/debug-draw.js';
import {createProject} from './project-manifest.mjs';
import {runProject} from './run-project.mjs';

const draw=new DebugDraw(),world=new THREE.Scene();
draw.add({shape:'box',center:[0,0,0],extent:[1,1,1],duration:1},0);draw.add({shape:'line',start:[0,0,0],end:[1,0,0],duration:0},0);
assert.equal(draw.update(world,0),13,'box 12 edges + one line');assert.equal(draw.update(world,.5),12,'zero-duration line gone next frame');assert.equal(draw.update(world,2),0,'box expires');
draw.add({shape:'nope'},0);assert.equal(draw.shapes.length,0,'unknown shapes ignored');

const root=path.resolve(import.meta.dirname,'..'),work=await fs.mkdtemp(path.join(root,'native/build/debug-draw-'));
process.env.HB_USER_DATA_DIR=path.join(work,'UserData');
try{
  const record=await createProject('DebugDraw',work,'3d'),file=path.join(path.dirname(record.file),record.manifest.startupBlueprint),graph=JSON.parse(await fs.readFile(file,'utf8'));
  const node=makeNode('drawDebugSphere');node.inputValues={center:[0,1,0],radius:1,color:[0,1,0],duration:5};graph.nodes.push(node);
  const begin=graph.nodes.find(n=>n.key==='beginPlay')||(()=>{const b=makeNode('beginPlay');graph.nodes.push(b);return b;})();
  assert.ok(connect(graph,{node:begin.id,pin:'then'},{node:node.id,pin:'exec'}).ok);await fs.writeFile(file,JSON.stringify(graph));
  const sceneFile=path.join(path.dirname(record.file),record.manifest.startupScene),sceneData=JSON.parse(await fs.readFile(sceneFile,'utf8'));sceneData.objects[0].blueprintAsset=record.manifest.startupBlueprint;await fs.writeFile(sceneFile,JSON.stringify(sceneData));
  let segments=0,green=false;
  await runProject(record.file,{frames:3,onFrame:(_f,_vm,{world})=>{world.traverse(o=>{if(o.userData.debugDraw&&o.visible){segments=o.geometry.drawRange.count/2;green=o.geometry.getAttribute('color').getY(0)===1;}});}});
  assert.equal(segments,72,'sphere = 3 circles x 24 segments');assert.ok(green,'node colour used');
  console.log(JSON.stringify({passed:true,segments}));
}finally{await fs.rm(work,{recursive:true,force:true});}
