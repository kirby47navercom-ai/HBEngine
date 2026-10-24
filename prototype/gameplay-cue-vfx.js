import {GameplayCueAnchor} from './gameplay-cue-anchor.js';

// The empty wrapper preserves the authored prefab root TRS and its bindings.
// Private templates never enter native/network spawn metadata or alias maps.
export function gameplayCueTemplate(template,catalog){
 if(template.objects.some(o=>o.components?.some(c=>['NetworkSession','NetworkReplica'].includes(c.type)&&c.properties?.enabled!==false)))throw Error('Cue VFX에는 네트워크 컴포넌트가 없는 프리팹을 사용하세요.');
 const ids=new Set(template.objects.map(o=>o.id));let root='__cue';while(ids.has(root))root+='_';
 const key='@cue/'+template.key,objects=template.objects.map(o=>o.id===template.root?{...o,parent:root}:o);
 objects.unshift({id:root,name:'Cue VFX',kind:'empty',group:'WORLD',visible:true,position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],components:[]});
 return{template:{...template,key,root,objects},catalog:{bindings:new Map([[key,catalog.bindings.get(template.key)||[]]]),inputAssets:catalog.inputAssets}};
}
export function gameplayCueTransform(row,owner,objects,group){return new GameplayCueAnchor(row).transform(owner,objects,group);}
export class GameplayCueVfx {
 constructor({catalog,spawn,destroy,clock,mesh,update,log}){Object.assign(this,{catalog,spawn,destroy,clock,mesh,update,log});this.entries=new Map();this.roots=new WeakMap();this.leases=new WeakMap();this.owners=new WeakMap();this.templates=new WeakMap();}
 async prepare(program,current=()=>true){const paths=[...new Set((program?.routes||[]).filter(r=>r.action==='play'&&r.vfx).map(r=>r.vfx))];if(!paths.length||!current())return;const catalog=await this.catalog();for(const path of paths){if(!current())return;const template=await catalog.ensure(path);if(!this.templates.has(template))this.templates.set(template,gameplayCueTemplate(template,catalog));}}
 forget(entry){if(this.entries.get(entry.handle)===entry)this.entries.delete(entry.handle);if(entry.root&&this.roots.get(entry.root)===entry)this.roots.delete(entry.root);const rows=this.owners.get(entry.owner);rows?.delete(entry);if(!rows?.size)this.owners.delete(entry.owner);entry.cancelled=true;}
 async remove(entry){const root=entry.root,lease=root&&this.leases.get(root);this.forget(entry);if(root)await this.destroy(root,entry.vm,()=>this.leases.get(root)===lease&&entry.vm.object(root.id)===root&&root.poolActive!==false);}
 async stop(handle){const entry=this.entries.get(handle);if(entry)await this.remove(entry);}
 async removeEntries(entries){let first;for(const entry of entries)try{await this.remove(entry);}catch(error){first??=error;}if(first)throw first;}
 async play(handle,owner,program,row,vm,current){await this.stop(handle);if(!current())return;const entry={handle,owner,program,row,vm,current,cancelled:false,root:null,end:Infinity,anchor:new GameplayCueAnchor(row)};this.entries.set(handle,entry);let rows=this.owners.get(owner);if(!rows)this.owners.set(owner,rows=new Set());rows.add(entry);
  const valid=()=>!entry.cancelled&&this.entries.get(handle)===entry&&current();try{await this.prepare(program,valid);if(!valid()){this.forget(entry);return;}const catalog=await this.catalog(),template=catalog.templates.get(row.vfx),prepared=this.templates.get(template);if(!prepared)throw Error('Cue VFX 템플릿이 준비되지 않았어요.');const transform=entry.anchor.transform(owner,vm.objects,this.mesh?.(owner.id));if(!valid()){this.forget(entry);return;}
   const root=await this.spawn(prepared,transform,owner,row.vfxAttach,vm,valid,root=>{entry.root=root;this.roots.set(root,entry);this.leases.set(root,entry);});if(!root){this.forget(entry);return;}if(!valid())return;entry.end=row.vfxDuration===-1?Infinity:this.clock()+row.vfxDuration;
  }catch(error){this.forget(entry);if(current())throw error;}
 }
 async retire(object){this.leases.delete(object);const root=this.roots.get(object);if(root)this.forget(root);await this.removeEntries([...this.owners.get(object)||[]]);}
 async stopProgram(owner,program){await this.removeEntries([...this.owners.get(owner)||[]].filter(e=>e.program===program));}
 async tick(){const now=this.clock();await this.removeEntries([...this.entries.values()].filter(e=>e.root&&(e.end<=now||!e.current())));}
 async updateAttachments(){for(const entry of this.entries.values()){if(!entry.root||!entry.row.vfxAttach||!entry.row.vfxAnchor||entry.row.vfxAnchor==='owner'||!entry.current())continue;if(this.roots.get(entry.root)!==entry||this.leases.get(entry.root)!==entry||entry.vm.object(entry.root.id)!==entry.root||entry.root.poolActive===false){this.forget(entry);continue;}try{const transform=entry.anchor.transform(entry.owner,entry.vm.objects,this.mesh?.(entry.owner.id));Object.assign(entry.root,transform);this.update?.(entry.root);}catch(error){this.log?.('Cue VFX 부착 종료: '+error.message,entry.vm);await this.remove(entry);}}}
 async stopAll(){await this.removeEntries([...this.entries.values()]);}
 clear(){for(const entry of this.entries.values())entry.cancelled=true;this.entries.clear();this.roots=new WeakMap();this.leases=new WeakMap();this.owners=new WeakMap();this.templates=new WeakMap();}
 inspect(){return[...this.entries.values()].map(e=>({handle:e.handle,owner:e.owner.id,root:e.root?.id||null,asset:e.row.vfx,cueAsset:e.program.path,anchor:e.row.vfxAnchor||'owner',anchorName:e.row.vfxAnchorName||'',attached:e.row.vfxAttach,remaining:e.end===Infinity?-1:Math.max(0,e.end-this.clock())}));}
}
