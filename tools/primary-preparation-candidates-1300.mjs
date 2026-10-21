// Diagnostic candidates only: 1302–1307 did NOT establish faster compilation.
// Never import these into a production renderer. Retain for reproducible comparisons.
// Known opaque metadata already forces transmission=0. Exclude that unreachable
// camera branch before driver lowering; guides/photon/common formulas stay intact.
export function pathOpaqueCameraGLSL(source,opaque=false){
 if(typeof opaque!=='boolean')throw Error('불투과 경로 준비 모드를 확인하세요.');if(!opaque)return source;
 const start=source.indexOf('if(choose<transmission){');if(start<0)throw Error('카메라 투과 분기를 확인하세요.');const open=source.indexOf('{',start);let depth=1,end=open+1;for(;end<source.length&&depth;end++){if(source[end]==='{')depth++;else if(source[end]==='}')depth--;}
 if(depth||!/^\s*else\{deltaBounce=false;/.test(source.slice(end)))throw Error('카메라 불투과 분기 계약이 달라졌어요.');const body=source.indexOf('else{deltaBounce=false;',end)+4;
 return source.slice(0,start)+source.slice(body);
}

export function pathShareTextureTapsGLSL(source){
 const before='vec4 lo=mix(mix(hbRayTexel(descriptor,wrap,first),hbRayTexel(descriptor,wrap,first+vec3(1,0,0)),weight.x),mix(hbRayTexel(descriptor,wrap,first+vec3(0,1,0)),hbRayTexel(descriptor,wrap,first+vec3(1,1,0)),weight.x),weight.y);';
 const after='vec4 hbBilinearTaps[4];for(int hbTap=0;hbTap<4;hbTap++){hbBilinearTaps[hbTap]=hbRayTexel(descriptor,wrap,first+vec3(float(hbTap-2*(hbTap/2)),float(hbTap/2),0));}vec4 lo=mix(mix(hbBilinearTaps[0],hbBilinearTaps[1],weight.x),mix(hbBilinearTaps[2],hbBilinearTaps[3],weight.x),weight.y);';
 if(!source.includes(before))throw Error('광선 텍셀 호출 구역을 확인하세요.');return source.replaceAll(before,after);
}

export function pathAdaptiveTextureTapsGLSL(source){
 const before='vec4 lo=mix(mix(hbRayTexel(descriptor,wrap,first),hbRayTexel(descriptor,wrap,first+vec3(1,0,0)),weight.x),mix(hbRayTexel(descriptor,wrap,first+vec3(0,1,0)),hbRayTexel(descriptor,wrap,first+vec3(1,1,0)),weight.x),weight.y);';
 const after='vec4 hbBilinearTaps[4];int hbTapCount=weight.y>0.0?4:2;for(int hbTap=0;hbTap<hbTapCount;hbTap++){hbBilinearTaps[hbTap]=hbRayTexel(descriptor,wrap,first+vec3(float(hbTap-2*(hbTap/2)),float(hbTap/2),0));}vec4 lo=mix(hbBilinearTaps[0],hbBilinearTaps[1],weight.x);if(hbTapCount==4)lo=mix(lo,mix(hbBilinearTaps[2],hbBilinearTaps[3],weight.x),weight.y);';
 if(!source.includes(before))throw Error('광선 텍셀 호출 구역을 확인하세요.');return source.replaceAll(before,after);
}

export function pathExplicitEnvironmentGLSL(source){
 const before='return texture2D(hbPathEnvironmentScene,(vec2(index-floor(index/width)*width,floor(index/width))+.5)/vec2(width,height));';
 const after='return textureLod(hbPathEnvironmentScene,(vec2(index-floor(index/width)*width,floor(index/width))+.5)/vec2(width,height),0.0);';
 if(!source.includes(before))throw Error('HDRI 수치 아틀라스 읽기를 확인하세요.');return source.replace(before,after);
}

export function pathNoMediaCameraGLSL(source){
 const first=source.indexOf('vec3 hbPathSample('),open=source.indexOf('{',first),close=(text,brace)=>{let depth=1,i=brace+1;for(;i<text.length&&depth;i++){if(text[i]==='{')depth++;else if(text[i]==='}')depth--;}if(depth)throw Error('매질 카메라 구역을 확인하세요.');return i;};if(first<0||open<0)throw Error('카메라 경로 구역을 확인하세요.');const end=close(source,open);let body=source.slice(first,end);
 const replace=(a,b)=>{if(!body.includes(a))throw Error('빈 매질 특화 계약을 확인하세요.');body=body.replace(a,b);};
 replace('float ids[16];vec4 media[16];int count;hbMediumSeed(origin,direction,false,ids,media,count);if(count<0)return vec3(0,0,0);','');
 replace('if(count>0)throughput*=exp(-media[clamp(count-1,0,15)].rgb*(hit.z>.5?hit.x:hbGeometry.y));','');
 replace('float volume=hbMediumID(hit.y),incoming=count>0?media[clamp(count-1,0,15)].w:1.0,outgoing=front?ior:1.0;','float volume=0.0,incoming=1.0,outgoing=front?ior:1.0;');
 const front='if(volume>0.0&&!front){',a=body.indexOf(front);if(a<0)throw Error('매질 경계 구역을 확인하세요.');body=body.slice(0,a)+body.slice(close(body,a+front.length-1));
 const change='if(volume>0.0){';let removed=0;for(;;){const at=body.indexOf(change);if(at<0)break;const stop=close(body,at+change.length-1);if(!body.slice(stop).startsWith('else'))throw Error('얇은 경계 분기를 확인하세요.');body=body.slice(0,at)+body.slice(stop+4);removed++;}if(removed!==2||/\b(ids|media|count)\b/.test(body))throw Error('빈 매질의 저장소 참조를 확인하세요.');
 return source.slice(0,first)+body+source.slice(end);
}
