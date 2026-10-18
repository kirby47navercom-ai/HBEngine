import fs from 'node:fs/promises';import path from 'node:path';import {randomUUID} from 'node:crypto';
export const nativePathInside=(root,file)=>{const rel=path.relative(root,file);return !!rel&&!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel);};
export function nativeProcessAlive(pid){if(!Number.isSafeInteger(pid)||pid<1)return false;try{process.kill(pid,0);return true;}catch(error){return error.code==='EPERM';}}
export async function assertNativeNoLinks(file){for(let p=path.resolve(file);;p=path.dirname(p)){const stat=await fs.lstat(p).catch(error=>error.code==='ENOENT'?null:Promise.reject(error));if(stat?.isSymbolicLink())throw Error('네이티브 캐시 링크는 사용하지 않아요.');if(path.dirname(p)===p)break;}}
export async function nativeTreeSize(directory){let bytes=0,files=0;for(const e of await fs.readdir(directory,{withFileTypes:true})){const p=path.join(directory,e.name);if(e.isSymbolicLink())throw Error('네이티브 캐시 링크는 정리하지 않아요.');if(e.isDirectory()){const n=await nativeTreeSize(p);bytes+=n.bytes;files+=n.files;}else if(e.isFile()){bytes+=(await fs.stat(p)).size;files++;}}return {bytes,files};}
export async function removeNativeTree(root,directory){const base=await fs.realpath(root),target=await fs.realpath(directory);if(!nativePathInside(base,target))throw Error('네이티브 캐시 정리 범위를 확인하세요.');await assertNativeNoLinks(directory);await nativeTreeSize(directory);await fs.rm(target,{recursive:true,force:false});}
export async function nativeAtomicJSON(file,value){const temp=file+'.'+randomUUID()+'.tmp';try{await fs.writeFile(temp,JSON.stringify(value),{flag:'wx'});await fs.rename(temp,file);}finally{await fs.unlink(temp).catch(error=>{if(error.code!=='ENOENT')throw error;});}}
// Hold only metadata publication/renames under this lock. Compilation and large
// directory deletion happen outside it. Acquiring a reference precedes cache use.
export async function withNativeCacheLock(root,fn,{wait=true}={}){
 const lock=path.join(root,'.lock'),deadline=Date.now()+(wait?10000:0),nonce=randomUUID(),lease=path.join(lock,'owner-'+process.pid+'-'+nonce+'.json');await assertNativeNoLinks(root);
 for(;;){try{await fs.mkdir(lock);try{await fs.writeFile(lease,JSON.stringify({pid:process.pid,nonce}),{flag:'wx'});const claims=await fs.readdir(lock);if(claims.length===1&&claims[0]===path.basename(lease))break;await fs.unlink(lease).catch(error=>{if(error.code!=='ENOENT')throw error;});await fs.rmdir(lock).catch(error=>{if(!['ENOENT','ENOTEMPTY','EEXIST'].includes(error.code))throw error;});continue;}catch(error){if(error.code==='ENOENT')continue;throw error;}}catch(error){if(error.code!=='EEXIST')throw error;
   await assertNativeNoLinks(lock);const stat=await fs.stat(lock).catch(error=>error.code==='ENOENT'?null:Promise.reject(error));if(!stat)continue;
   const entries=await fs.readdir(lock).catch(error=>error.code==='ENOENT'?[]:Promise.reject(error)),owners=entries.map(name=>/^owner-(\d+)-[a-f0-9-]{36}\.json$/.exec(name));
   if(Date.now()-stat.mtimeMs>1000&&owners.every(Boolean)&&owners.every(row=>!nativeProcessAlive(+row[1]))){
    // Remove only the exact dead owner's names, then an empty directory. A
    // concurrent new claimant has a different lease name and cannot be removed.
    for(const name of entries)await fs.unlink(path.join(lock,name)).catch(error=>{if(error.code!=='ENOENT')throw error;});
    await fs.rmdir(lock).catch(error=>{if(!['ENOENT','ENOTEMPTY','EEXIST'].includes(error.code))throw error;});continue;}
   if(!wait)return {busy:true,deleted:0,bytes:0};if(Date.now()>=deadline)throw Error('다른 C++ 캐시 작업이 끝나지 않았어요.');await new Promise(resolve=>setTimeout(resolve,10));}}
 try{return await fn();}finally{await fs.unlink(lease).catch(error=>{if(error.code!=='ENOENT')throw error;});await fs.rmdir(lock).catch(error=>{if(!['ENOENT','ENOTEMPTY','EEXIST'].includes(error.code))throw error;});}
}
export async function publishNativeBinary(temporary,binary){
 const directory=path.dirname(binary);return withNativeCacheLock(directory,async()=>{
  try{await fs.access(binary);return false;}catch(error){if(error.code!=='ENOENT')throw error;}
  await fs.rename(temporary,binary);return true;
 });
}
export async function removeNativeAttempt(directory,attempt){if(path.dirname(attempt)!==directory||!/^compile-[a-f0-9-]{36}$/.test(path.basename(attempt)))throw Error('C++ 빌드 임시 경로를 확인하세요.');await removeNativeTree(directory,attempt);}
