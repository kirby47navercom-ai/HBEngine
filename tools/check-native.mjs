import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
fs.mkdirSync('native/build',{recursive:true});
const compiler=process.env.CXX||(process.platform==='win32'&&fs.existsSync('C:/msys64/ucrt64/bin/g++.exe')?'C:/msys64/ucrt64/bin/g++.exe':'g++');
const env={...process.env,PATH:path.dirname(compiler)+path.delimiter+process.env.PATH},binary=process.platform==='win32'?'native/build/core-test.exe':'native/build/core-test';
const compile=spawnSync(compiler,['-std=c++17','-Wall','-Wextra','-Werror','-I','native/include','native/tests/core.cpp','-o',binary],{env,encoding:'utf8',windowsHide:true});
if(compile.error||compile.status!==0){process.stderr.write(compile.stderr||String(compile.error));process.exit(1);}
const run=spawnSync(path.resolve(binary),[],{env,encoding:'utf8',windowsHide:true});process.stdout.write(run.stdout||'');if(run.error||run.status!==0){process.stderr.write(run.stderr||String(run.error));process.exit(1);}
