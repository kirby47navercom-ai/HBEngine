// Simulate / eject: editor Play started with --editor-simulate runs with the free debug camera at the given pose
// (report debugCamera true), and the DebugCamera module moves with W and turns with a right-drag.
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {promisify} from 'node:util';
import {DebugCamera} from '../prototype/debug-camera.js';
import {createProject} from './project-manifest.mjs';

// Module: W moves forward, right-drag turns, F8-style disable stops reacting.
const cam=new DebugCamera();cam.enable(null,{position:[0,1,5],target:[0,1,0]});
cam.consume([{event:'input',packet:{device:'keyboard',key:'w',value:1}}]);cam.update(.5,16/9);assert.ok(cam.camera.position.z<5,'W moves toward the target: '+cam.camera.position.z);
const yaw=cam.yaw;cam.consume([{event:'input',packet:{device:'mouse',key:'RightMouseButton',value:1}},{event:'input',packet:{device:'mouse',pointer:{position:[100,100],size:[800,600]}}},{event:'input',packet:{device:'mouse',pointer:{position:[160,100],size:[800,600]}}}]);assert.ok(cam.yaw<yaw,'right-drag turns');
cam.disable();assert.equal(cam.enabled,false);

const root=path.resolve(import.meta.dirname,'..'),work=await fs.mkdtemp(path.join(root,'native/build/native-simulate-'));
try{
  const record=await createProject('Simulate',work,'3d'),report=path.join(work,'report.json'),dist=path.join(root,'dist/HBEngineNative');await fs.mkdir(path.join(work,'Profile'),{recursive:true});
  await promisify(execFile)(path.join(dist,'HBNativePlayer.exe'),['--hidden','--silent','--frames','20','--report',report,'--package',dist,'--editor-project',record.file,'--editor-profile',path.join(work,'Profile'),'--editor-simulate','3,2,6,0,0.5,0'],{windowsHide:true,env:{...process.env,HB_USER_DATA_DIR:path.join(work,'UserData'),HB_NATIVE_TEST_STATE:path.join(work,'State')},timeout:90000});
  const result=JSON.parse(await fs.readFile(report,'utf8')),state=result.debugCamera??result.stats?.debugCamera;
  assert.equal(state,true,'simulate runs with the debug camera: '+JSON.stringify(Object.keys(result)));
  console.log(JSON.stringify({passed:true,debugCamera:state}));
}finally{await fs.rm(work,{recursive:true,force:true});}
