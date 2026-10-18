export function previousContextGPUProbe(f){return `(async()=>{
 const f=${JSON.stringify(f)},W=await import('three/webgpu'),N=await import('three/tsl'),{rayMaterialNode}=await import('/prototype/ray-material-gpu.js'),{previousNormalGPU}=await import('/prototype/path-previous-normal-gpu.js'),renderer=new W.WebGPURenderer({antialias:false}),rows=[];await renderer.init();renderer.setSize(2,2);
 try{for(const[packet,prior,width]of[[f.prior,false,f.width],[f.current,true,f.width],[f.current,true,f.currentWidth]]){
  const target=new W.RenderTarget(2,2,{type:W.FloatType,depthBuffer:false}),atlas=new W.DataTexture(new Float32Array(packet.data),packet.width,packet.height,W.RGBAFormat,W.FloatType);atlas.minFilter=atlas.magFilter=W.NearestFilter;atlas.needsUpdate=true;
  const sample=N.texture(atlas),load=index=>N.textureLoad(sample,N.ivec2(index.mod(packet.width),index.div(packet.width).floor())),u={};for(const key of['geometryInfo','geometryRecords','transport','pathFilter','forward'])u[key]=N.uniform(new W.Vector4(...packet[key]));
  const ray=rayMaterialNode(load,u,packet.rayInfo.programs,[3]),point=N.vec3(...f.point),view=N.vec3(...f.view),id=N.float(prior?f.id:0),normal=prior?previousNormalGPU({load,ray},u)(id,point,N.vec3(0),view,N.float(width)):ray.normal(id,point,view,N.float(width)),material=new W.MeshBasicNodeMaterial();material.fragmentNode=N.vec4(normal,1);const quad=new W.PlaneGeometry(2,2),world=new W.Scene();world.add(new W.Mesh(quad,material));
  try{renderer.setRenderTarget(target);await renderer.renderAsync(world,new W.OrthographicCamera(-1,1,1,-1,0,2));rows.push([...await renderer.readRenderTargetPixelsAsync(target,0,0,1,1)]);}finally{quad.dispose();material.dispose();target.dispose();atlas.dispose();}
 }}finally{renderer.dispose();}return rows;
 })()`;}
