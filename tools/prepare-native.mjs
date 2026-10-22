import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {nativeMutablePaths} from './native-mutable-paths.mjs';
import {assertNativeNoLinks} from './native-cache-lock.mjs';
const paths=nativeMutablePaths(path.resolve(import.meta.dirname,'..'));
export const jsonInclude=paths.dependencies;
let pending;
async function prepare(){await import('./generate-screen-effects.mjs');await import('./generate-probe-lightmap-mix.mjs');const file=path.join(jsonInclude,'nlohmann/json.hpp');await assertNativeNoLinks(file);try{await fs.access(file);return jsonInclude;}catch(error){if(error.code!=='ENOENT')throw error;}
  const response=await fetch('https://raw.githubusercontent.com/nlohmann/json/v3.12.0/single_include/nlohmann/json.hpp');if(!response.ok)throw Error('C++ JSON 헤더 다운로드 실패');const data=Buffer.from(await response.arrayBuffer());
  const sha256=createHash('sha256').update(data).digest('hex');if(sha256!=='aaf127c04cb31c406e5b04a63f1ae89369fccde6d8fa7cdda1ed4f32dfc5de63')throw Error('C++ JSON 헤더 검증 실패');await fs.mkdir(path.dirname(file),{recursive:true});await assertNativeNoLinks(file);const temporary=file+'.'+randomUUID()+'.tmp';try{await fs.writeFile(temporary,data,{flag:'wx'});await fs.rename(temporary,file);}finally{await fs.unlink(temporary).catch(error=>{if(error.code!=='ENOENT')throw error;});}await fs.writeFile(file+'.sha256',sha256);return jsonInclude;
}
export async function prepareNative(){if(!pending)pending=prepare().finally(()=>{pending=null;});return pending;}
if(process.argv[1]?.endsWith('prepare-native.mjs')){await prepareNative();console.log('C++ JSON dependency: nlohmann/json v3.12.0');}
