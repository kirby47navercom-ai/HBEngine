import {curveKeyTangent,curveControlValue,sampleCurveOutside} from './curve-sampling.js';
const shape=(v,fn)=>Array.isArray(v)?v.map((_,c)=>fn(c)):fn(0);
// Expanding an authored domain must not change its surviving cubic neighbours
// or the derivative used by linear extrapolation at either outer endpoint.
export function prepareCurveBakeDomain(track,start,end){
 const before=track.keys,first=before[0],last=before.at(-1),pre=start<first.time,post=end>last.time;
 if(!pre&&!post)return track;
 for(const field of ['preInfinity','postInfinity'])if(!['constant','linear'].includes(track[field]??'constant'))throw Error('반복·왕복 곡선의 키 범위 밖 부분 베이크는 주기 보존을 지원하지 않아요. 전체 베이크나 키 안쪽 범위를 사용하세요.');
 const mode=k=>k.interpolation||track.interpolation||'linear',slope=(index,field)=>shape(before[index].value,c=>['constant','step'].includes(mode(before[index]))?0:curveKeyTangent(before,index,c,field,track.interpolation||'linear'));
 const arrive=slope(0,'arriveTangent'),leave=slope(before.length-1,'leaveTangent');
 for(const [field,value]of [['preInfinity',arrive],['postInfinity',leave]])if(track[field]==='linear'&&(Array.isArray(value)?value:[value]).some(v=>!Number.isFinite(v)||Math.abs(v)>100000))throw Error('선형 연장의 경계 기울기가 저장 가능한 범위를 넘었어요.');
 const result=structuredClone(track),keys=result.keys;
 for(let i=0;i<keys.length;i++){const key=keys[i];if(mode(before[i])==='clampedAuto')for(const field of ['arriveWeight','leaveWeight','arriveControl','leaveControl'])delete key[field];for(const field of ['arriveTangent','leaveTangent']){const tangent=shape(key.value,c=>curveKeyTangent(before,i,c,field,track.interpolation||'linear')),large=(Array.isArray(tangent)?tangent:[tangent]).some(v=>!Number.isFinite(v)||Math.abs(v)>100000);key[field]=large?shape(tangent,c=>{const value=Array.isArray(tangent)?tangent[c]:tangent;return Number.isFinite(value)&&Math.abs(value)<=100000?value:0;}):tangent;if(large&&before[i+(field==='arriveTangent'?-1:1)])key[field.replace('Tangent','Control')]=shape(key.value,c=>curveControlValue(before,i,c,field.replace('Tangent',''),track.interpolation||'linear'));}if(!['linear','constant','step'].includes(mode(before[i])))key.interpolation='break';}
 const value=time=>{const sampled=sampleCurveOutside(before,time,track);return sampled===undefined?structuredClone(time<first.time?first.value:last.value):sampled;};
 if(pre)keys.unshift({time:start,value:value(start),interpolation:'linear',arriveTangent:structuredClone(arrive),leaveTangent:structuredClone(arrive)});
 if(post){keys.at(-1).interpolation='linear';delete keys.at(-1).leaveControl;delete keys.at(-1).leaveWeight;keys.push({time:end,value:value(end),interpolation:'linear',arriveTangent:structuredClone(leave),leaveTangent:structuredClone(leave)});}
 // These are used outside the expanded domain; inner cubic controls remain intact.
 if(track.preInfinity==='linear')keys[0].arriveTangent=structuredClone(arrive);
 if(track.postInfinity==='linear')keys.at(-1).leaveTangent=structuredClone(leave);
 return result;
}
export const curveBakeDomainContract=Object.freeze({owner:'prototype/curve-bake-domain.js',partial:'Explicit partial-bake start/end may extend before/after the authored keys for constant/default or linear infinity. Endpoints retain the original exterior values and linear derivatives; surviving cubic/weighted/vertical segments are frozen before neighbours change.',periodic:'Cycle/cycleOffset/oscillate on either side reject domain expansion atomically because adding either endpoint changes their shared period. Full bake can sample those modes; no silent mode reset or hidden original-curve snapshot.',cost:'Detached authoring candidate only. At most2 temporary endpoint keys plus requested samples, checked against the final shared key budget; no runtime state, timer, cache or GPU resource.',limits:['Periodic outside-domain partial bake preserving the original period','Unrepresentable endpoint linear derivatives outside stored tangent bounds']});
