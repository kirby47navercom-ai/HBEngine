import fs from 'node:fs/promises';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {prepareNative,jsonInclude} from './prepare-native.mjs';
import {pruneTestArtifacts} from './test-artifacts.mjs';
const root=path.resolve(import.meta.dirname,'..'),dir=await fs.mkdtemp(path.join(root,'native/build/batch-165-gpu-')),compiler='C:/msys64/ucrt64/bin/g++.exe',exec=promisify(execFile);await prepareNative();try{const binary=path.relative(root,path.join(dir,'probe.exe')),env={...process.env,PATH:path.dirname(compiler)+path.delimiter+process.env.PATH};await exec(compiler,['-std=c++17','-O1','-Wall','-Wextra','-Werror','-I','native/include','-I',path.relative(root,jsonInclude),'native/tests/batch-165.cpp','-o',binary,'-ld3d11','-ldxgi','-ld3dcompiler','-lole32','-luser32','-lgdi32'],{cwd:root,env,windowsHide:true,timeout:120000});const result=await exec(path.resolve(root,binary),[],{cwd:root,env,windowsHide:true,timeout:30000});await fs.writeFile(path.join(dir,'acceptance.json'),JSON.stringify({passed:true,output:result.stdout},null,2));console.log(result.stdout+dir);}finally{await pruneTestArtifacts(dir);}
