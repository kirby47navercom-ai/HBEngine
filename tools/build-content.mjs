import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

// Opaque content stays on disk. Only structured documents are materialized by
// the caller for validation/cooking. A descriptor cannot be forged by JSON.
const sources=new WeakMap();
export const buildChunkBytes=64*1024;
const fingerprint=s=>[s.dev,s.ino,s.size,s.mtimeNs,s.ctimeNs].join(':');
const inside=(base,file)=>{const p=path.relative(base,file);return p!==''&&!p.startsWith('..'+path.sep)&&p!=='..'&&!path.isAbsolute(p);};
export const isFileContent=value=>!!value&&sources.has(value);
export async function fileContent(file,{root,signal}={}){
  signal?.throwIfAborted();const real=await fs.realpath(file);
  if(root&&!inside(await fs.realpath(root),real))throw Error('빌드 원본이 프로젝트 밖이에요.');
  const stat=await fs.stat(real,{bigint:true});
  if(!stat.isFile()||stat.size>BigInt(Number.MAX_SAFE_INTEGER))throw Error('빌드 원본 파일 크기 오류');
  const value=Object.freeze({length:Number(stat.size)});sources.set(value,{file:real,fingerprint:fingerprint(stat)});return value;
}
export async function* contentChunks(value,{signal}={}){
  signal?.throwIfAborted();const source=sources.get(value);
  if(!source){if(!Buffer.isBuffer(value))throw Error('빌드 콘텐츠 형식 오류');yield value;return;}
  let handle;
  try{
    handle=await fs.open(source.file,'r');
    const check=async()=>{if(fingerprint(await handle.stat({bigint:true}))!==source.fingerprint||fingerprint(await fs.stat(source.file,{bigint:true}))!==source.fingerprint||await fs.realpath(source.file)!==source.file)throw Error('빌드 중 원본이 변경됐어요: '+source.file);};
    await check();const buffer=Buffer.allocUnsafe(Math.min(buildChunkBytes,Math.max(1,value.length)));let position=0;
    while(position<value.length){signal?.throwIfAborted();const {bytesRead}=await handle.read(buffer,0,Math.min(buffer.length,value.length-position),position);if(!bytesRead)throw Error('빌드 원본이 잘렸어요: '+source.file);position+=bytesRead;yield buffer.subarray(0,bytesRead);}
    signal?.throwIfAborted();await check();
  }finally{await handle?.close();}
}
export async function hashBuildFile(file,options={}){
  const content=await fileContent(file,options),hash=createHash('sha256');for await(const chunk of contentChunks(content,options))hash.update(chunk);return {bytes:content.length,sha256:hash.digest('hex')};
}
export async function writeBuildContent(directory,name,content,{signal}={}){
  signal?.throwIfAborted();if(typeof name!=='string'||!name||/[\\:\x00-\x1f]/.test(name)||name.split('/').some(p=>!p||p==='.'||p==='..'))throw Error('빌드 출력 경로 오류');
  const root=await fs.realpath(directory),file=path.resolve(root,name);if(!inside(root,file))throw Error('빌드 출력 범위 오류');
  // Resolve each parent before creating descendants: never create outside a
  // pre-existing directory junction. The final write is exclusive as well.
  let parent=root;for(const part of name.split('/').slice(0,-1)){parent=path.join(parent,part);await fs.mkdir(parent).catch(e=>{if(e.code!=='EEXIST')throw e;});const real=await fs.realpath(parent);if(!inside(root,real))throw Error('빌드 출력 링크 범위 오류');}
  let handle,created=false;const hash=createHash('sha256');let bytes=0;
  try{
    handle=await fs.open(file,'wx');created=true;
    for await(const chunk of contentChunks(content,{signal})){let offset=0;while(offset<chunk.length){signal?.throwIfAborted();const result=await handle.write(chunk,offset,chunk.length-offset);if(!result.bytesWritten)throw Error('빌드 출력 쓰기 실패');offset+=result.bytesWritten;}hash.update(chunk);bytes+=chunk.length;}
    signal?.throwIfAborted();await handle.close();handle=null;return {path:name,bytes,sha256:hash.digest('hex')};
  }catch(error){await handle?.close().catch(()=>{});handle=null;if(created)await fs.unlink(file).catch(()=>{});throw error;}
  finally{await handle?.close();}
}
