// Previous evaluation reads the committed geometry. UV interpolation must use
// that geometry too: moving only the worldPosition input changes texture LOD.
export const previousRayGeometryGLSL=`
void hbRayPreviousFrame(float id,out vec3 origin,out vec3 e1,out vec3 e2){float at=hbPathFilter.w+id*3.0;origin=hbGeometryLoad(at).xyz;e1=hbGeometryLoad(at+1.0).xyz;e2=hbGeometryLoad(at+2.0).xyz;}
vec3 hbRayPreviousGeometric(float id){vec3 a,b,c;hbRayPreviousFrame(id,a,b,c);return normalize(cross(b,c));}
vec3 hbRayPreviousBary(float id,vec3 point){vec3 origin,e1,e2;hbRayPreviousFrame(id,origin,e1,e2);vec3 delta=point-origin;float a=dot(e1,e1),b=dot(e1,e2),c=dot(e2,e2),d=dot(delta,e1),e=dot(delta,e2),den=max(a*c-b*b,1e-18),u=(c*d-b*e)/den,v=(a*e-b*d)/den;return vec3(1.0-u-v,u,v);}
vec2 hbRayPreviousUV(float id,vec3 point){float at=hbRayAttributes(id);if(at<=0.0)return vec2(0,0);vec3 b=hbRayPreviousBary(id,point);vec4 first=hbGeometryLoad(at);return first.xy*b.x+first.zw*b.y+hbGeometryLoad(at+1.0).xy*b.z;}
float hbRayPreviousFramePointer(float encoded){return encoded<-3.5?-encoded:encoded== -3.0?-1.0:encoded;}
vec3 hbRayPreviousSmoothNormal(float id,vec3 point){
 float at=hbRayAttributes(id);vec3 face=hbRayPreviousGeometric(id);if(at<=0.0)return face;float current=hbRayPreviousFramePointer(hbGeometryLoad(at+3.0).w),old=hbGeometryLoad(at+4.0).w;if(current== -2.0||old<=0.0)return vec3(0,0,0);
 vec3 weights=hbRayPreviousBary(id,point),normal;
 if(current<-.5)normal=hbGeometryLoad(old).xyz*weights.x+hbGeometryLoad(old+1.0).xyz*weights.y+hbGeometryLoad(old+2.0).xyz*weights.z;
 else if(current>0.0){vec3 x=hbGeometryLoad(current).xyz,y=hbGeometryLoad(current+1.0).xyz,z=hbGeometryLoad(current+2.0).xyz,a=hbGeometryLoad(old).xyz,b=hbGeometryLoad(old+1.0).xyz,c=hbGeometryLoad(old+2.0).xyz;if(abs(dot(x,cross(y,z))*dot(a,cross(b,c)))<1e-20)return vec3(0,0,0);normal=vec3(0,0,0);for(int vertexIndex=0;vertexIndex<3;vertexIndex++){vec3 now=hbGeometryLoad(at+2.0+float(vertexIndex)).xyz,local=x*now.x+y*now.y+z*now.z,prior=a*local.x+b*local.y+c*local.z;if(dot(prior,prior)<1e-12)return vec3(0,0,0);normal+=normalize(prior)*weights[vertexIndex];}}
 else return face;
 if(dot(normal,normal)<1e-12)return face;normal=normalize(normal);return dot(normal,face)<0.0?-normal:normal;
}
vec3 hbRayPreviousOffset(float id,vec3 view,float width,float axis){vec3 n=hbRayPreviousGeometric(id),t=cross(n,view);if(dot(t,t)<.000001)t=cross(n,abs(n.z)<.9?vec3(0,0,1):vec3(0,1,0));t=normalize(t);return axis<.5?t*width:cross(n,t)*(width/max(.01,abs(dot(n,view))));}
`;

export function previousRayNames(source){return source.replace(/\bhbRay(UVFootprint|UV|SmoothNormal|Geometric|Bary|Offset|NormalContextLod|Field3TimeLod|RunField3|Program\d+|Execute\w*)\b/g,(_,name)=>'hbRayPrevious'+name).replace(/\bhbGeometryFrame\b/g,'hbRayPreviousFrame');}

// Keep the existing public program ABI, field masks and persisted graph keys.
export function previousRayNormalGLSL(programSource,normalSource,uvSource=''){
 return previousRayGeometryGLSL+previousRayNames(uvSource)+previousRayNames(programSource)+`
vec4 hbRayPreviousField3TimeLod(float id,vec3 point,vec3 view,float width,vec2 timeContext){float at=hbRayAttributes(id);if(at<=0.0)return vec4(0,0,1,0);float material=hbGeometryLoad(at+1.0).z;return hbRayBound(hbRayPreviousRunField3(id,point,view,material,hbGeometryLoad(material+6.0),width,timeContext),3.0);}
`+previousRayNames(normalSource);
}
