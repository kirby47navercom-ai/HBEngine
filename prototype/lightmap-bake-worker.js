import {bakeLightmapCore} from './lightmap-bake-core.js';
import {packLightmapPages} from './lightmap-pages.js';
self.onmessage=async({data:{snapshot,settings,name}})=>{try{let last=0;const result=bakeLightmapCore(snapshot,settings,progress=>{const now=performance.now();if(now-last>100){last=now;self.postMessage({progress});}});self.postMessage({result:await packLightmapPages(result,{name,pageSize:settings.pageSize})});}catch(error){self.postMessage({error:error.message||String(error)});}};
