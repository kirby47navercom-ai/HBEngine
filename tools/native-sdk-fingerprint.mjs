import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';

// Build-time only. Include transitive/generated headers, not a hand-maintained
// subset. No process-wide memo: an SDK edit must invalidate the next build.
export async function nativeSDKFingerprint(directory,{dependencies=[],signal,inventory=false}={}){
  const files=[];
  async function visit(relative=''){
    signal?.throwIfAborted();
    const entries=await fs.readdir(path.join(directory,relative),{withFileTypes:true});
    for(const entry of entries.sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0)){
      const name=relative?relative+'/'+entry.name:entry.name,file=path.join(directory,name);
      if(entry.isSymbolicLink())throw Error('SDK 링크는 빌드 캐시에 사용할 수 없어요: '+name);
      if(entry.isDirectory())await visit(name);else if(entry.isFile())files.push({name:'include/'+name,file});
    }
  }
  await visit();
  for(const dependency of dependencies){if(!dependency.name||typeof dependency.name!=='string'||typeof dependency.file!=='string')throw Error('SDK 의존 파일을 확인하세요.');files.push({name:'dependency/'+dependency.name,file:dependency.file});}
  files.sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0);
  const hash=createHash('sha256').update('hb-native-sdk-v1\0'),entries=[];let bytes=0,previous;
  for(const {name,file} of files){
    signal?.throwIfAborted();if(name===previous)throw Error('중복 SDK 의존 파일: '+name);previous=name;
    const stat=await fs.lstat(file);if(!stat.isFile()||stat.isSymbolicLink())throw Error('SDK 일반 파일이 아니에요: '+name);
    const content=createHash('sha256');let size=0;
    for await(const chunk of createReadStream(file,{signal})){content.update(chunk);size+=chunk.length;}
    const digest=content.digest('hex');hash.update(JSON.stringify([name,size,digest])+'\n');bytes+=size;if(inventory)entries.push({name,file:path.resolve(file),size,digest});
  }
  return {fingerprint:hash.digest('hex'),files:files.length,bytes,...(inventory?{entries}:{})};
}
