import {cancelGPUPathPreparation,gpuPathPreparationInfo} from './gpu-path-preparation.js';

export const nativeShaderPreparationContract=Object.freeze({
 version:1,backend:'D3D11',stages:Object.freeze(['path','guide','filter','photons','temporal','auxiliary']),
 states:Object.freeze(['unused','queued','compiling','ready','failed']),queueBudgetBytes:8*1024*1024,
 idleWorkerMS:1000,workerCount:1,renderWhilePending:'raster',commitPendingHistory:false,
 rasterStages:Object.freeze(['material','material-shadow','raster-vertex','raster-surface','raster-shadow']),
 baseRaster:Object.freeze({optIn:'SceneRenderer fifth constructor argument; desktop asyncShaderPreparation',stages:3,preparation:'same lazy worker; no GPU ownership in jobs',pending:'clear and present; no base draws, dependent captures or screen history',defaultSDK:'synchronous'}),
 rasterPreparation:'same lazy compiler worker; shader bytecode off-thread, device adoption on owner; pending objects skip drawing, dependent shadows/probes and screen history wait',
 lightCulling:Object.freeze({preparation:'same lazy compiler worker',fallback:'all-lights',historyWait:false,diagnostics:'shaderPreparation.raster.lightCulling',adoption:'owner thread; one fresh compile retry after device rejection'}),
 compilerCancellation:'finish active compilation; discard obsolete renderer result'
});

// Native readiness is a decision made before drawing this frame. A worker finishing
// during present is adopted on the next frame, never reported as an already drawn path.
export function updateNativePathPreparation(previous,packet,clock=()=>performance.now()){
 if(!packet?.enabled){cancelGPUPathPreparation(previous);return null;}
 const stages=packet.stages.map((state,i)=>({stage:nativeShaderPreparationContract.stages[i],state:nativeShaderPreparationContract.states[state]})).filter(s=>s.state!=='unused');
 for(const row of packet.raster?.stages||[])if(row.total)stages.push({...row,state:row.failed?'failed':row.compiling?'compiling':row.queued?'queued':'ready'});
 const pending=!!packet.pending,error=packet.error?new Error(packet.error):null;
 let state=previous;
 if(!state||state.cancelled||state.revision!==packet.revision||!state.pending&&pending){
  cancelGPUPathPreparation(state);
  state={revision:packet.revision,pending:true,error:null,cancelled:false,started:clock(),elapsedMS:0,concurrent:false};
  state.done=new Promise(resolve=>{state.resolveDone=resolve;});
  state.cancelledDone=new Promise(resolve=>{state.resolveCancellation=()=>{state.resolveDone();resolve();};});
 }
 state.stages=stages;state.queue=packet.queue;state.rasterPending=!!packet.raster?.pending;state.total=stages.reduce((n,s)=>n+(s.total??1),0);state.completed=stages.reduce((n,s)=>n+(s.ready??(s.state==='ready'?1:0)),0);
 state.submitted=stages.reduce((n,s)=>n+(s.total!==undefined?s.total-s.queued:s.state!=='queued'?1:0),0);state.error=error;state.pending=pending;
 state.currentStage=error?'failed':pending?(stages.find(s=>s.state==='compiling')||stages.find(s=>s.state==='queued'))?.stage||'queued':'ready';
 if(!pending){state.elapsedMS=clock()-state.started;state.resolveDone();}
 return state;
}
export function nativePathPreparationInfo(state){const info=gpuPathPreparationInfo(state);return info?{...info,rasterPending:state.rasterPending,queue:{...state.queue}}:null;}

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
