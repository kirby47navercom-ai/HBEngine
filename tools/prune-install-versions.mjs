import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
const sha=b=>createHash('sha256').update(b).digest('hex');
export async function pruneInstalledVersions(destination,currentDirectory){
 if(process.platform!=='win32')throw Error('Windows 설치 버전 정리예요.');
 const root=await fs.realpath(destination),versions=path.join(root,'Versions'),current=await fs.realpath(currentDirectory);if(path.dirname(current).toLowerCase()!==versions.toLowerCase()||!/^[a-f0-9]{16}$/.test(path.basename(current)))throw Error('현재 설치 버전 경로 오류');
 const entries=[],skipped=[];for(const e of await fs.readdir(versions,{withFileTypes:true})){if(e.name===path.basename(current)||!e.isDirectory()||e.isSymbolicLink()||!/^[a-f0-9]{16}$/.test(e.name))continue;const directory=path.join(versions,e.name),file=path.join(directory,'HBEngine.install.json');try{const bytes=await fs.readFile(file),m=JSON.parse(bytes);if(m.version!==1||m.bundleHash?.slice(0,16)!==e.name||sha(JSON.stringify(m.files))!==m.bundleHash||!m.files.some(p=>p.path==='HBEngine.exe')||m.files.some(p=>typeof p.path!=='string'||p.path.includes('\\')||p.path.split('/').some(v=>!v||v==='.'||v==='..')||/[\x00-\x1f:]/.test(p.path)||!/^([a-f0-9]{64})$/.test(p.sha256)))throw Error('설치 명세 오류');entries.push({directory,manifestSHA256:sha(bytes)});}catch(error){skipped.push({directory,reason:error.message});}}
 const maintenance=path.join(root,'Maintenance');await fs.mkdir(maintenance,{recursive:true});const plan=path.join(maintenance,'prune-'+randomUUID()+'.json');await fs.writeFile(plan,JSON.stringify({root,versions,current,entries,skipped}));
 try{await promisify(execFile)('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(import.meta.dirname,'remove-install-versions.ps1'),'-PlanFile',plan],{windowsHide:true,timeout:300000,maxBuffer:1048576});return JSON.parse((await fs.readFile(path.join(maintenance,'latest-cleanup.json'),'utf8')).replace(/^\uFEFF/,''));}finally{await fs.unlink(plan);}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const [destination,current]=process.argv.slice(2);if(!destination||!current)throw Error('사용법: node tools/prune-install-versions.mjs 설치폴더 현재버전폴더');console.log(JSON.stringify(await pruneInstalledVersions(destination,current)));}
