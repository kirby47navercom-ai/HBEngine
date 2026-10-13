import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {pruneTestArtifacts} from './test-artifacts.mjs';
import {NativeHost} from './native-host.mjs';
const work=await fs.mkdtemp(path.resolve(import.meta.dirname,'../native/build/cache-retention-')),instance=path.join(work,'Instance'),tools=path.join(instance,'tools'),build=path.join(instance,'native/build'),plugins=path.join(build,'plugins');
await fs.mkdir(tools,{recursive:true});await fs.mkdir(plugins,{recursive:true});for(const name of ['test-artifacts.mjs','remove-test-cache.ps1'])await fs.copyFile(path.join(import.meta.dirname,name),path.join(tools,name));
const entries=[];for(let i=0;i<35;i++){const dir=path.join(plugins,i.toString(16).padStart(20,'0'));await fs.mkdir(dir);const binary=path.join(dir,'worker.exe'),time=new Date(1600000000000+i*1000);await fs.writeFile(binary,'cache');await fs.utimes(binary,time,time);entries.push(binary);}
const outside=path.join(build,'unrelated-source.cpp');await fs.writeFile(outside,'preserved');const idle=path.join(path.dirname(entries[1]),'idle.mjs');await fs.writeFile(idle,'console.log("ready");setInterval(()=>{},1000);');
const child=spawn(process.execPath,[idle],{windowsHide:true,stdio:['ignore','pipe','pipe']}),exit=new Promise(resolve=>child.once('exit',resolve));
const run=async protectedBinaries=>{const file=path.join(instance,'check.mjs');await fs.writeFile(file,'import {pruneTestArtifacts} from "./tools/test-artifacts.mjs";console.log(JSON.stringify(await pruneTestArtifacts(null,{nativeCacheOnly:true,protectedBinaries:'+JSON.stringify(protectedBinaries)+'})));');return JSON.parse((await promisify(execFile)(process.execPath,[file],{windowsHide:true,timeout:30000})).stdout);};
try{
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('캐시 보호 검사 프로세스 준비 실패')),5000);child.once('error',reject);child.stdout.once('data',()=>{clearTimeout(timer);resolve();});});
 const first=await run([entries[0]]);assert.equal(first.deleted,1);assert.equal(first.skipped.length,1);assert.deepEqual(first.failures,[]);await assert.rejects(fs.access(entries[2]));await fs.access(entries[0]);await fs.access(entries[1]);for(const binary of entries.slice(3))await fs.access(binary);assert.equal(await fs.readFile(outside,'utf8'),'preserved');
 const receipts=()=>fs.readdir(build).then(names=>names.filter(n=>n.startsWith('cache-prune-')).length),before=await receipts(),empty=await run([entries[0],entries[1]]);assert.equal(empty.receipt,null);assert.equal(empty.deleted,0);assert.equal(await receipts(),before);
 child.kill();await exit;const last=await run([]);assert.equal(last.deleted,2);assert.equal((await fs.readdir(plugins)).length,32);assert.deepEqual(last.failures,[]);
 const host=new NativeHost(),controller=new AbortController(),touch=fs.utimes;fs.utimes=async(...args)=>{await touch(...args);controller.abort(Error('캐시 정리 중 취소'));};try{await assert.rejects(host.build('#include <HBEngine/Game.hpp>\nHB_CLASS() class CacheCancelProbe : public hb::Actor {public:HB_FUNCTION() int Echo();};','int CacheCancelProbe::Echo(){return 31;}',{signal:controller.signal}),/캐시 정리 중 취소/);assert.equal(host.sessions.size,0);}finally{fs.utimes=touch;host.close();}
 const proof={passed:true,latest32Retained:true,referencedBinaryProtected:true,activeProcessProtected:true,inactiveRetired:true,unrelatedSourcePreserved:true,noEmptyReceipts:true,cancelDuringMaintenance:true,privateInstance:true};await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify({...proof,work}));
}finally{if(child.exitCode===null){child.kill();await exit;}await pruneTestArtifacts(work);}
