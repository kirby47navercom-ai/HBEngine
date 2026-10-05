import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {pathToFileURL} from 'node:url';
import {createProject} from './project-manifest.mjs';
const exec=promisify(execFile),root=path.resolve(import.meta.dirname,'..'),parent=path.join(root,'native/build');
if(process.platform!=='win32')throw Error('Windows 데스크톱 실행 검사예요.');
await fs.mkdir(parent,{recursive:true});const work=await fs.mkdtemp(path.join(parent,'desktop-check-'));
async function run(name,executable,projectFile,ok=true){
  const userData=path.join(work,name+' 사용자 데이터'),proof=path.join(work,name+'.json'),cwd=path.join(work,'다른 실행 폴더');await fs.mkdir(cwd,{recursive:true});
  const env={...process.env,HB_USER_DATA_DIR:userData};delete env.PORT;delete env.HB_PROJECT_DIR;delete env.HB_PROJECT_FILE;
  let failure;try{await exec(executable,['--smoke-test',proof,...(projectFile?[projectFile]:[])],{cwd,env,windowsHide:true,timeout:45000});}catch(error){failure=error;}
  const sessions=path.join(userData,'Sessions'),files=await fs.readdir(sessions),records=[];
  for(const file of files.filter(file=>file.endsWith('.json')))records.push(JSON.parse(await fs.readFile(path.join(sessions,file),'utf8')));
  const data=JSON.parse(await fs.readFile(proof,'utf8'));
  if(ok&&failure){const logs=await Promise.all(files.filter(file=>file.endsWith('.log')).map(file=>fs.readFile(path.join(sessions,file),'utf8')));throw Error(name+' 실행 실패: '+JSON.stringify(data)+'\n'+logs.join('\n'));}
  assert.equal(data.ok,ok);assert.equal(Boolean(failure),!ok);
  if(ok){assert.equal(data.embedded,true);assert.equal(data.workspace,projectFile?'editor':'hub');assert.equal(records.length,1);assert.equal(records[0].port,data.port);assert.equal(records[0].projectFile,projectFile||null);}
  for(const ready of records){
    let stopped=false;
    for(let i=0;i<30;i++){try{await fetch('http://127.0.0.1:'+ready.port+'/api/session',{signal:AbortSignal.timeout(300)});}catch{stopped=true;break;}await new Promise(resolve=>setTimeout(resolve,100));}
    assert.ok(stopped,'편집기 종료 뒤 서버가 남아 있어요.');
  }
}
try{
  const {physicsCases}=await import(pathToFileURL(path.join(root,'dist/HBEngine/prototype/tests/physics-cases.js')).href);
  const physics=await physicsCases();assert.equal(physics.assertions,144);console.log('배포 폴더의 실제 2D·3D WASM 물리 검사 통과:',physics.assertions);
  const {collisionGeometryCases}=await import(pathToFileURL(path.join(root,'dist/HBEngine/prototype/tests/collision-geometry-cases.js')).href);
  const geometry=await collisionGeometryCases();assert.equal(geometry.assertions,67);console.log('배포 폴더의 실제 메시·2D 다각형/선분 형상 검사 통과:',geometry.assertions);
  const project=await createProject('한글 프로젝트',path.join(work,'프로젝트 공백 경로')),original=await fs.readFile(project.file,'utf8');
  await run('프로젝트 허브',path.join(root,'dist/HBEngine/HBEngine.exe'));
  await run('프로젝트 직접 열기',path.join(root,'HBEngine.exe'),project.file);
  assert.equal(await fs.readFile(project.file,'utf8'),original);
  const bad=path.join(project.root,'잘못된 파일.hbproject');await fs.writeFile(bad,'{"version":999}');
  await run('잘못된 프로젝트',path.join(root,'dist/HBEngine/HBEngine.exe'),bad,false);assert.equal(await fs.readFile(bad,'utf8'),'{"version":999}');
  console.log('Windows EXE·내장 WebView2·허브·한글/공백 프로젝트·다른 실행 폴더·잘못된 파일·자식 서버 종료 검사 통과');
}finally{
  const target=await fs.realpath(work);assert.ok(target.startsWith(parent+path.sep));await fs.rm(target,{recursive:true,force:true,maxRetries:15,retryDelay:200});
}
