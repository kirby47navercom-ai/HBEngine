// A segment already selected by the caller's binary search. Slopes are units/s,
// independent of key spacing; undefined handles use the neighbouring secant.
export const curveModes=['auto','user','break','linear','constant','step'];
export const curveInfinityModes=['constant','linear','cycle','cycleOffset','oscillate'];
export function validCurveInfinity(track,numeric=true){return ['preInfinity','postInfinity'].every(p=>track[p]===undefined||curveInfinityModes.includes(track[p])&&(numeric||track[p]==='constant'));}
// Default/inside samples keep the old path. Only explicit outside modes do work.
export function sampleCurveOutside(keys,time,track={},defaultMode='linear'){
 if(keys.length<2)return undefined;const first=keys[0],last=keys.at(-1);if(time>=first.time&&time<=last.time)return undefined;const before=time<first.time,mode=track[before?'preInfinity':'postInfinity'];if(!mode||mode==='constant')return undefined;
 const duration=last.time-first.time;if(!(duration>0))return undefined;
 const component=(v,c)=>Array.isArray(v)?v[c]:v;
 if(mode==='linear'){const index=before?0:keys.length-1,key=keys[index],interpolation=key.interpolation||track.interpolation||defaultMode;return Array.isArray(key.value)?key.value.map((v,c)=>v+(time-key.time)*(['constant','step'].includes(interpolation)?0:curveKeyTangent(keys,index,c,before?'arriveTangent':'leaveTangent'))):key.value+(time-key.time)*(['constant','step'].includes(interpolation)?0:curveKeyTangent(keys,index,0,before?'arriveTangent':'leaveTangent'));}
 const cycles=Math.floor((time-first.time)/duration),phase=time-first.time-cycles*duration,mapped=mode==='oscillate'&&Math.abs(cycles%2)===1?last.time-phase:first.time+phase;
 let low=0,high=keys.length;while(low<high){const middle=(low+high)>>>1;if(keys[middle].time<=mapped)low=middle+1;else high=middle;}const value=sampleCurveSegment(keys,Math.max(0,low-1),mapped,track.interpolation||defaultMode);if(mode!=='cycleOffset')return value;
 return Array.isArray(value)?value.map((v,c)=>v+cycles*(component(last.value,c)-component(first.value,c))):value+cycles*(last.value-first.value);
}
export function validCurveWeights(key,value){const valid=w=>Number.isFinite(w)&&w>=0&&w<=1;return ['arriveWeight','leaveWeight'].every(p=>key[p]===undefined||(Array.isArray(value)?Array.isArray(key[p])&&key[p].length===value.length&&key[p].every(valid):typeof value==='number'&&valid(key[p])));}
export function curveKeyWeight(key,channel,field){const value=key[field];return (Array.isArray(value)?value[channel]:value)??1/3;}
// Weighted handles store horizontal fractions of the adjacent time interval.
// Invert monotone Bezier time; no tables, allocations or per-frame preparation.
function bezier(a,b,c,d,t){const s=1-t;return s*s*s*a+3*s*s*t*b+3*s*t*t*c+t*t*t*d;}
function weightedValue(u,start,end,m0,m1,duration,w0,w1){
 let low=0,high=1,t=u;
 for(let i=0;i<48;i++){const x=bezier(0,w0,1-w1,1,t);if(x===u)break;if(x<u)low=t;else high=t;const d=3*((1-t)**2*w0+2*(1-t)*t*(1-w1-w0)+t*t*w1),next=t-(x-u)/d;t=i<8&&Number.isFinite(next)&&next>low&&next<high?next:(low+high)/2;}
 return bezier(start,start+duration*m0*w0,end-duration*m1*w1,end,t);
}
export function curveKeyTangent(keys,index,channel,field){const part=v=>Array.isArray(v)?v[channel]:v,explicit=part(keys[index][field]);if(explicit!==undefined)return explicit;const lo=keys[Math.max(0,index-1)],hi=keys[Math.min(keys.length-1,index+1)];return hi.time===lo.time?0:(part(hi.value)-part(lo.value))/(hi.time-lo.time);}
export function sampleCurveSegment(keys,index,time,defaultMode='linear'){
 const a=keys[index],b=keys[index+1],mode=a.interpolation||defaultMode;
 if(!b||time<=a.time||mode==='step'||mode==='constant')return structuredClone(a.value);
 const duration=b.time-a.time,u=Math.max(0,Math.min(1,(time-a.time)/duration)),part=(v,c)=>Array.isArray(v)?v[c]:v;
 const interpolate=(v,c)=>{const end=part(b.value,c);if(mode==='linear')return v+(end-v)*u;const m0=curveKeyTangent(keys,index,c,'leaveTangent'),m1=curveKeyTangent(keys,index+1,c,'arriveTangent'),w0=curveKeyWeight(a,c,'leaveWeight'),w1=curveKeyWeight(b,c,'arriveWeight');if(w0!==1/3||w1!==1/3)return weightedValue(u,v,end,m0,m1,duration,w0,w1);return (2*u**3-3*u*u+1)*v+(u**3-2*u*u+u)*duration*m0+(-2*u**3+3*u*u)*end+(u**3-u*u)*duration*m1;};
 return Array.isArray(a.value)?a.value.map(interpolate):interpolate(a.value,0);
}
