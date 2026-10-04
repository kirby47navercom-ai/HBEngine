import {shooterTemplate} from '../prototype/shooter-template.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {ProjectService} from './project-service.mjs';
import {gameplayTemplate} from '../prototype/gameplay-templates.js';
import {makeStarterScene} from '../prototype/scene-templates.js';
const exec=promisify(execFile);
export const engineVersion='0.1.0';
export const defaultDirectory=path.join(os.homedir(),'Documents','HBEngine Projects');
const dataDirectory=()=>process.env.HB_USER_DATA_DIR||path.join(process.env.LOCALAPPDATA||path.join(os.homedir(),'.local','share'),'HBEngine');
const absolute=value=>{if(typeof value!=='string'||!value||value.length>32767||/[\x00-\x1f]/.test(value)||!path.isAbsolute(value))throw Error('절대 프로젝트 경로를 선택하세요.');return path.resolve(value);};
const validName=name=>typeof name==='string'&&name.length>0&&name.length<=80&&name.trim()===name&&!/[<>:"/\\|?*\x00-\x1f]/.test(name)&&!/[. ]$/.test(name)&&!/^\.{1,2}$/.test(name)&&!/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name);
export function validateManifest(data){
  if(!data||data.version!==1||data.engine!=='HBEngine'||data.engineVersion!==engineVersion||!validName(data.name)||typeof data.id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.id))throw Error('지원하지 않거나 잘못된 HBEngine 프로젝트 파일이에요.');
  for(const [key,suffix] of [['startupScene','.hbscene.json'],['startupBlueprint','.hbblueprint.json']]){const value=data[key];if(typeof value!=='string'||!value||value.length>1000||!value.endsWith(suffix)||value.includes('\\')||value.startsWith('/')||value.split('/').some(p=>!p||p==='.'||p==='..'||/[<>:"|?*\x00-\x1f]/.test(p)||/[. ]$/.test(p)))throw Error('프로젝트 시작 에셋 경로 오류');}
  return data;
}
const descriptor=name=>({version:1,engine:'HBEngine',engineVersion,id:randomUUID(),name,startupScene:'Assets/Scenes/Garden.hbscene.json',startupBlueprint:'Assets/Blueprints/BP_Garden.hbblueprint.json'});
export async function readProjectManifest(file){
  file=absolute(file);if(!/\.hbproject$/i.test(file))throw Error('.hbproject 파일을 선택하세요.');file=await fs.realpath(file);const stat=await fs.stat(file);if(!stat.isFile()||stat.size>65536)throw Error('프로젝트 파일 크기 또는 형식 오류');
  const manifest=validateManifest(JSON.parse((await fs.readFile(file,'utf8')).replace(/^\uFEFF/,''))),root=path.dirname(file),project=await new ProjectService(root).init(false);await project.resolve(manifest.startupScene,true);await project.resolve(manifest.startupBlueprint,true);return {file,root:project.root,manifest,project};
}
export async function ensureProjectManifest(root,name=path.basename(root)){
  if(!validName(name))throw Error('프로젝트 이름을 확인하세요.');const file=path.join(absolute(root),name+'.hbproject');
  try{await fs.writeFile(file,JSON.stringify(descriptor(name),null,2)+'\n',{flag:'wx'});}catch(error){if(error.code!=='EEXIST')throw error;}
  return readProjectManifest(file);
}
export async function createProject(name,directory,template='garden'){
  if(!['garden','2d','3d','gameplay2d','gameplay3d','shooter2d'].includes(template))throw Error('프로젝트 템플릿 오류');
  if(!validName(name))throw Error('프로젝트 이름을 확인하세요.');directory=absolute(directory);await fs.mkdir(directory,{recursive:true});directory=await fs.realpath(directory);const root=path.join(directory,name);
  // Exclusive mkdir reserves a new project without changing an existing folder or its files.
  await fs.mkdir(root);const project=await new ProjectService(root).init(true);if(template.startsWith('gameplay')||template==='shooter2d'){const data=template==='shooter2d'?shooterTemplate(name):gameplayTemplate(name,template==='gameplay2d'?'2d':'3d');for(const [file,value] of Object.entries(data.files))await project.write(file,typeof value==='string'?value:JSON.stringify(value,null,2));await project.write('Assets/Scenes/Garden.hbscene.json',JSON.stringify(data.scene,null,2));}else if(template!=='garden')await project.write('Assets/Scenes/Garden.hbscene.json',JSON.stringify(makeStarterScene(name,template),null,2));return ensureProjectManifest(root,name);
}
async function readRecent(){
  try{const file=path.join(absolute(dataDirectory()),'recent-projects.json'),stat=await fs.stat(file);if(stat.size>1048576)return [];const data=JSON.parse(await fs.readFile(file,'utf8'));return data.version===1&&Array.isArray(data.projects)?data.projects.slice(0,100).filter(p=>p&&typeof p.file==='string'):[];}catch(error){if(error.code==='ENOENT'||error instanceof SyntaxError)return [];throw error;}
}
async function writeRecent(projects){
  const directory=absolute(dataDirectory());await fs.mkdir(directory,{recursive:true});const file=path.join(directory,'recent-projects.json'),temp=file+'.'+randomUUID()+'.tmp';
  try{await fs.writeFile(temp,JSON.stringify({version:1,projects:projects.slice(0,20)},null,2)+'\n',{flag:'wx'});await fs.rename(temp,file);}finally{await fs.unlink(temp).catch(()=>{});}
}
let recentQueue=Promise.resolve();
export async function rememberProject(record){const task=recentQueue.then(async()=>{const projects=await readRecent(),next={name:record.manifest.name,file:record.file};await writeRecent([next,...projects.filter(p=>path.resolve(p.file)!==record.file)]);});recentQueue=task.catch(()=>{});return task;}
export async function recentProjects(defaultProject=null){
  await recentQueue;const records=await readRecent(),projects=[];for(const item of records){try{const record=await readProjectManifest(item.file);if(!projects.some(p=>p.file===record.file))projects.push({name:record.manifest.name,file:record.file});}catch{/* Missing projects remain untouched; they no longer appear in the hub. */}}
  if(defaultProject&&!projects.some(p=>p.file===defaultProject.file))projects.push({name:defaultProject.manifest.name,file:defaultProject.file});return projects.slice(0,20);
}
const pickerBase="[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false); Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Application]::EnableVisualStyles(); ";
const pickers={project:pickerBase+"$picker = New-Object System.Windows.Forms.OpenFileDialog; $picker.Title = 'HBEngine 프로젝트 열기'; $picker.Filter = 'HBEngine Project (*.hbproject)|*.hbproject'; $picker.Multiselect = $false; if ($picker.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::Write(($picker.FileName | ConvertTo-Json -Compress)) } else { [Console]::Write('null') }; $picker.Dispose();",folder:pickerBase+"$picker = New-Object System.Windows.Forms.FolderBrowserDialog; $picker.Description = '새 프로젝트를 만들 부모 폴더 선택'; if ($picker.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::Write(($picker.SelectedPath | ConvertTo-Json -Compress)) } else { [Console]::Write('null') }; $picker.Dispose();"};
export function pickerScript(kind){if(!Object.hasOwn(pickers,kind))throw Error('프로젝트 또는 폴더를 선택하세요.');return pickers[kind];}
export async function pickProjectPath(kind){
  const script=pickerScript(kind);if(process.platform!=='win32')throw Error('프로젝트 파일 선택기는 Windows에서 사용할 수 있어요.');
  const powershell=path.join(process.env.SystemRoot||'C:/Windows','System32/WindowsPowerShell/v1.0/powershell.exe'),{stdout}=await exec(powershell,['-NoLogo','-NoProfile','-STA','-Command',script],{windowsHide:true,encoding:'utf8',maxBuffer:65536});const selected=JSON.parse(stdout.trim()||'null');return selected===null?null:absolute(selected);
}
