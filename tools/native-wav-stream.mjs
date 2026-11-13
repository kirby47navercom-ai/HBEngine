async function readRange(stream,start,length,signal){
  signal?.throwIfAborted();
  const input=await stream(start,start+length-1),bytes=Buffer.allocUnsafe(length);
  let offset=0;
  const abort=()=>input.destroy(signal.reason);
  signal?.addEventListener('abort',abort,{once:true});
  try{
    signal?.throwIfAborted();
    for await(const chunk of input){
      if(offset+chunk.length>length)throw Error('WAV 읽기 범위를 확인하세요.');
      offset+=chunk.copy(bytes,offset);
    }
    signal?.throwIfAborted();
    if(offset!==length)throw Error('WAV 파일이 잘렸어요.');
    return bytes;
  }finally{signal?.removeEventListener('abort',abort);input.destroy();}
}

async function wavFormat(stream,signal){
  const header=await readRange(stream,0,12,signal);
  if(header.toString('ascii',0,4)!=='RIFF'||header.toString('ascii',8,12)!=='WAVE')throw Error('RIFF/WAVE 헤더를 확인하세요.');
  const end=header.readUInt32LE(4)+8;
  let format;
  for(let offset=12;offset+8<=end;){
    const chunk=await readRange(stream,offset,8,signal),id=chunk.toString('ascii',0,4),size=chunk.readUInt32LE(4),data=offset+8;
    if(data+size>end)throw Error('WAV 청크 범위를 확인하세요.');
    if(id==='fmt '){
      if(size<16)throw Error('WAV 오디오 형식을 확인하세요.');
      const value=await readRange(stream,data,Math.min(size,40),signal);
      let encoding=value.readUInt16LE(0);
      if(encoding===0xfffe&&value.length>=40)encoding=value.readUInt16LE(24);
      const channels=value.readUInt16LE(2),rate=value.readUInt32LE(4),stride=value.readUInt16LE(12),bits=value.readUInt16LE(14);
      if(channels<1||channels>8||rate<8000||rate>192000||stride!==channels*bits/8||
        !(encoding===1&&[8,16,24,32].includes(bits)||encoding===3&&bits===32))
        throw Error('WAV 스트리밍은 PCM 또는 32비트 float 오디오를 지원해요.');
      format={encoding,channels,rate,stride,bits};
    }else if(id==='data'&&format){
      if(size<format.stride||size%format.stride)throw Error('WAV 샘플 길이를 확인하세요.');
      return {...format,data,frames:size/format.stride};
    }
    offset=data+size+(size&1);
  }
  throw Error('WAV 오디오 데이터가 없어요.');
}

class NativeWavStream extends EventTarget{
  constructor(context,stream,format){
    super();
    this.context=context;this.stream=stream;this.format=format;this.output=context.createGain();
    this.duration=format.frames/format.rate;
    this.readyState=4;this.networkState=1;this.volume=1;this.paused=true;this.virtual=true;this.disposed=false;
    this.offset=0;this.rate=1;this.looping=false;this.startTime=context.currentTime;
    this.sources=new Set();this.cursor=0;this.scheduled=0;
  }
  get decoderResident(){return this.sources.size>0;}
  get currentTime(){
    const value=this.offset+(this.paused?0:Math.max(0,this.context.currentTime-this.startTime)*this.rate);
    return this.loop?value%this.duration:Math.min(this.duration,value);
  }
  set currentTime(value){
    if(!Number.isFinite(value)||value<0)throw Error('오디오 탐색 시간을 확인하세요.');
    this.offset=Math.min(this.duration,value);this.restart();
  }
  get loop(){return this.looping;}
  set loop(value){
    if(this.looping===Boolean(value))return;
    this.offset=this.currentTime;this.looping=Boolean(value);this.restart();
  }
  get playbackRate(){return this.rate;}
  set playbackRate(value){
    if(!Number.isFinite(value)||value<=0||value>16)throw Error('WAV 스트리밍 재생 속도를 확인하세요.');
    if(value===this.rate)return;
    this.offset=this.currentTime;this.rate=value;this.restart();
  }
  async play(){
    if(this.disposed)throw Error('오디오 실행이 종료됐어요.');
    if(!this.paused)return;
    if(this.offset>=this.duration)this.offset=0;
    this.paused=false;this.restart();
  }
  pause(){
    if(this.paused)return;
    this.offset=this.currentTime;this.paused=true;this.stop();
  }
  setVirtual(value){
    if(this.virtual===Boolean(value))return;
    this.offset=this.currentTime;this.virtual=Boolean(value);this.restart();
  }
  stop(){
    this.controller?.abort();this.controller=null;
    for(const source of this.sources){source.onended=null;source.stop();source.disconnect();}
    this.sources.clear();
  }
  restart(){
    this.stop();this.startTime=this.context.currentTime;
    if(this.paused||this.virtual||this.disposed)return;
    this.cursor=Math.floor(this.offset*this.format.rate);
    this.startTime+=.03;this.scheduled=this.startTime;
    const controller=new AbortController();this.controller=controller;
    this.fill(controller).catch(error=>this.failed(controller,error));
  }
  failed(controller,error){
    if(this.controller!==controller||controller.signal.aborted)return;
    this.error={message:error.message};this.pause();this.dispatchEvent(new Event('error'));
  }
  async fill(controller){
    if(!controller||controller.signal.aborted||this.loading===controller)return;
    this.loading=controller;
    const {rate,frames,data,stride,bits,encoding,channels}=this.format;
    try{
      while(this.controller===controller&&this.sources.size<48&&this.scheduled-this.context.currentTime<.22){
        if(this.cursor>=frames){if(!this.loop)break;this.cursor=0;}
        const count=Math.min(Math.ceil(rate*.12),frames-this.cursor);
        const input=await readRange(this.stream,data+this.cursor*stride,count*stride,controller.signal);
        if(this.controller!==controller)return;
        const buffer=this.context.createBuffer(channels,count,rate);
        for(let channel=0;channel<channels;channel++){
          const output=buffer.getChannelData(channel);
          for(let i=0,at=channel*bits/8;i<count;i++,at+=stride){
            const sample=encoding===3?input.readFloatLE(at):bits===8?(input[at]-128)/128:input.readIntLE(at,bits/8)/2**(bits-1);
            output[i]=Number.isFinite(sample)?sample:0;
          }
        }
        const source=this.context.createBufferSource();source.buffer=buffer;source.playbackRate.value=this.rate;source.connect(this.output);
        source.onended=()=>{this.sources.delete(source);source.disconnect();};
        this.scheduled=Math.max(this.scheduled,this.context.currentTime+.005);
        try{source.start(this.scheduled);}catch(error){source.disconnect();throw error;}
        this.sources.add(source);this.cursor+=count;this.scheduled+=count/rate/this.rate;
      }
    }finally{if(this.loading===controller)this.loading=null;}
  }
  tick(){
    if(this.disposed||this.paused)return;
    if(!this.loop&&this.currentTime>=this.duration&&(this.virtual||this.cursor>=this.format.frames&&this.context.currentTime>=this.scheduled)){
      this.pause();this.offset=this.duration;this.dispatchEvent(new Event('ended'));return;
    }
    const controller=this.controller;
    if(controller)this.fill(controller).catch(error=>this.failed(controller,error));
  }
  dispose(){if(this.disposed)return;this.pause();this.stop();this.disposed=true;this.output.disconnect();}
}

export async function openNativeWavStream(context,stream,signal){
  return new NativeWavStream(context,stream,await wavFormat(stream,signal));
}
