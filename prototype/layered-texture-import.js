import {createPixelCanvas} from './pixel-canvas.js';
import {layerNormalizationSize,layerNormalizationPolicy,drawNormalizedLayer} from './layered-texture-normalization.js';
import {textureImportPolicy} from './texture-mip-policy.js';
import {cookTextureMipsAsync} from './texture-mip-cook.js';
import {createLayeredMipTexture} from './texture-authored-mips.js';
import {loadTextureImage} from './texture-image-load.js';
// Decode is caller-owned; neither documents nor global caches retain pixels.
export async function decodeLayeredMipPixels(asset,loader,fileUrl,first,document,signal){
 signal?.throwIfAborted();first??=await loader.loadAsync(fileUrl(asset.images[0]));const dimension=asset.dimension,volume=dimension==='volumetexture',levels=[];const normalization=layerNormalizationPolicy(asset.layerNormalization),size=layerNormalizationSize(first,asset.layerNormalization,dimension),canvas=createPixelCanvas();let width=size.width,height=size.height,depth=asset.images.length,resizedSources=0;
 try{const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)throw Error('레이어 텍스처 이미지를 읽지 못했어요.');for(const [mip,images]of [asset.images,...(asset.mips||[]).map(l=>l.images)].entries()){
  const bytes=width*height*depth*4;if(![width,height,depth].every(v=>Number.isSafeInteger(v)&&v>0)||!Number.isSafeInteger(bytes)||bytes>2147483647||images.length!==depth||dimension==='cubemap'&&(depth!==6||width!==height))throw Error('레이어 텍스처 크기·슬라이스를 확인하세요.');canvas.width=width;canvas.height=height;const data=new Uint8Array(bytes);
  for(let z=0;z<images.length;z++){signal?.throwIfAborted();const image=mip===0&&z===0?first:await loader.loadAsync(fileUrl(images[z]));signal?.throwIfAborted();context.clearRect(0,0,width,height);if(drawNormalizedLayer(context,image,width,height,normalization))resizedSources++;data.set(context.getImageData(0,0,width,height).data,z*width*height*4);}
  levels.push({dimension,width,height,depth,data});width=Math.max(1,Math.floor(width/2));height=Math.max(1,Math.floor(height/2));if(volume)depth=Math.max(1,Math.floor(depth/2));
 }if(normalization.mode!=='strict')levels.normalization={...normalization,width:size.width,height:size.height,resizedSources};return levels;}finally{canvas.width=canvas.height=0;}
}
export async function cookImportedLayeredPixels(asset,loader,fileUrl,first,document,signal){
 const policy=textureImportPolicy(asset.import);for(let attempt=0;attempt<2;attempt++)try{const levels=await decodeLayeredMipPixels(asset,loader,fileUrl,first,document,signal);const cooked=await cookTextureMipsAsync(levels[0],policy,{signal,transfer:true,...(asset.mips?.length?{authoredLevels:levels.slice(1)}:{})});if(levels.normalization)cooked.report.layerNormalization=levels.normalization;return cooked;}catch(error){if(!error.retryTextureDecode||attempt)throw error;}
}
export async function loadImportedLayeredTexture(THREE,asset,loader,fileUrl,first,{signal,document=globalThis.document}={}){const cooked=await cookImportedLayeredPixels(asset,loader,fileUrl,first,document,signal);signal?.throwIfAborted();return createLayeredMipTexture(THREE,asset.dimension,cooked.levels,cooked.report);}
export function createLayeredTexturePreview(asset,fileUrl,win){
 const controller=new AbortController();let disposed=false,pending=null;
 const loader={loadAsync:url=>loadTextureImage(url,controller.signal,win.Image)};
 return{async decode(source,signal){signal?.throwIfAborted();if(disposed)throw Error('레이어 미리보기가 닫혔어요.');pending??=cookImportedLayeredPixels(asset,loader,fileUrl,undefined,win.document,controller.signal).catch(error=>{pending=null;throw error;});const cooked=await pending;signal?.throwIfAborted();if(disposed)throw Error('레이어 미리보기가 닫혔어요.');const index=asset.images.indexOf(source);if(index<0)throw Error('레이어 미리보기 원본이 없어요.');const images=cooked.levels.map(level=>{const z=asset.dimension==='volumetexture'?Math.min(level.depth-1,Math.floor((index+.5)/asset.images.length*level.depth)):index,slice=level.width*level.height*4,view=win.createPixelCanvas();view.width=view.naturalWidth=level.width;view.height=view.naturalHeight=level.height;view.getContext('2d').putImageData(new win.ImageData(new Uint8ClampedArray(level.data.buffer,level.data.byteOffset+z*slice,slice),level.width,level.height),0,0);return view;});return{report:cooked.report,images};},dispose(){if(disposed)return;disposed=true;controller.abort();pending=null;}};
}
