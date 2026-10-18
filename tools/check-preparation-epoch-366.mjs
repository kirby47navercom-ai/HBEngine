import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {startGPUPathPreparation,cancelGPUPathPreparation} from '../prototype/gpu-path-preparation.js';

function fixture(){
 let target='viewport',mrt='multiple';const pending=[],epochs=[],frame={renderId:7,updateBeforeNode(){}},hook=frame.updateBeforeNode;
 const renderer={info:{calls:41},_nodes:{nodeFrame:frame},toneMapping:2,outputColorSpace:'display',getRenderTarget:()=>target,setRenderTarget:v=>{target=v;},getMRT:()=>mrt,setMRT:v=>{mrt=v;},compileAsync(){
  const before=frame.renderId;frame.renderId++;epochs.push(frame.renderId);frame.renderId=before;
  return new Promise((resolve,reject)=>pending.push({resolve,reject}));
 }},quad={camera:{},material:{}},node={_quadMesh:quad,node:{},renderTarget:'filter'},post={_update(){},_quadMesh:quad},screen={shaderNodes:()=>[node]};
 const restored=id=>{assert.equal(frame.renderId,id);assert.equal(frame.updateBeforeNode,hook);assert.equal(target,'viewport');assert.equal(mrt,'multiple');assert.equal(renderer.toneMapping,2);assert.equal(renderer.outputColorSpace,'display');assert.equal(renderer.info.calls,41);};
 return {renderer,frame,pending,epochs,post,screen,restored};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve)),success=fixture(),state=startGPUPathPreparation(success.renderer,success.post,success.screen);
success.restored(7);assert.equal(state.pending,true);assert.ok(success.epochs[0]<0);
// A real raster frame can advance the shared frame while the pipeline is pending.
success.frame.renderId=21;success.pending[0].resolve();await tick();success.restored(21);
assert.equal(success.epochs.length,2);assert.ok(success.epochs.every(id=>id<0));assert.notEqual(...success.epochs);
success.pending[1].resolve();await state.done;success.restored(21);assert.equal(state.currentStage,'ready');assert.equal(state.completed,2);
const failed=fixture(),error=Error('compile rejected'),bad=startGPUPathPreparation(failed.renderer,failed.post,failed.screen);failed.restored(7);failed.pending[0].reject(error);await bad.done;failed.restored(7);assert.equal(bad.error,error);assert.equal(failed.epochs.length,2);
const cancelled=fixture(),obsolete=startGPUPathPreparation(cancelled.renderer,cancelled.post,cancelled.screen);cancelGPUPathPreparation(obsolete);cancelled.restored(7);for(const p of cancelled.pending)p.resolve();await obsolete.done;assert.equal(obsolete.currentStage,'cancelled');assert.equal(cancelled.epochs.length,2);
const thrown=fixture();thrown.renderer.compileAsync=()=>{thrown.frame.renderId++;throw Error('synchronous submission');};const broken=startGPUPathPreparation(thrown.renderer,thrown.post,thrown.screen);thrown.restored(7);await broken.done;assert.match(broken.error.message,/synchronous submission/);
const cold=fixture();let initialize;cold.renderer._initialized=false;cold.renderer.init=()=>new Promise(resolve=>{initialize=()=>{cold.renderer._initialized=true;resolve();};});const uninitialized=startGPUPathPreparation(cold.renderer,cold.post,cold.screen);assert.equal(cold.epochs.length,0);initialize();await tick();cold.restored(7);assert.ok(cold.epochs[0]<0);cold.pending[0].resolve();await tick();cold.pending[1].resolve();await uninitialized.done;assert.equal(uninitialized.error,null);
const initError=fixture();initError.renderer._initialized=false;initError.renderer.init=async()=>{throw Error('device init failed');};const initFailed=startGPUPathPreparation(initError.renderer,initError.post,initError.screen);await initFailed.done;assert.match(initFailed.error.message,/device init failed/);assert.equal(initError.epochs.length,0);
const result={passed:true,compileEpochs:success.epochs,restoredBeforePromiseSettles:true,uninitializedDeviceAndFailure:true,rasterAdvancePreserved:true,rendererCallCounterUnchanged:true,failureAndCancellationRestore:true,newDraws:0,newResources:0};
await fs.writeFile('native/build/preparation-epoch-366-cpu.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
