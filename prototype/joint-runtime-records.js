const empty=new Map();
// Keep references to live records only. Native Map replacement/iteration order
// is retained, including per-owner order, without copying actor/joint state.
export class JointRuntimeRecords extends Map {
 #owners=new Map();#ownerOf=new WeakMap();#breakable=new Set();
 constructor(entries=[]){super();for(const[key,row]of entries)this.set(key,row);}
 set(key,row){const owner=row?.object?.id;if(typeof owner!=='string'||!owner)throw Error('관절 소유자 ID를 확인하세요.');const old=super.get(key),oldOwner=old&&this.#ownerOf.get(old);if(old){this.#breakable.delete(old);if(oldOwner!==owner){const rows=this.#owners.get(oldOwner);rows?.delete(key);if(!rows?.size)this.#owners.delete(oldOwner);}}
  super.set(key,row);let rows=this.#owners.get(owner);if(!rows)this.#owners.set(owner,rows=new Map());rows.set(key,row);this.#ownerOf.set(row,owner);const p=row.component?.properties;if(!row.broken&&(p?.breakDistance>0||p?.breakAngle>0))this.#breakable.add(row);return this;
 }
 delete(key){const row=super.get(key);if(!row)return false;const owner=this.#ownerOf.get(row),rows=this.#owners.get(owner);rows?.delete(key);if(!rows?.size)this.#owners.delete(owner);this.#ownerOf.delete(row);this.#breakable.delete(row);return super.delete(key);}
 clear(){super.clear();this.#owners.clear();this.#breakable.clear();this.#ownerOf=new WeakMap();}
 valuesForOwner(owner){return owner?(this.#owners.get(owner)||empty).values():this.values();}
 entriesForOwner(owner){return owner?(this.#owners.get(owner)||empty).entries():this.entries();}
 breakCandidates(){return this.#breakable.values();}
 markBroken(row){this.#breakable.delete(row);}
 get breakableCount(){return this.#breakable.size;}
 get ownerCount(){return this.#owners.size;}
}
