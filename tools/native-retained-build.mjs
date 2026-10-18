import fs from 'node:fs/promises';import path from 'node:path';import {createHash,randomUUID} from 'node:crypto';
import {nativeSDKPlan,nativeSourceOptimization} from './native-sdk-plan.mjs';
import {nativeToolchainIdentity} from './native-toolchain-identity.mjs';
import {nativeAtomicJSON} from './native-cache-lock.mjs';

// Semantic identity names code; a random physical entry owns the immutable
// compiler cwd, SDK inputs and debugger sources across installation updates.
export async function buildRetainedNative({root,directory,snapshot,sourceKey,generated,compiler,env,configuration,compile,signal,cache}){
 const toolchain=await nativeToolchainIdentity(compiler,{configuration,env,signal});if(!toolchain.supported)return null;
 let candidate,selected;
 const abandon=async()=>{if(!candidate)return;const old=candidate;candidate=null;await old.release();await cache.discardUnpublished(old.key);};
 const workspaceFactory=async()=>{
  const key=randomUUID().replaceAll('-','').slice(0,20),release=await cache.retain(key),entry=path.join(cache.directory,key);candidate={key,release,entry};
  const directory=path.join(entry,'compile-'+randomUUID());await fs.mkdir(directory);return {directory,abandon};
 };
 try{
  const plan=await nativeSDKPlan({root,directory,snapshot,sourceKey,generated,compiler,env,configuration,compile,signal,workspaceFactory,toolchainFingerprint:toolchain.fingerprint});
  if(plan.mode!=='dependencies'){await abandon();return null;}
  const {workspace,...sdkUsed}=plan,semantic=createHash('sha256').update(JSON.stringify(['hb-native-retained-1',sourceKey,plan.identity,plan.fingerprint,toolchain.fingerprint])).digest('hex'),hash=semantic.slice(0,20);
  selected=await cache.acquireSemantic(semantic);
  if(selected){await abandon();signal.throwIfAborted();return {binary:selected.binary,releaseCache:selected.release,hash,cacheHit:true,sdkUsed,cacheScope:'managed-installation'};}
  // A cached dependency plan can survive eviction of its executable. Recreate
  // the retained workspace without trusting an absent physical artifact.
  let retained=workspace;
  if(!retained){
   const rebuilt=await nativeSDKPlan({root,directory,snapshot,sourceKey,generated,compiler,env,configuration,compile,signal,workspaceFactory,toolchainFingerprint:toolchain.fingerprint,forceScan:true});
   if(!rebuilt.workspace){await abandon();throw Error('C++ 컴파일 작업 폴더를 복원하지 못했어요.');}retained=rebuilt.workspace;
   if(rebuilt.fingerprint!==plan.fingerprint)throw Error('C++ 입력이 빌드 중 바뀌었어요. 다시 빌드하세요.');
  }
  const cwd=retained.directory,objects=['worker.o',...retained.layout.sources.map((_,i)=>'source-'+i+'.o')],common=['-std=c++17','-pipe','-I','SDK/include','-I','SDK/dependency',...retained.layout.includeDirectories.flatMap(dir=>['-I',dir])],binary=path.join(candidate.entry,process.platform==='win32'?'worker.exe':'worker'),temporary=path.join(candidate.entry,'worker-'+randomUUID()+'.tmp.exe');
  try{
   await compile([...common,'-O2','-c','worker.cpp','-o',objects[0]],{cwd});
   for(const [i,source] of retained.layout.sources.entries())await compile([...common,...nativeSourceOptimization(configuration),'-c',source,'-o',objects[i+1]],{cwd});
   await compile([...objects,...(configuration==='editor'?[]:['-static']),...(configuration==='release'?['-s']:[]),'-o',path.relative(cwd,temporary)],{cwd});signal.throwIfAborted();
   await fs.rename(temporary,binary);await nativeAtomicJSON(path.join(candidate.entry,'.artifact.json'),{format:'hb-native-artifact-1',semantic,workspace:path.basename(cwd),sdk:snapshot.fingerprint,toolchain:toolchain.fingerprint});
  }finally{for(const file of [temporary,...objects.map(file=>path.join(cwd,file))])await fs.unlink(file).catch(error=>{if(error.code!=='ENOENT')throw error;});}
  selected=await cache.publishSemantic(semantic,candidate.key);
  if(!selected.won){await abandon();signal.throwIfAborted();return {binary:selected.binary,releaseCache:selected.release,hash,cacheHit:true,sdkUsed,cacheScope:'managed-installation'};}
  signal.throwIfAborted();const releaseCache=candidate.release;candidate=null;return {binary,releaseCache,hash,cacheHit:false,sdkUsed,cacheScope:'managed-installation'};
 }catch(error){await selected?.release?.();await abandon();throw error;}
}
