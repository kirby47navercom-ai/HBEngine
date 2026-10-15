import {pathDenoiseGLSL} from './path-denoise.js';
import {curvedGuideGLSL} from './path-curved-guide.js';

// Keep the common/native algorithm as the source of truth. Only remove work
// whose output and early rejection cannot be used by this fixed no-lens pass.
export function pathGuideDenoiseGLSL(auxiliary,lens){
 if(lens)return pathDenoiseGLSL;
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
  section('if(auxiliary){hbPathVirtualAppend','origin=p+direction','');
 }else{
  replace('lensDifferentials=hbPathLens.x>0.0&&hbEye.w<.5&&hbPathFilter.y>0.0','lensDifferentials=false');
  replace('differentialCount=lensDifferentials?4:2','differentialCount=2');
  source=source.replaceAll('[4]','[2]');
  section('vec3 focus=origin+direction*hbPathLens.y','float ids[16]','\n');
  section('if(lensDifferentials){','if(!auxiliary)return','');
 }
 replace('vec4 hbPathGuideTrace(vec2 uv,bool auxiliary)','vec4 hbPathGuideTrace(vec2 uv)');
 source=source.replace(/\bauxiliary\b/g,auxiliary?'true':'false');
 return source+'\nvec4 '+(auxiliary?'hbPathAuxResolve':'hbPathGuideResolve')+'(vec2 uv){return hbPathGuideTrace(uv);}\n';
}
