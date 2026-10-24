import {isNativeTypeAssetKind,isNativeTypeAssetPath,nativeTypeAssetKind} from '../prototype/native-type-paths.js';
import {nativeHeaderPath} from './native-source-schema.mjs';
import {recoverAssetWrites,publishAssetText} from './asset-write-intent.mjs';
import {appendNativeTypeRows,publishNativeTypeAsset} from './native-type-asset-write.mjs';
import {planNativeTypeMigration} from './native-type-migration.mjs';
import {resolveEffectDefinition} from '../prototype/effect-scaling.js';
import {validateAbilitySetGraph} from '../prototype/ability-set-resolution.js';
import {modelSubassetReport} from './model-subassets.mjs';
import {modelSource,readModelImport,writeModelImport} from './model-import-state.mjs';
import {assetSuffix,assetTypes,createAsset,validAsset,assetValidationError} from '../prototype/asset-documents.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {fileKind,validScene,defaultObjects,defaultSurface,defaultEnvironment} from '../prototype/model.js';
import {defaultBlueprint,validBlueprint} from '../prototype/blueprint-model.js';
import {createBlueprintResolver} from '../prototype/blueprint-inheritance.js';
import {commitAssetBatch,recoverAssetTransactions,readAssetTransaction} from './asset-transaction.mjs';
const textExtensions=new Set(['.h','.hpp','.cpp','.c','.json','.txt','.md','.hlsl','.glsl','.obj','.gltf','.csv','.yaml','.yml','.svg']);
const journalRestore=Symbol('verified asset journal restore');
const referenceKeys=new Set(['widgetAsset','rowWidget','asset','blueprintAsset','materialAsset','spriteAsset','tilemapAsset','tilemap','gameConfig','mesh','material','texture','cookieSprite','cookieTexture','normalTexture','vectorTexture','sheet','chordAction','context','sprite','tileset','physicalMaterial','sourceMesh','model','rig','animation','clip','blackboard','mixer','widget','audio','source','headerPath','sourcePath','inputMapping','action','parent','parentClass','startupScene','startupBlueprint','defaultInputMapping','gameMode','gameState','gameInstance','defaultController','playerState','defaultPawn']);
export function assetReferences(data,filename){const result=new Set(),visit=(value,key)=>{if(key==='widgetSlots'&&typeof value==='string'){try{const slots=JSON.parse(value);if(slots&&!Array.isArray(slots)&&typeof slots==='object')for(const asset of Object.values(slots))if(typeof asset==='string')visit(asset,'widgetAsset');}catch{}return;}if(typeof value==='string'&&(referenceKeys.has(key)||/^(Assets|Source)\/[^#]*\.[A-Za-z0-9]+(?:#[A-Za-z_]\w*)?$/.test(value))&&value&&!value.startsWith('data:')&&!/^[a-z]+:/i.test(value)&&value.includes('.'))result.add(key==='gameInstance'&&value.startsWith('Source/')?value.split('#')[0]:value);else if(Array.isArray(value))value.forEach(item=>visit(item,key));else if(value&&typeof value==='object')Object.entries(value).forEach(([k,v])=>visit(v,k));};visit(data,'');if(filename.endsWith('.gltf'))for(const item of [...data.buffers||[],...data.images||[]])if(item.uri&&!/^(?:[a-z]+:|\/)/i.test(item.uri))result.add(path.posix.normalize(path.posix.join(path.posix.dirname(filename),item.uri)));return [...result].sort();}
export function assetKind(name){if(/\.(gltf|glb|obj|fbx)\.import\.json$/i.test(name))return 'modelimport';return Object.entries(assetSuffix).filter(([kind])=>kind!=='modelimport').find(([,suffix])=>name.endsWith(suffix))?.[0]||(/\.(cpp|hpp|h|c|hlsl|glsl)$/i.test(name)?'code':fileKind(name)==='unsupported'?'file':fileKind(name));}
export class ProjectService {
  constructor(root){this.root=path.resolve(root);this.index={};this.redirects={};this.queue=Promise.resolve();this.writeQueue=Promise.resolve();}
  async init(seed=false){await fs.mkdir(this.root,{recursive:true});this.root=await fs.realpath(this.root);try{this.index=JSON.parse(await fs.readFile(path.join(this.root,'.hbassets.json'),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
    this.writeRecovery=await recoverAssetWrites(this);await recoverAssetTransactions(this);
    try{this.redirects=JSON.parse(await fs.readFile(path.join(this.root,'.hbredirects.json'),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
    if(seed){const scene={version:1,sceneName:'Garden',objects:defaultObjects,surface:defaultSurface,environment:defaultEnvironment,blueprint:defaultBlueprint};const files={
      'Assets/Scenes/Garden.hbscene.json':JSON.stringify(scene,null,2),'Assets/Blueprints/BP_Garden.hbblueprint.json':JSON.stringify(defaultBlueprint,null,2),'Assets/Materials/Moss_stone.hbmaterial.json':JSON.stringify({version:1,surface:defaultSurface},null,2),
      'Assets/Models/Cube.obj':'o Cube\nv -0.5 -0.5 -0.5\nv 0.5 -0.5 -0.5\nv 0.5 0.5 -0.5\nv -0.5 0.5 -0.5\nv -0.5 -0.5 0.5\nv 0.5 -0.5 0.5\nv 0.5 0.5 0.5\nv -0.5 0.5 0.5\nf 1 4 3 2\nf 5 6 7 8\nf 1 2 6 5\nf 4 8 7 3\nf 1 5 8 4\nf 2 3 7 6\n',
      'Source/DoorController.h':await fs.readFile(new URL('../prototype/examples/DoorController.h',import.meta.url),'utf8'),'Source/DoorController.cpp':await fs.readFile(new URL('../prototype/examples/DoorController.cpp',import.meta.url),'utf8')};
      for(const [name,content] of Object.entries(files)){const file=await this.resolve(name,true);await fs.mkdir(path.dirname(file),{recursive:true});try{await fs.writeFile(file,content,{flag:'wx'});}catch(error){if(error.code!=='EEXIST')throw error;}}
    }return this;
  }
  async resolve(relative='',allowMissing=false,followRedirects=true){
    if(typeof relative!=='string'||relative.length>1000||relative.includes('\\')||relative.startsWith('/')||relative.split('/').some(p=>p==='..'||p==='.'||/[<>:"|?*\x00-\x1f]/.test(p)||/[. ]$/.test(p)||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p)))throw Error('프로젝트 경로 오류');
    const visited=new Set();while(followRedirects){const from=Object.keys(this.redirects).sort((a,b)=>b.length-a.length).find(p=>relative===p||relative.startsWith(p+'/'));if(!from)break;if(visited.has(from))throw Error('에셋 참조 순환');visited.add(from);relative=this.redirects[from]+relative.slice(from.length);if(visited.size>32)throw Error('에셋 참조 깊이 초과');}
    const full=path.resolve(this.root,relative);if(full!==this.root&&!full.startsWith(this.root+path.sep))throw Error('프로젝트 범위 밖 경로');let cursor=full;
    while(true){try{const real=await fs.realpath(cursor);if(real!==this.root&&!real.startsWith(this.root+path.sep))throw Error('프로젝트 밖 링크는 사용할 수 없어요.');break;}catch(error){if(!allowMissing||error.code!=='ENOENT')throw error;cursor=path.dirname(cursor);}}
    return full;
  }
  async canonicalFile(relative){const file=await this.resolve(relative,true),missing=[];let cursor=file;while(true){try{const real=await fs.realpath(cursor),resolved=path.resolve(real,...missing);if(resolved!==this.root&&!resolved.startsWith(this.root+path.sep))throw Error('프로젝트 범위 밖 경로');return resolved;}catch(error){if(error.code!=='ENOENT')throw error;missing.unshift(path.basename(cursor));const parent=path.dirname(cursor);if(parent===cursor)throw error;cursor=parent;}}}
  async *walk({folder='',signal}={}){
    await this.resolve(folder,false,false);const pending=[folder];
    while(pending.length){signal?.throwIfAborted();const relative=pending.pop(),dir=await this.resolve(relative,false,false);
      for await(const entry of await fs.opendir(dir)){signal?.throwIfAborted();if(entry.name.startsWith('.')||['Library','node_modules','build'].includes(entry.name)||!relative&&['Saved','Builds'].includes(entry.name)||entry.isSymbolicLink())continue;
        const name=relative?relative+'/'+entry.name:entry.name;if(entry.isDirectory()){yield {path:name,name:entry.name,kind:'folder'};pending.push(name);}else if(entry.isFile()){const stat=await fs.lstat(await this.resolve(name,false,false));if(!stat.isFile()||stat.isSymbolicLink())continue;this.index[name]??={id:randomUUID()};yield {path:name,name:entry.name,kind:assetKind(entry.name),size:stat.size,modified:stat.mtimeMs,id:this.index[name].id,text:textExtensions.has(path.extname(name).toLowerCase())};}
      }
    }
  }
  async files(options){const result=[];for await(const entry of this.walk(options))result.push(entry);return result.sort((a,b)=>(a.kind!=='folder')-(b.kind!=='folder')||a.path.localeCompare(b.path));}
  async list({folder='',query='',type='all',contents=false,recursive=false}={}){await this.resolve(folder);const all=await this.files(),q=query.toLowerCase();let entries=all.filter(e=>(recursive?e.path.startsWith(folder?folder+'/':''):path.posix.dirname(e.path)===(folder||'.'))&&(type==='all'||e.kind===type));
    if(q){const matches=[];for(const e of entries){if(e.name.toLowerCase().includes(q)||e.path.toLowerCase().includes(q))matches.push(e);else if(contents&&e.text&&e.size<=1048576){const lines=(await fs.readFile(await this.resolve(e.path),'utf8')).split(/\r?\n/),line=lines.findIndex(s=>s.toLowerCase().includes(q));if(line>=0)matches.push({...e,line:line+1,match:lines[line].slice(0,160)});}}entries=matches;}
    await this.saveIndex();return {root:this.root,folder,entries,folders:all.filter(e=>e.kind==='folder'),total:all.filter(e=>e.kind!=='folder').length};
  }
  saveIndex(){const task=this.queue.then(async()=>{const file=path.join(this.root,'.hbassets.json'),temp=file+'.'+randomUUID()+'.tmp';try{await fs.writeFile(temp,JSON.stringify(this.index,null,2),{flag:'wx',flush:true});await fs.rename(temp,file);}finally{await fs.unlink(temp).catch(error=>{if(error.code!=='ENOENT')throw error;});}});this.queue=task.catch(()=>{});return task;}
  async scanAsset(relative,force=false){
    const file=await this.resolve(relative),stat=await fs.stat(file);if(!stat.isFile())throw Error('에셋 파일을 선택하세요.');const canonical=path.relative(this.root,file).split(path.sep).join('/'),entry=this.index[canonical]??={id:randomUUID()},model=modelSource(canonical);let metadata=null,metadataError=null;
    if(model){try{if(force)this.modelImportCache?.delete(canonical);metadata=await readModelImport(this,canonical);}catch(error){metadataError=error.message;}}
    if(!force&&entry.hash&&entry.modified===stat.mtimeMs&&entry.size===stat.size){if(model){if(metadata&&(!metadata.sourceHash||metadata.sourceHash===entry.hash)){const rows=new Map(metadata.subassets.map(row=>[row.id,row]));for(const row of entry.subassets||[])row.overrides=structuredClone(rows.get(row.id)?.overrides||{});}entry.importSettings=metadata?.settings||null;entry.importNeedsReimport=!!(metadata?.sourceHash&&metadata.sourceHash!==entry.hash);entry.error=entry.modelSourceError||metadataError;entry.status=entry.error?'error':'ready';}return entry;}
    let bytes,digest;if(model){bytes=await fs.readFile(file);digest=createHash('sha256').update(bytes).digest('hex');}else{const hash=createHash('sha256');for await(const chunk of createReadStream(file))hash.update(chunk);digest=hash.digest('hex');}let dependencies=[],error=metadataError;
    if(/\.(json|gltf)$/i.test(file)){try{if(stat.size>16777216)throw Error('참조 분석 JSON은 16 MB까지 지원해요.');const data=JSON.parse(bytes?bytes.toString('utf8'):await fs.readFile(file,'utf8'));const kind=assetKind(canonical);if(assetSuffix[kind]&&!validAsset(kind,data))throw Error('에셋 데이터 검증 실패');dependencies=assetReferences(data,canonical);}catch(problem){error=problem.message;}}
    if(model){try{const previous=metadata?[...metadata.subassets,...(metadata.unresolvedSubassets||[])]:[...(entry.subassets||[]),...(entry.unresolvedSubassets||[])],report=modelSubassetReport(bytes,canonical,entry.id,previous);Object.assign(entry,{subassets:report.rows,unresolvedSubassets:report.unresolved,modelDetected:report.detected,modelWarnings:report.warnings,modelSourceError:null,importSettings:metadata?.settings||null,importNeedsReimport:!!(metadata?.sourceHash&&metadata.sourceHash!==digest)});}catch(problem){entry.modelSourceError=problem.message;error=problem.message;}}
    const after=await fs.stat(file);if(after.mtimeMs!==stat.mtimeMs||after.size!==stat.size)throw Error('가져오는 동안 원본이 변경됐어요. 다시 시도하세요.');const changed=entry.hash!==digest;Object.assign(entry,{hash:digest,size:stat.size,modified:stat.mtimeMs,dependencies,error,status:error?'error':'ready'});if(force||changed){entry.revision=(entry.revision||0)+1;entry.importedAt=new Date().toISOString();}return entry;
  }
  async registry(){await this.writeQueue;await recoverAssetWrites(this);const files=(await this.files()).filter(file=>file.kind!=='folder');for(const file of files)await this.scanAsset(file.path);await this.saveIndex();return files;}
  async assetRegistry(){
    const files=await this.registry(),resolved=new Map(),records=new Map(files.map(f=>[f.path,{...this.index[f.path],path:f.path,kind:f.kind,dependencies:[],referencers:[]}]));
    const resolve=async source=>{if(!resolved.has(source))resolved.set(source,(async()=>{try{const file=await this.resolve(source),name=path.relative(this.root,file).split(path.sep).join('/');return records.has(name)?{path:name,id:records.get(name).id,kind:records.get(name).kind,missing:false}:{path:source,missing:true};}catch{return {path:source,missing:true};}})());return resolved.get(source);};
    for(const record of records.values())for(const source of this.index[record.path].dependencies||[]){const target=await resolve(source);record.dependencies.push(target);const owner=records.get(target.path);if(owner&&!owner.referencers.some(r=>r.path===record.path))owner.referencers.push({path:record.path,kind:record.kind,id:record.id});}
    return {version:1,assets:[...records.values()]};
  }
  async assetInfo(relative){
    const files=await this.registry(),file=await this.resolve(relative),canonical=path.relative(this.root,file).split(path.sep).join('/'),entry=this.index[canonical];if(!entry)throw Error('에셋 파일을 선택하세요.');
    const resolve=async source=>{try{const file=await this.resolve(source),name=path.relative(this.root,file).split(path.sep).join('/');return {path:name,id:this.index[name]?.id,kind:assetKind(name),missing:false};}catch{return {path:source,missing:true};}};
    const dependencies=await Promise.all((entry.dependencies||[]).map(resolve)),referencers=[];for(const source of files){if(source.path===canonical)continue;for(const target of this.index[source.path].dependencies||[]){if((await resolve(target)).path===canonical){referencers.push({path:source.path,kind:source.kind,id:source.id});break;}}}
    return {...entry,path:canonical,kind:assetKind(canonical),dependencies,referencers};
  }
  async reimport(paths){
    if(!Array.isArray(paths)||!paths.length||paths.length>1000||paths.some(p=>typeof p!=='string'))throw Error('다시 가져올 파일을 선택하세요.');await this.registry();const changed=[];
    for(const relative of new Set(paths)){const file=await this.resolve(relative),canonical=path.relative(this.root,file).split(path.sep).join('/'),entry=await this.scanAsset(canonical,true);if(entry.error)throw Error(canonical+': '+entry.error);if(modelSource(canonical)){try{await this.read(canonical+'.import.json');await writeModelImport(this,canonical,entry);}catch(error){if(error.code!=='ENOENT')throw error;}}changed.push(canonical);}
    const affected=new Set(changed);let more=true;while(more){more=false;for(const [source,entry] of Object.entries(this.index)){if(affected.has(source))continue;for(const dependency of entry.dependencies||[]){let canonical=dependency;try{canonical=path.relative(this.root,await this.resolve(dependency)).split(path.sep).join('/');}catch{}if(affected.has(canonical)){affected.add(source);more=true;break;}}}}await this.saveIndex();return {changed,affected:[...affected]};
  }
  async prepareModelImport(relative){if(!modelSource(relative))throw Error('가져오기 설정을 지원하는 원본 모델을 선택하세요.');const file=await this.resolve(relative),canonical=path.relative(this.root,file).split(path.sep).join('/'),entry=await this.scanAsset(canonical,true);if(entry.error)throw Error(entry.error);const existing=await readModelImport(this,canonical),data=existing?.version===2&&existing.sourceHash===entry.hash?existing:await writeModelImport(this,canonical,entry);await this.saveIndex();return {path:canonical+'.import.json',kind:'modelimport',data};}
  async overrideModelSubasset(relative,id,overrides){if(!overrides||Object.keys(overrides).some(k=>!['visible','castShadow','receiveShadow'].includes(k)||typeof overrides[k]!=='boolean'))throw Error('모델 오버라이드 속성 오류');const entry=await this.scanAsset(relative,true),row=entry.subassets?.find(s=>s.id===id);if(!row||row.kind!=='mesh')throw Error('메시 하위 에셋을 선택하세요.');if(entry.error)throw Error(entry.error);row.overrides={...overrides};await writeModelImport(this,relative,entry);await this.saveIndex();return row;}
  async import(folder,name,data){return this.importStream(folder,name,[Buffer.isBuffer(data)?data:Buffer.from(data)]);}
  async importStream(folder,name,input,guard=()=>{},{expectedBytes,signal}={}){
    if(!name||name.includes('/')||name.includes('\\'))throw Error('가져올 파일 이름 오류');
    if(expectedBytes!==undefined&&(!Number.isSafeInteger(expectedBytes)||expectedBytes<0))throw Error('가져올 파일 크기 오류');
    const dir=await this.resolve(folder);if(!(await fs.stat(dir)).isDirectory())throw Error('가져올 폴더가 없어요.');
    const stage=await this.resolve((folder?folder+'/':'')+'.hb-import-'+randomUUID()+'.tmp',true,false);let handle,published,previousIndex;
    const check=()=>{signal?.throwIfAborted();guard();};
    try{
      check();handle=await fs.open(stage,'wx');let bytes=0;
      for await(const chunk of input){check();if(!Buffer.isBuffer(chunk)&&!(chunk instanceof Uint8Array))throw Error('가져올 데이터 형식 오류');bytes+=chunk.byteLength;if(!Number.isSafeInteger(bytes)||expectedBytes!==undefined&&bytes>expectedBytes)throw Error('가져올 파일 크기 불일치');await handle.writeFile(chunk);}
      check();if(expectedBytes!==undefined&&bytes!==expectedBytes)throw Error('가져올 파일 크기 불일치');await handle.close();handle=null;
      const ext=path.extname(name),stem=name.slice(0,name.length-ext.length);
      for(let i=0;Number.isSafeInteger(i);i++){
        check();const relative=(folder?folder+'/':'')+stem+(i?'_'+i:'')+ext,file=await this.resolve(relative,true);
        try{await fs.link(stage,file);}catch(error){if(error.code==='EEXIST')continue;if(!['EPERM','EACCES','EXDEV','ENOTSUP'].includes(error.code))throw error;try{await fs.copyFile(stage,file,1);}catch(copyError){if(copyError.code==='EEXIST')continue;throw copyError;}}
        published={relative,file};check();previousIndex=this.index[relative];this.index[relative]={id:randomUUID(),importedAt:new Date().toISOString(),status:'source'};
        if(modelSource(relative)){const entry=await this.scanAsset(relative,true);check();if(!entry.error)await writeModelImport(this,relative,entry);}
        check();await this.saveIndex();return {path:relative,kind:assetKind(relative),bytes,warning:this.index[relative].error||null};
      }
      throw Error('가져올 파일 이름을 만들 수 없어요.');
    }catch(error){await handle?.close().catch(()=>{});handle=null;if(published){await fs.unlink(published.file).catch(()=>{});if(previousIndex)this.index[published.relative]=previousIndex;else delete this.index[published.relative];}throw error;}
    finally{await handle?.close();await fs.unlink(stage).catch(error=>{if(error.code!=='ENOENT')throw error;});}
  }
  async mkdir(relative){await fs.mkdir(await this.resolve(relative,true),{recursive:true});}
  async read(relative){const file=await this.resolve(relative),stat=await fs.stat(file);if(!stat.isFile())throw Error('파일이 아니에요.');return {file,size:stat.size};}
  checkedWrite(relative,text,expected,guard=()=>{}){
    if(typeof text!=='string'||typeof expected!=='string')throw Error('저장 내용과 이전 저장 기준이 필요해요.');
    if(nativeHeaderPath(relative))return this.checkedBatch([{path:relative,text,expected}],guard);
    const task=this.writeQueue.then(async()=>{guard();let source;try{source=await fs.readFile(await this.resolve(relative),'utf8');}catch(error){if(error.code==='ENOENT')throw Object.assign(Error('외부에서 삭제된 파일이에요. 다른 이름으로 저장하세요.'),{status:409});throw error;}
      const kind=assetKind(relative);let actual;try{actual=JSON.stringify(assetSuffix[kind]?JSON.parse(source):source);}catch{actual=null;}
      if(actual!==expected)throw Object.assign(Error('외부에서 변경된 에셋이에요. 다시 읽거나 변경 내용을 비교하세요.'),{status:409});
      const next=assetSuffix[kind]?JSON.parse(text):text;if(assetSuffix[kind]&&!validAsset(kind,next))throw Error(assetValidationError(kind,next));if(JSON.stringify(next)===actual){guard();return {ok:true,noChange:true};}
      if(isNativeTypeAssetKind(kind))return this.writeFile(relative,text,guard);
      const backup=await this.resolve('Saved/Backups/'+randomUUID()+path.extname(relative),true,false);await fs.mkdir(path.dirname(backup),{recursive:true});await fs.writeFile(backup,source,{flag:'wx'});guard();await this.writeFile(relative,text);return {ok:true,backup:path.relative(this.root,backup).split(path.sep).join('/')};
    });this.writeQueue=task.catch(()=>{});return task;
  }
  write(relative,data,guard=()=>{}){const task=this.writeQueue.then(()=>{guard();return this.writeFile(relative,data,guard);});this.writeQueue=task.catch(()=>{});return task;}
  checkedBatch(entries,guard=()=>{},{dryRun=false,restoreIndex=new Map(),guards=[],expectedPlanRevision,[journalRestore]:restore}={}){
    if(!Array.isArray(entries)||!entries.length||!restore&&entries.length>64||typeof dryRun!=='boolean'||!Array.isArray(guards))throw Error('저장 묶음과 읽기 기준을 확인하세요.');
    if(expectedPlanRevision!==undefined&&(typeof expectedPlanRevision!=='string'||!/^[a-f\d]{64}$/.test(expectedPlanRevision)))throw Error('저장 계획 기준을 확인하세요.');
    const task=this.writeQueue.then(async()=>{
      guard();if(!dryRun)await recoverAssetWrites(this);const rows=[],drafts=new Map(),seen=new Set();let bytes=0;
      for(const entry of entries){
        if(!entry||typeof entry.path!=='string'||!/^(Assets|Source|Settings)\//.test(entry.path)||!textExtensions.has(path.extname(entry.path).toLowerCase())||[entry.text,entry.expected].some(t=>t!==null&&typeof t!=='string'))throw Error('편집 가능한 파일과 이전 저장 기준을 확인하세요.');
        const file=await this.canonicalFile(entry.path),canonical=path.relative(this.root,file).split(path.sep).join('/'),key=canonical.toLowerCase();if(!/^(Assets|Source|Settings)\//.test(canonical)||!textExtensions.has(path.extname(canonical).toLowerCase()))throw Error('저장 대상 파일 경로를 확인하세요.');if(seen.has(key))throw Error('저장 묶음의 파일 경로가 중복돼요.');seen.add(key);
        let before;try{const stat=await fs.stat(file);if(!stat.isFile()||stat.size>8388608)throw Error('저장 파일 크기 초과');before=await fs.readFile(file,'utf8');}catch(error){if(error.code!=='ENOENT')throw error;before=null;}
        const kind=assetKind(canonical);let actual;try{actual=before===null?null:JSON.stringify(assetSuffix[kind]?JSON.parse(before):before);}catch{actual=undefined;}
        if(actual!==entry.expected)throw Object.assign(Error('외부에서 변경된 파일이에요: '+canonical),{status:409,code:'REVISION_CONFLICT'});
        if(entry.text===null&&before===null)throw Error('삭제할 파일이 없어요.');bytes+=Buffer.byteLength(before||'')+Buffer.byteLength(entry.text||'');if(bytes>8388608)throw Error('저장 묶음 원본과 변경 내용은 합계8MB까지 지원해요.');
        if(entry.text!==null&&assetSuffix[kind]){const data=JSON.parse(entry.text);if(!validAsset(kind,data))throw Error(assetValidationError(kind,data)+': '+canonical);if(kind==='modelimport')await this.validateModelImportSource(canonical,data);}
        rows.push({path:canonical,before,after:entry.text,...(restoreIndex.has(key)?{restoreIndex:restoreIndex.get(key)}:{})});drafts.set(key,entry.text);
      }
      const typeReadGuards=await appendNativeTypeRows(this,rows,drafts,{restore}),migration=await planNativeTypeMigration(this,rows,drafts,{restoring:!!restore&&rows.some(r=>isNativeTypeAssetPath(r.path)||nativeHeaderPath(r.path))});typeReadGuards.push(...migration?.guards||[]);
      if(!migration&&rows.some(r=>/\.(hbblueprint\.json|h|hpp|cpp|c)$/i.test(r.path))){
        const paths=new Set((await this.files()).filter(f=>f.kind==='blueprint').map(f=>f.path));for(const row of rows)if(row.path.endsWith('.hbblueprint.json'))paths.add(row.path);
        for(const name of paths){const raw=drafts.has(name.toLowerCase())?drafts.get(name.toLowerCase()):await fs.readFile(await this.resolve(name),'utf8');if(raw!==null)await this.validateBlueprint(name,JSON.parse(raw),drafts);}
      }
      const abilityReadGuards=[];if(rows.some(r=>/\.hb(?:abilityset|curve)\.json$/.test(r.path))){const changed=rows.filter(r=>r.path.endsWith('.hbabilityset.json')),roots=new Set((await this.files()).filter(f=>f.kind==='abilityset').map(f=>f.path));for(const row of changed)if(row.after===null)roots.delete(row.path);else roots.add(row.path);const checked=await this.validateAbilitySets([...roots],drafts);abilityReadGuards.push(...checked.guards);}
      if(rows.some(r=>['effect','curve'].includes(assetKind(r.path)))){const roots=new Set(rows.some(r=>assetKind(r.path)==='curve')?(await this.files()).filter(f=>f.kind==='effect').map(f=>f.path):[]);for(const row of rows.filter(r=>r.path.endsWith('.hbeffect.json')))if(row.after===null)roots.delete(row.path);else roots.add(row.path);const checked=await this.validateEffects([...roots],drafts);abilityReadGuards.push(...checked.guards);}
      const readGuards=[],guardPaths=new Set();for(const entry of guards){const binary=entry&&Object.hasOwn(entry,'expectedFingerprint');if(!entry||typeof entry.path!=='string'||(binary?entry.expectedFingerprint!==null&&(typeof entry.expectedFingerprint!=='string'||!/^[a-f0-9]{64}$/.test(entry.expectedFingerprint))||Object.hasOwn(entry,'expected'):entry.expected!==null&&typeof entry.expected!=='string'))throw Error('읽기 기준 파일을 확인하세요.');const file=await(binary?this.inspectFingerprint(entry.path):this.inspectDocument(entry.path)),key=file.path.toLowerCase();if(seen.has(key)||guardPaths.has(key))throw Error('읽기 기준과 저장 파일 경로가 중복돼요.');guardPaths.add(key);bytes+=binary?64:Buffer.byteLength(entry.expected||'');if(bytes>8388608)throw Error('저장 묶음과 읽기 기준은 합계8MB까지 지원해요.');if((binary?file.revision:file.expected)!==(binary?entry.expectedFingerprint:entry.expected))throw Object.assign(Error('참조 원본이 변경됐어요: '+file.path),{status:409,code:'REVISION_CONFLICT'});readGuards.push(binary?{path:file.path,expectedFingerprint:entry.expectedFingerprint}:{path:file.path,expected:entry.expected});}
      readGuards.push(...abilityReadGuards,...typeReadGuards);const checkReads=async phase=>{guard();await migration?.checkInventory(phase);for(const entry of readGuards){const binary=Object.hasOwn(entry,'expectedFingerprint'),file=await(binary?this.inspectFingerprint(entry.path):this.inspectDocument(entry.path));if((binary?file.revision:file.expected)!==(binary?entry.expectedFingerprint:entry.expected))throw Object.assign(Error('저장 중 참조 원본이 변경됐어요: '+entry.path),{status:409,code:'REVISION_CONFLICT'});}};
      const expanded=migration||rows.some(r=>isNativeTypeAssetPath(r.path))?rows.map(r=>({path:r.path,kind:assetKind(r.path),before:r.before,after:r.after})):undefined;
      const planRevision=createHash('sha256').update(JSON.stringify(rows.map(r=>[r.path,r.before,r.after]))).digest('hex');if(expectedPlanRevision!==undefined&&expectedPlanRevision!==planRevision)throw Object.assign(Error('미리 확인한 저장 계획이 변경됐어요. 다시 저장하세요.'),{status:409,code:'REVISION_CONFLICT'});
      await checkReads();if(dryRun)return {valid:true,paths:rows.map(r=>r.path),changes:rows.filter(r=>r.before!==r.after).map(r=>r.path),guards:readGuards.map(r=>r.path),...(expanded?{expanded,planRevision}:{}),...(migration?{migration:{values:migration.values,paths:migration.paths}}:{})};
      const result=await commitAssetBatch(this,rows,guard,checkReads);return {...result,...migration?{migration:{values:migration.values,paths:migration.paths}}:{}};
    });this.writeQueue=task.catch(()=>{});return task;
  }
  async inspectFingerprint(relative){
    if(typeof relative!=='string'||!/^(Assets|Source|Settings)\//.test(relative))throw Error('프로젝트 파일 경로가 필요해요.');const file=await this.canonicalFile(relative),canonical=path.relative(this.root,file).split(path.sep).join('/');if(!/^(Assets|Source|Settings)\//.test(canonical))throw Error('조회 대상 파일 경로를 확인하세요.');
    const handle=await fs.open(file,'r').catch(error=>{if(error.code==='ENOENT')return null;throw error;});if(!handle)return{path:canonical,exists:false,bytes:0,revision:null};
    try{const before=await handle.stat();if(!before.isFile())throw Error('파일 경로를 확인하세요.');const hash=createHash('sha256');for await(const chunk of handle.createReadStream({autoClose:false}))hash.update(chunk);const after=await handle.stat(),current=await fs.stat(file);if(before.size!==after.size||before.mtimeMs!==after.mtimeMs||before.ctimeMs!==after.ctimeMs||before.ino!==current.ino||before.size!==current.size||before.mtimeMs!==current.mtimeMs||before.ctimeMs!==current.ctimeMs)throw Object.assign(Error('조회 중 파일이 변경됐어요: '+canonical),{status:409,code:'REVISION_CONFLICT'});return{path:canonical,exists:true,bytes:after.size,revision:hash.digest('hex')};}finally{await handle.close();}
  }
  async inspectDocument(relative){
    if(typeof relative!=='string'||!/^(Assets|Source|Settings)\//.test(relative)||!textExtensions.has(path.extname(relative).toLowerCase()))throw Error('편집 가능한 프로젝트 파일 경로가 필요해요.');
    const file=await this.canonicalFile(relative),canonical=path.relative(this.root,file).split(path.sep).join('/'),kind=assetSuffix[assetKind(canonical)]?assetKind(canonical):'text';if(!/^(Assets|Source|Settings)\//.test(canonical)||!textExtensions.has(path.extname(canonical).toLowerCase()))throw Error('조회 대상 파일 경로를 확인하세요.');
    let text;try{const stat=await fs.stat(file);if(!stat.isFile()||stat.size>8388608)throw Error('조회 파일 크기 초과');text=await fs.readFile(file,'utf8');}catch(error){if(error.code==='ENOENT')return {path:canonical,kind,exists:false,data:null,revision:null,expected:null};throw error;}
    const data=kind==='text'?text:JSON.parse(text),expected=JSON.stringify(data),revision=createHash('sha256').update(expected).digest('hex');return {path:canonical,kind,exists:true,data,revision,expected};
  }
  async undoBatch(id,guard=()=>{}){
    await this.writeQueue;guard();const journal=await readAssetTransaction(this,id);if(journal.state!=='committed')throw Error('완료된 저장 묶음만 되돌릴 수 있어요.');
    return this.checkedBatch(journal.rows.map(row=>({path:row.path,text:row.before,expected:row.after===null?null:JSON.stringify(assetSuffix[assetKind(row.path)]?JSON.parse(row.after):row.after)})),guard,{[journalRestore]:journal,restoreIndex:new Map(journal.rows.filter(r=>r.before!==null&&r.indexBefore).map(r=>[r.path.toLowerCase(),r.indexBefore]))});
  }
  async validateEffects(roots,drafts=new Map()){
    const sources=new Map(),observed=new Map(),curves=Object.create(null),read=async requested=>{const file=await this.canonicalFile(requested),canonical=path.relative(this.root,file).split(path.sep).join('/'),key=canonical.toLowerCase();if(!sources.has(key))sources.set(key,(async()=>{const raw=drafts.has(key)?drafts.get(key):await fs.readFile(file,'utf8');if(raw===null)throw Error('삭제된 효과·커브 참조: '+requested);if(!drafts.has(key))observed.set(key,{path:canonical,expectedFingerprint:createHash('sha256').update(raw).digest('hex')});return JSON.parse(raw);})());return sources.get(key);};
    for(const root of roots){const data=await read(root);if(!validAsset('effect',data))throw Error('효과 정의를 확인하세요: '+root);await resolveEffectDefinition(data,read,{capture:false,curves});}return{guards:[...observed.values()]};
  }
  async validateAbilitySets(roots,drafts=new Map()){
    const sources=new Map(),observed=new Map();const result=await validateAbilitySetGraph(roots,async requested=>{const file=await this.canonicalFile(requested),canonical=path.relative(this.root,file).split(path.sep).join('/'),key=canonical.toLowerCase();if(!sources.has(key))sources.set(key,(async()=>{const raw=drafts.has(key)?drafts.get(key):await fs.readFile(file,'utf8');if(raw===null)throw Error('삭제된 능력 세트 참조: '+requested);if(!drafts.has(key))observed.set(key,{path:canonical,expectedFingerprint:createHash('sha256').update(raw).digest('hex')});return JSON.parse(raw);})());return sources.get(key);});return{...result,guards:[...observed.values()]};
  }
  async validateBlueprint(relative,data,drafts=new Map()){
    const file=await this.canonicalFile(relative),canonical=path.relative(this.root,file).split(path.sep).join('/');drafts=new Map(drafts);drafts.set(canonical.toLowerCase(),JSON.stringify(data));
    const readText=async requested=>{const target=await this.canonicalFile(requested),key=path.relative(this.root,target).split(path.sep).join('/').toLowerCase();if(drafts.has(key)){const text=drafts.get(key);if(text===null)throw Error('삭제된 블루프린트/C++ 참조: '+requested);return text;}return fs.readFile(target,'utf8');};
    return createBlueprintResolver(async requested=>JSON.parse(await readText(requested)),readText)(canonical);
  }
  async validateModelImportSource(relative,data){const source=relative.slice(0,-'.import.json'.length);if(await this.canonicalFile(data.source)!==await this.canonicalFile(source))throw Error('가져오기 설정의 원본 모델 경로가 달라요.');}
  async writeFile(relative,data,guard=()=>{}){guard();await recoverAssetWrites(this);if(!textExtensions.has(path.extname(relative).toLowerCase()))throw Error('편집 가능한 텍스트 파일이 아니에요.');const file=await this.canonicalFile(relative);const kind=assetKind(relative);if(isNativeTypeAssetKind(kind))return publishNativeTypeAsset(this,relative,data,guard);const references=[],checkedWrite=['effect','curve','abilityset'].includes(kind),before=checkedWrite?await fs.readFile(file,'utf8').catch(error=>{if(error.code==='ENOENT')return null;throw error;}):null;if(assetSuffix[kind]&&!validAsset(kind,JSON.parse(data)))throw Error(assetValidationError(kind,JSON.parse(data))+': '+relative);if(kind==='effect'||kind==='curve'){const canonical=await this.canonicalFile(relative),key=path.relative(this.root,canonical).split(path.sep).join('/').toLowerCase(),roots=new Set(kind==='curve'?(await this.files()).filter(f=>f.kind==='effect').map(f=>f.path):[]);if(kind==='effect')roots.add(relative);const checked=await this.validateEffects([...roots],new Map([[key,data]]));references.push(...checked.guards);}if(kind==='modelimport'){await this.validateModelImportSource(relative,JSON.parse(data));}if(kind==='abilityset'||kind==='curve'){const canonical=await this.canonicalFile(relative),key=path.relative(this.root,canonical).split(path.sep).join('/').toLowerCase();const roots=new Set((await this.files()).filter(f=>f.kind==='abilityset').map(f=>f.path));if(kind==='abilityset')roots.add(relative);const checked=await this.validateAbilitySets([...roots],new Map([[key,data]]));references.push(...checked.guards);}if(relative.endsWith('.hbscene.json')&&!validScene(JSON.parse(data)))throw Error('장면 검증 실패');if(relative.endsWith('.hbblueprint.json'))await this.validateBlueprint(relative,JSON.parse(data));if(checkedWrite)return commitAssetBatch(this,[{path:relative,before,after:data}],guard,async()=>{guard();for(const entry of references)if((await this.inspectFingerprint(entry.path)).revision!==entry.expectedFingerprint)throw Object.assign(Error('저장 중 참조 원본이 변경됐어요: '+entry.path),{status:409,code:'REVISION_CONFLICT'});},{retainJournal:false});return publishAssetText(this,path.relative(this.root,file).split(path.sep).join('/'),data,guard);}
  create(folder,kind,name,parent,initialData){const snapshot=initialData===undefined?undefined:structuredClone(initialData),task=this.writeQueue.then(()=>this.createFile(folder,kind,name,parent,snapshot));this.writeQueue=task.catch(()=>{});return task;}
  async createFile(folder,kind,name,parent,initialData){
    await recoverAssetWrites(this);
    if(!assetTypes[kind]||kind==='code')throw Error('에셋 종류 오류');
    if(initialData!==undefined&&(!['skeletalclip','material'].includes(kind)||!initialData||typeof initialData!=='object'||Array.isArray(initialData)||initialData.name!==name))throw Error('초기 데이터는 이름이 일치하는 골격 클립·머테리얼만 지원해요.');
    const data=initialData===undefined?createAsset(kind,name,parent):initialData;if(!validAsset(kind,data))throw Error('생성 데이터 검증 실패');
    const requested=(folder?folder+'/':'')+name+assetSuffix[kind],file=await this.canonicalFile(requested),relative=path.relative(this.root,file).split(path.sep).join('/');
    if(kind==='blueprint')await this.validateBlueprint(relative,data);
    if(isNativeTypeAssetKind(kind))await publishNativeTypeAsset(this,relative,JSON.stringify(data,null,2),()=>{},{create:true});else await publishAssetText(this,path.relative(this.root,file).split(path.sep).join('/'),JSON.stringify(data,null,2),()=>{},{create:true});return {path:relative,name:path.basename(relative),kind};
  }
  rename(from,to){
    const task=this.writeQueue.then(()=>this.renameFiles(from,to));this.writeQueue=task.catch(()=>{});return task;
  }
  async renameFiles(from,to){
    await recoverAssetWrites(this);
    if(!from||!to||to.startsWith(from+'/'))throw Error('이름 변경 경로 오류');
    const old=await this.resolve(from),next=await this.resolve(to,true,false),source=path.relative(this.root,old).split(path.sep).join('/');
    if(next.startsWith(old+path.sep))throw Error('이름 변경 경로 오류');
    if(isNativeTypeAssetPath(source)&&nativeTypeAssetKind(source)!==nativeTypeAssetKind(to))throw Error('자료형 이름 변경으로 에셋 종류를 바꿀 수 없어요.');
    const moves=[[old,next,source,to]];
    if(modelSource(source)){
      if(path.extname(source).toLowerCase()!==path.extname(to).toLowerCase())throw Error('이름 변경으로 모델 형식을 바꿀 수 없어요.');
      try{const sidecar=await this.resolve(source+'.import.json');moves.push([sidecar,await this.resolve(to+'.import.json',true,false),source+'.import.json',to+'.import.json']);}catch(error){if(error.code!=='ENOENT')throw error;}
    }
    for(const [,target] of moves){try{await fs.access(target);throw Error('같은 이름이 이미 있어요.');}catch(error){if(error.code!=='ENOENT')throw error;}}
    const previousRedirects=this.redirects,previousIndex=structuredClone(this.index),redirects={...this.redirects};
    for(const [,,fromPath,toPath] of moves){delete redirects[toPath];redirects[fromPath]=toPath;}
    const completed=[],redirectFile=path.join(this.root,'.hbredirects.json'),temp=redirectFile+'.'+randomUUID()+'.tmp';let redirectsWritten=false;
    try{
      for(const [fromFile,toFile] of moves){await fs.rename(fromFile,toFile);completed.push([fromFile,toFile]);}
      await fs.writeFile(temp,JSON.stringify(redirects,null,2),{flag:'wx'});await fs.rename(temp,redirectFile);redirectsWritten=true;this.redirects=redirects;
      for(const [,,fromPath,toPath] of moves)for(const key of Object.keys(this.index))if(key===fromPath||key.startsWith(fromPath+'/')){this.index[toPath+key.slice(fromPath.length)]=this.index[key];delete this.index[key];}
      this.modelImportCache?.clear();await this.saveIndex();
    }catch(error){
      this.index=previousIndex;this.redirects=previousRedirects;
      for(const [fromFile,toFile] of completed.reverse())await fs.rename(toFile,fromFile);
      if(redirectsWritten){await fs.writeFile(temp,JSON.stringify(previousRedirects,null,2));await fs.rename(temp,redirectFile);await this.saveIndex();}
      throw error;
    }finally{await fs.unlink(temp).catch(()=>{});}
  }

}
