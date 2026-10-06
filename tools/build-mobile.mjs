import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {moduleClosure} from './build-game.mjs';
import {assetKind} from './project-service.mjs';
import {nativeSources} from './native-source.mjs';
import {prepareNative,jsonInclude} from './prepare-native.mjs';
import {mobileSettings,profileTarget} from '../prototype/build-profile.js';

const root=path.resolve(import.meta.dirname,'..'),json=value=>JSON.stringify(value,null,2)+'\n';
export async function mobileSources(natives,out){
  await prepareNative();const sources=[],modules=[],declarations=[],cases=[];
  for(const [signature,code] of natives){
    const name='HB_module_'+signature.slice(0,20),dir=path.join(out,'Native',name),generated=nativeSources(code.header,code.source,{portableName:name});await fs.mkdir(dir,{recursive:true});
    // Each module keeps its original worker's independent world/static state.
    // Rename hb and user class symbols before compiling all AOT modules together.
    const prefix='#define hb HB_hb_'+signature.slice(0,20)+'\n'+generated.metadata.classes.map(c=>'#define '+c.name+' HB_'+signature.slice(0,20)+'_'+c.name).join('\n')+'\n';
    await fs.writeFile(path.join(dir,'User.hpp'),'#pragma once\n'+prefix+generated.header);
    await fs.writeFile(path.join(dir,'User.cpp'),prefix+generated.source);await fs.writeFile(path.join(dir,'Worker.cpp'),prefix+generated.worker);
    sources.push(path.join(dir,'User.cpp'),path.join(dir,'Worker.cpp'));declarations.push('std::string '+name+'(const std::string&,const std::function<std::string(const std::string&)>&);');cases.push('case '+modules.length+':return '+name+'(request,query);');
    modules.push({signature,metadata:generated.metadata,header:code.header,source:code.source});
  }
  const header='#pragma once\n#include <HBEngine/NativeRouting.hpp>\n'+declarations.join('\n')+'\ninline std::string HB_mobileDispatch(int module,const std::string& request,const hb_native::Query& query){switch(module){'+cases.join('')+'default:throw std::runtime_error("unregistered mobile module");}}\ninline std::string HB_mobileInvoke(int module,const std::string& request,const hb_native::Query& query){static const auto modules=hb_native::Json::parse('+JSON.stringify(JSON.stringify(modules.map(({signature,metadata})=>({signature,metadata}))))+');std::vector<int> active;int count=0;return hb_native::Invoke(module,request,query,modules,HB_mobileDispatch,active,count);}\n';
  await fs.mkdir(path.join(out,'Native'),{recursive:true});await fs.writeFile(path.join(out,'Native/Modules.hpp'),header);
  await fs.cp(path.join(root,'native/include'),path.join(out,'Native/include'),{recursive:true});await fs.cp(path.join(jsonInclude,'nlohmann'),path.join(out,'Native/include/nlohmann'),{recursive:true});
  return {sources,modules};
}

export async function buildMobile(record,profile,prepared,{signal,onProgress=()=>{},dryRun=false}={}){
  const {content,natives,report}=prepared,target=profileTarget(profile),settings=mobileSettings(profile);
  if(!profile.mobile?.applicationId)settings.applicationId='com.hbengine.game'+record.manifest.id.replace(/[^a-z0-9]/gi,'');
  let redirects={};try{redirects=JSON.parse(await fs.readFile(await record.project.resolve('.hbredirects.json',true,false),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
  const platform=await import(target==='android'?'./mobile-android.mjs':'./mobile-ios.mjs');
  const capability=await platform.mobileCapability(profile);
  if(dryRun)return {...report,mobile:settings,capability};
  if(target==='android'&&!capability.ready)throw Error(capability.error);
  signal?.throwIfAborted();const id=new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomUUID().slice(0,8),out=path.join(record.root,'Builds',profile.id,id);
  await fs.mkdir(out,{recursive:true});const real=await fs.realpath(out),base=await fs.realpath(record.root);if(!real.toLowerCase().startsWith((base+path.sep).toLowerCase()))throw Error('모바일 빌드 경로가 프로젝트 밖이에요.');
  const assets=path.join(out,'Assets'),files=[],copied=new Set();
  const write=async(name,data)=>{signal?.throwIfAborted();const destination=path.join(assets,name);await fs.mkdir(path.dirname(destination),{recursive:true});await fs.writeFile(destination,data,{flag:'wx'});files.push({path:name,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});};
  const copy=async(from,to)=>{if(copied.has(to))return;await write(to,await fs.readFile(from));copied.add(to);};
  try{
    onProgress('모바일 콘텐츠');for(const [name,bytes] of content)await write('Content/'+name,bytes);
    const closure=await moduleClosure('prototype/player.js');await moduleClosure('prototype/mobile-player.js',closure);for(const file of closure)await copy(file,path.relative(root,file).split(path.sep).join('/'));
    let html=await fs.readFile(path.join(root,'prototype/player.html'),'utf8');html=html.replace('<script type="module" src="/prototype/player.js"></script>','<script type="module">import {startMobilePlayer} from "/prototype/mobile-player.js";startMobilePlayer().catch(startupFailure);</script>');await write('prototype/player.html',Buffer.from(html));
    for(const name of ['player.css','ui-runtime.css'])await copy(path.join(root,'prototype',name),'prototype/'+name);
    for(const [name,source] of [['Three','node_modules/three/LICENSE'],['Rapier2D','node_modules/@dimforge/rapier2d-compat/LICENSE'],['Rapier3D','node_modules/@dimforge/rapier3d-compat/LICENSE']])await copy(path.join(root,source),'licenses/'+name+'.txt');
    onProgress('모바일 C++ 준비');const native=await mobileSources(natives,out);
    const manifest={version:1,id:record.manifest.id,name:profile.productName,configuration:profile.configuration,target,mobile:settings,width:profile.width,height:profile.height,gameInstance:report.gameInstance||'',startupScene:report.startupScene,startupBlueprint:record.manifest.startupBlueprint,entries:[...content.keys()].map(p=>({path:p,name:path.basename(p),kind:assetKind(p)})),nativeModules:native.modules,redirects,files};
    await fs.writeFile(path.join(assets,'game.hbpack.json'),json(manifest),{flag:'wx'});
    const result=await platform.packageMobile({out,assets,profile,settings,native,signal,onProgress,capability});
    if(result.artifactType!=='xcodeProject')result.artifactSha256=createHash('sha256').update(await fs.readFile(result.artifact)).digest('hex');
    const output={...report,id,output:out,mobile:settings,...result,totalFiles:files.length,totalBytes:files.reduce((n,f)=>n+f.bytes,0)};
    await fs.writeFile(path.join(out,'build-report.json'),json(output),{flag:'wx'});onProgress('완료');return output;
  }catch(error){await fs.writeFile(path.join(out,'build-failed.json'),json({error:error.message,canceled:signal?.aborted===true}));throw error;}
}
