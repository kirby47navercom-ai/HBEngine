// Save slots: Begin Play saves "Alpha", checks Does Save Game Exist, prints Get Save Slot Names joined, deletes the
// slot with Delete Save Game and checks it is gone. Save JSON slots ("hbengine.savegame.json.*") never show up as Save Game slots.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createAsset} from '../prototype/asset-documents.js';
import {connect,makeNode} from '../prototype/blueprint-model.js';
import {createPlacedObject} from '../prototype/placement-catalog.js';
import {createProject} from './project-manifest.mjs';
import {runProject} from './run-project.mjs';

const root=path.resolve(import.meta.dirname,'..'),work=await fs.mkdtemp(path.join(root,'native/build/save-slots-'));
process.env.HB_USER_DATA_DIR=path.join(work,'UserData');
try{
  const record=await createProject('Slots',work,'3d'),dir=path.dirname(record.file),scene=record.manifest.startupScene;
  const graph=createAsset('blueprint','Slots'),node=(key,values={})=>{const n=makeNode(key);n.inputValues={...n.inputValues,...values};graph.nodes.push(n);return n;};
  const save=node('saveGame',{slot:'Alpha'}),exists=node('doesSaveGameExist',{slot:'Alpha'}),branch=node('branch'),yes=node('print',{message:'exists'});
  const names=node('getSaveSlotNames'),first=node('joinStrings',{separator:','}),printName=node('print'),remove=node('deleteSaveGame',{slot:'Alpha'});
  const gone=node('doesSaveGameExist',{slot:'Alpha'}),branch2=node('branch'),no=node('print',{message:'gone'});
  const wire=(a,ap,b,bp)=>assert.ok(connect(graph,{node:a,pin:ap},{node:b,pin:bp}).ok,a+'.'+ap+' -> '+b+'.'+bp);
  wire('beginPlay','then',save.id,'exec');wire(save.id,'then',branch.id,'exec');wire(exists.id,'return',branch.id,'condition');wire(branch.id,'true',yes.id,'exec');
  wire(names.id,'return',first.id,'values');wire(first.id,'return',printName.id,'message');wire(yes.id,'then',printName.id,'exec');
  wire(printName.id,'then',remove.id,'exec');wire(remove.id,'then',branch2.id,'exec');wire(gone.id,'return',branch2.id,'condition');wire(branch2.id,'false',no.id,'exec');
  await record.project.write('Assets/BP_Slots.hbblueprint.json',JSON.stringify(graph));
  const file=path.join(dir,scene),data=JSON.parse(await fs.readFile(file,'utf8')),actor=createPlacedObject('cube',{id:'slots'});actor.blueprintAsset='Assets/BP_Slots.hbblueprint.json';data.objects.push(actor);await fs.writeFile(file,JSON.stringify(data));
  const values=new Map([['hbengine.savegame.json.Other','1']]),storageAdapter={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k),keys:()=>[...values.keys()]};
  const logs=[];
  await runProject(record.file,{frames:2,storageAdapter,onLog:line=>logs.push(String(line?.text??line))});
  const printed=logs.filter(l=>['exists','Alpha','gone'].some(t=>l.includes(t)));
  assert.deepEqual(printed.map(l=>['exists','Alpha','gone'].find(t=>l.includes(t))),['exists','Alpha','gone'],'save slot flow: '+JSON.stringify(logs.slice(0,8)));
  assert.ok(![...values.keys()].some(k=>k.includes('savegame.Alpha'))&&values.has('hbengine.savegame.json.Other'),'deleted slot only: '+JSON.stringify([...values.keys()]));
  assert.ok(!printed[1].includes('Other')&&!printed[1].includes('json'),'Save JSON slots stay out of the list: '+printed[1]);
  console.log(JSON.stringify({passed:true,printed}));
}finally{await fs.rm(work,{recursive:true,force:true});}
