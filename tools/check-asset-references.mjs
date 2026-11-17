// Asset reference viewer: content.references lists the scene that uses a blueprint, and the blueprint's own uses.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';
import {createAsset} from '../prototype/asset-documents.js';
import {createPlacedObject} from '../prototype/placement-catalog.js';
import {createProject} from './project-manifest.mjs';

const root=path.resolve(import.meta.dirname,'..'),work=await fs.mkdtemp(path.join(root,'native/build/asset-refs-'));
const userData=path.join(work,'UserData'),env={...process.env,HB_USER_DATA_DIR:userData,HB_AI_BRIDGE:'0'};
const session=spawn(process.execPath,[path.join(root,'tools/native-editor-session.mjs')],{env,stdio:['pipe','pipe','inherit']});
const queue=[],waiters=[];readline.createInterface({input:session.stdout}).on('line',l=>waiters.length?waiters.shift()(l):queue.push(l));
const next=()=>queue.length?Promise.resolve(queue.shift()):new Promise(r=>waiters.push(r));
const editor=async(method,params={})=>{session.stdin.write(JSON.stringify({method,params})+'\n');for(;;){const p=JSON.parse(await next());if(p.channel)continue;if(!p.ok)throw Error(p.error);return p.value;}};
try{
  process.env.HB_USER_DATA_DIR=userData;const record=await createProject('Refs',work,'3d'),dir=path.dirname(record.file),bp='Assets/BP_Used.hbblueprint.json';
  await record.project.write(bp,JSON.stringify(createAsset('blueprint','Used')));
  const sceneFile=path.join(dir,record.manifest.startupScene),scene=JSON.parse(await fs.readFile(sceneFile,'utf8')),actor=createPlacedObject('cube',{id:'user'});actor.blueprintAsset=bp;scene.objects.push(actor);await fs.writeFile(sceneFile,JSON.stringify(scene));
  await editor('project.open',{file:record.file});
  const refs=await editor('content.references',{path:bp});
  assert.ok(refs.referencers.includes(record.manifest.startupScene),'scene listed as user: '+JSON.stringify(refs));
  const uses=await editor('content.references',{path:record.manifest.startupScene});
  assert.ok(uses.dependencies.some(d=>d.path===bp&&!d.missing),'scene lists blueprint as dependency');
  await assert.rejects(editor('content.references',{}),/에셋/);
  console.log(JSON.stringify({passed:true,referencers:refs.referencers.length,dependencies:uses.dependencies.length}));
}finally{session.stdin.end();await new Promise(r=>{session.once('exit',r);setTimeout(r,3000);});session.kill();await fs.rm(work,{recursive:true,force:true}).catch(()=>{});}
