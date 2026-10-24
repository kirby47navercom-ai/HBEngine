import {sampleCurveSegment,sampleCurveOutside} from './curve-sampling.js';
import {freezeCurveTangents} from './curve-periodic-bake.js';
import {prepareCurveBakeDomain} from './curve-bake-domain.js';
import {subdivideCurve} from './curve-subdivision.js';

export function clipRange(duration,start=0,end=duration){if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end>duration||end-start<.000001)throw Error('클립 시작·끝 범위를 확인하세요.');return {start,end,duration:end-start,sliced:start!==0||end!==duration};}
export function sampleClipCurve(curve,time){const outside=sampleCurveOutside(curve.keys,time,curve);if(outside!==undefined)return outside;let lo=0,hi=curve.keys.length;while(lo<hi){const mid=(lo+hi)>>>1;if(curve.keys[mid].time<=time)lo=mid+1;else hi=mid;}return sampleCurveSegment(curve.keys,Math.max(0,lo-1),time,curve.interpolation||'linear');}
export function* clipMetadataRange(metadata,range,{custom='reject',fps=30}={}){
 const {start,end,sliced}=range,result={},sampledCurves=[];
 for(const key of ['notifies','notifyStates','curves'])if(metadata?.[key]!==undefined)result[key]=structuredClone(metadata[key]);
 if(!sliced)return {metadata:result,sampledCurves};
 if(result.notifies)result.notifies=result.notifies.filter(n=>n.time>=start&&n.time<end).map(n=>({...n,time:n.time-start}));
 if(result.notifyStates)result.notifyStates=result.notifyStates.filter(n=>n.time<end&&n.time+n.duration>start).map(n=>({...n,time:Math.max(start,n.time)-start,duration:Math.min(end,n.time+n.duration)-Math.max(start,n.time)}));
 if(result.curves)for(let i=0;i<result.curves.length;i++){
  const curve=result.curves[i];if(!curve.keys.length)continue;const periodic=!!curve.infinityDomain||[['preInfinity',start<curve.keys[0].time],['postInfinity',end>curve.keys.at(-1).time]].some(([field,outside])=>outside&&['cycle','cycleOffset','oscillate'].includes(curve[field]));
  let keys;
  if(periodic){
   if(custom!=='bake')throw Error('반복 범위를 자르는 메타데이터 곡선은 명시적으로 베이크하세요: '+curve.name);
   const count=Math.ceil(range.duration*fps-1e-9)+1;if(count>65536)throw Error('메타데이터 곡선의 베이크 키 예산을 넘었어요.');keys=[];for(let k=0;k<count;k++){const time=k===count-1?end:Math.min(end,start+k/fps);keys.push({time,value:sampleClipCurve(curve,time),interpolation:'linear'});if(k%4096===4095)yield;}sampledCurves.push(curve.name);
  }else{const expanded=prepareCurveBakeDomain(curve,start,end),split=subdivideCurve(freezeCurveTangents(expanded),[start,end]);keys=split.keys.filter(k=>k.time>=start&&k.time<=end);}
  const next={...curve,keys:keys.map(k=>({...k,time:k.time-start})),preInfinity:'constant',postInfinity:'constant'};delete next.infinityDomain;result.curves[i]=next;
 }
 return {metadata:result,sampledCurves};
}
