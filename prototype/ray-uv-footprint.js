// UV is affine on a triangle. Derive its offsets directly instead of adding
// a sub-ULP footprint to a large world point and losing the texture gradient.
export const rayUVFootprintContract=Object.freeze({version:1,model:'triangle-affine UV differentials from relative edges; base UV interpolation unchanged',contexts:Object.freeze(['current geometry','committed geometry']),coordinatePropagation:'relative finite differences; direct affine identities and stable piecewise/periodic/root/length differences; shifted-input fallback for other operations',stableOperations:Object.freeze(['uv','worldPosition','add','subtract','multiply','tilingOffset','panner','lerp','oneMinus','dot','cross','combine','channel','cast','worldNormal','absolute','min','max','clamp','saturate','floor','ceil','fraction','step','sign','sine','cosine','squareRoot','length','normalize','divide','distance','rotateUV','reflect','eyeUV','power','exp2','log2','smoothstep','normalMap','fresnel','radialGradient','linearGradient']),helperCompilation:'GL/HLSL helpers gated by existing packed opcode union; transitive dependencies checked once at module load, no per-frame scan; HB_RAY_DERIVATIVES_ALL is a debug-only full-library override',normalFootprint:'triangle-local barycentric offsets, applied separately from the absolute world point; current and committed smooth-normal decoders',approximations:Object.freeze(['texture-driven coordinate differences remain zero','view direction is held fixed across the cone']),resources:'no additional textures, targets, uniforms or readbacks',remaining:Object.freeze(['noise and checker use shifted-input fallback; finite positive power/log domains and float intermediate range limits remain','unrepresentable authored UV/time values and extreme intermediate ranges'])});
export const rayUVFootprintGLSL=`
void hbRayUVFootprint(float id,vec3 point,vec3 view,float width,out vec2 uv,out vec2 uvX,out vec2 uvY){
 float at=hbRayAttributes(id);uv=vec2(0,0);uvX=uv;uvY=uv;if(at<=0.0)return;
 vec3 origin,e1,e2;hbGeometryFrame(id,origin,e1,e2);vec3 normal=hbRayGeometric(id),t=cross(normal,view);
 if(dot(t,t)<.000001)t=cross(normal,abs(normal.z)<.9?vec3(0,0,1):vec3(0,1,0));t=normalize(t);
 vec3 dx=t*width,dy=cross(normal,t)*(width/max(.01,abs(dot(normal,view))));
 float a=dot(e1,e1),b=dot(e1,e2),c=dot(e2,e2),den=max(a*c-b*b,.000000000000000001);
 vec4 first=hbGeometryLoad(at);vec2 last=hbGeometryLoad(at+1.0).xy;
 vec3 delta=point-origin;float d=dot(delta,e1),e=dot(delta,e2),u=(c*d-b*e)/den,v=(a*e-b*d)/den;
 uv=first.xy*(1.0-u-v)+first.zw*u+last*v;
 vec2 du=first.zw-first.xy,dv=last-first.xy;
 d=dot(dx,e1);e=dot(dx,e2);u=(c*d-b*e)/den;v=(a*e-b*d)/den;uvX=du*u+dv*v;
 d=dot(dy,e1);e=dot(dy,e2);u=(c*d-b*e)/den;v=(a*e-b*d)/den;uvY=du*u+dv*v;
}
`;

export function rayUVDifferentialsNode(T,fn,load,attributes,record,offset){
 return fn('hbRayUVDifferentials','vec4',[['id','float'],['view','vec3'],['width','float']],([id,view,width])=>{
  const at=attributes(id).toVar(),result=T.vec4(0).toVar();
  T.If(at.greaterThan(0),()=>{
   const e1=record(id,1).xyz.toVar(),e2=record(id,2).xyz.toVar(),a=e1.dot(e1),b=e1.dot(e2),c=e2.dot(e2),den=a.mul(c).sub(b.mul(b)).max(1e-18),first=load(at).toVar(),du=first.zw.sub(first.xy),dv=load(at.add(1)).xy.sub(first.xy);
   for(const axis of [0,1]){const delta=offset(id,view,width,T.float(axis)),d=delta.dot(e1),e=delta.dot(e2),u=c.mul(d).sub(b.mul(e)).div(den),v=a.mul(e).sub(b.mul(d)).div(den);result[axis?'zw':'xy'].assign(du.mul(u).add(dv.mul(v)));}
  });return result;
 });
}
