// AI bridge: the running native editor session answers JSON-RPC on 127.0.0.1 (random port, bearer token) so external
// AI apps (through tools/hb-mcp.mjs) can read and change the open project live. Calls share the editor's request queue,
// so they never interleave with the editor's own edits; every changing call bumps a revision the editor polls to refresh.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomBytes,timingSafeEqual} from 'node:crypto';

// Read-only calls do not make the editor refresh.
const readOnly=/^(content\.(list|listStatus|assetsOfKind)|document\.read|scene\.hierarchy|asset\.fields|editor\.(methods|history|externalRevision)|project\.(recent|buildProfiles|buildStatus|collisionLayers)|sourceControl\.status|profiler\.)/;
// Switching or creating projects stays with the person at the editor.
const denied=new Set(['project.open','project.create','project.recover','editor.autosave']);

export async function startAiBridge({dispatch,file,onChange=()=>{},maxBody=4*1024*1024}){
  const token=randomBytes(32).toString('hex'),expected=Buffer.from(token);
  const server=http.createServer((request,response)=>{
    const send=(status,body)=>{response.writeHead(status,{'content-type':'application/json; charset=utf-8'});response.end(JSON.stringify(body));};
    const auth=Buffer.from(String(request.headers.authorization||'').replace(/^Bearer /,''));
    if(request.method!=='POST'||request.url!=='/rpc')return send(404,{ok:false,error:'POST /rpc only'});
    if(auth.length!==expected.length||!timingSafeEqual(auth,expected))return send(401,{ok:false,error:'unauthorized'});
    let size=0;const chunks=[];
    request.on('data',chunk=>{size+=chunk.length;if(size>maxBody){send(413,{ok:false,error:'request too large'});request.destroy();}else chunks.push(chunk);});
    request.on('end',async()=>{
      if(response.writableEnded)return;
      let call;try{call=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return send(400,{ok:false,error:'invalid JSON'});}
      const {method,params={}}=call||{};
      if(typeof method!=='string'||!method)return send(400,{ok:false,error:'method required'});
      if(denied.has(method))return send(403,{ok:false,error:'이 명령은 편집기에서 직접 하세요: '+method});
      try{const value=await dispatch(method,params&&typeof params==='object'?params:{});if(!readOnly.test(method))onChange(method);send(200,{ok:true,value});}
      catch(error){send(200,{ok:false,error:error.message,code:error.code||'COMMAND_FAILED'});}
    });
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const {port}=server.address();
  await fs.mkdir(path.dirname(file),{recursive:true});
  await fs.writeFile(file,JSON.stringify({version:1,port,token,pid:process.pid,started:new Date().toISOString()}),{mode:0o600});
  const close=async()=>{server.close();await fs.rm(file,{force:true}).catch(()=>{});};
  return {port,token,file,close};
}
