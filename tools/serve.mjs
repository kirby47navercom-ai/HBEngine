import {configureNativePersistence} from './game-storage.mjs';
import {BuildJobs} from './build-jobs.mjs';
import {readBuildProfiles} from './build-game.mjs';
import {findEditor,openExternal,createCppClass} from './external-editor.mjs';
import {readProjectManifest,ensureProjectManifest,createProject,recentProjects,rememberProject,pickProjectPath,defaultDirectory} from './project-manifest.mjs';
import {attachNativeChannel} from './native-channel.mjs';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {ProjectService} from './project-service.mjs';
import {NativeHost} from './native-host.mjs';
import {readNativeFiles} from './native-project.mjs';
import {ProjectStorage,storageLimit} from './project-storage.mjs';
import {EditorAutomation,engineSchema} from './editor-automation.mjs';
const root=path.resolve(import.meta.dirname,'..'),desktop=process.env.HB_DESKTOP==='1',requestedPort=Number(process.env.PORT??5173),quietRoot=path.join(root,'Projects/QuietGarden');
if(!Number.isInteger(requestedPort)||requestedPort<0||requestedPort>65535)throw Error('서버 포트 범위 오류');
const buildJobs=new BuildJobs();
let port=requestedPort,project=null,session=null,storage=null,native=new NativeHost(),automation=new EditorAutomation(),defaultProject=null,ready=false,stopping=false;
const quietCanonicalRoot=await fs.promises.realpath(quietRoot).catch(error=>{if(error.code!=='ENOENT')throw error;return quietRoot;});
const sameRoot=(a,b)=>process.platform==='win32'?path.resolve(a).toLowerCase()===path.resolve(b).toLowerCase():path.resolve(a)===path.resolve(b);
async function writeReady(){
  if(!ready||!process.env.HB_READY_FILE)return;
  const file=path.resolve(process.env.HB_READY_FILE),temp=file+'.'+randomUUID()+'.tmp';await fs.promises.mkdir(path.dirname(file),{recursive:true});
  try{await fs.promises.writeFile(temp,JSON.stringify({port,pid:process.pid,projectFile:session?.projectFile||null}),{flag:'wx'});await fs.promises.rename(temp,file);}finally{await fs.promises.unlink(temp).catch(()=>{});}
}
async function selectProject(record){
  if(stopping)throw Error('편집기가 종료 중이에요.');await rememberProject(record);native.close();native=new NativeHost();automation=new EditorAutomation();project=record.project;
  session={id:record.manifest.id,name:record.manifest.name,projectFile:record.file,startupScene:record.manifest.startupScene,startupBlueprint:record.manifest.startupBlueprint,gameInstance:record.manifest.gameInstance||'',legacyStorage:sameRoot(record.root,quietCanonicalRoot)};storage=new ProjectStorage(project,session.id);configureNativePersistence(native,storage,async name=>JSON.parse(await fs.promises.readFile((await project.read(name)).file,'utf8')));await writeReady();return session;
}
if(!desktop){
  const directory=process.env.HB_PROJECT_DIR||quietRoot;await new ProjectService(directory).init(!process.env.HB_PROJECT_DIR);
  const record=await ensureProjectManifest(path.resolve(directory),sameRoot(directory,quietRoot)?'QuietGarden':path.basename(path.resolve(directory)));await selectProject(record);if(sameRoot(record.root,quietRoot))defaultProject=record;
}
if(!defaultProject){try{if((await fs.promises.stat(quietRoot)).isDirectory())defaultProject=await ensureProjectManifest(quietRoot,'QuietGarden');}catch(error){if(error.code!=='ENOENT')console.error('기본 프로젝트 확인: '+error.message);}}
if(desktop&&process.env.HB_PROJECT_FILE)await selectProject(await readProjectManifest(process.env.HB_PROJECT_FILE));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.mp4':'video/mp4','.webm':'video/webm','.wav':'audio/wav','.mp3':'audio/mpeg','.ogg':'audio/ogg','.txt':'text/plain; charset=utf-8','.md':'text/plain; charset=utf-8'};
const json=(res,data,status=200)=>res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify(data));
const changedProject=()=>Object.assign(Error('프로젝트가 변경됐어요. 다시 작업하세요.'),{status:409});
const checkOwner=owner=>{if(project!==owner||stopping)throw changedProject();};
async function body(req,limit=1048576){const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>limit)throw Error('요청 파일 크기 제한 초과');chunks.push(chunk);}return Buffer.concat(chunks);}
function stream(req,res,file,size,projectFile=false){const mime=projectFile&&path.extname(file).toLowerCase()==='.html'?'text/plain; charset=utf-8':types[path.extname(file).toLowerCase()]||'application/octet-stream',range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);let start=0,end=size-1,status=200;if(range){start=Number(range[1]);end=range[2]?Math.min(Number(range[2]),end):end;if(start>end||start>=size)return res.writeHead(416,{'Content-Range':'bytes */'+size}).end();status=206;}
  res.writeHead(status,{'Content-Type':mime,'Content-Length':Math.max(0,end-start+1),'Cache-Control':'no-cache','Accept-Ranges':'bytes','X-Content-Type-Options':'nosniff',...(projectFile?{'Content-Security-Policy':(path.extname(file).toLowerCase()==='.svg'?"default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox":"default-src 'none'; sandbox")}:{}),...(range?{'Content-Range':'bytes '+start+'-'+end+'/'+size}:{})});const input=fs.createReadStream(file,size?{start,end}:{});input.on('error',()=>res.destroy());input.pipe(res);
}
const server=http.createServer(async(req,res)=>{try{
  if(!['127.0.0.1:'+port,'localhost:'+port].includes(req.headers.host))return json(res,{error:'허용되지 않은 호스트'},403);
  const url=new URL(req.url,'http://127.0.0.1:'+port),q=url.searchParams;
  if(url.pathname.startsWith('/api/')){
    if(req.headers.origin&&!['http://127.0.0.1:'+port,'http://localhost:'+port].includes(req.headers.origin))return json(res,{error:'허용되지 않은 요청 출처'},403);
    if(req.method!=='GET'&&req.headers['x-hb-editor']!=='1')return json(res,{error:'편집기 요청 헤더 필요'},403);
    if(url.pathname==='/api/game-data'&&req.method==='POST'){const data=await body(req);if(!native.persistentQueries)throw Error('프로젝트 게임 데이터 서비스가 없어요.');return json(res,{value:await native.persistentQueries(data.key,data.args)});}
    if(url.pathname==='/api/session'&&req.method==='GET')return json(res,{...session,nativeChannel:nativeChannel.descriptor});
    if(url.pathname==='/api/launcher'&&req.method==='GET')return json(res,{projects:await recentProjects(defaultProject),defaultDirectory});
    if(url.pathname==='/api/launcher/browse'&&req.method==='POST'){const data=JSON.parse(await body(req));return json(res,{path:await pickProjectPath(data.kind)});}
    if(url.pathname==='/api/launcher/open'&&req.method==='POST'){const data=JSON.parse(await body(req));return json(res,await selectProject(await readProjectManifest(data.file)));}
    if(url.pathname==='/api/launcher/create'&&req.method==='POST'){const data=JSON.parse(await body(req));return json(res,await selectProject(await createProject(data.name,data.directory,data.template)));}
    if(!project)return json(res,{error:'프로젝트를 먼저 선택하세요.'},409);
    // Each request retains its original project through body reads and native compilation.
    const owner=project,host=native,store=storage,projectId=session.id,readBody=async(limit)=>{const data=await body(req,limit);checkOwner(owner);return data;};
    if(url.pathname.startsWith('/api/build')){
      const record=await readProjectManifest(session.projectFile);checkOwner(owner);
      if(url.pathname==='/api/build/profiles'&&req.method==='GET')return json(res,await readBuildProfiles(record));
      if(url.pathname==='/api/build/profiles'&&req.method==='PUT'){const data=JSON.parse(await readBody());return json(res,await buildJobs.save(record,data,data.expectedRevision,()=>checkOwner(owner)));}
      if(url.pathname==='/api/build'&&req.method==='POST')return json(res,await buildJobs.start(record,JSON.parse(await readBody())),202);
      if(url.pathname==='/api/build/job'&&req.method==='GET')return json(res,buildJobs.get(record,q.get('id')));
      if(url.pathname==='/api/build/open'&&req.method==='POST'){const data=JSON.parse(await readBody());return json(res,await buildJobs.open(record,data.id,data.action));}
      if(url.pathname==='/api/build/devices'&&req.method==='GET')return json(res,{devices:await buildJobs.devices()});
      if(url.pathname==='/api/build/tools/android'&&req.method==='POST')return json(res,await buildJobs.prepareTools(record,JSON.parse(await readBody())),202);
      if(url.pathname==='/api/build/deploy'&&req.method==='POST'){const data=JSON.parse(await readBody());return json(res,await buildJobs.deploy(record,data.id,data.serial));}
      if(url.pathname==='/api/build/cancel'&&req.method==='POST'){const data=JSON.parse(await readBody());return json(res,buildJobs.cancel(record,data.id));}
    }
    if(url.pathname==='/api/schema'&&req.method==='GET')return json(res,engineSchema());
    if(url.pathname==='/api/automation'&&req.method==='GET')return json(res,automation.state());
    if(url.pathname==='/api/automation/command'&&req.method==='GET')return json(res,automation.get(q.get('id')));
    if(url.pathname==='/api/automation/command'&&req.method==='POST')return json(res,automation.submit(JSON.parse(await readBody())),202);
    if(url.pathname==='/api/automation/poll'&&req.method==='POST'){const data=JSON.parse(await readBody(4194304));if(data.state?.projectId!==projectId)throw changedProject();return json(res,automation.poll(data));}
    if(url.pathname==='/api/storage'&&req.method==='GET'){if(q.get('project')!==projectId)throw changedProject();return json(res,await store.read(()=>checkOwner(owner)));}
    if(url.pathname==='/api/storage'&&req.method==='PUT'){const data=JSON.parse(await readBody(storageLimit));if(data?.id!==projectId)throw changedProject();return json(res,await store.patch(data.items,()=>checkOwner(owner)));}
    if(url.pathname==='/api/editor'&&req.method==='GET'){const editor=await findEditor();checkOwner(owner);return json(res,{name:editor?.name||null});}
    if(url.pathname==='/api/editor/open'&&req.method==='POST'){const data=JSON.parse(await readBody());return json(res,await openExternal(owner,data.path));}
    if(url.pathname==='/api/asset/create'&&req.method==='POST'){const data=JSON.parse(await readBody());return json(res,data.kind==='code'?await createCppClass(owner,data.folder||'Source',data.name,data.parent):await owner.create(data.folder||'Assets',data.kind,data.name,data.parent));}
    if(url.pathname==='/api/asset/info'&&req.method==='GET'){const result=await owner.assetInfo(q.get('path'));checkOwner(owner);return json(res,result);}
    if(url.pathname==='/api/asset/registry'&&req.method==='GET'){const result=await owner.assetRegistry();checkOwner(owner);return json(res,result);}
    if(url.pathname==='/api/asset/reimport'&&req.method==='POST'){const data=JSON.parse(await readBody()),result=await owner.reimport(data.paths);checkOwner(owner);return json(res,result);}
    if(url.pathname==='/api/asset/write'&&req.method==='POST'){const data=JSON.parse(await readBody(8388608)),result=await owner.checkedWrite(data.path,data.text,data.expected,()=>checkOwner(owner));checkOwner(owner);return json(res,result);}
    if(url.pathname==='/api/project'&&req.method==='GET'){const result=await owner.list({folder:q.get('folder')||'',query:q.get('q')||'',type:q.get('type')||'all',contents:q.get('contents')==='1',recursive:q.get('recursive')==='1'});checkOwner(owner);return json(res,result);}
    if(url.pathname==='/api/file'&&req.method==='GET'){const info=await owner.read(q.get('path'));checkOwner(owner);return stream(req,res,info.file,info.size,true);}
    if(url.pathname==='/api/file'&&req.method==='PUT'){await owner.write(q.get('path'),(await readBody()).toString('utf8'),()=>checkOwner(owner));checkOwner(owner);return json(res,{ok:true});}
    if(url.pathname==='/api/import'&&req.method==='POST'){const result=await owner.import(q.get('folder')||'Assets',q.get('name'),await readBody(104857600));checkOwner(owner);return json(res,result);}
    if(url.pathname==='/api/folder'&&req.method==='POST'){const data=JSON.parse(await readBody());await owner.mkdir(data.path);checkOwner(owner);return json(res,{ok:true});}
    if(url.pathname==='/api/rename'&&req.method==='POST'){const data=JSON.parse(await readBody());await owner.rename(data.from,data.to);checkOwner(owner);return json(res,{ok:true});}
    if(url.pathname==='/api/native/build'&&req.method==='POST'){const data=JSON.parse(await readBody()),files=await readNativeFiles(owner);checkOwner(owner);const result=await host.build(data.header,data.source,{files});if(project!==owner||stopping){host.close();throw changedProject();}return json(res,result);}
    if(url.pathname==='/api/native/call'&&req.method==='POST'){const data=JSON.parse(await readBody(4194304)),result=await host.call(data.token,data.request);checkOwner(owner);return json(res,result);}
    return json(res,{error:'API 경로가 없어요.'},404);
  }
  const pathname=decodeURIComponent(url.pathname);
  if(desktop&&!project&&pathname==='/prototype/index.html')return res.writeHead(302,{Location:'/'}).end();
  const file=pathname==='/'?path.join(root,desktop&&!project?'prototype/project-hub.html':'prototype/index.html'):path.resolve(root,'.'+pathname);
  if(!file.startsWith(root+path.sep)||!/^\/(prototype\/|docs\/|native\/include\/|node_modules\/(three\/|@dimforge\/rapier[23]d-compat\/))/.test(pathname)&&pathname!=='/'||pathname.includes('/../')||pathname.includes('/native/build/'))return json(res,{error:'파일 범위 밖 요청'},403);
  const stat=await fs.promises.stat(file);if(!stat.isFile())return res.writeHead(404).end();stream(req,res,file,stat.size);
}catch(error){json(res,{error:error.message},error.status||(error.code==='ENOENT'?404:400));}});
const nativeChannel=attachNativeChannel(server,{origin:()=>"http://127.0.0.1:"+port,scope:()=>{const owner=project,host=native;checkOwner(owner);return async data=>{checkOwner(owner);const result=await host.call(data.token,data.request);checkOwner(owner);return result;};}});
server.listen(requestedPort,'127.0.0.1',async()=>{try{port=server.address().port;ready=true;await writeReady();console.log('HBEngine: http://127.0.0.1:'+port+'\nProject: '+(project?.root||'프로젝트 허브'));}catch(error){console.error(error.message);close();process.exitCode=1;}});
const close=()=>{if(stopping)return;stopping=true;buildJobs.close();nativeChannel.close();native.close();server.close();server.closeAllConnections();};process.on('SIGINT',close);process.on('SIGTERM',close);
