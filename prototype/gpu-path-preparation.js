import {ColorManagement,NoToneMapping} from 'three';

// Pipeline compilation restores renderer state before its GPU promises settle (Three r180).
// Keep the raster viewport responsive while optional path filters compile.
export function startGPUPathPreparation(renderer,post,screen){
 const state={pending:true,completed:0,total:1,error:null,cancelled:false};
 const compile=(quad,target)=>{const previous={target:renderer.getRenderTarget(),mrt:renderer.getMRT(),tone:renderer.toneMapping,color:renderer.outputColorSpace},frame=renderer._nodes?.nodeFrame,update=frame?.updateBeforeNode,owned=frame&&Object.hasOwn(frame,'updateBeforeNode'),device=renderer.backend?.device,create=device?.createRenderPipelineAsync,ownCreate=device&&Object.hasOwn(device,'createRenderPipelineAsync'),pipelines=[];try{renderer.setRenderTarget(target);renderer.setMRT(null);renderer.toneMapping=NoToneMapping;renderer.outputColorSpace=ColorManagement.workingColorSpace;
 // r180 compileAsync also visits RTT update-before hooks. Compile descriptors only;
 // keep those hooks registered for the later real frame, with no preparation draw.
 // r180's pipeline wrapper forwards success only. Observe native rejection too,
 // and restore the device method before asynchronous preparation yields.
 if(create)device.createRenderPipelineAsync=function(...args){const pending=create.apply(this,args);pipelines.push(pending);return pending.catch(()=>undefined);};
 if(frame)frame.updateBeforeNode=()=>false;const compilation=renderer.compileAsync(quad,quad.camera);return Promise.all([compilation,...pipelines]);}finally{if(create){if(ownCreate)device.createRenderPipelineAsync=create;else delete device.createRenderPipelineAsync;}if(frame){if(owned)frame.updateBeforeNode=update;else delete frame.updateBeforeNode;}renderer.setRenderTarget(previous.target);renderer.setMRT(previous.mrt);renderer.toneMapping=previous.tone;renderer.outputColorSpace=previous.color;}};
 state.done=(async()=>{try{post._update();await compile(post._quadMesh,null);if(state.cancelled)return;state.completed++;const nodes=[...new Set(screen.shaderNodes())];state.total+=nodes.length;for(const node of nodes.reverse()){if(state.cancelled)return;node._quadMesh.material.fragmentNode=node._rttNode||node.node;await compile(node._quadMesh,node.renderTarget);state.completed++;}}catch(error){if(!state.cancelled)state.error=error;}finally{state.pending=false;}})();
 return state;
}

export function gpuPathPreparationInfo(state){return state?{pending:state.pending,completed:state.completed,total:state.total,cancelled:state.cancelled,error:state.error?.message||null}:null;}

export async function capturePreparedFrame(renderer,capture){
 let image=await capture();const state=renderer.hbPathPreparation;
 if(state?.pending){await state.done;if(state.error)throw state.error;image=await capture();}
 return image;
}
