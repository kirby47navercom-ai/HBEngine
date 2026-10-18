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
 const file=await project.resolve(relative,true,false);if(create){const exists=await fs.lstat(file).then(()=>true,error=>{if(error.code==='ENOENT')return false;throw error;});if(exists)throw Object.assign(Error('같은 이름의 에셋이 있어요.'),{code:'EEXIST'});}
 const intent=await prepareAssetWrite(project,relative,data),temp=intent?.temporary||file+'.'+randomUUID()+'.tmp';let published=false,collision=false,tempCreated=false,publicationAttempted=false;
 try{
  if(create&&intent&&intent.beforeHash!==null)throw Object.assign(Error('같은 이름의 에셋이 있어요.'),{code:'EEXIST'});
  guard();await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(temp,data,{flag:'wx',flush:true});tempCreated=true;guard();if(intent&&await fingerprint(file)!==intent.beforeHash)throw Object.assign(Error('저장 중 외부 변경을 보존했어요: '+relative),{status:409,code:'REVISION_CONFLICT'});guard();publicationAttempted=true;if(create)await fs.link(temp,file);else await fs.rename(temp,file);published=true;if(create)await remove(temp);
  const entry=project.index[relative]??={id:intent?.assetId||randomUUID()};if(intent){if(entry.id&&entry.id!==intent.assetId)throw conflict('저장 중 에셋 ID가 변경됐어요: '+relative);entry.id=intent.assetId;}
  await project.saveIndex();await finishAssetWrite(intent);
 }catch(error){collision=error.code==='EEXIST'&&!tempCreated;if(intent&&!published){if(!publicationAttempted)await finishAssetWrite(intent);else{const actual=await fingerprint(file);if(actual===intent.beforeHash&&actual!==intent.afterHash)await finishAssetWrite(intent);}}throw error;
 }finally{if(!collision)await remove(temp);}
}

export async function recoverAssetWrites(project){
 let names;try{names=await fs.readdir(await project.resolve('Saved/WriteIntents',false,false));}catch(error){if(error.code==='ENOENT')return {completed:0,unpublished:0};throw error;}
 const decisions=[];for(const name of names){const id=name.slice(0,-5);if(!name.endsWith('.json')||!uuid.test(id))continue;const file=await intentPath(project,id),stat=await fs.stat(file);if(stat.size>16384)throw conflict('저장 ID 기록 크기를 확인하세요.');const row=JSON.parse(await fs.readFile(file,'utf8'));
  if(row.version!==1||row.id!==id||typeof row.path!=='string'||!supported(row.path)||typeof row.assetId!=='string'||!row.assetId||row.assetId.length>200||![row.beforeHash,row.afterHash].every(v=>v===null||typeof v==='string'&&/^[a-f\d]{64}$/.test(v))||row.afterHash===null)throw conflict('저장 ID 기록을 확인하세요.');
  const target=await project.resolve(row.path,true,false),actual=await fingerprint(target);if(actual!==row.beforeHash&&actual!==row.afterHash)throw conflict('복구할 저장 이후 외부 변경을 보존했어요: '+row.path);const published=actual===row.afterHash;
  if(published&&project.index[row.path]?.id&&project.index[row.path].id!==row.assetId)throw conflict('다른 에셋 ID를 보존했어요: '+row.path);
  decisions.push({row,file,target,published});
 }
 // Check every intent before touching metadata. Content files are never overwritten.
 for(const {row,published}of decisions)if(published)project.index[row.path]={...project.index[row.path],id:row.assetId};
 if(decisions.some(d=>d.published))await project.saveIndex();
 for(const {row,file,target}of decisions){await remove(target+'.'+row.id+'.tmp');await remove(file);}
 return {completed:decisions.filter(d=>d.published).length,unpublished:decisions.filter(d=>!d.published).length};
}
