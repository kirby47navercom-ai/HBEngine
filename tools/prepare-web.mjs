import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL} from 'node:url';
import {runTool} from './mobile-android.mjs';
import {webCapability} from './build-web.mjs';

export async function prepareWeb({signal,onProgress=()=>{}}={}){
  const sdk=path.resolve(process.env.HB_EMSDK_ROOT||path.join(os.homedir(),'.codex/toolchains/emsdk'));
  try{await fs.access(path.join(sdk,'emsdk.py'));}catch{
    await fs.mkdir(path.dirname(sdk),{recursive:true});onProgress('Emscripten SDK 다운로드');
    await runTool('git',['clone','--depth','1','https://github.com/emscripten-core/emsdk.git',sdk],{signal,timeout:180000});
  }
  for(const action of ['install','activate']){onProgress('Emscripten 6.0.12 '+action);await runTool(process.env.HB_PYTHON||'python',[path.join(sdk,'emsdk.py'),action,'6.0.12'],{cwd:sdk,signal,timeout:1200000});}
  const result=await webCapability();if(!result.ready)throw Error(result.error);return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)prepareWeb({onProgress:console.log}).then(result=>console.log(result.sdk)).catch(error=>{console.error(error.message);process.exitCode=1;});
