import {createReadStream} from 'node:fs';

// Single byte ranges, including suffix ranges used by media decoders. BigInt
// parses endpoints before clamping, so a huge decimal cannot round into a
// different valid byte position. Multipart is deliberately not synthesized.
export function byteRange(header,size){
  if(!Number.isSafeInteger(size)||size<0)throw Error('파일 크기 오류');
  if(header===undefined)return {status:200,start:0,end:size-1,bytes:size};
  if(typeof header==='string'&&/^[^=]+=/.test(header)&&header.split('=')[0].trim().toLowerCase()!=='bytes')return {status:200,start:0,end:size-1,bytes:size};
  const match=typeof header==='string'&&/^bytes=(\d*)-(\d*)$/i.exec(header.trim());
  const invalid={status:416,bytes:0};if(!match||!match[1]&&!match[2])return invalid;
  if(!size)return !match[1]&&BigInt(match[2])>0n?{status:200,start:0,end:-1,bytes:0}:invalid;
  const length=BigInt(size),first=match[1]?BigInt(match[1]):null,last=match[2]?BigInt(match[2]):null;
  let start,end=length-1n;
  if(first===null){if(last===0n)return invalid;start=last>=length?0n:length-last;}
  else{start=first;if(last!==null&&last<end)end=last;}
  if(start>=length||start>end)return invalid;
  return {status:206,start:Number(start),end:Number(end),bytes:Number(end-start+1n)};
}
export function streamHttpFile(req,res,file,size,headers={}){
  if(!['GET','HEAD'].includes(req.method))return res.writeHead(405,{'Allow':'GET, HEAD','Content-Length':0}).end();
  // RFC9110 Range is defined for GET. HEAD returns the full representation's
  // headers without opening a source stream, even when Range was supplied.
  const range=byteRange(req.method==='GET'&&req.headers['if-range']===undefined?req.headers.range:undefined,size);
  res.writeHead(range.status,{...headers,'Accept-Ranges':'bytes','Content-Length':range.bytes,...(range.status===416?{'Content-Range':'bytes */'+size}:range.status===206?{'Content-Range':`bytes ${range.start}-${range.end}/${size}`}:{})});
  if(req.method==='HEAD'||!range.bytes)return res.end();
  const input=createReadStream(file,{start:range.start,end:range.end,highWaterMark:64*1024}),close=()=>input.destroy();
  res.once('close',close);input.once('close',()=>res.off('close',close));input.once('error',()=>res.destroy());input.pipe(res);
}
