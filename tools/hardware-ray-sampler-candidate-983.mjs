// Compile-cost isolation only. No engine binding or sampling-equivalence claim.
// The captured normal fixture has one linear 2D level-filter specialization.
export function hardwareRaySamplerCandidate983(source){
 const pattern=/vec4 (hbRayTextureLevel0Filter8)\([^{};]*\)\{/g,changed=[];let output='',last=0,match;
 while((match=pattern.exec(source))){let end=pattern.lastIndex,depth=1;for(;end<source.length&&depth;end++){if(source[end]==='{')depth++;else if(source[end]==='}')depth--;}if(depth)throw Error('Sampler candidate function boundary');const header=source.slice(match.index,pattern.lastIndex);if(!header.includes('vec2 uv')||!header.includes('float level'))throw Error('Sampler candidate argument contract');output+=source.slice(last,match.index)+header+'return textureLod(hbRayHardwareLevel983,uv,level);}';last=end;pattern.lastIndex=end;changed.push(match[1]);}
 if(changed.length!==1)throw Error('Exactly one supported linear 2D specialization required');output+=source.slice(last);const precision='precision highp sampler2D;';if(!output.includes(precision))throw Error('Sampler candidate precision marker');output=output.replace(precision,precision+'\nuniform highp sampler2D hbRayHardwareLevel983;');return {source:output,functions:changed.length,removed:changed,removedBytes:source.length-output.length,fallback:false,candidateOnly:true};
}
