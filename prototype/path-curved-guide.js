import {tangentGuideGLSL} from './path-tangent-guide.js';
export const curvedGuideGLSL=tangentGuideGLSL+`
vec3 hbPathPreviousNormal(float id,vec3 point,vec3 normal,vec3 view,float width){
 if(hbPathFilter.w<=0.0)return normal;float attributes=hbRayAttributes(id);
 if(attributes>0.0){float current=hbGeometryLoad(attributes+3.0).w,old=hbGeometryLoad(attributes+4.0).w;
  if(current<-1.5)return vec3(0,0,0);
  if(current<-.5||current>0.0){
   if(old<=0.0)return vec3(0,0,0);float normalMode=hbGeometryLoad(hbGeometryLoad(attributes+1.0).z+7.0).z;bool mappedNormal=normalMode>.5;if(normalMode>1.5)normal=hbRayNormalTimeLod(id,point,view,width,hbForward.w);
   vec3 smoothValue=hbRaySmoothNormal(id,point),prior=vec3(0,0,0),mapped=vec3(0,0,0);
   if(current<-.5){vec3 weights=hbRayBary(id,point);prior=hbGeometryLoad(old).xyz*weights.x+hbGeometryLoad(old+1.0).xyz*weights.y+hbGeometryLoad(old+2.0).xyz*weights.z;if(length(prior)<1e-10)return vec3(0,0,0);prior=normalize(prior);vec3 face=cross(hbGeometryLoad(hbPathFilter.w+id*3.0+1.0).xyz,hbGeometryLoad(hbPathFilter.w+id*3.0+2.0).xyz);prior*=dot(prior,face)<0.0?-1.0:1.0;
   if(!mappedNormal){float cosine=dot(smoothValue,prior);if(cosine<=-.9999)return vec3(0,0,0);vec3 axis=cross(smoothValue,prior);mapped=normal+cross(axis,normal)+cross(axis,cross(axis,normal))/(1.0+cosine);}
   }else{vec3 x=hbGeometryLoad(current).xyz,y=hbGeometryLoad(current+1.0).xyz,z=hbGeometryLoad(current+2.0).xyz,a=hbGeometryLoad(old).xyz,b=hbGeometryLoad(old+1.0).xyz,c=hbGeometryLoad(old+2.0).xyz;float handed=dot(x,cross(y,z))*dot(a,cross(b,c));if(abs(handed)<1e-20)return vec3(0,0,0);vec3 local=x*smoothValue.x+y*smoothValue.y+z*smoothValue.z;prior=(a*local.x+b*local.y+c*local.z)*(handed<0.0?-1.0:1.0);local=x*normal.x+y*normal.y+z*normal.z;mapped=(a*local.x+b*local.y+c*local.z)*(handed<0.0?-1.0:1.0);if(length(prior)<1e-10)return vec3(0,0,0);prior=normalize(prior);}
   if(mappedNormal)return hbPathTangentNormal(id,normal,smoothValue,prior);return length(mapped)>1e-10?normalize(mapped):vec3(0,0,0);
  }
 }
 float at=hbGeometryInfo.w+id*6.0,old=hbPathFilter.w+id*3.0;vec3 e1=hbGeometryRecord1(id).xyz,e2=hbGeometryRecord2(id).xyz,a=hbGeometryLoad(old+1.0).xyz,b=hbGeometryLoad(old+2.0).xyz,n=cross(e1,e2),previous=cross(a,b);float area=length(n),oldArea=length(previous);if(area<1e-10||oldArea<1e-10)return vec3(0,0,0);n/=area;previous/=oldArea;vec3 mapped=cross(b,previous)*(dot(normal,e1)/oldArea)+cross(previous,a)*(dot(normal,e2)/oldArea)+previous*dot(normal,n);return length(mapped)>1e-10?normalize(mapped):vec3(0,0,0);}
`;
export function previousGuideNormal(normal,current,previous){
 const sub=(a,b)=>a.map((v,i)=>v-b[i]),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],unit=a=>{const length=Math.hypot(...a);return length>1e-10?a.map(v=>v/length):null;};
 const e1=sub(current[1],current[0]),e2=sub(current[2],current[0]),a=sub(previous[1],previous[0]),b=sub(previous[2],previous[0]),n=unit(cross(e1,e2)),oldN=unit(cross(a,b));if(!n||!oldN)return null;const area=Math.hypot(...cross(a,b)),x=cross(b,oldN),y=cross(oldN,a);return unit(x.map((v,i)=>v*dot(normal,e1)/area+y[i]*dot(normal,e2)/area+oldN[i]*dot(normal,n)));
}
