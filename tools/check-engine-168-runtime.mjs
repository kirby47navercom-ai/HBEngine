import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {engine168Fixture} from './engine-168-fixture.mjs';
import {runProject} from './run-project.mjs';
import {pruneTestArtifacts} from './test-artifacts.mjs';
const root=path.resolve(import.meta.dirname,'..'),dir=await fs.mkdtemp(path.join(root,'native/build/engine-168-runtime-'));
try{const {record}=await engine168Fixture(dir),samples=[];const state=await runProject(record.file,{frames:24,onFrame:async(frame,vm)=>{if([3,12,22].includes(frame)){const hit=await vm.hooks.operation('physicsRaycast',{start:[7.5,-7.5,0],end:[7.5,-7.4,0],dimension:2,mask:-1,includeTriggers:false,ignore:null},{self:'Director'},vm);samples.push({frame,hit:hit.return.hit,chunks:vm.object('Tilemap').gameplayDebug.tilemap});}}});const actor=state.objects.find(o=>o.id==='Director');assert.equal(actor.nativeProperties.inheritedY,3);assert.equal(actor.nativeProperties.before,0);assert.equal(actor.nativeProperties.after,-1);assert.deepEqual(samples.map(s=>s.hit),[false,true,false]);assert.ok(samples.every(s=>s.chunks.rebuiltCollisionChunks===1));assert.deepEqual(state.objects.find(o=>o.id==='PrefabRoot').scale,[2,3,1]);await fs.writeFile(path.join(dir,'acceptance.json'),JSON.stringify({passed:true,actor,samples},null,2));console.log('C++ tile chunks/physics/prefab inheritance PASS: '+dir);}catch(error){await fs.writeFile(path.join(dir,'failure.json'),JSON.stringify({error:error.stack},null,2));throw error;}finally{await pruneTestArtifacts(dir);}
