import {cookTextureMipsAsync} from './texture-mip-cook.js';
import {textureImportPolicy} from './texture-mip-policy.js';
import {compositeNormalSource} from './texture-composite.js';

// Canonical cook data is top-down. Bake the image-loader flip into each owned
// upload level once so GL, WebGPU, native and packed ray data see identical UVs.
function flipRows(level){const {width,height,data}=level,stride=width*4,row=new Uint8Array(stride);for(let y=0;y<Math.floor(height/2);y++){const a=y*stride,b=(height-y-1)*stride;row.set(data.subarray(a,a+stride));data.copyWithin(a,b,b+stride);data.set(row,b);}}
function readImage(image){const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;try{const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)throw Error('텍스처 원본 픽셀을 읽지 못했어요.');context.drawImage(image,0,0);return{width:image.width,height:image.height,data:context.getImageData(0,0,image.width,image.height).data};}finally{canvas.width=canvas.height=0;}}
export async function loadImportedTexture2D(THREE,asset,fileUrl,resources){
 const policy=textureImportPolicy(asset.import),source=compositeNormalSource(asset,resources),loader=new THREE.ImageLoader(),image=await loader.loadAsync(fileUrl(asset.images[0])),normal=source?(source===asset.images[0]?image:await loader.loadAsync(fileUrl(source))):null;let cooked;
 for(let attempt=0;attempt<2;attempt++){try{const pixels=readImage(image);cooked=await cookTextureMipsAsync(pixels,policy,{transfer:true,composite:asset.composite,normalPixels:normal===image?pixels:normal?readImage(normal):undefined});break;}catch(error){if(!error.retryTextureDecode||attempt)throw error;}}
 for(const level of cooked.levels)flipRows(level);const base=cooked.levels[0],map=new THREE.DataTexture(base.data,base.width,base.height,THREE.RGBAFormat,THREE.UnsignedByteType);map.mipmaps=cooked.levels;map.generateMipmaps=false;map.flipY=false;map.unpackAlignment=1;map.userData.hbCookedMips=true;map.userData.hbTextureImportReport=cooked.report;return map;
}
