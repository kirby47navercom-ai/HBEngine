import {cookLayeredTextureMips} from './layered-texture-mip-cook.js';
import {cookTextureMips} from './texture-mip-policy.js';
self.onmessage=({data:{id,pixels,policy,composite,normalPixels,authoredLevels,layered}})=>{try{const result=(layered?cookLayeredTextureMips:cookTextureMips)(pixels,policy,{composite,normalPixels,authoredLevels}),buffers=[...new Set(result.levels.map(l=>l.data.buffer))];self.postMessage({id,result},buffers);}catch(error){self.postMessage({id,error:error.message});}};
self.postMessage({ready:true});
