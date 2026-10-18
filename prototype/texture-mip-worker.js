import {cookTextureMips} from './texture-mip-policy.js';
self.onmessage=({data:{id,pixels,policy}})=>{try{const result=cookTextureMips(pixels,policy),buffers=[...new Set(result.levels.map(l=>l.data.buffer))];self.postMessage({id,result},buffers);}catch(error){self.postMessage({id,error:error.message});}};
self.postMessage({ready:true});
