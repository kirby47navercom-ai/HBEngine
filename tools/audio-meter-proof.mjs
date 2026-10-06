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
    const deadline=performance.now()+1000;while(route.idleMeters.some(entry=>entry.draining)){if(performance.now()>deadline)throw Error('유휴 측정 노드가 오디오 처리를 계속했어요.');await new Promise(r=>setTimeout(r,16));}
    if(route.peakTimer!==null)throw Error('재생 종료 후 측정 타이머가 남았어요.');
    let streaming=null;
    if(!['ios','android'].includes(globalThis.hbMobileTarget)){
      const urls=[],streamPeaks=[];let streamCreated=0,oldEnded=0;const createSource=context.createMediaElementSource.bind(context);context.createMediaElementSource=media=>{streamCreated++;return createSource(media);};
      try{
        for(const amplitude of [.8,.02]){const count=Math.round(context.sampleRate*.04),bytes=new ArrayBuffer(44+count*2),view=new DataView(bytes),text=(offset,value)=>{for(let i=0;i<value.length;i++)view.setUint8(offset+i,value.charCodeAt(i));};text(0,'RIFF');view.setUint32(4,bytes.byteLength-8,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,context.sampleRate,true);view.setUint32(28,context.sampleRate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,count*2,true);for(let i=0;i<count;i++)view.setInt16(44+i*2,Math.round(Math.sin(i*2*Math.PI*440/context.sampleRate)*amplitude*32767),true);urls.push(URL.createObjectURL(new Blob([bytes],{type:'audio/wav'})));}
        for(let i=0;i<12;i++){const player=await route.player(urls[i%2]);await route.connect(player);await player.play();await waitClock(context.currentTime+.06,()=>route.peak(player));const amplitude=i%2?.02:.8,peak=route.peak(player);streamPeaks.push({amplitude,peak});if(Math.abs(peak-amplitude)>.005)throw Error('스트리밍 소스 재사용 신호가 섞였어요: '+JSON.stringify(streamPeaks));route.disconnect(player);player.addEventListener('ended',()=>oldEnded++);await waitClock(context.currentTime+.11);}
        if(streamCreated!==1||oldEnded!==0)throw Error('스트리밍 소스/이전 핸들 재사용 실패: '+JSON.stringify({streamCreated,oldEnded}));streaming={created:streamCreated,peaks:streamPeaks,oldEnded,leases:12};
      }finally{for(const url of urls)URL.revokeObjectURL(url);}
    }
    return {created,peaks,reuse:true,idleDisconnected:true,timerStopped:true,streaming};
  }finally{route.dispose();}
}
