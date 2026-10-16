import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {engine169Fixture} from './engine-169-fixture.mjs';
import {runProject} from './run-project.mjs';
import {pruneTestArtifacts} from './test-artifacts.mjs';
const dir=await fs.mkdtemp(path.join(process.cwd(),'native/build/engine-169-runtime-'));
try{const {record}=await engine169Fixture(dir),state=await runProject(record.file,{frames:24,delta:1/60}),actor=state.objects.find(o=>o.id==='Director'),body=state.objects.find(o=>o.id==='IK').gameplayDebug.animationGraph.ik[0];assert.equal(actor.nativeProperties.blocked,true);assert.equal(actor.nativeProperties.opened,true);assert.equal(actor.nativeProperties.rejected,true);assert.ok(actor.nativeProperties.handError<.01);assert.equal(body.effectors.length,2);await fs.writeFile(path.join(dir,'acceptance.json'),JSON.stringify({passed:true,cpp:actor.nativeProperties,body,mode:state.mode},null,2));console.log('Engine169 actual C++/multi IK/navigation PASS: '+dir);}finally{await pruneTestArtifacts(dir);}
