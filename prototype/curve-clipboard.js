import {curveModes,validCurveWeights} from './curve-sampling.js';
const fields=['time','value','interpolation','arriveTangent','leaveTangent','arriveWeight','leaveWeight'],shapes={float:1,vec2:2,vec3:3,color:4,event:0};
export const curveClipboardMaxText=8*1024*1024;
function checked(clipboard){
 if(!clipboard||clipboard.format!=='hb.curve.keys'||clipboard.version!==1||!Object.hasOwn(shapes,clipboard.type)||!Array.isArray(clipboard.keys)||!clipboard.keys.length||clipboard.keys.length>65536)throw Error('복사한 곡선 키 형식을 확인하세요.');
 const shape=shapes[clipboard.type],value=v=>shape===1?Number.isFinite(v)&&Math.abs(v)<=1000000:Array.isArray(v)&&v.length===shape&&v.every(x=>Number.isFinite(x)&&Math.abs(x)<=1000000);
 for(let i=0;i<clipboard.keys.length;i++){const key=clipboard.keys[i];if(!key||Object.keys(key).some(p=>!fields.includes(p))||!Number.isFinite(key.time)||key.time<0||key.time>86400||(!i?key.time!==0:key.time<=clipboard.keys[i-1].time)||shape===0&&Object.keys(key).some(p=>p!=='time')||shape>0&&(!value(key.value)||key.interpolation!==undefined&&!curveModes.includes(key.interpolation)||!validCurveWeights(key,key.value)||['arriveTangent','leaveTangent'].some(p=>key[p]!==undefined&&!value(key[p]))))throw Error('곡선 키의 시간·자료형·핸들을 확인하세요.');}
 return clipboard;
}
export function parseCurveClipboard(text){if(typeof text!=='string'||text.length>curveClipboardMaxText)throw Error('곡선 클립보드 크기를 확인하세요.');let value;try{value=JSON.parse(text);}catch{throw Error('곡선 클립보드 JSON을 확인하세요.');}return checked(value);}
export function copyCurveKeys(track,indices){
 if(!Object.hasOwn(shapes,track.type)||!Array.isArray(indices)||!indices.length||indices.length>65536||new Set(indices).size!==indices.length||indices.some(i=>!Number.isInteger(i)||i<0||i>=track.keys.length))throw Error('복사할 곡선 키를 선택하세요.');
 const selected=indices.map(i=>track.keys[i]).sort((a,b)=>a.time-b.time),origin=selected[0].time,keys=selected.map(k=>track.type==='event'?{time:k.time-origin}:{...Object.fromEntries(fields.filter(p=>p!=='time'&&k[p]!==undefined).map(p=>[p,structuredClone(k[p])])),time:k.time-origin,interpolation:k.interpolation||track.interpolation||'linear'}),clipboard=checked({format:'hb.curve.keys',version:1,type:track.type,keys});if(JSON.stringify(clipboard).length>curveClipboardMaxText)throw Error('복사할 곡선 키가 클립보드 예산을 넘었어요.');return clipboard;
}
export function pasteCurveKeys(track,clipboard,time,{length,maxKeys=128}={}){
 checked(clipboard);if(track.type!==clipboard.type||!Number.isFinite(time)||time<0||!Number.isFinite(length)||length<=0||!Number.isSafeInteger(maxKeys)||maxKeys<1||maxKeys>65536||track.keys.some((k,i)=>!Number.isFinite(k.time)||k.time<0||k.time>length||i&&k.time<=track.keys[i-1].time))throw Error('붙여넣을 곡선의 자료형·시간·예산을 확인하세요.');
 const atTimes=clipboard.keys.map(key=>{let at=time+key.time;if(!Number.isFinite(at)||at>length)throw Error('붙여넣을 키가 재생 범위를 넘었어요.');let lo=0,hi=track.keys.length;while(lo<hi){const mid=(lo+hi)>>>1;if(track.keys[mid].time<at)lo=mid+1;else hi=mid;}for(const i of [lo-1,lo]){const t=track.keys[i]?.time;if(t!==undefined&&Math.abs(t-at)<=Number.EPSILON*Math.max(1,Math.abs(t),Math.abs(at))*8){at=t;break;}}return at;});if(atTimes.some((t,i)=>i&&t<=atTimes[i-1]))throw Error('붙여넣은 키의 시간 간격을 구분할 수 없어요.');
 const times=new Set(atTimes);let replaced=0;for(const k of track.keys)if(times.has(k.time))replaced++;if(track.keys.length+atTimes.length-replaced>maxKeys)throw Error('붙여넣을 곡선 키 예산을 넘었어요.');const merged=track.keys.filter(k=>!times.has(k.time));for(let i=0;i<clipboard.keys.length;i++)merged.push({...structuredClone(clipboard.keys[i]),time:atTimes[i]});merged.sort((a,b)=>a.time-b.time);const indices=[];for(let i=0;i<merged.length;i++)if(times.has(merged[i].time))indices.push(i);return {keys:merged,indices};
}
export function curveKeySelection(track,params,{length,maxKeys}={}){
 if(params.operation==='copy'||params.operation==='cut'){const clipboard=copyCurveKeys(track,params.indices);if(params.operation==='cut'){const selected=new Set(params.indices);track.keys=track.keys.filter((_,i)=>!selected.has(i));}return {clipboard};}
 if(params.operation==='paste'){const pasted=pasteCurveKeys(track,params.clipboard,params.time,{length,maxKeys});track.keys=pasted.keys;return {indices:pasted.indices};}throw Error('copy/cut/paste 작업을 선택하세요.');
}
