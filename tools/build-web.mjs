import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {randomUUID} from 'node:crypto';
import {moduleClosure,digest} from './build-game.mjs';
import {mobileSources} from './build-mobile.mjs';
import {runTool} from './mobile-android.mjs';
import {assetKind} from './project-service.mjs';
import {frameSettings} from '../prototype/build-profile.js';

const root=path.resolve(import.meta.dirname,'..'),json=value=>JSON.stringify(value,null,2)+'\n';
export async function webCapability(){
  const sdk=path.resolve(process.env.HB_EMSDK_ROOT||path.join(os.homedir(),'.codex/toolchains/emsdk'));
  const compiler=path.join(sdk,'upstream/emscripten/em++.py'),config=path.join(sdk,'.emscripten');
  try{await fs.access(compiler);await fs.access(config);return {ready:true,sdk,compiler,config};}
  catch{return {ready:false,sdk,error:'C++ 웹 빌드에는 Emscripten SDK가 필요해요. tools/prepare-web.mjs를 실행하세요.'};}
}
export async function compileWebNative(natives,out,{signal,onProgress=()=>{}}={}){
  const capability=await webCapability();if(!capability.ready)throw Error(capability.error);
  await fs.mkdir(path.join(root,'native/build'),{recursive:true});const work=await fs.mkdtemp(path.join(root,'native/build/web-native-'));
  try{
    const native=await mobileSources(natives,work),main=path.join(work,'Web.cpp');
    await fs.writeFile(main,`#include "Modules.hpp"
#include <emscripten.h>
#include <cstdlib>
EM_ASYNC_JS(char*,HB_query,(const char* text),{
  return stringToNewUTF8(JSON.stringify(await Module.hbQuery(JSON.parse(UTF8ToString(text)))));
});
extern "C" EMSCRIPTEN_KEEPALIVE const char* HB_invoke(int module,const char* text){
  static std::string result;
  try{result=HB_mobileInvoke(module,text,[](const std::string& packet){
    char* reply=HB_query(packet.c_str());std::string value(reply);std::free(reply);return value;
  });}catch(const std::exception& e){result=hb_native::Json{{"ok",false},{"error",e.what()}}.dump();}
  return result.c_str();
}
`);
    await fs.mkdir(path.join(out,'Binaries'),{recursive:true});
    const args=[capability.compiler,'-std=c++17','-O2','-fexceptions','-I',path.join(work,'Native'),'-I',path.join(work,'Native/include'),...native.includeDirectories.flatMap(p=>['-I',p]),...native.sources,main,'--no-entry','-sMODULARIZE=1','-sEXPORT_ES6=1','-sENVIRONMENT=web,node','-sALLOW_MEMORY_GROWTH=1','-sASYNCIFY=1','-sASYNCIFY_STACK_SIZE=1048576','-sSTACK_SIZE=1048576','-sEXPORTED_RUNTIME_METHODS=["ccall","UTF8ToString","stringToNewUTF8"]','-o',path.join(out,'Binaries/game.mjs')];
    onProgress('C++ → WebAssembly');await runTool(process.env.HB_PYTHON||'python',args,{cwd:root,signal,timeout:600000,env:{...process.env,EM_CONFIG:capability.config,EMSDK:capability.sdk}});
    return native.modules;
  }finally{const checked=await fs.realpath(work),base=await fs.realpath(path.join(root,'native/build'));if(!checked.toLowerCase().startsWith((base+path.sep).toLowerCase()))throw Error('웹 빌드 임시 경로 오류');await fs.rm(checked,{recursive:true,force:true});}
}

export async function buildWeb(record,profile,{content,natives,report},{dryRun=false,signal,onProgress=()=>{}}={}){
  const capability=natives.size?await webCapability():{ready:true,required:false};
  if(dryRun)return {...report,capability};if(!capability.ready)throw Error(capability.error);
  signal?.throwIfAborted();const id=new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomUUID().slice(0,8),out=await record.project.resolve('Builds/'+profile.id+'/'+id,true,false);
  await fs.mkdir(out,{recursive:true});const real=await fs.realpath(out),base=await fs.realpath(record.root);if(!real.toLowerCase().startsWith((base+path.sep).toLowerCase()))throw Error('웹 빌드 경로가 프로젝트 밖이에요.');
  const files=[],copied=new Set();
  const write=async(name,bytes)=>{signal?.throwIfAborted();await fs.mkdir(path.dirname(path.join(out,name)),{recursive:true});await fs.writeFile(path.join(out,name),bytes,{flag:'wx'});files.push({path:name,bytes:bytes.length,sha256:digest(bytes)});copied.add(name);};
  const copy=async(name)=>{if(!copied.has(name))await write(name,await fs.readFile(path.join(root,name)));};
  try{
    onProgress('웹 콘텐츠');for(const [name,bytes] of content)await write('Content/'+name,bytes);
    const closure=await moduleClosure('prototype/player.js');await moduleClosure('prototype/web-player.js',closure);
    for(const file of closure)await copy(path.relative(root,file).split(path.sep).join('/'));
    for(const name of ['prototype/player.css','prototype/ui-runtime.css','node_modules/three/build/three.webgpu.js','node_modules/three/build/three.tsl.js'])await copy(name);
    for(const [name,source] of [['Three','node_modules/three/LICENSE'],['Rapier2D','node_modules/@dimforge/rapier2d-compat/LICENSE'],['Rapier3D','node_modules/@dimforge/rapier3d-compat/LICENSE']])await write('licenses/'+name+'.txt',await fs.readFile(path.join(root,source)));
    const nativeModules=natives.size?await compileWebNative(natives,out,{signal,onProgress}):[];
    if(nativeModules.length){
      for(const [name,file] of [['Emscripten',path.join(capability.sdk,'upstream/emscripten/LICENSE')],['musl',path.join(capability.sdk,'upstream/emscripten/system/lib/libc/musl/COPYRIGHT')]])await write('licenses/'+name+'.txt',await fs.readFile(file));
      const cached=path.join(root,'native/build/nlohmann-3.12.0-LICENSE.txt');let license;
      try{license=await fs.readFile(cached);}catch(error){if(error.code!=='ENOENT')throw error;const response=await fetch('https://raw.githubusercontent.com/nlohmann/json/v3.12.0/LICENSE.MIT',{signal});if(!response.ok)throw Error('JSON 라이선스 다운로드 실패');license=Buffer.from(await response.arrayBuffer());await fs.writeFile(cached,license);}
      await write('licenses/nlohmann-json.txt',license);
    }
    if(nativeModules.length)for(const name of ['Binaries/game.mjs','Binaries/game.wasm']){const bytes=await fs.readFile(path.join(out,name));files.push({path:name,bytes:bytes.length,sha256:digest(bytes)});}
    let redirects={};try{redirects=JSON.parse(await fs.readFile(await record.project.resolve('.hbredirects.json',true,false),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
    let html=await fs.readFile(path.join(root,'prototype/player.html'),'utf8');
    html=html.replace('<head>','<head><link rel="icon" href="data:,">');
    html=html.replaceAll('"/prototype/','"./prototype/').replaceAll('"/node_modules/','"./node_modules/').replace('<script type="module" src="./prototype/player.js"></script>','<script type="module">import {startWebPlayer} from "./prototype/web-player.js";startWebPlayer().catch(startupFailure);</script>');
    await write('index.html',Buffer.from(html));await write('.nojekyll',Buffer.alloc(0));
    const manifest={version:1,id:record.manifest.id,name:profile.productName,target:'web',renderBackend:report.renderBackend,configuration:profile.configuration,...frameSettings(profile),width:profile.width,height:profile.height,gameInstance:report.gameInstance||'',startupScene:report.startupScene,startupBlueprint:record.manifest.startupBlueprint,entries:[...content.keys()].map(p=>({path:p,name:path.basename(p),kind:assetKind(p)})),nativeModules,redirects,files};
    await fs.writeFile(path.join(out,'game.hbpack.json'),json(manifest),{flag:'wx'});
    const result={...report,id,output:out,artifact:path.join(out,'index.html'),artifactType:'web',totalFiles:files.length,totalBytes:files.reduce((n,f)=>n+f.bytes,0)};
    await fs.writeFile(path.join(out,'build-report.json'),json(result),{flag:'wx'});onProgress('완료');return result;
  }catch(error){await fs.writeFile(path.join(out,'build-failed.json'),json({error:error.message,canceled:signal?.aborted===true}));throw error;}
}
