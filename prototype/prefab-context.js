import {sceneWorldMatrix} from './scene-runtime.js';
import {remapActorReferences} from './actor-references.js';
import {refreshPrefabInstance,prefabLocalRows,prefabInstanceChanges} from './prefab-instances.js';

// Build a read-only preview snapshot. The stage keeps authored local IDs and
// transforms; a wrapper places it at the chosen scene instance's world matrix.
export function prefabContext(scene,resolved,{instance='',asset='',appearance='normal',showOverrides=false}={}){
  if(!Array.isArray(scene?.objects)||!Array.isArray(resolved?.objects)||!['normal','gray','hidden'].includes(appearance)||typeof showOverrides!=='boolean')throw Error('프리팹 편집 환경을 확인하세요.');
  let transform=null,exclude=new Set(),foreground=null,overrides=0,readOnly=[];
  if(instance){
    const root=scene.objects.find(o=>o.id===instance),source=resolved.objects.find(o=>o.id===resolved.root);
    if(!root?.prefabLink||root.prefabAsset!==asset||!source)throw Error('장면의 프리팹 인스턴스를 확인하세요.');
    const local=sceneWorldMatrix(source,resolved.objects);if(local.determinant()===0)throw Error('크기가 0인 프리팹은 문맥 배치할 수 없어요.');
    transform=sceneWorldMatrix(root,scene.objects).multiply(local.invert()).toArray();
    if(showOverrides){const merged=refreshPrefabInstance(scene.objects,root,resolved).objects,owner=merged.find(o=>o.id===instance),known=new Set(resolved.objects.map(o=>o.id)),members=new Set(),children=new Map(),pending=[owner.id],localIds=new Map(Object.entries(owner.prefabLink.ids).map(([local,world])=>[world,local])),used=new Set(localIds.values());for(const row of merged){const parent=row.parent||row.parentId;if(!children.has(parent))children.set(parent,[]);children.get(parent).push(row.id);if(row.prefabRoot===owner.id)pending.push(row.id);}while(pending.length){const id=pending.pop();if(members.has(id))continue;members.add(id);pending.push(...children.get(id)||[]);}for(const row of merged)if(members.has(row.id)&&!localIds.has(row.id)){let id='__hb_instance__/'+row.id;while(used.has(id))id+='_';used.add(id);localIds.set(row.id,id);}foreground=prefabLocalRows(merged,owner.prefabLink,{members,localIds});readOnly=foreground.filter(o=>!known.has(o.id)).map(o=>o.id);const placed=foreground.find(o=>o.id===resolved.root);for(const key of ['position','rotation','scale'])placed[key]=structuredClone(source[key]);overrides=prefabInstanceChanges(scene.objects,root).length;}
    // Include attached overrides and descendants as well as recorded members:
    // showing any of them would duplicate the editable prefab in the backdrop.
    const children=new Map(),pending=[root.id];for(const row of scene.objects){const parent=row.parent||row.parentId;if(parent){if(!children.has(parent))children.set(parent,[]);children.get(parent).push(row.id);}if(row.prefabRoot===root.id)pending.push(row.id);}while(pending.length){const id=pending.pop();if(exclude.has(id))continue;exclude.add(id);for(const child of children.get(id)||[])pending.push(child);}
  }
  const rows=appearance==='hidden'?[]:structuredClone(scene.objects.filter(o=>!exclude.has(o.id))),ids=new Map(rows.map(o=>[o.id,'__hb_context__/'+o.id]));remapActorReferences(rows,[],ids);
  for(const row of rows)row.id=ids.get(row.id);
  return {rows,transform,appearance,foreground,readOnly,showOverrides,overrides,rootLocked:!!instance,root:resolved.root,instance,excluded:exclude.size};
}
