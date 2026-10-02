import fs from 'node:fs/promises';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
const exec=promisify(execFile),root=path.resolve(import.meta.dirname,'..'),build=path.join(root,'native/build'),output=path.join(root,'dist/HBEngine');
const relative=file=>path.relative(root,file).split(path.sep).join('/');
const sdkVersion='1.0.4258.31',sdkHash='56f7f4b8bf9aee4b8efefbbdd4f67d5f74ebd1b100ed0806da71bf76af481aa9',sdk=path.join(build,'webview2');
const exists=async file=>fs.access(file).then(()=>true,()=>false);
async function download(url,file,hash){
  if(await exists(file)&&(!hash||createHash('sha256').update(await fs.readFile(file)).digest('hex')===hash))return;
  const response=await fetch(url,{signal:AbortSignal.timeout(60000)});if(!response.ok)throw Error('다운로드 실패: '+response.status+' '+url);const bytes=Buffer.from(await response.arrayBuffer());
  if(hash&&createHash('sha256').update(bytes).digest('hex')!==hash)throw Error('다운로드 체크섬 불일치');
  await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,bytes);
}
// Reuse the editor's code-native rectangle mark as an ICO; no raster library needed.
function icon(){
  const sizes=[16,32,48,256],frames=sizes.map(size=>{
    const pixels=Buffer.alloc(size*size*4),mask=Buffer.alloc(Math.ceil(size/32)*4*size),header=Buffer.alloc(40);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const px=x/size,py=y/size,outer=px>=.15&&px<=.85&&py>=.12&&py<=.88,inner=px>.23&&px<.77&&py>.2&&py<.8,stroke=outer&&(!inner||px>.43&&px<.51);
      if(stroke){const i=((size-y-1)*size+x)*4;pixels[i]=255;pixels[i+1]=176;pixels[i+2]=117;pixels[i+3]=255;}
    }
    header.writeUInt32LE(40);header.writeInt32LE(size,4);header.writeInt32LE(size*2,8);header.writeUInt16LE(1,12);header.writeUInt16LE(32,14);header.writeUInt32LE(pixels.length+mask.length,20);
    return Buffer.concat([header,pixels,mask]);
  }),directory=Buffer.alloc(6+16*sizes.length);directory.writeUInt16LE(1,2);directory.writeUInt16LE(sizes.length,4);let offset=directory.length;
  sizes.forEach((size,i)=>{const at=6+i*16;directory[at]=directory[at+1]=size===256?0:size;directory.writeUInt16LE(1,at+4);directory.writeUInt16LE(32,at+6);directory.writeUInt32LE(frames[i].length,at+8);directory.writeUInt32LE(offset,at+12);offset+=frames[i].length;});
  return Buffer.concat([directory,...frames]);
}
if(process.platform!=='win32'||process.arch!=='x64')throw Error('현재 데스크톱 빌드는 Windows x64용이에요.');
const compiler=process.env.CXX||'C:/msys64/ucrt64/bin/g++.exe';if(!await exists(compiler))throw Error('CXX에 g++ 경로를 지정하세요.');
const compilerEnv={...process.env,PATH:path.dirname(compiler)+path.delimiter+process.env.PATH};
await fs.mkdir(build,{recursive:true});await fs.mkdir(output,{recursive:true});
const archive=path.join(sdk,'sdk.zip');
await download('https://api.nuget.org/v3-flatcontainer/microsoft.web.webview2/'+sdkVersion+'/microsoft.web.webview2.'+sdkVersion+'.nupkg',archive,sdkHash);
await exec('tar.exe',['-xf',archive,'-C',sdk],{windowsHide:true});
const include=path.join(sdk,'build/native/include'),loader=path.join(sdk,'build/native/x64/WebView2Loader.dll');
await fs.writeFile(path.join(build,'HBEngine.ico'),icon());
const resource=path.join(build,'HBEngine-resource.o'),windres=path.join(path.dirname(compiler),'windres.exe');
await exec(windres,['--use-temp-file','-I',relative(build),'-I','native/desktop','native/desktop/HBEngine.rc',relative(resource)],{cwd:root,windowsHide:true,env:compilerEnv});
const executable=path.join(output,'HBEngine.exe');
await exec(compiler,['-std=c++17','-O2','-s','-static','-municode','-mwindows','-I',relative(include),'native/desktop/HBEngine.cpp',relative(resource),'-o',relative(executable),'-lole32','-lshell32','-ldwmapi','-ladvapi32','-luuid'],{cwd:root,windowsHide:true,env:compilerEnv,maxBuffer:4194304});
const {stdout}=await exec(path.join(path.dirname(compiler),'objdump.exe'),['-p',relative(executable)],{cwd:root,windowsHide:true,env:compilerEnv,maxBuffer:16777216});if(/DLL Name: (?:libgcc|libstdc\+\+|libwinpthread)/i.test(stdout))throw Error('MSYS2 런타임 DLL 의존성');
await fs.mkdir(path.join(output,'runtime'),{recursive:true});await fs.copyFile(process.execPath,path.join(output,'runtime/node.exe'));await fs.copyFile(loader,path.join(output,'WebView2Loader.dll'));
await fs.mkdir(path.join(output,'licenses'),{recursive:true});await fs.copyFile(path.join(sdk,'LICENSE.txt'),path.join(output,'licenses/WebView2-SDK.txt'));
const nodeLicense=path.join(build,'Node-'+process.version+'-LICENSE.txt');await download('https://raw.githubusercontent.com/nodejs/node/'+process.version+'/LICENSE',nodeLicense);await fs.copyFile(nodeLicense,path.join(output,'licenses/Node.txt'));
await fs.copyFile(path.join(root,'node_modules/three/LICENSE'),path.join(output,'licenses/Three.txt'));
for(const name of ['prototype','tools','docs','native/include','node_modules/three'])await fs.cp(path.join(root,name),path.join(output,name),{recursive:true,filter:file=>!file.includes(path.sep+'screenshots'+path.sep)});
await fs.copyFile(path.join(root,'package.json'),path.join(output,'package.json'));
const {ProjectService}=await import('./project-service.mjs');const sample=path.join(output,'Projects/QuietGarden');await new ProjectService(sample).init(true);
const {ensureProjectManifest}=await import('./project-manifest.mjs');await ensureProjectManifest(sample,'QuietGarden');
await fs.copyFile(executable,path.join(root,'HBEngine.exe'));
await fs.writeFile(path.join(output,'실행 안내.txt'),'HBEngine.exe를 더블클릭하면 프로젝트 선택 창을 열어요.\r\n.hbproject 파일을 더블클릭하거나 실행 파일 위로 끌어 열 수 있어요.\r\nMicrosoft WebView2 Runtime이 필요해요. Node.js는 동봉되어 있어요.\r\nC++ 빌드에는 C++17 컴파일러가 필요해요.\r\n');
console.log('HBEngine.exe: '+path.join(root,'HBEngine.exe')+'\n배포 폴더: '+output);
