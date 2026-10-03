import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {ProjectService} from './project-service.mjs';
import {droppedFiles} from '../prototype/project-browser.js';
const fileEntry=(name)=>({isFile:true,fullPath:'/Folder/Sub/'+name,file:resolve=>resolve({name,size:1})}),folderEntry={isDirectory:true,createReader:()=>{let batch=0;return {readEntries:resolve=>resolve(batch++===0?[fileEntry('first.txt')]:batch===2?[fileEntry('second.txt')]:[])};}};
assert.deepEqual((await droppedFiles({items:[{kind:'file',webkitGetAsEntry:()=>folderEntry,getAsFile:()=>null}],files:[]})).map(f=>f.relativePath),['Folder/Sub/first.txt','Folder/Sub/second.txt']);
const parent=path.resolve('native/build');await fs.mkdir(parent,{recursive:true});const root=await fs.mkdtemp(path.join(parent,'project-check-'));
try{
  const project=await new ProjectService(root).init(true);await project.mkdir('Assets/Imported');
  const a=await project.import('Assets/Imported','data.txt',Buffer.from('unique-content marker')),b=await project.import('Assets/Imported','data.txt',Buffer.from('second'));
  assert.notEqual(a.path,b.path);let files=await project.list({folder:'Assets',query:'unique-content',recursive:true,contents:true});assert.equal(files.entries.length,1);assert.equal(files.entries[0].line,1);const id=files.entries[0].id;
  await project.rename(a.path,'Assets/Imported/renamed.txt');const reopened=await new ProjectService(root).init();files=await reopened.list({folder:'Assets/Imported'});assert.equal(files.entries.find(e=>e.name==='renamed.txt').id,id);
  await assert.rejects(project.resolve('../private'),/경로/);await assert.rejects(project.import('Assets','NUL.txt',Buffer.from('no')),/경로/);await assert.rejects(project.import('Assets','bad:stream.txt',Buffer.from('no')),/경로/);
  const scene=(await project.read('Assets/Scenes/Garden.hbscene.json')).file,original=await fs.readFile(scene,'utf8');await assert.rejects(project.write('Assets/Scenes/Garden.hbscene.json','{}'),/검증/);assert.equal(await fs.readFile(scene,'utf8'),original);
  await assert.rejects(project.rename(b.path,'Assets/Imported/renamed.txt'),/이미/);assert.equal(await fs.readFile((await project.read(b.path)).file,'utf8'),'second');
  console.log('디스크 폴더·다중 임포트·내용 검색·재열기·ID 유지·경로/원본 보호 검사 통과');
}finally{const resolved=await fs.realpath(root);assert.ok(resolved.startsWith(parent+path.sep));await fs.rm(resolved,{recursive:true,force:true});}
if(process.argv.includes('--server')){
  const url=process.env.HB_SERVER_URL||'http://127.0.0.1:5173',asset=process.env.HB_SERVER_ASSET||'Source/DoorController.h',response=await fetch(url+'/api/file?path='+encodeURIComponent(asset),{headers:{Range:'bytes=0-7'}});assert.equal(response.status,206);assert.equal((await response.arrayBuffer()).byteLength,8);assert.equal(response.headers.get('x-content-type-options'),'nosniff');assert.ok(response.headers.get('content-security-policy').includes('sandbox'));
  assert.equal((await fetch(url+'/api/project',{headers:{Origin:'https://outside.invalid'}})).status,403);assert.equal((await fetch(url+'/api/folder',{method:'POST',body:'{}'})).status,403);console.log('HTTP 범위 응답·에셋 실행 차단·Origin/편집기 헤더 검사 통과');
}
