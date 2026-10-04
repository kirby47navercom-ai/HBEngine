import {resolveBuildPath} from '../prototype/build-profile.js';
import http from 'node:http';
import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {NativeHost} from './native-host.mjs';
import {ProjectStorage} from './project-storage.mjs';
const hash=data=>createHash('sha256').update(data).digest('hex');
const safe=name=>typeof name==='string'&&name.length>0&&name.length<=2000&&!/[\\:\x00-\x1f]/.test(name)&&!name.startsWith('/')&&!name.split('/').some(v=>!v||v==='.'||v==='..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.wasm':'application/wasm','.wav':'audio/wav','.mp3':'audio/mpeg','.ogg':'audio/ogg','.mp4':'video/mp4','.webm':'video/webm'};
export async function startPlayerServer({root=path.resolve(import.meta.dirname,'..'),port=0,userData=process.env.HB_USER_DATA_DIR,verify=true}={}){
  root=await fs.realpath(root);const manifest=JSON.parse(await fs.readFile(path.join(root,'game.hbpack.json'),'utf8'));
  if(manifest.version!==1||!Array.isArray(manifest.files)||!Array.isArray(manifest.entries)||!Array.isArray(manifest.nativeModules)||!safe(manifest.startupScene)||!['development','release'].includes(manifest.configuration)||!/^[0-9a-f-]{36}$/.test(manifest.id))throw Error('게임 패키지 형식 오류');
  const files=new Map();for(const entry of manifest.files){if(!safe(entry.path)||files.has(entry.path)||!/^[0-9a-f]{64}$/.test(entry.sha256))throw Error('패키지 파일 목록 오류');const full=await fs.realpath(path.join(root,entry.path));if(!full.toLowerCase().startsWith((root+path.sep).toLowerCase()))throw Error('패키지 경로 이탈');if(verify){const bytes=await fs.readFile(full);if(bytes.length!==entry.bytes||hash(bytes)!==entry.sha256)throw Error('패키지 파일 검증 실패: '+entry.path);}files.set(entry.path,{...entry,full});}
  const entries=new Map(manifest.entries.map(e=>[e.path,e]));for(const name of entries.keys())if(!safe(name)||!files.has('Content/'+name))throw Error('콘텐츠 목록 오류');if(!entries.has(manifest.startupScene))throw Error('시작 장면 누락');
  const native=new NativeHost(),builds=new Map();for(const module of manifest.nativeModules){const file=files.get(module.binary);if(!file||!module.binary.startsWith('Binaries/'))throw Error('C++ 실행 파일 누락');builds.set(module.signature,native.registerBinary(file.full,module.metadata));}
  userData=path.resolve(userData||path.join(process.env.LOCALAPPDATA||root,'HBEngine','Games',manifest.id));await fs.mkdir(userData,{recursive:true});
  const store=new ProjectStorage({resolve:async()=>path.join(userData,'savegames.json')},manifest.id),validKey=store.validKey.bind(store);store.validKey=key=>validKey(key)&&(key.startsWith('hbengine.savegame.')||key.startsWith('hbengine.storage-migrated.v1.'));
  const session={id:manifest.id,name:manifest.name,projectFile:'game.hbpack.json',startupScene:manifest.startupScene,startupBlueprint:manifest.startupBlueprint,legacyStorage:false,player:true};
  const json=(res,data,status=200)=>res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify(data));
  const body=async req=>{const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>8388608)throw Error('요청 크기 초과');chunks.push(chunk);}return JSON.parse(Buffer.concat(chunks).toString('utf8'));};
  let report=null,activePort;const server=http.createServer(async(req,res)=>{try{
    if(process.env.HB_PLAYER_SMOKE==='1')res.on('finish',()=>console.log(req.method,req.url,res.statusCode));
    const origin='http://127.0.0.1:'+activePort;if(req.headers.host!=='127.0.0.1:'+activePort)return json(res,{error:'호스트 오류'},403);
    const url=new URL(req.url,origin),q=url.searchParams;
    if(req.headers.origin&&req.headers.origin!==origin||req.method!=='GET'&&req.headers['x-hb-editor']!=='1')return json(res,{error:'출처 오류'},403);
    if(url.pathname==='/api/session'&&req.method==='GET')return json(res,session);
    if(url.pathname==='/api/player'&&req.method==='GET')return json(res,{name:manifest.name,smoke:process.env.HB_PLAYER_SMOKE==='1',acceptance:process.env.HB_PLAYER_SMOKE==='1'&&process.env.HB_PLAYER_ACCEPTANCE==='1',configuration:manifest.configuration,redirects:manifest.redirects,width:manifest.width,height:manifest.height,scene:manifest.startupScene});
    if(url.pathname==='/api/project'&&req.method==='GET')return json(res,{entries:manifest.entries});
    if(url.pathname==='/api/storage'&&req.method==='GET'){if(q.get('project')!==manifest.id)throw Error('프로젝트 ID 오류');return json(res,await store.read());}
    if(url.pathname==='/api/storage'&&req.method==='PUT'){const data=await body(req);if(data.id!==manifest.id)throw Error('프로젝트 ID 오류');return json(res,await store.patch(data.items));}
    if(url.pathname==='/api/native/build'&&req.method==='POST'){const data=await body(req),build=builds.get(hash(JSON.stringify([data.header,data.source])));if(!build)throw Error('패키지에 등록되지 않은 C++ 모듈');return json(res,build);}
    if(url.pathname==='/api/native/call'&&req.method==='POST'){const data=await body(req);return json(res,await native.call(data.token,data.request));}
    if(url.pathname==='/api/player/report'&&req.method==='POST'){const data=await body(req);if(manifest.configuration==='development'||process.env.HB_PLAYER_SMOKE==='1'){report=data;await fs.writeFile(path.join(userData,'runtime-report.json'),JSON.stringify(data));}return json(res,{ok:true});}
    if(url.pathname==='/api/player/report'&&req.method==='GET'&&manifest.configuration==='development')return json(res,report);
    let name;if(url.pathname==='/api/file'&&req.method==='GET'){const requested=q.get('path');if(!safe(requested))throw Error('에셋 경로 오류');const resolved=resolveBuildPath(requested,manifest.redirects);if(entries.has(resolved))name='Content/'+resolved;}
    else if(req.method==='GET'){const requested=url.pathname==='/'?'prototype/player.html':decodeURIComponent(url.pathname.slice(1));if((requested.startsWith('prototype/')||requested.startsWith('node_modules/'))&&safe(requested))name=requested;}
    const file=files.get(name);if(!file)return json(res,{error:'게임 파일이 없어요.'},404);
    let start=0,end=file.bytes-1,status=200;const range=req.headers.range;if(range){const m=/^bytes=(\d+)-(\d*)$/.exec(range);if(!m)return res.writeHead(416).end();start=Number(m[1]);end=m[2]?Math.min(Number(m[2]),end):end;if(start>end||start>=file.bytes)return res.writeHead(416,{'Content-Range':'bytes */'+file.bytes}).end();status=206;}
    res.writeHead(status,{'Content-Type':mime[path.extname(name)]||'application/octet-stream','Content-Length':Math.max(0,end-start+1),'X-Content-Type-Options':'nosniff',...(name.startsWith('Content/')?{'Content-Security-Policy':"default-src 'none'; sandbox"}:{}),'Cache-Control':'no-cache','Accept-Ranges':'bytes',...(range?{'Content-Range':`bytes ${start}-${end}/${file.bytes}`}:{})});const stream=createReadStream(file.full,file.bytes?{start,end}:{});stream.on('error',()=>res.destroy());stream.pipe(res);
  }catch(error){if(!res.headersSent)json(res,{error:error.message},400);else res.destroy();}});
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});activePort=server.address().port;
  const close=async()=>{native.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));};return {port:activePort,close,manifest,userData};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){try{const server=await startPlayerServer({port:Number(process.env.PORT||0)});if(process.env.HB_READY_FILE)await fs.writeFile(process.env.HB_READY_FILE,JSON.stringify({port:server.port,pid:process.pid,player:true}));console.log('HBPlayer http://127.0.0.1:'+server.port);for(const event of ['SIGINT','SIGTERM'])process.on(event,async()=>{await server.close();process.exit(0);});}catch(error){console.error(error);process.exitCode=1;}}
