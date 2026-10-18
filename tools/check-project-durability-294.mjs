import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {ProjectService} from './project-service.mjs';
import {retainTestEvidence,pruneTestArtifacts} from './test-artifacts.mjs';
const work=await fs.mkdtemp(path.resolve('native/build/project-durability-294-'));retainTestEvidence(work);
const root=path.join(work,'Project'),project=await new ProjectService(root).init(),asset='Source/Rules.cpp',assetFile=path.join(root,asset),indexFile=path.join(root,'.hbassets.json');await project.writeFile(asset,'// saved\n');const checks=[];
const originals={writeFile:fs.writeFile,rename:fs.rename};
async function listTemps(directory){return (await fs.readdir(directory)).filter(n=>/\.[a-f\d-]{36}\.tmp$/.test(n));}
try{
 for(const operation of ['index','asset'])for(const fault of ['ENOSPC','EPERM']){
  const file=operation==='index'?indexFile:assetFile,before=await fs.readFile(file,'utf8'),indexBefore=await fs.readFile(indexFile,'utf8'),tempsBefore=await listTemps(path.dirname(file));let attempts=0;
  fs.writeFile=async(name,data,options)=>{if(String(name).startsWith(file+'.')&&String(name).endsWith('.tmp')){assert.equal(options?.flag,'wx');assert.equal(options?.flush,true);if(fault==='ENOSPC'){attempts++;await originals.writeFile(name,String(data).slice(0,5),options);throw Object.assign(Error('injected disk full'),{code:'ENOSPC'});}}return originals.writeFile(name,data,options);};
  fs.rename=async(from,to)=>{if(to===file&&fault==='EPERM'){attempts++;throw Object.assign(Error('injected replacement denied'),{code:'EPERM'});}return originals.rename(from,to);};
  if(operation==='index')project.index.DurabilityProbe={id:'pending'};
  await assert.rejects(operation==='index'?project.saveIndex():project.writeFile(asset,'// pending\n'),e=>e.code===fault);assert.equal(attempts,1);assert.equal(await fs.readFile(file,'utf8'),before);assert.equal(await fs.readFile(indexFile,'utf8'),indexBefore);assert.deepEqual(await listTemps(path.dirname(file)),tempsBefore);
  fs.writeFile=originals.writeFile;fs.rename=originals.rename;delete project.index.DurabilityProbe;
  await project.saveIndex();await project.writeFile(asset,'// saved\n');checks.push({operation,fault,originalPreserved:true,tempRemoved:true,queueUsableAfterFailure:true});
 }
 // Fixed .tmp names left by an older build are not followed or overwritten.
 const legacy=indexFile+'.tmp';await fs.writeFile(legacy,'legacy leftover');await project.saveIndex();assert.equal(await fs.readFile(legacy,'utf8'),'legacy leftover');await fs.unlink(legacy);checks.push({legacyFixedTempUntouched:true});
 const childFile=path.join(work,'writer.mjs'),serviceURL=pathToFileURL(path.resolve('tools/project-service.mjs')).href;
 await fs.writeFile(childFile,`import fs from 'node:fs/promises';import path from 'node:path';import {ProjectService} from ${JSON.stringify(serviceURL)};const [root,operation]=process.argv.slice(2),project=await new ProjectService(root).init(),target=path.join(root,operation==='index'?'.hbassets.json':'Source/Rules.cpp'),rename=fs.rename;fs.rename=async(from,to)=>{if(to===target){process.send({ready:true,temp:from,flushCompleted:true});setInterval(()=>{},1000);return new Promise(()=>{});}return rename(from,to);};if(operation==='index'){project.index.CrashProbe={id:'not-committed'};await project.saveIndex();}else await project.writeFile('Source/Rules.cpp','// not committed\\n');`);
 for(const operation of ['index','asset']){
  const file=operation==='index'?indexFile:assetFile,before=await fs.readFile(file,'utf8'),child=spawn(process.execPath,[childFile,root,operation],{cwd:work,env:{...process.env,LOCALAPPDATA:path.join(work,'LocalAppData'),HB_USER_DATA_DIR:path.join(work,'UserData')},windowsHide:true,stdio:['ignore','ignore','pipe','ipc']});let diagnostics='';child.stderr.on('data',b=>diagnostics+=b);const ended=new Promise(resolve=>child.once('exit',(code,signal)=>resolve({code,signal})));let ready;
  try{ready=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('private writer ready timeout: '+diagnostics)),15000);child.once('error',error=>{clearTimeout(timer);reject(error);});child.once('exit',code=>{clearTimeout(timer);reject(Error('writer exited before fault '+code+': '+diagnostics));});child.once('message',message=>{clearTimeout(timer);resolve(message);});});assert.equal(ready.flushCompleted,true);assert.ok(path.resolve(ready.temp).startsWith(path.resolve(root)+path.sep));assert.equal(child.kill('SIGKILL'),true);const stopped=await ended;assert.ok(stopped.signal==='SIGKILL'||stopped.code!==0,JSON.stringify(stopped));assert.equal(await fs.readFile(file,'utf8'),before);const reopened=await new ProjectService(root).init();assert.equal(await fs.readFile(file,'utf8'),before);assert.equal(reopened.index.CrashProbe,undefined);const orphan=await fs.stat(ready.temp).then(s=>s.isFile(),e=>e.code==='ENOENT'?false:Promise.reject(e));assert.equal(orphan,operation==='index');if(orphan)await fs.unlink(ready.temp);checks.push({operation,processTerminatedAfterFlushBeforeRename:true,exit:stopped,reopenPreservesCommittedFile:true,ownedOrphanRemovedAfterChildExit:true,automaticIntentTempRecovery:operation==='asset'});}
  finally{if(child.exitCode===null&&child.signalCode===null){child.kill('SIGKILL');await ended;}}
 }
 const proof={passed:true,checks,privateProject:true,userProfileWritten:false,noFullProjectBackup:true,scope:'Injected filesystem errors and actual owned Node termination between flushed temp write and rename; not physical power loss, controller-cache durability or all filesystem/version transitions.'};await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify(proof,null,2));console.log(JSON.stringify({work,passed:true,checks:checks.length}));
}catch(error){await fs.writeFile(path.join(work,'failure.json'),JSON.stringify({error:error.stack,checks},null,2));throw error;}finally{fs.writeFile=originals.writeFile;fs.rename=originals.rename;await pruneTestArtifacts(work);}
