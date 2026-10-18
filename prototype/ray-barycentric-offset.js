// Evaluate base weights and offset weights separately. A compiler can fold
// (point-origin)+offset back to point+offset-origin and erase a sub-ULP offset.
export const rayBarycentricOffsetGLSL=`
vec3 hbRayBaryOffset(float id,vec3 point,vec3 offset){
 vec3 origin,e1,e2;hbGeometryFrame(id,origin,e1,e2);vec3 delta=point-origin;
 float a=dot(e1,e1),b=dot(e1,e2),c=dot(e2,e2),d=dot(delta,e1),e=dot(delta,e2),den=max(a*c-b*b,1e-18),u=(c*d-b*e)/den,v=(a*e-b*d)/den;
 d=dot(offset,e1);e=dot(offset,e2);float du=(c*d-b*e)/den,dv=(a*e-b*d)/den;
 return vec3((1.0-u-v)-du-dv,u+du,v+dv);
}
`;
export function rayBarycentricOffsetNode(T,record,id,point,offset){
 const e1=record(id,1).xyz,e2=record(id,2).xyz,delta=point.sub(record(id,0).xyz);
 const a=e1.dot(e1),b=e1.dot(e2),c=e2.dot(e2),d=delta.dot(e1),e=delta.dot(e2),den=a.mul(c).sub(b.mul(b)).max(1e-18),x=c.mul(d).sub(b.mul(e)).div(den),y=a.mul(e).sub(b.mul(d)).div(den),ox=offset.dot(e1),oy=offset.dot(e2),dx=c.mul(ox).sub(b.mul(oy)).div(den),dy=a.mul(oy).sub(b.mul(ox)).div(den);
 return T.vec3(T.float(1).sub(x).sub(y).sub(dx).sub(dy),x.add(dx),y.add(dy));
}
