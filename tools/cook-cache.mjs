import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash,randomUUID} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex'),host=hash(os.hostname()).slice(0,8);
const budgetValue=value=>{if(!Number.isSafeInteger(value)||value<0)throw Error('쿠킹 캐시 예산 오류');return value;};
async function cached(file){const stat=await fs.lstat(file);if(!stat.isFile()||stat.isSymbolicLink())throw Object.assign(Error('쿠킹 캐시는 일반 파일이어야 해요.'),{code:'HB_CACHE_FILE'});const stored=await fs.readFile(file),output=stored.subarray(64);if(stored.length<64||stored.subarray(0,64).toString('ascii')!==hash(output))throw Object.assign(Error('쿠킹 캐시 손상'),{code:'HB_CACHE_CORRUPT'});await fs.utimes(file,new Date(),new Date()).catch(e=>{if(e.code!=='ENOENT')throw e;});return output;}
async function publish(file,output,signal){
 const temp=file.slice(0,-4)+'.'+process.pid+'.'+host+'.'+randomUUID()+'.tmp';let handle,created=false;
 try{handle=await fs.open(temp,'wx');created=true;await handle.writeFile(Buffer.concat([Buffer.from(hash(output),'ascii'),output]),{signal});await handle.close();handle=null;signal?.throwIfAborted();try{await fs.rename(temp,file);}catch(error){if(!['EPERM','EACCES','EEXIST'].includes(error.code))throw error;let winner;try{winner=await cached(file);}catch{throw error;}if(!winner.equals(output))throw error;}}
 finally{await handle?.close();if(created)await fs.unlink(temp).catch(e=>{if(e.code!=='ENOENT')throw e;});}
}
export async function cookContent(project,content,target,{budget=128*1024*1024,signal}={}){
 budgetValue(budget);signal?.throwIfAborted();const folder=await project.resolve('Library/CookCache',true,false);await fs.mkdir(folder,{recursive:true});const stat=await fs.lstat(folder);if(!stat.isDirectory()||stat.isSymbolicLink())throw Error('쿠킹 캐시 폴더를 확인하세요.');const cooked=new Map(),receipts=[],unique=new Map();let sharedContents=0;
 for(const [name,bytes]of content){signal?.throwIfAborted();if(!name.endsWith('.json')){cooked.set(name,bytes);continue;}const key=hash(JSON.stringify([3,target,hash(bytes)])),file=path.join(folder,key+'.bin');let output,hit=false,shared=false;
  if(unique.has(key)){output=Buffer.from(unique.get(key));hit=true;shared=true;sharedContents++;}else{try{output=await cached(file);hit=true;}catch(e){if(!['ENOENT','HB_CACHE_CORRUPT'].includes(e.code))throw e;output=Buffer.from(JSON.stringify(JSON.parse(bytes.toString('utf8'))));signal?.throwIfAborted();await publish(file,output,signal);}unique.set(key,output);}
  cooked.set(name,output);receipts.push({path:name,key,hit,shared,sourceBytes:bytes.length,cookedBytes:output.length});
 }
 signal?.throwIfAborted();const retention=await pruneCookCache(folder,budget);return{content:cooked,report:{target,cacheVersion:3,receipts,uniqueContents:unique.size,sharedContents,...retention}};
}
function processAlive(pid){try{process.kill(pid,0);return true;}catch(e){return e.code!=='ESRCH';}}
async function unlinkSnapshot(file,stat){try{const current=await fs.lstat(file);if(!current.isFile()||current.isSymbolicLink()||current.dev!==stat.dev||current.ino!==stat.ino||current.size!==stat.size||current.mtimeMs!==stat.mtimeMs)return false;await fs.unlink(file);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}}
export async function pruneCookCache(folder,budget=128*1024*1024,{staleTempAgeMS=3600000}={}){
 budgetValue(budget);if(!Number.isSafeInteger(staleTempAgeMS)||staleTempAgeMS<0)throw Error('쿠킹 임시 파일 보존 시간을 확인하세요.');const entries=[];let removedTemporary=0,temporaryBytesRemoved=0;const cutoff=Date.now()-staleTempAgeMS;
 for(const name of await fs.readdir(folder)){const binary=/^[a-f0-9]{64}\.bin$/.test(name),temp=/^[a-f0-9]{64}\.([1-9][0-9]{0,9})\.([a-f0-9]{8})\.[a-f0-9-]{36}\.tmp$/.exec(name);if(!binary&&!temp)continue;const file=path.join(folder,name);let stat;try{stat=await fs.lstat(file);}catch(e){if(e.code==='ENOENT')continue;throw e;}if(!stat.isFile()||stat.isSymbolicLink())continue;
  if(binary)entries.push({file,stat,bytes:stat.size,time:stat.mtimeMs});else if(temp[2]===host&&stat.mtimeMs<=cutoff&&!processAlive(Number(temp[1]))&&await unlinkSnapshot(file,stat)){removedTemporary++;temporaryBytesRemoved+=stat.size;}
 }
 let size=entries.reduce((s,e)=>s+e.bytes,0),removed=0;for(const row of entries.sort((a,b)=>a.time-b.time||a.file.localeCompare(b.file))){if(size<=budget)break;if(await unlinkSnapshot(row.file,row.stat)){size-=row.bytes;removed++;}else{try{await fs.access(row.file);}catch(e){if(e.code==='ENOENT')size-=row.bytes;else throw e;}}}return{cacheBytes:size,removed,removedTemporary,temporaryBytesRemoved};
}