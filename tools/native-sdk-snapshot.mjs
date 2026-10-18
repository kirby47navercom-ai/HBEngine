import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';import {assertNativeNoLinks,removeNativeTree} from './native-cache-lock.mjs';

export const nativeSDKSnapshotContract=Object.freeze({version:1,folder:'SDK',inventory:'all SDK files, including existence-only __has_include inputs',publication:'private compilation workspace; caller awaits completion',changes:'content digest mismatch rejects before compilation',debugger:'relative SDK/include and SDK/dependency under retained compilation cwd'});

// Keep all filenames, not only -MD dependencies: __has_include can alter emitted
// code without including the tested header. These are compiler inputs, not assets.
export async function writeNativeSDKSnapshot(directory,snapshot,{signal}={}){
 signal?.throwIfAborted();if(!Array.isArray(snapshot?.entries)||snapshot.entries.length!==snapshot.files||!/^[a-f0-9]{64}$/.test(snapshot.fingerprint))throw Error('C++ SDK 원본 목록을 확인하세요.');
 const names=new Set();for(const entry of snapshot.entries){if(typeof entry.name!=='string'||!(/^(include\/|dependency\/)/.test(entry.name))||/[\\:\x00-\x1f]/.test(entry.name)||entry.name.split('/').some(part=>!part||part==='.'||part==='..')||names.has(entry.name.toLowerCase())||typeof entry.file!=='string'||!Number.isSafeInteger(entry.size)||entry.size<0||!/^[a-f0-9]{64}$/.test(entry.digest))throw Error('C++ SDK 파일 지문·경로를 확인하세요.');names.add(entry.name.toLowerCase());}
 const inventory=createHash('sha256').update('hb-native-sdk-v1\0');for(const entry of [...snapshot.entries].sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0))inventory.update(JSON.stringify([entry.name,entry.size,entry.digest])+'\n');if(inventory.digest('hex')!==snapshot.fingerprint)throw Error('C++ SDK 목록 지문을 확인하세요.');
 await assertNativeNoLinks(directory);const target=path.join(directory,'SDK');await fs.mkdir(target);const files=[];let bytes=0;
 try{
  for(const entry of snapshot.entries){signal?.throwIfAborted();await assertNativeNoLinks(entry.file);const stat=await fs.lstat(entry.file);if(!stat.isFile()||stat.isSymbolicLink()||stat.size!==entry.size)throw Error('C++ SDK가 빌드 중 바뀌었어요: '+entry.name);const data=await fs.readFile(entry.file,{signal});if(data.length!==entry.size||createHash('sha256').update(data).digest('hex')!==entry.digest)throw Error('C++ SDK가 빌드 중 바뀌었어요: '+entry.name);const file=path.join(target,entry.name);await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,data,{flag:'wx',signal});files.push({path:entry.name,size:entry.size,sha256:entry.digest});bytes+=data.length;}
  signal?.throwIfAborted();if(bytes!==snapshot.bytes)throw Error('C++ SDK 원본 크기를 확인하세요.');await fs.writeFile(path.join(target,'.snapshot.json'),JSON.stringify({version:1,fingerprint:snapshot.fingerprint,files,bytes}),{flag:'wx',signal});return {directory:target,includeDirectories:['SDK/include','SDK/dependency'],files:files.length,bytes,fingerprint:snapshot.fingerprint};
 }catch(error){await removeNativeTree(directory,target);throw error;}
}
