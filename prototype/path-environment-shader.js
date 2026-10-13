export const pathEnvironmentGLSL=`
vec4 hbEnvironmentLoad(float index){float count=hbPathMap.y*hbPathMap.z,width=min(4096.0,count+ceil(count*.5)),height=ceil((count+ceil(count*.5))/width);return texture2D(hbPathEnvironmentScene,(vec2(index-floor(index/width)*width,floor(index/width))+.5)/vec2(width,height));}
vec2 hbEnvironmentUV(vec3 d){return vec2(fract((atan(d.z,d.x)-hbPathMap.w)*.159154943+.5),acos(clamp(d.y,-1.0,1.0))*.318309886);}
vec4 hbEnvironment(vec3 d){
#ifdef HB_RAY_NO_ENV
return vec4(hbPathEnvironment.rgb,0.0);
#else
if(hbPathMap.y<.5)return vec4(hbPathEnvironment.rgb,0.0);vec2 uv=hbEnvironmentUV(d);float id=floor(uv.y*hbPathMap.z)*hbPathMap.y+floor(uv.x*hbPathMap.y);vec4 v=hbEnvironmentLoad(hbPathMap.x+min(id,hbPathMap.y*hbPathMap.z-1.0));return vec4(v.rgb*hbPathOptions.x,v.a);
#endif
}
vec4 hbEnvironmentDirection(float seed){float count=hbPathMap.y*hbPathMap.z;if(count<.5)return vec4(0,1,0,0);float choice=hbPathRandom(seed+21.0)*count,index=floor(choice);vec4 cell=hbEnvironmentLoad(hbPathMap.x+count+floor(index*.5));vec2 alias=index-floor(index*.5)*2.0<.5?cell.xy:cell.zw;if(fract(choice)>=alias.x)index=alias.y;float y=floor(index/hbPathMap.y),x=index-y*hbPathMap.y,phi=((x+hbPathRandom(seed+22.0))/hbPathMap.y-.5)*6.283185307+hbPathMap.w,cosine=mix(cos(3.141592654*y/hbPathMap.z),cos(3.141592654*(y+1.0)/hbPathMap.z),hbPathRandom(seed+23.0)),sine=sqrt(max(0.0,1.0-cosine*cosine));return vec4(sine*cos(phi),cosine,sine*sin(phi),hbEnvironmentLoad(hbPathMap.x+index).a);}
vec3 hbEnvironmentDirect(vec3 point,vec3 n,vec3 view,float id,float seed,float width){
#ifdef HB_RAY_NO_ENV
return vec3(0,0,0);
#else
if(hbPathMap.y<.5||hbPathOptions.x<=0.0)return vec3(0,0,0);vec4 sampleDirection=hbEnvironmentDirection(seed);vec3 d=sampleDirection.xyz;float cosine=max(0.0,dot(n,d)),pdf=sampleDirection.w;if(cosine<=0.0||pdf<=0.0)return vec3(0,0,0);vec4 p=hbRayField0Lod(id,point,view,width),b=hbPathBRDF(n,view,d,hbRayField1Lod(id,point,view,width).rgb,p.x,max(.02,p.y));float opaque=1.0-p.z*(1.0-p.x);vec3 visible=hbGeometryVisibilityLod(point+d*hbGeometryLimits.y*2.0,d,hbGeometry.y,width);if(hbGeometryLoad(hbTransport.x+id*2.0+1.0).y<.5)visible=vec3(1,1,1);return hbEnvironment(d).rgb*b.rgb*visible*(cosine*opaque/pdf)*hbPathMIS(pdf,b.a*opaque);
#endif
}
`;
