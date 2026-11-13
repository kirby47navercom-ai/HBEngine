import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {Readable,Writable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {promisify} from 'node:util';
import {createZstdCompress,createZstdDecompress,zstdCompress,zstdDecompress,constants} from 'node:zlib';
import {contentChunks,hashBuildFile} from './build-content.mjs';
import {byteRange} from './http-file.mjs';

const compress=promisify(zstdCompress),decompress=promisify(zstdDecompress),magic=Buffer.from('HBDATA1\0'),headerBytes=64,indexLimit=64*1024*1024;
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const safe=name=>typeof name==='string'&&name.length>0&&name.length<=2000&&!/[\\:\x00-\x1f]/.test(name)&&!name.startsWith('/')&&!name.split('/').some(p=>!p||p==='.'||p==='..');
const integer=value=>Number.isSafeInteger(value)&&value>=0;
const compressedMedia=/\.(?:png|jpe?g|webp|gif|ogg|mp3|m4a|aac|wav|mp4|webm|zip|gz|woff2)$/i;
async function writeAll(handle,bytes,position){let at=0;while(at<bytes.length){const result=await handle.write(bytes,at,bytes.length-at,position+at);if(!result.bytesWritten)throw Error('리소스 묶음 쓰기 실패');at+=result.bytesWritten;}}
async function readAll(handle,size,position){const bytes=Buffer.allocUnsafe(size);let at=0;while(at<size){const result=await handle.read(bytes,at,size-at,position+at);if(!result.bytesRead)throw Error('리소스 묶음이 잘렸어요.');at+=result.bytesRead;}return bytes;}

// Stream one entry at a time. Already-compressed media stays byte-identical;
// other entries use Zstd only when it actually reduces their stored size.
export async function writeGameResources(directory,content,{signal}={}){
 const root=await fs.realpath(directory),file=path.join(root,'game.hbdata'),rows=[],names=new Set();let handle,position=headerBytes,created=false;
 try{
  handle=await fs.open(file,'wx');created=true;await writeAll(handle,Buffer.alloc(headerBytes),0);
  for(const [name,value]of content){
   signal?.throwIfAborted();if(!safe(name)||names.has(name.toLowerCase()))throw Error('리소스 묶음 경로·중복 오류');names.add(name.toLowerCase());
   const start=position,hash=createHash('sha256');let bytes=0,encoding=compressedMedia.test(name)?'raw':'zstd';
   const source=async function*(){for await(const chunk of contentChunks(value,{signal})){hash.update(chunk);bytes+=chunk.length;yield Buffer.from(chunk);}};
   const sink=new Writable({write(chunk,_encoding,done){writeAll(handle,chunk,position).then(()=>{position+=chunk.length;done();},done);}});
   const options=signal?{signal}:{};
   if(encoding==='zstd')await pipeline(Readable.from(source(),{objectMode:false,highWaterMark:64*1024}),createZstdCompress({params:{[constants.ZSTD_c_compressionLevel]:3}}),sink,options);
   else await pipeline(Readable.from(source(),{objectMode:false,highWaterMark:64*1024}),sink,options);
   if(encoding==='zstd'&&position-start>=bytes){encoding='raw';await handle.truncate(start);position=start;for await(const chunk of contentChunks(value,{signal})){await writeAll(handle,chunk,position);position+=chunk.length;}}
   rows.push({path:name,offset:start,storedBytes:position-start,bytes,encoding,sha256:hash.digest('hex')});
  }
  const index=Buffer.from(JSON.stringify({version:1,entries:rows}));if(index.length>indexLimit)throw Error('리소스 묶음 색인이 너무 커요.');
  const packed=await compress(index),header=Buffer.alloc(headerBytes);magic.copy(header);header.writeBigUInt64LE(BigInt(position),8);header.writeBigUInt64LE(BigInt(packed.length),16);header.writeBigUInt64LE(BigInt(index.length),24);Buffer.from(digest(index),'hex').copy(header,32);
  await writeAll(handle,packed,position);await writeAll(handle,header,0);await handle.close();handle=null;
  const checked=await hashBuildFile(file,{root,signal});return {path:'game.hbdata',...checked,format:'hbdata1',entries:rows.length,sourceBytes:rows.reduce((n,row)=>n+row.bytes,0)};
 }catch(error){await handle?.close().catch(()=>{});handle=null;if(created)await fs.unlink(file).catch(()=>{});throw error;}finally{await handle?.close();}
}

export async function openGameResources(file){
 const handle=await fs.open(file,'r');let closed=false;
 try{
  const stat=await handle.stat();if(!stat.isFile()||!integer(stat.size)||stat.size<headerBytes)throw Error('리소스 묶음 파일 오류');
  const header=await readAll(handle,headerBytes,0);if(!header.subarray(0,8).equals(magic))throw Error('리소스 묶음 헤더 오류');
  const [offset,stored,size]=[8,16,24].map(at=>Number(header.readBigUInt64LE(at)));
  if(![offset,stored,size].every(integer)||offset<headerBytes||offset+stored!==stat.size||stored>indexLimit||size>indexLimit)throw Error('리소스 묶음 색인 범위 오류');
  const index=await decompress(await readAll(handle,stored,offset),{maxOutputLength:size||1});if(index.length!==size||digest(index)!==header.subarray(32).toString('hex'))throw Error('리소스 묶음 색인 손상');
  const data=JSON.parse(index);if(data.version!==1||!Array.isArray(data.entries))throw Error('리소스 묶음 색인 형식 오류');
  const entries=new Map(),names=new Set();let end=headerBytes;
  for(const row of data.entries){if(!row||!safe(row.path)||names.has(row.path.toLowerCase())||![row.offset,row.storedBytes,row.bytes].every(integer)||row.offset!==end||row.offset+row.storedBytes>offset||!['raw','zstd'].includes(row.encoding)||row.encoding==='raw'&&row.bytes!==row.storedBytes||!/^[a-f0-9]{64}$/.test(row.sha256))throw Error('리소스 묶음 항목 범위·중복 오류');end=row.offset+row.storedBytes;names.add(row.path.toLowerCase());entries.set(row.path,Object.freeze({...row}));}
  if(end!==offset)throw Error('리소스 묶음 콘텐츠 범위 오류');
  const read=async(name,{signal}={})=>{signal?.throwIfAborted();if(closed)throw Error('리소스 묶음이 닫혔어요.');const row=entries.get(name);if(!row)throw Object.assign(Error('패키지 에셋이 없어요: '+name),{code:'ENOENT'});const packed=await readAll(handle,row.storedBytes,row.offset),bytes=row.encoding==='zstd'?await decompress(packed,{maxOutputLength:row.bytes||1}):packed;signal?.throwIfAborted();if(bytes.length!==row.bytes||digest(bytes)!==row.sha256)throw Error('리소스 묶음 에셋 손상: '+name);return bytes;};
  const stream=(name,start,end)=>{if(closed)throw Error('리소스 묶음이 닫혔어요.');const row=entries.get(name);if(!row||!integer(start)||!integer(end)||start>end||end>=row.bytes)throw Error('리소스 묶음 스트림 범위 오류');
   const source=createReadStream(file,{start:row.offset+(row.encoding==='raw'?start:0),end:row.offset+(row.encoding==='raw'?end:row.storedBytes-1),highWaterMark:64*1024});
   const decoded=row.encoding==='zstd'?source.pipe(createZstdDecompress()):source;if(decoded!==source)source.on('error',error=>decoded.destroy(error));
   return Readable.from((async function*(){let offset=row.encoding==='raw'?start:0;try{for await(const chunk of decoded){const next=offset+chunk.length;if(next>start&&offset<=end)yield chunk.subarray(Math.max(0,start-offset),Math.min(chunk.length,end+1-offset));offset=next;if(offset>end)break;}if(offset<=end)throw Error('리소스 묶음 스트림이 잘렸어요.');}finally{decoded.destroy();source.destroy();}})());
  };
  return {entries,read,stream,close:async()=>{if(!closed){closed=true;await handle.close();}}};
 }catch(error){await handle.close();throw error;}
}

export async function streamGameResource(req,res,archive,name,headers={}){
 const row=archive.entries.get(name);if(!row)throw Object.assign(Error('패키지 에셋이 없어요.'),{code:'ENOENT'});
 if(!['GET','HEAD'].includes(req.method))return res.writeHead(405,{'Allow':'GET, HEAD','Content-Length':0}).end();
 const range=byteRange(req.method==='GET'&&req.headers['if-range']===undefined?req.headers.range:undefined,row.bytes);
 // HEAD/invalid ranges do not decode assets. Range responses stream through
 // bounded buffers; even large audio does not become a resident RAM cache.
 res.writeHead(range.status,{...headers,'Accept-Ranges':'bytes','Content-Length':range.bytes,...range.status===416?{'Content-Range':'bytes */'+row.bytes}:range.status===206?{'Content-Range':`bytes ${range.start}-${range.end}/${row.bytes}`}:{}});
 if(req.method==='HEAD'||!range.bytes)return res.end();const input=archive.stream(name,range.start,range.end),close=()=>input.destroy();res.once('close',close);input.once('close',()=>res.off('close',close));input.once('error',()=>res.destroy());input.pipe(res);
}
