// Serialized into the actual desktop, Android and iOS game WebViews.
export async function audioMeterReuseProof(){
  const {AudioRouting}=await import('/prototype/audio-mixer.js'),{BufferedAudioPlayer}=await import('/prototype/buffered-audio.js');
  const route=new AudioRouting(),context=await route.ensure();await context.resume();
  let created=0;const create=context.createAnalyser.bind(context);context.createAnalyser=()=>{created++;return create();};const peaks=[];
  const waitClock=async(clock,sample=()=>{})=>{const deadline=performance.now()+5000;while(context.currentTime<clock){sample();if(context.state!=='running'||performance.now()>deadline)throw Error('오디오 시계가 진행되지 않았어요: '+context.state+' '+context.currentTime);await new Promise(r=>setTimeout(r,8));}sample();};
  try{
    for(let i=0;i<12;i++){
      const amplitude=i%2?.02:.8,buffer=context.createBuffer(1,Math.round(context.sampleRate*.04),context.sampleRate),data=buffer.getChannelData(0);
      for(let k=0;k<data.length;k++)data[k]=Math.sin(k*2*Math.PI*440/context.sampleRate)*amplitude;
      const player=new BufferedAudioPlayer(context,buffer);await route.connect(player);
      // A new mobile audio device can start after resume() resolves. Measure its clock.
      if(i===0)await waitClock(context.currentTime+.12);
      const started=context.currentTime;await player.play();await waitClock(started+.06,()=>route.peak(player));
      const peak=route.peak(player);peaks.push({amplitude,peak,audioSeconds:context.currentTime-started});
      if(Math.abs(peak-amplitude)>.005)throw Error('이전 효과음의 측정값이 새 효과음에 섞였어요: '+JSON.stringify(peaks));
      route.disconnect(player);await waitClock(context.currentTime+.11);
    }
    if(created!==1)throw Error('반복 효과음에서 측정 노드를 매번 생성했어요: '+created);
    return {created,peaks,reuse:true};
  }finally{route.dispose();}
}
