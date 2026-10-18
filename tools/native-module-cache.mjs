import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {assertNativeNoLinks,nativeAtomicJSON,nativeProcessAlive,nativeTreeSize,removeNativeTree,withNativeCacheLock} from './native-cache-lock.mjs';

const digest=value=>createHash('sha256').update(path.resolve(value).toLowerCase()).digest('hex').slice(0,20);
const keyPattern=/^[a-f0-9]{20}$/;
const readJSON=async file=>{try{return JSON.parse(await fs.readFile(file,'utf8'));}catch(error){if(error.code==='ENOENT')return null;throw error;}};
const rootFormat='hb-native-modules-1',ownerFormat='hb-native-owner-1',managedOwnerFormat='hb-native-owner-2',entryFormat='hb-native-entry-1',leaseFormat='hb-native-lease-1';
const samePath=(a,b)=>path.resolve(a).toLowerCase()===path.resolve(b).toLowerCase();
const semanticFormat='hb-native-semantic-index-1',artifactFormat='hb-native-artifact-1';
function validOwner(owner,id,modules){return owner&&typeof owner.engineRoot==='string'&&owner.owner===id&&digest(owner.engineRoot)===id&&(owner.format===ownerFormat||owner.format===managedOwnerFormat&&owner.scope==='managed-installation'&&samePath(path.join(owner.engineRoot,'Cache/NativeModules'),modules));}
async function ownerInstalled(owner){
 if(owner.format===ownerFormat)return !!(await fs.stat(path.join(owner.engineRoot,'HBEngine.install.json')).catch(error=>error.code==='ENOENT'?null:Promise.reject(error)))?.isFile();
 const versions=path.join(owner.engineRoot,'Versions');await assertNativeNoLinks(versions);
 for(const entry of await fs.readdir(versions,{withFileTypes:true}).catch(error=>error.code==='ENOENT'?[]:Promise.reject(error)))if(entry.isDirectory()&&!entry.isSymbolicLink()){
  const file=path.join(versions,entry.name,'HBEngine.install.json'),stat=await fs.lstat(file).catch(error=>error.code==='ENOENT'?null:Promise.reject(error));if(stat?.isFile()&&!stat.isSymbolicLink())return true;
 }
 return false;
}
export const nativeModuleCacheContract=Object.freeze({version:2,recentEntries:32,ownerScopes:Object.freeze(['version','managed-installation']),semanticIndex:Object.freeze({format:'hb-native-semantic-index-1',entries:32,semanticBits:256,physicalBits:80,publication:'complete artifact and lease before metadata publication; existing complete artifact wins'}),liveReferences:'process lease',inFlightBuilds:'referenced before cache access',retiredVersions:'legacy owners retire; managed owner follows installation lifetime',failedAttempts:'remove unpublished candidates',debuggerSources:'retained compiler cwd with complete SDK inputs; Windows full-g DWARF4',fallback:'unsupported/custom toolchain or dependencies use version-bound cache',frameFileIO:0});

// Installed SDK modules are mutable data, outside immutable Versions. References
// are published before reading a binary; no filesystem work occurs in frame RPC.
export class NativeModuleCache {
 constructor(paths){this.paths=paths;this.root=paths.modules;this.ownerRoot=path.resolve(paths.moduleOwnerRoot||paths.root);this.managed=!!paths.moduleOwnerRoot;if(this.managed&&(path.basename(path.dirname(paths.root)).toLowerCase()!=='versions'||!samePath(path.dirname(path.dirname(paths.root)),this.ownerRoot)||!samePath(path.join(this.ownerRoot,'Cache/NativeModules'),this.root)))throw Error('C++ 설치 공용 캐시 범위를 확인하세요.');this.owner=digest(this.ownerRoot);this.directory=path.join(this.root,this.owner);this.references=new Map();this.lease=path.join(this.root,'.leases',process.pid+'-'+randomUUID()+'.json');this.pending=Promise.resolve();}
 async initialize(){
  await assertNativeNoLinks(this.root);await fs.mkdir(this.root,{recursive:true});await assertNativeNoLinks(this.root);
  return withNativeCacheLock(this.root,async()=>{
   const file=path.join(this.root,'.hb-native-cache.json'),marker=await readJSON(file);
   if(marker&&(marker.format!==rootFormat||marker.root!==path.resolve(this.root).toLowerCase()))throw Error('C++ 공용 캐시 표식을 확인하세요.');
   if(!marker)await nativeAtomicJSON(file,{format:rootFormat,root:path.resolve(this.root).toLowerCase()});
   await fs.mkdir(path.join(this.root,'.leases'),{recursive:true});await assertNativeNoLinks(path.join(this.root,'.leases'));
  });
 }
 serialize(fn){const job=this.pending.then(fn);this.pending=job.catch(()=>{});return job;}
 async pinLocked(key){const count=this.references.get(key)||0;this.references.set(key,count+1);try{await this.publishReferences();}catch(error){if(count)this.references.set(key,count);else this.references.delete(key);throw error;}}
 releaseKey(key){let released=false;return ()=>{if(released)return Promise.resolve();released=true;return this.serialize(()=>withNativeCacheLock(this.root,async()=>{const count=this.references.get(key)||0;if(count>1)this.references.set(key,count-1);else this.references.delete(key);await this.publishReferences();}));};}
 async semanticIndex(){
  const ownerFile=path.join(this.directory,'.owner.json');await assertNativeNoLinks(ownerFile);const owner=await readJSON(ownerFile);if(!owner)return [];if(!validOwner(owner,this.owner,this.root)||owner.format!==(this.managed?managedOwnerFormat:ownerFormat)||!samePath(owner.engineRoot,this.ownerRoot))throw Error('C++ 코드 색인의 소유 경로를 확인하세요.');
  const file=path.join(this.directory,'.semantic-index.json');await assertNativeNoLinks(file);const stat=await fs.stat(file).catch(error=>error.code==='ENOENT'?null:Promise.reject(error));if(!stat||stat.size>65536)return [];
  let data;try{data=await readJSON(file);}catch(error){if(error instanceof SyntaxError)return [];throw error;}
  if(data?.format!==semanticFormat||data.owner!==this.owner||!Array.isArray(data.entries))return [];
  return data.entries.slice(0,32).filter(row=>/^[a-f0-9]{64}$/.test(row?.semantic)&&keyPattern.test(row?.physical));
 }
 async semanticArtifact(physical,semantic){
  const dir=path.join(this.directory,physical);await assertNativeNoLinks(dir);const markerFile=path.join(dir,'.entry.json');await assertNativeNoLinks(markerFile);const marker=await readJSON(markerFile);if(marker?.format!==entryFormat||marker.owner!==this.owner||marker.key!==physical)return null;
  const artifactFile=path.join(dir,'.artifact.json');await assertNativeNoLinks(artifactFile);let artifact;try{artifact=await readJSON(artifactFile);}catch(error){if(error instanceof SyntaxError)return null;throw error;}if(artifact?.format!==artifactFormat||artifact.semantic!==semantic)return null;
  const binary=path.join(dir,process.platform==='win32'?'worker.exe':'worker');await assertNativeNoLinks(binary);const stat=await fs.lstat(binary).catch(error=>error.code==='ENOENT'?null:Promise.reject(error));return stat?.isFile()&&stat.size>0?binary:null;
 }
 async acquireSemantic(semantic){
  if(!/^[a-f0-9]{64}$/.test(semantic))throw Error('C++ 코드 지문을 확인하세요.');await this.initialize();
  const found=await this.serialize(()=>withNativeCacheLock(this.root,async()=>{const row=(await this.semanticIndex()).find(row=>row.semantic===semantic);if(!row)return null;const binary=await this.semanticArtifact(row.physical,semantic);if(!binary)return null;await this.pinLocked(row.physical);return {key:row.physical,binary};}));
  return found?{...found,release:this.releaseKey(found.key)}:null;
 }
 async publishSemantic(semantic,physical){
  if(!/^[a-f0-9]{64}$/.test(semantic)||!keyPattern.test(physical))throw Error('C++ 코드 지문·저장 키를 확인하세요.');
  const selected=await this.serialize(()=>withNativeCacheLock(this.root,async()=>{
   if(!this.references.has(physical)||!await this.semanticArtifact(physical,semantic))throw Error('완성된 C++ 모듈 참조를 먼저 확보하세요.');
   const rows=await this.semanticIndex(),old=rows.find(row=>row.semantic===semantic),existing=old&&await this.semanticArtifact(old.physical,semantic),key=existing?old.physical:physical;
   if(key!==physical)await this.pinLocked(key);
   try{await nativeAtomicJSON(path.join(this.directory,'.semantic-index.json'),{format:semanticFormat,owner:this.owner,entries:[{semantic,physical:key},...rows.filter(row=>row.semantic!==semantic)].slice(0,32)});}catch(error){if(key!==physical){const count=this.references.get(key)||0;if(count>1)this.references.set(key,count-1);else this.references.delete(key);await this.publishReferences();}throw error;}
   return {key,binary:existing||path.join(this.directory,key,process.platform==='win32'?'worker.exe':'worker'),won:key===physical};
  }));
  return selected.won?selected:{...selected,release:this.releaseKey(selected.key)};
 }
 inspect(){return {contract:nativeModuleCacheContract,root:this.root,owner:this.owner,ownerScope:this.managed?'managed-installation':'version',referencedEntries:this.references.size,references:[...this.references.values()].reduce((sum,n)=>sum+n,0)};}
 async publishReferences(){if(this.references.size)await nativeAtomicJSON(this.lease,{format:leaseFormat,pid:process.pid,owner:this.owner,keys:[...this.references.keys()]});else await fs.unlink(this.lease).catch(error=>{if(error.code!=='ENOENT')throw error;});}
 async retain(key){
  if(!keyPattern.test(key))throw Error('C++ 모듈 캐시 키를 확인하세요.');await this.initialize();
  await this.serialize(()=>withNativeCacheLock(this.root,async()=>{
   await fs.mkdir(this.directory,{recursive:true});await assertNativeNoLinks(this.directory);
   const ownerFile=path.join(this.directory,'.owner.json'),owner=await readJSON(ownerFile);
   const format=this.managed?managedOwnerFormat:ownerFormat;
   if(owner&&(!validOwner(owner,this.owner,this.root)||owner.format!==format||!samePath(owner.engineRoot,this.ownerRoot)))throw Error('C++ 캐시 설치 경로를 확인하세요.');
   if(!owner)await nativeAtomicJSON(ownerFile,{format,owner:this.owner,engineRoot:this.ownerRoot,...(this.managed?{scope:'managed-installation'}:{})});
   const directory=path.join(this.directory,key);await fs.mkdir(directory,{recursive:true});await assertNativeNoLinks(directory);
   const markerFile=path.join(directory,'.entry.json'),marker=await readJSON(markerFile);
   if(marker&&(marker.format!==entryFormat||marker.owner!==this.owner||marker.key!==key))throw Error('C++ 모듈 캐시 표식을 확인하세요.');
   if(!marker)await nativeAtomicJSON(markerFile,{format:entryFormat,owner:this.owner,key});
   await this.pinLocked(key);
  }));
  return this.releaseKey(key);
 }
 async prune(){await this.initialize();return pruneNativeModuleCache(this.root);}
 async discardUnpublished(key){
  if(!keyPattern.test(key))throw Error('C++ 임시 모듈 키를 확인하세요.');
  const retired=await this.serialize(()=>withNativeCacheLock(this.root,async()=>{
   if(this.references.has(key))throw Error('C++ 임시 참조를 먼저 해제하세요.');
   const rows=await this.semanticIndex();for(const row of rows.filter(row=>row.physical===key))if(await this.semanticArtifact(key,row.semantic))return null;
   const directory=path.join(this.directory,key);await assertNativeNoLinks(directory);const marker=await readJSON(path.join(directory,'.entry.json'));
   if(!marker)return null;if(marker.format!==entryFormat||marker.owner!==this.owner||marker.key!==key)throw Error('C++ 임시 모듈 표식을 확인하세요.');
   // Random physical keys are never shared before semantic publication. Reject
   // any unexpected cross-process lease instead of deleting another builder.
   for(const name of await fs.readdir(path.join(this.root,'.leases'))){const lease=await readJSON(path.join(this.root,'.leases',name));if(lease?.owner===this.owner&&lease.keys?.includes(key)&&nativeProcessAlive(lease.pid))return null;}
   if(rows.some(row=>row.physical===key))await nativeAtomicJSON(path.join(this.directory,'.semantic-index.json'),{format:semanticFormat,owner:this.owner,entries:rows.filter(row=>row.physical!==key)});
   const target=path.join(this.root,'.retired-'+randomUUID());await fs.rename(directory,target);return target;
  }));
  if(retired)await removeNativeTree(this.root,retired);
 }
}

async function runningEntries(root,entries){
 if(!entries.length)return new Set();if(process.platform!=='win32')return null;
 // Only matching cache identities leave PowerShell; unrelated command lines and
 // process arguments are never returned to reports or logs.
 const script=String.raw`$ErrorActionPreference="Stop";$rows=ConvertFrom-Json $env:HB_NATIVE_CACHE_CANDIDATES;$processes=@(Get-CimInstance Win32_Process);$hits=@();foreach($row in $rows){foreach($p in $processes){$exe=([string]$p.ExecutablePath).Replace("/","\").ToLowerInvariant();$cmd=([string]$p.CommandLine).Replace("/","\").ToLowerInvariant();if(($exe -and $exe.StartsWith($row.path+"\")) -or ($cmd -and ($cmd.Contains($row.path) -or $cmd.Contains($row.pair)))){$hits+=$row.id;break}}};ConvertTo-Json -InputObject @($hits) -Compress`;
 const rows=entries.map(e=>({id:e.id,path:e.directory.replaceAll('/','\\').toLowerCase(),pair:(e.owner+'\\'+e.key).toLowerCase()}));
 try{const {stdout}=await promisify(execFile)('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{windowsHide:true,timeout:10000,maxBuffer:1048576,env:{...process.env,HB_NATIVE_CACHE_CANDIDATES:JSON.stringify(rows)}});return new Set(JSON.parse(stdout.replace(/^\uFEFF/,'')));}catch{return null;}
}

export async function pruneNativeModuleCache(root){
 root=path.resolve(root);await assertNativeNoLinks(root);const marker=await readJSON(path.join(root,'.hb-native-cache.json'));
 if(!marker)return {deleted:0,bytes:0,receipt:null};if(marker.format!==rootFormat||marker.root!==root.toLowerCase())throw Error('C++ 캐시 정리 표식을 확인하세요.');
 const retired=[];const selection=await withNativeCacheLock(root,async()=>{
  const protectedEntries=new Set(),leases=path.join(root,'.leases');await assertNativeNoLinks(leases);
  for(const name of await fs.readdir(leases)){
   if(!/^\d+-[a-f0-9-]{36}\.json$/.test(name))continue;const file=path.join(leases,name);await assertNativeNoLinks(file);const lease=await readJSON(file);
   if(!lease||lease.format!==leaseFormat||!keyPattern.test(lease.owner)||!Array.isArray(lease.keys)||!lease.keys.every(key=>keyPattern.test(key)))throw Error('C++ 캐시 참조 표식을 확인하세요.');
   if(nativeProcessAlive(lease.pid)){for(const key of lease.keys)protectedEntries.add(lease.owner+'/'+key);}else await fs.unlink(file);
  }
  const entries=[],interrupted=[];
  for(const item of await fs.readdir(root,{withFileTypes:true})){
   if(item.isDirectory()&&!item.isSymbolicLink()&&/^\.retired-[a-f0-9-]{36}$/.test(item.name)){const directory=path.join(root,item.name),entry=await readJSON(path.join(directory,'.entry.json'));if(entry?.format===entryFormat&&keyPattern.test(entry.owner)&&keyPattern.test(entry.key))interrupted.push({owner:entry.owner,key:entry.key,id:entry.owner+'/'+entry.key,directory,interrupted:true});continue;}
   if(!item.isDirectory()||item.isSymbolicLink()||!keyPattern.test(item.name))continue;const ownerDirectory=path.join(root,item.name),owner=await readJSON(path.join(ownerDirectory,'.owner.json'));
   if(!validOwner(owner,item.name,root))continue;
   const orphan=!(await ownerInstalled(owner));
   for(const child of await fs.readdir(ownerDirectory,{withFileTypes:true})){
    if(!child.isDirectory()||child.isSymbolicLink()||!keyPattern.test(child.name))continue;const directory=path.join(ownerDirectory,child.name),entry=await readJSON(path.join(directory,'.entry.json'));
    if(!entry||entry.format!==entryFormat||entry.owner!==item.name||entry.key!==child.name)continue;
    const binary=path.join(directory,process.platform==='win32'?'worker.exe':'worker'),stat=await fs.stat(binary).catch(error=>error.code==='ENOENT'?fs.stat(directory):Promise.reject(error));
    entries.push({owner:item.name,key:child.name,id:item.name+'/'+child.name,directory,time:stat.mtimeMs,orphan});
   }
  }
  entries.sort((a,b)=>b.time-a.time);const latest=new Set(entries.filter(e=>!e.orphan).slice(0,32).map(e=>e.id)),candidates=[...entries.filter(e=>!latest.has(e.id)),...interrupted].filter(e=>!protectedEntries.has(e.id)),running=await runningEntries(root,candidates);
  if(running===null)return {deleted:0,bytes:0,receipt:null,skipped:'실행 중인 모듈 확인 보류'};
  for(const entry of candidates){if(running.has(entry.id))continue;await assertNativeNoLinks(entry.directory);const size=await nativeTreeSize(entry.directory),target=entry.interrupted?entry.directory:path.join(root,'.retired-'+randomUUID());if(!entry.interrupted)await fs.rename(entry.directory,target);retired.push({...entry,target,...size});}
  // Empty owner directories are metadata, removed only after their entries move.
  for(const name of new Set(retired.map(e=>e.owner))){const directory=path.join(root,name),files=await fs.readdir(directory).catch(error=>error.code==='ENOENT'?[]:Promise.reject(error));if(files.length===1&&files[0]==='.owner.json'){await fs.unlink(path.join(directory,'.owner.json'));await fs.rmdir(directory);}}
  return {deleted:retired.length,bytes:retired.reduce((sum,e)=>sum+e.bytes,0),receipt:null,entries:retired.map(e=>e.id),running:[...running]};
 },{wait:false});
 for(const entry of retired)await removeNativeTree(root,entry.target);
 return selection;
}
