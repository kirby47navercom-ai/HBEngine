import {nativeTypeClosure,nativeTypeImports} from '../prototype/native-type-graph.js';
import {reconcileNativeTypeDefaults} from '../prototype/native-type-defaults.js';
import {isNativeTypeAssetPath,nativeTypeAssetKind} from '../prototype/native-type-paths.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {compileNativeTypeAsset,checkNativeTypeIdentity,nativeTypeMarker,validNativeTypeAsset} from '../prototype/native-type-assets.js';
import {commitAssetBatch} from './asset-transaction.mjs';
import {planNativeTypeMigration} from './native-type-migration.mjs';

const isType=isNativeTypeAssetPath;
const read=async(project,name)=>fs.readFile(await project.canonicalFile(name),'utf8').catch(error=>{if(error.code==='ENOENT')return null;throw error;});
const conflict=message=>Object.assign(Error(message),{status:409,code:'REVISION_CONFLICT'});
export async function appendNativeTypeRows(project,rows,drafts,{restore}={}){
 const changed=rows.filter(r=>isType(r.path));if(!changed.length)return [];
 if(restore&&(rows.length!==restore.rows.length||rows.some(row=>!restore.rows.some(r=>r.path===row.path&&r.before===row.after&&r.after===row.before))))throw conflict('자료형 복원 기록 뒤 외부 변경이 있어요. 저장 묶음을 확인하세요.');
 const guards=[],beforeLibraries=new Map(),libraries=new Map();
 for(const file of (await project.files()).filter(f=>isType(f.path))){const raw=await read(project,file.path);if(raw===null)throw conflict('타입 원본이 삭제됐어요: '+file.path);const data=JSON.parse(raw);beforeLibraries.set(file.path,data);libraries.set(file.path,data);if(!drafts.has(file.path.toLowerCase()))guards.push({path:file.path,expectedFingerprint:createHash('sha256').update(raw).digest('hex')});}
 for(const row of changed){
  if(row.after===null){if(!restore)throw Error('타입 라이브러리 삭제에는 참조 이관이 필요해요.');libraries.delete(row.path);continue;}
  const next=JSON.parse(row.after);if(!validNativeTypeAsset(next,nativeTypeAssetKind(row.path)))throw Error('자료형 에셋 종류·선언을 확인하세요: '+row.path);
  const before=row.before===null?null:JSON.parse(row.before);if(before){try{checkNativeTypeIdentity(before,next);}catch(error){if(!restore)throw error;checkNativeTypeIdentity(next,before);}}
  libraries.set(row.path,next);
 }
 const aliases=new Map();for(const data of [...beforeLibraries.values(),...libraries.values()])for(const imported of nativeTypeImports(data)){const canonical=path.relative(project.root,await project.canonicalFile(imported)).split(path.sep).join('/');if(canonical!==imported)aliases.set(imported,canonical);}
 const graph=map=>new Map([...map,...[...aliases].filter(([,canonical])=>map.has(canonical)).map(([alias,canonical])=>[alias,map.get(canonical)])]);
 const ids=new Set(),names=new Set();for(const data of libraries.values()){if(ids.has(data.id)||names.has(data.namespace))throw Error('타입 라이브러리 ID·namespace가 중복돼요.');ids.add(data.id);names.add(data.namespace);}
 const ordered=[...new Set([...libraries.values()].flatMap(data=>nativeTypeClosure(data,graph(libraries))))];
 for(const current of ordered){
  const name=[...libraries].find(([,data])=>data===current)?.[0];if(!name)throw Error('자료형 원본 경로가 없어요.');
  if(!restore&&beforeLibraries.has(name)){
   const next=reconcileNativeTypeDefaults(beforeLibraries.get(name),current,{beforeLibraries:graph(beforeLibraries),libraries:graph(libraries)});
   if(JSON.stringify(next)!==JSON.stringify(current)){
    const existing=rows.find(r=>r.path===name),text=JSON.stringify(next,null,2);if(existing)existing.after=text;else rows.push({path:name,before:await read(project,name),after:text});
    libraries.set(name,next);drafts.set(name.toLowerCase(),text);
   }
  }
 }
 for(const [name,data]of libraries){
  const built=compileNativeTypeAsset(data,{libraries:graph(libraries)}),previous=beforeLibraries.get(name),old=previous?compileNativeTypeAsset(previous,{libraries:graph(beforeLibraries)}).header:null;
  const row=rows.find(r=>r.path===name);if(!row&&old===built.header)continue;
  const current=await read(project,built.path),supplied=rows.find(r=>r.path.toLowerCase()===built.path.toLowerCase());
  if(restore){if(supplied){if(supplied.after!==built.header)throw Error('자료형 복원 헤더가 저장 기록과 달라요.');}else if(current!==built.header)throw conflict('자료형 복원 헤더가 외부에서 변경됐어요.');}
  else{
   if(current!==null&&(!current.startsWith(nativeTypeMarker(data))||old===null||current!==old))throw conflict('생성 헤더가 외부에서 변경됐어요: '+built.path);
   if(supplied){if(supplied.after!==built.header)throw Error('타입 정의와 생성 헤더가 달라요.');}
   else if(current!==built.header)rows.push({path:built.path,before:current,after:built.header});
  }
  drafts.set(built.path.toLowerCase(),built.header);
 }
 if(restore)for(const row of changed.filter(r=>r.after===null)){
  const data=JSON.parse(row.before),built=compileNativeTypeAsset(data,{libraries:graph(beforeLibraries)}),header=rows.find(r=>r.path===built.path);if(header?.after!==null)throw Error('자료형 복원 헤더 삭제 기록을 확인하세요.');
 }
 if(!restore&&rows.length>64||rows.reduce((n,r)=>n+Buffer.byteLength(r.before||'')+Buffer.byteLength(r.after||''),0)>8388608)throw Error('타입과 생성 헤더 저장 묶음의64파일·8MB 범위를 확인하세요.');
 const written=new Set(rows.map(r=>r.path.toLowerCase()));return guards.filter(g=>!written.has(g.path.toLowerCase()));
}

export async function publishNativeTypeAsset(project,relative,text,guard=()=>{},{create=false}={}){
 const file=await project.canonicalFile(relative),name=path.relative(project.root,file).split(path.sep).join('/'),before=await read(project,name);
 if(create&&before!==null)throw conflict('같은 이름의 에셋이 있어요.');
 const rows=[{path:name,before,after:text}],drafts=new Map([[name.toLowerCase(),text]]),guards=await appendNativeTypeRows(project,rows,drafts);
 const migration=await planNativeTypeMigration(project,rows,drafts);guards.push(...migration?.guards||[]);
 if(!migration)for(const f of (await project.files()).filter(f=>f.kind==='blueprint'))await project.validateBlueprint(f.path,JSON.parse(drafts.get(f.path.toLowerCase())??await read(project,f.path)),drafts);
 const result=await commitAssetBatch(project,rows,guard,async phase=>{guard();await migration?.checkInventory(phase);for(const g of guards)if((await project.inspectFingerprint(g.path)).revision!==g.expectedFingerprint)throw conflict('저장 중 타입 원본이 변경됐어요: '+g.path);},{retainJournal:!!migration});return {...result,...migration?{migration:{values:migration.values,paths:migration.paths}}:{}};
}
