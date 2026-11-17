// Editor play pause / frame step: a paused frame still reaches onFrame (the window keeps presenting)
// but runs no input, native frames or blueprint tick.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {batch165Fixture} from './batch-165-fixture.mjs';
import {runProject} from './run-project.mjs';
import {pruneTestArtifacts} from './test-artifacts.mjs';

const root=path.resolve(import.meta.dirname,'..'),dir=await fs.mkdtemp(path.join(root,'native/build/play-pause-'));
try{
  const {record}=await batch165Fixture(dir);
  let ticks=0,frames=0;
  await runProject(record.file,{frames:12,delta:1/60,
    beforeFrame:(frame,vm)=>{if(frame===0){const tick=vm.tick.bind(vm);vm.tick=step=>{ticks++;return tick(step);};}return {paused:frame>=3&&frame<10};},
    onFrame:()=>{frames++;}});
  assert.equal(frames,12,'paused frames are still presented');
  assert.equal(ticks,5,'paused frames do not tick the game');
  console.log(JSON.stringify({passed:true,frames,ticks}));
}finally{await fs.rm(dir,{recursive:true,force:true});await pruneTestArtifacts();}
