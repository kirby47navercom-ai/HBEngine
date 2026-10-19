import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {execFile} from 'node:child_process';import {promisify} from 'node:util';
import {prepareNative,jsonInclude} from './prepare-native.mjs';import {activeInstalledVersions} from './install-editor.mjs';import {retainTestEvidence,pruneTestArtifacts} from './test-artifacts.mjs';
assert.deepEqual(await activeInstalledVersions('C:/Users/kirby/HBEngine'),[]);
const work=await fs.mkdtemp(path.resolve('native/build/shader-preparation-489-'));retainTestEvidence(work);
const compiler='C:/msys64/ucrt64/bin/g++.exe',env={...process.env,PATH:path.dirname(compiler)+path.delimiter+process.env.PATH},run=promisify(execFile),relative=p=>path.relative(process.cwd(),p);
try{
 await prepareNative();const results={};
 for(const baseline of [true,false]){
  let source='native/tests/shader-preparation-489.cpp';const binary=path.join(work,baseline?'baseline.exe':'probe.exe');
  if(baseline){const old=(await run('git',['show','11f5441:native/include/HBEngine/ShaderBytecodeCompiler.hpp'],{windowsHide:true,maxBuffer:1048576})).stdout;assert(old.includes('#include \"Compute.hpp\"'));const isolated=old.replace('#include \"Compute.hpp\"','#include \"ComputePlatform.hpp\"');assert.equal(isolated.slice(isolated.indexOf('class ShaderBytecodeCompiler')),old.slice(old.indexOf('class ShaderBytecodeCompiler')));await fs.writeFile(path.join(work,'baseline-compiler.hpp'),isolated);source=path.join(work,'baseline.cpp');await fs.writeFile(source,(await fs.readFile('native/tests/shader-preparation-489.cpp','utf8')).replace('#include <HBEngine/ShaderBytecodeCompiler.hpp>','#define HB_BASELINE_489 1\n#include "baseline-compiler.hpp"'));}
  await run(compiler,['-std=c++17','-O2','-Wall','-Wextra','-Werror','-I','native/include','-I','native/include/HBEngine','-I',relative(jsonInclude),relative(source),'-o',relative(binary)],{env,windowsHide:true,timeout:60000,maxBuffer:1048576});
  results[baseline?'baseline':'current']=JSON.parse((await run(binary,[relative(path.join(work,baseline?'Old':'New'))],{env,windowsHide:true,timeout:20000,maxBuffer:1048576})).stdout);
 }
 assert.equal(results.baseline.inspectionReadyWhileCreateBlocked,false);assert.equal(results.current.inspectionReadyWhileCreateBlocked,true);
 await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify({passed:true,baselineIncludeShim:'ComputePlatform only; baseline compiler class body unchanged',...results},null,2));console.log(JSON.stringify({passed:true,work,...results}));
}catch(error){await fs.writeFile(path.join(work,'failure.json'),JSON.stringify({error:error.stack,stderr:error.stderr},null,2));throw error;}finally{await pruneTestArtifacts(work);}
