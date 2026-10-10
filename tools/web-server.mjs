import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createReadStream} from 'node:fs';
import {pathToFileURL} from 'node:url';

const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.wasm':'application/wasm','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.wav':'audio/wav','.mp3':'audio/mpeg','.ogg':'audio/ogg','.mp4':'video/mp4','.webm':'video/webm','.woff2':'font/woff2','.ttf':'font/ttf'};
export async function startWebServer(directory,{port=0,prefix='/'}={}){
  const root=await fs.realpath(directory);if(!/^\/(?:[A-Za-z0-9_-]+\/)*$/.test(prefix))throw Error('웹 미리보기 경로 오류');
  const server=http.createServer(async(req,res)=>{
    try{
      if(!['GET','HEAD'].includes(req.method))return res.writeHead(405).end();
      const url=new URL(req.url,'http://localhost');if(!url.pathname.startsWith(prefix))return res.writeHead(404).end();
      const name=decodeURIComponent(url.pathname.slice(prefix.length))||'index.html';
      if(/[\\:\x00-\x1f]/.test(name)||name.split('/').some(p=>!p||p==='.'||p==='..'))return res.writeHead(403).end();
      const file=await fs.realpath(path.join(root,name));if(!file.toLowerCase().startsWith((root+path.sep).toLowerCase()))return res.writeHead(403).end();
      const stat=await fs.stat(file);if(!stat.isFile())return res.writeHead(404).end();let start=0,end=stat.size-1,status=200;
      if(req.headers.range){const range=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range);if(!range)return res.writeHead(416).end();start=Number(range[1]);end=range[2]?Math.min(Number(range[2]),end):end;if(start>end||start>=stat.size)return res.writeHead(416,{'Content-Range':'bytes */'+stat.size}).end();status=206;}
      res.writeHead(status,{'Content-Type':mime[path.extname(name).toLowerCase()]||'application/octet-stream','Content-Length':Math.max(0,end-start+1),'X-Content-Type-Options':'nosniff','Cache-Control':'no-cache','Accept-Ranges':'bytes',...(status===206?{'Content-Range':`bytes ${start}-${end}/${stat.size}`}:{})});
      if(req.method==='HEAD')return res.end();const stream=createReadStream(file,stat.size?{start,end}:{});stream.on('error',()=>res.destroy());stream.pipe(res);
    }catch(error){if(!res.headersSent)res.writeHead(error.code==='ENOENT'?404:400).end();else res.destroy();}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
  return {url:'http://127.0.0.1:'+server.address().port+prefix,close:async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const server=await startWebServer(path.resolve(process.argv[2]||'.'));console.log(server.url);for(const event of ['SIGINT','SIGTERM'])process.on(event,async()=>{await server.close();process.exit(0);});}
