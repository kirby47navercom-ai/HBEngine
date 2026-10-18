import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {retainTestEvidence,pruneTestArtifacts} from './test-artifacts.mjs';
const work=await fs.mkdtemp(path.resolve('native/build/shader-disk-cache-346-'));retainTestEvidence(work);
const compiler=process.env.CXX||'C:/msys64/ucrt64/bin/g++.exe',env={...process.env,PATH:path.dirname(compiler)+path.delimiter+process.env.PATH},exec=promisify(execFile),binary=path.join(work,'probe.exe');
const relative=value=>path.relative(process.cwd(),value),run=async(mode,dir)=>JSON.parse((await exec(binary,[mode,relative(dir)],{env,windowsHide:true,timeout:15000})).stdout);
let holder,exited;
try{
 await exec(compiler,['-std=c++17','-O2','-Wall','-Wextra','-Werror','-I','native/include','native/tests/shader-disk-cache-346.cpp','-o',relative(binary)],{env,windowsHide:true,timeout:60000});
 const unit=await run('unit',path.join(work,'unit')),concurrentRoot=path.join(work,'concurrent');
 const concurrent=await Promise.all(Array.from({length:4},()=>run('writer',concurrentRoot)));assert.ok(concurrent.some(r=>r.writes>0));
 const names=await fs.readdir(concurrentRoot),bytes=(await Promise.all(names.filter(n=>n.endsWith('.hbsbc')).map(n=>fs.stat(path.join(concurrentRoot,n)).then(s=>s.size)))).reduce((a,b)=>a+b,0);assert.ok(bytes<=4096);
 const crashRoot=path.join(work,'crash');holder=spawn(binary,['hold',relative(crashRoot)],{env,windowsHide:true,stdio:['ignore','pipe','pipe']});exited=new Promise(resolve=>holder.once('exit',resolve));
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('owned lock holder readiness')),5000);holder.once('error',reject);holder.stdout.once('data',data=>{clearTimeout(timer);assert.match(String(data),/ready/);resolve();});});holder.kill();await exited;
 const recovery=await run('recover',crashRoot);const result={passed:true,unit,concurrent,concurrentBytes:bytes,recovery,privateCache:true,defaultDiskBudget:8388608};await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({work,...result}));
}catch(error){await fs.writeFile(path.join(work,'failure.json'),JSON.stringify({error:error.stack,stderr:error.stderr},null,2));throw error;}
finally{if(holder&&holder.exitCode===null){holder.kill();await exited;}await pruneTestArtifacts(work);}
