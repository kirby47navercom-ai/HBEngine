import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createBlueprintResolver} from '../prototype/blueprint-inheritance.js';
import {createNativeTypeImportResolver} from '../prototype/native-type-imports.js';
import {nativeTypeReference,readNativeHeader} from '../prototype/native-model.js';
import {compileNativeTypeAsset} from '../prototype/native-type-assets.js';
import {createNativeRecordMigration} from '../prototype/native-record-migration.js';
import {migrateBlueprintRecordValues,migrateBlueprintInstanceRecords,migrateSequenceRecordValues} from '../prototype/record-value-sites.js';
import {migrateRecordOverrideValue} from '../prototype/record-override-values.js';
import {blueprintInstanceDefaults} from '../prototype/blueprint-overrides.js';
import {resolvePrefab} from '../prototype/prefab-variants.js';
import {validAsset} from '../prototype/asset-documents.js';

const kinds=new Set(['blueprint','scene','prefab','sequenceasset']);
const suffix=name=>name.endsWith('.hbtypes.json');
const hash=text=>text===null?null:createHash('sha256').update(text).digest('hex');
const conflict=message=>Object.assign(Error(message),{status:409,code:'REVISION_CONFLICT'});
const merge=(parent,own)=>[...(parent||[]).filter(p=>!(own||[]).some(d=>d.id===p.id)),...(own||[])];
const bytes=rows=>rows.reduce((n,r)=>n+Buffer.byteLength(r.before||'')+Buffer.byteLength(r.after||''),0);

// A plan shares the existing batch journal and CAS, not an independent writer.
// Only declared values are visited; arbitrary JSON/save-game data stays opaque.
export async function planNativeTypeMigration(project,rows,drafts,{restoring=false}={}){
 const changed=new Set();
 for(const row of rows.filter(r=>suffix(r.path)&&r.before!==null&&r.after!==null)){
  const before=compileNativeTypeAsset(JSON.parse(row.before)).metadata,after=compileNativeTypeAsset(JSON.parse(row.after)).metadata;
  for(const old of before.structs){const next=after.structs.find(d=>d.name===old.name);if(next&&JSON.stringify(old.fields.map(f=>[f.name,f.type,f.array,f.structName]))!==JSON.stringify(next.fields.map(f=>[f.name,f.type,f.array,f.structName])))changed.add(old.name);}
 }
 if(!changed.size&&!restoring)return null;
 const initial=await project.files(),names=new Map(initial.filter(f=>kinds.has(f.kind)).map(f=>[f.path,f.kind]));
 for(const row of rows){const kind=initial.find(f=>f.path===row.path)?.kind||Object.entries({blueprint:'.hbblueprint.json',scene:'.hbscene.json',prefab:'.hbprefab.json',sequenceasset:'.hbsequence.json'}).find(([,s])=>row.path.endsWith(s))?.[0];if(kinds.has(kind)){if(row.after===null)names.delete(row.path);else names.set(row.path,kind);}}
 const originals=new Map(),observed=new Map(),contexts=new Map(),oldMetadata=new Map();let values=0;
 const read=async(name,previous=false)=>{
  const file=await project.canonicalFile(name),canonical=path.relative(project.root,file).split(path.sep).join('/'),key=canonical.toLowerCase(),row=rows.find(r=>r.path.toLowerCase()===key);
  if(previous&&row&&row.before!==null)return row.before;
  if(drafts.has(key)){const text=drafts.get(key);if(text===null)throw Error('삭제된 자료형 참조: '+canonical);return text;}
  if(originals.has(key))return originals.get(key);
  const stat=await fs.stat(file).catch(e=>{if(e.code==='ENOENT')return null;throw e;});if(stat&&(!stat.isFile()||stat.size>8388608))throw Error('이관할 제작 원본의8MB 텍스트 범위를 확인하세요: '+canonical);
  const text=stat?await fs.readFile(file,'utf8'):null,fingerprint=hash(text),previousRead=observed.get(key);if(previousRead&&previousRead.expectedFingerprint!==fingerprint)throw conflict('자료형 준비 중 제작 원본이 변경됐어요: '+canonical);observed.set(key,{path:canonical,expectedFingerprint:fingerprint});
  if(text===null)throw Object.assign(Error('자료형 원본이 없어요: '+canonical),{code:'ENOENT'});
  // Keep shared source headers, not a second raw copy of every large scene,
  // prefab and sequence beside the resolver's declarations and changed rows.
  if(!/\.hb(?:blueprint|scene|prefab|sequence)\.json$/.test(canonical))originals.set(key,text);return text;
 };
 const readJson=async name=>JSON.parse(await read(name)),oldRead=name=>read(name,true),oldImports=createNativeTypeImportResolver(oldRead);
 const oldNative=async(reference,current)=>{
  if(restoring)return current;
  const key=JSON.stringify(reference);if(!oldMetadata.has(key))oldMetadata.set(key,(async()=>{
   if(nativeTypeReference(reference))return oldImports(reference);
   const headerPath=reference.headerPath||'Source/DoorController.h',sourcePath=reference.sourcePath||'Source/DoorController.cpp',header=await oldRead(headerPath),source=await oldRead(sourcePath);
   return {...await readNativeHeader(header,{sourcePath:headerPath,readText:oldRead}),header,source,headerPath,sourcePath};
  })());return oldMetadata.get(key);
 };
 const stage=async(name,data,count,force=false)=>{
  if(!count&&!force)return;const key=name.toLowerCase(),existing=rows.find(r=>r.path.toLowerCase()===key),before=existing?.before??await read(name),text=JSON.stringify(data,null,2);
  if(existing)existing.after=text;else rows.push({path:name,before,after:text});drafts.set(key,text);values+=count;if(bytes(rows)>8388608)throw Error('자료형 이관 저장 묶음은 원본·결과 합계8MB까지예요.');
 };
 const resolve=createBlueprintResolver(readJson,name=>read(name),{prepare:async(child,{path:name,parent})=>{
  const raw=await readJson(name),metadata=child.native||parent?.native;if(!metadata)return child;
  const before=raw.native?await oldNative(raw.native,metadata):contexts.get(raw.settings.parentClass)?.before||metadata;
  const schema={...child,native:metadata,settings:{...parent?.settings,...child.settings,parentClass:parent?.settings.parentClass||child.settings?.parentClass},variables:merge(parent?.variables,child.variables),functions:merge(parent?.functions,child.functions),macros:merge(parent?.macros,child.macros),dispatchers:merge(parent?.dispatchers,child.dispatchers),interfaces:merge(parent?.interfaces,child.interfaces)};
  const migrate=createNativeRecordMigration(before,metadata),result=migrateBlueprintRecordValues(raw,schema,migrate);await stage(name,result.data,result.values);contexts.set(name,{before,migrate,schema});
  return result.values?{...result.data,...child.native?{native:child.native}:{}}:child;
 }});
 for(const [name,kind]of names)if(kind==='blueprint'){const root=await resolve(name);if(contexts.has(name))contexts.get(name).schema=root;}
 const contextFor=async object=>{if(!object.blueprintAsset)return null;const root=await resolve(object.blueprintAsset);return contexts.get(object.blueprintAsset)||{schema:root,migrate:(_,value)=>value};};
 const instances=[];
 const adaptObject=async object=>{
  const context=await contextFor(object);if(!context)return {data:object,values:0};instances.push({object,context});const result=migrateBlueprintInstanceRecords(object,context.schema,context.migrate);blueprintInstanceDefaults(context.schema,result.data);return result;
 };
 const adaptPatch=async(owner,patch,key)=>{
  if(!Object.hasOwn(patch,key))return 0;const context=await contextFor(owner);if(!context)return 0;const value=migrateRecordOverrideValue(owner,context.schema,patch.path,patch[key],context.migrate);if(value===patch[key])return 0;patch[key]=value;return 1;
 };
 for(const [name,kind]of names){if(!['scene','prefab'].includes(kind))continue;const raw=await readJson(name),data=structuredClone(raw);let count=0;
  const resolved=kind==='prefab'?await resolvePrefab(name,readJson,{validate:d=>validAsset('prefab',d)}):null;
  for(const key of ['objects','additions'])for(const [i,object]of (data[key]||[]).entries()){
   const result=await adaptObject(object);data[key][i]=result.data;count+=result.values;
   const link=data[key][i].prefabLink;if(link){for(const [j,base]of (link.baseline||[]).entries()){const migrated=await adaptObject(base);link.baseline[j]=migrated.data;count+=migrated.values;}
    for(const patch of link.conflicts||[]){const owner=link.baseline.find(o=>o.id===patch.object)||data.objects.find(o=>o.id===link.ids?.[patch.object]);if(!owner){if(['before','value','source'].some(k=>Object.hasOwn(patch,k)))throw Error('프리팹 충돌 원본을 확인하세요: '+name);continue;}for(const k of ['before','value','source'])count+=await adaptPatch(owner,patch,k);}
   }
  }
  if(resolved)for(const patch of data.overrides||[]){if(patch.remove)continue;const owner=resolved.objects.find(o=>o.id===patch.object);if(!owner)throw Error('프리팹 이관 대상이 없어요: '+name);count+=await adaptPatch(owner,patch,'value');}
  if(!validAsset(kind,data))throw Error('이관한 제작 데이터가 맞지 않아요: '+name);await stage(name,data,count);
 }
 // The editor's normal prefab refresh compares this source revision too. Keep
 // the new revision in the same journal so refresh cannot create a second edit
 // immediately after Save and block the group's Undo.
 const changedPrefabs=new Set(rows.filter(r=>r.before!==r.after&&r.path.endsWith('.hbprefab.json')).map(r=>r.path));
 for(const [name,kind]of names){if(kind!=='scene'||restoring)continue;const data=await readJson(name);let next=data;
  for(const [i,object]of data.objects.entries()){const link=object.prefabLink;if(!link||!changedPrefabs.has(link.asset))continue;const revision=hash(JSON.stringify(await readJson(link.asset)));if(link.sourceRevision===revision)continue;if(next===data)next=structuredClone(data);next.objects[i].prefabLink.sourceRevision=revision;}
  if(next!==data)await stage(name,next,0,true);
 }
 for(const [name,kind]of names){if(kind!=='sequenceasset')continue;const data=await readJson(name),result=migrateSequenceRecordValues(data,(pin,value,track)=>{
  let candidates=instances.filter(row=>row.object.id===track.target).map(row=>row.context);if(!candidates.length)candidates=[...contexts.values()];
  candidates=[...new Set(candidates)].filter(c=>track.type==='variable'?c.schema.variables.some(v=>(v.id===track.variable||v.name===track.variable)&&v.type==='record'&&v.structName===pin.structName):c.schema.native?.classes.some(d=>(!track.className||d.name===track.className)&&d.properties.some(p=>p.name===track.property&&p.type==='record'&&p.structName===pin.structName)));
  if(!candidates.length)throw Error('시퀀스 구조체 선언을 찾을 수 없어요: '+name);
  const versions=candidates.map(c=>c.migrate(pin,value)),signature=JSON.stringify(versions[0]);if(versions.some(v=>JSON.stringify(v)!==signature))throw Error('시퀀스 자료형 원본이 중복돼요: '+name);return versions[0];
 });if(!validAsset(kind,result.data))throw Error('이관한 시퀀스가 맞지 않아요: '+name);await stage(name,result.data,result.values);}
 // Validate final prefab patches as well as direct instances. No flattened
 // objects are written back to a variant or nested prefab.
 for(const [name,kind]of names)if(kind==='prefab'){const resolved=await resolvePrefab(name,readJson,{validate:d=>validAsset('prefab',d)});for(const object of resolved.objects){const c=await contextFor(object);if(c)blueprintInstanceDefaults(c.schema,object);}}
 const writePaths=new Set(rows.map(r=>r.path.toLowerCase())),guards=[...observed.values()].filter(g=>!writePaths.has(g.path.toLowerCase())),initialNames=initial.filter(f=>kinds.has(f.kind)).map(f=>f.path).sort(),finalNames=[...names.keys()].sort();
 return {values,guards,paths:rows.filter(r=>r.before!==r.after).map(r=>r.path),checkInventory:async({written=false}={})=>{const current=(await project.files()).filter(f=>kinds.has(f.kind)).map(f=>f.path).sort();if(JSON.stringify(current)!==JSON.stringify(written?finalNames:initialNames))throw conflict('자료형 저장 중 제작 파일 목록이 변경됐어요. 다시 저장하세요. '+JSON.stringify({added:current.filter(p=>!(written?finalNames:initialNames).includes(p)),missing:(written?finalNames:initialNames).filter(p=>!current.includes(p))}));}};
}
