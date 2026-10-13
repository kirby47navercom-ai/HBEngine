import {rayMaterialGLSL} from './ray-material-shader.js';
export const geometryGIGLSL=`
vec3 hbGeometryVisibility(vec3 origin,vec3 direction,float distance);
vec3 hbGeometryVisibilityLod(vec3 origin,vec3 direction,float distance,float width);
vec4 hbGeometryLoad(float index){
#ifdef HB_WEBGL_RAY_DATA
 // Numeric atlas reads never need implicit screen derivatives inside BVH loops.
 return texelFetch(hbGeometryScene,ivec2(mod(index,hbGeometryInfo.x),floor(index/hbGeometryInfo.x)),0);
#else
 return texture2D(hbGeometryScene,(vec2(mod(index,hbGeometryInfo.x),floor(index/hbGeometryInfo.x))+.5)/hbGeometryInfo.xy);
#endif
}
${rayMaterialGLSL}
float hbGeometryTriangleCone(vec3 origin,vec3 direction,float triangle,vec2 rayCone){float at=hbGeometryInfo.w+triangle*6.0;vec3 a=hbGeometryLoad(at).xyz,e1=hbGeometryLoad(at+1.0).xyz,e2=hbGeometryLoad(at+2.0).xyz,p=cross(direction,e2);float determinant=dot(e1,p);if(abs(determinant)<.0000001)return -1.0;float inverse=1.0/determinant;vec3 s=origin-a,q=cross(s,e1);float u=dot(s,p)*inverse,v=dot(direction,q)*inverse,t=dot(e2,q)*inverse;if(u<0.0||v<0.0||u+v>1.0||t<=hbGeometryLimits.y)return -1.0;float cutoff=hbRayCutoff(triangle);if(cutoff>0.0&&hbRayField1(triangle,origin+direction*t,-direction).w<cutoff)return -1.0;return t;}
vec4 hbGeometryTraceCone(vec3 origin,vec3 direction,float distance,vec2 rayCone){float node=0.0,closest=distance,triangle=-1.0;vec3 safeDirection=(step(vec3(0,0,0),direction)*2.0-1.0)*max(abs(direction),vec3(.0000001,.0000001,.0000001)),inverse=1.0/safeDirection;
 for(int walk=0;walk<min(4096,int(hbGeometryLimits.x));walk++){if(node>=hbGeometryInfo.z)break;vec4 lower=hbGeometryLoad(node*3.0),upper=hbGeometryLoad(node*3.0+1.0);vec3 a=(lower.xyz-origin)*inverse,b=(upper.xyz-origin)*inverse,nearAt=min(a,b),farAt=max(a,b);float nearDistance=max(max(nearAt.x,nearAt.y),nearAt.z),farDistance=min(min(farAt.x,farAt.y),farAt.z);if(farDistance<max(nearDistance,0.0)||nearDistance>closest){node=lower.w;continue;}float count=hbGeometryLoad(node*3.0+2.0).x;for(int j=0;j<min(4,int(count));j++){float id=upper.w+float(j),t=hbGeometryTriangleCone(origin,direction,id,rayCone);if(t>0.0&&t<closest){closest=t;triangle=id;}}node+=1.0;}
 return vec4(closest,triangle,triangle>=0.0?1.0:0.0,node>=hbGeometryInfo.z?1.0:0.0);
}
vec4 hbGeometryTrace(vec3 origin,vec3 direction,float distance){return hbGeometryTraceCone(origin,direction,distance,vec2(0,0));}
vec3 hbGeometryLightingLod(vec3 point,vec3 normal,float triangle,float width){float at=hbGeometryInfo.w+triangle*6.0;vec3 color=hbRayField1Lod(triangle,point,normal,width).rgb,result=hbRayField2Lod(triangle,point,normal,width).rgb;
 for(int light=0;light<int(hbGeometryLimits.w);light++){float base=hbGeometryLimits.z+float(light)*4.0;vec4 p=hbGeometryLoad(base),d=hbGeometryLoad(base+1.0),c=hbGeometryLoad(base+2.0),cone=hbGeometryLoad(base+3.0);vec3 delta=p.xyz-point;float distance=length(delta),attenuation=1.0;vec3 direction=p.w<.5?normalize(d.xyz):delta/max(distance,.000001);
  if(p.w>.5){attenuation=1.0/max(pow(distance,cone.z),.01);if(d.w>0.0)attenuation*=pow(clamp(1.0-pow(distance/d.w,4.0),0.0,1.0),2.0);if(p.w>1.5)attenuation*=smoothstep(cone.x,max(cone.x+.00001,cone.y),dot(-direction,normalize(d.xyz)));}
  float cosine=max(dot(normal,direction),0.0);if(cosine>0.0&&attenuation>0.0){vec4 shadow=hbGeometryTrace(point+normal*hbGeometryLimits.y*2.0,direction,p.w<.5?hbGeometry.y:max(0.0,distance-hbGeometryLimits.y*2.0));vec3 visibility=hbTransport.y>.5?hbGeometryVisibilityLod(point+normal*hbGeometryLimits.y*2.0,direction,p.w<.5?hbGeometry.y:max(0.0,distance-hbGeometryLimits.y*2.0),width):(shadow.z<.5&&shadow.w>.5?vec3(1,1,1):vec3(0,0,0));if(hbTransport.y>.5&&(cone.w<.5||hbGeometryLoad(hbTransport.x+triangle*2.0+1.0).y<.5))visibility=vec3(1,1,1);float diffuse=hbTransport.y>.5?1.0-hbRayField0Lod(triangle,point,normal,width).x:1.0;result+=color*c.rgb*c.w*(cosine*attenuation*.318309886*diffuse)*visibility;}
 }return result;
}
vec3 hbGeometryHemisphere(vec3 normal,float angle,float radius){vec3 tangent=normalize(cross(normal,abs(normal.z)<.9?vec3(0,0,1):vec3(0,1,0))),bitangent=cross(normal,tangent);return normalize(normal*sqrt(1.0-radius)+(tangent*cos(angle)+bitangent*sin(angle))*sqrt(radius));}
vec3 hbGeometryIndirect(vec3 point,vec3 normal){vec3 total=vec3(0,0,0);for(int sampleIndex=0;sampleIndex<16;sampleIndex++){if(float(sampleIndex)>=hbGeometry.w)break;float phase=float(sampleIndex)*2.39996323+.392699;vec3 direction=hbGeometryHemisphere(normal,phase,(float(sampleIndex)+.5)/hbGeometry.w),origin=point+normal*hbGeometryLimits.y*2.0,throughput=vec3(1,1,1),sum=vec3(0,0,0);
  vec2 rayCone=vec2(0,.5);bool alive=true;for(int bounce=0;bounce<min(4,int(hbGeometry.z))&&alive;bounce++){vec4 hit=hbGeometryTraceCone(origin,direction,hbGeometry.y,rayCone);if(hit.z<.5||hit.w<.5)alive=false;else{rayCone.x+=rayCone.y*hit.x;vec3 p=origin+direction*hit.x,n=hbRayNormalLod(hit.y,p,-direction,rayCone.x);if(dot(n,direction)>0.0)n=-n;sum+=throughput*hbGeometryLightingLod(p,n,hit.y,rayCone.x);throughput*=hbRayField1Lod(hit.y,p,-direction,rayCone.x).xyz*(hbTransport.y>.5?1.0-hbRayField0Lod(hit.y,p,-direction,rayCone.x).x:1.0);origin=p+n*hbGeometryLimits.y*2.0;direction=hbGeometryHemisphere(n,phase+float(bounce+1)*1.618034,.5);}}
  total+=sum;
 }return total*(3.141592654/max(1.0,hbGeometry.w));
}
`;
