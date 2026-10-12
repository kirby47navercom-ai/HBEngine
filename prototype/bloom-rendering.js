import {Vector2,Vector4,DepthTexture,FloatType} from 'three';
import {hasTransmission} from './refraction-rendering.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {postProcessSettings,packedPostProcess,postGLSL} from './post-processing.js';
import {enabledComponent} from './scene-components.js';

export function bloomSettings(objects){
  let selected;
  for(const object of objects){const p=enabledComponent(object,'PostProcessVolume');if(object.visible!==false&&object.poolActive!==false&&p&&(!selected||p.priority>selected.priority))selected=p;}
  return selected?.bloomEnabled&&selected.bloomStrength>0?selected:null;
}

// One lazy pipeline per actual viewport; disabled bloom owns no render targets.
export class BloomRendering{
  constructor(){this.views=new Map();this.rect=new Vector4();}
  render(renderer,scene,camera,objects){
    const p=postProcessSettings(objects)|| (hasTransmission(scene)?{bloomStrength:0,bloomRadius:0,bloomThreshold:1,bloomResolutionScale:.5}:null);let view=this.views.get(renderer);const bloomOn=!!(p?.bloomEnabled!==false&&p?.bloomStrength>0);
    if(p&&renderer.hbBackend==='d3d11')throw Error('DirectX 블룸 패스 변환이 필요해요.');if(!p){if(view){this.release(view);this.views.delete(renderer);}renderer.render(scene,camera);return;}
    renderer.getViewport(this.rect);const ratio=renderer.getPixelRatio(),w=Math.max(1,Math.round(this.rect.z*ratio)),h=Math.max(1,Math.round(this.rect.w*ratio));
    if(!view){const composer=new EffectComposer(renderer),render=new RenderPass(scene,camera),bloom=bloomOn?new UnrealBloomPass(new Vector2(w,h),p.bloomStrength,p.bloomRadius,p.bloomThreshold):null,output=new OutputPass();composer.setPixelRatio(1);const packed=packedPostProcess(p),post=new ShaderPass({uniforms:{tDiffuse:{value:null},...Object.fromEntries(Object.entries(packed).map(([k,v])=>[({grade:'hbGrade',filter:'hbFilter',effects:'hbPostEffects',vignette:'hbVignette',vignetteColor:'hbVignetteColor'})[k],{value:new Vector4(...v)}])),hbPostSize:{value:new Vector2(w,h)}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'uniform sampler2D tDiffuse;varying vec2 vUv;'+postGLSL+'\nvoid main(){gl_FragColor=hbPostColor(tDiffuse,vUv);}'});composer.addPass(render);if(bloom)composer.addPass(bloom);composer.addPass(post);composer.addPass(output);for(const target of [composer.renderTarget1,composer.renderTarget2]){target.depthTexture=new DepthTexture(w,h,FloatType);target.texture.userData.hbRefractionScene=true;}view={composer,render,bloom,post,output,width:0,height:0,scale:0};this.views.set(renderer,view);}
    if(bloomOn&&!view.bloom){view.bloom=new UnrealBloomPass(new Vector2(w,h),p.bloomStrength,p.bloomRadius,p.bloomThreshold);view.composer.insertPass(view.bloom,1);}else if(!bloomOn&&view.bloom){view.composer.removePass(view.bloom);view.bloom.dispose();view.bloom=null;}
    if(view.width!==w||view.height!==h){view.composer.setSize(w,h);view.width=w;view.height=h;}
    if(view.bloom&&(view.scale!==p.bloomResolutionScale||view.bloom.resolution.x!==w*p.bloomResolutionScale||view.bloom.resolution.y!==h*p.bloomResolutionScale)){view.bloom.resolution.set(w*p.bloomResolutionScale,h*p.bloomResolutionScale);view.bloom.setSize(Math.max(1,Math.round(w*p.bloomResolutionScale)),Math.max(1,Math.round(h*p.bloomResolutionScale)));view.scale=p.bloomResolutionScale;}
    view.render.scene=scene;view.render.camera=camera;if(view.bloom){view.bloom.strength=p.bloomStrength;view.bloom.radius=p.bloomRadius;view.bloom.threshold=p.bloomThreshold;}const packed=packedPostProcess(p,scene.userData.hbMaterialTime||0);for(const [k,v]of Object.entries(packed))view.post.uniforms[({grade:'hbGrade',filter:'hbFilter',effects:'hbPostEffects',vignette:'hbVignette',vignetteColor:'hbVignetteColor'})[k]].value.fromArray(v);view.post.uniforms.hbPostSize.value.set(w,h);view.post.enabled=!!(p.colorGradingEnabled||packed.effects.some((v,i)=>i!==1&&v>0));
    view.composer.render();
  }
  release(view){view.composer.dispose();view.render.dispose();view.bloom?.dispose();view.post.dispose();view.output.dispose();}
  disposeRenderer(renderer){const view=this.views.get(renderer);if(view){this.release(view);this.views.delete(renderer);}}
  dispose(){for(const view of this.views.values())this.release(view);this.views.clear();}
}
