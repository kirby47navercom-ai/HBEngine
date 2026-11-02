// Source identity survives Three texture clones. A frame must prepare every
// visible deferred source before encoding; no placeholder is ever presented.
const sources=new WeakMap();
export function registerDeferredTexture(texture,load){sources.set(texture.source,{load,texture,pending:null,ready:false});return texture;}
export const deferredTexturePending=texture=>{const state=sources.get(texture.source);return !!state&&!state.ready;};
export function prepareDeferredTexture(texture){
 const state=sources.get(texture.source);if(!state||state.ready)return;
 if(!state.pending)state.pending=Promise.resolve().then(()=>state.load()).then(image=>{state.texture.image=image;state.texture.needsUpdate=true;state.load=null;state.ready=true;});
 return state.pending;
}
