import fs from 'node:fs/promises';
import {createReadStream,createWriteStream} from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {pathToFileURL} from 'node:url';
import {androidSdk,runTool} from './mobile-android.mjs';

const packages=[['platforms;android-36','platforms/android-36'],['build-tools;36.0.0','build-tools/36.0.0'],['ndk;28.2.13676358','ndk/28.2.13676358'],['platform-tools','platform-tools']];
async function fileHash(file,algorithm){const hash=createHash(algorithm);for await(const chunk of createReadStream(file))hash.update(chunk);return hash.digest('hex');}
async function download(url,file,{bytes,sha1,sha256,signal}){
  try{const info=await fs.stat(file);if(info.size===bytes&&await fileHash(file,sha256?'sha256':'sha1')===(sha256||sha1))return;}catch(error){if(error.code!=='ENOENT')throw error;}
  const partial=file+'.'+randomUUID()+'.part',response=await fetch(url,{signal});if(!response.ok)throw Error('Android 도구 다운로드 실패: '+response.status);
  try{await pipeline(Readable.fromWeb(response.body),createWriteStream(partial,{flags:'wx'}),{signal});if((await fs.stat(partial)).size!==bytes||await fileHash(partial,sha256?'sha256':'sha1')!==(sha256||sha1))throw Error('Android 도구 체크섬 불일치');await fs.rename(partial,file);}finally{await fs.unlink(partial).catch(error=>{if(error.code!=='ENOENT')throw error;});}
}
export async function prepareAndroid({acceptLicense=false,signal,onProgress=console.log}={}){
  if(acceptLicense!==true)throw Error('Google Android SDK 이용약관 동의가 필요해요: https://developer.android.com/studio/terms');
  const sdk=androidSdk(),cache=path.join(sdk,'.downloads');await fs.mkdir(cache,{recursive:true});
  const response=await fetch('https://dl.google.com/android/repository/repository2-3.xml',{signal});if(!response.ok)throw Error('Android SDK 목록 다운로드 실패');const repository=await response.text();
  const license=repository.match(/<license id="android-sdk-license"[^>]*>([\s\S]*?)<\/license>/)?.[1];if(!license?.includes('SDK License'))throw Error('Android SDK 약관 확인 실패');
  const receipts=[];
  for(const [name,destination] of packages){
    signal?.throwIfAborted();const at=repository.indexOf('<remotePackage path="'+name+'"');if(at<0)throw Error('Android SDK 패키지 누락: '+name);const block=repository.slice(at,repository.indexOf('</remotePackage>',at)+16);
    if(!block.includes('<uses-license ref="android-sdk-license"'))throw Error('추가 약관 확인이 필요해요: '+name);
    const platform=process.platform==='win32'?'windows':process.platform==='darwin'?'macosx':'linux',archive=[...block.matchAll(/<archive>([\s\S]*?)<\/archive>/g)].map(m=>m[1]).find(a=>a.includes('<host-os>'+platform+'</host-os>')||!a.includes('<host-os>'));
    const file=archive?.match(/<url>([^<]+)<\/url>/)?.[1],bytes=Number(archive?.match(/<size>(\d+)<\/size>/)?.[1]),sha1=archive?.match(/<checksum type="sha1">([^<]+)<\/checksum>/)?.[1];if(!file||!Number.isSafeInteger(bytes)||bytes<=0||!/^[a-f0-9]{40}$/.test(sha1))throw Error('Android SDK 아카이브 정보 오류');
    const target=path.join(sdk,destination),archiveFile=path.join(cache,file),url='https://dl.google.com/android/repository/'+file;onProgress('Android '+name+' ('+Math.ceil(bytes/1048576)+' MB)');await download(url,archiveFile,{bytes,sha1,signal});
    try{await fs.access(path.join(target,'source.properties'));}catch(error){if(error.code!=='ENOENT')throw error;const staging=path.join(sdk,'.extract-'+randomUUID());await fs.mkdir(staging);await runTool(process.platform==='win32'?'tar.exe':'tar',['-xf',archiveFile,'-C',staging],{signal,timeout:180000});const extracted=(await fs.readdir(staging,{withFileTypes:true})).filter(e=>e.isDirectory());if(extracted.length!==1)throw Error('Android SDK 압축 구조 오류');await fs.mkdir(path.dirname(target),{recursive:true});await fs.rename(path.join(staging,extracted[0].name),target);await fs.rmdir(staging);}
    receipts.push({name,url,bytes,sha1,sha256:await fileHash(archiveFile,'sha256'),path:target});
  }
  onProgress('Android bundletool');const bundle={bytes:32520401,sha256:'a099cfa1543f55593bc2ed16a70a7c67fe54b1747bb7301f37fdfd6d91028e29',url:'https://github.com/google/bundletool/releases/download/1.18.3/bundletool-all-1.18.3.jar'};await download(bundle.url,path.join(sdk,'bundletool.jar'),{...bundle,signal});
  await fs.mkdir(path.join(sdk,'licenses'),{recursive:true});await fs.writeFile(path.join(sdk,'licenses/android-sdk-license.txt'),license);await fs.writeFile(path.join(sdk,'hb-toolchain.json'),JSON.stringify({version:1,date:new Date().toISOString(),licenseAccepted:true,licenseSha256:createHash('sha256').update(license).digest('hex'),packages:receipts,bundletool:bundle},null,2));return {sdk,packages:receipts};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){try{console.log(JSON.stringify(await prepareAndroid({acceptLicense:process.argv.includes('--accept-license')}),null,2));}catch(error){console.error(error.message);process.exitCode=1;}}
