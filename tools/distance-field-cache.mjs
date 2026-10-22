import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {pruneCookCache} from './cook-cache.mjs';
import {decodeDistanceField,distanceFieldCookVersion,distanceFieldCookDirectory,distanceFieldCookMaxBytes} from '../prototype/mesh-distance-field-codec.js';
const hash=b=>createHash('sha256').update(b).digest('hex');
const owners=['mesh-distance-field-core.js','mesh-distance-field-layout.js','mesh-distance-primitives.js','geometry-bvh-core.js','mesh-distance-field-codec.js'];
export async function distanceFieldGeneratorHash(){return hash(JSON.stringify(await Promise.all(owners.map(async p=>[p,hash(await fs.readFile(new URL('../prototype/'+p,import.meta.url)))]))));}
export const distanceFieldCacheKey=(generator,geometry,resolution)=>hash(JSON.stringify([distanceFieldCookVersion,generator,geometry,resolution]));
function checked(geometry,resolution){if(!/^[a-f0-9]{64}$/.test(geometry)||!Number.isInteger(resolution)||(resolution!==0&&(resolution<8||resolution>64)))throw Error('거리장 캐시 지문과 해상도를 확인하세요.');}
export async function readCachedDistanceField(project,geometry,resolution,{preferAnalytic=false,signal,generatorHash}={}){
 checked(geometry,resolution);signal?.throwIfAborted();const generator=generatorHash??await distanceFieldGeneratorHash();
 for(const quality of preferAnalytic&&resolution!==0?[0,resolution]:[resolution]){
  const name='Library/CookCache/'+distanceFieldCacheKey(generator,geometry,quality)+'.bin';let file;
  try{file=await project.resolve(name,true,false);const stat=await fs.stat(file);if(stat.size>distanceFieldCookMaxBytes+64)continue;const stored=await fs.readFile(file),bytes=stored.subarray(64);if(stored.length<80||stored.subarray(0,64).toString('ascii')!==hash(bytes))continue;const field=decodeDistanceField(bytes,geometry);if(field.resolution!==0&&field.resolution!==quality)continue;signal?.throwIfAborted();await fs.utimes(file,new Date(),new Date());const sha256=hash(bytes);return{bytes,field,row:{geometry,cacheResolution:quality,resolution:field.resolution,path:distanceFieldCookDirectory+'/'+sha256+'.bin',sha256,bytes:bytes.length}};}
  catch(error){if(signal?.aborted)throw signal.reason;if(error.code==='ENOENT')continue;if(error.code)throw error;/* Invalid generated cache is a miss; the source remains authoritative. */}
 }return null;
}
export class EditorDistanceFieldCache{
 constructor(){this.queue=Promise.resolve();}
 async get(project,geometry,resolution,options){await this.queue;return readCachedDistanceField(project,geometry,resolution,options);}
 put(project,geometry,resolution,input,checkOwner=()=>{}){const task=this.queue.then(async()=>{
  checked(geometry,resolution);if(input.length>distanceFieldCookMaxBytes)throw Error('거리장 캐시 파일 예산을 넘었어요.');const field=decodeDistanceField(input,geometry);if(field.resolution!==resolution)throw Error('거리장 캐시 해상도가 달라요.');checkOwner();
  const folder=await project.resolve('Library/CookCache',true,false);await fs.mkdir(folder,{recursive:true});const file=path.join(folder,distanceFieldCacheKey(await distanceFieldGeneratorHash(),geometry,resolution)+'.bin'),temp=file+'.'+randomUUID()+'.tmp';
  try{await fs.writeFile(temp,Buffer.concat([Buffer.from(hash(input),'ascii'),input]),{flag:'wx'});checkOwner();await fs.rename(temp,file);}finally{await fs.unlink(temp).catch(()=>{});}
  return{stored:true,bytes:input.length,retention:await pruneCookCache(folder)};
 });this.queue=task.catch(()=>{});return task;}
}
