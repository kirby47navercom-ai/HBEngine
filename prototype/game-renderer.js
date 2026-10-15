import {gpuPathPreparationInfo} from './gpu-path-preparation.js';
import {sharedRayInfo} from './shared-ray-geometry.js';
import * as THREE from 'three';
import {installGPURefractionCopy} from './gpu-refraction-copy.js';

export async function createGameRenderer(canvas,backend='webgl2',onError){
  if(backend==='d3d11'){const renderer=await(await import('./native-scene-renderer.js')).createNativeSceneRenderer(canvas,onError);renderer.setPixelRatio(Math.min(devicePixelRatio,2));return renderer;}
  if(!['webgl2','webgpu'].includes(backend))throw Error('실행 렌더러 설정 오류');
  const renderer=backend==='webgpu'?await(await import('./gpu-particles.js')).createGPURenderer(canvas):new THREE.WebGLRenderer({canvas,antialias:true});
  renderer.hbBackend=backend;renderer.hbOnError=onError;renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;
  // The game/editor owns its frame loop; Three's separate RAF must not erase
  // counters between a completed frame and the profiler reading them.
  renderer.info.autoReset=false;
  if(backend==='webgpu')installGPURefractionCopy(renderer);
  if(backend==='webgl2'){const opaque=(a,b)=>a.groupOrder-b.groupOrder||a.renderOrder-b.renderOrder||(a.material.transmission>0&&b.material.transmission>0?b.z-a.z:a.material.id-b.material.id||a.z-b.z)||a.id-b.id;renderer.setOpaqueSort(opaque);}
  return renderer;
}
export function checkGPUScene(renderer,data){
  if(renderer.hbBackend!=='webgpu')return;
  if(data.runtime?.renderBackend&&data.runtime.renderBackend!=='webgpu')throw Error('장면 이동에서는 실행 렌더러를 바꿀 수 없어요.');
}
export function finishGameRendererFrame(renderer){renderer.hbFrameInfo={render:{...renderer.info.render},compute:{...renderer.info.compute}};}
export function gameRendererCompilationInfo(renderer){
 if(!renderer)return null;
 return {backend:renderer.hbBackend,pipelinePreparation:gpuPathPreparationInfo(renderer.hbPathPreparation),shaderCompilation:renderer.hbBackend==='d3d11'?renderer.hbDiagnostics().shaderCompilation||null:null};
}
export function gameRendererInfo(renderer){
  if(renderer.hbBackend==='d3d11')return renderer.hbDiagnostics();
  const completed=renderer.hbFrameInfo,info={...(completed?.render||renderer.info.render)};
  if(renderer.hbBackend==='webgpu'){const device=renderer.backend.device;info.calls=renderer.info.render.calls;return {backend:'WebGPU',pipelinePreparation:gpuPathPreparationInfo(renderer.hbPathPreparation),rayGeometry:sharedRayInfo(renderer.hbGeometryWorld?.packed),rayAtlasUpload:{...renderer.hbRayAtlasUpload},probes:renderer.hbProbeResources,framebufferTextures:renderer.hbFramebufferTextures?.size||0,adapter:device.adapterInfo,vendor:device.adapterInfo?.vendor,renderer:device.adapterInfo?.architecture,errors:[...renderer.hbGPUErrors],info,compute:{...renderer.info.compute,frameCalls:completed?.compute.frameCalls??renderer.info.compute.frameCalls},particleResources:{...renderer.hbParticleResources},memory:{...renderer.info.memory}};}
  const gl=renderer.getContext();return {backend:'WebGL2',rayGeometry:sharedRayInfo(renderer.hbGeometryWorld?.packed),refraction:renderer.hbRefractionResources,probes:renderer.hbProbeResources,programs:renderer.info.programs.map(p=>({runnable:p.diagnostics?.runnable!==false})),vendor:gl.getParameter(gl.VENDOR),renderer:gl.getParameter(gl.RENDERER),info,memory:{...renderer.info.memory}};
}
