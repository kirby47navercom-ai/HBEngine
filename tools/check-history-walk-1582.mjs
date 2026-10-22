import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {shareDocumentSnapshot,documentHistoryStorage} from '../prototype/document-snapshot.js';

const source=execFileSync('git',['show','a7b5048:prototype/document-snapshot.js'],{encoding:'utf8',windowsHide:true});
const old=(await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).documentHistoryStorage;
const stats=r=>Object.fromEntries(['undo','redo','uniqueObjects','sharedReferences','slots','estimatedPayloadBytes','truncated','objectBudget','readOnly'].map(k=>[k,r[k]]));
const checks=[],shared={x:'한글',n:-0},cycle={};cycle.self=cycle;
for(const value of [null,undefined,[1,2,NaN,-0,true,'abc',3n],{shared,again:shared,cycle},Object.assign(new Array(12),{2:undefined,11:shared,note:'sparse'}),JSON.parse('{"__proto__":{"x":1},"z":4}'),new Map([['x',shared]])]){
 const h=[{data:value},{data:{nested:value}}],f=[{data:shared}];assert.deepEqual(stats(documentHistoryStorage(h,f)),stats(old(h,f)));
}
checks.push('complete diagnostic counts/payload match previous traversal for shared/cyclic/sparse/special/prototype-key and nonplain values');
let reads=0;const raw=Array.from({length:65536},(_,i)=>i),proxy=new Proxy(raw,{get(target,key,receiver){if(typeof key==='string'&&/^\d+$/.test(key))reads++;return Reflect.get(target,key,receiver);}});
old([{data:proxy}],[],{slotBudget:64});const previousReads=reads;reads=0;const limited=documentHistoryStorage([{data:proxy}],[],{slotBudget:64});const currentReads=reads;assert.equal(previousReads,65536);assert.equal(currentReads,63);assert.equal(limited.slots,64);assert.equal(limited.truncatedBy,'slots');assert(limited.truncated);
checks.push('64-slot diagnostic reads63 array values instead of eagerly reading65536; object/slot limits truncate independently');
const owned=shareDocumentSnapshot(raw,undefined,{ownedPrevious:true}),keys=Object.keys;let enumerated=0;
Object.keys=value=>{const result=keys(value);if(value===owned)enumerated+=result.length;return result;};let dense;try{old([{data:owned}],[]);assert.equal(enumerated,65536);enumerated=0;dense=documentHistoryStorage([{data:owned}],[],{slotBudget:64});assert.equal(enumerated,0);}finally{Object.keys=keys;}
assert.equal(dense.slots,64);assert.equal(documentHistoryStorage([{data:owned}],[],{objectBudget:1}).truncatedBy,'objects');assert.equal(documentHistoryStorage([],[],{slotBudget:1}).truncated,false);for(const slotBudget of [0,-1,1.5,8000001,NaN])assert.throws(()=>documentHistoryStorage([],[],{slotBudget}));
checks.push('owned dense arrays require no full key list; sparse/extra-key arrays keep enumeration; strict bounds and empty history preserved');
const result={passed:true,checks,arrayValues:65536,slotBudget:64,previousReads,currentReads,ownedDenseKeySlotsBefore:65536,ownedDenseKeySlotsAfter:0,scope:'Isolated history diagnostics, exact completed traversal parity and direct property/key counts. Generic Object.keys enumeration is still required for unknown objects/arrays; slot budget bounds visited values, not arbitrary getters/Proxy ownKeys or JSON snapshot/restore cost. No editor/FPS/heap timing claim.'};await fs.writeFile('native/build/history-walk-1582.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
