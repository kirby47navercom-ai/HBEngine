import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createProject} from './project-manifest.mjs';
const exec=promisify(execFile),root=path.resolve(import.meta.dirname,'..'),work=await fs.mkdtemp(path.join(root,'native/build/detached-check-'));
if(process.platform!=='win32')throw Error('실제 Windows/WebView2 작업창 검사예요.');
const project=await createProject('독립 창 검증',path.join(work,'Project')),proof=path.join(work,'proof.json'),userData=path.join(work,'UserData'),original=await fs.readFile(project.file,'utf8');
const env={...process.env,HB_USER_DATA_DIR:userData};for(const key of ['PORT','HB_PROJECT_DIR','HB_PROJECT_FILE','HB_READY_FILE'])delete env[key];
let failure;try{await exec(path.join(root,'HBEngine.exe'),['--smoke-windows',proof,project.file],{cwd:work,env,windowsHide:true,timeout:45000});}catch(error){failure=error;}
const result=JSON.parse(await fs.readFile(proof,'utf8'));if(failure)throw Error('별도 창 검사 실패 ('+work+'): '+JSON.stringify(result)+'\n'+await fs.readFile(proof+'.error.txt','utf8').catch(()=>failure.message));
assert.equal(result.ok,true);assert.equal(result.workspace,'detached-windows');assert.ok(result.nativeWindows>=2,'실제 별도 HWND 두 개');assert.equal(await fs.readFile(project.file,'utf8'),original);
const saved=JSON.parse(await fs.readFile(path.join(project.root,'Saved/Editor/storage.json'),'utf8')),bounds=Object.entries(saved.items).find(([key])=>key.startsWith('hbengine.detached.windows.project.'));assert.ok(bounds,'창 위치는 프로젝트 디스크에 저장한다');assert.ok(JSON.parse(bounds[1]).project.width>=420);
const sessions=path.join(userData,'Sessions');for(const file of(await fs.readdir(sessions)).filter(file=>file.endsWith('.json'))){const ready=JSON.parse(await fs.readFile(path.join(sessions,file),'utf8'));let stopped=false;for(let i=0;i<30;i++){try{await fetch('http://127.0.0.1:'+ready.port+'/api/session',{signal:AbortSignal.timeout(300)});}catch{stopped=true;break;}await new Promise(resolve=>setTimeout(resolve,100));}assert.ok(stopped,'부모 창 종료 뒤 서버 정리');}
console.log('실제 Win32 HWND 두 개·sameEnvironment WebView2·원본 DOM/context/선택·검색·키 전달·크기 변경·닫기 복귀·재분리·부모 종료/서버 정리 통과:',work);
