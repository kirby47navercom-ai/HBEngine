import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {prepareNative,jsonInclude} from './prepare-native.mjs';
const root=path.resolve(import.meta.dirname,'..'),work=await fs.mkdtemp(path.join(root,'native/build/engine-171-native-')),exec=promisify(execFile),compiler=process.env.CXX||'C:/msys64/ucrt64/bin/g++.exe',binary=path.join(work,'sampler.exe'),env={...process.env,PATH:path.dirname(compiler)+path.delimiter+process.env.PATH};
try{await prepareNative();await exec(compiler,['-std=c++17','-O2','-Wall','-Wextra','-Werror','-I','native/include','-I',path.relative(root,jsonInclude),'native/tests/sampler-state-171.cpp','-o',path.relative(root,binary)],{cwd:root,env,windowsHide:true,timeout:60000,maxBuffer:2097152});const {stdout}=await exec(binary,[],{cwd:work,env,windowsHide:true,timeout:30000}),result=JSON.parse(stdout);assert.equal(result.passed,true);await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({work,...result}));}catch(error){await fs.writeFile(path.join(work,'failure.json'),JSON.stringify({message:error.message,stderr:error.stderr},null,2));throw error;}finally{await fs.unlink(binary).catch(e=>{if(e.code!=='ENOENT')throw e;});}
