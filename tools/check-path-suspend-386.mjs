import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {PerspectiveCamera,Scene} from 'three';
import {ScreenFrameState} from '../prototype/screen-effects.js';
import {ProgressivePathState} from '../prototype/path-tracing.js';

const camera=new PerspectiveCamera(60,16/9,.1,100),scene=new Scene(),state=new ScreenFrameState(),path=new ProgressivePathState(),world={builds:1,environmentBuilds:1};
camera.position.z=1;camera.updateMatrixWorld();
const p={pathTracingEnabled:true,pathTracingSamples:64,pathTracingSamplesPerFrame:4,historyVersion:0};
let frame=state.begin(camera,p,1280,720,1,scene);path.prepare(frame.packed,world,frame.pathReset);path.samples=64;frame.end();
const committed={time:state.time,previous:state.previous.toArray(),position:state.position.toArray(),projection:camera.projectionMatrix.toArray()};
for(let i=0;i<40;i++){
 frame=state.begin(camera,{...p,pathTracingDenoise:true},1280,720,1.1+i/60,scene);path.prepare(frame.packed,world,frame.pathReset);assert.equal(path.samples,64);frame.suspend();
 assert.equal(state.valid,true);assert.equal(state.time,committed.time);assert.deepEqual(state.previous.toArray(),committed.previous);assert.deepEqual(camera.projectionMatrix.toArray(),committed.projection);
}
frame=state.begin(camera,p,1280,720,2,scene);path.prepare(frame.packed,world,frame.pathReset);assert.equal(path.samples,64);frame.end();
camera.position.x=1;camera.updateMatrixWorld();frame=state.begin(camera,p,1280,720,2.1,scene);path.prepare(frame.packed,world,frame.pathReset);assert.equal(path.samples,0);frame.end();
path.samples=64;frame=state.begin(camera,p,1280,720,2.2,scene);frame.end(false);frame=state.begin(camera,p,1280,720,2.3,scene);path.prepare(frame.packed,world,frame.pathReset);assert.equal(path.samples,0);frame.end();
path.samples=64;frame=state.begin(camera,{...p,historyVersion:1},1280,720,2.4,scene);path.prepare(frame.packed,world,frame.pathReset);assert.equal(path.samples,0);frame.end();
const jitter=state.begin(camera,{antiAliasing:'taa',aaStrength:1},1280,720,3,scene);assert.notDeepEqual(camera.projectionMatrix.toArray(),committed.projection);jitter.suspend();assert.deepEqual(camera.projectionMatrix.toArray(),committed.projection);
const proof={passed:true,pendingFrames:40,staticSamplesPreserved:64,committedCameraUnchanged:true,projectionRestored:true,cameraAndExplicitResetInvalidate:true,realFailureInvalidates:true,newGPUResources:0};
await fs.writeFile('native/build/path-suspend-386-cpu.json',JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
