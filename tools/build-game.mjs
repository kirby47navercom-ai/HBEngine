import {gameInstanceBlueprint} from '../prototype/runtime-game.js';
import {parseNativeHeader,canonicalNativeText} from '../prototype/native-model.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {readProjectManifest} from './project-manifest.mjs';
import {assetKind,assetReferences} from './project-service.mjs';
import {NativeHost} from './native-host.mjs';
import {validAsset} from '../prototype/asset-documents.js';
import {defaultBuildProfile,validBuildProfile,profileTarget,buildTargets} from '../prototype/build-profile.js';
const root=path.resolve(import.meta.dirname,'..');
export const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export const nativeSignature=(header,source)=>digest(JSON.stringify([header,source]));
const json=data=>JSON.stringify(data,null,2)+'\n';
const failIfCanceled=signal=>signal?.throwIfAborted();
export async function readBuildProfiles(record){
  const file=await record.project.resolve('Settings/BuildProfiles.json',true,false);let text;
  try{text=await fs.readFile(file,'utf8');}catch(e){if(e.code!=='ENOENT')throw e;}
  const data=text?JSON.parse(text):{version:1,profiles:[defaultBuildProfile(record.manifest)]};
  if(data.version!==1||!Array.isArray(data.profiles)||!data.profiles.length||data.profiles.length>32||!data.profiles.every(validBuildProfile)||new Set(data.profiles.map(p=>p.id)).size!==data.profiles.length)throw Error('빌드 프로필 검증 실패');
  return {...data,revision:digest(text||''),file};
}
export async function saveBuildProfiles(record,data,expected,checkOwner=()=>{}){
  if(data?.version!==1||!Array.isArray(data.profiles)||!data.profiles.length||data.profiles.length>32||!data.profiles.every(validBuildProfile)||new Set(data.profiles.map(p=>p.id)).size!==data.profiles.length)throw Error('빌드 프로필 검증 실패');
  const old=await readBuildProfiles(record);checkOwner();if(old.revision!==expected)throw Error('빌드 프로필이 변경됐어요. 다시 읽으세요.');
  await fs.mkdir(path.dirname(old.file),{recursive:true});const temp=old.file+'.'+randomUUID()+'.tmp';
  try{await fs.writeFile(temp,json({version:1,profiles:data.profiles}),{flag:'wx'});checkOwner();await fs.rename(temp,old.file);return await readBuildProfiles(record);}finally{await fs.unlink(temp).catch(e=>{if(e.code!=='ENOENT')throw e;});}
}
export async function inspectBuild(record,profile){
  if(!validBuildProfile(profile))throw Error('빌드 프로필을 확인하세요.');
  const files=await record.project.files(),enabled=new Set();for(const scene of profile.scenes.filter(s=>s.enabled))enabled.add(path.relative(record.root,await record.project.resolve(scene.path)).split(path.sep).join('/'));
  for(const name of enabled)if(!files.some(f=>f.path===name&&f.kind==='scene'))throw Error('빌드 장면이 없어요: '+name);
  const content=new Map(),natives=new Map(),warnings=[];let size=0;
  // Include all Assets for dynamic lookups; also follow actual project-file references outside Assets.
  const include=async name=>{
    const info=await record.project.read(name),canonical=path.relative(record.root,info.file).split(path.sep).join('/');
    if(content.has(canonical))return canonical;
    if(assetKind(canonical)==='scene'&&!enabled.has(canonical))throw Error('빌드에서 제외한 장면 참조: '+name);
    if(info.size>104857600)throw Error('빌드 파일 100MB 제한: '+name);
    const bytes=await fs.readFile(info.file);size+=bytes.length;if(size>1073741824)throw Error('빌드 콘텐츠 1GB 제한');content.set(canonical,bytes);return canonical;
  };
  let gameInstanceAsset=record.manifest.gameInstance||'';
  if(!gameInstanceAsset){const selected=new Set();for(const scene of enabled){const data=JSON.parse(await fs.readFile((await record.project.read(scene)).file,'utf8'));if(data.runtime?.gameConfig){const config=JSON.parse(await fs.readFile((await record.project.read(data.runtime.gameConfig)).file,'utf8'));if(!validAsset('gameconfig',config))throw Error('게임 설정 형식 오류');if(config.gameInstance)selected.add(config.gameInstance);}}if(selected.size>1)throw Error('빌드 장면의 GameInstance 클래스는 하나로 지정하세요.');gameInstanceAsset=[...selected][0]||'';}
  if(gameInstanceAsset.startsWith('Source/')){const {root:gameRoot,asset}=await gameInstanceBlueprint(gameInstanceAsset,{readText:async name=>fs.readFile((await record.project.read(name)).file,'utf8')});gameInstanceAsset=asset;content.set(asset,Buffer.from(json(gameRoot)));await include(gameRoot.native.headerPath);await include(gameRoot.native.sourcePath);}else if(gameInstanceAsset)await include(gameInstanceAsset);
  for(const f of files.filter(f=>f.kind!=='folder'&&f.path.startsWith('Assets/')&&(f.kind!=='scene'||enabled.has(f.path))))await include(f.path);
  for(const [name,bytes] of content){
    let data;const kind=assetKind(name);
    if(/\.hb[^/]+\.json$/i.test(name)){data=JSON.parse(bytes);if(!validAsset(kind,data))throw Error('에셋 검증 실패: '+name);}
    else if(name.endsWith('.json')||name.endsWith('.gltf')){try{data=JSON.parse(bytes);}catch{continue;}}
    else continue;
    if(kind==='blueprint'&&data.native){
      const n=data.native,headerPath=await include(n.headerPath||'Source/DoorController.h'),sourcePath=await include(n.sourcePath||'Source/DoorController.cpp'),header=canonicalNativeText(content.get(headerPath).toString('utf8')),source=canonicalNativeText(content.get(sourcePath).toString('utf8'));
      natives.set(nativeSignature(header,source),{header,source});Object.assign(n,parseNativeHeader(header));delete n.header;delete n.source;content.set(name,Buffer.from(json(data)));
    }
    for(const value of assetReferences(data,name))await include(value);
  }
  const legacyBlueprints=new Map();for(const [name,bytes] of content)if(name.endsWith('.hbblueprint.json')){const bp=JSON.parse(bytes);const candidates=legacyBlueprints.get(bp.name)||[];candidates.push(name);legacyBlueprints.set(bp.name,candidates);}
  for(const [name,bytes] of content)if(name.endsWith('.hbscene.json')){const data=JSON.parse(bytes);let changed=false;for(const object of data.objects)if(object.blueprint&&!object.blueprintAsset){const matches=legacyBlueprints.get(object.blueprint)||[];if(matches.length!==1)throw Error(name+': 블루프린트 이름을 경로로 지정하세요: '+object.blueprint);object.blueprintAsset=matches[0];changed=true;}if(changed)content.set(name,Buffer.from(json(data)));}
  warnings.push('텍스처·모델·음향은 가져온 형식을 유지해요. 실행 환경의 지원 코덱이 필요해요.');
  return {content,natives,report:{target:profileTarget(profile),renderer:buildTargets[profileTarget(profile)].renderer,profile:structuredClone(profile),startupScene:[...enabled][0],gameInstance:gameInstanceAsset,files:content.size,bytes:[...content.values()].reduce((sum,b)=>sum+b.length,0),nativeModules:natives.size,warnings}};
}
export async function moduleClosure(entry,seen=new Set()){
  const full=path.resolve(root,entry);if(seen.has(full))return seen;seen.add(full);const source=await fs.readFile(full,'utf8');
  for(const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)['"]([^'"]+)['"]/g)){
    const specifier=match[1],dependency=specifier.startsWith('.')?path.relative(root,path.resolve(path.dirname(full),specifier)):specifier==='three'?'node_modules/three/build/three.module.js':specifier.startsWith('three/addons/')?'node_modules/three/examples/jsm/'+specifier.slice(13):null;
    if(specifier==='three'||specifier.startsWith('three/addons/'))seen.add(path.join(root,'node_modules/three/package.json'));
    if(dependency)await moduleClosure(dependency,seen);
  }
  return seen;
}
export async function buildGame(record,profile,{dryRun=false,signal,onProgress=()=>{}}={}){
  failIfCanceled(signal);onProgress('검증');const {content,natives,report}=await inspectBuild(record,profile);failIfCanceled(signal);if(profileTarget(profile)!=='windows-x64')return (await import('./build-mobile.mjs')).buildMobile(record,profile,{content,natives,report},{signal,onProgress,dryRun});if(dryRun)return report;
  if(process.platform!=='win32'||process.arch!=='x64')throw Error('Windows x64에서 빌드하세요.');
  const desktop=path.join(root,'dist/HBEngine');await fs.access(path.join(desktop,'HBPlayer.exe'));
  const id=new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomUUID().slice(0,8),relative='Builds/'+profile.id+'/'+id,out=await record.project.resolve(relative,true,false);await fs.mkdir(out,{recursive:true});
  const canonical=await fs.realpath(out);if(!canonical.toLowerCase().startsWith((record.root+path.sep).toLowerCase()))throw Error('빌드 경로가 프로젝트 밖이에요.');
  const host=new NativeHost(),artifacts=[],copied=new Set();const write=async(name,bytes)=>{failIfCanceled(signal);await fs.mkdir(path.dirname(path.join(out,name)),{recursive:true});await fs.writeFile(path.join(out,name),bytes,{flag:'wx'});artifacts.push({path:name,bytes:bytes.length,sha256:digest(bytes)});copied.add(name);};
  const copy=async(from,to)=>{if(!copied.has(to))await write(to,await fs.readFile(from));};
  try{
    const nativeModules=[];onProgress('C++ 빌드');for(const [signature,item] of natives){failIfCanceled(signal);const result=await host.build(item.header,item.source,{configuration:profile.configuration,signal}),binary='Binaries/'+signature+'.exe';await copy(host.sessions.get(result.token).binary,binary);nativeModules.push({signature,binary,metadata:result.metadata});}
    onProgress('콘텐츠 준비');for(const [name,bytes] of content)await write('Content/'+name,bytes);
    // Redirect aliases keep renamed model sidecars and string-based asset references working.
    let redirects={};try{redirects=JSON.parse(await fs.readFile(await record.project.resolve('.hbredirects.json',true,false),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
    onProgress('실행 파일 구성');const modules=await moduleClosure('prototype/player.js');for(const file of await moduleClosure('tools/player-server.mjs'))modules.add(file);
    for(const file of modules)await copy(file,path.relative(root,file).split(path.sep).join('/'));
    for(const name of ['player.html','player.css','ui-runtime.css'])await copy(path.join(root,'prototype',name),'prototype/'+name);
    const copyLicenses=async rel=>{for(const e of await fs.readdir(path.join(desktop,rel),{withFileTypes:true})){if(e.isSymbolicLink())throw Error('배포 의존성 심볼릭 링크');if(e.isDirectory())await copyLicenses(rel+'/'+e.name);else await copy(path.join(desktop,rel,e.name),rel+'/'+e.name);}};await copyLicenses('licenses');
    await copy(path.join(desktop,'HBPlayer.exe'),'Game.exe');await copy(path.join(desktop,'runtime/node.exe'),'runtime/node.exe');await copy(path.join(desktop,'WebView2Loader.dll'),'WebView2Loader.dll');await write('package.json',Buffer.from('{"type":"module"}\n'));await copy(path.join(root,'tools/kiosk-watchdog.mjs'),'tools/kiosk-watchdog.mjs');await write('Kiosk.cmd',Buffer.from('@echo off\r\n"%~dp0runtime\\node.exe" "%~dp0tools\\kiosk-watchdog.mjs" "%~dp0Game.exe"\r\n'));
    failIfCanceled(signal);const manifest={version:1,id:record.manifest.id,name:profile.productName,configuration:profile.configuration,kiosk:profile.kiosk||{},width:profile.width,height:profile.height,startupScene:report.startupScene,startupBlueprint:record.manifest.startupBlueprint,gameInstance:report.gameInstance||'',entries:[...content.keys()].map(p=>({path:p,name:path.basename(p),kind:assetKind(p)})),nativeModules,redirects,files:artifacts};
    const result={...report,id,output:out,executable:path.join(out,'Game.exe'),totalFiles:artifacts.length,totalBytes:artifacts.reduce((sum,f)=>sum+f.bytes,0)};await fs.writeFile(path.join(out,'build-report.json'),json(result),{flag:'wx'});await fs.writeFile(path.join(out,'game.hbpack.json'),json(manifest),{flag:'wx'});onProgress('완료');return result;
  }catch(error){await fs.writeFile(path.join(out,'build-failed.json'),json({error:error.message,canceled:signal?.aborted===true}));throw error;}finally{host.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){try{const [file,id,...options]=process.argv.slice(2),record=await readProjectManifest(path.resolve(file)),settings=await readBuildProfiles(record),profile=settings.profiles.find(p=>p.id===(id||'windows'));console.log(json(await buildGame(record,profile,{dryRun:options.includes('--dry-run'),onProgress:s=>console.error(s)})));}catch(error){console.error(error.message);process.exitCode=1;}}
