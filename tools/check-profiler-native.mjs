import assert from 'node:assert/strict';
import {RuntimeProfiler,ProfilerPanel} from '../prototype/profiler.js';
let now=0;const profiler=new RuntimeProfiler({now:()=>now,capacity:2});profiler.recording=true;
const frame=profiler.begin();profiler.native(frame,{clientSerializeMs:2,clientOperationsMs:3,invokeMs:.5,rpcMs:8,negativeMs:-1,infiniteMs:Infinity,secret:'omit'});now=15;profiler.finish(frame);
assert.deepEqual(frame.nativePackets,[{clientSerializeMs:2,clientOperationsMs:3,invokeMs:.5,rpcMs:8}]);assert.equal(profiler.snapshot().frames[0].duration,15);
const previous=globalThis.document;globalThis.document={activeElement:null};const element={isConnected:false,contains:()=>false,querySelector:()=>({})};const panel=new ProfilerPanel(element,profiler);
try{assert.ok(element.innerHTML.includes('사용자 C++ 함수 실행'));assert.ok(element.innerHTML.includes('엔진 명령 · Spawn/풀/UI'));assert.ok(element.innerHTML.includes('구간이 서로 포함될 수 있어요'));assert.ok(element.innerHTML.includes('8.000'));assert.ok(!element.innerHTML.includes('negativeMs'));for(let i=0;i<3;i++){const next=profiler.begin();now++;profiler.finish(next);}assert.equal(profiler.frames.length,2);}finally{panel.dispose();globalThis.document=previous;}
console.log('C++ 프로파일러: 직렬화/명령 적용/사용자 함수/왕복 분리·중첩 시간 표시·비정상 값 제외·기록 상한 통과');
