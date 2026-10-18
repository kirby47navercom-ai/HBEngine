import {pathDenoiseGLSL} from './path-denoise.js';
import {curvedGuideGLSL} from './path-curved-guide.js';

// Keep the common/native algorithm as the source of truth. Only remove work
// whose output and early rejection cannot be used by this fixed no-lens pass.
export function pathGuideDenoiseGLSL(auxiliary,lens){
 if(lens)return shareGuideNormals(pathDenoiseGLSL,4);
 let source=pathDenoiseGLSL.slice(0,pathDenoiseGLSL.indexOf('vec4 hbPathGuideResolve('));
 const replace=(before,after)=>{if(!source.includes(before))throw Error('경로 가이드 생성 계약이 달라졌어요.');source=source.replace(before,after);};
 const section=(first,last,value)=>{const a=source.indexOf(first),b=source.indexOf(last,a+first.length);if(a<0||b<0)throw Error('경로 가이드 구역을 확인하세요.');source=source.slice(0,a)+value+source.slice(b);};
 if(!auxiliary){
  replace(curvedGuideGLSL,'');
  section('vec2 hbPathOffset(','vec4 hbPathGuideTrace(','');
  section(',cameraDirection=direction',';vec2 cone','');
  section(',oldSecondary=0.0;','float ids[16]',';HBPathVirtualFrame mirrorFrame=hbPathVirtualIdentity();\n');
  section('vec3 oldP=p,oldN=geometric;','if(!glass&&!mirror){','');
  replace('if(!auxiliary)normal=','normal=');replace(',coc=0.0;',';');
  section('if(lensDifferentials){','float eta=1.0;','return vec4(normal,depth);}\n');
  replace('if(!auxiliary)hbPathVirtualAppend','hbPathVirtualAppend');
  section('if(auxiliary&&curved&&glass&&previousValid&&hbPathFilter.w>0.0){','origin=p+direction','');
 }else{
  replace('lensDifferentials=hbPathLens.x>0.0&&hbEye.w<.5&&hbPathFilter.y>0.0','lensDifferentials=false');
  replace('differentialCount=lensDifferentials?4:2','differentialCount=2');
  source=source.replaceAll('[4]','[2]');
  section('vec3 focus=origin+direction*hbPathLens.y','float ids[16]','\n');
  section('if(lensDifferentials){','if(!auxiliary)return','');
 }
 replace('vec4 hbPathGuideTrace(vec2 uv,bool auxiliary)','vec4 hbPathGuideTrace(vec2 uv)');
 source=source.replace(/\bauxiliary\b/g,auxiliary?'true':'false');
 return (auxiliary?shareGuideNormals(source,2):source)+'\nvec4 '+(auxiliary?'hbPathAuxResolve':'hbPathGuideResolve')+'(vec2 uv){return hbPathGuideTrace(uv);}\n';
}

// One call site prevents the driver from expanding the entire normal texture
// graph twice. The same main/differential samples still use the same footprint.
function shareGuideNormals(source,size){
 const replace=(before,after)=>{if(!source.includes(before))throw Error('경로 노멀 공유 구역을 확인하세요.');source=source.replace(before,after);};
 replace('normal=hbPathSurfaceNormal(hit.y,p,-direction,width,coatOnly)','normal=vec3(0)');
 replace('vec3 n=front?normal:-normal;','vec3 n=vec3(0);');
 const prior='if(curved){oldN=coatOnly?hbPathCommittedCoatNormal(hit.y,oldP,oldView,oldWidth):hbPathCommittedNormal(hit.y,oldP,oldView,oldWidth);if(dot(oldN,oldN)<.5)previousValid=false;}';
 replace(prior,'');
 const terminal='if(!glass&&!mirror){if(physical.y<.1';
 replace(terminal,`vec3 differentialNormals[${size}];for(int sampleIndex=0;sampleIndex<1+((glass||mirror)&&differentials?differentialCount:0);sampleIndex++){bool primary=sampleIndex==0;int j=max(0,sampleIndex-1);vec3 value=hbPathSurfaceNormal(primary?hit.y:differentialIDs[j],primary?p:dp[j],primary?-direction:-rd[j],width,coatOnly);if(primary)normal=value;else differentialNormals[j]=value;}n=front?normal:-normal;${prior}\n${terminal}`);
 replace('vec3 dn=hbPathSurfaceNormal(differentialIDs[j],dp[j],-rd[j],width,coatOnly);','vec3 dn=differentialNormals[j];');
 return source;
}
