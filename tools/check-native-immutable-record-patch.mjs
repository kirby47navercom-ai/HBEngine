import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {retainTestEvidence} from './test-artifacts.mjs';

const engine=path.resolve(process.argv[2]||'.');
const {worldPatch,applyWorldPatch,immutableNativeSnapshot,patchImmutableNativeRecord}=await import(pathToFileURL(path.join(engine,'prototype/native-transport.js')));
const work=await fs.mkdtemp('native/build/immutable-record-');retainTestEvidence(work);
const detached=value=>JSON.parse(JSON.stringify(value)),frozen=value=>immutableNativeSnapshot(value);
const original=frozen(Object.fromEntries(Array.from({length:220},(_,i)=>['row'+i,{text:'한글 '+i,slot:{offset:[i,i,100,40]},opacity:1}])));
const next=patchImmutableNativeRecord(original,[['row3',frozen({text:'다음',slot:{offset:[12.5,4,100,40]},opacity:.25})],['~/new',frozen({value:5})],['__proto__',frozen({safe:true})]]);
const edits=worldPatch(original,next),full=worldPatch(detached(original),detached(next));assert.deepEqual(edits,full);assert.deepEqual(applyWorldPatch(original,edits),next);assert.equal(original.row3.text,'한글 3');assert(Object.isFrozen(next.row3.slot.offset));assert(Object.hasOwn(next,'__proto__'));assert.equal(Object.getPrototypeOf(next),Object.prototype);assert.equal(edits.length,5);
assert.equal(patchImmutableNativeRecord(next,[['row3',next.row3]]),next);
const twice=patchImmutableNativeRecord(next,[['row4',frozen({text:'세 번째'})]]);assert.deepEqual(applyWorldPatch(original,worldPatch(original,twice)),twice,'skipped generations use the ordinary complete diff');
const mutable=detached(next);mutable.row7.text='외부 가변 변경';assert.deepEqual(applyWorldPatch(next,worldPatch(next,mutable)),mutable,'ordinary mutable edits cannot use trusted metadata');
const removed=detached(next);delete removed.row2;assert.deepEqual(applyWorldPatch(next,worldPatch(next,removed)),removed);
const frames=[];let current=original;for(let frame=0;frame<64;frame++){const changes=Array.from({length:80},(_,i)=>['row'+i,frozen({text:'글자 '+frame,slot:{offset:[i+frame/10,i,100,40]},opacity:1})]);const n=patchImmutableNativeRecord(current,changes);frames.push([current,n]);current=n;}
const measure=fast=>{const times=[];for(let round=0;round<8;round++){const pairs=fast?frames:frames.map(([a,b])=>[detached(a),detached(b)]),start=performance.now();for(let repeat=0;repeat<10;repeat++)for(const [a,b]of pairs)worldPatch(a,b);times.push((performance.now()-start)/(pairs.length*10));}return times.sort((a,b)=>a-b);};
const baseline=measure(false),candidate=measure(true),report={passed:true,identicalOperations:true,retainedSnapshotUnchanged:true,escapedKeys:true,prototypeKeySafe:true,noOpIdentity:true,skippedGenerationFallback:true,mutableFallback:true,removeFallback:true,frames:64,editedRows:80,baselineP50MS:baseline[4],candidateP50MS:candidate[4],scope:'엔진 소유 불변 UI 기록의 변경 경로 생성 CPU·렌더/전송/전체 FPS 제외'};
await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({work,...report}));
