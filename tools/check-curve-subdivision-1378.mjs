import fs from 'node:fs/promises';import assert from 'node:assert/strict';
import {editCurveKeys} from '../prototype/curve-tools.js';import {subdivideCurve} from '../prototype/curve-subdivision.js';import {sampleTimeline} from '../prototype/blueprint-model.js';
let observations=0,maxError=0,cases=0;
const near=(a,b)=>{if(Array.isArray(a))a.forEach((v,i)=>near(v,b[i]));else{const error=Math.abs(a-b);observations++;maxError=Math.max(maxError,error);assert(error<2e-8,`${a} / ${b} / ${error}`);}};
for(const mode of ['linear','constant','auto','clampedAuto','break'])for(const parts of [1,2,3,4])for(const [start,end]of [[.2,2.6],[.15,.35],[.6,2.6],[.2,3.3]]){
  const track={type:parts===1?'float':parts===2?'vec2':parts===3?'vec3':'color',interpolation:mode,preInfinity:'linear',postInfinity:'linear',keys:[0,.6,1.9,3.3,4].map((time,i)=>({time,value:parts===1?[0,2,-1,3,4][i]:Array.from({length:parts},(_,c)=>[0,2,-1,3,4][i]*(c+1)+c)}))};
  if(mode==='break')for(const[k,i]of track.keys.map((k,i)=>[k,i])){const shape=x=>parts===1?x:Array.from({length:parts},(_,c)=>x*(c+1));Object.assign(k,{arriveTangent:shape(i-2),leaveTangent:shape(2-i),arriveWeight:shape(0).map?.(()=>.2)??.2,leaveWeight:shape(0).map?.(()=>.3)??.3});}
  const before=JSON.stringify(track),split=subdivideCurve(track,[start,end]);
  for(let i=0;i<=800;i++)near(sampleTimeline(split,-1+6*i/800),sampleTimeline(track,-1+6*i/800));
  const baked=editCurveKeys(track,{operation:'bake',rangeOnly:true,start,end,fps:60,maxKeys:65536});
  for(let i=0;i<=800;i++){const time=-1+6*i/800;if(time<start||time>end)near(sampleTimeline(baked,time),sampleTimeline(track,time));}
  for(const k of baked.keys.filter(k=>k.time>=start&&k.time<=end))near(k.value,sampleTimeline(track,k.time));
  assert.equal(JSON.stringify(track),before);assert(baked.keys.every((k,i)=>!i||k.time>baked.keys[i-1].time));cases++;
}
const extreme={type:'float',keys:[{time:0,value:0,interpolation:'break',leaveWeight:1,leaveTangent:2},{time:1,value:1,arriveWeight:1,arriveTangent:2}]},unchanged=JSON.stringify(extreme);
assert.throws(()=>editCurveKeys(extreme,{operation:'bake',rangeOnly:true,start:.53,end:.9,fps:20}),/핸들/);assert.equal(JSON.stringify(extreme),unchanged);
for(const args of [{start:-.1,end:.8},{start:.1,end:1.1},{start:.1,end:.8,maxKeys:3}])assert.throws(()=>editCurveKeys(extreme,{operation:'bake',rangeOnly:true,fps:60,...args}));
const result={passed:true,cases,observations,maxError,sourceUnchanged:true,unrepresentableAndBudgetAtomic:true,scope:'Exact time/value subdivision and partial bake across scalar/vec2/vec3/color, linear/step/auto/PCHIP/weighted handles, both boundaries inside same or different segments, inherited modes, dense outside and linear infinity observations. Existing0..1 horizontal weight format retained; vertical/out-of-interval handles reject atomically rather than approximate outside curves.'};
await fs.writeFile('native/build/curve-subdivision-1378.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
