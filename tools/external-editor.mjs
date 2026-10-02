import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {blueprintClasses} from '../prototype/class-types.js';
const exec=promisify(execFile),exists=async p=>!!p&&await fs.access(p).then(()=>true,()=>false);
export async function findEditor(){
  if(process.platform==='win32'){
    const vswhere=path.join(process.env['ProgramFiles(x86)']||'C:/Program Files (x86)','Microsoft Visual Studio/Installer/vswhere.exe');
    if(await exists(vswhere)){try{const {stdout}=await exec(vswhere,['-latest','-products','*','-find','Common7/IDE/devenv.exe'],{windowsHide:true});const file=stdout.trim().split(/\r?\n/)[0];if(await exists(file))return {name:'Visual Studio',file,kind:'visualstudio'};}catch{}}
    for(const base of [process.env.LOCALAPPDATA,process.env.ProgramFiles]){if(!base)continue;for(const suffix of ['Programs/Microsoft VS Code/Code.exe','Microsoft VS Code/Code.exe']){const file=path.join(base,suffix);if(await exists(file))return {name:'Visual Studio Code',file,kind:'vscode'};}}
  }
  return null;
}
export async function openExternal(project,relative){
  if(!/\.(h|hpp|cpp|c|hlsl|glsl)$/i.test(relative))throw Error('외부 편집기는 소스 파일만 열 수 있어요.');
  const {file}=await project.read(relative),editor=await findEditor();if(!editor)throw Error('Visual Studio 또는 Visual Studio Code를 설치한 뒤 다시 여세요.');
  const args=editor.kind==='visualstudio'?['/Edit',file]:['--reuse-window',project.root,'--goto',file];
  // Explicit user action opens an interactive IDE. Never run shell text from an asset path.
  await new Promise((resolve,reject)=>{const child=spawn(editor.file,args,{shell:false,detached:true,stdio:'ignore',windowsHide:false});child.once('error',reject);child.once('spawn',()=>{child.unref();resolve();});});return {editor:editor.name,path:relative};
}
export async function createCppClass(project,folder,name,parent='Actor'){
  if(!/^[A-Za-z_][A-Za-z0-9_]{0,79}$/.test(name)||!blueprintClasses[parent])throw Error('C++ 클래스 이름 또는 부모 클래스 오류');
  const header=(folder?folder+'/':'')+name+'.h',source=(folder?folder+'/':'')+name+'.cpp';
  const h=await project.resolve(header,true),cpp=await project.resolve(source,true);
  if(await exists(h)||await exists(cpp))throw Error('같은 이름의 C++ 파일이 이미 있어요.');
  const code=`#pragma once\n#include <HBEngine/Game.hpp>\n\nHB_CLASS(Blueprintable)\nclass ${name} : public hb::${parent} {\npublic:\n    HB_PROPERTY(EditAnywhere, BlueprintReadWrite)\n    float Speed = 5.0f;\n\n    HB_FUNCTION(BlueprintCallable, Category="Gameplay")\n    void Start();\n};\n`;
  await fs.mkdir(path.dirname(h),{recursive:true});await fs.writeFile(h,code,{flag:'wx'});
  try{await fs.writeFile(cpp,`#include "${name}.h"\n\nvoid ${name}::Start() {\n}\n`,{flag:'wx'});}catch(error){await fs.unlink(h);throw error;}
  await project.list();return {path:header,source,name:name+'.h',kind:'code'};
}
