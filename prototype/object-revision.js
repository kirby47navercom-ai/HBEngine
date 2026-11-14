// Scene object revisions (docs/CHANGE_TRACKING_DESIGN.md). Writers announce changes; consumers may skip re-checking an
// object whose revision is unchanged, but only for kinds marked trusted (every runtime writer of that kind announces).
// Revisions live under a symbol key, so JSON, saves and structuredClone never carry them; a copy starts "unknown".
const REVISION=Symbol('hbRevision');
let serial=0;
// Trusted consumers skip re-checks of objects whose revisions are unchanged. physics: every runtime writer of collider /
// physics-body components, tileColliders and root transforms announces (stage 2). A failed sample check turns it off.
export const revisionTrust={physics:true};
function state(o){let r=o[REVISION];if(!r){r={components:0,transform:0};Object.defineProperty(o,REVISION,{value:r,enumerable:false,configurable:true});}return r;}
export function touchComponents(o){if(o&&typeof o==='object')state(o).components=++serial;}
export function touchTransform(o){if(o&&typeof o==='object')state(o).transform=++serial;}
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
