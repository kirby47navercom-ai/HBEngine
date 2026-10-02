import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
export const jsonInclude=path.resolve('native/build/deps');
export async function prepareNative(){const file=path.join(jsonInclude,'nlohmann/json.hpp');try{await fs.access(file);return jsonInclude;}catch{}
  const response=await fetch('https://raw.githubusercontent.com/nlohmann/json/v3.12.0/single_include/nlohmann/json.hpp');if(!response.ok)throw Error('C++ JSON 헤더 다운로드 실패');const data=Buffer.from(await response.arrayBuffer());
  if(data.length<500000||!data.toString('utf8',0,500).includes('JSON for Modern C++'))throw Error('C++ JSON 헤더 검증 실패');await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,data);await fs.writeFile(file+'.sha256',createHash('sha256').update(data).digest('hex'));return jsonInclude;
}
if(process.argv[1]?.endsWith('prepare-native.mjs')){await prepareNative();console.log('C++ JSON dependency: nlohmann/json v3.12.0');}
