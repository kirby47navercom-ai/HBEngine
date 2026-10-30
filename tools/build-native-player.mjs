import fs from 'node:fs/promises';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {pathToFileURL} from 'node:url';
import {prepareNative,jsonInclude} from './prepare-native.mjs';
const root=path.resolve(import.meta.dirname,'..'),exec=promisify(execFile);
export async function buildNativePlayer(output=path.join(root,'dist/HBEngine/HBNativePlayer.exe')){
 await prepareNative();await fs.mkdir(path.dirname(output),{recursive:true});const compiler=process.env.CXX||'C:/msys64/ucrt64/bin/g++.exe',env={...process.env,PATH:path.dirname(compiler)+path.delimiter+process.env.PATH};
 const relative=file=>path.relative(root,file).split(path.sep).join('/');await exec(compiler,['-std=c++17','-O2','-s','-static','-municode','-mwindows','-I','native/include','-I',relative(jsonInclude),'native/desktop/HBNativePlayer.cpp','-o',relative(output),'-ld3d11','-ldxgi','-ld3dcompiler','-lole32','-lshell32','-luuid','-lwindowscodecs','-lcrypt32','-lgdi32','-ldwmapi','-ladvapi32'],{cwd:root,env,windowsHide:true,timeout:240000,maxBuffer:4194304});const shaders=path.join(path.dirname(output),'Shaders');await fs.mkdir(shaders,{recursive:true});await exec(output,['--prepare-shaders',shaders],{cwd:root,env,windowsHide:true,timeout:120000,maxBuffer:1000000});return output;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(await buildNativePlayer(process.argv[2]));
