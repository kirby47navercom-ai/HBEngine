export const authoredTextureMipContract=Object.freeze({version:1,dimensions:Object.freeze(['texturearray','volumetexture']),descriptor:'images is level zero; optional mips:[{images:[asset paths]}] stores subsequent consecutive levels',layout:'RGBA8 top-down slice-major; floor-half width/height, array layer count unchanged, volume depth floor-halved; a complete chain ends at 1x1 (array) or 1x1x1 (volume)',policy:'authored levels are preserved, never regenerated; all levels and slices must be present and dimensionally consistent',ownership:'decoded data is owned by the texture; source images are preserved; uploads only when texture version changes',editing:'document.patch/save and normal undo; image references participate in dependency/rename/packaging',backends:Object.freeze(['WebGL2','WebGPU','DirectX11','packed-ray-mips'])});
export function validAuthoredMipDescriptors(kind,images,mips,imagePath){
 if(mips===undefined)return true;if(!Array.isArray(mips))return false;if(!mips.length)return true;
 if(!['texturearray','volumetexture'].includes(kind))return false;let depth=images.length;
 return mips.every(level=>{if(kind==='volumetexture')depth=Math.max(1,Math.floor(depth/2));return !!level&&typeof level==='object'&&!Array.isArray(level)&&Object.keys(level).every(k=>k==='images')&&Array.isArray(level.images)&&level.images.length===depth&&level.images.every(imagePath);});
}
export const textureDescriptorImages=data=>[...data.images,...(data.mips||[]).flatMap(l=>l.images)];
export function validateLayeredTextureMips(texture){
 const volume=!!texture.isData3DTexture,array=!!texture.isDataArrayTexture,base=texture.image,levels=texture.mipmaps;
 if(!volume&&!array||texture.generateMipmaps||!Array.isArray(levels)||!levels.length)throw Error('배열·볼륨의 사용자 지정 밉을 확인하세요.');
 let w=base.width,h=base.height,d=base.depth;
 if(![w,h,d].every(n=>Number.isSafeInteger(n)&&n>0)||levels.length>1+Math.floor(Math.log2(Math.max(w,h,volume?d:1))))throw Error('사용자 지정 밉 개수와 크기를 확인하세요.');
 for(const[index,level]of levels.entries()){
  if(level.width!==w||level.height!==h||level.depth!==d||!(level.data instanceof Uint8Array||level.data instanceof Uint8ClampedArray)||!Number.isSafeInteger(w*h*d*4)||level.data.length!==w*h*d*4||index===0&&level.data!==base.data)throw Error('사용자 지정 밉 크기·슬라이스·RGBA8 자료가 달라요.');
  w=Math.max(1,Math.floor(w/2));h=Math.max(1,Math.floor(h/2));if(volume)d=Math.max(1,Math.floor(d/2));
 }
 // Sampling an incomplete chain would silently clamp or read uninitialized mips.
 const last=levels.at(-1);if(last.width!==1||last.height!==1||volume&&last.depth!==1)throw Error('사용자 지정 밉을 마지막 1 크기까지 지정하세요.');
 return levels;
}
export async function loadAuthoredLayeredTexture(THREE,asset,loader,fileUrl,first){
 const volume=asset.dimension==='volumetexture',levels=[],canvas=document.createElement('canvas');let width=first.width,height=first.height,depth=asset.images.length;
 try{
  const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)throw Error('사용자 지정 밉 이미지를 읽지 못했어요.');
  for(const[level,images]of [asset.images,...asset.mips.map(m=>m.images)].entries()){
   if(!Number.isSafeInteger(width*height*depth*4)||width*height*depth*4>2147483647)throw Error('사용자 지정 밉 자료 크기를 확인하세요.');
   canvas.width=width;canvas.height=height;const data=new Uint8Array(width*height*depth*4);
   for(let z=0;z<images.length;z++){const image=level===0&&z===0?first:await loader.loadAsync(fileUrl(images[z]));if(image.width!==width||image.height!==height)throw Error('사용자 지정 밉의 이미지 크기를 맞춰 주세요.');context.clearRect(0,0,width,height);context.drawImage(image,0,0);data.set(context.getImageData(0,0,width,height).data,z*width*height*4);}
   levels.push({width,height,depth,data});width=Math.max(1,Math.floor(width/2));height=Math.max(1,Math.floor(height/2));if(volume)depth=Math.max(1,Math.floor(depth/2));
  }
  const base=levels[0],map=volume?new THREE.Data3DTexture(base.data,base.width,base.height,base.depth):new THREE.DataArrayTexture(base.data,base.width,base.height,base.depth);map.mipmaps=levels;map.generateMipmaps=false;map.flipY=false;map.unpackAlignment=1;map.userData.hbAuthoredMips=true;
  try{validateLayeredTextureMips(map);}catch(error){map.dispose();throw error;}return map;
 }finally{canvas.width=canvas.height=0;}
}
