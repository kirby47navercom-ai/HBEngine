// Component index (docs/HOST_SCENE_DESIGN.md): per-frame services visit only the objects that have a component type
// instead of every object. Membership follows the object list (watched mutators, listVersion) and announced component
// changes (object-revision subscription); arrays keep the list order. One in SAMPLE_EVERY syncs rebuilds the index from
// scratch and compares: a difference is reported and switches the index off (every sync then rebuilds, as before).
import {listCacheConfig,subscribeObjectChanges,unsubscribeObjectChanges,objectRevision,listVersion,watchObjectList,reportRevisionMismatch,revisionConfig} from './object-revision.js';
import {objectComponents} from './scene-components.js';

export const componentIndexConfig={trusted:true,sampleEvery:64};
const VERIFY_WINDOW=256;
const typeSet=o=>{const out=new Set();for(const c of objectComponents(o))out.add(c.type);return out;};
const components=o=>{const r=objectRevision(o);return r?r.components:0;};

export function createComponentIndex(){
 const changes=subscribeObjectChanges();let list=null,version=-1,length=-1,syncs=0,cursor=0;
 const members=new Map(),entries=new Map(),arrays=new Map(),positions=new Map();
 function add(o){const types=typeSet(o);entries.set(o,{components:components(o),types});for(const type of types){let set=members.get(type);if(!set)members.set(type,set=new Set());set.add(o);}}
 function rebuild(objects){members.clear();entries.clear();arrays.clear();positions.clear();for(let i=0;i<objects.length;i++){const o=objects[i];positions.set(o,i);add(o);}list=objects;version=listVersion(objects);length=objects.length;changes.clear();}
 function same(a,b){if(a.size!==b.size)return false;for(const v of a)if(!b.has(v))return false;return true;}
 function verify(objects){
  const fresh=new Map();for(const o of objects)for(const type of typeSet(o)){let set=fresh.get(type);if(!set)fresh.set(type,set=new Set());set.add(o);}
  for(const type of new Set([...fresh.keys(),...members.keys()])){const a=fresh.get(type)||new Set(),b=members.get(type)||new Set();if(same(a,b))continue;const o=[...a].find(v=>!b.has(v))||[...b].find(v=>!a.has(v));reportRevisionMismatch('componentIndex',o,{type});componentIndexConfig.trusted=false;return false;}
  return true;
 }
 // Brings the index up to date with objects; call once per frame before of().
 function sync(objects){
  watchObjectList(objects);
  if(!componentIndexConfig.trusted||revisionConfig.verify||objects!==list||listVersion(objects)!==version||objects.length!==length){rebuild(objects);return;}// length: writes like list.length=0 bypass the watched mutators
  for(const o of changes){const entry=entries.get(o);if(!entry||entry.components===components(o))continue;const types=typeSet(o);if(!same(types,entry.types))for(const type of new Set([...types,...entry.types]))arrays.delete(type);
   for(const type of entry.types)members.get(type)?.delete(o);entries.delete(o);add(o);}
  changes.clear();
  // Rolling verification: each sync re-reads the component types of a window of objects (VERIFY_WINDOW) and compares
  // them with the index, so every object is checked once per list/VERIFY_WINDOW syncs without a whole-list pause.
  // A difference is reported and switches the index off (rebuilt every sync).
  syncs++;const n=objects.length,count=Math.min(n,VERIFY_WINDOW);for(let k=0;k<count;k++){const o=objects[(cursor+k)%n],entry=entries.get(o);if(entry&&same(typeSet(o),entry.types))continue;reportRevisionMismatch('componentIndex',o,{types:[...typeSet(o)]});componentIndexConfig.trusted=false;listCacheConfig.epoch++;listCacheConfig.trusted=false;rebuild(objects);return;}cursor=n?(cursor+count)%n:0;
 }
 // Objects having a component of type, in list order (cached until membership of that type changes).
 function of(type){let array=arrays.get(type);if(array)return array;const set=members.get(type);array=set?[...set].sort((a,b)=>positions.get(a)-positions.get(b)):[];arrays.set(type,array);return array;}
 const position=o=>positions.get(o)??-1;
 const dispose=()=>{unsubscribeObjectChanges(changes);changes.clear();members.clear();entries.clear();arrays.clear();positions.clear();};
 return {sync,of,position,dispose};
}
