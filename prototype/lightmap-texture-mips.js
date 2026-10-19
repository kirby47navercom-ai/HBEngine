import {LinearFilter,NearestFilter,LinearMipmapLinearFilter,NearestMipmapNearestFilter,NearestMipmapLinearFilter,LinearMipmapNearestFilter} from 'three';
import {rayMipChain} from './ray-mip.js';
export const createLightmapMipCache=()=>({entries:[],bytes:0,limit:32*1024*1024,maxEntries:32});
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const cubeUV=direction=>{const d=direction.every(n=>n===0)?[0,0,1]:direction,ad=d.map(Math.abs),axis=ad[0]>=ad[1]&&ad[0]>=ad[2]?0:ad[1]>=ad[2]?1:2,m=Math.max(ad[axis],1e-6),uv=axis===0?[d[0]>0?-d[2]:d[2],-d[1]]:axis===1?[d[0],d[1]>0?d[2]:-d[2]]:[d[2]>0?d[0]:-d[0],-d[1]];return uv.map(v=>v/m*.5+.5);};
export function lightmapMipSelection(texture,coordinate,colorSpace,options){
 const {type='texture2d',mipMode='auto',lod=0,bias=0,gradientX=[],gradientY=[],sampler,mipCache}=options;if(mipMode==='auto')return null;
 let requested=0;
 if(mipMode==='lod')requested=Math.max(0,lod);else if(mipMode==='bias')requested=0;else if(mipMode==='gradient'){
  const delta=v=>{if(type==='texturecube'){const a=cubeUV(coordinate),b=cubeUV(coordinate.map((n,i)=>n+(v[i]||0)));return [b[0]-a[0],b[1]-a[1],0];}const x=v[0]||0,y=v[1]||0,m=texture.matrix;return [m?m[0]*x+m[3]*y:x,m?m[1]*x+m[4]*y:y,type==='texture3d'?v[2]||0:0];},size=[texture.width,texture.height,type==='texture3d'?texture.depth||1:1],span=v=>Math.hypot(...delta(v).map((n,i)=>n*size[i]));requested=Math.log2(Math.max(1,span(gradientX),span(gradientY)));
 }else throw Error('베이크 텍스처 밉 모드를 확인하세요.');
 if(!Number.isFinite(requested))throw Error('베이크 텍스처 밉 입력을 확인하세요.');if(requested<=0)return null;
 const minFilter=sampler?.minFilter!==undefined?(sampler.minFilter==='nearest'?NearestMipmapNearestFilter:LinearMipmapLinearFilter):texture.minFilter??LinearMipmapLinearFilter,mipmaps=sampler?.mipmaps??texture.mipmaps??true;
 const spatial=[NearestFilter,NearestMipmapNearestFilter,NearestMipmapLinearFilter].includes(minFilter)?'nearest':'linear';if(!mipmaps||[LinearFilter,NearestFilter].includes(minFilter))return {levels:[{...texture,data:texture.pixels}],lod:0,spatial,converted:false};
 const cached=mipCache?.entries.find(e=>e.texture===texture&&e.colorSpace===colorSpace&&e.type===type&&e.minFilter===minFilter);let levels;
 if(cached){levels=cached.levels;mipCache.entries.splice(mipCache.entries.indexOf(cached),1);mipCache.entries.push(cached);}else{
  // Lifetime is one bake job. At most 32MiB or one larger texture chain, whose
  // size is governed by the existing bake snapshot; never one cache per texel.
  if(mipCache&&texture.width*texture.height*(texture.depth||1)*16*4/3>mipCache.limit){mipCache.entries=[];mipCache.bytes=0;}
  const map={generateMipmaps:!texture.authoredMips,minFilter,magFilter:LinearFilter,userData:{hbCookedMips:!!texture.levels&&!texture.authoredMips,hbAuthoredMips:!!texture.authoredMips},mipmaps:texture.levels,...texture.authoredMips?{image:{width:texture.width,height:texture.height,depth:texture.depth,data:texture.levels[0].data},isDataArrayTexture:type==='texturearray'||type==='texturecube',isData3DTexture:type==='texture3d'}:{}},pixels={version:0,width:texture.width,height:texture.height,depth:texture.depth||1,data:texture.pixels,float:!!texture.float};levels=rayMipChain(map,pixels,colorSpace==='srgb',type==='texture3d');
  if(mipCache){const bytes=levels.reduce((sum,l)=>sum+l.data.byteLength,0);while(mipCache.entries.length&&(mipCache.bytes+bytes>mipCache.limit||mipCache.entries.length>=mipCache.maxEntries))mipCache.bytes-=mipCache.entries.shift().bytes;mipCache.entries.push({texture,colorSpace,type,minFilter,levels,bytes});mipCache.bytes+=bytes;}
 }
 let level=clamp(requested,0,levels.length-1);if([NearestMipmapNearestFilter,LinearMipmapNearestFilter].includes(minFilter))level=Math.floor(level+.5);return {levels,lod:level,spatial,converted:true};
}
