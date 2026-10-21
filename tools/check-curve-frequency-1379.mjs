import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {editCurveKeys} from '../prototype/curve-tools.js';
const wave=t=>10+3*Math.cos(4*Math.PI*t)+.7*Math.cos(40*Math.PI*t),track={keys:Array.from({length:129},(_,i)=>({time:i/128,value:[wave(i/128),42],interpolation:'linear'}))},before=JSON.stringify(track);
let observations=0,maxError=0;
for(const filterType of ['lowpass','highpass'])for(const strength of [1,.4,0]){
  const result=editCurveKeys(track,{operation:'fft',filterType,cutoff:5,order:4,strength,channel:0});
  const gain=f=>filterType==='lowpass'?1/Math.sqrt(1+(f/5)**8):f===0?0:1/Math.sqrt(1+(5/f)**8);
  for(let i=0;i<129;i++){const t=i/128,filtered=10*gain(0)+3*gain(2)*Math.cos(4*Math.PI*t)+.7*gain(20)*Math.cos(40*Math.PI*t),expected=wave(t)+(filtered-wave(t))*strength,error=Math.abs(result.keys[i].value[0]-expected);maxError=Math.max(maxError,error);assert(error<1e-10);assert.equal(result.keys[i].value[1],42);assert.equal(result.keys[i].time,track.keys[i].time);observations++;}
}
assert.equal(JSON.stringify(track),before);
const zero=editCurveKeys(track,{operation:'fft',strength:0,cutoff:5});assert.deepEqual(zero,track);
const irregular=structuredClone(track);irregular.keys[4].time+=.001;assert.throws(()=>editCurveKeys(irregular,{operation:'fft'}),/베이크/);
const tiny={keys:[0,1,3,4].map(t=>({time:t*1e-10,value:1}))};assert.throws(()=>editCurveKeys(tiny,{operation:'fft',cutoff:1}),/베이크/);
for(const options of [{indices:[0,1,3,4]},{indices:[0,1,2]},{cutoff:0},{cutoff:100},{order:0},{order:1.5},{order:17},{filterType:'fake'},{strength:1.1}])assert.throws(()=>editCurveKeys(track,{operation:'fft',...options}));
const dense={keys:Array.from({length:65536},(_,i)=>({time:i/240,value:1+Math.sin(i*.13),interpolation:'linear'}))},start=performance.now(),filtered=editCurveKeys(dense,{operation:'fft',cutoff:10});assert.equal(filtered.keys.length,dense.keys.length);assert(filtered.keys.every(k=>Number.isFinite(k.value)));const denseMS=performance.now()-start;
const subset=editCurveKeys(track,{operation:'fft',indices:Array.from({length:65},(_,i)=>i+32),cutoff:5,channel:0});assert.deepEqual(subset.keys.slice(0,32),track.keys.slice(0,32));assert.deepEqual(subset.keys.slice(97),track.keys.slice(97));
const result={passed:true,observations,maxError,keyCountAndTimePreserved:true,channelAndOutsideKeysPreserved:true,sourceUnchanged:true,invalidAtomic:true,dense:{keys:65536,elapsedMS:denseMS},scope:'Zero-phase spectral Butterworth low/high pass and strength on explicit authoring only. Reflected2*duration period, linear resampling to radix2 grid then back; analytic129-key cosine/DC gain checks, uniform-time validation, fixed key times/count. Existing interpolation/tangents retained; no Chebyshev/nonuniform direct filtering or per-frame/FPS claim.'};
await fs.writeFile('native/build/curve-frequency-1379.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
