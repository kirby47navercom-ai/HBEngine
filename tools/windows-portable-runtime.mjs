import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {executableSignature} from './windows-package-signing.mjs';

export async function portableWindowsRuntime(desktop){
 const bundled=path.join(desktop,'runtime/vcruntime140.dll');let file=bundled;
 if(!await fs.access(file).then(()=>true,()=>false)){
  const candidates=process.env.HB_VC_REDIST_DIR?[process.env.HB_VC_REDIST_DIR]:[];
  for(const base of [process.env.ProgramFiles,process.env['ProgramFiles(x86)']].filter(Boolean)){
   const root=path.join(base,'Microsoft Visual Studio');
   for(const year of await fs.readdir(root).catch(()=>[]))for(const edition of await fs.readdir(path.join(root,year)).catch(()=>[])){
    const redist=path.join(root,year,edition,'VC/Redist/MSVC');
    for(const version of (await fs.readdir(redist).catch(()=>[])).filter(v=>/^\d+\.\d+\.\d+$/.test(v)).sort((a,b)=>b.localeCompare(a,undefined,{numeric:true})))candidates.push(path.join(redist,version,'x64/Microsoft.VC143.CRT'));
   }
  }
  file=null;for(const candidate of candidates){const dll=path.join(candidate,'vcruntime140.dll');if(await fs.access(dll).then(()=>true,()=>false)){file=dll;break;}}
  if(!file)throw Error('휴대 가능한 패키지에 VCRUNTIME140.dll이 필요해요. Visual Studio 정식 VC/Redist x64 경로를 HB_VC_REDIST_DIR로 지정하세요. Windows 시스템 DLL을 복사하거나 사용자 PC에 설치돼 있다고 가정하지 않아요.');
 }
 const stat=await fs.lstat(file);if(!stat.isFile()||stat.isSymbolicLink())throw Error('VC 런타임 파일 경로를 확인하세요.');
 const bytes=await fs.readFile(file),pe=bytes.readUInt32LE(60);if(bytes.toString('ascii',0,2)!=='MZ'||pe>bytes.length-6||bytes.readUInt16LE(pe+4)!==0x8664)throw Error('VC 런타임은 Windows x64여야 해요.');
 const signature=await executableSignature(file);if(signature.status!=='Valid'||!/Microsoft Corporation/.test(signature.signer||''))throw Error('Microsoft 정식 서명이 유효한 VC 런타임이 필요해요.');
 return {file,bytes,sha256:createHash('sha256').update(bytes).digest('hex'),target:'runtime/vcruntime140.dll',targets:['runtime/vcruntime140.dll','node_modules/node-web-audio-api/vcruntime140.dll'],signature};
}
