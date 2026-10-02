import {findEditor,openExternal,createCppClass} from './external-editor.mjs';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {ProjectService} from './project-service.mjs';
import {NativeHost} from './native-host.mjs';
const root=path.resolve(import.meta.dirname,'..'),port=Number(process.env.PORT||5173);
const project=await new ProjectService(process.env.HB_PROJECT_DIR||path.join(root,'Projects/QuietGarden')).init(!process.env.HB_PROJECT_DIR),native=new NativeHost();
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.mp4':'video/mp4','.webm':'video/webm','.wav':'audio/wav','.mp3':'audio/mpeg','.ogg':'audio/ogg','.txt':'text/plain; charset=utf-8','.md':'text/plain; charset=utf-8'};
const json=(res,data,status=200)=>res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify(data));
async function body(req,limit=1048576){const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>limit)throw Error('요청 파일 크기 제한 초과');chunks.push(chunk);}return Buffer.concat(chunks);}
function stream(req,res,file,size,projectFile=false){const mime=projectFile&&path.extname(file).toLowerCase()==='.html'?'text/plain; charset=utf-8':types[path.extname(file).toLowerCase()]||'application/octet-stream',range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);let start=0,end=size-1,status=200;if(range){start=Number(range[1]);end=range[2]?Math.min(Number(range[2]),end):end;if(start>end||start>=size)return res.writeHead(416,{'Content-Range':`bytes */${size}`}).end();status=206;}
  res.writeHead(status,{'Content-Type':mime,'Content-Length':Math.max(0,end-start+1),'Cache-Control':'no-cache','Accept-Ranges':'bytes','X-Content-Type-Options':'nosniff',...(projectFile?{'Content-Security-Policy':"default-src 'none'; sandbox"}:{}),...(range?{'Content-Range':`bytes ${start}-${end}/${size}`}:{})});const stream=fs.createReadStream(file,size?{start,end}:{});stream.on('error',()=>res.destroy());stream.pipe(res);
}
const server=http.createServer(async(req,res)=>{try{
  if(!['127.0.0.1:'+port,'localhost:'+port].includes(req.headers.host))return json(res,{error:'허용되지 않은 호스트'},403);
  const url=new URL(req.url,'http://127.0.0.1:'+port),q=url.searchParams;
  if(url.pathname.startsWith('/api/')){
    if(req.headers.origin&&!['http://127.0.0.1:'+port,'http://localhost:'+port].includes(req.headers.origin))return json(res,{error:'허용되지 않은 요청 출처'},403);
    if(req.method!=='GET'&&req.headers['x-hb-editor']!=='1')return json(res,{error:'편집기 요청 헤더 필요'},403);
    if(url.pathname==='/api/editor'&&req.method==='GET'){const editor=await findEditor();return json(res,{name:editor?.name||null});}
    if(url.pathname==='/api/editor/open'&&req.method==='POST'){const data=JSON.parse(await body(req));return json(res,await openExternal(project,data.path));}
    if(url.pathname==='/api/asset/create'&&req.method==='POST'){const data=JSON.parse(await body(req));return json(res,data.kind==='code'?await createCppClass(project,data.folder||'Source',data.name,data.parent):await project.create(data.folder||'Assets',data.kind,data.name,data.parent));}
    if(url.pathname==='/api/project'&&req.method==='GET')return json(res,await project.list({folder:q.get('folder')||'',query:q.get('q')||'',type:q.get('type')||'all',contents:q.get('contents')==='1',recursive:q.get('recursive')==='1'}));
    if(url.pathname==='/api/file'&&req.method==='GET'){const info=await project.read(q.get('path'));return stream(req,res,info.file,info.size,true);}
    if(url.pathname==='/api/file'&&req.method==='PUT'){await project.write(q.get('path'),(await body(req)).toString('utf8'));return json(res,{ok:true});}
    if(url.pathname==='/api/import'&&req.method==='POST')return json(res,await project.import(q.get('folder')||'Assets',q.get('name'),await body(req,104857600)));
    if(url.pathname==='/api/folder'&&req.method==='POST'){const data=JSON.parse(await body(req));await project.mkdir(data.path);return json(res,{ok:true});}
    if(url.pathname==='/api/rename'&&req.method==='POST'){const data=JSON.parse(await body(req));await project.rename(data.from,data.to);return json(res,{ok:true});}
    if(url.pathname==='/api/native/build'&&req.method==='POST'){const data=JSON.parse(await body(req));return json(res,await native.build(data.header,data.source));}
    if(url.pathname==='/api/native/call'&&req.method==='POST'){const data=JSON.parse(await body(req,4194304));return json(res,await native.call(data.token,data.request));}
    return json(res,{error:'API 경로가 없어요.'},404);
  }
  const pathname=decodeURIComponent(url.pathname),file=pathname==='/'?path.join(root,'prototype/index.html'):path.resolve(root,'.'+pathname);
  if(!file.startsWith(root+path.sep)||!/^\/(prototype\/|docs\/|native\/include\/|node_modules\/three\/)/.test(pathname)&&pathname!=='/'||pathname.includes('/../')||pathname.includes('/native/build/'))return json(res,{error:'파일 범위 밖 요청'},403);
  const stat=await fs.promises.stat(file);if(!stat.isFile())return res.writeHead(404).end();stream(req,res,file,stat.size);
}catch(error){json(res,{error:error.message},error.code==='ENOENT'?404:400);}});
server.listen(port,'127.0.0.1',()=>console.log(`HBEngine: http://127.0.0.1:${port}\nProject: ${project.root}`));
const close=()=>{native.close();server.close();};process.on('SIGINT',close);process.on('SIGTERM',close);
