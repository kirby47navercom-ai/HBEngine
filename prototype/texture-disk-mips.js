import {textureImportPolicy} from './texture-mip-policy.js';
import {loadTextureImage,textureImagePixels} from './texture-image-load.js';

const sources=new WeakMap();
export const diskMipSource=texture=>sources.get(texture);
export const attachDiskMipSource=(texture,source)=>sources.set(texture,source);
export function diskMipEligible(asset){if(!asset||!['texture2d','texturearray','cubemap','volumetexture'].includes(asset.dimension))return false;const p=textureImportPolicy(asset.import);return p.mipmaps&&!p.topMip&&!p.maxSize&&!p.preserveCoverage&&!p.flipGreen&&!p.normalizeNormals&&!asset.composite?.normalTexture;}
export function validDiskMipSettings(asset){
 const s=asset?.streaming;if(s===undefined)return true;
 if(!s||typeof s!=='object'||Array.isArray(s)||Object.keys(s).some(k=>!['enabled','width','height','depth','initialMip'].includes(k))||typeof s.enabled!=='boolean')return false;
 if(!s.enabled)return true;
 const volume=asset.dimension==='volumetexture',two=asset.dimension==='texture2d',depth=two?(s.depth??1):s.depth,n=Math.floor(Math.log2(Math.max(s.width,s.height,volume?depth:1)));
 if(!diskMipEligible(asset)||![s.width,s.height].every(v=>Number.isSafeInteger(v)&&v>0&&v<=16384)||!Number.isSafeInteger(depth)||depth<1||!Number.isSafeInteger(s.width*s.height*depth*4)||!Number.isInteger(s.initialMip)||s.initialMip<0||s.initialMip>n||asset.mips?.length!==n||!Array.isArray(asset.images)||asset.images.length!==depth||two&&depth!==1||asset.dimension==='cubemap'&&(depth!==6||s.width!==s.height))return false;
 let d=depth;return asset.mips.every(level=>{if(volume)d=Math.max(1,Math.floor(d/2));return Array.isArray(level?.images)&&level.images.length===d;});
}
const abortError=()=>new DOMException('Disk mip request cancelled','AbortError');
function wait(promise,signal){
 if(!signal)return promise;signal.throwIfAborted();return new Promise((resolve,reject)=>{const abort=()=>reject(signal.reason||abortError());signal.addEventListener('abort',abort,{once:true});promise.then(resolve,reject).finally(()=>signal.removeEventListener('abort',abort));});
}
// An asset's explicit image-per-level chain is immutable. Only the mip tail
// held by active/candidate views remains decoded. No disk cache/sidecar copy.
export class DiskMipSource{
 constructor(asset,fileUrl,{limits}={}){
  if(!validDiskMipSettings(asset)||!asset.streaming?.enabled)throw Error('디스크 밉 설정과 전체 사용자 지정 밉을 확인하세요.');
  let width=asset.streaming.width,height=asset.streaming.height,depth=asset.streaming.depth??1;this.dimension=asset.dimension;
  this.levels=[asset.images,...asset.mips.map(m=>m.images)].map(paths=>{const row={path:paths[0],paths:Object.freeze([...paths]),width,height,depth,bytes:width*height*depth*4};width=Math.max(1,width>>1);height=Math.max(1,height>>1);if(this.dimension==='volumetexture')depth=Math.max(1,Math.floor(depth/2));return row;});
  this.limits=limits?{maxSize:limits.maxSize||null,maxLayers:limits.maxLayers||null}:null;this.fileUrl=fileUrl;this.refs=this.levels.map(()=>0);this.jobs=this.levels.map(()=>null);this.reads=0;this.levelReads=0;this.cancelled=0;
 }
 reserve(base){
  if(!Number.isInteger(base)||base<0||base>=this.levels.length)throw Error('디스크 시작 밉을 확인하세요.');
  const first=this.levels[base];if(this.limits&&(this.limits.maxSize&&(first.width>this.limits.maxSize||first.height>this.limits.maxSize)||this.limits.maxLayers&&first.depth>this.limits.maxLayers))throw Error('요청한 디스크 밉이 현재 장치의 크기·슬라이스 한도를 넘었어요.');
  for(let i=base;i<this.refs.length;i++)this.refs[i]++;let released=false;
  return()=>{if(released)return;released=true;for(let i=base;i<this.refs.length;i++)if(!--this.refs[i]){this.jobs[i]?.controller.abort();delete this.levels[i].data;}};
 }
 retain(base){if(this.levels.slice(base).some(l=>!l.data))throw Error('디스크 밉을 먼저 비동기로 읽어야 해요.');return this.reserve(base);}
 async acquire(base,signal){
  signal?.throwIfAborted();const release=this.reserve(base);
  try{for(let i=this.levels.length-1;i>=base;i--){signal?.throwIfAborted();await wait(this.read(i),signal);}signal?.throwIfAborted();return release;}catch(error){release();throw error;}
 }
 read(index){
  const row=this.levels[index];if(row.data)return Promise.resolve();let job=this.jobs[index];if(job&&!job.controller.signal.aborted)return job.promise;
  job={controller:new AbortController()};this.jobs[index]=job;this.levelReads++;
  job.promise=Promise.resolve().then(async()=>{if(!Number.isSafeInteger(row.bytes)||row.bytes>2147483647)throw Error('디스크 밉 자료 크기를 확인하세요.');const two=this.dimension==='texture2d',packed=two?null:new Uint8Array(row.bytes),slice=row.width*row.height*4;let pixels;
   for(let z=0;z<row.paths.length;z++){job.controller.signal.throwIfAborted();this.reads++;const image=await loadTextureImage(this.fileUrl(row.paths[z]),job.controller.signal);if(image.width!==row.width||image.height!==row.height)throw Error('디스크 밉 이미지의 크기가 설정과 달라요.');pixels=textureImagePixels(image,two);if(packed)packed.set(pixels.data,z*slice);}
   job.controller.signal.throwIfAborted();if(this.jobs[index]!==job)throw abortError();row.data=packed||pixels.data;
  }).catch(error=>{if(job.controller.signal.aborted)this.cancelled++;throw error;}).finally(()=>{if(this.jobs[index]===job)this.jobs[index]=null;if(!this.refs[index])delete row.data;});
  return job.promise;
 }
 state(){return {dimension:this.dimension,decodedBytes:this.levels.reduce((n,l)=>n+(l.data?.byteLength||0),0),logicalBytes:this.levels.reduce((n,l)=>n+l.bytes,0),loadedLevels:this.levels.filter(l=>l.data).length,pendingReads:this.jobs.filter(Boolean).length,reads:this.reads,levelReads:this.levelReads,cancelledReads:this.cancelled,cache:'active and candidate views only; per-level decode shared across consumers, images sequential within a level; unused decoded levels released immediately; no persistent disk copy'};}
}
export const textureDiskMipContract=Object.freeze({version:2,asset:'texture2d/texturearray/cubemap/volumetexture.streaming {enabled,width,height,depth?,initialMip}; ND depth required, complete explicit image-per-level chain, constant array/cube depth and floor-half volume depth',policy:'RGBA8 authored chain without coverage/composite/green/normal processing or top-mip filtering; existing import path otherwise unchanged',loading:'smallest tail first, demand-driven fine levels; one shared job per level, sequential faces/slices, selected dimensions verified before publishing; reads counts image attempts, levelReads counts jobs',ownership:'weak-key metadata source shared by identical asset/URL-owner/device and captured paths/dimensions/limits; independent physical texture/sampler views; active and staged views pin decoded tails; unused levels and requests released immediately; paths captured at construction, external source files not snapshotted, no generated sidecars',runtime:'same Materials::SetResidentMip/Blueprint node and optional TextureStreaming pool; logical LOD/history retained; without pool initialMip remains until explicit request',limits:'Explicit RGBA8 images only; no raw/HDR/compressed, runtime region edits on disk sources, whole GPU/CPU heap guarantee, source-file snapshot across external edits or automatic authored-mip generation'});
