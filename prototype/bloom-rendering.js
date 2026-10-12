import {Vector2,Vector3,Vector4,DepthTexture,FloatType,WebGLRenderTarget,HalfFloatType,ShaderMaterial} from 'three';
import {hasTransmission} from './refraction-rendering.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {FullScreenQuad} from 'three/addons/postprocessing/Pass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {FXAAShader} from 'three/addons/shaders/FXAAShader.js';
import {postProcessSettings,packedPostProcess,postUniformNames,postGLSL,screenPostGLSL,meterGLSL,lookupSize} from './post-processing.js';

export function bloomSettings(objects,camera,worldFor){const p=postProcessSettings(objects,camera,worldFor);return p?.bloomEnabled&&p.bloomStrength>0?p:null;}
const vertexShader='varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}';
const lookupGLSL=screenPostGLSL.slice(screenPostGLSL.indexOf('vec3 hbLookupColor'),screenPostGLSL.indexOf('vec3 hbGradeColor'));
// One lazy pipeline per viewport; auto exposure owns only two 1x1 textures.
export class BloomRendering{
 constructor(){this.views=new Map();this.rect=new Vector4();this.eye=new Vector3();}
 render(renderer,scene,camera,objects){
  const p=postProcessSettings(objects,camera.getWorldPosition(this.eye),scene.userData.hbPostWorld)||(hasTransmission(scene)?{bloomStrength:0,bloomRadius:0,bloomThreshold:1,bloomResolutionScale:.5}:null);let view=this.views.get(renderer);const bloomOn=!!(p?.bloomEnabled!==false&&p?.bloomStrength>0);
  if(!p){if(view){this.release(view);this.views.delete(renderer);}renderer.render(scene,camera);return;}
  renderer.getViewport(this.rect);const ratio=renderer.getPixelRatio(),w=Math.max(1,Math.round(this.rect.z*ratio)),h=Math.max(1,Math.round(this.rect.w*ratio));
  if(!view){
   const composer=new EffectComposer(renderer),render=new RenderPass(scene,camera),output=new OutputPass(),aa=new ShaderPass(FXAAShader),uniforms=Object.fromEntries(Object.entries(packedPostProcess()).map(([k,v])=>[postUniformNames[k],{value:new Vector4(...v)}]));composer.setPixelRatio(1);aa.uniforms.hbAAAmount={value:1};aa.material.fragmentShader='uniform float hbAAAmount;'+aa.material.fragmentShader.replace('gl_FragColor = ApplyFXAA( tDiffuse, resolution.xy, vUv );','gl_FragColor = mix(texture2D(tDiffuse,vUv),ApplyFXAA(tDiffuse,resolution.xy,vUv),hbAAAmount);');
   Object.assign(uniforms,{tDiffuse:{value:null},hbPostSize:{value:new Vector2()},hbDepth:{value:null},hbLookupMap:{value:null},hbExposureMap:{value:null}});
   const post=new ShaderPass({uniforms,vertexShader,fragmentShader:'uniform sampler2D tDiffuse;varying vec2 vUv;'+postGLSL+'\nvoid main(){gl_FragColor=hbPostColor(tDiffuse,vUv);}'});
   Object.assign(output.uniforms,{hbLookup:post.uniforms.hbLookup,hbLookupMap:post.uniforms.hbLookupMap});output.material.fragmentShader='precision highp float;uniform vec4 hbLookup;uniform sampler2D hbLookupMap;'+lookupGLSL+output.material.fragmentShader.replace('// color space','gl_FragColor.rgb=hbLookupColor(gl_FragColor.rgb);\n// color space');
   composer.addPass(render);composer.addPass(post);composer.addPass(output);composer.addPass(aa);
   for(const target of [composer.renderTarget1,composer.renderTarget2]){target.depthTexture=new DepthTexture(w,h,FloatType);target.texture.userData.hbRefractionScene=true;}
   view={composer,render,post,output,aa,bloom:null,width:0,height:0,scale:0,time:0,scene,camera,meter:null};
   const draw=render.render.bind(render);render.render=(r,write,read,...args)=>{draw(r,write,read,...args);post.uniforms.hbDepth.value=read.depthTexture;if(view.meter){const m=view.meter,old=r.getRenderTarget();m.material.uniforms.hbMeterSource.value=read.texture;m.material.uniforms.hbPreviousExposure.value=m.images[m.index].texture;r.setRenderTarget(m.images[1-m.index]);m.quad.render(r);r.setRenderTarget(old);m.index=1-m.index;post.uniforms.hbExposureMap.value=m.images[m.index].texture;post.uniforms.hbAdapt.value.w=1;}};
   this.views.set(renderer,view);
  }
  if(bloomOn&&!view.bloom){view.bloom=new UnrealBloomPass(new Vector2(w,h),p.bloomStrength,p.bloomRadius,p.bloomThreshold);view.composer.insertPass(view.bloom,1);}else if(!bloomOn&&view.bloom){view.composer.removePass(view.bloom);view.bloom.dispose();view.bloom=null;}
  const time=scene.userData.hbMaterialTime||0,reset=view.width!==w||view.height!==h||view.scene!==scene||view.camera!==camera||time<view.time;
  if(view.width!==w||view.height!==h){view.composer.setSize(w,h);view.width=w;view.height=h;}
  if(view.bloom&&(view.scale!==p.bloomResolutionScale||view.bloom.resolution.x!==w*p.bloomResolutionScale||view.bloom.resolution.y!==h*p.bloomResolutionScale)){view.bloom.resolution.set(w*p.bloomResolutionScale,h*p.bloomResolutionScale);view.bloom.setSize(Math.max(1,Math.round(w*p.bloomResolutionScale)),Math.max(1,Math.round(h*p.bloomResolutionScale)));view.scale=p.bloomResolutionScale;}
  view.scene=scene;view.camera=camera;view.render.scene=scene;view.render.camera=camera;if(view.bloom){view.bloom.strength=p.bloomStrength;view.bloom.radius=p.bloomRadius;view.bloom.threshold=p.bloomThreshold;}
  const packed=packedPostProcess(p,time,camera),map=scene.userData.hbPostLookup?.(p.colorLookup);packed.lookup[1]=lookupSize(map);packed.adapt[2]=Math.min(.1,Math.max(0,time-view.time));packed.adapt[3]=view.meter&&!reset?1:0;
  for(const [k,v]of Object.entries(packed))view.post.uniforms[postUniformNames[k]].value.fromArray(v);view.post.uniforms.hbPostSize.value.set(w,h);view.post.uniforms.hbLookupMap.value=map||null;
  if(p.autoExposureEnabled&&!view.meter){const material=new ShaderMaterial({uniforms:{hbMeterSource:{value:null},hbPreviousExposure:{value:null},hbExposure:view.post.uniforms.hbExposure,hbAdapt:view.post.uniforms.hbAdapt},vertexShader,fragmentShader:meterGLSL,depthTest:false,depthWrite:false,toneMapped:false}),images=[0,1].map(()=>new WebGLRenderTarget(1,1,{type:HalfFloatType,depthBuffer:false}));view.meter={material,quad:new FullScreenQuad(material),images,index:0};}else if(!p.autoExposureEnabled&&view.meter){this.releaseMeter(view);}
  view.aa.enabled=p.antiAliasing==='fxaa'&&p.aaStrength>0;view.aa.uniforms.resolution.value.set(1/w,1/h);view.aa.uniforms.hbAAAmount.value=p.aaStrength??0;view.time=time;view.composer.render();
 }
 releaseMeter(view){view.meter?.images.forEach(t=>t.dispose());view.meter?.material.dispose();view.meter?.quad.dispose();view.meter=null;}
 release(view){this.releaseMeter(view);view.composer.dispose();view.render.dispose();view.bloom?.dispose();view.post.dispose();view.output.dispose();view.aa.dispose();}
 disposeRenderer(renderer){const view=this.views.get(renderer);if(view){this.release(view);this.views.delete(renderer);}}
 dispose(){for(const view of this.views.values())this.release(view);this.views.clear();}
}
