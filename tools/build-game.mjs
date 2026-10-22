import {resolveEffectDefinition} from '../prototype/effect-scaling.js';
import {fileContent,isFileContent,writeBuildContent,buildChunkBytes} from './build-content.mjs';
import {resolvePrefab} from '../prototype/prefab-variants.js';
import {packagedRuntimeBytes,packagedRuntimeContent} from './packaged-runtime.mjs';
import {cookContent} from './cook-cache.mjs';
import {cookDistanceFields} from './distance-field-cook.mjs';
import {gameInstanceBlueprint} from '../prototype/runtime-game.js';
import {loadSequenceTree} from '../prototype/sequence-sections.js';
import {createNativeTypeImportResolver} from '../prototype/native-type-imports.js';
import {nativeTypeReference} from '../prototype/native-model.js';
import {parseNativeHeader,canonicalNativeText} from '../prototype/native-model.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {windowsGameIdentity} from './windows-game-identity.mjs';
import {readProjectManifest} from './project-manifest.mjs';
import {assetKind,assetReferences} from './project-service.mjs';
import {NativeHost} from './native-host.mjs';
import {readNativeFiles} from './native-project.mjs';
import {validAsset} from '../prototype/asset-documents.js';
import {resolveWidgetComposition} from '../prototype/widget-composition.js';
import {resolveMaterialAsset} from '../prototype/material-runtime.js';
import {validateAbilitySetGraph} from '../prototype/ability-set-resolution.js';
import {defaultBuildProfile,validBuildProfile,profileTarget,buildTargets,frameSettings} from '../prototype/build-profile.js';
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
export async function inspectBuild(record,profile,{signal}={}){
  if(!validBuildProfile(profile))throw Error('빌드 프로필을 확인하세요.');
  const files=await record.project.files({signal}),enabled=new Set();for(const scene of profile.scenes.filter(s=>s.enabled))enabled.add(path.relative(record.root,await record.project.resolve(scene.path)).split(path.sep).join('/'));
  for(const name of enabled)if(!files.some(f=>f.path===name&&f.kind==='scene'))throw Error('빌드 장면이 없어요: '+name);
  const content=new Map(),natives=new Map(),warnings=[],nativeFiles=await readNativeFiles(record.project,{files,signal});
  // Include all Assets for dynamic lookups; also follow actual project-file references outside Assets.
  const include=async name=>{
    signal?.throwIfAborted();const info=await record.project.read(name),canonical=path.relative(record.root,info.file).split(path.sep).join('/');
    if(content.has(canonical))return canonical;
    if(assetKind(canonical)==='scene'&&!enabled.has(canonical))throw Error('빌드에서 제외한 장면 참조: '+name);
    const bytes=/\.(json|gltf|h|hpp|hh|inl|cpp|cc|cxx|c)$/i.test(canonical)?await fs.readFile(info.file,{signal}):await fileContent(info.file,{root:record.root,signal});content.set(canonical,bytes);if(/\.(gltf|glb|obj|fbx)$/i.test(canonical)){try{await record.project.read(canonical+'.import.json');await include(canonical+'.import.json');}catch(error){if(error.code!=='ENOENT')throw error;}}return canonical;
  };
  let gameInstanceAsset=record.manifest.gameInstance||'';
  for(const file of nativeFiles)await include(file.path);
  if(!gameInstanceAsset){const selected=new Set();for(const scene of enabled){const data=JSON.parse(await fs.readFile((await record.project.read(scene)).file,'utf8'));if(data.runtime?.gameConfig){const config=JSON.parse(await fs.readFile((await record.project.read(data.runtime.gameConfig)).file,'utf8'));if(!validAsset('gameconfig',config))throw Error('게임 설정 형식 오류');if(config.gameInstance)selected.add(config.gameInstance);}}if(selected.size>1)throw Error('빌드 장면의 GameInstance 클래스는 하나로 지정하세요.');gameInstanceAsset=[...selected][0]||'';}
  if(gameInstanceAsset.startsWith('Source/')){const {root:gameRoot,asset}=await gameInstanceBlueprint(gameInstanceAsset,{readText:async name=>fs.readFile((await record.project.read(name)).file,'utf8')});gameInstanceAsset=asset;content.set(asset,Buffer.from(json(gameRoot)));await include(gameRoot.native.headerPath);await include(gameRoot.native.sourcePath);}else if(gameInstanceAsset)await include(gameInstanceAsset);
  for(const f of files.filter(f=>f.kind!=='folder'&&f.path.startsWith('Assets/')&&(f.kind!=='scene'||enabled.has(f.path))))await include(f.path);
  for(const [name,bytes] of content){
    let data;const kind=assetKind(name);
    if(/\.hb[^/]+\.json$/i.test(name)){data=JSON.parse(bytes);if(!validAsset(kind,data))throw Error('에셋 검증 실패: '+name);}
    else if(name.endsWith('.json')||name.endsWith('.gltf')){try{data=JSON.parse(bytes);}catch{continue;}}
    else continue;
    if(kind==='blueprint'&&nativeTypeReference(data.native)){const types=await createNativeTypeImportResolver(async name=>content.get(await include(name)).toString('utf8'))(data.native);if(!validAsset('blueprint',{...data,native:types}))throw Error('타입 라이브러리와 빌드 BP가 맞지 않아요: '+name);}
    else if(kind==='blueprint'&&data.native){
      const n=data.native,headerPath=await include(n.headerPath||'Source/DoorController.h'),sourcePath=await include(n.sourcePath||'Source/DoorController.cpp'),header=canonicalNativeText(content.get(headerPath).toString('utf8')),source=canonicalNativeText(content.get(sourcePath).toString('utf8'));
      natives.set(nativeSignature(header,source),{header,source,files:nativeFiles});Object.assign(n,parseNativeHeader(header,{files:nativeFiles}));delete n.header;delete n.source;content.set(name,Buffer.from(json(data)));
    }
    for(const value of assetReferences(data,name))await include(value);
  }
  for(const [name]of content)if(assetKind(name)==='sequenceasset')await loadSequenceTree(name,async dependency=>JSON.parse(content.get(await include(dependency))));
  const effectCurves=Object.create(null);for(const [name,bytes]of content)if(assetKind(name)==='effect')try{await resolveEffectDefinition(JSON.parse(bytes),async dependency=>{signal?.throwIfAborted();return JSON.parse(content.get(await include(dependency)));},{capture:false,curves:effectCurves});}catch(error){throw Error(name+': '+error.message);}
  // Validate reusable shader dependencies before exporting, retaining authored function files.
  for(const [name,bytes] of content)if(['material','materialinstance'].includes(assetKind(name)))try{await resolveMaterialAsset(JSON.parse(bytes),async dependency=>JSON.parse(content.get(await include(dependency))));}catch(error){throw Error(name+': '+error.message);}
  for(const [name,bytes]of content)if(assetKind(name)==='widget')try{await resolveWidgetComposition(JSON.parse(bytes),async dependency=>JSON.parse(content.get(await include(dependency))));}catch(error){throw Error(name+': '+error.message);}
  for(const [name]of content)if(assetKind(name)==='prefab')try{await resolvePrefab(name,async dependency=>JSON.parse(content.get(await include(dependency))),{validate:data=>validAsset('prefab',data)});}catch(error){throw Error(name+': '+error.message);}
  await validateAbilitySetGraph([...content.keys()].filter(name=>assetKind(name)==='abilityset'),async dependency=>{signal?.throwIfAborted();return JSON.parse(content.get(await include(dependency)));});
  const legacyBlueprints=new Map();for(const [name,bytes] of content)if(name.endsWith('.hbblueprint.json')){const bp=JSON.parse(bytes);const candidates=legacyBlueprints.get(bp.name)||[];candidates.push(name);legacyBlueprints.set(bp.name,candidates);}
  for(const [name,bytes] of content)if(name.endsWith('.hbscene.json')){const data=JSON.parse(bytes);let changed=false;for(const object of data.objects)if(object.blueprint&&!object.blueprintAsset){const matches=legacyBlueprints.get(object.blueprint)||[];if(matches.length!==1)throw Error(name+': 블루프린트 이름을 경로로 지정하세요: '+object.blueprint);object.blueprintAsset=matches[0];changed=true;}if(changed)content.set(name,Buffer.from(json(data)));}
  warnings.push('텍스처·모델·음향은 가져온 형식을 유지해요. 실행 환경의 지원 코덱이 필요해요.');
  const distanceFields=await cookDistanceFields(record.project,content,{signal});
  const cooked=await cookContent(record.project,content,profileTarget(profile),{signal});content.clear();for(const [name,bytes] of cooked.content)content.set(name,bytes);
  const renderBackend=profileTarget(profile)==='windows-x64'&&profile.windowsRenderer==='d3d11'?'d3d11':JSON.parse(content.get([...enabled][0])).runtime?.renderBackend||'webgl2',renderer=renderBackend==='d3d11'?'D3D11 + WebView2 UI':buildTargets[profileTarget(profile)].renderer.replace(/WebGL2$/,renderBackend==='webgpu'?'WebGPU':'WebGL2');
  return {content,natives,report:{distanceFields,cook:cooked.report,target:profileTarget(profile),renderer,renderBackend,profile:structuredClone(profile),startupScene:[...enabled][0],gameInstance:gameInstanceAsset,streaming:{chunkBytes:buildChunkBytes,fileBackedFiles:[...content.values()].filter(isFileContent).length,fileBackedBytes:[...content.values()].filter(isFileContent).reduce((n,b)=>n+b.length,0),bufferedBytes:[...content.values()].filter(b=>!isFileContent(b)).reduce((n,b)=>n+b.length,0)},files:content.size,bytes:[...content.values()].reduce((sum,b)=>sum+b.length,0),nativeModules:natives.size,warnings}};
}
export async function moduleClosure(entry,seen=new Set()){
  const full=path.resolve(root,entry);if(seen.has(full))return seen;seen.add(full);const source=(await packagedRuntimeBytes(full)).toString('utf8');
  for(const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)['"]([^'"]+)['"]/g)){
    if(match[1]==='ws'){async function collect(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory())await collect(f);else if(/\.(?:js|mjs|json)$/.test(e.name)||e.name==='LICENSE')seen.add(f);}}await collect(path.join(root,'node_modules/ws'));}
    const specifier=match[1],dependency=specifier.startsWith('.')?path.relative(root,path.resolve(path.dirname(full),specifier)):specifier==='three'?'node_modules/three/build/three.module.js':specifier==='three/webgpu'?'node_modules/three/build/three.webgpu.js':specifier==='three/tsl'?'node_modules/three/build/three.tsl.js':specifier.startsWith('three/addons/')?'node_modules/three/examples/jsm/'+specifier.slice(13):null;
    if(specifier==='three'||specifier.startsWith('three/'))seen.add(path.join(root,'node_modules/three/package.json'));
    if(dependency)await moduleClosure(dependency,seen);
  }
  // Worklets/workers use module-relative URLs rather than import declarations.
  for(const match of source.matchAll(/\bnew\s+URL\(\s*['"](\.\.?\/[^'"\r\n]+\.(?:m?js))['"]\s*,\s*import\.meta\.url\s*\)/g))await moduleClosure(path.relative(root,path.resolve(path.dirname(full),match[1])),seen);
  return seen;
}
export async function buildGame(record,profile,{dryRun=false,signal,onProgress=()=>{}}={}){
  failIfCanceled(signal);onProgress('검증');const {content,natives,report}=await inspectBuild(record,profile,{signal});failIfCanceled(signal);if(profileTarget(profile)==='web')return (await import('./build-web.mjs')).buildWeb(record,profile,{content,natives,report},{signal,onProgress,dryRun});if(profileTarget(profile)!=='windows-x64')return (await import('./build-mobile.mjs')).buildMobile(record,profile,{content,natives,report},{signal,onProgress,dryRun});if(dryRun)return report;
  if(process.platform!=='win32'||process.arch!=='x64')throw Error('Windows x64에서 빌드하세요.');
  const desktop=await fs.access(path.join(root,'HBPlayer.exe')).then(()=>root,()=>path.join(root,'dist/HBEngine'));await fs.access(path.join(desktop,'HBPlayer.exe'));
  const id=new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomUUID().slice(0,8),relative='Builds/'+profile.id+'/'+id,out=await record.project.resolve(relative,true,false);await fs.mkdir(out,{recursive:true});
  const canonical=await fs.realpath(out);if(!canonical.toLowerCase().startsWith((record.root+path.sep).toLowerCase()))throw Error('빌드 경로가 프로젝트 밖이에요.');
  const host=new NativeHost(),artifacts=[],copied=new Set();const write=async(name,bytes)=>{artifacts.push(await writeBuildContent(out,name,bytes,{signal}));copied.add(name);};
  const copy=async(from,to)=>{if(!copied.has(to))await write(to,await packagedRuntimeContent(from,{signal}));};
  try{
    const nativeModules=[];onProgress('C++ 빌드');for(const [signature,item] of natives){failIfCanceled(signal);const result=await host.build(item.header,item.source,{configuration:profile.configuration,signal,files:item.files}),binary='Binaries/'+signature+'.exe';await copy(host.sessions.get(result.token).binary,binary);nativeModules.push({signature,binary,metadata:result.metadata});}
    onProgress('콘텐츠 준비');for(const [name,bytes] of content)await write('Content/'+name,bytes);
    // Redirect aliases keep renamed model sidecars and string-based asset references working.
    let redirects={};try{redirects=JSON.parse(await fs.readFile(await record.project.resolve('.hbredirects.json',true,false),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
    onProgress('실행 파일 구성');const modules=await moduleClosure('prototype/player.js');for(const file of await moduleClosure('tools/player-server.mjs'))modules.add(file);
    for(const file of modules)await copy(file,path.relative(root,file).split(path.sep).join('/'));
    for(const name of ['player.html','player.css','ui-runtime.css'])await copy(path.join(root,'prototype',name),'prototype/'+name);
    const copyLicenses=async rel=>{for(const e of await fs.readdir(path.join(desktop,rel),{withFileTypes:true})){if(e.isSymbolicLink())throw Error('배포 의존성 심볼릭 링크');if(e.isDirectory())await copyLicenses(rel+'/'+e.name);else await copy(path.join(desktop,rel,e.name),rel+'/'+e.name);}};await copyLicenses('licenses');
    const windowsApplication=windowsGameIdentity(record.manifest.id);await copy(path.join(desktop,'HBPlayer.exe'),windowsApplication.executable);
    await promisify(execFile)(path.join(desktop,'HBPlayer.exe'),['--stamp-game',path.join(out,windowsApplication.executable),profile.productName],{windowsHide:true,signal,timeout:30000});const stamped=await fs.readFile(path.join(out,windowsApplication.executable));Object.assign(artifacts.find(f=>f.path===windowsApplication.executable),{bytes:stamped.length,sha256:digest(stamped)});
    await copy(path.join(root,'prototype/native-audio-worklet.js'),'prototype/native-audio-worklet.js');await copy(path.join(desktop,'runtime/node.exe'),'runtime/node.exe');await copy(path.join(desktop,'WebView2Loader.dll'),'WebView2Loader.dll');await write('package.json',Buffer.from('{"type":"module"}\n'));await copy(path.join(root,'tools/kiosk-watchdog.mjs'),'tools/kiosk-watchdog.mjs');await copy(path.join(root,'tools/windows-game-identity.mjs'),'tools/windows-game-identity.mjs');await write('Kiosk.cmd',Buffer.from('@echo off\r\n"%~dp0runtime\\node.exe" "%~dp0tools\\kiosk-watchdog.mjs" "%~dp0'+windowsApplication.executable+'"\r\n'));
    failIfCanceled(signal);const manifest={version:1,id:record.manifest.id,name:profile.productName,windowsApplication,configuration:profile.configuration,windowsRenderer:profile.windowsRenderer||'scene',kiosk:profile.kiosk||{},...frameSettings(profile),width:profile.width,height:profile.height,startupScene:report.startupScene,startupBlueprint:record.manifest.startupBlueprint,gameInstance:report.gameInstance||'',distanceFields:report.distanceFields?.manifest||'',entries:[...content.keys()].map(p=>({path:p,name:path.basename(p),kind:assetKind(p)})),nativeModules,redirects,files:artifacts};
    const result={...report,id,output:out,executable:path.join(out,windowsApplication.executable),windowsApplication,totalFiles:artifacts.length,totalBytes:artifacts.reduce((sum,f)=>sum+f.bytes,0)};await fs.writeFile(path.join(out,'build-report.json'),json(result),{flag:'wx'});await fs.writeFile(path.join(out,'game.hbpack.json'),json(manifest),{flag:'wx'});onProgress('완료');return result;
  }catch(error){await fs.writeFile(path.join(out,'build-failed.json'),json({error:error.message,canceled:signal?.aborted===true}));throw error;}finally{host.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){try{const [file,id,...options]=process.argv.slice(2),record=await readProjectManifest(path.resolve(file)),settings=await readBuildProfiles(record),profile=settings.profiles.find(p=>p.id===(id||'windows'));console.log(json(await buildGame(record,profile,{dryRun:options.includes('--dry-run'),onProgress:s=>console.error(s)})));}catch(error){console.error(error.message);process.exitCode=1;}}
