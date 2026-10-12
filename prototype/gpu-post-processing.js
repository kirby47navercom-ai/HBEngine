import {Vector4} from 'three/webgpu';
import * as T from 'three/tsl';
import {packedPostProcess} from './post-processing.js';

export function gpuPostProcessing(source,chromatic){
  const uniforms=Object.fromEntries(Object.entries(packedPostProcess()).map(([k,v])=>[k,T.uniform(new Vector4(...v))]));
  const {grade,filter,effects,vignette,vignetteColor}=uniforms,uv=T.uv(),input=chromatic?T.convertToTexture(source):source;
  let c=input.rgb;
  if(chromatic){const delta=uv.sub(.5).mul(effects.z.mul(.015));c=T.vec3(input.sample(uv.add(delta).clamp(0,1)).r,input.sample(uv).g,input.sample(uv.sub(delta).clamp(0,1)).b);}
  c=c.mul(grade.x.exp2()).mul(filter.rgb).sub(.18).mul(grade.y).add(.18).max(0);
  const y=c.dot(T.vec3(.2126,.7152,.0722));c=T.mix(T.vec3(y),c,grade.z);
  const axis=T.vec3(.577350269),a=grade.w;c=c.mul(a.cos()).add(axis.cross(c).mul(a.sin())).add(axis.mul(axis.dot(c)).mul(T.float(1).sub(a.cos()))).max(0);
  const d=uv.sub(vignette.xy).mul(2),radius=T.vec2(d.x.mul(vignette.z.greaterThan(.5).select(T.screenSize.x.div(T.screenSize.y),1)),d.y).length(),fade=radius.smoothstep(T.float(1).sub(effects.y.max(.001)),1).mul(effects.x);
  c=T.mix(c,vignetteColor.rgb,fade);
  const noise=uv.mul(T.screenSize).floor().add(vignette.w.mul(60).floor()).dot(T.vec2(12.9898,78.233)).sin().mul(43758.5453).fract().sub(.5);
  return {node:T.vec4(c.add(noise.mul(effects.w.mul(.08))).max(0),input.a),dispose(){if(input.isRTTNode){input.renderTarget.dispose();input._quadMesh?.material.dispose();}},update(p,time){for(const [k,v] of Object.entries(packedPostProcess(p,time)))uniforms[k].value.fromArray(v);}};
}
