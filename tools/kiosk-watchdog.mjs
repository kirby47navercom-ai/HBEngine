import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';

export async function kioskWatchdog(executable,{signal,maxRestarts=20,onRestart=()=>{},onStart=()=>{},args=[]}={}){
  const file=path.resolve(executable);if(path.basename(file).toLowerCase()!=='game.exe'||!(await fs.stat(file)).isFile())throw Error('배포된 Game.exe 경로를 지정하세요.');
  let restarts=0;while(!signal?.aborted){const started=Date.now(),child=spawn(file,args,{cwd:path.dirname(file),windowsHide:false,stdio:'ignore'}),abort=()=>child.kill();signal?.addEventListener('abort',abort,{once:true});
    let status;try{status=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',(code,termination)=>resolve({code,termination}));onStart({pid:child.pid,executable:file,restarts});});}finally{signal?.removeEventListener('abort',abort);}
    if(signal?.aborted||status.code===0)return {restarts,status};if(++restarts>maxRestarts)throw Error('비정상 종료 반복으로 자동 재실행을 중단했어요.');
    const delay=Math.max(1000,Math.min(30000,1000*2**Math.min(restarts,5))-(Date.now()-started));onRestart({restarts,status,delay});await new Promise(resolve=>{const timer=setTimeout(done,delay);function done(){clearTimeout(timer);signal?.removeEventListener('abort',done);resolve();}signal?.addEventListener('abort',done,{once:true});});
  }return {restarts,canceled:true};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const controller=new AbortController();process.once('SIGINT',()=>controller.abort());process.once('SIGTERM',()=>controller.abort());try{console.log(JSON.stringify(await kioskWatchdog(process.argv[2],{signal:controller.signal,onRestart:event=>console.error(JSON.stringify(event))})));}catch(error){console.error(error.message);process.exitCode=1;}}
