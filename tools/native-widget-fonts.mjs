import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {isMainThread,parentPort,isMarkedAsUntransferable} from 'node:worker_threads';
import {GlobalFonts} from '@napi-rs/canvas';

// Skia's font collection is process-wide, including worker isolates. Only the
// owner thread unregisters a face, after every UI connection releases its lease.
const faces=new Map(),owners=new Map(),keyReferences=new Map(),permanentKeys=new Set();
let defaultsJob,serial=0;
async function defaults(){
 return defaultsJob??=Promise.all([['segoeui.ttf','HBSystemUI'],['malgun.ttf','HBKorean']].map(async([file,family])=>{
  if(GlobalFonts.has(family))return;
  const filePath=path.join(process.env.WINDIR||'C:/Windows','Fonts',file);
  try{await fs.access(filePath);}catch(error){if(error.code==='ENOENT')return;throw error;}
  const key=GlobalFonts.registerFromPath(filePath,family);if(key)permanentKeys.add(key.typefaceId);
 }));
}
function release(owner,leases){
 const held=owners.get(owner);if(!held)return;
 const removed=new Map();for(const lease of leases||held.keys()){
  const face=held.get(lease);if(!face)continue;held.delete(lease);
  const count=keyReferences.get(face.key.typefaceId)-1;
  if(count)keyReferences.set(face.key.typefaceId,count);else{keyReferences.delete(face.key.typefaceId);if(!permanentKeys.has(face.key.typefaceId))removed.set(face.key.typefaceId,face.key);}
  if(--face.refs===0)faces.delete(face.hash);
 }
 if(!held.size)owners.delete(owner);
 if(removed.size)GlobalFonts.removeBatch([...removed.values()]);
}
async function command(owner,op,data){
 if(op==='defaults'){await defaults();return {};}
 if(op==='release'){release(owner,data.leases);return {};}
 if(op==='close'){release(owner);return {};}
 if(op!=='acquire')throw Error('네이티브 글꼴 요청을 확인하세요.');
 const bytes=Buffer.from(data.bytes.buffer,data.bytes.byteOffset,data.bytes.byteLength),hash=createHash('sha256').update(bytes).digest('hex');let face=faces.get(hash);
 if(!face){const family='HBFont_'+hash,key=GlobalFonts.register(bytes,family);if(!key)throw Error('한글·UI 글꼴을 읽을 수 없어요: '+data.name);face={hash,family,key,sourceBytes:bytes.length,refs:0};faces.set(hash,face);}
 const lease=++serial;face.refs++;keyReferences.set(face.key.typefaceId,(keyReferences.get(face.key.typefaceId)||0)+1);
 let held=owners.get(owner);if(!held){held=new Map();owners.set(owner,held);}held.set(lease,face);
 return {lease,family:face.family,sourceBytes:face.sourceBytes,hash:face.hash};
}

export class NativeWidgetFontConnection {
 constructor(){this.prefix=randomUUID()+':';this.owners=new Set();this.closed=false;}
 async request(message){if(this.closed)throw Error('네이티브 글꼴 연결이 종료됐어요.');const owner=this.prefix+message.owner;this.owners.add(owner);const value=await command(owner,message.op,message.data||{});if(this.closed){release(owner);throw Error('네이티브 글꼴 연결이 종료됐어요.');}if(message.op==='close')this.owners.delete(owner);return value;}
 dispose(){this.closed=true;for(const owner of this.owners)release(owner);this.owners.clear();}
}

const remote=new Map();let requestSerial=0;
export function receiveNativeWidgetFontResponse(message){
 if(message.type!=='fontResponse')return false;const pending=remote.get(message.id);if(!pending)return true;remote.delete(message.id);message.error?pending.reject(Error(message.error)):pending.resolve(message.value);return true;
}
function request(owner,op,data={}){
 if(isMainThread)return command(owner,op,data);
 const id=++requestSerial;return new Promise((resolve,reject)=>{remote.set(id,{resolve,reject});try{
  const transfer=[];if(data.bytes){let bytes=data.bytes;if(bytes.byteOffset||bytes.byteLength!==bytes.buffer.byteLength||isMarkedAsUntransferable(bytes.buffer))bytes=new Uint8Array(bytes);data={...data,bytes};transfer.push(bytes.buffer);}
  parentPort.postMessage({type:'font',id,owner,op,data},transfer);
 }catch(error){remote.delete(id);reject(error);}});
}

export class NativeWidgetFonts {
 constructor(pack){this.pack=pack;this.owner=randomUUID();this.families=new Map();this.leases=new Map();this.pending=new Map();this.releases=new Set();this.revision=0;this.loads=0;this.closed=false;}
 release(leases){if(!leases.length)return;const pending=request(this.owner,'release',{leases}).catch(error=>{this.failure=error;}).finally(()=>this.releases.delete(pending));this.releases.add(pending);}
 async acquire(name){
  if(this.leases.has(name))return;
  let pending=this.pending.get(name);if(!pending){pending=(async()=>{
   const bytes=this.pack.readBytes?await this.pack.readBytes(name):await fs.readFile(await this.pack.resolve(name));
   if(this.closed)return;const value=await request(this.owner,'acquire',{name,bytes});
   if(this.closed){await request(this.owner,'release',{leases:[value.lease]});return;}
   this.leases.set(name,value);this.families.set(name,value.family);this.revision++;this.loads++;
  })().finally(()=>this.pending.delete(name));this.pending.set(name,pending);}await pending;
 }
 async prepare(assets){
  if(this.failure)throw this.failure;if(this.closed)return;
  if(assets.text&&!this.defaultsReady){await request(this.owner,'defaults');this.defaultsReady=true;this.revision++;}
  for(const name of assets.fonts)await this.acquire(name);
 }
 prune(used){const removed=[];for(const [name,value]of this.leases)if(!used.has(name)){this.leases.delete(name);this.families.delete(name);removed.push(value.lease);}if(removed.length){this.revision++;this.release(removed);}}
 diagnostics(){const unique=new Map([...this.leases.values()].map(value=>[value.hash,value.sourceBytes]));return {assetReferences:this.leases.size,uniqueCustomFaces:unique.size,encodedSourceBytes:[...unique.values()].reduce((n,bytes)=>n+bytes,0),pendingLoads:this.pending.size,loads:this.loads,defaultFaces:'shared-process-lifetime',memoryScope:'Encoded source size, not total Skia/glyph RAM'};}
 async dispose(){if(this.disposing)return this.disposing;this.closed=true;this.disposing=(async()=>{await Promise.allSettled([...this.pending.values(),...this.releases]);await request(this.owner,'close');this.leases.clear();this.families.clear();})();return this.disposing;}
}
