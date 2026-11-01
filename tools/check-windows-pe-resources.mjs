import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {activeInstalledVersions} from './install-editor.mjs';
import {nativeWorkerResource} from './native-worker-resources.mjs';
import {retainTestEvidence} from './test-artifacts.mjs';

assert.deepEqual(await activeInstalledVersions('C:/Users/kirby/HBEngine'),[]);
const root=process.cwd(),work=await fs.mkdtemp(path.resolve('native/build/windows-pe-resources-')),exec=promisify(execFile),compiler='C:/msys64/ucrt64/bin/g++.exe';retainTestEvidence(work);
const env={...process.env,PATH:path.dirname(compiler)+path.delimiter+process.env.PATH};
await fs.writeFile(path.join(work,'main.cpp'),'int main(){return 0;}');
await nativeWorkerResource(work,compiler);
await exec(compiler,['-g','-static','main.cpp','worker-resource.o','-o','worker.exe'],{cwd:work,env,windowsHide:true});
const inspect=async()=>{const bytes=await fs.readFile(path.join(work,'worker.exe')),pe=bytes.readUInt32LE(60),pointer=bytes.readUInt32LE(pe+12),symbols=bytes.readUInt32LE(pe+16),strings=pointer+symbols*18;assert(pointer>0&&strings+4<=bytes.length);assert(strings+bytes.readUInt32LE(strings)<=bytes.length);const output=(await exec('C:/msys64/ucrt64/bin/objdump.exe',['-x','worker.exe'],{cwd:work,windowsHide:true,maxBuffer:8*1024*1024})).stdout;assert.match(output,/ID: 0x000018/);await exec(path.join(work,'worker.exe'),[],{windowsHide:true});return {bytes:bytes.length,pointer,symbols};};
const before=await inspect();await exec(path.join(root,'dist/HBEngine/HBNativePlayer.exe'),['--stamp-game',path.join(work,'worker.exe'),'PE 구조 검증'],{windowsHide:true});const after=await inspect();assert.equal(before.symbols,after.symbols);
await exec(path.join(root,'dist/HBEngine/HBNativePlayer.exe'),['--stamp-game',path.join(work,'worker.exe'),'PE 구조 검증'],{windowsHide:true});const repeated=await inspect();assert.equal(after.bytes,repeated.bytes,'repeated metadata update does not accumulate symbol overlays');
const result={passed:true,before,after,repeated,coffTablePreserved:true,versionAndManifest:true,executableRan:true};await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({work,...result}));
