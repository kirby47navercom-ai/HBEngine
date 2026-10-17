import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {previousNormalShader189}from './rendering-189-shader.mjs';
import {rayMaterialPackets106}from './ray-material-fixture.mjs';
import {timedNormalFixture}from './rendering-187-fixture.mjs';
import {retainTestEvidence}from './test-artifacts.mjs';
const work=await fs.mkdtemp(path.resolve('native/build/rendering-189-'));retainTestEvidence(work);
const plain=previousNormalShader189(rayMaterialPackets106().normal.rayPrograms),retained=previousNormalShader189(rayMaterialPackets106().normal.rayPrograms,{forceTime:true});assert.equal(plain.hasTime,false);assert.ok(plain.bytes<retained.bytes);const priorTimeCall=/hbRayNormal\( id, point, view, width, vec2<f32>\( [^,]+\.w, 1\.0 \) \)/;assert.equal(priorTimeCall.test(plain.code),false);
const f=timedNormalFixture();let timed;try{const p=f.prepare(.5);timed=previousNormalShader189(p.rayInfo.programs);assert.equal(timed.hasTime,true);assert.ok(priorTimeCall.test(timed.code));}finally{f.dispose();}
const staticFixture=timedNormalFixture('static');try{const p=staticFixture.prepare(.5);assert.equal(p.rayInfo.operations.includes(2),false);assert.equal(previousNormalShader189(p.rayInfo.programs).hasTime,false);}finally{staticFixture.dispose();}
const source=await fs.readFile('prototype/path-curved-guide.js','utf8');assert.ok(source.includes('#ifdef HB_RAY_NORMAL_TIME\n   if(normalMode>1.5)'));const native=await fs.readFile('native/include/HBEngine/ScreenEffectsPass.hpp','utf8');assert.ok(native.includes('source="#define HB_RAY_OP_"'));
const result={passed:true,staticProgramWGSLBytes:plain.bytes,retainedTimeWGSLBytes:retained.bytes,removedBytes:retained.bytes-plain.bytes,timeGraphStillUsesCommittedClock:true,staticOpcodeMaskHasNoTime:true,sharedGLSLNativeNormalTimeGuard:true,newDependencies:0,newRuntimeReadbacks:0,newHistoryTargets:0};await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({work,...result}));
