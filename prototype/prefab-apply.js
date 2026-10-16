import {resolvePrefab,setPrefabOverride,prefabComponents} from './prefab-variants.js';
import {applyPrefabProperty,prefabLocalRows,prefabFieldChanges,prefabPropertyAccess} from './prefab-instances.js';
import {validAsset} from './asset-documents.js';
import {componentDefinitions} from './scene-components.js';

const copy=v=>v===undefined?undefined:structuredClone(v);
const prefix=(a,b)=>a.length<=b.length&&a.every((key,i)=>key===b[i]);
const overlaps=(a,b)=>prefix(a,b)||prefix(b,a);
const readField=(row,path)=>{try{return prefabPropertyAccess(row,path,false);}catch{return undefined;}};
const normalized=row=>{const value=copy(row);prefabComponents(value);return value;};
const anchor=(resolved,id)=>[...resolved.resolvedAnchors||[]].filter(([key])=>id.startsWith(key+'/')).sort((a,b)=>a[0].length-b[0].length)[0];
function tree(rows,id){const children=new Map(),ids=new Set(),pending=[id];for(const row of rows){const p=row.parent||row.parentId;if(!children.has(p))children.set(p,[]);children.get(p).push(row.id);}while(pending.length){const next=pending.pop();if(ids.has(next))continue;ids.add(next);pending.push(...children.get(next)||[]);}return ids;}

// A request owns its reads and drafts. No global cache, source mutation, or
// background work; the caller commits the returned documents in one CAS batch.
export async function prefabApplyPlan({asset,objects,root,object,property,read}){
  if(!root?.prefabLink||root.prefabAsset!==asset||typeof object!=='string'||!Array.isArray(property))throw Error('프리팹 적용 대상을 확인하세요.');
  if(property.length&&['id','parent','parentId','prefabAsset','prefabLink','prefabRoot','prefabLocalId','nestedPrefab'].includes(property[0]))throw Error('프리팹 구조 속성은 별도 계층 작업으로 적용하세요.');
  const sources=new Map(),resolved=new Map(),targets=[],seen=new Set();
  const load=async name=>{if(!sources.has(name)){const value=copy(await read(name));if(!validAsset('prefab',value))throw Error('프리팹 검증 실패: '+name);sources.set(name,value);}return sources.get(name);};
  const resolve=async name=>{if(!resolved.has(name))resolved.set(name,resolvePrefab(name,load,{validate:data=>validAsset('prefab',data)}));return resolved.get(name);};
  const local=prefabLocalRows(objects,root.prefabLink),current=local.find(o=>o.id===object);
  if(property.length){if(!current)throw Error('적용할 인스턴스 오브젝트가 없어요.');prefabPropertyAccess(current,property,false);}
  const adding=!property.length&&!!current,added=adding?tree(local,object):new Set();
  const visit=async(name,id,namespace,layers,probe=id)=>{
    const key=JSON.stringify([name,namespace]);if(seen.has(key))return;seen.add(key);
    const data=await load(name),source=await resolve(name),row=source.objects.find(o=>o.id===id),layer={asset:name,object:id,namespace};
    if(!row&&!adding)return;
    const path=[...layers,layer];
    if(!(id===source.root&&['position','rotation'].includes(property[0])))targets.push({key,asset:name,object:id,namespace,layers:path,source});
    if(data.parent){const parent=await resolve(data.parent),a=anchor(source,probe),b=anchor(parent,probe);if((!a&&!b)||(a&&b&&a[0]===b[0]&&a[1]===b[1]))await visit(data.parent,id,namespace,path,probe);}
    const nested=anchor(source,probe);if(nested)await visit(nested[1],id.startsWith(nested[0]+'/')?id.slice(nested[0].length+1):id,namespace+nested[0]+'/',path,probe.slice(nested[0].length+1));
  };
  await visit(asset,object,'',[],adding?current.parent||current.parentId:object);

  function context(target){
    const ids={};for(const row of target.source.objects){const value=root.prefabLink.ids[target.namespace+row.id];if(!value)throw Error('프리팹 소스를 동기화한 뒤 적용하세요.');ids[row.id]=value;}
    const localIds=new Map(target.source.objects.map(o=>[target.namespace+o.id,o.id]));for(const id of added){const next=id.startsWith(target.namespace)?id.slice(target.namespace.length):id;if(Object.hasOwn(ids,next))throw Error('추가할 안쪽 오브젝트 ID가 겹쳐요.');ids[next]=root.prefabLink.ids[id];localIds.set(id,next);}
    const rootId=ids[target.source.root],rows=objects.filter(o=>o.prefabRoot===root.id&&localIds.has(o.prefabLocalId)).map(o=>({...copy(o),prefabRoot:rootId,prefabAsset:target.asset,prefabLocalId:localIds.get(o.prefabLocalId)})),owner=rows.find(o=>o.id===rootId);
    if(!owner)throw Error('안쪽 프리팹 루트가 인스턴스에 없어요.');
    owner.prefabLink={version:1,asset:target.asset,root:target.source.root,ids,baseline:copy(target.source.objects),conflicts:[]};return {rows,owner,ids,localIds};
  }
  function expandedPath(target,rows,owner){
    const wanted=prefabLocalRows(rows,owner.prefabLink).find(o=>o.id===target.object),source=normalized(target.source.objects.find(o=>o.id===target.object));
    for(let i=1;i<=property.length;i++){
      const p=property.slice(0,i),parent=i>1?readField(source,p.slice(0,-1)):source;
      if(Array.isArray(parent)&&typeof p.at(-1)==='number'&&p.at(-1)>=parent.length)return p.slice(0,-1);
      if(i<property.length&&readField(source,p)===undefined&&readField(wanted,p)!==undefined)return p;
    }
    return property;
  }
  function checkReferences(target,rows,path){
    const row=rows.find(o=>o.prefabLocalId===target.object),allowed=new Set(rows.map(o=>o.id));
    const check=value=>{for(const id of Array.isArray(value)?value:[value])if(id&&(!allowed.has(id)||typeof id!=='string'))throw Error('선택한 원본 밖의 오브젝트 참조는 안쪽 프리팹에 적용할 수 없어요.');};
    for(const key of ['owner','controller','pawn'])if(!path.length||path[0]===key)check(row[key]);
    if(!path.length||path[0]==='components')for(const c of row.components||[])if(path.length<2||c.id===path[1])for(const[key,field]of Object.entries(componentDefinitions[c.type]?.properties||{}))if(field.objectReference&&(path.length<4||key===path[3]))check(c.properties?.[key]);
    // Native/BP property metadata must be resolved before their actor fields
    // can be classified. Never guess that every string is an actor reference.
    if(target.namespace&&(['nativeProperties','variableValues','overrides'].includes(path[0])||!path.length&&(row.nativeProperties||row.overrides||row.variableValues)))throw Error('안쪽 코드 속성 적용은 공개 자료형 메타데이터 연결이 필요해요.');
  }
  const publicTargets=[];
  for(const target of targets){let effectiveProperty=property,scope='property';try{if(property.length){const c=context(target);effectiveProperty=expandedPath(target,c.rows,c.owner);if(effectiveProperty.length!==property.length){const row=prefabLocalRows(c.rows,c.owner.prefabLink).find(o=>o.id===target.object);scope=effectiveProperty[0]==='components'&&effectiveProperty.length===2?'component':Array.isArray(readField(row,effectiveProperty))?'array':'object';}}}catch(error){target.unavailable=error.message;}
    if(!property.length&&target.object===target.source.root)target.unavailable='안쪽 프리팹 루트는 삭제할 수 없어요.';
    publicTargets.push({key:target.key,asset:target.asset,object:target.object,namespace:target.namespace,level:target.layers.length-1,effectiveProperty:[...effectiveProperty],scope,expands:!prefix(property,effectiveProperty)||property.length!==effectiveProperty.length,...target.unavailable?{unavailable:target.unavailable}:{}});
  }
  return {targets:publicTargets,sources,async apply(key,{allowExpansion=false}={}){
    const target=targets.find(t=>t.key===key),description=publicTargets.find(t=>t.key===key);if(!target||target.unavailable)throw Error(target?.unavailable||'적용할 원본을 선택하세요.');
    const effective=description.effectiveProperty;if(description.expands&&!allowExpansion)throw Object.assign(Error('이 항목은 표시한 속성 그룹 전체 적용이 필요해요.'),{code:'APPLY_SCOPE_EXPANSION',effectiveProperty:effective});
    const drafts=new Map(),fresh=name=>resolvePrefab(name,async p=>drafts.has(p)?copy(drafts.get(p)):load(p),{validate:data=>validAsset('prefab',data)});
    let idRemap={};if(target.namespace||target.asset!==asset){const c=context(target);if(property.length)checkReferences(target,c.rows,effective);else if(adding)for(const id of added)checkReferences({...target,object:c.localIds.get(id)},c.rows,[]);drafts.set(target.asset,applyPrefabProperty(await load(target.asset),target.source,c.rows,c.owner,target.object,effective));if(adding)idRemap=Object.fromEntries([...added].map(id=>[id,target.namespace+c.localIds.get(id)]));}
    else drafts.set(asset,applyPrefabProperty(await load(asset),target.source,objects,root,object,effective));
    const removed=!property.length&&!adding?tree(target.source.objects,target.object):new Set();
    if(removed.size){
      const inherits=async name=>{const seen=new Set();while(name&&!seen.has(name)){if(name===target.asset)return true;seen.add(name);name=(await load(name)).parent;}return false;};
      // A changed inner asset can occur more than once, including through a
      // different variant. Remove now-orphaned overrides at every affected
      // occurrence, rather than only the one selected in the scene.
      for(const name of [...sources.keys()]){if(name===target.asset)continue;const before=await resolve(name),prefixes=[];if(await inherits(name))prefixes.push('');for(const [id,nested]of before.resolvedAnchors||[])if(await inherits(nested))prefixes.push(id+'/');if(!prefixes.length)continue;const ids=new Set(prefixes.flatMap(p=>[...removed].map(id=>p+id))),original=await load(name),data=copy(original);data.objects=data.objects.filter(o=>!ids.has(o.id));if(data.additions)data.additions=data.additions.filter(o=>!ids.has(o.id));if(data.overrides)data.overrides=data.overrides.filter(o=>!ids.has(o.object));if(data.reparented)data.reparented=data.reparented.filter(o=>!ids.has(o.object)&&!ids.has(o.parent));if(data.removed)data.removed=data.removed.filter(id=>!ids.has(id));if(JSON.stringify(data)!==JSON.stringify(original)){if(!validAsset('prefab',data))throw Error('상위 프리팹 구조를 확인하세요.');drafts.set(name,data);}}
    }
    for(const layer of target.layers.slice(0,-1).reverse()){
      const before=await resolve(layer.asset),data=copy(await load(layer.asset));
      if(!property.length)continue;
      const beforeRow=normalized(before.objects.find(o=>o.id===layer.object));
      data.overrides=(data.overrides||[]).filter(o=>!(o.object===layer.object&&overlaps(o.path,effective)));
      if(data.parent&&(await fresh(data.parent)).objects.some(o=>o.id===layer.object))data.objects=data.objects.filter(o=>o.id!==layer.object);
      drafts.set(layer.asset,data);const base=(await fresh(layer.asset)).objects.find(o=>o.id===layer.object);if(!base)throw Error('적용 경로의 원본 오브젝트가 사라졌어요.');const normalizedBase=normalized(base),value=readField(normalizedBase,effective);prefabPropertyAccess(beforeRow,effective,true,value,value===undefined);
      for(const change of prefabFieldChanges(normalizedBase,beforeRow))if(!overlaps(change.path,effective)){
        if(['parent','parentId'].includes(change.path[0])){data.reparented=(data.reparented||[]).filter(r=>r.object!==layer.object);if(change.value)data.reparented.push({object:layer.object,parent:change.value});}
        else setPrefabOverride(data,layer.object,change.path,change.value,{remove:change.deleted});
      }
      if(!validAsset('prefab',data))throw Error('적용할 상위 프리팹의 형식을 확인하세요.');drafts.set(layer.asset,data);
    }
    const final=await fresh(asset);if(adding&&Object.values(idRemap).some(id=>!final.objects.some(o=>o.id===id)))throw Error('상위 원본에서 숨긴 새 자식 ID를 먼저 복원하세요.');return {drafts,effectiveProperty:effective,resolved:final,idRemap,target:{...description}};
  }};
}
