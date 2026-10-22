import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {shareDocumentSnapshot,documentHistoryStorage} from '../prototype/document-snapshot.js';
import {AssetDocuments} from '../prototype/asset-documents.js';
import {clipboardFixture,clipboardAssets} from './curve-clipboard-fixture-1345.mjs';
import {activeInstalledVersions} from './install-editor.mjs';

assert.deepEqual(await activeInstalledVersions('C:/Users/kirby/HBEngine'),[]);
const owned={ownedPrevious:true},copy=value=>structuredClone(value);
let comparisons=0;
function compare(value,previous){
  const metrics={},expected=shareDocumentSnapshot(value,previous),actual=shareDocumentSnapshot(value,previous,{...owned,metrics});
  assert.deepEqual(actual,expected);assert.deepEqual(Object.keys(actual??{}),Object.keys(expected??{}));comparisons++;
  return {actual,metrics};
}
for(const value of [undefined,null,NaN,-0,3n,true,'x',{a:undefined,b:NaN,c:-0},Object.assign(new Array(4),{2:undefined,note:'sparse'}),JSON.parse('{"a":0,"__proto__":{"value":1},"z":2}'),Object.assign(Object.create(null),{x:1})]){
  compare(value);const before=shareDocumentSnapshot(value);const {actual,metrics}=compare(value,before);assert.strictEqual(actual,before);assert.equal(metrics.containers,0);
}
const prefix=JSON.parse('{"first":1,"__proto__":{"x":2},"tail":3}'),prefixBefore=shareDocumentSnapshot(prefix);prefix.tail=4;const prefixResult=compare(prefix,prefixBefore);assert(Object.hasOwn(prefixResult.actual,'__proto__'));assert.equal(Object.getPrototypeOf(prefixResult.actual),Object.prototype);assert.strictEqual(prefixResult.actual.__proto__,prefixBefore.__proto__);
for(const pair of [
  [{b:2,a:1},{a:1,b:2}],[{a:1},{a:1,b:2}],[{a:1,b:2},{a:1}],
  [[1,2,3],[1,2]],[[1,2],[1,2,3]],
  [Object.assign(new Array(4),{3:'x'}),Object.assign(new Array(4),{1:'x'})],
  [{first:{v:2},last:{v:3}},{first:{v:1},last:{v:3}}],
  [{first:{v:1},last:{v:4}},{first:{v:1},last:{v:3}}]
])compare(...pair);
let seed=1439;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
for(let i=0;i<400;i++){
  const before={rows:Array.from({length:1+Math.floor(random()*16)},(_,j)=>({id:j,value:[random(),j,-0],extra:j%3?undefined:'x'})),meta:{label:'문서',v:NaN}};
  const source=copy(before),index=Math.floor(random()*source.rows.length);source.rows[index].value[Math.floor(random()*3)]=random();
  if(i%5===0)source.rows.reverse();if(i%7===0)delete source.rows[index].extra;if(i%11===0)source.added={x:i};
  const {actual}=compare(source,before);const isolated=copy(actual);isolated.rows[0].value[0]=999;assert.notEqual(before.rows[0].value[0],999);assert.notEqual(actual.rows[0].value[0],999);
}
let beforeReads=0,sourceReads=0;
const accessorBefore={get first(){beforeReads++;return 1;},tail:2},accessorSource={get first(){sourceReads++;return 1;},tail:3};
assert.deepEqual(shareDocumentSnapshot(accessorSource,accessorBefore),{first:1,tail:3});assert.equal(beforeReads,1);assert.equal(sourceReads,1);
const source={nested:{x:1}},same=compare(source,source).actual;assert.notStrictEqual(same,source);assert.notStrictEqual(same.nested,source.nested);
const alias={a:{x:1}};alias.b=alias.a;const cycle={};cycle.self=cycle;
for(const value of [alias,cycle,new Date(0),new Map([['x',{v:1}]]),new Set([1,2]),new Uint8Array([1,2])]){
  const metrics={},result=shareDocumentSnapshot(value,undefined,{...owned,metrics});assert.deepEqual(result,copy(value));assert.equal(metrics.fallback,true);if(value===alias)assert.strictEqual(result.a,result.b);if(value===cycle)assert.strictEqual(result.self,result);
}
for(const value of [{f:()=>1},{s:Symbol('unsupported')}])assert.throws(()=>shareDocumentSnapshot(value,undefined,owned),{name:'DataCloneError'});
const fixture=clipboardFixture(),documents=new AssetDocuments(),doc=documents.open(clipboardAssets.sequence,'sequenceasset',fixture.sequence);doc.data.tracks[0].asset='Assets/Old/Clip.hbanimation.json';
for(let i=0;i<3;i++){doc.history.push({kind:doc.kind,data:shareDocumentSnapshot(doc.data,doc.history.at(-1)?.data,owned)});doc.data.tracks[0].keys[0].value[0]+=i+1;}
doc.future.push({kind:doc.kind,data:shareDocumentSnapshot(doc.data,doc.history.at(-1).data,owned)});documents.rename('Assets/Old','Assets/New');for(const frame of [...doc.history,...doc.future])assert.equal(frame.data.tracks[0].asset,'Assets/New/Clip.hbanimation.json');assert.equal(doc.history[0].data.tracks[0].keys[0].value[0],fixture.sequence.tracks[0].keys[0].value[0]);

const base={tracks:[{id:'track',keys:Array.from({length:16384},(_,i)=>({time:i/60,value:[i,0,0],interpolation:'linear'}))}]};
function run(lazy,counted=false){
  const live=copy(base),frames=[],totals={visitedObjects:0,containers:0,reusedObjects:0},begin=performance.now();
  for(let i=0;i<8;i++){
    const metrics=counted?{}:undefined,data=shareDocumentSnapshot(live,frames.at(-1)?.data,{ownedPrevious:lazy,metrics});frames.push({data});
    if(metrics)for(const key of Object.keys(totals))totals[key]+=metrics[key];live.tracks[0].keys[i].value[0]=-i-1;
  }
  const ms=performance.now()-begin;assert.equal(frames[0].data.tracks[0].keys[3].value[0],3);assert.equal(frames[7].data.tracks[0].keys[3].value[0],-4);assert.strictEqual(frames[7].data.tracks[0].keys[100],frames[0].data.tracks[0].keys[100]);
  return {ms,...counted?{...totals,storage:documentHistoryStorage(frames,[])}:{}};
}
const baseline=run(false,true),lazy=run(true,true);assert.equal(baseline.visitedObjects,lazy.visitedObjects);assert.equal(baseline.reusedObjects,lazy.reusedObjects);assert(lazy.containers<baseline.containers/7);assert.deepEqual(lazy.storage,baseline.storage);
const unchanged=copy(base),previous=shareDocumentSnapshot(unchanged),sameMetrics={};assert.strictEqual(shareDocumentSnapshot(unchanged,previous,{...owned,metrics:sameMetrics}),previous);assert.equal(sameMetrics.containers,0);assert(sameMetrics.visitedObjects>32000);
const timings=[];for(let i=0;i<4;i++){let a,b;if(i%2){b=run(true).ms;a=run(false).ms;}else{a=run(false).ms;b=run(true).ms;}timings.push({baselineMS:a,lazyMS:b});}
const report={passed:true,comparisons,baseline,lazy,unchanged:sameMetrics,timings,compatibility:{publicAccessorReadCount:true,liveAndSameInputIsolation:true,orderSparseOwnProtoSpecials:true,aliasCycleNonplainFallback:true,unsupportedCloneErrors:true,renameHistoryFuture:true},scope:'Deterministic result-container allocations during 8 snapshots x16384 keys, source traversal/reused objects equal. Alternating authoring CPU samples are observations, not controlled GC/heap, total allocator traffic, game FPS or full-walk elimination. ownedPrevious requires private data-property history frames; public default retains old getter reads.'};
await fs.writeFile('native/build/history-containers-1439.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
