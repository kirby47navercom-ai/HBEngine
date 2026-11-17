// Project settings: project.settings creates one project game config, the manifest points at it,
// and scenes without their own game config play with its values.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {nativeEditorSession} from './native-editor-session.mjs';
import {createProject,readProjectManifest} from './project-manifest.mjs';
import {runProject} from './run-project.mjs';
import {pruneTestArtifacts} from './test-artifacts.mjs';

const root=path.resolve(import.meta.dirname,'..'),work=await fs.mkdtemp(path.join(root,'native/build/project-settings-'));
process.env.HB_USER_DATA_DIR=path.join(work,'UserData');
try{
  const record=await createProject('Settings',work,'3d');
  const session=nativeEditorSession(null);
  await session('project.open',{file:record.file});
  const {path:config}=await session('project.settings',{});
  assert.equal(config,'Assets/Settings/GS_Project.hbgameconfig.json');
  assert.equal((await readProjectManifest(record.file)).manifest.gameConfig,config,'manifest points at the project settings');
  assert.deepEqual(await session('project.settings',{}),{path:config},'second open reuses the asset');
  const file=path.join(path.dirname(record.file),config),data=JSON.parse(await fs.readFile(file,'utf8'));
  data.gravity=[0,-2,0];await fs.writeFile(file,JSON.stringify(data));
  let gravity;
  await runProject(record.file,{frames:1,onFrame:(_f,_vm,{prepared})=>{gravity=prepared.physicsOptions.gravity;}});
  assert.deepEqual(gravity,[0,-2,0],'scene without its own game config uses the project settings');
  console.log(JSON.stringify({passed:true,config,gravity}));
}finally{await fs.rm(work,{recursive:true,force:true});await pruneTestArtifacts();}
