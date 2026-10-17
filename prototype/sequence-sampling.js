// Assets are captured by the sequence player. Prepare once; seek in O(log n).
export class SequenceSampler{
 constructor(tracks){this.keys=new Map(tracks.map(t=>[t,[...t.keys].sort((a,b)=>a.time-b.time)]));}
 sample(track,time,{discrete=false,reference=false}={}){const keys=this.keys.get(track)||[];if(!keys.length)return undefined;let lo=0,hi=keys.length;while(lo<hi){const mid=(lo+hi)>>1;if(keys[mid].time<=time)lo=mid+1;else hi=mid;}const a=keys[Math.max(0,lo-1)],b=keys[Math.min(lo,keys.length-1)];if(reference)return lo?a.value:undefined;const copy=()=>structuredClone(a.value);if(a===b||time<=a.time||discrete||a.interpolation==='step'||typeof a.value!=='number'&&!Array.isArray(a.value))return copy();const alpha=Math.max(0,Math.min(1,(time-a.time)/(b.time-a.time)));return Array.isArray(a.value)?a.value.map((v,i)=>v+(b.value[i]-v)*alpha):a.value+(b.value-a.value)*alpha;}
}
