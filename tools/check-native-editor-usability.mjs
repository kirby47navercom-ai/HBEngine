// Native editor session usability: asset delete to trash with reference warning, autosave recovery after a restart,
// and prefab instance apply / revert / refresh / unpack. Runs on a temporary project and profile.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createAsset} from '../prototype/asset-documents.js';
import {nativeEditorSession} from './native-editor-session.mjs';
import {createProject} from './project-manifest.mjs';
import {pruneTestArtifacts,retainTestEvidence} from './test-artifacts.mjs';

const root=path.resolve(import.meta.dirname,'..');
const work=await fs.mkdtemp(path.join(root,'native/build/native-usability-'));
retainTestEvidence(work);
process.env.HB_USER_DATA_DIR=path.join(work,'UserData');
process.env.HB_EDITOR_TRASH_DIR=path.join(work,'Trash');
try{
  const record=await createProject('Usability',work,'3d'),projectFile=record.file??path.join(record.project.root,'project.hbproject');
  const prefabFile='Assets/PF_Box.hbprefab.json',looseFile='Assets/Loose.hbprefab.json';
  await record.project.write(prefabFile,JSON.stringify(createAsset('prefab','Box')));
  await record.project.write(looseFile,JSON.stringify(createAsset('prefab','Loose')));
  const manifestFile=(await fs.readdir(work,{recursive:true})).map(f=>path.join(work,f)).find(f=>f.endsWith('.hbproject'));
  let session=nativeEditorSession(null);
  const opened=await session('project.open',{file:manifestFile});
  const scene=opened.startupScene;
  let doc=await session('document.open',{path:scene});

  // Prefab: place, override scale, revert, override again, apply, refresh, unpack.
  doc=await session('scene.edit',{action:'placeAsset',asset:prefabFile,position:[1,0,0],expectedRevision:doc.revision});
  const instance=doc.selection;
  assert.equal((await session('scene.hierarchy',{})).find(r=>r.id===instance)?.prefab,true,'outliner marks prefab instances');
  const rootOf=async()=>JSON.parse((await session('document.read',{path:scene})).text).objects.find(o=>o.id===instance);
  doc=await session('scene.edit',{action:'scale',id:instance,axis:0,value:2,expectedRevision:doc.revision});
  assert.equal((await rootOf()).scale[0],2);
  doc=await session('scene.edit',{action:'prefabRevert',id:instance,expectedRevision:doc.revision});
  assert.equal((await rootOf()).scale[0],1,'revert restores the prefab value');
  doc=await session('scene.edit',{action:'scale',id:instance,axis:1,value:3,expectedRevision:doc.revision});
  doc=await session('scene.edit',{action:'prefabApply',id:instance,expectedRevision:doc.revision});
  const prefabDoc=await session('document.read',{path:prefabFile});
  assert.equal(prefabDoc.dirty,true,'apply edits the prefab document');
  assert.equal(JSON.parse(prefabDoc.text).objects[0].scale[1],3,'apply writes the override into the prefab');
  assert.equal((await rootOf()).prefabLink.overrides.length,0,'apply clears the instance overrides');
  await session('document.save',{path:prefabFile,expectedRevision:prefabDoc.revision});
  doc=await session('document.read',{path:scene});
  doc=await session('scene.edit',{action:'prefabRefresh',id:instance,expectedRevision:doc.revision});
  assert.equal((await rootOf()).scale[1],3);
  doc=await session('editor.undo',{path:scene,expectedRevision:doc.revision});
  doc=await session('editor.redo',{path:scene,expectedRevision:doc.revision});
  doc=await session('scene.edit',{action:'prefabUnpack',id:instance,expectedRevision:doc.revision});
  assert.equal((await rootOf()).prefabLink,undefined,'unpack removes the prefab link');
  doc=await session('editor.undo',{path:scene,expectedRevision:doc.revision});
  assert.ok((await rootOf()).prefabLink,'unpack is undoable');

  // Delete: referenced assets report their users first; open documents and non-empty folders are refused.
  doc=await session('document.save',{path:scene,expectedRevision:doc.revision});
  await assert.rejects(session('content.delete',{path:prefabFile}),/문서를 먼저 닫으세요/);
  await session('document.close',{path:prefabFile});
  const warned=await session('content.delete',{path:prefabFile});
  assert.equal(warned.deleted,false);assert.deepEqual(warned.referencers,[scene]);
  const loose=await session('content.delete',{path:looseFile});
  assert.equal(loose.deleted,true);
  await assert.rejects(fs.access(path.join(record.project.root,looseFile)));
  assert.equal((await fs.readdir(process.env.HB_EDITOR_TRASH_DIR)).length,1,'deleted file is kept in the trash');
  await assert.rejects(session('content.delete',{path:'Assets'}),/삭제할 프로젝트 에셋/);
  await assert.rejects(session('content.delete',{path:'Assets/../project.hbproject'}),/삭제할 프로젝트 에셋/);

  // Autosave: an unsaved edit survives a restart and comes back dirty; saving removes the copy.
  doc=await session('scene.edit',{action:'add',key:(await session('scene.catalog')).placements[0].id,expectedRevision:doc.revision});
  const unsaved=JSON.parse(doc.text).objects.length;
  assert.equal((await session('editor.autosave')).written,1);
  session=nativeEditorSession(null);
  await session('project.open',{file:manifestFile});
  const offered=await session('editor.autosaves');
  assert.deepEqual(offered.map(r=>r.path),[scene]);
  const restored=await session('editor.restoreAutosave',{path:scene});
  assert.equal(restored.dirty,true);assert.equal(JSON.parse(restored.text).objects.length,unsaved);
  assert.deepEqual(await session('editor.autosaves'),[],'restored copy is consumed');
  await session('editor.autosave');
  await session('document.save',{path:scene,expectedRevision:restored.revision});
  assert.deepEqual(await session('editor.autosaves'),[],'save removes the autosave');
  // A copy taken from an older file version is not offered.
  doc=await session('document.read',{path:scene});
  await session('scene.edit',{action:'add',key:(await session('scene.catalog')).placements[0].id,expectedRevision:doc.revision});
  await session('editor.autosave');
  await record.project.write(scene,JSON.stringify({...JSON.parse((await session('document.read',{path:scene})).text),objects:[]}));
  assert.deepEqual(await session('editor.autosaves'),[],'stale autosave is dropped');
  // Editing basics: multi-selection, copy/paste, snap, hierarchy search, asset move.
  // The stale-autosave step edited the project outside this session; reopen it like the editor would.
  await session('document.close',{path:scene,discard:true});
  session=nativeEditorSession(null);await session('project.open',{file:manifestFile});
  await session('editor.discardAutosave',{path:scene});
  doc=await session('document.open',{path:scene});
  const key=(await session('scene.catalog')).placements[0].id;
  doc=await session('scene.edit',{action:'add',key,expectedRevision:doc.revision});const a=doc.selection;
  doc=await session('scene.edit',{action:'add',key,expectedRevision:doc.revision});const b=doc.selection;
  const objects=()=>JSON.parse(doc.text).objects,find=id=>objects().find(o=>o.id===id);
  const before=objects().length;
  doc=await session('scene.edit',{action:'duplicate',id:a,ids:[a,b],expectedRevision:doc.revision});
  assert.equal(objects().length,before+2,'duplicate copies every selected object');assert.equal(doc.selections.length,2);
  const copies=doc.selections;
  doc=await session('scene.edit',{action:'translate',id:a,ids:[a,b],delta:[0.37,0,0],snap:{grid:0.5,angle:15},expectedRevision:doc.revision});
  for(const id of [a,b])assert.equal(find(id).position[0]%0.5,0,'translate snaps to the grid');
  doc=await session('scene.edit',{action:'rotate',id:a,axis:1,value:0.2,snap:{grid:0.5,angle:15},expectedRevision:doc.revision});
  assert.equal(Math.round(find(a).rotation[1]*1e6)%15e6,0,'rotate snaps to the angle step');
  const clipboard=(await session('scene.copy',{path:scene,ids:[a,b]})).objects;
  doc=await session('scene.edit',{action:'paste',clipboard,expectedRevision:doc.revision});
  assert.equal(objects().length,before+4,'paste adds the copied objects');assert.equal(doc.selections.length,2);
  doc=await session('scene.edit',{action:'delete',id:copies[0],ids:copies,expectedRevision:doc.revision});
  assert.equal(objects().length,before+2,'delete removes every selected object');
  doc=await session('editor.undo',{path:scene,expectedRevision:doc.revision});
  assert.equal(objects().length,before+4,'multi delete is undoable');
  // Outliner/viewport context menu actions: rename (F2) and detach from parent.
  doc=await session('scene.edit',{action:'rename',id:a,value:'  Renamed Box  ',expectedRevision:doc.revision});
  assert.equal(find(a).name,'Renamed Box');
  await assert.rejects(session('scene.edit',{action:'rename',id:a,value:'   ',expectedRevision:doc.revision}),/이름을 확인/);
  doc=await session('scene.edit',{action:'reparent',id:b,target:a,expectedRevision:doc.revision});assert.equal(find(b).parent,a);
  doc=await session('scene.edit',{action:'reparent',id:b,target:'',expectedRevision:doc.revision});assert.equal(find(b).parent,undefined,'detach from parent');
  // Details component list: add then remove; new basic blocks pivot on their centre at the requested spot.
  doc=await session('scene.edit',{action:'component',id:a,key:'AudioSource',expectedRevision:doc.revision});
  const audio=find(a).components.find(c=>c.type==='AudioSource');assert.ok(audio);
  doc=await session('scene.edit',{action:'removeComponent',id:a,key:audio.id,expectedRevision:doc.revision});
  assert.ok(!find(a).components.some(c=>c.type==='AudioSource'),'component removed');
  await assert.rejects(session('scene.edit',{action:'removeComponent',id:a,key:'missing',expectedRevision:doc.revision}),/제거할 컴포넌트/);
  // Component order, reset, paste values and paste as a new component.
  doc=await session('scene.edit',{action:'component',id:a,key:'AudioSource',expectedRevision:doc.revision});
  doc=await session('scene.edit',{action:'component',id:a,key:'PointLight',expectedRevision:doc.revision});
  const order=()=>find(a).components.map(c=>c.type).filter(t=>t==='AudioSource'||t==='PointLight');
  const sound=find(a).components.find(c=>c.type==='AudioSource');
  doc=await session('scene.edit',{action:'moveComponent',id:a,key:sound.id,value:1,expectedRevision:doc.revision});assert.deepEqual(order(),['PointLight','AudioSource'],'component moved down');
  const tuned=find(a).components.find(c=>c.type==='AudioSource'),defaults=structuredClone(tuned.properties),volumeKey=Object.keys(defaults).find(k=>typeof defaults[k]==='number');assert.ok(volumeKey);
  const copied={type:'AudioSource',properties:{...defaults,[volumeKey]:defaults[volumeKey]?defaults[volumeKey]/2:0.5}};
  doc=await session('scene.edit',{action:'pasteComponentValues',id:a,key:tuned.id,value:copied,expectedRevision:doc.revision});assert.equal(find(a).components.find(c=>c.id===tuned.id).properties[volumeKey],copied.properties[volumeKey]);
  doc=await session('scene.edit',{action:'resetComponent',id:a,key:tuned.id,expectedRevision:doc.revision});assert.deepEqual(find(a).components.find(c=>c.id===tuned.id).properties,defaults,'reset to defaults');
  await assert.rejects(session('scene.edit',{action:'pasteComponentValues',id:a,key:tuned.id,value:{type:'PointLight',properties:{}},expectedRevision:doc.revision}),/같은 종류/);
  const copiedLight={type:'PointLight',properties:{...find(a).components.find(c=>c.type==='PointLight').properties}};
  doc=await session('scene.edit',{action:'pasteComponent',id:a,value:copiedLight,expectedRevision:doc.revision});assert.equal(find(a).components.filter(c=>c.type==='PointLight').length,2,'component pasted');
  for(const c of find(a).components.filter(c=>c.type==='AudioSource'||c.type==='PointLight'))doc=await session('scene.edit',{action:'removeComponent',id:a,key:c.id,expectedRevision:doc.revision});
  doc=await session('scene.edit',{action:'add',key:'cube',position:[2,1,3],expectedRevision:doc.revision});
  assert.deepEqual(find(doc.selection).position,[2,1,3]);assert.equal(find(doc.selection).pivot,'center');
  // Undo history panel rows and jumping; world-space rotation; pilot pose applied as a world transform.
  const history=await session('editor.history',{path:scene});assert.ok(history.rows.length>3&&history.rows.at(-1).current,'history lists edits with the live state last');
  const back=await session('editor.historyJump',{path:scene,steps:-2,expectedRevision:doc.revision});assert.equal((await session('editor.history',{path:scene})).redo,2);
  doc=await session('editor.historyJump',{path:scene,steps:2,expectedRevision:back.revision});
  doc=await session('scene.edit',{action:'rotate',id:a,axis:1,value:Math.PI/2,space:'world',expectedRevision:doc.revision});assert.ok(Math.abs(Math.abs(find(a).rotation[1])-90)<1e-6||Math.abs(find(a).rotation[0])>1e-6,'world rotation applied');
  doc=await session('scene.edit',{action:'setWorldTransform',id:a,position:[3,2,1],rotation:[0,45,0],expectedRevision:doc.revision});
  assert.deepEqual(find(a).position.map(v=>Math.round(v*1e6)/1e6),[3,2,1]);assert.ok(Math.abs(find(a).rotation[1]-45)<1e-6);
  const named=find(a).name,rows=await session('scene.hierarchy',{query:'"'+named+'"'});
  assert.ok(rows.find(r=>r.id===a).match);
  assert.ok((await session('scene.hierarchy',{query:'no-such-object-name'})).every(r=>r.match===false),'search hides non-matching rows');
  assert.ok((await session('scene.hierarchy')).every(r=>r.match===undefined),'no query means no filter');
  await session('content.mkdir',{folder:'Assets',name:'Moved'});
  // The referenced prefab moves; the scene keeps resolving it through the rename redirect.
  const moved=await session('content.move',{path:prefabFile,folder:'Assets/Moved'});
  assert.equal(moved.path,'Assets/Moved/PF_Box.hbprefab.json');
  await fs.access(path.join(record.project.root,moved.path));
  await assert.rejects(fs.access(path.join(record.project.root,prefabFile)));
  doc=await session('scene.edit',{action:'placeAsset',asset:prefabFile,position:[0,0,3],expectedRevision:doc.revision});
  assert.ok(find(doc.selection).prefabLink,'old prefab path still places through the redirect');
  await assert.rejects(session('content.move',{path:'Assets/Moved',folder:'Assets/Moved'}),/자기 안으로|같은/);
  await assert.rejects(session('content.move',{path:moved.path,folder:'Assets/Missing'}),/대상 폴더가 없어요/);
  console.log(JSON.stringify({passed:true,prefab:['apply','revert','refresh','unpack'],delete:{referenceWarning:true,trash:true},autosave:{restored:true,stale:'dropped'},basics:{multiSelect:true,copyPaste:true,snap:true,search:true,move:true}}));
}finally{await pruneTestArtifacts(work);}
