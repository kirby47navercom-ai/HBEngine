import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';

const hash=text=>text===null?null:createHash('sha256').update(text).digest('hex');
const read=file=>fs.readFile(file,'utf8').catch(error=>{if(error.code==='ENOENT')return null;throw error;});
const conflict=message=>Object.assign(Error(message),{status:409,code:'TRANSACTION_CONFLICT'});
async function put(file,text,create=false){
  await fs.mkdir(path.dirname(file),{recursive:true});const temp=file+'.'+randomUUID()+'.tmp';
  try{await fs.writeFile(temp,text,{flag:'wx',flush:true});if(create)await fs.link(temp,file);else await fs.rename(temp,file);}
  finally{await fs.unlink(temp).catch(error=>{if(error.code!=='ENOENT')throw error;});}
}
const folder=project=>path.join(project.root,'Saved','Transactions');
const journalFile=(project,id)=>{if(typeof id!=='string'||!/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/.test(id))throw Error('저장 묶음 ID를 확인하세요.');return path.join(folder(project),id+'.json');};
const store=(project,journal)=>put(journalFile(project,journal.id),JSON.stringify(journal));

export async function readAssetTransaction(project,id){
  const file=await project.resolve('Saved/Transactions/'+path.basename(journalFile(project,id)),false,false),stat=await fs.stat(file);
  if(stat.size>32*1024*1024)throw Error('저장 기록 크기 초과');const journal=JSON.parse(await fs.readFile(file,'utf8'));
  if(journal.version!==1||journal.id!==id||!['prepared','committed','rolledBack'].includes(journal.state)||!Array.isArray(journal.rows)||!journal.rows.length||journal.rows.length>64)throw Error('저장 기록 형식 오류');
  const paths=new Set();for(const row of journal.rows){
    if(typeof row.path!=='string'||!/^(Assets|Source|Settings)\//.test(row.path)||paths.has(row.path.toLowerCase())||[row.before,row.after].some(t=>t!==null&&typeof t!=='string')||hash(row.before)!==row.beforeHash||hash(row.after)!==row.afterHash)throw Error('저장 기록 검증 실패');
    await project.resolve(row.path,true,false);paths.add(row.path.toLowerCase());
  }
  return journal;
}

async function rollback(project,journal,writingPaths=null){
  // Check the entire group before restoring anything. Never replace a third
  // party's edit with an older backup when recovery finds a conflict.
  const current=[];for(const row of journal.rows){if(writingPaths&&!writingPaths.has(row.path))continue;const file=await project.resolve(row.path,true,false),text=await read(file);if(hash(text)!==row.beforeHash&&hash(text)!==row.afterHash)throw conflict('복구 중 외부 변경을 발견했어요: '+row.path);current.push({row,file,text});}
  for(const {row,file,text} of current.reverse()){
    if(hash(await read(file))!==hash(text))throw conflict('복구 중 파일이 변경됐어요: '+row.path);
    if(hash(text)!==row.beforeHash){if(row.before===null)await fs.unlink(file);else await put(file,row.before,text===null);}
    if(row.indexBefore===null)delete project.index[row.path];else project.index[row.path]=row.indexBefore;
  }
  await project.saveIndex();journal.state='rolledBack';await store(project,journal);
}

export async function recoverAssetTransactions(project){
  let names;try{const dir=await project.resolve('Saved/Transactions',false,false);names=await fs.readdir(dir);}catch(error){if(error.code==='ENOENT')return;throw error;}
  for(const name of names){if(!/^[a-f\d-]{36}\.json$/.test(name))continue;const journal=await readAssetTransaction(project,name.slice(0,-5));if(journal.state==='prepared')await rollback(project,journal);}
}

export async function commitAssetBatch(project,rows,guard){
  rows=rows.filter(row=>row.before!==row.after);if(!rows.length)return {ok:true,noChange:true,paths:[]};
  const journal={version:1,id:randomUUID(),state:'prepared',createdAt:new Date().toISOString(),rows:rows.map(row=>({...row,beforeHash:hash(row.before),afterHash:hash(row.after),indexBefore:project.index[row.path]?structuredClone(project.index[row.path]):null}))};
  const writingPaths=new Set();
  await project.resolve('Saved/Transactions',true,false);await store(project,journal);
  try{
    for(const row of journal.rows){guard();const file=await project.resolve(row.path,true,false);if(hash(await read(file))!==row.beforeHash)throw conflict('저장 중 외부 변경을 발견했어요: '+row.path);
      writingPaths.add(row.path);
      if(row.after===null)await fs.unlink(file);else await put(file,row.after,row.before===null);
      if(row.after===null)delete project.index[row.path];else if(row.restoreIndex)project.index[row.path]=structuredClone(row.restoreIndex);else project.index[row.path]??={id:randomUUID()};
    }
    guard();await project.saveIndex();journal.state='committed';await store(project,journal);
  }catch(error){journal.state='prepared';try{await rollback(project,journal,writingPaths);}catch(recovery){throw Object.assign(Error(error.message+'; 복구 기록을 보존했어요: '+journal.id+' ('+recovery.message+')'),{status:409,code:'TRANSACTION_RECOVERY_REQUIRED',transaction:journal.id,cause:error});}throw error;}
  return {ok:true,transaction:journal.id,paths:journal.rows.map(row=>row.path),backup:'Saved/Transactions/'+journal.id+'.json'};
}
