import {sampleCurveSegment,sampleCurveOutside,curveKeyTangent} from './curve-sampling.js';
const handles=['arriveTangent','leaveTangent','arriveWeight','leaveWeight'];
export const curveTools=['transform','flatten','straighten','linearTangents','smooth','bake','reduce'];
// Detached candidate only. Document/Timeline owners validate and commit once.
export function editCurveKeys(track,{operation,indices,channel,timeScale=1,timeOffset=0,timePivot=0,valueScale=1,valueOffset=0,valuePivot=0,fps=30,tolerance=.001,start,end,maxKeys=65536}={}){
 if(!curveTools.includes(operation)||!Array.isArray(track.keys)||track.keys.some(k=>typeof k.value!=='number'&&!Array.isArray(k.value)))throw Error('연속 값 곡선과 도구를 확인하세요.');
 const before=track.keys,chosen=indices===undefined?before.map((_,i)=>i):indices;if(!Array.isArray(chosen)||!chosen.length||new Set(chosen).size!==chosen.length||chosen.some(i=>!Number.isInteger(i)||i<0||i>=before.length))throw Error('편집할 키를 선택하세요.');
 const shape=Array.isArray(before[0].value)?before[0].value.length:1;if(channel!==undefined&&(!Number.isInteger(channel)||channel<0||channel>=shape))throw Error('곡선 채널을 확인하세요.');
 const result=structuredClone(track),keys=result.keys,part=(v,c)=>Array.isArray(v)?v[c]:v,shaped=(v,fn)=>Array.isArray(v)?v.map(fn):fn(v,0),map=(v,fn)=>shaped(v,(x,c)=>channel===undefined||channel===c?fn(x,c):x);
 if(operation==='bake'||operation==='reduce'){
  if(chosen.length!==keys.length||channel!==undefined)throw Error('베이크·축약은 전체 곡선에 적용하세요.');
  if(operation==='bake'){
   start??=keys[0].time;end??=keys.at(-1).time;if(![start,end,fps].every(Number.isFinite)||end<=start||fps<=0||fps>1000)throw Error('베이크 범위·초당 샘플을 확인하세요.');const count=Math.ceil((end-start)*fps);if(count+1>maxKeys)throw Error('베이크 키 예산을 넘었어요.');
   const evaluate=time=>{const outside=sampleCurveOutside(before,time,track);if(outside!==undefined)return outside;let low=0,high=before.length;while(low<high){const mid=(low+high)>>>1;if(before[mid].time<=time)low=mid+1;else high=mid;}return sampleCurveSegment(before,Math.max(0,low-1),time,track.interpolation||'linear');};
   result.keys=Array.from({length:count+1},(_,i)=>{const time=i===count?end:Math.min(end,start+i/fps);return {time,value:evaluate(time),interpolation:'linear'};});return result;
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
