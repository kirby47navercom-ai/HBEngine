import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {NativeHost} from './native-host.mjs';
import {windowsGameIdentity} from './windows-game-identity.mjs';
import {writeBuildContent} from './build-content.mjs';
import {packagedRuntimeContent} from './packaged-runtime.mjs';
import {moduleClosure} from './build-game.mjs';
import {frameSettings} from '../prototype/build-profile.js';
import {assetKind} from './project-service.mjs';
const root=path.resolve(import.meta.dirname,'..'),json=v=>JSON.stringify(v,null,2)+'\n';
const forbidden=new Set(['prototype/player.js','tools/check-player-keyboard-release.mjs','docs/NODE_CATALOG.md']);
export async function nativeRuntimeFiles(){
 const files=new Set(await moduleClosure('tools/native-game-runner.mjs',new Set(),{exclude:forbidden})),packages=new Set();
 async function dependency(name){if(packages.has(name))return;packages.add(name);const dir=path.join(root,'node_modules',name),p=JSON.parse(await fs.readFile(path.join(dir,'package.json'),'utf8'));async function walk(at){for(const e of await fs.readdir(at,{withFileTypes:true})){if(e.isSymbolicLink())throw Error('네이티브 의존성 심볼릭 링크');const file=path.join(at,e.name);if(e.isDirectory()){if(!['test','tests','examples','.github','docs'].includes(e.name))await walk(file);}else if(e.name.endsWith('.node')&&!e.name.includes('win32-x64-msvc'))continue;else if(/\.(?:m?js|cjs|json|node|wasm|dat)$/.test(e.name)||/^licen[cs]e/i.test(e.name))files.add(file);}}await walk(dir);for(const dep of Object.keys(p.dependencies||{}))await dependency(dep);}
 for(const dep of ['@napi-rs/canvas','@napi-rs/canvas-win32-x64-msvc','node-web-audio-api','@dimforge/rapier2d-compat','@dimforge/rapier3d-compat'])await dependency(dep);
 for(const file of files){const name=path.relative(root,file).split(path.sep).join('/');if(forbidden.has(name))throw Error('별도 소유 소스는 네이티브 패키지에 포함할 수 없어요: '+name);}
 return files;
}
export function validateNativeContent(content,profile){
 if(profile.framePacing==='display')throw Error('네이티브 실행기는 목표 FPS 동기화를 사용해요. 화면 주사율 동기화는 추가 연결이 필요해요.');
 if(profile.kiosk?.enabled)throw Error('네이티브 키오스크 입력·전체화면 연결을 먼저 구현해야 해요. 일반 PC 게임으로 빌드하거나 브라우저 호환 실행기를 선택하세요.');
 for(const[name,bytes]of content){if(/\.(?:mp4|webm)$/i.test(name))throw Error('네이티브 영상 디코더가 필요해요: '+name);if(!/\.json$/i.test(name)||!Buffer.isBuffer(bytes))continue;let data;try{data=JSON.parse(bytes);}catch{continue;}const components=[...data.components||[],...(data.objects||[]).flatMap(o=>o.components||[])];if(data.streaming===true&&assetKind(name)==='audioasset'||components.some(c=>c.type==='AudioSource'&&c.properties?.streaming))throw Error('네이티브 스트리밍 오디오 디코더가 필요해요: '+name);if(components.some(c=>c.type==='UIWidget'&&c.properties?.space==='tracked'))throw Error('네이티브 월드 추적 UI 실행 연결이 필요해요: '+name);if(assetKind(name)==='widget'&&data.nodes?.some(n=>['ListView','TreeView'].includes(n.type)))throw Error('네이티브 목록 UI 실행 연결이 필요해요: '+name);}
}
export async function buildNativeGame(record,profile,{content,natives,report},{signal,onProgress=()=>{},dryRun=false}={}){
 validateNativeContent(content,profile);if(dryRun)return report;if(process.platform!=='win32'||process.arch!=='x64')throw Error('Windows x64에서 네이티브 게임을 빌드하세요.');
 const desktop=await fs.access(path.join(root,'HBNativePlayer.exe')).then(()=>root,()=>path.join(root,'dist/HBEngine')),player=path.join(desktop,'HBNativePlayer.exe');await fs.access(player);
 const id=new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomUUID().slice(0,8),out=await record.project.resolve('Builds/'+profile.id+'/'+id,true,false);await fs.mkdir(out,{recursive:true});const canonical=await fs.realpath(out),rel=path.relative(record.root,canonical);if(rel.startsWith('..')||path.isAbsolute(rel))throw Error('네이티브 빌드 경로 오류');
 const artifacts=[],copied=new Set(),host=new NativeHost(),write=async(name,bytes)=>{signal?.throwIfAborted();artifacts.push(await writeBuildContent(out,name,bytes,{signal}));copied.add(name);},copy=async(from,to)=>{if(!copied.has(to))await write(to,await packagedRuntimeContent(from,{signal}));};
 try{
  const nativeModules=[];onProgress('C++ 빌드');for(const[signature,item]of natives){const built=await host.build(item.header,item.source,{configuration:profile.configuration,signal,files:item.files,headerPath:item.headerPath,sourcePath:item.sourcePath}),binary='Binaries/'+signature+'.exe';await copy(host.sessions.get(built.token).binary,binary);nativeModules.push({signature,binary,metadata:built.metadata,headerPath:item.headerPath,sourcePath:item.sourcePath});}
  onProgress('네이티브 콘텐츠 구성');for(const[name,bytes]of content)await write('Content/'+name,bytes);for(const file of await nativeRuntimeFiles())await copy(file,path.relative(root,file).split(path.sep).join('/'));await write('package.json',Buffer.from('{"type":"module"}\n'));
  for(const entry of await fs.readdir(path.join(desktop,'Shaders'),{withFileTypes:true}))if(entry.isFile()&&entry.name!=='.hb-shader-cache-lock')await copy(path.join(desktop,'Shaders',entry.name),'Shaders/'+entry.name);
  const windowsApplication=windowsGameIdentity(record.manifest.id),scriptRuntime='runtime/HBScript_'+record.manifest.id.replaceAll('-','')+'.exe';await copy(player,windowsApplication.executable);await copy(path.join(desktop,'runtime/node.exe'),scriptRuntime);
  for(const executable of [windowsApplication.executable,scriptRuntime]){await promisify(execFile)(player,['--stamp-game',path.join(out,executable),profile.productName],{windowsHide:true,signal,timeout:30000});const bytes=await fs.readFile(path.join(out,executable));Object.assign(artifacts.find(f=>f.path===executable),{bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
  // Retain exact runtime dependency notices, including Skia and Rust audio notices.
  const licenses=async relative=>{for(const entry of await fs.readdir(path.join(desktop,relative),{withFileTypes:true})){if(entry.name.includes('WebView'))continue;if(entry.isSymbolicLink())throw Error('라이선스 심볼릭 링크');if(entry.isDirectory())await licenses(relative+'/'+entry.name);else await copy(path.join(desktop,relative,entry.name),relative+'/'+entry.name);}};await licenses('licenses');
  let redirects={};try{redirects=JSON.parse(await fs.readFile(await record.project.resolve('.hbredirects.json',true,false),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
  const manifest={version:1,id:record.manifest.id,name:profile.productName,configuration:profile.configuration,windowsRuntime:'native',windowsRenderer:'d3d11',windowsApplication,scriptRuntime,width:profile.width,height:profile.height,...frameSettings(profile),startupScene:report.startupScene,startupBlueprint:record.manifest.startupBlueprint,gameInstance:report.gameInstance||'',distanceFields:report.distanceFields?.manifest||'',entries:[...content.keys()].map(p=>({path:p,name:path.basename(p),kind:assetKind(p)})),nativeModules,redirects,files:artifacts};
  const result={...report,id,output:out,executable:path.join(out,windowsApplication.executable),windowsApplication,totalFiles:artifacts.length,totalBytes:artifacts.reduce((n,f)=>n+f.bytes,0),windowsRuntime:'native',browserProcesses:0};await fs.writeFile(path.join(out,'game.hbpack.json'),json(manifest),{flag:'wx'});await fs.writeFile(path.join(out,'build-report.json'),json(result),{flag:'wx'});onProgress('완료');return result;
 }catch(error){await fs.writeFile(path.join(out,'build-failed.json'),json({error:error.message}));throw error;}finally{host.close();}
}
