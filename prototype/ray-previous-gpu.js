import * as T from 'three/tsl';
import {gpuFn} from './gpu-function-scope.js';
import {rayMaterialNode} from './ray-material-gpu.js';

// Share the IR/compiler/samplers, replacing only committed geometry inputs.
export function previousRayGPU(transport,u){
 const {load,ray}=transport,record=(id,slot)=>{
  const at=u.pathFilter.w.add(id.mul(3));
  if(slot<3)return load(at.add(slot));
  if(slot===3)return T.vec4(load(at.add(1)).xyz.cross(load(at.add(2)).xyz).normalize(),0);
  return ray.record(id,slot);
 };
 const geometric=id=>record(id,3).xyz;
 const bary=gpuFn(([id,point])=>{const origin=record(id,0).xyz,e1=record(id,1).xyz,e2=record(id,2).xyz,delta=point.sub(origin),a=e1.dot(e1),b=e1.dot(e2),c=e2.dot(e2),d=delta.dot(e1),e=delta.dot(e2),den=a.mul(c).sub(b.mul(b)).max(1e-18),x=c.mul(d).sub(b.mul(e)).div(den),y=a.mul(e).sub(b.mul(d)).div(den);return T.vec3(T.float(1).sub(x).sub(y),x,y);}).setLayout({name:'hbPreviousBary',type:'vec3',inputs:[{name:'id',type:'float'},{name:'point',type:'vec3'}]});
 const smooth=gpuFn(([id,point])=>{
  const face=geometric(id).toVar(),result=face.toVar(),at=ray.attributes(id).toVar();
  T.If(at.greaterThan(0),()=>{
   const encoded=load(at.add(3)).w.toVar(),current=encoded.lessThan(-3.5).select(encoded.negate(),encoded.equal(-3).select(-1,encoded)).toVar(),old=load(at.add(4)).w.toVar(),weights=bary(id,point).toVar(),normal=T.vec3(0).toVar(),valid=T.bool(true).toVar();
   T.If(current.equal(-2).or(old.lessThanEqual(0)),()=>{result.assign(T.vec3(0));}).Else(()=>{
    T.If(current.lessThan(-.5),()=>{normal.assign(load(old).xyz.mul(weights.x).add(load(old.add(1)).xyz.mul(weights.y)).add(load(old.add(2)).xyz.mul(weights.z)));}).ElseIf(current.greaterThan(0),()=>{
     const x=load(current).xyz.toVar(),y=load(current.add(1)).xyz.toVar(),z=load(current.add(2)).xyz.toVar(),a=load(old).xyz.toVar(),b=load(old.add(1)).xyz.toVar(),c=load(old.add(2)).xyz.toVar();
     T.If(x.dot(y.cross(z)).mul(a.dot(b.cross(c))).abs().greaterThanEqual(1e-20),()=>{T.Loop({start:0,end:3,type:'int',name:'priorVertex'},({priorVertex})=>{const now=load(at.add(2).add(T.float(priorVertex))).xyz.toVar(),local=x.mul(now.x).add(y.mul(now.y)).add(z.mul(now.z)).toVar(),v=a.mul(local.x).add(b.mul(local.y)).add(c.mul(local.z)).toVar();T.If(v.dot(v).greaterThanEqual(1e-12),()=>{normal.addAssign(v.normalize().mul(weights.element(priorVertex)));}).Else(()=>{valid.assign(false);});});}).Else(()=>{valid.assign(false);});
    });
    T.If(valid.not(),()=>{result.assign(T.vec3(0));}).ElseIf(normal.dot(normal).greaterThanEqual(1e-12),()=>{normal.assign(normal.normalize());result.assign(normal.dot(face).lessThan(0).select(normal.negate(),normal));});
   });
  });return result;
 }).setLayout({name:'hbPreviousSmoothNormal',type:'vec3',inputs:[{name:'id',type:'float'},{name:'point',type:'vec3'}]});
 return rayMaterialNode(load,u,ray.programs,[3],load,null,true,false,record,bary,smooth);
}
