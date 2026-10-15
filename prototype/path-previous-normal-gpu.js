import {tangentGuideGPU} from './path-tangent-guide.js';
import {gpuFn} from './gpu-function-scope.js';import * as T from 'three/tsl';
export function previousNormalGPU(transport,u){
 const load=transport.load,ray=transport.ray,tangent=tangentGuideGPU(transport,u);
 return gpuFn(([id,point,normal])=>{
  const result=T.vec3(0).toVar(),prior=T.vec3(0).toVar(),smoothValue=T.vec3(0).toVar(),mappedMode=T.bool(false).toVar(),attributes=ray.attributes(id).toVar(),current=load(attributes.add(3)).w.toVar(),old=load(attributes.add(4)).w.toVar();
  T.If(attributes.greaterThan(0).and(current.greaterThan(-1.5)).and(current.lessThan(-.5).or(current.greaterThan(0))).and(old.greaterThan(0)),()=>{
   const weights=ray.bary(id,point).toVar(),raw=load(attributes.add(2)).xyz.mul(weights.x).add(load(attributes.add(3)).xyz.mul(weights.y)).add(load(attributes.add(4)).xyz.mul(weights.z)).toVar();
   T.If(raw.length().greaterThan(1e-10),()=>{
    smoothValue.assign(raw.normalize().mul(raw.dot(ray.geometric(id)).lessThan(0).select(-1,1)));mappedMode.assign(load(load(attributes.add(1)).z.add(7)).z.greaterThan(.5));
    T.If(current.lessThan(-.5),()=>{
     prior.assign(load(old).xyz.mul(weights.x).add(load(old.add(1)).xyz.mul(weights.y)).add(load(old.add(2)).xyz.mul(weights.z)));
     T.If(prior.length().greaterThan(1e-10),()=>{const at=u.pathFilter.w.add(id.mul(3)),face=load(at.add(1)).xyz.cross(load(at.add(2)).xyz);prior.assign(prior.normalize().mul(prior.dot(face).lessThan(0).select(-1,1)));
      T.If(mappedMode.not(),()=>{const c=smoothValue.dot(prior).toVar(),v=smoothValue.cross(prior).toVar();T.If(c.greaterThan(-.9999),()=>{const mapped=normal.add(v.cross(normal)).add(v.cross(v.cross(normal)).div(T.float(1).add(c))).toVar();T.If(mapped.length().greaterThan(1e-10),()=>{result.assign(mapped.normalize());});});});
     });
    }).Else(()=>{
     const x=load(current).xyz.toVar(),y=load(current.add(1)).xyz.toVar(),z=load(current.add(2)).xyz.toVar(),a=load(old).xyz.toVar(),b=load(old.add(1)).xyz.toVar(),c=load(old.add(2)).xyz.toVar(),source=mappedMode.select(smoothValue,normal).toVar(),local=x.mul(source.x).add(y.mul(source.y)).add(z.mul(source.z)).toVar(),mapped=a.mul(local.x).add(b.mul(local.y)).add(c.mul(local.z)).toVar(),handed=x.dot(y.cross(z)).mul(a.dot(b.cross(c)));
     T.If(mapped.length().greaterThan(1e-10).and(handed.abs().greaterThanEqual(1e-20)),()=>{mapped.assign(mapped.normalize().mul(handed.lessThan(0).select(-1,1)));T.If(mappedMode,()=>{prior.assign(mapped);}).Else(()=>{result.assign(mapped);});});
    });
   });
  }).ElseIf(current.greaterThanEqual(-.5).and(current.lessThanEqual(0)),()=>{
   const at=u.pathFilter.w.add(id.mul(3)).toVar(),e1=ray.record(id,1).xyz.toVar(),e2=ray.record(id,2).xyz.toVar(),a=load(at.add(1)).xyz.toVar(),b=load(at.add(2)).xyz.toVar(),area=e1.cross(e2).length().toVar(),oldArea=a.cross(b).length().toVar();T.If(area.greaterThanEqual(1e-10).and(oldArea.greaterThanEqual(1e-10)),()=>{const gn=e1.cross(e2).div(area).toVar(),pn=a.cross(b).div(oldArea).toVar(),mapped=b.cross(pn).mul(normal.dot(e1).div(oldArea)).add(pn.cross(a).mul(normal.dot(e2).div(oldArea))).add(pn.mul(normal.dot(gn))).toVar();T.If(mapped.length().greaterThan(1e-10),()=>{result.assign(mapped.normalize());});});
  });
  T.If(mappedMode.and(prior.length().greaterThan(1e-10)),()=>{result.assign(tangent(id,normal,smoothValue,prior));});return result;
 }).setLayout({name:'hbPathPreviousNormal',type:'vec3',inputs:[{name:'id',type:'float'},{name:'point',type:'vec3'},{name:'normal',type:'vec3'}]});
}
