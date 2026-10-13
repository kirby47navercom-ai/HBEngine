// Filtered pixels never feed the Monte Carlo history. Specular/glass and lens DOF stay raw.
export const pathDenoiseGLSL=`
vec4 hbPathGuideResolve(vec2 uv){if(hbPathLens.x>0.0)return vec4(0,0,0,0);vec3 nearPoint=hbWorldAt(uv,0.0),farPoint=hbWorldAt(uv,.9999),origin=hbEye.w>.5?nearPoint:hbEye.xyz,direction=normalize(farPoint-origin);vec4 hit=hbGeometryTraceCone(origin,direction,hbGeometry.y,hbRayCameraCone(uv));float width=hbRayCameraCone(uv).x+hbRayCameraCone(uv).y*hit.x;if(hit.z<.5||hit.w<.5)return vec4(0,0,0,0);vec3 p=origin+direction*hit.x;vec4 physical=hbRayField0Lod(hit.y,p,-direction,width);bool sharp=physical.z>.001||physical.y<.1;
#ifdef HB_PATH_ADVANCED
vec4 coat=hbRayField5Lod(hit.y,p,-direction,width);sharp=sharp||(coat.x>.001&&coat.y<.1)||(coat.z>.001&&physical.y*physical.y*sqrt(max(.1,1.0-.9*coat.z))<.01);
#endif
float valid=sharp?-1.0:1.0;return vec4(hbRayNormalLod(hit.y,p,-direction,width),max(.00001,hit.x)*valid);}
vec4 hbPathDenoiseResolve(vec2 uv){vec4 center=texture2D(hbDenoiseGuide,uv),original=texture2D(hbScreenSource,uv);if(center.w<=0.0)return original;vec3 sum=vec3(0,0,0);float total=0.0,stride=hbPathOptions.w;
 for(int y=-2;y<=2;y++)for(int x=-2;x<=2;x++){vec2 at=uv+vec2(float(x),float(y))*stride/hbScreenSize;if(at.x<0.0||at.x>1.0||at.y<0.0||at.y>1.0)continue;vec4 guide=texture2D(hbDenoiseGuide,at),v=texture2D(hbScreenSource,at);if(guide.w<=0.0)continue;float normal=pow(max(0.0,dot(center.xyz,guide.xyz)),hbPathDenoise.z),depth=exp(-abs(center.w-guide.w)/max(.00001,center.w*hbPathDenoise.w*stride));vec3 delta=v.rgb-original.rgb;float brightness=exp(-dot(delta,delta)/max(.001,dot(original.rgb,original.rgb)+.1)),kernel=(x==0?6.0:abs(x)==1?4.0:1.0)*(y==0?6.0:abs(y)==1?4.0:1.0),weight=normal*depth*brightness*kernel;sum+=v.rgb*weight;total+=weight;
 }return vec4(mix(original.rgb,sum/max(.000001,total),hbPathDenoise.x),original.a);
}
`;
export function denoiseWeight(center,guide,color,other,x,y,stride=1){if(center[3]<=0||guide[3]<=0)return 0;const dot=(a,b)=>a.slice(0,3).reduce((s,v,i)=>s+v*b[i],0),delta=other.map((v,i)=>v-color[i]);return Math.max(0,dot(center,guide))**32*Math.exp(-Math.abs(center[3]-guide[3])/Math.max(.00001,center[3]*.02*stride))*Math.exp(-dot(delta,delta)/Math.max(.001,dot(color,color)+.1))*(x===0?6:Math.abs(x)===1?4:1)*(y===0?6:Math.abs(y)===1?4:1);}
