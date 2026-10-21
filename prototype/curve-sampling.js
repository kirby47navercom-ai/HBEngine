// A segment already selected by the caller's binary search. Slopes are units/s,
// independent of key spacing; undefined handles use the neighbouring secant.
export const curveModes=['auto','user','break','linear','constant','step'];
export function curveKeyTangent(keys,index,channel,field){const part=v=>Array.isArray(v)?v[channel]:v,explicit=part(keys[index][field]);if(explicit!==undefined)return explicit;const lo=keys[Math.max(0,index-1)],hi=keys[Math.min(keys.length-1,index+1)];return hi.time===lo.time?0:(part(hi.value)-part(lo.value))/(hi.time-lo.time);}
export function sampleCurveSegment(keys,index,time,defaultMode='linear'){
 const a=keys[index],b=keys[index+1],mode=a.interpolation||defaultMode;
 if(!b||time<=a.time||mode==='step'||mode==='constant')return structuredClone(a.value);
 const duration=b.time-a.time,u=Math.max(0,Math.min(1,(time-a.time)/duration)),part=(v,c)=>Array.isArray(v)?v[c]:v;
 const interpolate=(v,c)=>{const end=part(b.value,c);if(mode==='linear')return v+(end-v)*u;const m0=curveKeyTangent(keys,index,c,'leaveTangent'),m1=curveKeyTangent(keys,index+1,c,'arriveTangent');return (2*u**3-3*u*u+1)*v+(u**3-2*u*u+u)*duration*m0+(-2*u**3+3*u*u)*end+(u**3-u*u)*duration*m1;};
 return Array.isArray(a.value)?a.value.map(interpolate):interpolate(a.value,0);
}
