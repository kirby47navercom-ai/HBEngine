import * as G from 'three';import * as W from 'three/webgpu';import * as T from 'three/tsl';
import {installGPUCameraView} from '../prototype/gpu-camera-view.js';

function environment(C){
 const width=384,height=512,data=new Float32Array(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)data.set([.15+x/width,.1+y/height,.25+.4*x/width+.2*y/height,1],(y*width+x)*4);
 const map=new C.DataTexture(data,width,height,C.RGBAFormat,C.FloatType);map.mapping=C.CubeUVReflectionMapping;map.isPMREMTexture=true;map.minFilter=map.magFilter=C.LinearFilter;map.needsUpdate=true;return map;
}
async function fixture(backend,correct=true){
 const C=backend==='webgl'?G:W,renderer=backend==='webgl'?new G.WebGLRenderer({antialias:false}):new W.WebGPURenderer({antialias:false,forceWebGL:backend==='webgpu-fallback'});if(backend!=='webgl'){await renderer.init();if(correct)installGPUCameraView(renderer);if(backend==='webgpu'&&!renderer.backend.isWebGPUBackend||backend==='webgpu-fallback'&&!renderer.backend.isWebGLBackend)throw Error('physical camera backend mismatch');}
 renderer.setSize(4,1);renderer.outputColorSpace=C.LinearSRGBColorSpace;renderer.toneMapping=C.NoToneMapping;const target=backend==='webgl'?new G.WebGLRenderTarget(4,1,{type:G.FloatType,depthBuffer:false}):new W.RenderTarget(4,1,{type:W.FloatType,depthBuffer:false}),geometry=new C.PlaneGeometry(2,2),scene=new C.Scene(),mesh=new C.Mesh(geometry),map=environment(C),light=new C.DirectionalLight(0xffffff,1.4);light.position.set(2,3,4);scene.add(mesh,light);
 const draw=async camera=>{renderer.setRenderTarget(target);if(backend==='webgl'){renderer.render(scene,camera);const p=new Float32Array(16);renderer.readRenderTargetPixels(target,0,0,4,1,p);if(renderer.getContext().getError())throw Error('physical camera GL');return Array.from(p);}await renderer.renderAsync(scene,camera);const raw=await renderer.readRenderTargetPixelsAsync(target,0,0,4,1);return Array.from(raw instanceof Float32Array?raw:new Float32Array(raw.buffer,raw.byteOffset,raw.byteLength/4));};
 function camera(perspective=false,tilted=false){const c=perspective?new C.PerspectiveCamera(60,4,.1,20):new C.OrthographicCamera(-2,2,.5,-.5,.1,20);c.position.set(tilted?.6:0,tilted?.2:0,2);c.lookAt(0,0,0);c.updateMatrixWorld();c.add(mesh);mesh.position.set(0,0,-2);const h=perspective?2*Math.tan(Math.PI/6):.5;mesh.scale.set(h*4,h,1);scene.add(c);return c;}
 return{C,renderer,scene,mesh,map,geometry,light,draw,camera,physical:p=>backend==='webgl'?new C.MeshPhysicalMaterial(p):new C.MeshPhysicalNodeMaterial(p),dispose(){mesh.material.dispose();geometry.dispose();map.dispose();target.dispose();renderer.dispose();if(backend==='webgl')renderer.forceContextLoss();}};
}
export async function physicalCamera1145(){
 const baseline=await fixture('webgpu',false);let originalError;
 try{baseline.light.visible=false;baseline.mesh.material.dispose();baseline.mesh.material=new W.MeshPhysicalNodeMaterial({color:0});baseline.mesh.material.emissiveNode=T.positionViewDirection.transformDirection(T.cameraViewMatrix).mul(.5).add(.5);const p=await baseline.draw(baseline.camera());originalError=Math.max(...[0,1,2,3].flatMap(x=>p.slice(x*4,x*4+3).map((v,c)=>Math.abs(v-[.5,.5,1][c]))));if(originalError<.2)throw Error('uncorrected view baseline did not expose the off-axis defect');}finally{baseline.dispose();}
 const reference=await fixture('webgl'),results=[];
 try{for(const backend of ['webgpu','webgpu-fallback']){
  const f=await fixture(backend);let vectorError=0,physicalError=0,vectorCases=0,physicalCases=0,invarianceError=0;
  try{
   f.light.visible=false;f.mesh.material.dispose();f.mesh.material=new W.MeshPhysicalNodeMaterial({color:0});f.mesh.material.emissiveNode=T.positionViewDirection.transformDirection(T.cameraViewMatrix).mul(.5).add(.5);
   for(const perspective of [false,true,false])for(const tilted of [false,true]){const camera=f.camera(perspective,tilted),pixels=await f.draw(camera);for(let x=0;x<4;x++){const v=perspective?new f.C.Vector3((x+.5)/4*2-1,0,0).unproject(camera).sub(camera.position).normalize().negate():camera.getWorldDirection(new f.C.Vector3()).negate(),expected=v.toArray().map(v=>v*.5+.5);for(let c=0;c<3;c++){const error=Math.abs(pixels[x*4+c]-expected[c]);vectorError=Math.max(vectorError,error);if(error>2e-5)throw Error('builtin physical view '+JSON.stringify({backend,perspective,tilted,x,actual:pixels.slice(x*4,x*4+3),expected}));}vectorCases++;}camera.removeFromParent();}
   f.mesh.material.dispose();f.light.visible=true;
   const styles=[{metalness:1,roughness:.2},{metalness:0,roughness:.35,clearcoat:1,clearcoatRoughness:.14},{metalness:0,roughness:.5,sheen:.8,sheenColor:0xd06020,sheenRoughness:.4},{metalness:.8,roughness:.3,anisotropy:.7,anisotropyRotation:.3},{metalness:.65,roughness:.24,iridescence:.8,iridescenceIOR:1.4,iridescenceThicknessRange:[350,350]},{metalness:0,roughness:.45,ior:1.8,clearcoat:.5},{metalness:.65,roughness:.24,iridescence:.8,iridescenceIOR:1.4,iridescenceThicknessRange:[0,0]},{metalness:.65,roughness:.24,iridescence:1.2,iridescenceIOR:1.4,iridescenceThicknessRange:[.001,.001]}];
   for(const settings of styles)for(const perspective of [false,true]){
    const props={color:0x98b4ca,envMapIntensity:.8,...settings};f.mesh.material=f.physical({...props,envMap:f.map});reference.mesh.material=reference.physical({...props,envMap:reference.map});
    const camera=f.camera(perspective,true),refCamera=reference.camera(perspective,true),actual=await f.draw(camera),expected=await reference.draw(refCamera);let components=null;if(settings.iridescence){f.light.visible=reference.light.visible=false;const environmentOnly=[await f.draw(camera),await reference.draw(refCamera)];f.light.visible=reference.light.visible=true;f.mesh.material.envMapIntensity=reference.mesh.material.envMapIntensity=0;const directOnly=[await f.draw(camera),await reference.draw(refCamera)];f.mesh.material.envMapIntensity=reference.mesh.material.envMapIntensity=.8;components={environment:environmentOnly.map(p=>p.slice(0,3)),direct:directOnly.map(p=>p.slice(0,3))};}
    for(let x=0;x<4;x++)for(let c=0;c<3;c++){const error=Math.abs(actual[x*4+c]-expected[x*4+c]);physicalError=Math.max(physicalError,error);if(!Number.isFinite(actual[x*4+c])||error>Math.max(.002,Math.abs(expected[x*4+c])*.006))throw Error('physical lobe view '+JSON.stringify({backend,settings,perspective,x,components,actual:actual.slice(x*4,x*4+3),expected:expected.slice(x*4,x*4+3)}));if(!perspective){const d=Math.abs(actual[x*4+c]-actual[c]);invarianceError=Math.max(invarianceError,d);if(d>2e-5)throw Error('orthographic physical view varies over a uniform plane');}}
    physicalCases++;camera.removeFromParent();refCamera.removeFromParent();f.mesh.material.dispose();reference.mesh.material.dispose();
   }
   results.push({backend,originalError,vectorCases,physicalCases,vectorError,physicalError,invarianceError});
  }finally{f.dispose();}
 }}finally{reference.dispose();}
 return results;
}
