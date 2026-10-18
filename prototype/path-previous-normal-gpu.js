import {previousRayGPU} from './ray-previous-gpu.js';
import {gpuFn} from './gpu-function-scope.js';
import * as T from 'three/tsl';

export function previousNormalGPU(transport,u){
 const prior=previousRayGPU(transport,u),load=transport.load,ray=transport.ray;
 const evaluate=gpuFn(([id,point,view,width])=>{
  const result=T.vec3(0).toVar(),at=ray.attributes(id).toVar();
  T.If(u.pathFilter.w.greaterThan(0).and(load(u.pathFilter.w.add(id.mul(3))).w.greaterThan(.5).and(load(u.pathFilter.w.add(id.mul(3)).add(1)).xyz.cross(load(u.pathFilter.w.add(id.mul(3)).add(2)).xyz).length().greaterThanEqual(1e-10))),()=>{
   const encoded=load(at.add(3)).w,old=load(at.add(4)).w;
   T.If(at.lessThanEqual(0).or(encoded.notEqual(-2).and(encoded.greaterThanEqual(-.5).and(encoded.lessThanEqual(0)).or(old.greaterThan(0)))),()=>{result.assign(prior.normalTime(id,point,view,width,u.forward.w));});
  });return result;
 }).setLayout({name:'hbPathCommittedNormal',type:'vec3',inputs:[{name:'id',type:'float'},{name:'point',type:'vec3'},{name:'view',type:'vec3'},{name:'width',type:'float'}]});
 // Existing callers may omit the context only when geometry/view/footprint are unchanged.
 return (id,point,normal,view,width,oldPoint=point,oldView=view,oldWidth=width)=>evaluate(id,oldPoint,oldView,oldWidth);
}
