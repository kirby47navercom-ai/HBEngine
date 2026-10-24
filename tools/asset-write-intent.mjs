import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';

const uuid=/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/;
const digest=value=>createHash('sha256').update(value).digest('hex');
const conflict=message=>Object.assign(Error(message),{status:409,code:'WRITE_RECOVERY_CONFLICT'});
const supported=relative=>/^(Assets|Source|Settings)\//i.test(relative)||!relative.includes('/')&&!relative.startsWith('.');
async function fingerprint(file){
 try{const hash=createHash('sha256');for await(const bytes of createReadStream(file))hash.update(bytes);return hash.digest('hex');}catch(error){if(error.code==='ENOENT')return null;throw error;}
}
const intentPath=(project,id)=>project.resolve('Saved/WriteIntents/'+id+'.json',true,false);
async function remove(file){await fs.unlink(file).catch(error=>{if(error.code!=='ENOENT')throw error;});}

// A small write-ahead identity record, not a copy of the asset. The atomic
// content rename is the publication point; recovery completes its stable ID.
export async function prepareAssetWrite(project,relative,data){
 if(!supported(relative))return null;
 const target=await project.resolve(relative,true,false),id=randomUUID(),assetId=project.index[relative]?.id||randomUUID(),record={version:1,id,path:relative,assetId,beforeHash:await fingerprint(target),afterHash:digest(data)},file=await intentPath(project,id),temp=file+'.'+randomUUID()+'.tmp';
 await fs.mkdir(path.dirname(file),{recursive:true});try{await fs.writeFile(temp,JSON.stringify(record),{flag:'wx',flush:true});await fs.rename(temp,file);}finally{await remove(temp);}
 return {...record,file,temporary:target+'.'+id+'.tmp'};
}
export async function finishAssetWrite(intent){if(intent)await remove(intent.file);}

export async function publishAssetText(project,relative,data,guard=()=>{},{create=false}={}){
 project.assertWritable?.();const file=await project.resolve(relative,true,false);if(create){const exists=await fs.lstat(file).then(()=>true,error=>{if(error.code==='ENOENT')return false;throw error;});if(exists)throw Object.assign(Error('같은 이름의 에셋이 있어요.'),{code:'EEXIST'});}
 const intent=await prepareAssetWrite(project,relative,data),temp=intent?.temporary||file+'.'+randomUUID()+'.tmp';let published=false,collision=false,tempCreated=false,publicationAttempted=false;
 try{
  if(create&&intent&&intent.beforeHash!==null)throw Object.assign(Error('같은 이름의 에셋이 있어요.'),{code:'EEXIST'});
  guard();await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(temp,data,{flag:'wx',flush:true});tempCreated=true;guard();if(intent&&await fingerprint(file)!==intent.beforeHash)throw Object.assign(Error('저장 중 외부 변경을 보존했어요: '+relative),{status:409,code:'REVISION_CONFLICT'});guard();publicationAttempted=true;if(create)await fs.link(temp,file);else await fs.rename(temp,file);published=true;if(create)await remove(temp);
  const entry=project.index[relative]??={id:intent?.assetId||randomUUID()};if(intent){if(entry.id&&entry.id!==intent.assetId)throw conflict('저장 중 에셋 ID가 변경됐어요: '+relative);entry.id=intent.assetId;}
  await project.saveIndex();await finishAssetWrite(intent);
 }catch(error){collision=error.code==='EEXIST'&&!tempCreated;if(intent&&!published){if(!publicationAttempted)await finishAssetWrite(intent);else{const actual=await fingerprint(file);if(actual===intent.beforeHash&&actual!==intent.afterHash)await finishAssetWrite(intent);}}throw error;
 }finally{if(!collision)await remove(temp);}
}

async function readWriteIntent(project,id){
 if(typeof id!=='string'||!uuid.test(id))throw Error('저장 ID 복구 기록을 선택하세요.');const file=await intentPath(project,id),stat=await fs.stat(file);if(stat.size>16384)throw conflict('저장 ID 기록 크기를 확인하세요.');const row=JSON.parse(await fs.readFile(file,'utf8'));
 if(row.version!==1||row.id!==id||typeof row.path!=='string'||!supported(row.path)||typeof row.assetId!=='string'||!row.assetId||row.assetId.length>200||![row.beforeHash,row.afterHash].every(v=>v===null||typeof v==='string'&&/^[a-f\d]{64}$/.test(v))||row.afterHash===null)throw conflict('저장 ID 기록을 확인하세요.');return{row,file,target:await project.resolve(row.path,true,false)};
}
export async function recoverAssetWrites(project,{tolerateConflicts=false}={}){
 let names;try{names=await fs.readdir(await project.resolve('Saved/WriteIntents',false,false));}catch(error){if(error.code==='ENOENT')return project.writeRecovery={completed:0,unpublished:0,pending:[]};throw error;}
 const inspected=[],idsByPath=new Map(),decisions=[],pending=[];for(const name of names){const id=name.slice(0,-5);if(!name.endsWith('.json')||!uuid.test(id))continue;const item=await readWriteIntent(project,id),actual=await fingerprint(item.target);inspected.push({...item,actual});const key=item.row.path.toLowerCase();if(!idsByPath.has(key))idsByPath.set(key,new Set());idsByPath.get(key).add(item.row.assetId);}
 for(const item of inspected){const {row,actual}=item,published=actual===row.afterHash;if(actual!==row.beforeHash&&actual!==row.afterHash||published&&project.index[row.path]?.id&&project.index[row.path].id!==row.assetId||idsByPath.get(row.path.toLowerCase()).size>1)pending.push({id:'write:'+row.id,paths:[row.path],type:'writeIntent'});else decisions.push({...item,published});}
 if(pending.length&&!tolerateConflicts){project.writeRecovery={completed:0,unpublished:0,pending};throw conflict('복구할 저장 이후 외부 내용·에셋 ID 변경을 보존했어요: '+pending[0].paths[0]);}
 // Check every intent before touching metadata. Content files are never overwritten.
 for(const {row,published}of decisions)if(published)project.index[row.path]={...project.index[row.path],id:row.assetId};
 if(decisions.some(d=>d.published))await project.saveIndex();
 for(const {row,file,target}of decisions){await remove(target+'.'+row.id+'.tmp');await remove(file);}
 return project.writeRecovery={completed:decisions.filter(d=>d.published).length,unpublished:decisions.filter(d=>!d.published).length,pending};
}

export async function inspectAssetWrite(project,transaction){
 const {row,target}=await readWriteIntent(project,typeof transaction==='string'&&transaction.startsWith('write:')?transaction.slice(6):null),actual=await fingerprint(target),stat=await fs.stat(target).catch(error=>{if(error.code==='ENOENT')return null;throw error;}),indexId=project.index[row.path]?.id||null,disk={hash:actual,bytes:stat?.size||0,exists:actual!==null};return{id:transaction,type:'writeIntent',state:'prepared',revision:digest(JSON.stringify([row,disk,indexId])),rows:[{path:row.path,availableChoices:['disk'],conflict:true,before:{hash:row.beforeHash,bytes:null,exists:row.beforeHash!==null},after:{hash:row.afterHash,bytes:null,exists:true},disk,currentAssetId:indexId,recordedAssetId:row.assetId}]};
}
export async function resolveAssetWrite(project,{transaction,expectedRevision,choices={},dryRun=false},guard=()=>{}){
 if(typeof dryRun!=='boolean'||typeof expectedRevision!=='string'||!choices||Object.getPrototypeOf(choices)!==Object.prototype)throw Error('저장 ID 복구 기준·선택을 확인하세요.');guard();const view=await inspectAssetWrite(project,transaction);if(view.revision!==expectedRevision)throw conflict('복구할 파일·에셋 ID가 변경됐어요. 다시 조회하세요.');const path=view.rows[0].path;for(const[p,value]of Object.entries(choices))if(p!==path||value!=='disk')throw Error('저장 ID 기록에는 현재 디스크 보존만 선택할 수 있어요.');const valid=choices[path]==='disk',preview={transaction,revision:view.revision,decisions:[{path,choice:valid?'disk':null}],unresolved:valid?[]:[path],unresolvedCount:valid?0:1,valid};if(dryRun)return{...preview,dryRun:true};if(!valid)throw conflict('현재 디스크 보존을 명시적으로 선택하세요.');
 const {row,file,target}=await readWriteIntent(project,transaction.slice(6));if((await inspectAssetWrite(project,transaction)).revision!==view.revision)throw conflict('복구 준비 중 기록이 변경됐어요.');const previous=project.index[path],selectedId=view.rows[0].currentAssetId||row.assetId;guard();if(view.rows[0].disk.exists)project.index[path]={...previous,id:selectedId};else delete project.index[path];
 try{await project.saveIndex();guard();if(await fingerprint(target)!==view.rows[0].disk.hash||JSON.stringify((await readWriteIntent(project,row.id)).row)!==JSON.stringify(row))throw conflict('복구 중 외부 변경을 보존했어요.');await remove(file);}catch(error){if(previous)project.index[path]=previous;else delete project.index[path];await project.saveIndex();throw error;}
 const relativeTemp=row.path+'.'+row.id+'.tmp';let retainedTemporary;try{const temporary=await project.resolve(relativeTemp,true,false),tempHash=await fingerprint(temporary);if(tempHash===row.afterHash)await remove(temporary);else if(tempHash)retainedTemporary=relativeTemp;}catch{retainedTemporary=relativeTemp;}await recoverAssetWrites(project,{tolerateConflicts:true});return{...preview,ok:true,state:'resolved',contentWritten:false,...(retainedTemporary?{retainedTemporary}:{})};
}
