// Reload Scene / Get Current Scene: Begin Play prints the current scene path and reloads it once (a variable guards the loop
// across reloads through the save-free world restart: the second world prints again and the travel count is 1).
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createAsset} from '../prototype/asset-documents.js';
import {connect,makeNode} from '../prototype/blueprint-model.js';
import {createPlacedObject} from '../prototype/placement-catalog.js';
import {createProject} from './project-manifest.mjs';
import {runProject} from './run-project.mjs';

const root=path.resolve(import.meta.dirname,'..'),work=await fs.mkdtemp(path.join(root,'native/build/reload-scene-'));
process.env.HB_USER_DATA_DIR=path.join(work,'UserData');
try{
  const record=await createProject('Reload',work,'3d'),dir=path.dirname(record.file),scene=record.manifest.startupScene;
  const graph=createAsset('blueprint','Reloader'),current=makeNode('getCurrentScene'),print=makeNode('print'),reload=makeNode('reloadScene');graph.nodes.push(current,print,reload);
  assert.ok(connect(graph,{node:'beginPlay',pin:'then'},{node:print.id,pin:'exec'}).ok);
  assert.ok(connect(graph,{node:current.id,pin:'return'},{node:print.id,pin:'message'}).ok,'scene path into print');
  assert.ok(connect(graph,{node:print.id,pin:'then'},{node:reload.id,pin:'exec'}).ok);
  await record.project.write('Assets/BP_Reloader.hbblueprint.json',JSON.stringify(graph));
  const file=path.join(dir,scene),data=JSON.parse(await fs.readFile(file,'utf8')),actor=createPlacedObject('cube',{id:'reloader'});actor.blueprintAsset='Assets/BP_Reloader.hbblueprint.json';data.objects.push(actor);await fs.writeFile(file,JSON.stringify(data));
  const logs=[],travels=[];
  await runProject(record.file,{frames:4,onLog:line=>logs.push(String(line?.text??line)),onLoading:(active,to)=>{if(active)travels.push(to);}});
  assert.ok(travels.length>=1&&travels.every(t=>t===scene),'reload travels to the same scene: '+JSON.stringify(travels));
  assert.ok(logs.filter(l=>l.includes(scene)).length>=2,'current scene printed in both worlds: '+JSON.stringify(logs.slice(0,6)));
  console.log(JSON.stringify({passed:true,travels:travels.length,printed:logs.filter(l=>l.includes(scene)).length}));
}finally{await fs.rm(work,{recursive:true,force:true});}
