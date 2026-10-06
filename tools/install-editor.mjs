import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash,randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
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
export async function installEditor({source=path.join(repository,'dist/HBEngine'),destination=path.join(os.homedir(),'HBEngine'),shortcut=true}={}){
  if(process.platform!=='win32')throw Error('Windows 사용자용 편집기 설치예요.');
  source=await fs.realpath(source);destination=await canonicalDestination(destination);
  if(inside(repository,destination)||inside(source,destination))throw Error('사용자용 설치 폴더를 개발 저장소 밖에 지정하세요.');
  const files=await inventory(source);
  for(const name of ['HBEngine.exe','WebView2Loader.dll','runtime/node.exe','tools/serve.mjs','prototype/index.html'])if(!files.some(file=>file.path===name))throw Error('배포 파일 누락: '+name);
  const bundleHash=sha(JSON.stringify(files)),versions=path.join(destination,'Versions'),directory=path.join(versions,bundleHash.slice(0,16));
  await fs.mkdir(versions,{recursive:true});
  // Existing versions are verified, never overwritten. A failed copy has no shortcut.
  const exists=await fs.stat(directory).then(()=>true,error=>{if(error.code==='ENOENT')return false;throw error;});
  if(exists){const manifest=JSON.parse(await fs.readFile(path.join(directory,'HBEngine.install.json'),'utf8'));const installed=await inventory(directory);if(manifest.bundleHash!==bundleHash||JSON.stringify(installed)!==JSON.stringify(files))throw Error('기존 설치 파일이 달라요. 덮어쓰지 않아요: '+directory);}
  else{
    const staging=path.join(versions,'.install-'+randomUUID());await fs.mkdir(staging);
    for(const file of files){const target=path.join(staging,file.path);await fs.mkdir(path.dirname(target),{recursive:true});await fs.copyFile(path.join(source,file.path),target);if(sha(await fs.readFile(target))!==file.sha256)throw Error('배포본이 복사 중 변경됐어요: '+file.path);}
    await fs.writeFile(path.join(staging,'HBEngine.install.json'),JSON.stringify({version:1,bundleHash,installedAt:new Date().toISOString(),profile:'%LOCALAPPDATA%/HBEngine/User',files},null,2)+'\n',{flag:'wx'});
    await fs.rename(staging,directory);
  }
  const executable=path.join(directory,'HBEngine.exe'),link=path.join(destination,'HBEngine.lnk');let desktopShortcut=null;
  if(shortcut){
    const quote=value=>"'"+value.replaceAll("'","''")+"'";
    const script='$shell=New-Object -ComObject WScript.Shell; $link=$shell.CreateShortcut('+quote(link)+'); $link.TargetPath='+quote(executable)+'; $link.WorkingDirectory='+quote(directory)+'; $link.Description="HBEngine 사용자용 편집기"; $link.Save(); $desktop=[Environment]::GetFolderPath("Desktop"); if($desktop){$target=Join-Path $desktop "HBEngine 사용자용.lnk"; Copy-Item -LiteralPath '+quote(link)+' -Destination $target; [Console]::Write($target)}';
    const {stdout}=await exec('powershell.exe',['-NoProfile','-NonInteractive','-Command','[Console]::OutputEncoding=[Text.UTF8Encoding]::new(); '+script],{windowsHide:true,encoding:'utf8'});desktopShortcut=stdout.trim()||null;
    await exec(executable,['--register'],{cwd:directory,windowsHide:true,timeout:30000,env:{...process.env,HB_USER_DATA_DIR:path.join(os.tmpdir(),'HBEngine-register-'+randomUUID())}});
  }
  return {directory,executable,shortcut:shortcut?link:null,desktopShortcut,projectAssociation:shortcut?executable:null,bundleHash,files:files.length};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2);if(args.length>1)throw Error('사용법: node tools/install-editor.mjs [설치 폴더]');
  console.log(JSON.stringify(await installEditor(args.length?{destination:args[0]}:{}),null,2));
}
