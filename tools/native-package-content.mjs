import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {openGameResources} from './game-resource-archive.mjs';
import {resolveBuildPath} from '../prototype/build-profile.js';

// Read-only assets share the same confinement in the game and UI worker.
export async function openNativeContent(directory){
 const root=await fs.realpath(directory),manifest=JSON.parse(await fs.readFile(path.join(root,'game.hbpack.json'),'utf8'));
 if(manifest.version!==1||manifest.windowsRuntime!=='native'||!Array.isArray(manifest.entries))throw Error('네이티브 게임 패키지 형식을 확인하세요.');
 const entries=new Map(manifest.entries.map(row=>[row.path,row]));
 const confined=async(relative,base=root)=>{const file=await fs.realpath(path.resolve(base,relative)),rel=path.relative(base,file);if(!rel||rel.startsWith('..')||path.isAbsolute(rel))throw Error('패키지 밖의 파일은 읽을 수 없어요.');return file;};
 const archive=manifest.contentArchive?await openGameResources(await confined(manifest.contentArchive.path)):null;
 const contentRoot=archive?null:await confined('Content');
 const checkedName=name=>{name=resolveBuildPath(name,manifest.redirects);if(!entries.has(name)||archive&&!archive.entries.has(name))throw Object.assign(Error('패키지 에셋이 없어요: '+name),{code:'ENOENT'});return name;};
 const readBytes=async(name,options)=>{name=checkedName(name);return archive?archive.read(name,options):fs.readFile(await confined(name,contentRoot),options);};
 const resolve=async name=>{name=checkedName(name);if(archive)throw Error('묶음 에셋은 readBytes로 읽으세요.');return confined(name,contentRoot);};
 const stream=async(name,start,end)=>{
  name=checkedName(name);
  return archive?archive.stream(name,start,end):createReadStream(await confined(name,contentRoot),{start,end,highWaterMark:65536});
 };
 const project={resolve,read:async name=>{if(archive){name=checkedName(name);return {size:archive.entries.get(name).bytes,readBytes:options=>archive.read(name,options)};}const file=await resolve(name),stat=await fs.stat(file);if(!stat.isFile())throw Error('게임 에셋은 일반 파일이어야 해요.');return {file,size:stat.size};},files:async()=>[...entries.values()]};
 return {root,project,manifest,url:name=>'hbasset:'+encodeURIComponent(name),resolve,readBytes,stream,modulePath:confined,close:async()=>{await archive?.close();}};
}
