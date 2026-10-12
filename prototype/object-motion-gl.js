import {Color,Matrix4,Vector4,WebGLRenderTarget,HalfFloatType,ShaderMaterial} from 'three';

export class ObjectMotionPass{
 constructor(){
  this.target=new WebGLRenderTarget(1,1,{type:HalfFloatType,depthBuffer:true});
  const uniforms={hbPreviousMVP:{value:new Matrix4()},hbFlag:{value:0},hbIgnore:{value:0},hbJitter:{value:new Vector4()},hbMap:{value:null},hbHasMap:{value:0},hbAlpha:{value:1},hbCutoff:{value:0}};
  this.material=new ShaderMaterial({uniforms,depthTest:true,depthWrite:true,toneMapped:false,vertexShader:`#include <common>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
uniform mat4 hbPreviousMVP;varying vec4 hbPreviousClip,hbCurrentClip;varying vec2 hbUv;void main(){hbUv=uv;vec3 transformed=position;
#include <morphinstance_vertex>
#include <morphtarget_vertex>
#include <skinbase_vertex>
#include <skinning_vertex>
hbPreviousClip=hbPreviousMVP*vec4(transformed,1.0);
#include <project_vertex>
hbCurrentClip=gl_Position;}`,fragmentShader:'uniform float hbFlag,hbIgnore,hbHasMap,hbAlpha,hbCutoff;uniform vec4 hbJitter;uniform sampler2D hbMap;varying vec4 hbPreviousClip,hbCurrentClip;varying vec2 hbUv;void main(){if(hbIgnore>.5)discard;float a=hbAlpha;if(hbHasMap>.5)a*=texture2D(hbMap,hbUv).a;if(a<hbCutoff)discard;vec3 now=hbCurrentClip.xyz/hbCurrentClip.w*.5+.5,old=hbPreviousClip.xyz/max(.000001,hbPreviousClip.w)*.5+.5;if(hbFlag>1.5)old=vec3(now.xy-hbJitter.xy+hbJitter.zw,now.z);gl_FragColor=vec4(old,hbFlag>1.5?2.0+now.z:sign(hbFlag)*max(.000001,now.z));}'});
 }
 render(renderer,scene,camera,frame){
  const u=this.material.uniforms,previousVP=new Matrix4().fromArray(frame.packed.previousVP);u.hbJitter.value.fromArray(frame.packed.jitter);
  this.material.onBeforeRender=(r,s,c,g,object,group)=>{const source=Array.isArray(object.material)?object.material[group?.materialIndex||0]:object.material,value=frame.objects.get(object);u.hbFlag.value=value.flag;u.hbIgnore.value=!source||source.transparent||!object.isMesh||object.userData.sprite||object.userData.draw2d||source.isShaderMaterial?1:0;u.hbPreviousMVP.value.multiplyMatrices(previousVP,value.world);u.hbMap.value=source?.map||null;u.hbHasMap.value=source?.map?1:0;u.hbAlpha.value=source?.opacity??1;u.hbCutoff.value=source?.alphaTest??0;this.material.side=source?.side??0;this.material.uniformsNeedUpdate=true;};
  const target=renderer.getRenderTarget(),override=scene.overrideMaterial,background=scene.background,alpha=renderer.getClearAlpha(),color=renderer.getClearColor(new Color()),autoClear=renderer.autoClear;
  try{scene.overrideMaterial=this.material;scene.background=null;renderer.autoClear=true;renderer.setClearColor(0,0);renderer.setRenderTarget(this.target);renderer.render(scene,camera);}finally{scene.overrideMaterial=override;scene.background=background;renderer.autoClear=autoClear;renderer.setClearColor(color,alpha);renderer.setRenderTarget(target);this.material.onBeforeRender=()=>{};}
 }
 setSize(w,h){this.target.setSize(w,h);}
 dispose(){this.target.dispose();this.material.dispose();}
}
