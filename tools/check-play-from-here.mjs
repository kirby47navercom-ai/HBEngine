// Play from here: a spawn override in the editor play manifest puts the spawned player pawn there instead of the
// PlayerStart / configured spawn position; without it the normal spawn is kept.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createProject,readProjectManifest} from './project-manifest.mjs';
import {runProject} from './run-project.mjs';

const root=path.resolve(import.meta.dirname,'..'),work=await fs.mkdtemp(path.join(root,'native/build/play-from-here-'));
process.env.HB_USER_DATA_DIR=path.join(work,'UserData');
try{
  const record=await createProject('PlayHere',work,'3d');
  const pawnAt=async spawn=>{let at=null;await runProject(record.file,{frames:1,openProject:async file=>{const r=await readProjectManifest(file);if(spawn)r.manifest={...r.manifest,spawnOverride:spawn};return r;},onFrame:(_f,vm)=>{at??=vm.objects.find(o=>o.frameworkRole==='pawn')?.position?.slice()??null;}});return at;};
  const normal=await pawnAt(null),here=await pawnAt([5,3,-2]);
  assert.ok(Array.isArray(normal),'the template spawns a pawn');
  assert.deepEqual(here.map(v=>Math.round(v*100)/100),[5,3,-2],'pawn spawns at the editor camera');assert.notDeepEqual(normal,here);
  console.log(JSON.stringify({passed:true,normal,here}));
}finally{await fs.rm(work,{recursive:true,force:true});}
