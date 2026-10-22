import {subdivideCurve} from './curve-subdivision.js';
import {filterCurveFrequency} from './curve-frequency-filter.js';
import {sampleCurveSegment,sampleCurveOutside,curveKeyTangent} from './curve-sampling.js';
const handles=['arriveTangent','leaveTangent','arriveWeight','leaveWeight'];
export const curveTools=['transform','flatten','straighten','linearTangents','smooth','bake','reduce','eulerFilter','fft'];
// Detached candidate only. Document/Timeline owners validate and commit once.
export function editCurveKeys(track,{operation,indices,channel,timeScale=1,timeOffset=0,timePivot=0,valueScale=1,valueOffset=0,valuePivot=0,fps=30,tolerance=.001,start,end,maxKeys=65536,rangeOnly=false,cutoff=5,upperCutoff=10,sampleRate,filterType='lowpass',order=4,strength=1,response='butterworth',rippleDB=1}={}){
 if(!curveTools.includes(operation)||!Array.isArray(track.keys)||track.keys.some(k=>typeof k.value!=='number'&&!Array.isArray(k.value)))throw Error('연속 값 곡선과 도구를 확인하세요.');
 if(!Number.isSafeInteger(maxKeys)||maxKeys<1||maxKeys>65536||typeof rangeOnly!=='boolean'||track.keys.some((k,i)=>!Number.isFinite(k.time)||i>0&&k.time<=track.keys[i-1].time))throw Error('곡선 키 예산·오름차순 시간·범위 옵션을 확인하세요.');
 const before=track.keys,chosen=indices===undefined?before.map((_,i)=>i):indices;if(!Array.isArray(chosen)||!chosen.length||new Set(chosen).size!==chosen.length||chosen.some(i=>!Number.isInteger(i)||i<0||i>=before.length))throw Error('편집할 키를 선택하세요.');
 const shape=Array.isArray(before[0].value)?before[0].value.length:1;if(channel!==undefined&&(!Number.isInteger(channel)||channel<0||channel>=shape))throw Error('곡선 채널을 확인하세요.');
 if(operation==='fft')return filterCurveFrequency(track,chosen,{channel,cutoff,upperCutoff,sampleRate,filterType,order,strength,response,rippleDB});
 const result=structuredClone(track),keys=result.keys,part=(v,c)=>Array.isArray(v)?v[c]:v,shaped=(v,fn)=>Array.isArray(v)?v.map(fn):fn(v,0),map=(v,fn)=>shaped(v,(x,c)=>channel===undefined||channel===c?fn(x,c):x);
 if(operation==='eulerFilter'){
  if(shape!==3||chosen.length!==keys.length||channel!==undefined)throw Error('Euler 필터는 XYZ 회전 곡선 전체에 적용하세요.');
  let previous;for(const key of keys){const value=key.value;if(previous){const nearest=candidate=>candidate.map((v,c)=>v+360*Math.round((previous[c]-v)/360)),a=nearest(value),b=nearest([value[0]+180,180-value[1],value[2]+180]),cost=v=>v.reduce((sum,x,c)=>sum+(x-previous[c])**2,0);key.value=cost(b)<cost(a)?b:a;}previous=key.value;key.interpolation='linear';for(const field of handles)delete key[field];}return result;
 }
 if(operation==='bake'||operation==='reduce'){
  if((!rangeOnly||operation==='reduce')&&chosen.length!==keys.length||channel!==undefined)throw Error('베이크·축약은 전체 채널에 적용하세요.');
  if(operation==='bake'){
   start??=rangeOnly?chosen.reduce((n,i)=>Math.min(n,before[i].time),Infinity):keys[0].time;end??=rangeOnly?chosen.reduce((n,i)=>Math.max(n,before[i].time),-Infinity):keys.at(-1).time;if(![start,end,fps].every(Number.isFinite)||end<=start||fps<=0||fps>1000)throw Error('베이크 범위·초당 샘플을 확인하세요.');const count=Math.ceil((end-start)*fps);if(count+1>maxKeys)throw Error('베이크 키 예산을 넘었어요.');
   const first=before.findIndex(k=>k.time===start),last=before.findIndex(k=>k.time===end);if(rangeOnly&&(first<0||last<0))return editCurveKeys(subdivideCurve(track,[start,end]),{operation:'bake',rangeOnly:true,start,end,fps,maxKeys});
   const evaluate=time=>{const outside=sampleCurveOutside(before,time,track);if(outside!==undefined)return outside;let low=0,high=before.length;while(low<high){const mid=(low+high)>>>1;if(before[mid].time<=time)low=mid+1;else high=mid;}return sampleCurveSegment(before,Math.max(0,low-1),time,track.interpolation||'linear');};
   const baked=[];for(let i=0;i<count;i++){const time=start+i/fps;if(i&&end-time<=Number.EPSILON*Math.max(1,Math.abs(start),Math.abs(end))*8)break;baked.push({time,value:evaluate(time),interpolation:'linear'});}baked.push({time:end,value:evaluate(end),interpolation:'linear'});
   if(!rangeOnly){result.keys=baked;return result;}
   if(first+keys.length-last-1+baked.length>maxKeys)throw Error('부분 베이크와 외부 키의 합이 예산을 넘었어요.');
   const mode=i=>before[i].interpolation||track.interpolation||'linear',freeze=(i,key)=>{for(const f of ['arriveTangent','leaveTangent'])key[f]=shaped(key.value,(_,c)=>curveKeyTangent(before,i,c,f,track.interpolation||'linear'));if(mode(i)==='clampedAuto')for(const f of ['arriveWeight','leaveWeight'])delete key[f];key.interpolation='break';};
   const left={...keys[first]},right={...keys[last]};freeze(first,left);left.interpolation='linear';delete left.leaveTangent;delete left.leaveWeight;if(!['linear','constant','step'].includes(mode(last)))freeze(last,right);
   // Clamped endpoint slopes depend on two neighbours. Preserve the only
   // outside endpoints whose second neighbour changed across this bake edge.
   if(first===1&&mode(0)==='clampedAuto')freeze(0,keys[0]);if(last===keys.length-2&&mode(keys.length-1)==='clampedAuto')freeze(keys.length-1,keys.at(-1));
   baked[0]=left;baked[baked.length-1]=right;result.keys=[...keys.slice(0,first),...baked,...keys.slice(last+1)];return result;
  }
  if(!Number.isFinite(tolerance)||tolerance<0||keys.some(k=>!['linear'].includes(k.interpolation||track.interpolation||'linear')))throw Error('선형 베이크 곡선과 0 이상의 허용 오차를 사용하세요.');
  // Iterative RDP: error bound at every source sample, across every channel.
  const keep=new Set([0,keys.length-1]),stack=[[0,keys.length-1]];while(stack.length){const[a,b]=stack.pop();let worst=tolerance,index=-1;for(let i=a+1;i<b;i++){const t=(keys[i].time-keys[a].time)/(keys[b].time-keys[a].time);let error=0;for(let c=0;c<shape;c++)error=Math.max(error,Math.abs(part(keys[i].value,c)-(part(keys[a].value,c)+(part(keys[b].value,c)-part(keys[a].value,c))*t)));if(error>worst){worst=error;index=i;}}if(index>=0){keep.add(index);stack.push([a,index],[index,b]);}}result.keys=keys.filter((_,i)=>keep.has(i));return result;
 }
 if(operation==='transform'&&(![timeScale,timeOffset,timePivot,valueScale,valueOffset,valuePivot].every(Number.isFinite)||timeScale<=0))throw Error('시간 배율은 양수, 변환 값은 유한한 수여야 해요.');
 for(const i of chosen){const key=keys[i];if(operation==='transform'){
   key.time=timePivot+(key.time-timePivot)*timeScale+timeOffset;key.value=map(key.value,v=>valuePivot+(v-valuePivot)*valueScale+valueOffset);
   // Materialize automatic slopes only when their key geometry is transformed.
   if(!['linear','constant','step'].includes(key.interpolation||track.interpolation||'linear')){for(const f of ['arriveTangent','leaveTangent'])key[f]=shaped(before[i].value,(_,c)=>curveKeyTangent(before,i,c,f,track.interpolation||'linear')*(channel===undefined||channel===c?valueScale:1)/timeScale);if((before[i].interpolation||track.interpolation)==='clampedAuto')for(const f of ['arriveWeight','leaveWeight'])delete key[f];key.interpolation='break';}
  }else{
   if(operation==='smooth'){key.value=map(key.value,(_,c)=>(part(before[Math.max(0,i-1)].value,c)+2*part(before[i].value,c)+part(before[Math.min(before.length-1,i+1)].value,c))/4);}
   else{for(const f of ['arriveTangent','leaveTangent']){key[f]??=shaped(key.value,(_,c)=>curveKeyTangent(before,i,c,f,track.interpolation||'linear'));key[f]=map(key[f],(_,c)=>{if(operation==='flatten')return 0;if(operation==='straighten')return Math.tan((Math.atan(curveKeyTangent(before,i,c,'arriveTangent',track.interpolation||'linear'))+Math.atan(curveKeyTangent(before,i,c,'leaveTangent',track.interpolation||'linear')))/2);const j=i+(f==='arriveTangent'?-1:1),other=before[j];return other?(part(other.value,c)-part(before[i].value,c))/(other.time-before[i].time):0;});}key.interpolation=operation==='flatten'?'user':'break';}
  }}
 if(operation==='smooth'){const automatic=keys.map(k=>({...k,interpolation:'clampedAuto'}));for(const i of chosen){const key=keys[i];if(channel===undefined){for(const f of handles)delete key[f];key.interpolation='clampedAuto';}else{for(const f of ['arriveTangent','leaveTangent'])key[f]=shaped(key.value,(_,c)=>curveKeyTangent(c===channel?automatic:before,i,c,f,track.interpolation||'linear'));for(const f of ['arriveWeight','leaveWeight'])if(key[f]!==undefined)key[f]=map(key[f],()=>1/3);key.interpolation='break';}}}
 keys.sort((a,b)=>a.time-b.time);return result;
}
