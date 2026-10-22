import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {compileNativeTypeAsset,checkNativeTypeIdentity,nativeTypeMarker} from '../prototype/native-type-assets.js';
import {commitAssetBatch} from './asset-transaction.mjs';

const isType=name=>name.endsWith('.hbtypes.json');
const read=async(project,name)=>fs.readFile(await project.canonicalFile(name),'utf8').catch(error=>{if(error.code==='ENOENT')return null;throw error;});
const conflict=message=>Object.assign(Error(message),{status:409,code:'REVISION_CONFLICT'});
export async function appendNativeTypeRows(project,rows,drafts){
 const changed=rows.filter(r=>isType(r.path));if(!changed.length)return [];
 const guards=[],libraries=new Map();
 for(const file of (await project.files()).filter(f=>isType(f.path))){if(drafts.has(file.path.toLowerCase()))continue;const raw=await read(project,file.path);if(raw===null)throw conflict('타입 원본이 삭제됐어요: '+file.path);libraries.set(file.path,JSON.parse(raw));guards.push({path:file.path,expectedFingerprint:createHash('sha256').update(raw).digest('hex')});}
 for(const row of changed){if(row.after===null)throw Error('타입 라이브러리 삭제에는 참조 이관이 필요해요.');const next=JSON.parse(row.after),before=row.before===null?null:JSON.parse(row.before);if(before)checkNativeTypeIdentity(before,next);libraries.set(row.path,next);}
 const ids=new Set(),names=new Set();for(const data of libraries.values()){if(ids.has(data.id)||names.has(data.namespace))throw Error('타입 라이브러리 ID·namespace가 중복돼요.');ids.add(data.id);names.add(data.namespace);}
 for(const row of changed){const data=JSON.parse(row.after),built=compileNativeTypeAsset(data),current=await read(project,built.path),old=row.before===null?null:compileNativeTypeAsset(JSON.parse(row.before)).header;
  if(current!==null&&(!current.startsWith(nativeTypeMarker(data))||old===null||current!==old))throw conflict('생성 헤더가 외부에서 변경됐어요: '+built.path);
  const supplied=rows.find(r=>r.path.toLowerCase()===built.path.toLowerCase());if(supplied){if(supplied.after!==built.header)throw Error('타입 정의와 생성 헤더가 달라요.');}
  else if(current!==built.header)rows.push({path:built.path,before:current,after:built.header});
  drafts.set(built.path.toLowerCase(),built.header);
 }
 if(rows.length>64||rows.reduce((n,r)=>n+Buffer.byteLength(r.before||'')+Buffer.byteLength(r.after||''),0)>8388608)throw Error('타입과 생성 헤더 저장 묶음의64파일·8MB 범위를 확인하세요.');
 return guards;
}
export async function publishNativeTypeAsset(project,relative,text,guard=()=>{},{create=false}={}){
 const file=await project.canonicalFile(relative),name=path.relative(project.root,file).split(path.sep).join('/'),before=await read(project,name);
 if(create&&before!==null)throw conflict('같은 이름의 에셋이 있어요.');
 const rows=[{path:name,before,after:text}],drafts=new Map([[name.toLowerCase(),text]]),guards=await appendNativeTypeRows(project,rows,drafts);
 for(const f of (await project.files()).filter(f=>f.kind==='blueprint'))await project.validateBlueprint(f.path,JSON.parse(await read(project,f.path)),drafts);
 return commitAssetBatch(project,rows,guard,async()=>{guard();for(const g of guards)if((await project.inspectFingerprint(g.path)).revision!==g.expectedFingerprint)throw conflict('저장 중 타입 원본이 변경됐어요: '+g.path);},{retainJournal:false});
}
