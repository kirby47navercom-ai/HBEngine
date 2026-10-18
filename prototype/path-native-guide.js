import {pathDenoiseGLSL} from './path-denoise.js';
import {pathGuideDenoiseGLSL} from './path-guide-specialization.js';

// The native guide uses the same fixed pass as GL. Keep the generic source for
// ordinary path/filter callers and compatibility probes without these flags.
export const nativePathGuideGLSL=`
#if defined(HB_NATIVE_GUIDE_SPECIALIZED)
#if defined(HB_NATIVE_GUIDE_LENS)
${pathGuideDenoiseGLSL(true,true)}
#elif defined(HB_DENOISE_AUX)
${pathGuideDenoiseGLSL(true,false)}
#else
${pathGuideDenoiseGLSL(false,false)}
#endif
#else
${pathDenoiseGLSL}
#endif
`;
export function specializeNativeGuides(source){
 if(source.split(pathDenoiseGLSL).length!==2)throw Error('네이티브 가이드 생성 구역을 확인하세요.');
 return source.replace(pathDenoiseGLSL,nativePathGuideGLSL).replace(/\bvec([234])\(([01])\)/g,(_,size,value)=>'vec'+size+'('+Array(Number(size)).fill(value).join(',')+')');
}
