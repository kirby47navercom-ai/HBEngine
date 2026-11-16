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
  console.log(JSON.stringify({passed:true,prefab:['apply','revert','refresh','unpack'],delete:{referenceWarning:true,trash:true},autosave:{restored:true,stale:'dropped'}}));
}finally{await pruneTestArtifacts(work);}
