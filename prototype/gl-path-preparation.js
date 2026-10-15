import {OrthographicCamera} from 'three';

const camera=new OrthographicCamera(-1,1,1,-1,0,1);

// r180 compileAsync's poll rereads material properties after disposal. Capture each
// program instead, so cancelling a view can release it without a stale callback.
export function startGLPathPreparation(renderer,quad,tasks){
 const gl=renderer.getContext(),parallel=renderer.extensions.get('KHR_parallel_shader_compile');
 const state={pending:true,completed:0,total:tasks.length,error:null,cancelled:false,currentStage:tasks[0]?.stage||'post',started:performance.now(),elapsedMS:0,stages:[],parallelSupported:!!parallel};
 state.cancelledDone=new Promise(resolve=>{state.resolveCancellation=resolve;});
 state.done=(async()=>{try{
  for(const {stage,material,target}of tasks){
   if(state.cancelled)return;
   state.currentStage=stage;const started=state.stageStarted=performance.now();let program;
   const previous={material:quad.material,target:renderer.getRenderTarget(),face:renderer.getActiveCubeFace(),mip:renderer.getActiveMipmapLevel()};
   try{
    quad.material=material;renderer.setRenderTarget(target);renderer.compile(quad._mesh,camera);
    program=renderer.properties.get(material).currentProgram;
   }finally{quad.material=previous.material;renderer.setRenderTarget(previous.target,previous.face,previous.mip);}
   if(!program?.program)throw Error('WebGL 셰이더 프로그램이 준비되지 않았어요: '+stage);
   // COMPLETION_STATUS_KHR does not force the driver to finish linking.
   while(parallel&&!gl.getProgramParameter(program.program,parallel.COMPLETION_STATUS_KHR)){
    if(gl.isContextLost())throw Error('WebGL 컨텍스트가 손실됐어요.');
    await new Promise(resolve=>{const timer=setTimeout(done,10);function done(){clearTimeout(timer);state.resolvePoll=null;resolve();}state.resolvePoll=done;});
    if(state.cancelled)return;
   }
   if(state.cancelled)return;
   if(gl.isContextLost())throw Error('WebGL 컨텍스트가 손실됐어요.');
   if(!gl.getProgramParameter(program.program,gl.LINK_STATUS))throw Error('WebGL '+stage+' 컴파일 실패: '+(gl.getProgramInfoLog(program.program)||'프로그램 연결 오류'));
   state.stages.push({stage,elapsedMS:performance.now()-started});state.completed++;
  }
 }catch(error){if(!state.cancelled){state.error=error;state.stages.push({stage:state.currentStage,elapsedMS:performance.now()-state.stageStarted});}}finally{state.pending=false;state.elapsedMS=performance.now()-state.started;state.currentStage=state.error?'failed':state.cancelled?'cancelled':'ready';}})();
 return state;
}
