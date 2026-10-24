import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';

const hash=(text,encoding='utf8')=>text===null?null:createHash('sha256').update(encoding==='base64'?Buffer.from(text,'base64'):text).digest('hex');
const read=(file,encoding)=>fs.readFile(file,encoding==='base64'?undefined:'utf8').then(value=>encoding==='base64'?value.toString('base64'):value).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
const conflict=message=>Object.assign(Error(message),{status:409,code:'TRANSACTION_CONFLICT'});
async function put(file,text,create=false,encoding){
  await fs.mkdir(path.dirname(file),{recursive:true});const temp=file+'.'+randomUUID()+'.tmp';
  try{await fs.writeFile(temp,encoding==='base64'?Buffer.from(text,'base64'):text,{flag:'wx',flush:true});if(create)await fs.link(temp,file);else await fs.rename(temp,file);}
  finally{await fs.unlink(temp).catch(error=>{if(error.code!=='ENOENT')throw error;});}
}
const folder=project=>path.join(project.root,'Saved','Transactions');
const journalFile=(project,id)=>{if(typeof id!=='string'||!/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/.test(id))throw Error('저장 묶음 ID를 확인하세요.');return path.join(folder(project),id+'.json');};
const store=(project,journal)=>put(journalFile(project,journal.id),JSON.stringify(journal));
const recoveryWrite=Symbol('owned recovery write');

export async function readAssetTransaction(project,id){
  const file=await project.resolve('Saved/Transactions/'+path.basename(journalFile(project,id)),false,false),stat=await fs.stat(file);
  if(stat.size>32*1024*1024)throw Error('저장 기록 크기 초과');const journal=JSON.parse(await fs.readFile(file,'utf8'));
  if(![1,2].includes(journal.version)||journal.id!==id||!['prepared','committed','rolledBack','resolving','resolved'].includes(journal.state)||!Array.isArray(journal.rows)||!journal.rows.length)throw Error('저장 기록 형식 오류');
  if(journal.state==='resolving'&&!journal.resolution||journal.resolution&&(journal.resolution===id||typeof journal.resolution!=='string'))throw Error('복구 연결 기록 오류');if(journal.resolution)journalFile(project,journal.resolution);
  const paths=new Set();for(const row of journal.rows){
    if(typeof row.path!=='string'||!/^(Assets|Source|Settings)\//.test(row.path)||paths.has(row.path.toLowerCase())||row.encoding!==undefined&&(journal.version!==2||row.encoding!=='base64')||[row.before,row.after].some(t=>t!==null&&(typeof t!=='string'||row.encoding==='base64'&&Buffer.from(t,'base64').toString('base64')!==t))||hash(row.before,row.encoding)!==row.beforeHash||hash(row.after,row.encoding)!==row.afterHash)throw Error('저장 기록 검증 실패');
    await project.resolve(row.path,true,false);paths.add(row.path.toLowerCase());
  }
  const exactPaths=new Set(journal.rows.map(row=>row.path));if(journal.decisions!==undefined&&(!Array.isArray(journal.decisions)||journal.decisions.length!==journal.rows.length||new Set(journal.decisions.map(r=>r?.path)).size!==journal.rows.length||journal.decisions.some(r=>!exactPaths.has(r?.path)||!['before','after','disk'].includes(r?.choice))))throw Error('복구 선택 기록 검증 실패');
  if(journal.conflictPaths!==undefined&&(!Array.isArray(journal.conflictPaths)||new Set(journal.conflictPaths).size!==journal.conflictPaths.length||journal.conflictPaths.some(p=>!exactPaths.has(p))))throw Error('복구 충돌 경로 기록 오류');
  return journal;
}

async function finishResolution(project,journal,{applyIndex=true}={}){
 const byPath=new Map(journal.rows.map(r=>[r.path,r]));if(applyIndex)for(const decision of journal.decisions||[]){const row=byPath.get(decision.path),exists=decision.choice==='disk'?(await fs.stat(await project.resolve(row.path,true,false)).catch(error=>{if(error.code==='ENOENT')return null;throw error;}))?.isFile():row[decision.choice]!==null;if(!exists)delete project.index[row.path];else if(decision.choice==='before'&&row.indexBefore)project.index[row.path]=structuredClone(row.indexBefore);else project.index[row.path]??={id:randomUUID()};}
 await project.saveIndex();journal.state='resolved';journal.resolvedAt=new Date().toISOString();await store(project,journal);
}

async function rollback(project,journal,writingPaths=null){
  // Check the entire group before restoring anything. Never replace a third
  // party's edit with an older backup when recovery finds a conflict.
  const current=[];for(const row of journal.rows){if(writingPaths&&!writingPaths.has(row.path))continue;const file=await project.resolve(row.path,true,false),text=await read(file,row.encoding);if(hash(text,row.encoding)!==row.beforeHash&&hash(text,row.encoding)!==row.afterHash)throw Object.assign(conflict('복구 중 외부 변경을 발견했어요: '+row.path),{path:row.path});current.push({row,file,text});}
  for(const {row,file,text} of current.reverse()){
    if(hash(await read(file,row.encoding),row.encoding)!==hash(text,row.encoding))throw conflict('복구 중 파일이 변경됐어요: '+row.path);
    if(hash(text,row.encoding)!==row.beforeHash){if(row.before===null)await fs.unlink(file);else await put(file,row.before,text===null,row.encoding);}
    if(row.indexBefore===null)delete project.index[row.path];else project.index[row.path]=row.indexBefore;
  }
  await project.saveIndex();journal.state='rolledBack';await store(project,journal);
}

export async function recoverAssetTransactions(project,{tolerateConflicts=false}={}){
  let names;try{const dir=await project.resolve('Saved/Transactions',false,false);names=await fs.readdir(dir);}catch(error){if(error.code==='ENOENT'){project.transactionRecovery=[];return [];}throw error;}
  const journals=new Map(),visiting=new Set(),done=new Set(),pending=[];for(const name of names)if(/^[a-f\d-]{36}\.json$/.test(name)){const journal=await readAssetTransaction(project,name.slice(0,-5));if(['prepared','resolving'].includes(journal.state))journals.set(journal.id,journal);}
  // Separate pending transactions sharing a path have no safe inferred order.
  // Linked recovery children are one family; unrelated families need a choice
  // that stays required even after a neighboring transaction is resolved.
  const family=new Map([...journals.keys()].map(id=>[id,id])),root=id=>{let p=id;while(family.get(p)!==p)p=family.get(p);while(family.get(id)!==id){const next=family.get(id);family.set(id,p);id=next;}return p;},byPath=new Map();
  for(const journal of journals.values())if(journal.state==='resolving'&&journals.has(journal.resolution))family.set(root(journal.resolution),root(journal.id));
  for(const journal of journals.values())for(const row of journal.rows){const key=row.path.toLowerCase();if(!byPath.has(key))byPath.set(key,[]);byPath.get(key).push({journal,path:row.path,family:root(journal.id)});}
  for(const owners of byPath.values())if(new Set(owners.map(o=>o.family)).size>1){if(!tolerateConflicts)throw conflict('겹친 미완료 저장 묶음을 선택해서 복구하세요: '+owners[0].path);for(const {journal,path}of owners)if(!journal.conflictPaths?.includes(path)){journal.conflictPaths=[...journal.conflictPaths||[],path];await store(project,journal);}}
  const visit=async journal=>{if(done.has(journal.id))return;if(visiting.has(journal.id))throw Error('저장 복구 연결이 순환해요.');visiting.add(journal.id);try{
    if(journal.state==='resolving'){const child=journals.get(journal.resolution)||await readAssetTransaction(project,journal.resolution);if(!child)throw Error('연결된 복구 기록이 없어요.');await visit(child);if(['committed','resolved'].includes(child.state)){await finishResolution(project,journal,{applyIndex:child.state==='committed'});}else if(child.state==='rolledBack'){journal.state='prepared';delete journal.resolution;await store(project,journal);}else{pending.push({id:journal.id,blockedBy:child.id,paths:journal.rows.map(r=>r.path)});return;}}
    if(journal.state==='prepared'){if(journal.conflictPaths?.length){if(!tolerateConflicts)throw conflict('이전에 발견한 외부 충돌을 선택해서 복구하세요.');pending.push({id:journal.id,paths:journal.rows.map(r=>r.path)});}else try{await rollback(project,journal);}catch(error){if(error.code!=='TRANSACTION_CONFLICT')throw error;if(!tolerateConflicts)throw error;if(error.path){journal.conflictPaths=[error.path];await store(project,journal);}pending.push({id:journal.id,paths:journal.rows.map(r=>r.path)});}}
  }finally{visiting.delete(journal.id);done.add(journal.id);}};
  // Resolve parents first so a committed decision cannot be rolled back again.
  for(const journal of [...journals.values()].sort((a,b)=>(b.state==='resolving')-(a.state==='resolving')))await visit(journal);
  project.transactionRecovery=pending;return pending;
}

export async function commitAssetBatch(project,rows,guard,checkReads=async()=>{},{retainJournal=true,onPrepared,[recoveryWrite]:resolving=false}={}){
  if(!resolving)project.assertWritable?.();
  const paths=new Set();for(const row of rows){if(!row||typeof row.path!=='string'||!/^(Assets|Source|Settings)\//.test(row.path)||paths.has(row.path.toLowerCase())||row.encoding!==undefined&&row.encoding!=='base64'||[row.before,row.after].some(t=>t!==null&&(typeof t!=='string'||row.encoding==='base64'&&Buffer.from(t,'base64').toString('base64')!==t)))throw Error('저장 묶음의 경로·인코딩·내용을 확인하세요.');await project.resolve(row.path,true,false);paths.add(row.path.toLowerCase());}
  await checkReads({written:false});rows=rows.filter(row=>row.before!==row.after);if(!rows.length)return {ok:true,noChange:true,paths:[]};
  const journal={version:rows.some(row=>row.encoding==='base64')?2:1,id:randomUUID(),state:'prepared',createdAt:new Date().toISOString(),rows:rows.map(row=>({...row,beforeHash:hash(row.before,row.encoding),afterHash:hash(row.after,row.encoding),indexBefore:project.index[row.path]?structuredClone(project.index[row.path]):null}))};
  if(Buffer.byteLength(JSON.stringify(journal))>32*1024*1024)throw Error('저장 기록 크기 초과');
  const writingPaths=new Set();
  await project.resolve('Saved/Transactions',true,false);await store(project,journal);
  try{
    await onPrepared?.(journal);
    for(const row of journal.rows){guard();const file=await project.resolve(row.path,true,false);if(hash(await read(file,row.encoding),row.encoding)!==row.beforeHash)throw conflict('저장 중 외부 변경을 발견했어요: '+row.path);
      writingPaths.add(row.path);
      if(row.after===null)await fs.unlink(file);else await put(file,row.after,row.before===null,row.encoding);
      if(row.after===null)delete project.index[row.path];else if(row.restoreIndex)project.index[row.path]=structuredClone(row.restoreIndex);else project.index[row.path]??={id:randomUUID()};
    }
    guard();await checkReads({written:true});await project.saveIndex();journal.state='committed';await store(project,journal);
  }catch(error){journal.state='prepared';try{await rollback(project,journal,writingPaths);if(!retainJournal)await fs.unlink(journalFile(project,journal.id));}catch(recovery){project.transactionRecovery=[...project.transactionRecovery||[],{id:journal.id,paths:journal.rows.map(r=>r.path)}];throw Object.assign(Error(error.message+'; 복구 기록을 보존했어요: '+journal.id+' ('+recovery.message+')'),{status:409,code:'TRANSACTION_RECOVERY_REQUIRED',transaction:journal.id,cause:error});}throw error;}
  if(!retainJournal){await fs.unlink(journalFile(project,journal.id));return {ok:true,paths:journal.rows.map(row=>row.path)};}
  return {ok:true,transaction:journal.id,paths:journal.rows.map(row=>row.path),backup:'Saved/Transactions/'+journal.id+'.json'};
}

async function fingerprint(file){try{const stat=await fs.stat(file);if(!stat.isFile())throw Error('복구 대상 파일을 확인하세요.');const digest=createHash('sha256');for await(const bytes of createReadStream(file))digest.update(bytes);return{hash:digest.digest('hex'),bytes:stat.size};}catch(error){if(error.code==='ENOENT')return{hash:null,bytes:0};throw error;}}
const bytesOf=(value,encoding)=>value===null?0:Buffer.byteLength(value,encoding==='base64'?'base64':'utf8');
export async function inspectAssetTransaction(project,id){
 const journal=await readAssetTransaction(project,id),rows=[],required=new Set(journal.conflictPaths||[]);for(const row of journal.rows){const disk=await fingerprint(await project.resolve(row.path,true,false));rows.push({path:row.path,binary:row.encoding==='base64',before:{hash:row.beforeHash,bytes:bytesOf(row.before,row.encoding),exists:row.before!==null},after:{hash:row.afterHash,bytes:bytesOf(row.after,row.encoding),exists:row.after!==null},disk:{...disk,exists:disk.hash!==null},conflict:required.has(row.path)||disk.hash!==row.beforeHash&&disk.hash!==row.afterHash});}
 return{id,state:journal.state,createdAt:journal.createdAt,revision:hash(JSON.stringify([journal,rows])),rows,...(journal.state==='resolving'?{blockedBy:journal.resolution}:{})};
}
export async function resolveAssetTransaction(project,{transaction,expectedRevision,choices={},dryRun=false},guard=()=>{}){
 if(typeof dryRun!=='boolean'||typeof expectedRevision!=='string'||!/^[a-f\d]{64}$/.test(expectedRevision)||!choices||Array.isArray(choices)||Object.getPrototypeOf(choices)!==Object.prototype)throw Error('복구 기준·선택·미리보기를 확인하세요.');
 guard();const view=await inspectAssetTransaction(project,transaction);if(view.state!=='prepared'||view.revision!==expectedRevision)throw conflict('복구 대상이 변경됐어요. 다시 조회하세요.');const known=new Set(view.rows.map(r=>r.path));for(const[p,value]of Object.entries(choices))if(!known.has(p)||!['before','after','disk'].includes(value))throw Error('복구할 파일별 선택을 확인하세요.');
 const decisions=view.rows.map(row=>({path:row.path,choice:choices[row.path]||(row.conflict?null:'before')})),unresolved=decisions.filter(r=>!r.choice).map(r=>r.path),preview={transaction,revision:view.revision,decisions:decisions.slice(0,128),totalDecisions:decisions.length,unresolved:unresolved.slice(0,64),unresolvedCount:unresolved.length,valid:!unresolved.length};if(dryRun)return{...preview,dryRun:true};if(unresolved.length)throw Object.assign(Error('충돌한 모든 파일의 복구 내용을 선택하세요.'),{status:409,code:'TRANSACTION_CHOICES_REQUIRED'});
 const journal=await readAssetTransaction(project,transaction);if(hash(JSON.stringify([journal,view.rows]))!==view.revision)throw conflict('복구 준비 중 기록이 변경됐어요.');const rows=[],byChoice=new Map(decisions.map(r=>[r.path,r.choice])),byView=new Map(view.rows.map(r=>[r.path,r]));for(const row of journal.rows){const choice=byChoice.get(row.path),disk=byView.get(row.path).disk;if(choice==='disk'||(choice==='before'?row.beforeHash:row.afterHash)===disk.hash)continue;if(disk.bytes>16*1024*1024)throw Error('변경할 복구 원본은 16 MiB까지 지원해요. 디스크 보존을 선택할 수 있어요.');const raw=await fs.readFile(await project.resolve(row.path,true,false)).catch(error=>{if(error.code==='ENOENT')return null;throw error;});if((raw===null?null:createHash('sha256').update(raw).digest('hex'))!==disk.hash)throw conflict('복구 준비 중 파일이 변경됐어요: '+row.path);const encoding=row.encoding||(raw&&!Buffer.from(raw.toString('utf8'),'utf8').equals(raw)?'base64':undefined),before=raw===null?null:raw.toString(encoding||'utf8'),selected=choice==='before'?row.before:row.after,after=selected===null?null:encoding==='base64'&&row.encoding!=='base64'?Buffer.from(selected,'utf8').toString('base64'):selected;rows.push({path:row.path,before,after,...(encoding?{encoding}:{})});}
 const byWrite=new Map(rows.map(r=>[r.path,r]));const check=async({written=false}={})=>{guard();const current=await readAssetTransaction(project,transaction);if(hash(JSON.stringify(current))!==hash(JSON.stringify(journal)))throw conflict('복구 기록이 변경됐어요.');for(const original of view.rows){const chosen=byWrite.get(original.path),expected=written&&chosen?hash(chosen.after,chosen.encoding):original.disk.hash;if((await fingerprint(await project.resolve(original.path,true,false))).hash!==expected)throw conflict('복구 중 외부 변경을 보존했어요: '+original.path);}};
 // A child journal contains the current disk bytes. Crash recovery either
 // rolls it back to that disk baseline or finishes this explicit decision.
 const result=await commitAssetBatch(project,rows,guard,check,{[recoveryWrite]:true,onPrepared:async child=>{guard();if(hash(JSON.stringify(await readAssetTransaction(project,transaction)))!==hash(JSON.stringify(journal)))throw conflict('복구 연결 전에 기록이 변경됐어요.');journal.state='resolving';journal.resolution=child.id;journal.decisions=decisions;await store(project,journal);}}).catch(async error=>{await recoverAssetTransactions(project,{tolerateConflicts:true});throw error;});
 journal.decisions=decisions;await finishResolution(project,journal);await recoverAssetTransactions(project,{tolerateConflicts:true});return{...preview,ok:true,state:'resolved',resolutionTransaction:result.transaction||null,remaining:project.transactionRecovery.length};
}
