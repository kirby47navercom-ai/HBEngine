// Set Life Span: Begin Play gives the actor 0.5 s; it is still there at ~0.25 s and gone after ~0.5 s. A second actor gets
// 0.5 s and then 0 (cancel) and stays.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createAsset} from '../prototype/asset-documents.js';
import {connect,makeNode} from '../prototype/blueprint-model.js';
import {createPlacedObject} from '../prototype/placement-catalog.js';
import {createProject} from './project-manifest.mjs';
import {runProject} from './run-project.mjs';

const root=path.resolve(import.meta.dirname,'..'),work=await fs.mkdtemp(path.join(root,'native/build/life-span-'));
process.env.HB_USER_DATA_DIR=path.join(work,'UserData');
try{
  const record=await createProject('LifeSpan',work,'3d'),dir=path.dirname(record.file),scene=record.manifest.startupScene;
  const blueprint=async(name,values)=>{const graph=createAsset('blueprint',name);let from={node:'beginPlay',pin:'then'};for(const lifeSpan of values){const n=makeNode('setLifeSpan');n.inputValues={...n.inputValues,lifeSpan};graph.nodes.push(n);assert.ok(connect(graph,from,{node:n.id,pin:'exec'}).ok);from={node:n.id,pin:'then'};}await record.project.write('Assets/'+name+'.hbblueprint.json',JSON.stringify(graph));};
  await blueprint('BP_Short',[.5]);await blueprint('BP_Kept',[.5,0]);
  const file=path.join(dir,scene),data=JSON.parse(await fs.readFile(file,'utf8'));
  for(const [id,asset] of [['short','BP_Short'],['kept','BP_Kept']]){const actor=createPlacedObject('cube',{id});actor.blueprintAsset='Assets/'+asset+'.hbblueprint.json';data.objects.push(actor);}
  await fs.writeFile(file,JSON.stringify(data));
  const seen=[];
  await runProject(record.file,{frames:60,beforeFrame:async(frame,vm)=>{seen.push({time:vm.core.time,short:!!vm.objects.find(o=>o.id==='short'&&!o.destroying),kept:!!vm.objects.find(o=>o.id==='kept')});}});
  const before=seen.filter(s=>s.time>.1&&s.time<.4),after=seen.filter(s=>s.time>.6);
  assert.ok(before.length&&before.every(s=>s.short),'alive before its life span: '+JSON.stringify(seen.slice(0,4)));
  assert.ok(after.length&&after.every(s=>!s.short),'destroyed after its life span: '+JSON.stringify(after.slice(0,2)));
  assert.ok(seen.every(s=>s.kept),'life span 0 cancels');
  console.log(JSON.stringify({passed:true,frames:seen.length,destroyedBy:+(seen.find(s=>!s.short)?.time??-1).toFixed(3)}));
}finally{await fs.rm(work,{recursive:true,force:true});}
