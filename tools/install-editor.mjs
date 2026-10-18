import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash,randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {pruneInstalledVersions} from './prune-install-versions.mjs';
import {nativeMutablePaths} from './native-mutable-paths.mjs';
import {pruneNativeModuleCache} from './native-module-cache.mjs';
const exec=promisify(execFile),repository=path.resolve(import.meta.dirname,'..');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const inside=(base,value)=>{const relative=path.relative(base,value);return !relative||!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative);};
async function canonicalDestination(value){
  value=path.resolve(value);let parent=value;
  while(true){try{return path.resolve(await fs.realpath(parent),path.relative(parent,value));}catch(error){if(error.code!=='ENOENT')throw error;parent=path.dirname(parent);}}
}
async function inventory(directory,relative=''){
  const files=[];
  for(const entry of (await fs.readdir(path.join(directory,relative),{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
    const name=relative?relative+'/'+entry.name:entry.name;
    if(name==='Projects'||name==='native/build'||name==='HBEngine.install.json')continue;
    if(entry.isSymbolicLink())throw Error('배포본의 링크는 복사하지 않아요: '+name);
    if(entry.isDirectory())files.push(...await inventory(directory,name));
    else if(entry.isFile()){const bytes=await fs.readFile(path.join(directory,name));files.push({path:name,size:bytes.length,sha256:sha(bytes)});}
  }
  return files;
}
export async function activeInstalledVersions(destination){
  if(process.platform!=='win32')return [];const versions=path.join(destination,'Versions'),names=new Set((await fs.readdir(versions,{withFileTypes:true}).catch(e=>e.code==='ENOENT'?[]:Promise.reject(e))).filter(e=>e.isDirectory()&&!e.isSymbolicLink()&&/^[a-f0-9]{16}$/.test(e.name)).map(e=>e.name));if(!names.size)return [];
  const quote=v=>"'"+v.replaceAll("'","''")+"'",script="$root="+quote(path.resolve(versions))+"; $pattern=[regex]::Escape($root)+'[\\\\/]([a-f0-9]{16})'; $rows=@(Get-CimInstance Win32_Process | ForEach-Object { $match=[regex]::Match(($_.ExecutablePath+' '+$_.CommandLine).Replace('/','\\'),$pattern,'IgnoreCase'); if($match.Success){[pscustomobject]@{pid=$_.ProcessId;version=$match.Groups[1].Value.ToLowerInvariant();name=$_.Name}} }); ConvertTo-Json -InputObject $rows -Compress";
  const {stdout}=await exec('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{windowsHide:true,encoding:'utf8',timeout:30000});return JSON.parse(stdout).filter(p=>names.has(p.version));
}
export async function installEditor({source=path.join(repository,'dist/HBEngine'),destination=path.join(os.homedir(),'HBEngine'),shortcut=true,expectedBundleHash}={}){
  if(process.platform!=='win32')throw Error('Windows 사용자용 편집기 설치예요.');
  if(expectedBundleHash!==undefined&&!/^[a-f0-9]{64}$/.test(expectedBundleHash))throw Error('설치할 배포본 SHA를 확인하세요.');
  source=await fs.realpath(source);destination=await canonicalDestination(destination);
  if(inside(repository,destination)||inside(source,destination))throw Error('사용자용 설치 폴더를 개발 저장소 밖에 지정하세요.');
  const files=await inventory(source);
  for(const name of ['HBEngine.exe','WebView2Loader.dll','runtime/node.exe','tools/serve.mjs','prototype/index.html'])if(!files.some(file=>file.path===name))throw Error('배포 파일 누락: '+name);
  const bundleHash=sha(JSON.stringify(files)),versions=path.join(destination,'Versions'),directory=path.join(versions,bundleHash.slice(0,16));
  if(expectedBundleHash!==undefined&&bundleHash!==expectedBundleHash)throw Object.assign(Error('대기 중 배포본이 변경됐어요. 새 배포본으로 설치를 다시 요청하세요.'),{code:'INSTALL_SOURCE_CHANGED'});
  const deferred=active=>({deferred:true,reason:'running-install',bundleHash,source,destination,active,files:files.length}),busy=(await activeInstalledVersions(destination)).filter(p=>p.version!==path.basename(directory));if(busy.length)return deferred(busy);
  await fs.mkdir(versions,{recursive:true});
  // Existing versions are verified, never overwritten. A failed copy has no shortcut.
  const exists=await fs.stat(directory).then(()=>true,error=>{if(error.code==='ENOENT')return false;throw error;});
  if(exists){const manifest=JSON.parse(await fs.readFile(path.join(directory,'HBEngine.install.json'),'utf8'));const installed=await inventory(directory);if(manifest.bundleHash!==bundleHash||JSON.stringify(installed)!==JSON.stringify(files))throw Error('기존 설치 파일이 달라요. 덮어쓰지 않아요: '+directory);}
  else{
    const staging=path.join(versions,'.install-'+randomUUID());await fs.mkdir(staging);
    try{
      for(const file of files){const target=path.join(staging,file.path);await fs.mkdir(path.dirname(target),{recursive:true});await fs.copyFile(path.join(source,file.path),target);if(sha(await fs.readFile(target))!==file.sha256)throw Error('배포본이 복사 중 변경됐어요: '+file.path);}
      await fs.writeFile(path.join(staging,'HBEngine.install.json'),JSON.stringify({version:1,bundleHash,installedAt:new Date().toISOString(),profile:'%LOCALAPPDATA%/HBEngine/User',files},null,2)+'\n',{flag:'wx'});
      const active=(await activeInstalledVersions(destination)).filter(p=>p.version!==path.basename(directory));if(active.length){await fs.rm(staging,{recursive:true,force:true});return deferred(active);}
      await fs.rename(staging,directory);
    }catch(error){
      if(path.dirname(path.resolve(staging))!==path.resolve(versions)||!/^\.install-[a-f0-9-]{36}$/.test(path.basename(staging)))throw Error('임시 설치 정리 범위 오류',{cause:error});
      await fs.rm(staging,{recursive:true,force:true});throw error;
    }
  }
  const executable=path.join(directory,'HBEngine.exe'),link=path.join(destination,'HBEngine.lnk');let desktopShortcut=null;
  if(shortcut){
    const quote=value=>"'"+value.replaceAll("'","''")+"'";
    const script='$shell=New-Object -ComObject WScript.Shell; $link=$shell.CreateShortcut('+quote(link)+'); $link.TargetPath='+quote(executable)+'; $link.WorkingDirectory='+quote(directory)+'; $link.Description="HBEngine 사용자용 편집기"; $link.Save(); $desktop=[Environment]::GetFolderPath("Desktop"); if($desktop){$target=Join-Path $desktop "HBEngine 사용자용.lnk"; Copy-Item -LiteralPath '+quote(link)+' -Destination $target; [Console]::Write($target)}';
    const {stdout}=await exec('powershell.exe',['-NoProfile','-NonInteractive','-Command','[Console]::OutputEncoding=[Text.UTF8Encoding]::new(); '+script],{windowsHide:true,encoding:'utf8'});desktopShortcut=stdout.trim()||null;
    const registrationProfile=await fs.mkdtemp(path.join(os.tmpdir(),'HBEngine-register-'));
    try{await exec(executable,['--register'],{cwd:directory,windowsHide:true,timeout:30000,env:{...process.env,HB_USER_DATA_DIR:registrationProfile}});}
    finally{const resolved=await fs.realpath(registrationProfile);if(resolved.toLowerCase()!==path.resolve(registrationProfile).toLowerCase()||!inside(os.tmpdir(),resolved))throw Error('등록 임시 프로필 정리 경로 오류');await fs.rm(resolved,{recursive:true,force:true});}
  }
  const cleanup=await pruneInstalledVersions(destination,directory),nativeCache=await pruneNativeModuleCache(nativeMutablePaths(directory).modules).catch(error=>({deferred:true,error:error.message}));
  return {directory,executable,shortcut:shortcut?link:null,desktopShortcut,projectAssociation:shortcut?executable:null,bundleHash,files:files.length,cleanup,nativeCache};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2),whenIdle=args.includes('--when-idle'),status=args.includes('--status'),positional=args.filter(a=>!['--when-idle','--status'].includes(a));if(positional.length>1||positional.some(a=>a.startsWith('--'))||whenIdle&&status)throw Error('사용법: node tools/install-editor.mjs [설치 폴더] [--when-idle 또는 --status]');
  if(status){const {queuedEditorInstallStatus}=await import('./queued-editor-install.mjs');console.log(JSON.stringify(await queuedEditorInstallStatus(positional[0]),null,2));process.exit(0);}
  const result=await installEditor(positional.length?{destination:positional[0]}:{});
  if(whenIdle&&result.deferred){const {queueEditorInstall}=await import('./queued-editor-install.mjs');console.log(JSON.stringify(await queueEditorInstall(result),null,2));}else console.log(JSON.stringify(result,null,2));
}
