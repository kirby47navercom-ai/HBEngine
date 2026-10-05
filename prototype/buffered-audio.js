// A source node can start only once; resume/seek creates a new node over the same PCM.
export class BufferedAudioPlayer extends EventTarget {
  constructor(context,buffer){super();this.context=context;this.buffer=buffer;this.output=context.createGain();this.offset=0;this.started=0;this.rate=1;this.repeating=false;this.source=null;this.paused=true;this.disposed=false;this.readyState=4;this.networkState=1;this.error=null;this.volume=1;}
  get duration(){return this.buffer.duration;}
  get currentTime(){const time=this.offset+(this.paused?0:(this.context.currentTime-this.started)*this.rate);return this.repeating?time%this.duration:Math.min(this.duration,time);}
  set currentTime(value){if(!Number.isFinite(value)||value<0)throw Error('오디오 탐색 시간을 확인하세요.');const playing=!this.paused;this.pause();this.offset=Math.min(value,this.duration);if(playing)this.start();}
  get playbackRate(){return this.rate;}
  set playbackRate(value){if(!Number.isFinite(value)||value<=0)throw Error('오디오 재생 속도를 확인하세요.');if(value===this.rate)return;this.offset=this.currentTime;this.started=this.context.currentTime;this.rate=value;if(this.source)this.source.playbackRate.value=value;}
  get loop(){return this.repeating;}
  set loop(value){value=Boolean(value);if(value===this.repeating)return;this.offset=this.currentTime;this.started=this.context.currentTime;this.repeating=value;if(this.source)this.source.loop=value;}
  start(){
    if(this.disposed)throw Error('오디오 실행이 종료됐어요.');
    const source=this.context.createBufferSource();source.buffer=this.buffer;source.loop=this.repeating;source.playbackRate.value=this.rate;source.connect(this.output);this.source=source;this.started=this.context.currentTime;this.paused=false;
    source.onended=()=>{source.disconnect();if(this.source!==source)return;this.source=null;this.offset=this.duration;this.paused=true;this.dispatchEvent(new Event('ended'));};
    try{source.start(0,this.offset);}catch(error){this.source=null;this.paused=true;source.disconnect();throw error;}
  }
  async play(){if(!this.paused)return;if(this.context.state==='suspended')await this.context.resume();if(this.paused){if(this.offset>=this.duration)this.offset=0;this.start();}}
  pause(){if(this.paused)return;this.offset=this.currentTime;this.paused=true;const source=this.source;this.source=null;source.onended=null;source.stop();source.disconnect();}
  dispose(){this.pause();this.disposed=true;this.output.disconnect();}
}

export async function createAudioPlayer(context,url,{buffered=globalThis.hbMobileTarget==='ios',readBuffer}={}){
  if(!buffered)return new Audio(url);
  const buffer=readBuffer?await readBuffer(url):await(async()=>{const response=await fetch(url);if(!response.ok)throw Error('오디오 파일 요청 실패: '+response.status);return context.decodeAudioData(await response.arrayBuffer());})();
  if(!Number.isFinite(buffer.duration)||buffer.duration<=0)throw Error('오디오 길이를 확인하세요.');
  return new BufferedAudioPlayer(context,buffer);
}
