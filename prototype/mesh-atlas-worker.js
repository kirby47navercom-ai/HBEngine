import {computeMeshAtlas} from './mesh-atlas-core.js';
self.onmessage=async({data:{mesh,settings}})=>{try{const result=await computeMeshAtlas(mesh,settings,progress=>self.postMessage({progress}));self.postMessage({result});}catch(error){self.postMessage({error:error.message||String(error)});}};
