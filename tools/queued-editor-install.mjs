import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const workerFile=fileURLToPath(import.meta.url),pause=ms=>new Promise(resolve=>setTimeout(resolve,ms)),inside=(base,value)=>{const rel=path.relative(base,value);return !rel||!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel);};
async function read(file){try{const stat=await fs.lstat(file);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>65536)throw Error('업데이트 대기 기록을 확인하세요.');return JSON.parse(await fs.readFile(file,'utf8'));}catch(error){if(error.code==='ENOENT')return null;throw error;}}
async function store(file,job){const temp=file+'.'+randomUUID()+'.tmp';try{await fs.writeFile(temp,JSON.stringify(job,null,2)+'\n',{flag:'wx',flush:true});await fs.rename(temp,file);}finally{await fs.unlink(temp).catch(e=>{if(e.code!=='ENOENT')throw e;});}}
async function alive(job){
 if(!Number.isSafeInteger(job?.workerPID)||job.workerPID<=0)return false;
 const quote=s=>"'"+s.replaceAll("'","''")+"'",script='$p=Get-CimInstance Win32_Process -Filter '+quote('ProcessId='+job.workerPID)+'; if($p -and $p.CommandLine.Contains('+quote(job.id)+') -and $p.CommandLine.Contains('+quote(workerFile)+')){[Console]::Write("yes")}';
 return (await promisify(execFile)('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{windowsHide:true,timeout:30000})).stdout==='yes';
}
function valid(job,file){return job?.version===1&&/^[a-f\d-]{36}$/.test(job.id)&&/^[a-f0-9]{64}$/.test(job.expectedBundleHash)&&path.isAbsolute(job.source)&&path.isAbsolute(job.destination)&&path.resolve(file)===path.join(job.destination,'PendingUpdate.json')&&Number.isFinite(job.deadline)&&Number.isInteger(job.pollMS)&&job.pollMS>=50&&job.pollMS<=60000&&typeof job.shortcut==='boolean';}
export async function queuedEditorInstallStatus(destination=path.join(os.homedir(),'HBEngine')){const file=path.join(path.resolve(destination),'PendingUpdate.json'),job=await read(file);if(job&&!valid(job,file))throw Error('업데이트 대기 기록 형식을 확인하세요.');return {queued:!!job&&['starting','waiting','installing'].includes(job.state),statusFile:file,job};}
export async function queueEditorInstall(deferred,{shortcut=true,pollMS=30000,timeoutMS=86400000}={}){
 if(process.platform!=='win32'||!deferred?.deferred||deferred.reason!=='running-install')throw Error('실행 중 보류된 Windows 설치만 예약할 수 있어요.');
 if(!Number.isInteger(pollMS)||pollMS<50||pollMS>60000||!Number.isInteger(timeoutMS)||timeoutMS<1000||timeoutMS>86400000)throw Error('업데이트 대기 시간을 확인하세요.');
 const destination=await fs.realpath(deferred.destination),source=await fs.realpath(deferred.source),file=path.join(destination,'PendingUpdate.json'),lock=file+'.lock';
 if(inside(path.join(destination,'Versions'),process.execPath)||inside(path.join(destination,'Versions'),workerFile))throw Error('종료 대기 실행기는 Versions 밖에서 실행하세요.');
 const registration=await fs.open(lock,'wx');let child;
 try{
  const previous=await read(file);if(previous&&['starting','waiting','installing'].includes(previous.state)&&await alive(previous))return {queued:true,alreadyQueued:true,statusFile:file,job:previous};
  const now=Date.now(),job={version:1,id:randomUUID(),state:'starting',source,destination,expectedBundleHash:deferred.bundleHash,files:deferred.files,shortcut,pollMS,createdAt:new Date(now).toISOString(),deadline:now+timeoutMS,workerPID:null};if(!valid(job,file))throw Error('업데이트 대기 요청이 올바르지 않아요.');
  await store(file,job);child=spawn(process.execPath,[workerFile,'--work',file,job.id],{cwd:path.dirname(workerFile),windowsHide:true,detached:true,stdio:'ignore'});await new Promise((resolve,reject)=>{child.once('spawn',resolve);child.once('error',reject);});job.workerPID=child.pid;await store(file,job);child.unref();return {queued:true,statusFile:file,job};
 }finally{await registration.close();await fs.unlink(lock);}
}
export async function runQueuedInstall(file,id){
 const {activeInstalledVersions,installEditor}=await import('./install-editor.mjs');
 let job;for(let i=0;i<100;i++){job=await read(file);if(!valid(job,file)||job.id!==id)return;if(job.workerPID===process.pid)break;await pause(50);}if(job.workerPID!==process.pid)return;
 const commit=async patch=>{const current=await read(file);if(current?.id!==id)return false;if(patch.state==='installing'&&current.cancelRequested){job={...job,state:'cancelled',finishedAt:new Date().toISOString()};await store(file,job);return false;}job={...job,...patch};await store(file,job);return true;};
 try{
  await commit({state:'waiting'});
  while(Date.now()<job.deadline){
   const current=await read(file);if(current?.id!==id)return;if(current.cancelRequested){await commit({state:'cancelled',finishedAt:new Date().toISOString()});return;}
   // Only the inexpensive process inventory runs while the editor is open.
   if((await activeInstalledVersions(job.destination)).length){await pause(Math.min(job.pollMS,Math.max(1,job.deadline-Date.now())));continue;}
   if(!await commit({state:'installing'}))return;
   const result=await installEditor({source:job.source,destination:job.destination,shortcut:job.shortcut,expectedBundleHash:job.expectedBundleHash});
   if(result.deferred){await commit({state:'waiting'});await pause(job.pollMS);continue;}
   const {directory,executable,shortcut,desktopShortcut,projectAssociation,bundleHash,files,cleanup}=result;
   await commit({state:'installed',finishedAt:new Date().toISOString(),result:{directory,executable,shortcut,desktopShortcut,projectAssociation,bundleHash,files,cleanup:{bytes:cleanup.bytes,removed:cleanup.removed.length,preserved:cleanup.preserved?.length||0,failures:cleanup.failures.length,remaining:cleanup.remaining}}});return;
  }
  await commit({state:'expired',finishedAt:new Date().toISOString()});
 }catch(error){await commit({state:'failed',finishedAt:new Date().toISOString(),error:{code:error.code||'INSTALL_FAILED',message:error.message.slice(0,8000)}});}
}
if(process.argv[1]&&path.resolve(process.argv[1])===workerFile){if(process.argv[2]!=='--work'||process.argv.length!==5)throw Error('업데이트 작업 인수가 올바르지 않아요.');await runQueuedInstall(path.resolve(process.argv[3]),process.argv[4]);}
