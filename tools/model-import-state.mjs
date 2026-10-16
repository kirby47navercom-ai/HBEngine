import fs from 'node:fs/promises';
import path from 'node:path';
import {modelImportDefaults,normalizeModelImport,validModelImport} from '../prototype/model-import.js';
export const modelSource=source=>typeof source==='string'&&/\.(gltf|glb|obj|fbx)$/i.test(source);
export async function readModelImport(project,source){
 const file=await project.resolve(source+'.import.json',true);let stat;try{stat=await fs.stat(file);}catch(error){if(error.code==='ENOENT')return null;throw error;}
 if(stat.size>16777216)throw Error('모델 가져오기 메타데이터는 16 MiB 이하로 분할하세요.');const cache=project.modelImportCache??=new Map(),signature=stat.mtimeMs+':'+stat.size,cached=cache.get(source);if(cached?.signature===signature)return cached.data;
 const data=normalizeModelImport(JSON.parse(await fs.readFile(file,'utf8')));if(!validModelImport(data)||await project.canonicalFile(data.source)!==await project.canonicalFile(source))throw Error('모델 가져오기 설정 검증 실패: '+source);cache.set(source,{signature,data});return data;
}
export function importDescriptor(source,entry,previous=null){return {...previous,version:2,name:previous?.name||path.posix.basename(source).replace(/\.[^.]+$/,''),source,sourceId:entry.id,sourceHash:entry.hash,settings:structuredClone(previous?.settings||{...modelImportDefaults,convertUnits:!previous}),subassets:structuredClone(entry.subassets||[]),unresolvedSubassets:structuredClone(entry.unresolvedSubassets||[]),detected:entry.modelDetected||null,warnings:entry.modelWarnings||[]};}
export async function writeModelImport(project,source,entry){const previous=await readModelImport(project,source),data=importDescriptor(source,entry,previous);if(!validModelImport(data))throw Error('모델 가져오기 설정을 저장할 수 없어요.');await project.write(source+'.import.json',JSON.stringify(data,null,2));project.modelImportCache?.delete(source);return data;}
