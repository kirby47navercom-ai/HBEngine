import * as G from 'three';
import * as W from 'three/webgpu';
import {ReflectionProbesRendering} from '../prototype/reflection-probes.js';
import {createGPUProbeEnvironment} from '../prototype/gpu-probe-environment.js';
import {installGPUCameraView} from '../prototype/gpu-camera-view.js';
import {makeSceneComponent} from '../prototype/scene-components.js';
import {probeInfluenceOracle1426} from './probe-influence-fixture-1426.mjs';

export async function probeInfluenceManager1427(progress=()=>{}){
 const results=[];
 for(const backend of ['webgl','webgpu','webgpu-fallback']){
  const C=backend==='webgl'?G:W,r=backend==='webgl'?new G.WebGLRenderer({antialias:false}):new W.WebGPURenderer({antialias:false,forceWebGL:backend==='webgpu-fallback'});
  if(backend!=='webgl'){await r.init();installGPUCameraView(r);}r.hbBackend=backend==='webgl'?'webgl2':'webgpu';r.setSize(24,4);r.outputColorSpace=C.LinearSRGBColorSpace;
  const target=backend==='webgl'?new C.WebGLRenderTarget(24,4,{type:C.FloatType,depthBuffer:false}):new C.RenderTarget(24,4,{type:C.FloatType,depthBuffer:false});
  const scene=new C.Scene(),camera=new C.OrthographicCamera(-1.2,1.2,.2,-.2,.1,20),geometry=new C.PlaneGeometry(12,12),material=new C.MeshPhysicalMaterial({color:0xffffff,metalness:1,roughness:.2,clearcoat:.7,clearcoatRoughness:.3,toneMapped:false}),mesh=new C.Mesh(geometry,material),manager=new ReflectionProbesRendering(),textures=[];
  mesh.position.z=2;scene.add(mesh);camera.position.z=7;camera.lookAt(0,0,2);camera.updateMatrixWorld();
  r.hbPMREM=()=>({fromScene(_s,_sigma,_near,_far,options){const color=options.position.z>.3?[.3,0,0]:options.position.x<0?[0,.3,0]:[0,0,.3],data=new Float32Array(336*64*4);for(let i=0;i<data.length;i+=4)data.set([...color,1],i);const t=new C.DataTexture(data,336,64,C.RGBAFormat,C.FloatType);t.mapping=C.CubeUVReflectionMapping;t.isPMREMTexture=true;t.minFilter=t.magFilter=C.LinearFilter;t.needsUpdate=true;textures.push(t);return{texture:t,dispose(){t.dispose();}};},dispose(){}});
  if(backend!=='webgl')r.hbProbeEnvironment=createGPUProbeEnvironment;
  const groups=[],properties=[],centers=[[.2,-.1,.4],[-.2,0,0],[.3,0,0]];
  for(let i=0;i<3;i++){const group=new C.Group(),p=makeSceneComponent('ReflectionProbe',{size:[4,6,8],captureOffset:centers[i],boxProjection:false,blendDistance:0,diffuseIntensity:0,importance:3-i,resolution:16,enabled:i===0}).properties;group.userData={objectId:'Influence'+i,reflectionProbes:[{id:'Probe',properties:p}]};scene.add(group);groups.push(group);properties.push(p);}
  const p=properties[0],draw=async()=>{manager.prepare(r,scene);r.setRenderTarget(target);if(backend==='webgl'){r.render(scene,camera);const a=new Float32Array(24*4*4);r.readRenderTargetPixels(target,0,0,24,4,a);if(r.getContext().getError())throw Error('influence manager GL error');return a;}await r.renderAsync(scene,camera);const a=await r.readRenderTargetPixelsAsync(target,0,0,24,4);if(a.length===384)return a;const result=new Float32Array(384),stride=Math.ceil(24*16/256)*64;for(let y=0;y<4;y++)result.set(a.subarray(y*stride,y*stride+96),y*96);return result;};
  const cases=[];let maxError=0,samples=0;
  const reset=()=>{Object.assign(p,{advancedBlend:false,blendDistance:0,blendNormalDistance:0,blendPositive:[0,0,0],blendNegative:[0,0,0],fadePositive:[1,1,1],fadeNegative:[1,1,1],blendNormalPositive:[0,0,0],blendNormalNegative:[0,0,0]});};
  const compare=async(label,references,active)=>{
   progress({backend,label});const actual=await draw(),normal=new G.Vector3(0,0,1).applyQuaternion(mesh.quaternion).toArray(),ray=normal;
   for(let y=0;y<4;y++)for(let x=0;x<24;x++){
    const origin=new G.Vector3((x+.5)/24*2-1,(y+.5)/4*2-1,0).unproject(camera),direction=new G.Vector3(0,0,-1).applyQuaternion(camera.quaternion),point=origin.addScaledVector(direction,(2-origin.z)/direction.z).toArray();
    const weights=active.map(i=>({i,w:probeInfluenceOracle1426(new G.Matrix4(),properties[i],point,normal,ray,centers[i])})).filter(v=>v.w>0).slice(0,2),total=weights.reduce((s,v)=>s+v.w,0),at=(y*24+x)*4;
    for(let c=0;c<3;c++){const expected=weights.reduce((s,v)=>s+references[v.i][at+c]*v.w/Math.max(1,total),0),error=Math.abs(actual[at+c]-expected);maxError=Math.max(maxError,error);if(!Number.isFinite(actual[at+c])||error>.0001){const view=manager.views.get(r);globalThis.__influenceDebug1427={backend,label,pixel:[...actual.slice(at,at+4)],referencePixels:references.map(v=>[...v.slice(at,at+4)]),influenceActive:!!view.atlas?.influenceActive,count:view.atlas?.count||0,width:view.atlas?.width||0,table:[...(view.atlas?.table?.image.data||[])],shaders:[...(r._pipelines?.programs?.fragment?.keys?.()||[])]};throw Error(JSON.stringify({backend,label,x,y,c,actual:actual[at+c],expected,error,point,normal,weights}));}samples++;}
   }cases.push({label});return actual;
  };
  try{
   reset();const references=[await draw()];if(!references[0].some((v,i)=>i%4<3&&v>.01))throw Error('empty physical baseline');
   Object.assign(p,{advancedBlend:true,blendPositive:[0,0,4],fadePositive:[1,1,.2]});await compare('direct asymmetric distance and ray face fade',references,[0]);
   reset();Object.assign(p,{blendNormalDistance:3});await compare('direct outward normal shell',references,[0]);
   for(let i=1;i<3;i++){reset();properties.forEach((v,j)=>v.enabled=i===j);references[i]=await draw();}
   properties.forEach(v=>v.enabled=true);reset();await draw();const before=structuredClone(r.hbProbeResources);
   Object.assign(p,{advancedBlend:true,fadePositive:[1,1,0]});await compare('atlas face rejection promotes second and third candidates',references,[0,1,2]);
   Object.assign(p,{fadePositive:[1,1,.2]});await compare('atlas partial ray fade before normalization',references,[0,1,2]);
   reset();p.blendNormalDistance=3;await compare('atlas outward normal rejection promotes candidates',references,[0,1,2]);
   reset();await compare('atlas default restored without stale influence selection',references,[0,1,2]);
   const after=structuredClone(r.hbProbeResources);if(before.captures!==after.captures||before.atlas.copies!==after.atlas.copies||before.atlas.spatial.builds!==after.atlas.spatial.builds)throw Error('influence-only change recreated images or spatial geometry');
   // Reverse both visible surface and viewer. Outward suppression must stop.
   properties.forEach((v,i)=>v.enabled=i===0);reset();mesh.rotation.y=Math.PI;camera.position.z=-5;camera.lookAt(0,0,2);camera.updateMatrixWorld();references[0]=await draw();p.blendNormalDistance=3;await compare('direct inward normal retains reflection',references,[0]);
   results.push({backend,samples,maxError,cases,metadataOnly:{captures:after.captures,copies:after.atlas.copies,spatialBuilds:after.atlas.spatial.builds}});
  }finally{manager.dispose();geometry.dispose();material.dispose();target.dispose();for(const t of textures)t.dispose();r.dispose();if(backend==='webgl')r.forceContextLoss();}
 }
 return {passed:true,results,scope:'Actual physical+clearcoat direct/atlas GL/WebGPU/forcedGL with independent plane/angular/normal oracle and individual constant HDR color render references; asymmetric distances, partial/rejected face and outward/inward normals, third-candidate promotion, default restore and no recapture/copy/spatial rebuild. Native compute/raster/game separately.'};
}
