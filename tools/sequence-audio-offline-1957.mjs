// Runs in the owned editor/player WebView; no sound device or user profile used.
async function offlineFixture(){
 const {BufferedAudioPlayer}=await import('/prototype/buffered-audio.js'),{sampleSequenceAudio}=await import('/prototype/sequence-audio.js'),rows=[];let samples=0;
 for(const {rate,time,paused=false}of[{rate:1,time:.025},{rate:.5,time:.025},{rate:2,time:.025},{rate:-1,time:.075},{rate:-.5,time:.075},{rate:-2,time:.075},{rate:0,time:.025},{rate:1,time:.025,paused:true},{rate:1,time:.1},{rate:-1,time:0}]){
  const context=new OfflineAudioContext(2,1024,48000),buffer=context.createBuffer(2,4800,48000);for(let c=0;c<2;c++){const data=buffer.getChannelData(c);for(let i=0;i<data.length;i++)data[i]=.2*Math.sin(2*Math.PI*(c?251:120)*i/48000)+.02*i/data.length;}
  const a=new BufferedAudioPlayer(context,buffer);a.output.connect(context.destination);a.setVirtual(true);await sampleSequenceAudio(a,{rate,time,paused,force:true});a.setVirtual(false);let shared=null,b;
  if(rate<0&&time>0){b=new BufferedAudioPlayer(context,buffer);b.setVirtual(true);await sampleSequenceAudio(b,{rate,time,force:true});b.setVirtual(false);shared=a.source.buffer===b.source.buffer;if(!shared)throw Error('reverse PCM was copied per voice');}
  const out=await context.startRendering(),silent=paused||rate===0||rate>0&&time>=buffer.duration||rate<0&&time===0;let maxError=0,energy=0;
  for(let c=0;c<2;c++){const data=buffer.getChannelData(c),rendered=out.getChannelData(c);for(let i=64;i<rendered.length;i++){const index=rate<0?time*48000-1+i*rate:time*48000+i*rate,lo=Math.floor(index),fraction=index-lo,expected=silent?0:(data[lo]||0)*(1-fraction)+(data[lo+1]||0)*fraction;maxError=Math.max(maxError,Math.abs(rendered[i]-expected));energy+=Math.abs(rendered[i]);samples++;}}
  if(maxError>.003||!silent&&energy<.1||silent&&energy>1e-8)throw Error('Offline PCM mismatch '+JSON.stringify({rate,time,paused,maxError,energy}));rows.push({rate,time,paused,silent,maxError,energy,shared});a.dispose();b?.dispose();
 }
 return {passed:true,rows,samples,scope:'Actual WebView OfflineAudioContext stereo PCM at rates±0.5/±1/±2 and hold/pause/end guards. Low-frequency oracle excludes64 startup frames; max absolute tolerance0.003 for browser resampling. Not a speaker/device, genlock or pitch-preserving stretch measurement.'};
}
export const sequenceAudioOfflineScript='('+offlineFixture.toString()+')()';
