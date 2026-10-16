// Actual driver links, without a gameplay benchmark or a production readback.
export function normalCompileProbe189Script(packet){return `(async()=>{
 const T=await import('three'),{ScreenEffectsPass}=await import('/prototype/screen-effects-gl.js'),packet=${JSON.stringify(packet)},rows=[];
 for(const forceTime of(packet.reverseCompile?[false,true]:[true,false])){
  const renderer=new T.WebGLRenderer({antialias:false}),pass=new ScreenEffectsPass();renderer.setSize(2,2);
  try{
   pass.configurePrograms(packet.rayInfo,true,false,false,false,false,false);if(forceTime)pass.material.defines.HB_RAY_OP_2=1;
   const u=pass.material.uniforms;u.hbPath.value.set(1,4,0,0);u.hbPathDenoise.value.set(1,1,1,1);u.hbPathFilter.value.set(.8,0,1,packet.pathFilter[3]);u.hbGeometryRecords.value.fromArray(packet.geometryRecords);
   const state=pass.preparePipeline(renderer,{width:2,height:2});await state.done;if(state.error)throw state.error;
   rows.push({forceTime,elapsedMS:state.elapsedMS,parallelSupported:state.parallelSupported,concurrent:state.concurrent,stages:state.stages,programs:renderer.info.programs.length});
  }finally{pass.dispose();renderer.dispose();}
 }
 return {rows,scope:'Single static normal graph, full GL path/guide/filter driver links; not whole game FPS or the archived Complex141 scene.'};
})()`;}
