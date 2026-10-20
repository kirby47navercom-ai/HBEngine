import * as G from 'three';import * as W from 'three/webgpu';
import {createThreeMaterial,makeMaterialNode} from '../prototype/material-runtime.js';import {createGPUMaterial} from '../prototype/gpu-materials.js';import {createAsset} from '../prototype/asset-documents.js';import {cameraMaterial1135,fresnelMaterial1135} from './camera-material-fixture-1135.mjs';
export async function cameraSurface1137(){
 const results=[];
 for(const backend of ['webgl','webgpu','webgpu-fallback']){
  const C=backend==='webgl'?G:W,renderer=backend==='webgl'?new G.WebGLRenderer({antialias:false}):new W.WebGPURenderer({antialias:false,forceWebGL:backend==='webgpu-fallback'});if(backend!=='webgl')await renderer.init();
  if(backend==='webgpu'&&!renderer.backend.isWebGPUBackend||backend==='webgpu-fallback'&&!renderer.backend.isWebGLBackend)throw Error('camera test backend mismatch');
  renderer.setSize(4,1);renderer.outputColorSpace=C.LinearSRGBColorSpace;renderer.toneMapping=C.NoToneMapping;
  const target=backend==='webgl'?new G.WebGLRenderTarget(4,1,{type:G.FloatType,depthBuffer:false}):new W.RenderTarget(4,1,{type:W.FloatType,depthBuffer:false}),scene=new C.Scene(),geometry=new C.PlaneGeometry(2,2),make=data=>backend==='webgl'?createThreeMaterial(C,data,{renderer}):createGPUMaterial(data,{renderer}),mesh=new C.Mesh(geometry,make(cameraMaterial1135()));scene.add(mesh);let maximum=0,viewCases=0,fresnelCases=0,ambientCases=0;
  const draw=async camera=>{renderer.setRenderTarget(target);if(backend==='webgl'){renderer.render(scene,camera);const pixels=new Float32Array(16);renderer.readRenderTargetPixels(target,0,0,4,1,pixels);if(renderer.getContext().getError())throw Error('camera GL error');return pixels;}await renderer.renderAsync(scene,camera);const raw=await renderer.readRenderTargetPixelsAsync(target,0,0,4,1);return raw instanceof Float32Array?raw:new Float32Array(raw.buffer,raw.byteOffset,raw.byteLength/4);},expect=(actual,expected,label)=>{for(let i=0;i<3;i++){const error=Math.abs(actual[i]-expected[i]);maximum=Math.max(maximum,error);if(!Number.isFinite(actual[i])||error>2e-5)throw Error(label+' '+JSON.stringify({backend,actual,expected}));}};
  try{
   for(const kind of ['view','fresnel']){mesh.material.dispose();mesh.material=make(kind==='view'?cameraMaterial1135():fresnelMaterial1135());for(const projection of ['orthographic','perspective'])for(const tilted of [false,true]){
    const camera=projection==='orthographic'?new C.OrthographicCamera(-1,1,.25,-.25,.1,20):new C.PerspectiveCamera(60,4,.1,20);camera.position.set(tilted?.6:0,tilted?.2:0,2);camera.lookAt(0,0,0);camera.updateMatrixWorld();camera.add(mesh);mesh.position.set(0,0,-2);const halfHeight=projection==='orthographic'?.25:2*Math.tan(Math.PI/6);mesh.scale.set(projection==='orthographic'?1:halfHeight*4,halfHeight,1);scene.add(camera);const pixels=await draw(camera);
    for(let x=0;x<4;x++){const direction=projection==='orthographic'?camera.getWorldDirection(new C.Vector3()).negate():new C.Vector3((x+.5)/4*2-1,0,0).unproject(camera).sub(camera.position).normalize().negate();const expected=kind==='view'?direction.toArray().map(v=>v*.5+.5):Array(3).fill(.04+.96*(1-direction.dot(camera.getWorldDirection(new C.Vector3()).negate()))**5);expect(Array.from(pixels.subarray(x*4,x*4+3)),expected,'authored material '+kind);if(kind==='view')viewCases++;else fresnelCases++;}scene.remove(camera);scene.add(mesh);mesh.position.set(0,0,0);mesh.scale.set(1,1,1);
   }
   }
   mesh.material.dispose();const camera=new C.OrthographicCamera(-1,1,.25,-.25,.1,20);camera.position.z=2;
   for(const hemi of [false,true])for(const metal of [0,.5,1]){
    const asset=createAsset('material','Ambient');asset.surface.color=[.8,.4,.2];asset.surface.metalness=metal;mesh.material=make(asset);const color=new C.Color(.3,.6,.9),light=hemi?new C.HemisphereLight(color,new C.Color(.1,.2,.3),1):new C.AmbientLight(color,1);light.position.set(0,0,1);scene.add(light);const pixels=await draw(camera),expected=[.8*.3,.4*.6,.2*.9].map(v=>v*(1-metal)/Math.PI);expect(Array.from(pixels.subarray(4,7)),expected,'ambient Lambert');scene.remove(light);mesh.material.dispose();ambientCases++;
   }
   results.push({backend,viewCases,fresnelCases,ambientCases,maxError:maximum});
  }finally{mesh.material.dispose();geometry.dispose();target.dispose();renderer.dispose();if(backend==='webgl')renderer.forceContextLoss();}
 }
 return results;
}
