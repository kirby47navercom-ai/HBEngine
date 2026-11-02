// A sprite frame changes UVs, not its atlas pixels. Track clone-only version
// bumps separately so native uploads still observe real pixel edits.
const sources=new WeakMap(),clones=new WeakMap();
function observe(source){let state=sources.get(source);if(!state){state={expected:source.version,revision:1};sources.set(source,state);}else if(state.expected!==source.version){state.expected=source.version;state.revision++;}return state;}
export function beginSpriteTextureClone(base){return observe(base.source);}
export function registerSpriteTextureClone(texture,base,state){if(texture.source===base.source){state.expected=base.source.version;clones.set(texture,{base,source:base.source,version:texture.version});}return texture;}
export function nativeSpriteTextureSource(texture){const record=clones.get(texture);if(!record||record.version!==texture.version||record.source!==texture.source||record.base.source!==texture.source||texture.isCubeTexture||texture.isDataArrayTexture||texture.isData3DTexture||texture.userData?.hbAuthoredMips||texture.userData?.hbRayScene||texture.updateRanges?.length)return null;const state=observe(record.source);return {base:record.base,revision:state.revision};}
export function spriteTextureUploadKey(texture,base){return base.source.uuid+':sprite:'+JSON.stringify([texture.format,texture.type,texture.colorSpace,texture.flipY,texture.generateMipmaps,texture.premultiplyAlpha,texture.unpackAlignment,texture.magFilter,texture.minFilter,texture.wrapS,texture.wrapT,texture.anisotropy]);}
