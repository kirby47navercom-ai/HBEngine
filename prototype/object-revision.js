// Scene object revisions (docs/CHANGE_TRACKING_DESIGN.md). Writers announce changes; consumers may skip re-checking an
// object whose revision is unchanged, but only for kinds marked trusted (every runtime writer of that kind announces).
// Revisions live under a symbol key, so JSON, saves and structuredClone never carry them; a copy starts "unknown".
const REVISION=Symbol('hbRevision');
let serial=0;
// Trusted consumers skip re-checks of objects whose revisions are unchanged. physics: every runtime writer of collider /
// physics-body components, tileColliders and root transforms announces (stage 2). A failed sample check turns it off.
export const revisionTrust={physics:true,material:true};
// Material revisions (stage 3): engine-built materials (sprites, mesh builds, MeshRenderer sync, world assets, material
// operations, sprite effect values) are announced; a material never announced has no revision and is always re-read.
const MATERIAL=Symbol('hbMaterialRevision');
export function touchMaterial(m){if(m&&typeof m==='object')Object.defineProperty(m,MATERIAL,{value:++serial,enumerable:false,configurable:true,writable:true});}
export function materialRevision(m){return m?.[MATERIAL]??null;}
function state(o){let r=o[REVISION];if(!r){r={components:0,transform:0};Object.defineProperty(o,REVISION,{value:r,enumerable:false,configurable:true});}return r;}
// Change subscribers (physics partial sync): every announced object is added to each subscribed Set until consumed.
const subscribers=new Set();
export function subscribeObjectChanges(){const changes=new Set();subscribers.add(changes);return changes;}
export function unsubscribeObjectChanges(changes){subscribers.delete(changes);}
function notify(o){for(const changes of subscribers)changes.add(o);}
// componentSerial counts every announced component change (a cheap "did any object's components change" test).
let componentSerial=0;export const componentRevisionSerial=()=>componentSerial;
// Every announced change (transform or components) advances serial.
export const revisionSerialNow=()=>serial;
// Filtered object lists (and an id map) per list, reused while the list (watched mutators and length) and every
// announced component stay the same. test must depend on components only. Unannounced component edits are found by the
// component index's rolling verification, which advances listCacheConfig.epoch (and, once untrusted, every call rebuilds).
export const listCacheConfig={epoch:0,trusted:true};
const filteredLists=new WeakMap();
function cachedList(objects,key,build,components=true){if(!Array.isArray(objects))return build(objects);watchObjectList(objects);let byKey=filteredLists.get(objects);if(!byKey)filteredLists.set(objects,byKey=new Map());let c=byKey.get(key);const version=listVersion(objects);
 if(!c||c.version!==version||c.length!==objects.length||(components&&c.serial!==componentSerial)||c.epoch!==listCacheConfig.epoch||!listCacheConfig.trusted){c={version,length:objects.length,serial:componentSerial,epoch:listCacheConfig.epoch,value:build(objects)};byKey.set(key,c);}return c.value;}
export const objectsWhere=(objects,key,test)=>cachedList(objects,key,list=>[...list].filter(test));
// First object per id (the same object list.find(o=>o.id===id) returns); ids do not depend on components.
export const objectMapOf=objects=>cachedList(objects,'#byId',list=>{const map=new Map();for(const o of list)if(!map.has(o.id))map.set(o.id,o);return map;},false);
export function touchComponents(o){if(o&&typeof o==='object'){state(o).components=++serial;componentSerial++;notify(o);}}
export function touchTransform(o){if(o&&typeof o==='object'){state(o).transform=++serial;notify(o);}}
// Object list versions: membership changes (push/splice/... wrappers, index replacement) bump the list's version.
const LIST=Symbol('hbListVersion');
export function touchList(list){if(list&&typeof list==='object')Object.defineProperty(list,LIST,{value:(list[LIST]||0)+1,enumerable:false,configurable:true,writable:true});}
export function listVersion(list){return list?.[LIST]||0;}
// Wrap an object list's mutating methods (on that array only) so membership changes bump its version.
export function watchObjectList(list){
 for(const name of ['push','pop','shift','unshift','splice','sort','reverse','fill','copyWithin']){
  if(list[name]?.hbWatched)continue;const original=Array.prototype[name];
  const wrapped=function(...args){touchList(this);return original.apply(this,args);};wrapped.hbWatched=true;
  Object.defineProperty(list,name,{value:wrapped,enumerable:false,configurable:true,writable:true});
 }
 return list;
}
// Current revisions, or null for an object no writer has announced yet (consumers then treat it as unknown).
export function objectRevision(o){return o?.[REVISION]||null;}
// Snapshot taken with a consumer's cached state. An object never announced gets revision 0 entries, so a later
// announcement still differs from the snapshot.
export function revisionSnapshot(o){const r=objectRevision(o);return {components:r?r.components:0,transform:r?r.transform:0};}
export function sameRevision(snapshot,o,kind){const r=objectRevision(o);return !!snapshot&&snapshot[kind]===(r?r[kind]:0);}

// Verify mode (HB_VERIFY_REVISIONS=1, or globalThis.HB_VERIFY_REVISIONS): consumers run their full check as well and
// report values that changed without an announced revision. The reports list the writers still to be converted.
// verify: always run the full check too (tests). sampleMask: outside verify mode a trusted consumer still fully checks one
// in (sampleMask+1) skipped objects; a mismatch is reported and the consumer's trust is switched off.
export const revisionConfig={verify:globalThis.HB_VERIFY_REVISIONS===true||(typeof process!=='undefined'&&process.env?.HB_VERIFY_REVISIONS==='1'),sampleMask:63};
export const revisionMismatches=[];
export function reportRevisionMismatch(kind,o,detail){
 if(revisionMismatches.length<1000)revisionMismatches.push({kind,object:o?.id??null,name:o?.name??null,detail});
}
// HB_REVISION_REPORT=<file>, or HB_REVISION_REPORT_DIR=<folder> for one revisions-<pid>.json per process.
if(revisionConfig.verify&&typeof process!=='undefined'&&(process.env?.HB_REVISION_REPORT||process.env?.HB_REVISION_REPORT_DIR)){
 const file=process.env.HB_REVISION_REPORT||process.env.HB_REVISION_REPORT_DIR+'/revisions-'+process.pid+'.json';
 process.on('exit',()=>{try{process.getBuiltinModule('node:fs').writeFileSync(file,JSON.stringify({mismatches:revisionMismatches},null,1));}catch{}});
}
