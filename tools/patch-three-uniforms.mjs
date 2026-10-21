import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
const engineRoot=path.resolve(import.meta.dirname,'..'),files=['node_modules/three/src/renderers/common/UniformsGroup.js','node_modules/three/build/three.webgpu.js'],before='a[ offset + 4 ] !== v.w',after='a[ offset + 3 ] !== v.w';
// The shipped import maps use this canonical WebGPU bundle (also forced GL).
// Compare the fourth component itself; the following uniform is unrelated.
export async function ensureThreeUniformPatch(root=engineRoot,{checkOnly=false}={}){
 const base=await fs.realpath(root),pending=[];for(const relative of files){const file=await fs.realpath(path.resolve(base,relative)),inside=path.relative(base,file);if(inside.startsWith('..')||path.isAbsolute(inside))throw Error('엔진 밖의 공유 Three 파일은 수정하지 않아요: '+relative);const source=await fs.readFile(file,'utf8'),old=source.split(before).length-1,fixed=source.split(after).length-1;if(old===1&&fixed===0)pending.push({file,relative,source,next:source.replace(before,after)});else if(old!==0||fixed!==1)throw Error('Three Vector4 갱신 코드가 바뀌었어요. 패치 대상을 다시 확인하세요: '+relative);}
 if(!checkOnly){const written=[];try{for(const item of pending){written.push(item);await fs.writeFile(item.file,item.next);}}catch(error){for(const item of written)await fs.writeFile(item.file,item.source);throw error;}}
 return {passed:true,checkOnly,needsPatch:checkOnly?pending.map(p=>p.relative):[],changed:checkOnly?[]:pending.map(p=>p.relative),verifiedFiles:files,scope:'Fourth-component dirty comparison only. Canonical source and consumed WebGPU/forcedGL bundle; unused min/nodes variants are not patched. No runtime wrapper, frame work or cache.'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const result=await ensureThreeUniformPatch(engineRoot,{checkOnly:process.argv.includes('--check')});console.log(JSON.stringify(result));if(result.needsPatch.length)process.exitCode=1;}
