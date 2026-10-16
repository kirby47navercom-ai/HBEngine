// Real driver links for field metadata, independent of any production readback.
export function normalFieldCompile194Script(packet){return `(async()=>{
 const T=await import('three'),{ScreenEffectsPass}=await import('/prototype/screen-effects-gl.js'),packet=${JSON.stringify(packet)},rows=[];
 for(const legacy of(packet.reverseCompile?[false,true]:[true,false])){
  const renderer=new T.WebGLRenderer({antialias:false}),pass=new ScreenEffectsPass();renderer.setSize(2,2);
  try{
   const info=legacy?{...packet.rayInfo,programs:packet.rayInfo.programs.map(({fields,...p})=>p)}:packet.rayInfo;
   pass.configurePrograms(info,true,false,false,false,false,false);
   const u=pass.material.uniforms;u.hbPath.value.set(1,4,0,0);u.hbPathDenoise.value.set(1,1,1,1);u.hbPathFilter.value.fromArray(packet.pathFilter);u.hbGeometryRecords.value.fromArray(packet.geometryRecords);
   const state=pass.preparePipeline(renderer,{width:2,height:2});await state.done;if(state.error)throw state.error;
   rows.push({legacy,elapsedMS:state.elapsedMS,parallelSupported:state.parallelSupported,stages:state.stages,programs:renderer.info.programs.length});
  }finally{pass.dispose();renderer.dispose();renderer.forceContextLoss();}
 }
 return {rows,scope:'Static normal packet plus unrelated emissive program definitions; full GL links, not a multi-material gameplay or Complex141 FPS benchmark.'};
})()`;}
