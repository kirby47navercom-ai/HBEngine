import {normalMapGLSL} from '../prototype/normal-map.js';
// Compile-cost comparison only. Use the captured, unmodified Complex141 shader
// and replace exactly its old decoder with the already value-verified helper.
export function normalRangeCandidate1042(source){
 const marker='vec3 hbDecodeNormalMap(',start=source.indexOf(marker),end=source.indexOf('\n',start);if(start<0||end<0||source.indexOf(marker,start+1)>=0||!source.slice(start,end).includes('float size=length(n)'))throw Error('Expected captured legacy normal decoder');
 return{source:source.slice(0,start)+normalMapGLSL.trimEnd()+source.slice(end),removed:['legacy-direct-length-normal-decoder'],removedBytes:end-start-normalMapGLSL.trimEnd().length,functions:1,fallback:false};
}
