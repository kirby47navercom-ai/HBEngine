import {resolvePrefab,setPrefabOverride,prefabComponents} from './prefab-variants.js';
import {validAsset} from './asset-documents.js';
import {createPlacedObject} from './placement-catalog.js';
import {addSceneComponent,componentDefaults,editComponentProperty,physicsGeometryError,validComponentProperties} from './scene-components.js';
import {remapActorReferences} from './actor-references.js';
import {sceneDescendants,validParent,pasteSceneObjects,setObjectMatrix} from './scene-editor.js';
import {sceneWorldMatrix} from './scene-runtime.js';
import {validScene,defaultSurface} from './model.js';

const copy=v=>structuredClone(v),safe=p=>Array.isArray(p)&&p.length>0&&p.length<=32&&p.every(k=>(typeof k==='string'||Number.isInteger(k))&&!['__proto__','prototype','constructor'].includes(String(k)));
export async function resolvePrefabStage(path,data,read){
  const resolved=await resolvePrefab(path,p=>p===path?copy(data):read(p),{validate:d=>validAsset('prefab',d)});
  for(const o of resolved.objects){prefabComponents(o);if(o.parentId){o.parent=o.parent||o.parentId;delete o.parentId;}}
  return resolved;
}
function access(row,path,value,write=false,remove=false){
  let at=row;for(const key of path.slice(0,-1)){at=Array.isArray(at)&&typeof key==='string'?at.find(c=>c?.id===key):at?.[key];if(!at||typeof at!=='object')throw Error('편집할 속성이 없어요.');}
  const leaf=path.at(-1),key=Array.isArray(at)&&typeof leaf==='string'?at.findIndex(c=>c?.id===leaf):leaf;if(Array.isArray(at)&&(!Number.isInteger(key)||key<0||key>=at.length))throw Error('편집할 배열 항목이 없어요.');
  if(!write)return at[key];if(remove){if(Array.isArray(at))at.splice(key,1);else delete at[key];}else at[key]=copy(value);
}
function setProperty(data,row,path,value,{remove=false}={}){
  if(!safe(path)||['id','parent','parentId','nestedPrefab','prefabLink','prefabRoot','prefabLocalId','prefabAsset'].includes(path[0]))throw Error('편집할 프리팹 속성 경로를 확인하세요.');
  const own=[...data.objects,...data.additions||[]].find(o=>o.id===row.id);
  if(own&&path[0]==='components')prefabComponents(own);
  const prefix=(a,b)=>a.length<=b.length&&a.every((v,i)=>v===b[i]),ancestor=(data.overrides||[]).find(o=>o.object===row.id&&prefix(o.path,path)),target=ancestor?.path||path;
  if(own&&!ancestor){access(own,path,value,true,remove);data.overrides=(data.overrides||[]).filter(o=>o.object!==row.id||!prefix(path,o.path));return;}
  const effective=copy(row);access(effective,path,value,true,remove);const next=access(effective,target);
  data.overrides=(data.overrides||[]).filter(o=>o.object!==row.id||!prefix(target,o.path));setPrefabOverride(data,row.id,target,next,{remove:next===undefined});
}
// One canonical source transaction, used by the inspector and AI commands. The caller owns CAS/Undo.
export async function editPrefabStage(path,source,read,settings={}){
  const data=copy(source),resolved=await resolvePrefabStage(path,data,read),rows=resolved.objects;
  const row=rows.find(o=>o.id===settings.object),operation=settings.operation;let selected=row?.id||resolved.root;
  if(!['create','paste'].includes(operation)&&!row)throw Error('프리팹 오브젝트 ID를 확인하세요.');
  if(operation==='group'){
    if(row.id===resolved.root)throw Error('루트 아래의 오브젝트를 선택하세요.');
    const group=await editPrefabStage(path,data,read,{operation:'create',key:'group',parent:row.parent||resolved.root});
    const result=await editPrefabStage(path,group.data,read,{operation:'reparent',object:row.id,parent:group.result.selected});result.result={operation,selected:group.result.selected,objects:result.resolved.objects.length};return result;
  }
  if(operation==='ungroup'){
    if(row.id===resolved.root||row.nestedPrefab||!['empty','group'].includes(row.kind))throw Error('중첩 원본이 아닌 그룹을 선택하세요.');
    let next=data;for(const child of rows.filter(o=>o.parent===row.id))next=(await editPrefabStage(path,next,read,{operation:'reparent',object:child.id,parent:row.parent||resolved.root})).data;
    return editPrefabStage(path,next,read,{operation:'remove',object:row.id});
  }
  if(operation==='property')setProperty(data,row,settings.property,settings.value,{remove:settings.remove===true});
  else if(operation==='transform'){for(const key of ['position','rotation','scale'])if(Object.hasOwn(settings.value||{},key))setProperty(data,row,[key],settings.value[key]);}
  else if(operation==='component.add'||operation==='component.remove'||operation==='component.set'||operation==='component.reset'||operation==='component.properties'){
    const draft=copy(row),components=prefabComponents(draft),component=components.find(c=>c.id===settings.component);
    if(operation==='component.add')addSceneComponent(draft,settings.type);
    else{if(!component||component.type==='Transform')throw Error('편집할 컴포넌트를 확인하세요.');
      if(operation==='component.remove')components.splice(components.indexOf(component),1);
      else if(operation==='component.reset')component.properties=componentDefaults(component.type);
      else if(operation==='component.properties'){if(!validComponentProperties(component.type,settings.value))throw Error('컴포넌트 값의 범위를 확인하세요.');component.properties=copy(settings.value);}
      else{const next=editComponentProperty(component.type,component.properties,settings.key,settings.value);if(!validComponentProperties(component.type,next))throw Error('컴포넌트 값의 범위를 확인하세요.');component.properties=next;}
    }
    const reason=physicsGeometryError(components);if(reason)throw Error(reason);
    setProperty(data,row,['components'],components);
  }else if(operation==='create'){
    const parent=settings.parent||resolved.root;if(!rows.some(o=>o.id===parent))throw Error('부모 프리팹 오브젝트가 없어요.');
    const next=createPlacedObject(settings.key,{id:settings.id||crypto.randomUUID(),position:settings.position||[0,0,0]});
    if(rows.some(o=>o.id===next.id)||next.id.includes('/'))throw Error('새 로컬 ID가 겹치거나 중첩 경로예요.');
    next.group='PREFAB';next.parent=parent;(data.additions??=[]).push(next);selected=next.id;
  }else if(operation==='paste'){
    if(!Array.isArray(settings.objects)||!settings.objects.length||settings.objects.some(o=>o?.prefabLink)||!validScene({version:1,objects:settings.objects,surface:defaultSurface}))throw Error('붙여넣을 오브젝트 계층을 확인하세요.');
    const parent=settings.parent||resolved.root;if(!rows.some(o=>o.id===parent))throw Error('부모 오브젝트가 없어요.');
    const pasted=pasteSceneObjects(copy(rows),settings.objects),ids=new Set(pasted.map(o=>o.id));
    for(const o of pasted){delete o.nestedPrefab;if(!o.parent&&o.parentId)o.parent=o.parentId;delete o.parentId;for(const key of ['prefabRoot','prefabLocalId','prefabAsset','spawnRoot','spawnLocalId'])delete o[key];if(!ids.has(o.parent))o.parent=parent;}
    (data.additions??=[]).push(...pasted);selected=pasted[0].id;
  }else if(operation==='duplicate'){
    const sourceRows=sceneDescendants(rows,[row.id]),ids=new Map(sourceRows.map(o=>[o.id,crypto.randomUUID()])),copies=copy(sourceRows);
    for(const o of copies){const old=o.id;o.id=ids.get(old);o.name+=' 복사';o.parent=ids.get(o.parent)||o.parent||resolved.root;delete o.nestedPrefab;if(old===resolved.root)o.position=o.position.map((v,i)=>v+(i===0?1:0));}
    remapActorReferences(copies,[],ids);(data.additions??=[]).push(...copies);selected=ids.get(row.id);
  }else if(operation==='remove'){
    if(row.id===resolved.root)throw Error('프리팹 루트는 삭제할 수 없어요.');
    const removed=new Set(sceneDescendants(rows,[row.id]).map(o=>o.id));
    data.objects=data.objects.filter(o=>!removed.has(o.id));data.additions=(data.additions||[]).filter(o=>!removed.has(o.id));
    data.removed=[...new Set([...(data.removed||[]),...removed])];
    data.overrides=(data.overrides||[]).filter(o=>!removed.has(o.object));data.reparented=(data.reparented||[]).filter(o=>!removed.has(o.object));selected=row.parent||resolved.root;
  }else if(operation==='reparent'){
    const parent=settings.parent||resolved.root;if(row.id===resolved.root||!validParent(rows,row.id,parent))throw Error('루트·순환 부모 연결은 사용할 수 없어요.');
    if(!rows.some(o=>o.id===parent))throw Error('부모 오브젝트가 없어요.');
    const transformed=copy(row);if(settings.keepWorld!==false)setObjectMatrix(transformed,sceneWorldMatrix(rows.find(o=>o.id===parent),rows).invert().multiply(sceneWorldMatrix(row,rows)));
    const own=[...data.objects,...data.additions||[]].find(o=>o.id===row.id);data.reparented=(data.reparented||[]).filter(o=>o.object!==row.id);
    if(own){own.parent=parent;delete own.parentId;}else data.reparented.push({object:row.id,parent});
    if(settings.keepWorld!==false)for(const key of ['position','rotation','scale'])setProperty(data,row,[key],transformed[key]);
  }else throw Error('프리팹 편집 동작을 확인하세요.');
  if(!validAsset('prefab',data))throw Error('프리팹 편집 결과의 속성·계층을 확인하세요.');
  const next=await resolvePrefabStage(path,data,read);
  return {data,resolved:next,result:{operation,selected,objects:next.objects.length}};
}
