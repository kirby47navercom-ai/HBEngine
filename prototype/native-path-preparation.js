import {cancelGPUPathPreparation,gpuPathPreparationInfo} from './gpu-path-preparation.js';

export const nativeShaderPreparationContract=Object.freeze({
 version:1,backend:'D3D11',stages:Object.freeze(['path','guide','filter','photons','temporal','auxiliary']),
 states:Object.freeze(['unused','queued','compiling','ready','failed']),queueBudgetBytes:8*1024*1024,
 idleWorkerMS:1000,workerCount:1,renderWhilePending:'raster',commitPendingHistory:false,
 compilerCancellation:'finish active compilation; discard obsolete renderer result'
});

// Native readiness is a decision made before drawing this frame. A worker finishing
// during present is adopted on the next frame, never reported as an already drawn path.
export function updateNativePathPreparation(previous,packet,clock=()=>performance.now()){
 if(!packet?.enabled){cancelGPUPathPreparation(previous);return null;}
 const stages=packet.stages.map((state,i)=>({stage:nativeShaderPreparationContract.stages[i],state:nativeShaderPreparationContract.states[state]})).filter(s=>s.state!=='unused');
 const pending=!!packet.pending,error=packet.error?new Error(packet.error):null;
 let state=previous;
 if(!state||state.cancelled||state.revision!==packet.revision||!state.pending&&pending){
  cancelGPUPathPreparation(state);
  state={revision:packet.revision,pending:true,error:null,cancelled:false,started:clock(),elapsedMS:0,concurrent:false};
  state.done=new Promise(resolve=>{state.resolveDone=resolve;});
  state.cancelledDone=new Promise(resolve=>{state.resolveCancellation=()=>{state.resolveDone();resolve();};});
 }
 state.stages=stages;state.queue=packet.queue;state.total=stages.length;state.completed=stages.filter(s=>s.state==='ready').length;
 state.submitted=stages.filter(s=>s.state!=='queued').length;state.error=error;state.pending=pending;
 state.currentStage=error?'failed':pending?(stages.find(s=>s.state==='compiling')||stages.find(s=>s.state==='queued'))?.stage||'queued':'ready';
 if(!pending){state.elapsedMS=clock()-state.started;state.resolveDone();}
 return state;
}
export function nativePathPreparationInfo(state){const info=gpuPathPreparationInfo(state);return info?{...info,queue:{...state.queue}}:null;}

// A capture can pause the game loop. Polling compiler status must therefore work
// without drawing another frame or advancing simulation/path history.
export function pollNativePathPreparation(renderer,poll){
 const state=renderer.hbPathPreparation;if(!state?.pending||state.polling)return;
 state.polling=true;
 (async()=>{
  while(state.pending&&!state.cancelled&&renderer.hbPathPreparation===state){
   await Promise.race([new Promise(resolve=>setTimeout(resolve,25)),state.cancelledDone]);
   if(state.cancelled||renderer.hbPathPreparation!==state)return;
   const packet=await poll();if(state.cancelled||renderer.hbPathPreparation!==state)return;
   const next=updateNativePathPreparation(state,packet);renderer.hbPathPreparation=next;
   if(next!==state){pollNativePathPreparation(renderer,poll);return;}
  }
 })().catch(error=>{if(renderer.hbPathPreparation!==state||state.cancelled)return;
  state.error=error;state.pending=false;state.currentStage='failed';state.elapsedMS=performance.now()-state.started;state.resolveDone();});
}
