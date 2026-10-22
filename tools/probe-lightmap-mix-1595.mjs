import * as G from 'three';import * as W from 'three/webgpu';
import {ReflectionProbesRendering} from '../prototype/reflection-probes.js';
import {createGPUProbeEnvironment} from '../prototype/gpu-probe-environment.js';
import {makeSceneComponent} from '../prototype/scene-components.js';
import {probeLightmapMixScale} from '../prototype/probe-lightmap-mix.js';
export async function probeLightmapMix1595(progress=()=>{}){
 const results=[];
 for(const backend of ['webgl','webgpu','webgpu-fallback']){
  const C=backend==='webgl'?G:W,r=backend==='webgl'?new G.WebGLRenderer({antialias:false}):new W.WebGPURenderer({antialias:false,forceWebGL:backend==='webgpu-fallback'});
  if(backend!=='webgl')await r.init();r.hbBackend=backend==='webgl'?'webgl2':backend;r.setSize(16,4);r.outputColorSpace=C.LinearSRGBColorSpace;if(backend!=='webgl')r.hbProbeEnvironment=createGPUProbeEnvironment;
  const target=backend==='webgl'?new G.WebGLRenderTarget(16,4,{type:G.FloatType,depthBuffer:false}):new W.RenderTarget(16,4,{type:W.FloatType,depthBuffer:false}),geometry=new C.PlaneGeometry(2,2);geometry.setAttribute('uv1',geometry.getAttribute('uv').clone());
  const baked=Math.PI*.2*.25,lm=new C.DataTexture(new Float32Array([baked,baked,baked,1]),1,1,C.RGBAFormat,C.FloatType);lm.channel=1;lm.colorSpace=C.NoColorSpace;lm.needsUpdate=true;
  const map=()=>{const width=336,height=64,data=new Float32Array(width*height*4);for(let i=0;i<data.length;i+=4)data.set([.2,.2,.2,1],i);const t=new C.DataTexture(data,width,height,C.RGBAFormat,C.FloatType);t.mapping=C.CubeUVReflectionMapping;t.isPMREMTexture=true;t.minFilter=t.magFilter=C.LinearFilter;t.needsUpdate=true;return t;};
  r.hbPMREM=()=>({fromScene(){const texture=map();return {texture,dispose:()=>texture.dispose()};},dispose(){}});
  try{for(const count of [1,3]){
   const manager=new ReflectionProbesRendering(),scene=new C.Scene(),camera=new C.OrthographicCamera(-1,1,1,-1,.1,10),material=backend==='webgl'?new G.MeshPhysicalMaterial({color:0xffffff,metalness:1,roughness:.3,toneMapped:false}):new W.MeshPhysicalNodeMaterial({color:0xffffff,metalness:1,roughness:.3,toneMapped:false});material.lightMap=lm;material.lightMapIntensity=1;camera.position.z=5;scene.add(new C.Mesh(geometry,material));
   const probes=Array.from({length:count},(_,i)=>{const group=new C.Group(),properties=makeSceneComponent('ReflectionProbe',{size:[100-i,100,100],blendDistance:0,intensity:1,diffuseIntensity:0,boxProjection:false,resolution:16}).properties;group.userData={objectId:'P'+i,reflectionProbes:[{id:'probe',properties}]};scene.add(group);return properties;});
   const draw=async(flag,roughness,coat=0)=>{material.userData.hbProbeLightmapMixing=flag;material.roughness=roughness;material.clearcoat=coat;material.clearcoatRoughness=roughness;material.needsUpdate=true;manager.prepare(r,scene);r.setRenderTarget(target);let values;if(backend==='webgl'){r.render(scene,camera);values=new Float32Array(16*4*4);r.readRenderTargetPixels(target,0,0,16,4,values);if(r.getContext().getError())throw Error('lightmap mixing GL error');}else{await r.renderAsync(scene,camera);const raw=await r.readRenderTargetPixelsAsync(target,0,0,16,4);values=raw instanceof Float32Array?raw:new Float32Array(raw.buffer,raw.byteOffset,raw.byteLength/4);}return Array.from(values.subarray((2*16+8)*4,(2*16+8)*4+3));};
   try{const cases=[];for(const [roughness,coat]of [[.05,0],[.2,0],[.5,0],[.2,1],[.5,1]]){progress({backend,count,roughness,coat});const before=await draw(false,roughness,coat),after=await draw(true,roughness,coat),scale=probeLightmapMixScale([baked,baked,baked],[Math.PI*.2,Math.PI*.2,Math.PI*.2],roughness);let error=0;for(let k=0;k<3;k++){if(!(before[k]>.001))throw Error('missing physical reference');error=Math.max(error,Math.abs(after[k]-before[k]*scale));}if(error>.002)throw Error(JSON.stringify({backend,count,roughness,coat,before,after,scale,error}));cases.push({roughness,coat,scale,error});}
    material.lightMapIntensity=0;const off=await draw(false,.5),on=await draw(true,.5);if(off.some((v,i)=>Math.abs(v-on[i])>.0001))throw Error('zero lightmap intensity changed capture');material.lightMapIntensity=1;
    const captures=r.hbProbeResources.captures;for(const p of probes)p.intensity=2;const before=await draw(false,.5),after=await draw(true,.5);if(after.some((v,i)=>Math.abs(v-before[i]*.125)>.002))throw Error('capture intensity was not part of reference irradiance');if(r.hbProbeResources.captures!==captures)throw Error('mixing or brightness recaptured probes');results.push({backend,count,path:count===1?'direct':'atlas',cases,zeroIntensityBypass:true,captureIntensityReference:true,diffuseIntensityZeroReference:true,captures});
   }finally{manager.dispose();material.dispose();}
  }}finally{lm.dispose();geometry.dispose();target.dispose();r.dispose();if(backend==='webgl')r.forceContextLoss();}
 }
 return results;
}
