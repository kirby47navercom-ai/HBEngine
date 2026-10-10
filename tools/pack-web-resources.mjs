import fs from 'node:fs/promises';
import path from 'node:path';
import {digest} from './build-game.mjs';

// Pack the already cooked files, so repacking after public exclusions cannot revive them.
export async function packWebResources(directory,manifest){
  const root=await fs.realpath(directory),chunks=[],files=[];let offset=0;
  const types={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif',svg:'image/svg+xml'};
  for(const entry of manifest.files){
    const ext=entry.path.split('.').at(-1).toLowerCase(),type=types[ext]||( /\.(hbsprite|hbspriteanimation)\.json$/i.test(entry.path)?'application/json':null);
    if(!entry.path.startsWith('Content/')||!type||types[ext]&&entry.bytes>512*1024)continue;
    if(entry.path.split('/').some(p=>!p||p==='.'||p==='..')||/[\\:\x00-\x1f]/.test(entry.path))throw Error('웹 리소스 경로 오류');
    const name=await fs.realpath(path.join(root,entry.path));if(!name.toLowerCase().startsWith((root+path.sep).toLowerCase()))throw Error('웹 리소스가 패키지 밖이에요.');
    const bytes=await fs.readFile(name);if(bytes.length!==entry.bytes||digest(bytes)!==entry.sha256)throw Error('웹 리소스 해시 오류: '+entry.path);
    files.push({path:entry.path,offset,bytes:bytes.length,type});chunks.push(bytes);offset+=bytes.length;
  }
  const name='game.resources.bin',bytes=Buffer.concat(chunks);await fs.writeFile(path.join(root,name),bytes);
  manifest.files=manifest.files.filter(f=>f.path!==name);manifest.files.push({path:name,bytes:bytes.length,sha256:digest(bytes)});
  manifest.webResources={path:name,bytes:bytes.length,files};return manifest;
}
