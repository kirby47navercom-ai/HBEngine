import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
import {prepareNative,jsonInclude} from './prepare-native.mjs';
import {androidSdk} from './mobile-android.mjs';

const root=path.resolve(import.meta.dirname,'..'),dir=await fs.mkdtemp(path.join(root,'native/build/gpu-render-')),exec=promisify(execFile),compiler=process.env.CXX||'C:/msys64/ucrt64/bin/g++.exe',env={...process.env,PATH:path.dirname(compiler)+path.delimiter+process.env.PATH};
await prepareNative();
const names=['native/include/HBEngine/Compute.hpp','native/include/HBEngine/Render.hpp','native/tests/compute-render.cpp','native/tests/compute-portable.cpp','docs/examples/NativeGPUWindow.cpp','tools/check-gpu-render.mjs'];
const checkedFiles=Object.fromEntries(await Promise.all(names.map(async name=>[name,createHash('sha256').update(await fs.readFile(path.join(root,name))).digest('hex')])));
try{
  const common=['-std=c++17','-O2','-Wall','-Wextra','-Werror','-I','native/include','-I',path.relative(root,jsonInclude),'native/tests/compute-render.cpp'];
  const results={};for(const [name,flags] of [['hardware',[]],['unavailable',['-DHB_COMPUTE_UNAVAILABLE']]]){const binary=path.join(dir,name+'.exe');await exec(compiler,[...common,...flags,'-o',path.relative(root,binary)],{cwd:root,env,windowsHide:true,timeout:60000,maxBuffer:1024*1024});const {stdout}=await exec(binary,[path.join(dir,'move.bmp'),path.join(dir,'field.bmp')],{env,windowsHide:true,timeout:30000});results[name]=JSON.parse(stdout);}
  assert.equal(results.hardware.passed,true);assert.equal(results.unavailable.unavailableGuard,true);
  await exec(compiler,['-std=c++17','-O2','-Wall','-Wextra','-Werror','-I','native/include','docs/examples/NativeGPUWindow.cpp','-o',path.relative(root,path.join(dir,'HBGPUDemo.exe'))],{cwd:root,env,windowsHide:true,timeout:60000});
  const androidCompiler=path.join(androidSdk(),'ndk/28.2.13676358/toolchains/llvm/prebuilt/windows-x86_64/bin/clang++.exe'),android=[];
  if(await fs.access(androidCompiler).then(()=>true,()=>false))for(const target of ['aarch64-linux-android26','x86_64-linux-android26']){await exec(androidCompiler,['--target='+target,'-std=c++17','-Wall','-Wextra','-Werror','-fsyntax-only','-I','native/include','native/tests/compute-portable.cpp'],{cwd:root,windowsHide:true,timeout:30000});android.push({target,headerSyntax:true,gpuBackend:false});}
  const proof={passed:true,checkedFiles,...results,android,standaloneSampleBuilt:true,standaloneSampleLaunched:false,scope:'actual D3D11 hardware compute buffer -> vertex SRV -> instanced sprite triangles -> RGBA/depth target -> private hidden HWND flip swapchain; particle positions never read back',benchmark:'20 dispatch/draw frames and one final image readback, three bounded samples; not full-engine FPS, no mobile performance claim',existingWebGLSceneMigrated:false};await fs.writeFile(path.join(dir,'acceptance.json'),JSON.stringify(proof,null,2));console.log(JSON.stringify({dir,...results,android}));
}catch(error){await fs.writeFile(path.join(dir,'failure.json'),JSON.stringify({message:error.message,stderr:error.stderr,stack:error.stack},null,2));console.error('GPU render evidence:',dir);throw error;}
