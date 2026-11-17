// Gamepad rumble: the Play Gamepad Rumble node reaches the platform host with clamped motor values.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {connect,makeNode} from '../prototype/blueprint-model.js';
import {createProject} from './project-manifest.mjs';
import {runProject} from './run-project.mjs';

const root=path.resolve(import.meta.dirname,'..'),work=await fs.mkdtemp(path.join(root,'native/build/gamepad-rumble-'));
process.env.HB_USER_DATA_DIR=path.join(work,'UserData');
try{
  const record=await createProject('Rumble',work,'3d'),dir=path.dirname(record.file),file=path.join(dir,record.manifest.startupBlueprint),graph=JSON.parse(await fs.readFile(file,'utf8'));
  const node=makeNode('gamepadRumble');node.inputValues={player:1,low:2,high:.5,duration:.25};graph.nodes.push(node);
  const begin=graph.nodes.find(n=>n.key==='beginPlay');assert.ok(connect(graph,{node:begin.id,pin:'then'},{node:node.id,pin:'exec'}).ok);await fs.writeFile(file,JSON.stringify(graph));
  const sceneFile=path.join(dir,record.manifest.startupScene),scene=JSON.parse(await fs.readFile(sceneFile,'utf8'));scene.objects[0].blueprintAsset=record.manifest.startupBlueprint;await fs.writeFile(sceneFile,JSON.stringify(scene));
  const requests=[];await runProject(record.file,{frames:2,onRumble:s=>{requests.push(s);}});
  assert.deepEqual(requests,[{index:1,low:1,high:.5,duration:.25}],'motor values clamped to 0..1');
  console.log(JSON.stringify({passed:true,requests}));
}finally{await fs.rm(work,{recursive:true,force:true});}
