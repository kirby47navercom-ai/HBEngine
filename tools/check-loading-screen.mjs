// Loading screen: an Open Scene travel tells the platform host to show the loading cover before the next level is
// built and to hide it afterwards (also when nothing else happens in between).
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createAsset} from '../prototype/asset-documents.js';
import {connect,makeNode} from '../prototype/blueprint-model.js';
import {createPlacedObject} from '../prototype/placement-catalog.js';
import {createProject} from './project-manifest.mjs';
import {runProject} from './run-project.mjs';

const root=path.resolve(import.meta.dirname,'..'),work=await fs.mkdtemp(path.join(root,'native/build/loading-screen-'));
process.env.HB_USER_DATA_DIR=path.join(work,'UserData');
try{
  const record=await createProject('Loading',work,'3d'),dir=path.dirname(record.file);
  const graph=createAsset('blueprint','Traveler'),open=makeNode('openScene');open.inputValues={scene:'Assets/Scenes/Next.hbscene.json'};graph.nodes.push(open);
  assert.ok(connect(graph,{node:'beginPlay',pin:'then'},{node:open.id,pin:'exec'}).ok);
  await record.project.write('Assets/BP_Traveler.hbblueprint.json',JSON.stringify(graph));
  await record.project.write('Assets/Scenes/Next.hbscene.json',JSON.stringify(createAsset('scene','Next')));
  const startFile=path.join(dir,record.manifest.startupScene),start=JSON.parse(await fs.readFile(startFile,'utf8')),actor=createPlacedObject('cube',{id:'traveler'});actor.blueprintAsset='Assets/BP_Traveler.hbblueprint.json';start.objects.push(actor);await fs.writeFile(startFile,JSON.stringify(start));
  const calls=[];let scene='';
  await runProject(record.file,{frames:6,onLoading:(active,to)=>{calls.push([active,to]);},onFrame:(_f,vm)=>{scene=vm.hooks?.game?.state?.scene??scene;}});
  assert.deepEqual(calls,[[true,'Assets/Scenes/Next.hbscene.json'],[false,'Assets/Scenes/Next.hbscene.json']],'shown then hidden around the travel');
  console.log(JSON.stringify({passed:true,calls}));
}finally{await fs.rm(work,{recursive:true,force:true});}
