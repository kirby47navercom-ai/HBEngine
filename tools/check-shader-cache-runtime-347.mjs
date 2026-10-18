import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {prepareNative,jsonInclude} from './prepare-native.mjs';
import {retainTestEvidence,pruneTestArtifacts} from './test-artifacts.mjs';
import {activeInstalledVersions} from './install-editor.mjs';
assert.deepEqual(await activeInstalledVersions('C:/Users/kirby/HBEngine'),[],'사용 중인 설치본이 있어 무거운 검사를 미뤄요.');
const work=await fs.mkdtemp(path.resolve('native/build/shader-cache-runtime-347-'));retainTestEvidence(work);
const compiler=process.env.CXX||'C:/msys64/ucrt64/bin/g++.exe',env={...process.env,PATH:path.dirname(compiler)+path.delimiter+process.env.PATH},exec=promisify(execFile),binary=path.join(work,'probe.exe'),relative=value=>path.relative(process.cwd(),value);
try{
 await prepareNative();await exec(compiler,['-std=c++17','-O2','-Wall','-Wextra','-Werror','-I','native/include','-I',relative(jsonInclude),'native/tests/shader-cache-runtime-347.cpp','-o',relative(binary)],{env,windowsHide:true,timeout:60000,maxBuffer:2097152});
 const cache=path.join(work,'Cache'),run=async(mode,dir=cache)=>JSON.parse((await exec(binary,[relative(dir),mode],{env,windowsHide:true,timeout:60000,maxBuffer:1048576})).stdout);
 const cold=await run('cold'),warm=await run('warm');assert.deepEqual(warm.rgba,cold.rgba);const poison=await run('poison',path.join(work,'Poison'));
 const report={passed:true,cold:{...cold,rgba:undefined},warm:{...warm,rgba:undefined},poison,maxByteError:0,separateProcesses:true,statsScope:'disk store shared by base raster, node materials, screen effects; existing screen compilation array retained',performanceScope:'single ordered process pair; no FPS or controlled speedup claim'};
 await fs.writeFile(path.join(work,'cold-rgba.json'),JSON.stringify(cold.rgba));await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({work,...report}));
}catch(error){await fs.writeFile(path.join(work,'failure.json'),JSON.stringify({error:error.stack,stderr:error.stderr},null,2));throw error;}finally{await pruneTestArtifacts(work);}
