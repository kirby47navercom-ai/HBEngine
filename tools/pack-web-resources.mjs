import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {fileContent,contentChunks} from './build-content.mjs';

// A startup accelerator, not a second copy of every asset in memory. Files
// outside this budget retain their normal on-demand Content URL.
export const webResourceBudget=16*1024*1024;
export async function packWebResources(directory,manifest,{budget=webResourceBudget,signal}={}){
  if(!Number.isSafeInteger(budget)||budget<0)throw Error('웹 리소스 메모리 예산 오류');
  const root=await fs.realpath(directory),files=[],hash=createHash('sha256');let offset=0,handle;
  const name='game.resources.bin',temp=path.join(root,name+'.'+randomUUID()+'.tmp');
  const types={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif',svg:'image/svg+xml'};
  try{
    signal?.throwIfAborted();handle=await fs.open(temp,'wx');
    for(const entry of manifest.files){
      signal?.throwIfAborted();const ext=entry.path.split('.').at(-1).toLowerCase(),type=types[ext]||(/\.(hbsprite|hbspriteanimation)\.json$/i.test(entry.path)?'application/json':null);
      if(!entry.path.startsWith('Content/')||!type||types[ext]&&entry.bytes>512*1024)continue;
      if(!Number.isSafeInteger(entry.bytes)||entry.bytes<0||entry.path.split('/').some(p=>!p||p==='.'||p==='..')||/[\\:\x00-\x1f]/.test(entry.path))throw Error('웹 리소스 경로·크기 오류');
      if(entry.bytes>budget-offset)continue;
      const content=await fileContent(path.join(root,entry.path),{root,signal}),itemHash=createHash('sha256');
      if(content.length!==entry.bytes)throw Error('웹 리소스 크기 오류: '+entry.path);
      for await(const chunk of contentChunks(content,{signal})){await handle.writeFile(chunk);itemHash.update(chunk);hash.update(chunk);}
      if(itemHash.digest('hex')!==entry.sha256)throw Error('웹 리소스 해시 오류: '+entry.path);
      files.push({path:entry.path,offset,bytes:content.length,type});offset+=content.length;
    }
    signal?.throwIfAborted();await handle.close();handle=null;await fs.rename(temp,path.join(root,name));
  }finally{await handle?.close();await fs.unlink(temp).catch(e=>{if(e.code!=='ENOENT')throw e;});}
  manifest.files=manifest.files.filter(f=>f.path!==name);manifest.files.push({path:name,bytes:offset,sha256:hash.digest('hex')});
  manifest.webResources={path:name,bytes:offset,files};return manifest;
}
