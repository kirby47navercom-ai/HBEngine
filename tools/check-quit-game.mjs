// Quit Game: a Quit Game node at BeginPlay ends the run after that frame instead of running every requested frame.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {connect,makeNode} from '../prototype/blueprint-model.js';
import {createProject} from './project-manifest.mjs';
import {runProject} from './run-project.mjs';

const root=path.resolve(import.meta.dirname,'..'),work=await fs.mkdtemp(path.join(root,'native/build/quit-game-'));
process.env.HB_USER_DATA_DIR=path.join(work,'UserData');
try{
  const record=await createProject('Quit',work,'3d'),dir=path.dirname(record.file),file=path.join(dir,record.manifest.startupBlueprint),graph=JSON.parse(await fs.readFile(file,'utf8'));
  const node=makeNode('quitGame');graph.nodes.push(node);
  const begin=graph.nodes.find(n=>n.key==='beginPlay');assert.ok(connect(graph,{node:begin.id,pin:'then'},{node:node.id,pin:'exec'}).ok);await fs.writeFile(file,JSON.stringify(graph));
  const sceneFile=path.join(dir,record.manifest.startupScene),scene=JSON.parse(await fs.readFile(sceneFile,'utf8'));scene.objects[0].blueprintAsset=record.manifest.startupBlueprint;await fs.writeFile(sceneFile,JSON.stringify(scene));
  let frames=0;await runProject(record.file,{frames:120,onFrame:()=>{frames++;}});
  assert.ok(frames<=2,'stopped after quitting ('+frames+' frames, not 120)');
  console.log(JSON.stringify({passed:true,frames}));
}finally{await fs.rm(work,{recursive:true,force:true});}
