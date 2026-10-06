export const validToneSample=report=>report.audio?.state==='running'&&report.audio.voices.some(v=>v.clip==='Assets/MobileTone.wav'&&v.playing&&Math.abs(v.duration-2)<.01&&v.time>.05)&&report.audio.levels['Assets/MobileMixer.hbmixer.json']?.master>1e-6;
export const validTonePlayback=samples=>{const valid=samples.filter(validToneSample),tone=sample=>sample.audio.voices.find(v=>v.clip==='Assets/MobileTone.wav'),first=valid[0],last=valid.at(-1);return valid.length>=3&&last.audio.clock-first.audio.clock>=4&&samples.filter(sample=>sample.frames>=first.frames&&sample.frames<=last.frames).every(sample=>Math.abs((tone(sample)?.duration??0)-2)<.01)&&valid.some(sample=>sample.frames!==first.frames&&Math.abs(tone(sample).time-tone(first).time)>.01);};

// Test-only WKWebView probe: compare the same HTTP bytes and separate audio paths.
export async function iosAudioProbe(url,meterReuse){
  const result=window.hbIOSAudioProbe={phase:'fetch',samples:[]},players=[];let context,blobURL;
  try{
    context=new AudioContext();await context.resume();const bytes=await(await fetch(url)).arrayBuffer();result.bytes=bytes.byteLength;result.phase='decode';
    const buffer=await context.decodeAudioData(bytes.slice(0));result.decoded={duration:buffer.duration,length:buffer.length,sampleRate:buffer.sampleRate,channels:buffer.numberOfChannels};
    const silent=context.createGain();silent.gain.value=0;silent.connect(context.destination);
    const decoded=context.createBufferSource(),bufferMeter=context.createAnalyser();decoded.buffer=buffer;decoded.loop=true;decoded.connect(bufferMeter);bufferMeter.connect(silent);decoded.start();
    blobURL=URL.createObjectURL(new Blob([bytes],{type:'audio/wav'}));const plain=new Audio(url),routed=new Audio(url),attached=new Audio(url),manual=new Audio(url),blob=new Audio(blobURL);players.push(plain,routed,attached,manual,blob);for(const player of players){player.loop=player!==manual;player.volume=.0001;}
    attached.hidden=true;document.body.append(attached);manual.addEventListener('ended',()=>{manual.currentTime=0;manual.play().catch(error=>{result.manualError=error.message;});});
    const source=context.createMediaElementSource(routed),mediaMeter=context.createAnalyser();source.connect(mediaMeter);mediaMeter.connect(silent);
    result.phase='play';await Promise.all(players.map(player=>player.play()));
    const state=player=>({time:player.currentTime,duration:Number.isFinite(player.duration)?player.duration:null,readyState:player.readyState,playing:!player.paused,error:player.error?.code||null});
    const level=meter=>{const values=new Float32Array(meter.fftSize);meter.getFloatTimeDomainData(values);return Math.sqrt(values.reduce((sum,value)=>sum+value*value,0)/values.length);};
    for(let i=0;i<12;i++){result.samples.push({clock:context.currentTime,plain:state(plain),routed:state(routed),attached:state(attached),manual:state(manual),blob:state(blob),bufferRMS:level(bufferMeter),mediaRMS:level(mediaMeter)});await new Promise(resolve=>setTimeout(resolve,500));}
    decoded.stop();if(meterReuse)result.meterReuse=await meterReuse();result.phase='done';
  }catch(error){result.error=error.name+': '+error.message;result.phase='failed';}
  finally{for(const player of players){player.pause();player.removeAttribute('src');player.load();player.remove();}if(blobURL)URL.revokeObjectURL(blobURL);await context?.close();}
}

if(process.argv.includes('--check')){
  const {default:assert}=await import('node:assert/strict');
  const sample={audio:{state:'running',voices:[{clip:'Assets/MobileTone.wav',playing:true,time:1.9073486328125e-6,duration:1.9073486328125e-6}],levels:{'Assets/MobileMixer.hbmixer.json':{master:.000133466}}}};
  assert.equal(validToneSample(sample),false,'실제37335923351의 마이크로초 길이와 일시 신호는 정상 WAV 재생이 아니에요.');
  Object.assign(sample.audio.voices[0],{duration:2,time:.5});assert.equal(validToneSample(sample),true);sample.frames=120;sample.audio.clock=10;const next=structuredClone(sample);next.frames=240;next.audio.clock=11;const last=structuredClone(next);last.frames=600;last.audio.clock=14;assert.equal(validTonePlayback([sample,next,last]),false,'프레임만 진행하고 오디오 시간이 정지한 표본을 거부해요.');next.audio.voices[0].time=.8;assert.equal(validTonePlayback([sample,next]),false,'첫 반복 전에 정상인 두 표본만으로 통과하지 않아요.');assert.equal(validTonePlayback([sample,next,last]),true);const corrupt=structuredClone(next);corrupt.frames=300;corrupt.audio.voices[0].duration=.000002;assert.equal(validTonePlayback([sample,next,corrupt,last]),false,'중간 반복에서 길이가 손상됐다면 뒤의 정상 표본으로 가리지 않아요.');sample.audio.levels['Assets/MobileMixer.hbmixer.json'].master=1.1e-44;assert.equal(validToneSample(sample),false);
  console.log('iOS 오디오 검사: 실제 잘못된 길이·일시 신호 표본 거부와 정상2초 출력 대조 통과');
}
