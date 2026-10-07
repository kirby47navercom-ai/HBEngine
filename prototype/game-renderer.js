import * as THREE from 'three';
import {objectComponents,componentDefaults} from './scene-components.js';

export async function createGameRenderer(canvas,backend='webgl2',onError){
  if(!['webgl2','webgpu'].includes(backend))throw Error('실행 렌더러 설정 오류');
  const renderer=backend==='webgpu'?await(await import('./gpu-particles.js')).createGPURenderer(canvas):new THREE.WebGLRenderer({canvas,antialias:true});
  renderer.hbBackend=backend;renderer.hbOnError=onError;renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;
  return renderer;
}
export function checkGPUObject(renderer,object){
  if(renderer?.hbBackend!=='webgpu')return;
  const reject=feature=>{throw Error(object.name+': '+feature+'은 WebGL2 렌더러를 사용하세요.');};
  for(const component of objectComponents(object)){
    const p={...componentDefaults(component.type),...component.properties};if(p.enabled===false)continue;
    if(['Light2D','ShadowCaster2D','CompositeShadowCaster2D'].includes(component.type))reject(component.type);
    if(['SpriteRenderer','TilemapRenderer'].includes(component.type)&&p.shading==='lit2d')reject('2D 조명');
    if(component.type==='ParticleSystem'&&p.sortMode!=='none')reject('입자 정렬');
  }
}
export function checkGPUScene(renderer,data){
  if(renderer.hbBackend!=='webgpu')return;
  if(data.runtime?.renderBackend&&data.runtime.renderBackend!=='webgpu')throw Error('장면 이동에서는 실행 렌더러를 바꿀 수 없어요.');
  data.objects.forEach(object=>checkGPUObject(renderer,object));
}
export function gameRendererInfo(renderer){
  if(renderer.hbBackend==='webgpu'){const device=renderer.backend.device;return {backend:'WebGPU',framebufferTextures:renderer.hbFramebufferTextures?.size||0,adapter:device.adapterInfo,vendor:device.adapterInfo?.vendor,renderer:device.adapterInfo?.architecture,errors:[...renderer.hbGPUErrors],info:{...renderer.info.render},compute:{...renderer.info.compute},particleResources:{...renderer.hbParticleResources},memory:{...renderer.info.memory}};}
  const gl=renderer.getContext();return {backend:'WebGL2',programs:renderer.info.programs.map(p=>({runnable:p.diagnostics?.runnable!==false})),vendor:gl.getParameter(gl.VENDOR),renderer:gl.getParameter(gl.RENDERER),info:{...renderer.info.render},memory:{...renderer.info.memory}};
}
