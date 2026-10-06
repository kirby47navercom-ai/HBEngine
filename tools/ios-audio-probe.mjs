export const validToneSample=report=>report.audio?.state==='running'&&report.audio.voices.some(v=>v.clip==='Assets/MobileTone.wav'&&v.playing&&Math.abs(v.duration-2)<.01&&v.time>.05)&&report.audio.levels['Assets/MobileMixer.hbmixer.json']?.master>1e-6;
export const validTonePlayback=samples=>{const valid=samples.filter(validToneSample),tone=sample=>sample.audio.voices.find(v=>v.clip==='Assets/MobileTone.wav'),first=valid[0],last=valid.at(-1);return valid.length>=3&&last.audio.clock-first.audio.clock>=4&&samples.filter(sample=>sample.frames>=first.frames&&sample.frames<=last.frames).every(sample=>Math.abs((tone(sample)?.duration??0)-2)<.01)&&valid.some(sample=>sample.frames!==first.frames&&Math.abs(tone(sample).time-tone(first).time)>.01);};

// Test the app's HTTP server from its actual WKWebView, not the runner's network.
export async function iosAssetProof(toneURL){
  const expect=(ok,message)=>{if(!ok)throw Error('iOS 에셋: '+message);};
  const request=(url,options={})=>fetch(new URL(url,toneURL),{...options,signal:AbortSignal.timeout(15000)});
  const response=await request(toneURL);expect(response.status===200,'WAV 전체 응답');
  const bytes=new Uint8Array(await response.arrayBuffer()),equal=(a,b)=>a.length===b.length&&a.every((value,i)=>value===b[i]);
  const digest=await crypto.subtle.digest('SHA-256',bytes),toneSha256=Array.from(new Uint8Array(digest),value=>value.toString(16).padStart(2,'0')).join('');
  for(const [range,start,end] of [['bytes=0-1',0,2],['bytes=0-'+(bytes.length-1),0,bytes.length],['bytes=44-4095',44,4096],['bytes=-44',bytes.length-44,bytes.length]]){
    const part=await request(toneURL,{headers:{range}});expect(part.status===206,'WAV Range 상태');expect(part.headers.get('content-range')==='bytes '+start+'-'+(end-1)+'/'+bytes.length,'WAV Range 헤더');expect(equal(new Uint8Array(await part.arrayBuffer()),bytes.subarray(start,end)),'WAV Range 바이트');
  }
  const svgURL='/Content/Assets/MobileVector.svg',whole=await request(svgURL);expect(whole.status===200&&whole.headers.get('content-type')==='image/svg+xml','SVG 전체 응답과 MIME');const image=new Uint8Array(await whole.arrayBuffer());
  await Promise.all(Array.from({length:8},async()=>{const part=await request(svgURL);expect(part.status===200&&equal(new Uint8Array(await part.arrayBuffer()),image),'동시 SVG 응답');}));
  for(const [range,start,end] of [['bytes=0-7',0,8],['bytes=-8',image.length-8,image.length]]){const part=await request(svgURL,{headers:{range}});expect(part.status===206,'SVG Range 상태');expect(part.headers.get('content-range')==='bytes '+start+'-'+(end-1)+'/'+image.length,'SVG Range 헤더');expect(equal(new Uint8Array(await part.arrayBuffer()),image.subarray(start,end)),'SVG Range 바이트');}
  expect((await request(svgURL,{headers:{range:'bytes=invalid'}})).status===416,'잘못된 Range 거절');expect((await request('/Native/Main.mm')).status===404,'네이티브 소스 차단');
  return {toneSha256,toneBytes:bytes.length,waveRanges:4,svgRanges:2,concurrentSVG:8,invalidRangeRejected:true,nativeSourceBlocked:true,client:'WKWebView'};
}

// Test-only WKWebView probe: compare the same HTTP bytes and separate audio paths.
export async function iosAudioProbe(url,meterReuse,assetProof){
  const result=window.hbIOSAudioProbe={phase:'fetch',samples:[]},players=[];let context,blobURL;
  try{
    if(assetProof)result.assets=await assetProof(new URL(url,location.href).href);
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
  const originalFetch=globalThis.fetch,wav=Uint8Array.from({length:5000},(_,i)=>i%251),svg=new TextEncoder().encode('<svg>한글 Range 검증</svg>');let fault='',active=0,peak=0;
  globalThis.fetch=async(url,{headers={},signal}={})=>{
    assert.ok(signal);active++;peak=Math.max(peak,active);try{await new Promise(resolve=>setTimeout(resolve,0));}finally{active--;}
    const name=new URL(url).pathname;if(name==='/Native/Main.mm')return new Response(null,{status:fault==='source'?200:404});
    const data=name.endsWith('.wav')?wav:svg,type=name.endsWith('.wav')?'audio/wav':'image/svg+xml';
    if(!headers.range)return new Response(data,{headers:{'content-type':type}});
    const match=/^bytes=(\d*)-(\d*)$/.exec(headers.range);if(!match)return new Response(null,{status:416});
    const start=match[1]?Number(match[1]):data.length-Number(match[2]),end=match[1]?(match[2]?Number(match[2])+1:data.length):data.length,body=data.slice(start,end);
    if(fault==='range-bytes')body[0]^=1;
    return new Response(body,{status:206,headers:{'content-range':fault==='range-header'?'bytes 0-0/1':'bytes '+start+'-'+(end-1)+'/'+data.length}});
  };
  try{const result=await iosAssetProof('http://127.0.0.1:4321/Content/Assets/MobileTone.wav');assert.equal(result.toneSha256,(await import('node:crypto')).createHash('sha256').update(wav).digest('hex'));assert.equal(result.concurrentSVG,8);assert.equal(peak,8);for(fault of ['range-bytes','range-header','source'])await assert.rejects(iosAssetProof('http://127.0.0.1:4321/Content/Assets/MobileTone.wav'),/iOS 에셋/);}finally{globalThis.fetch=originalFetch;}
  console.log('iOS 오디오·에셋 검사: 잘못된 길이/일시 신호 거절·WAV SHA/Range·동시 SVG·네이티브 소스 차단 대조 통과');
}
