import assert from 'node:assert/strict';
import {compileNativeUnits,nativeBuildTimeoutMs} from './native-compile-units.mjs';

let active=0,peak=0;const done=[];
await compileNativeUnits([0,1,2,3,4],async(value,index)=>{active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,2));done[index]=value;active--;},{concurrency:2});assert.deepEqual(done,[0,1,2,3,4]);assert.equal(peak,2);
let canceled=false;await assert.rejects(()=>compileNativeUnits([0,1,2],async(value,index,signal)=>{if(!value){await new Promise(r=>setTimeout(r,2));throw Error('first compiler error');}await new Promise(resolve=>signal.addEventListener('abort',()=>{canceled=true;resolve();},{once:true}));},{concurrency:2}),/first compiler error/);assert(canceled);
assert.equal(nativeBuildTimeoutMs(1),60000);assert.equal(nativeBuildTimeoutMs(8),165000);assert.equal(nativeBuildTimeoutMs(512),900000);console.log(JSON.stringify({passed:true,peak,translationUnits:5,cancellationDrained:true,eightSourcesDeadlineMs:nativeBuildTimeoutMs(8)}));
