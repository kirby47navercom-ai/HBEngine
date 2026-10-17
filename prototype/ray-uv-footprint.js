// Share triangle/UV reads across the three samples without changing their
// barycentric arithmetic or the offset positions used for mip selection.
export const rayUVFootprintGLSL=`
void hbRayUVFootprint(float id,vec3 point,vec3 view,float width,out vec2 uv,out vec2 uvX,out vec2 uvY){
 float at=hbRayAttributes(id);uv=vec2(0);uvX=uv;uvY=uv;if(at<=0.0)return;
 vec3 origin,e1,e2;hbGeometryFrame(id,origin,e1,e2);vec3 normal=hbRayGeometric(id),t=cross(normal,view);
 if(dot(t,t)<.000001)t=cross(normal,abs(normal.z)<.9?vec3(0,0,1):vec3(0,1,0));t=normalize(t);
 vec3 dx=t*width,dy=cross(normal,t)*(width/max(.01,abs(dot(normal,view))));
 float a=dot(e1,e1),b=dot(e1,e2),c=dot(e2,e2),den=max(a*c-b*b,.000000000000000001);
 vec4 first=hbGeometryLoad(at);vec2 last=hbGeometryLoad(at+1.0).xy;
 vec3 delta=point-origin;float d=dot(delta,e1),e=dot(delta,e2),u=(c*d-b*e)/den,v=(a*e-b*d)/den;
 uv=first.xy*(1.0-u-v)+first.zw*u+last*v;
 delta=point+dx-origin;d=dot(delta,e1);e=dot(delta,e2);u=(c*d-b*e)/den;v=(a*e-b*d)/den;
 uvX=first.xy*(1.0-u-v)+first.zw*u+last*v;
 delta=point+dy-origin;d=dot(delta,e1);e=dot(delta,e2);u=(c*d-b*e)/den;v=(a*e-b*d)/den;
 uvY=first.xy*(1.0-u-v)+first.zw*u+last*v;
}
`;
