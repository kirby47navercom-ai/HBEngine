// Radix-2 complex FFT. Work arrays live only during an explicit authoring edit.
function fft(real,imag,inverse=false){
  const n=real.length;
  for(let i=1,j=0;i<n;i++){let bit=n>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j){const r=real[i],im=imag[i];real[i]=real[j];real[j]=r;imag[i]=imag[j];imag[j]=im;}}
  for(let size=2;size<=n;size*=2){const angle=(inverse?2:-2)*Math.PI/size,wr=Math.cos(angle),wi=Math.sin(angle);for(let start=0;start<n;start+=size){let r=1,im=0;for(let j=0;j<size/2;j++){const a=start+j,b=a+size/2,tr=r*real[b]-im*imag[b],ti=r*imag[b]+im*real[b];real[b]=real[a]-tr;imag[b]=imag[a]-ti;real[a]+=tr;imag[a]+=ti;const next=r*wr-im*wi;im=r*wi+im*wr;r=next;}}}
  if(inverse)for(let i=0;i<n;i++){real[i]/=n;imag[i]/=n;}
}
export function filterCurveFrequency(track,indices,{channel,cutoff=5,filterType='lowpass',order=4,strength=1}={}){
  const chosen=[...indices].sort((a,b)=>a-b),count=chosen.length;
  if(count<4||chosen.some((i,j)=>j&&i!==chosen[j-1]+1))throw Error('주파수 필터에는 연속한 키를 4개 이상 선택하세요.');
  const keys=track.keys,first=chosen[0],duration=keys[chosen.at(-1)].time-keys[first].time,dt=duration/(count-1);
  if(!Number.isFinite(dt)||dt<=0||chosen.some((i,j)=>Math.abs(keys[i].time-(keys[first].time+j*dt))>Math.max(dt*1e-7,Number.EPSILON*Math.max(1,Math.abs(keys[first].time),Math.abs(keys[chosen.at(-1)].time))*8)))throw Error('주파수 필터 전에 일정한 시간 간격으로 베이크하세요.');
  if(!['lowpass','highpass'].includes(filterType)||!Number.isFinite(cutoff)||cutoff<=0||cutoff>.5/dt||!Number.isInteger(order)||order<1||order>16||!Number.isFinite(strength)||strength<0||strength>1)throw Error('필터 종류·차단 주파수(0~Nyquist Hz)·차수(1~16)·강도(0~1)를 확인하세요.');
  const result=structuredClone(track);if(strength===0)return result;
  let n=1;while(n<2*(count-1))n*=2;
  const real=new Float64Array(n),imag=new Float64Array(n),parts=Array.isArray(keys[first].value)?keys[first].value.length:1;
  const part=(v,c)=>Array.isArray(v)?v[c]:v;
  for(let c=0;c<parts;c++){
    if(channel!==undefined&&channel!==c)continue;
    for(let i=0;i<n;i++){const phase=i*2*(count-1)/n,p=phase<=count-1?phase:2*(count-1)-phase,lo=Math.min(count-2,Math.floor(p)),a=part(keys[first+lo].value,c),b=part(keys[first+lo+1].value,c);real[i]=a+(b-a)*(p-lo);}imag.fill(0);fft(real,imag);
    for(let i=0;i<n;i++){const hz=Math.min(i,n-i)/(2*duration),gain=filterType==='lowpass'?1/Math.sqrt(1+(hz/cutoff)**(2*order)):hz===0?0:1/Math.sqrt(1+(cutoff/hz)**(2*order));real[i]*=gain;imag[i]*=gain;}fft(real,imag,true);
    for(let j=0;j<count;j++){const p=j*n/(2*(count-1)),lo=Math.floor(p),filtered=real[lo]+(real[(lo+1)%n]-real[lo])*(p-lo),old=part(keys[first+j].value,c),value=old+(filtered-old)*strength;if(!Number.isFinite(value))throw Error('주파수 필터 결과가 유한한 범위를 벗어났어요.');if(parts===1&&!Array.isArray(keys[first+j].value))result.keys[first+j].value=value;else result.keys[first+j].value[c]=value;}
  }
  return result;
}
