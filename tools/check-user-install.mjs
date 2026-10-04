import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {installEditor} from './install-editor.mjs';
import {createProject} from './project-manifest.mjs';
const exec=promisify(execFile),root=path.resolve(import.meta.dirname,'..');
await fs.mkdir(path.join(root,'native/build'),{recursive:true});
const work=await fs.mkdtemp(path.join(root,'native/build/user-install-'));
const destination=await fs.mkdtemp(path.join(os.tmpdir(),'HBEngine-사용자-분리-'));
const result=await installEditor({destination,shortcut:false}),reused=await installEditor({destination,shortcut:false});assert.equal(reused.directory,result.directory);
const cache=path.join(result.directory,'native/build');await fs.mkdir(cache,{recursive:true});await fs.writeFile(path.join(cache,'keep.txt'),'user cache');assert.equal((await installEditor({destination,shortcut:false})).directory,result.directory);assert.equal(await fs.readFile(path.join(cache,'keep.txt'),'utf8'),'user cache');
const marker=path.join(result.directory,'HBEngine.install.json'),markerBytes=await fs.readFile(marker);await fs.unlink(marker);await assert.rejects(installEditor({destination,shortcut:false}),{code:'ENOENT'});await fs.writeFile(marker,markerBytes);
await assert.rejects(installEditor({destination:path.join(root,'native/build/bad-user-install'),shortcut:false}),/저장소 밖/);
assert.equal(await fs.stat(path.join(result.directory,'Projects')).then(()=>true,()=>false),false);
const sourceFile=path.join(result.directory,'prototype/index.html'),original=await fs.readFile(sourceFile);
await fs.writeFile(sourceFile,'modified install');await assert.rejects(installEditor({destination,shortcut:false}),/덮어쓰지/);await fs.writeFile(sourceFile,original);
const projects=await Promise.all(['사용자 게임','개발 검사 게임'].map(name=>createProject(name,work,'2d')));
const sceneBytes=p=>fs.readFile(path.join(p.root,'Assets/Scenes/Garden.hbscene.json'));
const originalScenes=await Promise.all(projects.map(sceneBytes));
const serverProcesses=[];
async function server(engine,project,index){
  const readyFile=path.join(work,'server-'+index+'.json'),userData=path.join(work,'server-profile-'+index);
  const child=spawn(path.join(engine,'runtime/node.exe'),[path.join(engine,'tools/serve.mjs')],{cwd:engine,env:{...process.env,PORT:'0',HB_DESKTOP:'1',HB_PROJECT_FILE:project.file,HB_USER_DATA_DIR:userData,HB_READY_FILE:readyFile},windowsHide:true,stdio:['ignore','pipe','pipe']});
  const exited=new Promise(resolve=>child.once('close',resolve));let output='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);serverProcesses.push({child,exited});
  for(let i=0;i<400;i++){if(child.exitCode!==null)throw Error(output);try{const record=JSON.parse(await fs.readFile(readyFile,'utf8'));return {...record,url:'http://127.0.0.1:'+record.port,userData};}catch(error){if(error.code!=='ENOENT')throw error;}await new Promise(r=>setTimeout(r,25));}
  throw Error('분리 서버 시작 시간 초과');
}
let servers;
try{
  servers=await Promise.all([server(result.directory,projects[0],0),server(path.join(root,'dist/HBEngine'),projects[1],1)]);assert.notEqual(servers[0].port,servers[1].port);
  const response=await fetch(servers[1].url+'/api/file?path=Assets%2FDevOnly.txt',{method:'PUT',headers:{'X-HB-Editor':'1','Content-Type':'text/plain'},body:'development only'});assert.equal(response.status,200);
  assert.equal((await fetch(servers[0].url+'/api/file?path=Assets%2FDevOnly.txt')).status,404);
  assert.equal((await fetch(servers[0].url+'/api/session').then(r=>r.json())).id,projects[0].manifest.id);
  const recents=await Promise.all(servers.map(s=>fs.readFile(path.join(s.userData,'recent-projects.json'),'utf8').then(JSON.parse)));assert.equal(recents[0].projects[0].file,projects[0].file);assert.equal(recents[1].projects[0].file,projects[1].file);
}finally{for(const {child} of serverProcesses)if(child.exitCode===null)child.kill();await Promise.all(serverProcesses.map(p=>p.exited));}
const localAppData=path.join(work,'LocalAppData');
async function smoke(engine,project,index){
  const env={...process.env,LOCALAPPDATA:localAppData};for(const key of ['HB_USER_DATA_DIR','HB_EDITOR_ACCEPTANCE','HB_PLAYER_ACCEPTANCE','HB_PROJECT_DIR','HB_PROJECT_FILE','PORT'])delete env[key];
  const proof=path.join(work,'native-'+index+'.json');await exec(path.join(engine,'HBEngine.exe'),['--smoke-test',proof,project.file],{cwd:work,env,windowsHide:true,timeout:60000});
  const report=JSON.parse(await fs.readFile(proof,'utf8'));assert.equal(report.ok,true);assert.equal(report.embedded,true);assert.equal(report.workspace,'editor');return report;
}
const reports=await Promise.all([smoke(result.directory,projects[0],0),smoke(path.join(root,'dist/HBEngine'),projects[1],1)]);
assert.notEqual(reports[0].port,reports[1].port);
for(const directory of [path.join(localAppData,'HBEngine/User'),path.join(localAppData,'HBEngine')])assert.ok((await fs.readdir(path.join(directory,'Sessions'))).some(name=>name.endsWith('.json')));
for(let i=0;i<projects.length;i++)assert.deepEqual(await sceneBytes(projects[i]),originalScenes[i]);
for(const report of reports)await assert.rejects(fetch('http://127.0.0.1:'+report.port+'/api/session',{signal:AbortSignal.timeout(1000)}));
await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify({ok:true,installation:result,ports:servers.map(s=>s.port),nativeReports:reports,userProfile:path.join(localAppData,'HBEngine/User'),developmentProfile:path.join(localAppData,'HBEngine'),originalScenesPreserved:true},null,2));
console.log('사용자용 버전 고정·덮어쓰기 거절·설정/포트/프로젝트 분리·실제 두 EXE·원본 보존·서버 종료 검사 통과: '+work);
