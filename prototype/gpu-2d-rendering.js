import {gpuLight2DUniforms} from './gpu-2d-lighting.js';
import {MeshBasicNodeMaterial,MeshStandardNodeMaterial,DataTexture,DoubleSide,Color,Vector2,AdditiveBlending,NormalBlending,RenderTarget} from 'three/webgpu';
import {Fn,If,uniform,texture,vec3,vec4,positionLocal,modelViewMatrix,modelWorldMatrixInverse,cameraWorldMatrix,screenUV,diffuseColor,mix,float,materialReference} from 'three/tsl';

export function gpuSpriteMask(material){
  if(material.userData.hbSpriteMask)return material.userData.hbSpriteMask;
  const fallback=new DataTexture(new Uint8Array([255,255,255,255]),1,1);fallback.needsUpdate=true;
  const map=texture(fallback,screenUV),mode=uniform(0),size=uniform(new Vector2(1,1));
  material.maskNode=mode.lessThan(.5).or(mode.lessThan(1.5).select(map.r.greaterThanEqual(.5),map.r.lessThan(.5)));
  material.userData.hbGPU=true;material.userData.hbMaskFallback=fallback;material.userData.hbSpriteMask={hbSpriteMask:map,hbSpriteMaskMode:mode,hbSpriteMaskSize:size};
  const dispose=material.dispose.bind(material);let released=false;material.dispose=()=>{if(released)return;released=true;fallback.dispose();dispose();};return material.userData.hbSpriteMask;
}

export function createGPUSpriteMaterial(map,p,normalMap,lightingTextures){
  const tint=p.color||[1,1,1,1],mode=p.blendMode||'translucent',lit=['lit','lit2d'].includes(p.shading);
  const material=new (lit?MeshStandardNodeMaterial:MeshBasicNodeMaterial)({map,color:new Color(...tint.slice(0,3)),opacity:tint[3],transparent:['translucent','additive'].includes(mode),blending:mode==='additive'?AdditiveBlending:NormalBlending,alphaTest:mode==='masked'?(p.alphaCutoff??.5):0,side:DoubleSide,depthWrite:!['translucent','additive'].includes(mode)});
  if(lit&&normalMap){material.normalMap=normalMap;const strength=p.normalStrength??1;material.normalScale.set(strength,p.normalFlipY?-strength:strength);}
  const ppu=uniform(0),flash=uniform(0),emission=uniform(p.emissiveIntensity||0);
  material.positionNode=Fn(()=>{const local=positionLocal.toVar(),view=modelViewMatrix.mul(vec4(local,1)).toVar();If(ppu.greaterThan(0),()=>{const snapped=vec4(view.xy.mul(ppu).add(.5).floor().div(ppu),view.zw);local.assign(modelWorldMatrixInverse.mul(cameraWorldMatrix).mul(snapped).xyz);});return local;})();
  const output=material.setupOutput.bind(material);material.setupOutput=(builder,value)=>output(builder,vec4(mix(value.rgb.add(diffuseColor.rgb.mul(emission)),vec3(1),flash.clamp(0,1)),value.a));
  material.userData.hbGPU=true;material.userData.hbSpriteEffectsOwner=material.uuid;material.userData.hbSpriteEffects={hbPixelPPU:ppu,hbSpriteFlash:flash,hbSpriteEmission:emission};
  if(p.shading==='lit2d')gpuLight2DUniforms(material,lightingTextures);
  if(['inside','outside'].includes(p.maskInteraction))gpuSpriteMask(material);
  material.clone=()=>createGPUSpriteMaterial(map,p,normalMap,lightingTextures);return material;
}

export function createGPUMaskMaterial(map,alphaCutoff){
  const material=new MeshBasicNodeMaterial({map,color:'#ffffff',alphaTest:alphaCutoff,side:DoubleSide,depthTest:false,depthWrite:false,toneMapped:false});
  // The shared mask includes alpha equal to the cutoff; NodeMaterial's stock test uses <=.
  material.colorNode=vec3(1);material.alphaTestNode=float(-1);material.maskNode=(map?materialReference('map','texture').a:float(1)).greaterThanEqual(materialReference('alphaTest','float'));return material;
}

export const gpuMaskTarget=(w,h,options)=>new RenderTarget(w,h,options);
