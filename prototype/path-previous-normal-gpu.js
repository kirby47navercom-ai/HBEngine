import {gpuFn} from './gpu-function-scope.js';import * as T from 'three/tsl';
export function previousNormalGPU(transport,u){
 const load=transport.load,ray=transport.ray;
 return gpuFn(([id,point,normal])=>{
  const result=T.vec3(0).toVar(),attributes=ray.attributes(id).toVar(),current=load(attributes.add(3)).w.toVar(),old=load(attributes.add(4)).w.toVar();
  T.If(attributes.greaterThan(0).and(current.lessThan(-.5)),()=>{
   T.If(old.greaterThan(0),()=>{const b=ray.bary(id,point).toVar(),now=load(attributes.add(2)).xyz.mul(b.x).add(load(attributes.add(3)).xyz.mul(b.y)).add(load(attributes.add(4)).xyz.mul(b.z)).toVar(),prior=load(old).xyz.mul(b.x).add(load(old.add(1)).xyz.mul(b.y)).add(load(old.add(2)).xyz.mul(b.z)).toVar();
    T.If(now.length().greaterThan(1e-10).and(prior.length().greaterThan(1e-10)),()=>{const a=now.normalize().toVar(),z=prior.normalize().toVar(),c=a.dot(z).toVar(),v=a.cross(z).toVar();T.If(c.greaterThan(-.9999),()=>{const mapped=normal.add(v.cross(normal)).add(v.cross(v.cross(normal)).div(T.float(1).add(c)));T.If(mapped.length().greaterThan(1e-10),()=>{result.assign(mapped.normalize());});});});
   });
  }).ElseIf(attributes.greaterThan(0).and(current.greaterThan(0)),()=>{
   T.If(old.greaterThan(0),()=>{const x=load(current).xyz,y=load(current.add(1)).xyz,z=load(current.add(2)).xyz,local=x.mul(normal.x).add(y.mul(normal.y)).add(z.mul(normal.z)),a=load(old).xyz,b=load(old.add(1)).xyz,c=load(old.add(2)).xyz,mapped=a.mul(local.x).add(b.mul(local.y)).add(c.mul(local.z)),handed=x.dot(y.cross(z)).mul(a.dot(b.cross(c)));T.If(mapped.length().greaterThan(1e-10).and(handed.abs().greaterThanEqual(1e-20)),()=>{result.assign(mapped.normalize().mul(handed.lessThan(0).select(-1,1)));});});
  }).Else(()=>{
   const at=u.pathFilter.w.add(id.mul(3)),e1=ray.record(id,1).xyz,e2=ray.record(id,2).xyz,a=load(at.add(1)).xyz,b=load(at.add(2)).xyz,area=e1.cross(e2).length(),oldArea=a.cross(b).length();T.If(area.greaterThanEqual(1e-10).and(oldArea.greaterThanEqual(1e-10)),()=>{const gn=e1.cross(e2).div(area),pn=a.cross(b).div(oldArea),mapped=b.cross(pn).mul(normal.dot(e1).div(oldArea)).add(pn.cross(a).mul(normal.dot(e2).div(oldArea))).add(pn.mul(normal.dot(gn)));T.If(mapped.length().greaterThan(1e-10),()=>{result.assign(mapped.normalize());});});
  });return result;
 }).setLayout({name:'hbPathPreviousNormal',type:'vec3',inputs:[{name:'id',type:'float'},{name:'point',type:'vec3'},{name:'normal',type:'vec3'}]});
}
