import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import * as T from 'three';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
import {ProjectService,assetKind} from './project-service.mjs';
import {AssetDocuments,validAsset} from '../prototype/asset-documents.js';
import {remapModelOverrides,applyModelImportTransform,tagModelSubassets} from '../prototype/model-import.js';
import {applyModelOverrides} from '../prototype/model-subasset-overrides.js';
import {loadHeadlessModel,disposeHeadlessModel} from './headless-model.mjs';
import {AnimationGraphPlayer} from '../prototype/animation-graph-runtime.js';
import {createAnimationGraph,makeAnimationNode} from '../prototype/animation-graph-assets.js';
import {modelSubassetReport} from './model-subassets.mjs';
import {importModelFixture,realMeshFBX} from './engine-178-fixture.mjs';
import {retainTestEvidence} from './test-artifacts.mjs';
const work=await fs.mkdtemp(path.resolve('native/build/model-import-'));retainTestEvidence(work);const checks=[];
async function check(name,fn){try{await fn();checks.push({name,passed:true});}catch(error){checks.push({name,passed:false,error:error.stack});process.exitCode=1;}}
const project=await new ProjectService(path.join(work,'Project')).init();await project.mkdir('Assets');
let prepared,source='Assets/Import.gltf';
await check('new imports create a typed sidecar and preserve edits on forced reimport',async()=>{
 await project.import('Assets','Import.gltf',Buffer.from(JSON.stringify(importModelFixture())));prepared=await project.prepareModelImport(source);assert.equal(assetKind(prepared.path),'modelimport');assert.ok(validAsset('modelimport',prepared.data));assert.equal(prepared.data.settings.convertUnits,true);
 const data=prepared.data;data.settings.scale=.01;data.settings.sourceUp='x';data.subassets[1].overrides.visible=false;await project.write(prepared.path,JSON.stringify(data));await project.reimport([source]);const saved=JSON.parse(await fs.readFile((await project.read(prepared.path)).file));assert.equal(saved.settings.scale,.01);assert.equal(saved.subassets[1].overrides.visible,false);assert.equal(saved.sourceId,project.index[source].id);
});
await check('normal JSON documents retain revision CAS and reject stale saves',async()=>{
 const data=JSON.parse(await fs.readFile((await project.read(prepared.path)).file)),docs=new AssetDocuments(),doc=docs.open(prepared.path,'modelimport',data);doc.data.settings.scale=.02;await docs.save(doc,(p,text,expected)=>project.checkedWrite(p,text,expected));assert.equal(doc.dirty,false);
 const external=structuredClone(doc.data);external.settings.scale=.03;await project.write(prepared.path,JSON.stringify(external));doc.data.settings.scale=.04;await assert.rejects(docs.save(doc,(p,text,expected)=>project.checkedWrite(p,text,expected)),{status:409});assert.equal(JSON.parse(await fs.readFile((await project.read(prepared.path)).file)).settings.scale,.03);
 const wrong=structuredClone(external);wrong.source='Assets/Other.gltf';await assert.rejects(project.write(prepared.path,JSON.stringify(wrong)),/원본 모델 경로/);assert.equal(JSON.parse(await fs.readFile((await project.read(prepared.path)).file)).source,source);await assert.rejects(project.checkedBatch([{path:prepared.path,text:JSON.stringify(wrong),expected:JSON.stringify(external)}]),/원본 모델 경로/);
});
await check('ambiguous edits remain unresolved until an explicit reversible remap',async()=>{
 const original=JSON.parse(await fs.readFile((await project.read(source)).file));original.extras={revision:2};await project.write(source,JSON.stringify(original));await project.reimport([source]);const data=JSON.parse(await fs.readFile((await project.read(prepared.path)).file));assert.equal(data.unresolvedSubassets.length,1);assert.equal(data.subassets[1].overrides.visible,undefined);
 const next=remapModelOverrides(data,data.unresolvedSubassets[0].id,data.subassets[0].id);assert.equal(next.subassets[0].overrides.visible,false);assert.equal(next.unresolvedSubassets.length,0);assert.equal(data.unresolvedSubassets.length,1);await project.write(prepared.path,JSON.stringify(next));
});
await check('source rename moves sidecar, preserves identity and redirects both paths',async()=>{
 const data=JSON.parse(await fs.readFile((await project.read(prepared.path)).file)),docs=new AssetDocuments();docs.open(prepared.path,'modelimport',data);await project.rename(source,'Assets/Renamed.gltf');docs.rename(source,'Assets/Renamed.gltf');assert.ok(docs.items.has('Assets/Renamed.gltf.import.json'));
 assert.equal((await project.read(source)).file,(await project.read('Assets/Renamed.gltf')).file);assert.equal((await project.read(prepared.path)).file,(await project.read('Assets/Renamed.gltf.import.json')).file);assert.equal((await project.prepareModelImport('Assets/Renamed.gltf')).data.sourceId,data.sourceId);await project.rename('Assets/Renamed.gltf',source);
});
await check('paired rename conflict and redirect failure restore both files',async()=>{
 await project.write('Assets/Taken.gltf.import.json',JSON.stringify({...prepared.data,source:'Assets/Taken.gltf'}));await assert.rejects(project.rename(source,'Assets/Taken.gltf'),/이미/);assert.ok(await project.read(source));await fs.unlink((await project.read('Assets/Taken.gltf.import.json')).file);
 const failing=await new ProjectService(path.join(work,'Rollback')).init();await failing.mkdir('Assets');await failing.import('Assets','A.gltf',Buffer.from(JSON.stringify(importModelFixture())));await fs.mkdir(path.join(failing.root,'.hbredirects.json'));await assert.rejects(failing.rename('Assets/A.gltf','Assets/B.gltf'));assert.ok(await failing.read('Assets/A.gltf'));assert.ok(await failing.read('Assets/A.gltf.import.json'));await assert.rejects(failing.read('Assets/B.gltf'),{code:'ENOENT'});
});
await check('malformed import metadata is never overwritten by reimport',async()=>{
 const file=(await project.read(prepared.path)).file,original=await fs.readFile(file);await fs.writeFile(file,'{bad metadata');await assert.rejects(project.reimport([source]),/JSON|검증|Unexpected/);assert.equal(await fs.readFile(file,'utf8'),'{bad metadata');await fs.writeFile(file,original);
});
await check('real FBX loader meshes use FBX IDs and file units',async()=>{
 const buffer=realMeshFBX.buffer.slice(realMeshFBX.byteOffset,realMeshFBX.byteOffset+realMeshFBX.byteLength),object=new FBXLoader().parse(buffer,''),report=modelSubassetReport(realMeshFBX,'Twin.fbx','fbx');tagModelSubassets(object,{format:'fbx'});report.rows.find(row=>row.sourceObjectId==='1002').overrides.visible=false;applyModelOverrides(object,report.rows,{trustedIndices:true});const meshes=[];object.traverse(o=>{if(o.isMesh)meshes.push(o);});assert.equal(meshes.length,2);assert.equal(meshes.find(o=>o.ID===1001).visible,true);assert.equal(meshes.find(o=>o.ID===1002).visible,false);
 const data={version:2,source:'Assets/Twin.fbx',settings:{scale:1,convertUnits:true,sourceUnit:'auto',sourceUp:'loader',flipForward:false,translation:[0,0,0],rotation:[0,0,0]},subassets:report.rows},result=applyModelImportTransform({object,animations:[]},data,{format:'fbx'});assert.ok(Math.abs(new T.Box3().setFromObject(result.object).getSize(new T.Vector3()).x-1)<1e-6);const resources=new Set();object.traverse(o=>{if(o.geometry)resources.add(o.geometry);if(o.material)resources.add(o.material);});for(const resource of resources)resource.dispose();
});
await check('headless animation root motion includes import unit and up-axis conversion',async()=>{
 const data=(await project.prepareModelImport(source)).data;data.settings.scale=.01;data.settings.sourceUp='x';await project.write(prepared.path,JSON.stringify(data));const loaded=await loadHeadlessModel(project,source),group=new T.Group();group.add(loaded.object);group.userData.animations=loaded.animations;const graph=createAnimationGraph('Imported'),clip=makeAnimationNode('clip');clip.properties.clip='ImportedMove';clip.properties.loop=false;clip.properties.rootMotion={enabled:true,bone:'Mover',lock:'first',forceLock:false};graph.nodes=[clip,graph.nodes.find(n=>n.type==='output')];graph.nodes[1].inputs.pose=clip.id;graph.rootMotionMode='all';const actor={id:'Actor',position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]},player=await AnimationGraphPlayer.load(graph,{object:actor,group,asset:async()=>null});try{await player.tick(.5);assert.ok(Math.abs(player.lastRootMotion[0])<1e-6);assert.ok(Math.abs(player.lastRootMotion[1]-.5)<1e-6);assert.ok(Math.abs(player.lastRootMotion[2])<1e-6);assert.deepEqual(actor.position,[0,0,0]);}finally{player.dispose();disposeHeadlessModel(loaded.object);}
 await project.write(source,JSON.stringify({...importModelFixture(),extras:{stale:true}}));await assert.rejects(loadHeadlessModel(project,source),/원본이 변경/);
});
const result={passed:checks.filter(c=>c.passed).length,total:checks.length,checks};await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({work,...result}));
