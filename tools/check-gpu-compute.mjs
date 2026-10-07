import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
import {prepareNative,jsonInclude} from './prepare-native.mjs';
import {NativeHost} from './native-host.mjs';
import {createAsset} from '../prototype/asset-documents.js';
import {makeNode} from '../prototype/blueprint-model.js';
import {BlueprintRuntime} from '../prototype/blueprint-runtime.js';
import {androidSdk} from './mobile-android.mjs';

const root=path.resolve(import.meta.dirname,'..'),dir=await fs.mkdtemp(path.join(root,'native/build/gpu-compute-')),exec=promisify(execFile),compiler=process.env.CXX||'C:/msys64/ucrt64/bin/g++.exe',env={...process.env,PATH:path.dirname(compiler)+path.delimiter+process.env.PATH},host=new NativeHost();
await prepareNative();
const checkedFiles=Object.fromEntries(await Promise.all(['native/include/HBEngine/Compute.hpp','tools/native-host.mjs','native/tests/compute.cpp','native/tests/compute-portable.cpp','tools/check-gpu-compute.mjs'].map(async name=>[name,createHash('sha256').update(await fs.readFile(path.join(root,name))).digest('hex')])));
try{
  const common=['-std=c++17','-O2','-Wall','-Wextra','-Werror','-I','native/include','-I',path.relative(root,jsonInclude),'native/tests/compute.cpp'];
  const results={};for(const [name,flags] of [['hardware',[]],['unavailable',['-DHB_COMPUTE_UNAVAILABLE']]]){const binary=path.join(dir,name+'.exe');await exec(compiler,[...common,...flags,'-o',path.relative(root,binary)],{cwd:root,env,windowsHide:true,timeout:60000,maxBuffer:1024*1024});const {stdout}=await exec(binary,[],{env,windowsHide:true,timeout:30000});results[name]=JSON.parse(stdout);await fs.writeFile(path.join(dir,name+'.json'),JSON.stringify(results[name],null,2));}
  assert.equal(results.hardware.passed,true);assert.equal(results.unavailable.unavailableGuard,true);
  const androidCompiler=path.join(androidSdk(),'ndk/28.2.13676358/toolchains/llvm/prebuilt/windows-x86_64/bin/clang++.exe'),android=[];
  if(await fs.access(androidCompiler).then(()=>true,()=>false))for(const target of ['aarch64-linux-android26','x86_64-linux-android26']){await exec(androidCompiler,['--target='+target,'-std=c++17','-Wall','-Wextra','-Werror','-fsyntax-only','-I','native/include','native/tests/compute-portable.cpp'],{cwd:root,windowsHide:true,timeout:30000});android.push({target,headerSyntax:true,gpuBackend:false});}
  const header='#pragma once\n#include <HBEngine/Game.hpp>\n#include <HBEngine/Compute.hpp>\nHB_CLASS(Blueprintable) class GpuProbe:public hb::Actor { public: HB_PROPERTY(BlueprintReadWrite) bool verified=false; HB_FUNCTION(BlueprintCallable) float Run(); };';
  const source='float GpuProbe::Run(){hb::gpu::Device gpu;hb::gpu::Particles particles(gpu,{1,2,3,0,4,0,0,20});particles.step(.5f);auto values=particles.read();verified=values[0]==3&&values[1]==2&&values[2]==3&&values[3]==.5f;return values[0];}';
  const built=await host.build(header,source),bp=createAsset('blueprint','BP_GpuProbe');bp.native={...built.metadata,header,source};bp.settings.parentClass='GpuProbe';const begin=makeNode('beginPlay'),call=makeNode('nativeCall');call.nativeId='GpuProbe.Run';bp.nodes=[begin,call];bp.edges=[{from:{node:begin.id,pin:'then'},to:{node:call.id,pin:'exec'}}];
  const actor={id:'GPU',kind:'empty',name:'GPU',visible:true,position:[7,8,9],rotation:[0,0,0],scale:[1,1,1],components:[],nativeClass:'GpuProbe',nativeProperties:{verified:false}},objects=[actor],vm=new BlueprintRuntime(objects,[{root:bp,self:actor.id}],{native:async request=>{const reply=await host.call(built.token,{...request,objects});for(const state of reply.objects)Object.assign(actor,state);return reply;}});
  await vm.start();assert.equal(actor.nativeProperties.verified,true);assert.deepEqual(actor.position,[7,8,9]);const direct=await host.call(built.token,{key:'nativeCall',nativeId:'GpuProbe.Run',self:actor.id,args:{target:actor.id},objects});assert.equal(direct.outputs.result,3);await vm.stop();
  const record={passed:true,checkedFiles,...results,android,blueprintToActualCppToHardwareCompute:true,cppReturn:direct.outputs.result,placedTransformPreserved:true,shaderApi:'Direct3D11 CSSetShader + Dispatch cs_5_0; no software fallback',benchmark:'same float records, 20 resident dispatches then one readback; GPU upload/dispatch/readback included; per-step readback separately measured; excludes renderer/IPC/FPS',rendererMigrated:false,mobileBackendImplemented:false};await fs.writeFile(path.join(dir,'acceptance.json'),JSON.stringify(record,null,2));console.log(JSON.stringify({dir,...results,android,blueprintToCppGpu:true}));
}catch(error){await fs.writeFile(path.join(dir,'failure.json'),JSON.stringify({message:error.message,stderr:error.stderr,stack:error.stack},null,2));console.error('Compute evidence:',dir);throw error;}finally{host.close();}
