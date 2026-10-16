import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {runProject} from './run-project.mjs';
import {engine167Fixture} from './engine-167-fixture.mjs';
import {levelActorId} from '../prototype/level-streaming.js';
import {pruneTestArtifacts} from './test-artifacts.mjs';
const root=path.resolve(import.meta.dirname,'..'),dir=await fs.mkdtemp(path.join(root,'native/build/engine-167-runtime-'));
try{const {record}=await engine167Fixture(dir),samples=[];const report=await runProject(record.file,{frames:24,onFrame:async(frame,vm)=>{if([3,7,12,14,17].includes(frame)){const state=vm.hooks.game.state,actor=vm.object(levelActorId('Room','ChunkActor'));samples.push({frame,actor:actor&&structuredClone(actor),objects:vm.objects.length,streamingLevels:state.streamingLevels,chunkEnds:state.chunkEnds});}}});
 const director=report.objects.find(o=>o.id==='Director');assert.equal(director.nativeProperties.loaded,true);assert.equal(director.nativeProperties.gone,true);assert.equal(director.nativeProperties.reloaded,true);assert.equal(director.nativeProperties.worldX,12);
 assert.equal(samples[0].actor.nativeProperties.began,1);assert.equal(samples[0].actor.nativeProperties.initialX,12);assert.equal(samples[1].actor,undefined);assert.equal(samples[1].chunkEnds,1);assert.equal(samples[2].actor.nativeProperties.began,1);assert.equal(samples[2].objects,samples[0].objects);assert.equal(samples[3].streamingLevels[0].visible,false);assert.equal(samples[4].streamingLevels[0].visible,true);
 await fs.writeFile(path.join(dir,'acceptance.json'),JSON.stringify({passed:true,director,samples},null,2));console.log('C++/BP additive runtime PASS: '+dir);
}catch(error){await fs.writeFile(path.join(dir,'failure.json'),JSON.stringify({error:error.stack},null,2));throw error;}finally{await pruneTestArtifacts(dir);}
