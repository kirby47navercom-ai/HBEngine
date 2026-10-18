import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {writeNativeProject} from './native-project.mjs';
import {writeNativeSDKSnapshot} from './native-sdk-snapshot.mjs';
import {assertNativeNoLinks,nativeAtomicJSON,nativePathInside,nativeProcessAlive,removeNativeTree,withNativeCacheLock} from './native-cache-lock.mjs';

const format='hb-native-sdk-plans-3',maximumBytes=2097152;
export const nativeSDKPlanContract=Object.freeze({version:1,entries:32,maximumBytes,dependencyDiscovery:'GCC -E -P -MD; include list plus preprocessed decisions, matching each unit optimization',debugFormat:'Windows editor/development use full -g with DWARF4; other targets unchanged',fallback:'full SDK fingerprint',frameFileIO:0});
export const nativeSourceOptimization=configuration=>[...(configuration==='editor'?['-O0','-g']:configuration==='development'?['-Og','-g']:['-O2']),...(process.platform==='win32'&&configuration!=='release'?['-gdwarf-4']:[])];
const digest=value=>createHash('sha256').update(value).digest('hex'),canonical=file=>process.platform==='win32'?path.resolve(file).toLowerCase():path.resolve(file);
const fileStamp=stat=>JSON.stringify([stat.size,stat.mtimeMs,stat.ctimeMs,stat.birthtimeMs,String(stat.ino)]);
async function externalUnchanged(rows){if(!Array.isArray(rows))return false;for(const row of rows){if(typeof row?.file!=='string'||!path.isAbsolute(row.file)||typeof row.stamp!=='string')return false;const stat=await fs.lstat(row.file).catch(error=>error.code==='ENOENT'?null:Promise.reject(error));if(!stat?.isFile()||stat.isSymbolicLink()||fileStamp(stat)!==row.stamp)return false;}return true;}

// The target is ours; filenames use Make escaping, not shell quoting.
export function nativeMakeDependencies(text){
  text=text.replace(/\\\r?\n/g,'');const match=/^hb_native_dependencies:\s*([^]*?)\s*$/.exec(text);
  if(!match)throw Error('C++ 의존 파일 목록 형식을 확인하세요.');
  const files=[];let token='';const flush=()=>{if(token){files.push(token);token='';}};
  for(let i=0;i<match[1].length;i++){
    const c=match[1][i],next=match[1][i+1];
    if(c==='\\'&&next&&/[\s\\#]/.test(next)){token+=next;i++;}
    else if(c==='$'){if(next!=='$')throw Error('C++ 의존 파일 목록의 변수를 확인하세요.');token+='$';i++;}
    else if(c==='\r'||c==='\n'||c==='#')throw Error('C++ 의존 파일 목록의 줄을 확인하세요.');
    else if(/\s/.test(c))flush();else token+=c;
  }
  flush();if(!files.length)throw Error('C++ 의존 파일 목록이 비어 있어요.');return files;
}

function selectedSDK(snapshot,names,preprocessed){
  const wanted=new Set(names),entries=snapshot.entries.filter(entry=>wanted.has(entry.name));
  if(!entries.length||entries.length!==wanted.size)return null;
  const hash=createHash('sha256').update('hb-native-used-sdk-v2\0'+preprocessed+'\0');let bytes=0;
  for(const entry of entries){hash.update(JSON.stringify([entry.name,entry.size,entry.digest])+'\n');bytes+=entry.size;}
  return {fingerprint:hash.digest('hex'),preprocessedFingerprint:preprocessed,files:entries.length,bytes};
}
async function readPlans(directory){
  const file=path.join(directory,'index.json');await assertNativeNoLinks(file);
  try{const stat=await fs.stat(file);if(stat.size>maximumBytes)return [];const value=JSON.parse(await fs.readFile(file,'utf8'));return value?.format===format&&Array.isArray(value.entries)?value.entries.filter(row=>/^[a-f0-9]{64}$/.test(row?.key)&&/^[a-f0-9]{64}$/.test(row?.sdk)&&/^[a-f0-9]{64}$/.test(row?.preprocessed)&&Array.isArray(row.names)&&row.names.length<=4096&&row.names.every(name=>typeof name==='string'&&name.length<4096)):[];}
  catch(error){if(error.code==='ENOENT'||error instanceof SyntaxError)return [];throw error;}
}
async function savePlan(directory,plan){
  await withNativeCacheLock(directory,async()=>{
    const entries=[plan,...(await readPlans(directory)).filter(row=>row.key!==plan.key)].slice(0,nativeSDKPlanContract.entries);
    while(Buffer.byteLength(JSON.stringify({format,entries}))>maximumBytes&&entries.length)entries.pop();
    await nativeAtomicJSON(path.join(directory,'index.json'),{format,entries});
  });
}
async function removeInterruptedScans(directory){
  const retired=await withNativeCacheLock(directory,async()=>{
    const paths=[];
    for(const entry of await fs.readdir(directory,{withFileTypes:true})){
      const match=/^scan-(\d+)-[a-zA-Z0-9]{6}$/.exec(entry.name),retired=/^\.retired-scan-[a-f0-9-]{36}$/.test(entry.name);if(!entry.isDirectory()||entry.isSymbolicLink()||(!match&&!retired)||(match&&nativeProcessAlive(+match[1])))continue;
      const scan=path.join(directory,entry.name);await assertNativeNoLinks(scan);const marker=path.join(scan,'.scan.json');await assertNativeNoLinks(marker);
      let owner;try{owner=JSON.parse(await fs.readFile(marker,'utf8'));}catch(error){if(error.code==='ENOENT'){await fs.rmdir(scan).catch(e=>{if(!['ENOENT','ENOTEMPTY'].includes(e.code))throw e;});continue;}if(error instanceof SyntaxError)continue;throw error;}
      if(owner?.format!=='hb-native-sdk-scan-1'||!Number.isSafeInteger(owner.pid)||owner.pid<1||(match&&owner.pid!==+match[1])||nativeProcessAlive(owner.pid))continue;
      const target=retired?scan:path.join(directory,'.retired-scan-'+randomUUID());if(!retired)await fs.rename(scan,target);paths.push(target);
    }
    return paths;
  });
  for(const scan of retired)await removeNativeTree(directory,scan);
}

export async function nativeSDKPlan({root,directory,snapshot,sourceKey,generated,compiler,env,configuration,compile,signal,workspaceFactory,toolchainFingerprint='',forceScan=false}){
  signal.throwIfAborted();
  let identity=digest(JSON.stringify([compiler,...['CPATH','CPLUS_INCLUDE_PATH','C_INCLUDE_PATH','OBJC_INCLUDE_PATH','GCC_EXEC_PREFIX','COMPILER_PATH','DEPENDENCIES_OUTPUT','SUNPRO_DEPENDENCIES'].map(name=>env[name]||'')]));
  const fallback=reason=>({fingerprint:snapshot.fingerprint,identity,files:snapshot.files,bytes:snapshot.bytes,mode:'full',planHit:false,scanMS:0,reason});
  // Keep unsupported/custom toolchains on the previous conservative path.
  if(!path.isAbsolute(compiler)||['CPATH','CPLUS_INCLUDE_PATH','C_INCLUDE_PATH','OBJC_INCLUDE_PATH','GCC_EXEC_PREFIX','COMPILER_PATH','DEPENDENCIES_OUTPUT','SUNPRO_DEPENDENCIES'].some(name=>env[name]))return fallback('custom-toolchain');
  let compilerFile,compilerHash;
  try{compilerFile=await fs.realpath(compiler);compilerHash=digest(await fs.readFile(compilerFile));}catch{return fallback('compiler-identity');}
  identity=digest(identity+compilerHash);signal.throwIfAborted();
  const key=digest(JSON.stringify([sourceKey,canonical(root),compilerHash,configuration,nativeSourceOptimization(configuration),workspaceFactory?'retained-sdk-v1':'original-sdk-v1',toolchainFingerprint]));
  await assertNativeNoLinks(directory);await fs.mkdir(directory,{recursive:true});await assertNativeNoLinks(directory);
  const old=(await readPlans(directory)).find(row=>row.key===key&&row.sdk===snapshot.fingerprint),cached=old&&selectedSDK(snapshot,old.names,old.preprocessed);
  if(!forceScan&&cached&&(!workspaceFactory||await externalUnchanged(old.external)))return {...cached,identity,mode:'dependencies',planHit:true,scanMS:0};
  await removeInterruptedScans(directory);
  const started=performance.now(),workspace=workspaceFactory?await workspaceFactory():null,scan=workspace?.directory||await fs.mkdtemp(path.join(directory,'scan-'+process.pid+'-'));let names,preprocessed,layout,complete=false;const external=new Map();
  try{
    await fs.writeFile(path.join(scan,'.scan.json'),JSON.stringify({format:'hb-native-sdk-scan-1',pid:process.pid}),{flag:'wx'});
    layout=await writeNativeProject(scan,generated);if(workspace)await writeNativeSDKSnapshot(scan,snapshot,{signal});const common=workspace?['-std=c++17','-pipe','-I','SDK/include','-I','SDK/dependency',...layout.includeDirectories.flatMap(dir=>['-I',dir])]:['-std=c++17','-pipe','-I','native/include','-I',path.relative(root,path.dirname(path.dirname(snapshot.entries.find(entry=>entry.name==='dependency/nlohmann/json.hpp').file))),...layout.includeDirectories.flatMap(dir=>['-I',path.relative(root,path.join(scan,dir))])];
    const known=new Map(snapshot.entries.map(entry=>[canonical(workspace?path.join(scan,'SDK',entry.name):entry.file),entry.name])),used=new Set(),toolchain=path.dirname(path.dirname(compilerFile)),decisions=createHash('sha256');
    const prefixes=[scan,path.relative(root,scan)].flatMap(prefix=>[prefix,prefix.replaceAll('\\','/'),prefix.replaceAll('\\','\\\\')]).sort((a,b)=>b.length-a.length);
    for(const [index,source] of ['worker.cpp',...layout.sources].entries()){
      signal.throwIfAborted();const depfile=path.join(scan,'unit-'+index+'.d'),unit=path.join(scan,'unit-'+index+'.ii');
      const from=workspace?scan:root;await compile([...common,...(index?nativeSourceOptimization(configuration):['-O2']),'-E','-P','-MD','-MT','hb_native_dependencies','-MF',path.relative(from,depfile),path.relative(from,path.join(scan,source)),'-o',path.relative(from,unit)],workspace?{cwd:scan}:undefined);
      const stat=await fs.stat(depfile);if(stat.size>maximumBytes)throw Error('C++ 의존 파일 목록 크기 초과');
      for(const name of nativeMakeDependencies(await fs.readFile(depfile,'utf8'))){
        const file=path.resolve(workspace?scan:root,name),label=known.get(canonical(file));
        if(label)used.add(label);
        else if(!nativePathInside(scan,file)){if(!nativePathInside(toolchain,file))throw Error('SDK 밖의 C++ 의존 파일');if(workspace)external.set(file,{file,stamp:fileStamp(await fs.stat(file))});}
      }
      if((await fs.stat(unit)).size>33554432)throw Error('C++ 전처리 결과 크기 초과');
      let text=await fs.readFile(unit,'utf8');for(const prefix of prefixes)text=text.replaceAll(prefix,'<hb-generated>');
      decisions.update(JSON.stringify([source,digest(text)])+'\n');await fs.unlink(unit);await fs.unlink(depfile);
    }
    names=[...used].sort();preprocessed=decisions.digest('hex');if(!selectedSDK(snapshot,names,preprocessed))throw Error('C++ SDK 의존 파일 확인 실패');complete=true;
  }catch(error){signal.throwIfAborted();return {...fallback('dependency-discovery'),scanMS:performance.now()-started};}
  finally{if(workspace){if(!complete)await workspace.abandon();}else await removeNativeTree(directory,scan);}
  try{await savePlan(directory,{key,sdk:snapshot.fingerprint,names,preprocessed,...(workspace?{external:[...external.values()]}:{})});signal.throwIfAborted();}catch(error){if(workspace)await workspace.abandon();throw error;}
  return {...selectedSDK(snapshot,names,preprocessed),identity,mode:'dependencies',planHit:false,scanMS:performance.now()-started,...(workspace?{workspace:{...workspace,layout}}:{})};
}
