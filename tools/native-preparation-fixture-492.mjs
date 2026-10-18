import assert from 'node:assert/strict';
export async function checkNativePreparation492({evaluate,call,ready,inspect}){
 const rows=[],snapshot=async()=>{const s=await inspect(),life=await evaluate('window.hbPlayerDebug.lifecycle()');return {sceneFrame:life.sceneFrame,time:s.time,presents:s.renderer.presents,samples:s.renderer.pathSamples,preparation:s.renderer.pipelinePreparation};};
 const until=async(fn,label)=>{const end=performance.now()+10000;while(performance.now()<end){const v=await fn();if(v)return v;await new Promise(r=>setTimeout(r,25));}throw Error(label);};
 await call('Bool',{target:'Post',component:'PostProcessVolume',property:'pathTracingEnabled',value:true});
 const first=await until(async()=>{const row=await snapshot();return row.preparation?.pending?row:null;},'Native pending path was not observable');rows.push(first);
 const cppStart=performance.now();await call('Float',{target:'Post',component:'PostProcessVolume',property:'focusDistance',value:11});
 const changed=await until(async()=>{const s=await inspect();return s.objects.find(o=>o.id==='Post')?.components.find(c=>c.type==='PostProcessVolume')?.properties.focusDistance===11;},'C++ edit did not execute during preparation');
 const cppElapsedMS=performance.now()-cppStart;assert.ok(changed&&cppElapsedMS<1000,JSON.stringify({cppElapsedMS}));
 for(let i=0;i<3;i++){await new Promise(r=>setTimeout(r,50));rows.push(await snapshot());}
 const pending=rows.filter(r=>r.preparation?.pending);assert.ok(pending.length>=2);assert.ok(pending.at(-1).sceneFrame>pending[0].sceneFrame&&pending.at(-1).presents>pending[0].presents);assert.ok(pending.every(r=>r.samples===0));
 const stopStart=performance.now();await call('Bool',{target:'Post',component:'PostProcessVolume',property:'pathTracingEnabled',value:false});await ready();const disabled=await snapshot(),disableMS=performance.now()-stopStart;assert.ok(!disabled.preparation?.pending&&disableMS<1000,JSON.stringify({disableMS,disabled}));
 await call('Bool',{target:'Post',component:'PostProcessVolume',property:'pathTracingEnabled',value:true});
 await evaluate('window.hbPlayerDebug.captureAsync()');await ready();const restored=await snapshot();assert.equal(restored.preparation.currentStage,'ready');assert.ok(restored.samples>0);assert.ok(restored.preparation.queue.bytes<=restored.preparation.queue.budgetBytes);
 return {passed:true,pendingFrames:pending.at(-1).sceneFrame-pending[0].sceneFrame,pendingPresents:pending.at(-1).presents-pending[0].presents,cppElapsedMS,disableMS,rows,disabled,restored,scope:'isolated actual C++/BP D3D game; frames continue, pending path samples remain zero, cached restore bypasses active compiler, capture waits without advancing a private draw loop; no FPS claim'};
}
