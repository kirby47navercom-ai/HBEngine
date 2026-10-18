import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {execFile,execFileSync} from 'node:child_process';import {promisify} from 'node:util';import {retainTestEvidence,pruneTestArtifacts} from './test-artifacts.mjs';
const work=await fs.mkdtemp(path.resolve('native/build/cache-removal-race-370-'));retainTestEvidence(work);const run=promisify(execFile),baseline=execFileSync('git',['show','37c9ceb:tools/remove-test-cache.ps1'],{encoding:'utf8',windowsHide:true}),current=await fs.readFile('tools/remove-test-cache.ps1','utf8'),rows=[];
try{
 for(const mode of ['baseline-race','race','denied','already-missing']){
  const instance=path.join(work,mode),build=path.join(instance,'native/build'),target=path.join(build,'plugins/0123456789abcdefabcd'),script=path.join(instance,'tools/remove-test-cache.ps1');await fs.mkdir(target,{recursive:true});await fs.mkdir(path.dirname(script),{recursive:true});await fs.writeFile(path.join(target,'cache.bin'),'disposable cache');await fs.writeFile(path.join(build,'source.cpp'),'preserved');
  const marker='try { Remove-Item -LiteralPath $target -Recurse -Force;';let source=mode==='baseline-race'?baseline:current;assert.ok(source.includes(marker));
  if(mode.endsWith('race'))source=source.replace(marker,'Remove-Item -LiteralPath $target -Recurse -Force; '+marker);
  if(mode==='denied')source=source.replace(marker,"try { throw [UnauthorizedAccessException]::new('probe access denied'); Remove-Item -LiteralPath $target -Recurse -Force;");
  if(mode==='already-missing'){const resolved=await fs.realpath(target),relative=path.relative(build,resolved);assert.ok(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative));await fs.rm(resolved,{recursive:true});}
  await fs.writeFile(script,source);const plan=path.join(build,'plan.json');await fs.writeFile(plan,JSON.stringify({build,entries:[{kind:'plugin-cache',path:target,bytes:16,files:1}]}));let exited=0;
  try{await run('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',script,'-PlanFile',plan],{windowsHide:true,timeout:30000});}catch(error){exited=error.code;}
  const result=JSON.parse((await fs.readFile(path.join(build,'result.json'),'utf8')).replace(/^\uFEFF/,''));assert.equal(result.deleted,0);assert.equal(await fs.readFile(path.join(build,'source.cpp'),'utf8'),'preserved');
  if(mode==='baseline-race'||mode==='denied'){assert.notEqual(exited,0);assert.equal(result.failures.length,1);}
  else{assert.equal(exited,0);assert.deepEqual(result.failures,[]);assert.equal(result.skipped.length,mode==='race'?1:0);}
  if(mode==='denied')assert.equal(await fs.readFile(path.join(target,'cache.bin'),'utf8'),'disposable cache');rows.push({mode,exited,result});
 }
 await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify({passed:true,rows,scope:'Private alternate tool root; deterministic removal between final existence check and Remove-Item. Old source fails, new source tolerates only absent ObjectNotFound, access-denied failure and unrelated source remain protected; no double-counted savings.'},null,2)+'\n');console.log(JSON.stringify({work,passed:true,cases:rows.length}));
}catch(error){await fs.writeFile(path.join(work,'failure.json'),JSON.stringify({error:error.stack},null,2));throw error;}finally{await pruneTestArtifacts(work);}
