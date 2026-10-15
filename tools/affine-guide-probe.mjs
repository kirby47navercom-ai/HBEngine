import assert from 'node:assert/strict';
import {virtualGuideGLSL,virtualGuideFrame,virtualGuidePoint,appendVirtualGuideFrame} from '../prototype/path-guide-affine.js';

export function affineGuideCases(){
 let seed=145;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296)*2-1;
 return [0,1,2,3,4,8,12,16].map((count,index)=>{const point=Array.from({length:3},random),events=Array.from({length:count},(_,j)=>{const n=Array.from({length:3},random),length=Math.hypot(...n);return {point:Array.from({length:3},()=>random()*2),normal:n.map(v=>v/length),eta:.7+(random()+1)*.3,reflection:index%3===0||j%3!==0};});return {point,events};});
}
export function reverseGuidePoint({point,events}){
 const result=[...point];for(let j=events.length-1;j>=0;j--){const e=events[j],delta=result.map((v,i)=>v-e.point[i]),dot=delta.reduce((sum,v,i)=>sum+v*e.normal[i],0);for(let i=0;i<3;i++)result[i]=e.point[i]+(e.reflection?delta[i]-2*e.normal[i]*dot:delta[i]*e.eta);}return result;
}
export async function checkAffineGuide(evaluate,backend){
 if(!['WebGPU','WebGL2'].includes(backend))return null;
 const cases=affineGuideCases(),read=await evaluate(`(async()=>{
 const cases=${JSON.stringify(cases)},results=[];
 if(${JSON.stringify(backend)}==='WebGPU'){
  const G=await import('three/webgpu'),T=await import('three/tsl'),virtualGuideFrame=${virtualGuideFrame},virtualGuidePoint=${virtualGuidePoint},appendVirtualGuideFrame=${appendVirtualGuideFrame};
  const renderer=new G.WebGPURenderer({antialias:false}),target=new G.RenderTarget(1,1,{type:G.FloatType,depthBuffer:false}),data=Array.from({length:32},()=>new G.Vector4()),ops=T.uniformArray(data,'vec4'),point=T.uniform(new G.Vector3()),count=T.uniform(0),material=new G.MeshBasicNodeMaterial();renderer.setSize(1,1);renderer.toneMapping=G.NoToneMapping;
  material.fragmentNode=T.Fn(()=>{const f=virtualGuideFrame();T.Loop({start:0,end:T.int(count),type:'int'},({i})=>{const p=ops.element(i.mul(2)).toVar(),n=ops.element(i.mul(2).add(1)).toVar();appendVirtualGuideFrame(f,p.xyz,n.xyz,p.w,n.w.greaterThan(.5));});return T.vec4(virtualGuidePoint(f,point),1);})();const quad=new G.QuadMesh(material);
  try{await renderer.init();renderer.setRenderTarget(target);await renderer.compileAsync(quad,quad.camera);for(const c of cases){point.value.fromArray(c.point);count.value=c.events.length;c.events.forEach((e,i)=>{data[i*2].set(...e.point,e.eta);data[i*2+1].set(...e.normal,e.reflection?1:0);});quad.render(renderer);results.push([...(await renderer.readRenderTargetPixelsAsync(target,0,0,1,1))].slice(0,3));}}finally{target.dispose();material.dispose();renderer.dispose();}
 }else{
  const G=await import('three'),renderer=new G.WebGLRenderer({antialias:false}),target=new G.WebGLRenderTarget(1,1,{type:G.FloatType,depthBuffer:false}),data=Array.from({length:32},()=>new G.Vector4()),point=new G.Vector3(),material=new G.RawShaderMaterial({glslVersion:G.GLSL3,uniforms:{data:{value:data},point:{value:point},count:{value:0}},vertexShader:'precision highp float;in vec3 position;void main(){gl_Position=vec4(position,1);}',fragmentShader:'precision highp float;uniform vec4 data[32];uniform vec3 point;uniform int count;out vec4 color;'+${JSON.stringify(virtualGuideGLSL)}+'void main(){HBPathVirtualFrame f=hbPathVirtualIdentity();for(int i=0;i<count;i++)hbPathVirtualAppend(f,data[i*2].xyz,data[i*2+1].xyz,data[i*2].w,data[i*2+1].w>.5);color=vec4(hbPathVirtualPoint(f,point),1);}' }),geometry=new G.PlaneGeometry(2,2),scene=new G.Scene();scene.add(new G.Mesh(geometry,material));renderer.setSize(1,1);renderer.setRenderTarget(target);
  try{for(const c of cases){point.fromArray(c.point);material.uniforms.count.value=c.events.length;c.events.forEach((e,i)=>{data[i*2].set(...e.point,e.eta);data[i*2+1].set(...e.normal,e.reflection?1:0);});renderer.render(scene,new G.Camera());const pixels=new Float32Array(4);renderer.readRenderTargetPixels(target,0,0,1,1,pixels);results.push([...pixels].slice(0,3));}if(renderer.getContext().getError()!==0)throw Error('affine probe GL error');}finally{target.dispose();geometry.dispose();material.dispose();renderer.dispose();renderer.forceContextLoss();}
 }return results;
})()`);
 let maxError=0;for(let j=0;j<cases.length;j++){const expected=reverseGuidePoint(cases[j]);for(let i=0;i<3;i++){const error=Math.abs(read[j][i]-expected[i]);maxError=Math.max(maxError,error);assert.ok(error<=.0001*Math.max(1,Math.abs(expected[i])),JSON.stringify({backend,j,i,expected,actual:read[j]}));}}
 return {passed:true,cases:cases.length,components:cases.length*3,maxBounces:16,maxError,reference:'Independent reverse plane reflection/refraction walk',float32Readback:true};
}
