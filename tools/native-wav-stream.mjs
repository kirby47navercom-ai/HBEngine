const imaStep=[
  7,8,9,10,11,12,13,14,16,17,19,21,23,25,28,31,34,37,41,45,50,55,60,66,
  73,80,88,97,107,118,130,143,157,173,190,209,230,253,279,307,337,371,408,
  449,494,544,598,658,724,796,876,963,1060,1166,1282,1411,1552,1707,1878,
  2066,2272,2499,2749,3024,3327,3660,4026,4428,4871,5358,5894,6484,7132,
  7845,8630,9493,10442,11487,12635,13899,15289,16818,18500,20350,22385,
  24623,27086,29794,32767,
];
const imaIndex=[-1,-1,-1,-1,2,4,6,8];

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
  let format,factOffset;
  for(let offset=12;offset+8<=end;){
    const chunk=await readRange(stream,offset,8,signal),id=chunk.toString('ascii',0,4),size=chunk.readUInt32LE(4),data=offset+8;
    if(data+size>end)throw Error('WAV 청크 범위를 확인하세요.');
    if(id==='fmt '){
      if(size<16)throw Error('WAV 오디오 형식을 확인하세요.');
      const value=await readRange(stream,data,Math.min(size,40),signal);
      const tag=value.readUInt16LE(0);
      const encoding=tag===0xfffe&&value.length>=40?value.readUInt16LE(24):tag;
      const channels=value.readUInt16LE(2),rate=value.readUInt32LE(4),stride=value.readUInt16LE(12),bits=value.readUInt16LE(14);
      if(channels<1||channels>8||rate<8000||rate>192000)throw Error('WAV 채널 수와 샘플 주파수를 확인하세요.');
      if(tag===0x11){
        const extra=value.length>=18?value.readUInt16LE(16):0;
        const blockFrames=extra>=2&&18+extra<=size?value.readUInt16LE(18):0;
        const words=stride/(4*channels)-1;
        if(bits!==4||!Number.isInteger(words)||words<1||blockFrames!==words*8+1)
          throw Error('IMA ADPCM WAV 블록 형식을 확인하세요.');
        format={encoding,channels,rate,stride,blockFrames};
      }else{
        if(stride!==channels*bits/8||!(encoding===1&&[8,16,24,32].includes(bits)||encoding===3&&bits===32))
          throw Error('WAV 스트리밍은 PCM, 32비트 float 또는 4비트 IMA ADPCM을 지원해요.');
        format={encoding,channels,rate,stride,bits};
      }
    }else if(id==='fact'&&size>=4){
      factOffset=data;
    }else if(id==='data'&&format){
      if(size<format.stride||size%format.stride)throw Error('WAV 샘플 길이를 확인하세요.');
      const capacity=size/format.stride*(format.blockFrames||1);
      const frames=format.blockFrames&&factOffset!==undefined?(await readRange(stream,factOffset,4,signal)).readUInt32LE(0):capacity;
      if(frames<1||frames>capacity)throw Error('IMA ADPCM WAV의 샘플 수를 확인하세요.');
      return {...format,data,frames};
    }
    offset=data+size+(size&1);
  }
  throw Error('WAV 오디오 데이터가 없어요.');
}

function decodeIma(input,outputs,{stride,channels,blockFrames},skip,count){
  for(let base=0,first=-skip;base<input.length;base+=stride,first+=blockFrames){
    const end=Math.min(blockFrames,count-first);
    for(let channel=0;channel<channels;channel++){
      const header=base+channel*4,output=outputs[channel];
      let sample=input.readInt16LE(header),index=input[header+2];
      if(index>=imaStep.length||input[header+3]!==0)throw Error('IMA ADPCM WAV 블록 헤더가 손상됐어요.');
      if(first>=0)output[first]=sample/32768;
      for(let frame=1;frame<end;frame++){
        const nibble=frame-1;
        const packed=input[base+4*(channels+(nibble>>3)*channels+channel)+((nibble&7)>>1)];
        const code=(packed>>((nibble&1)*4))&15,step=imaStep[index];
        const delta=(step>>3)+(code&4?step:0)+(code&2?step>>1:0)+(code&1?step>>2:0);
        sample=Math.max(-32768,Math.min(32767,sample+(code&8?-delta:delta)));
        index=Math.max(0,Math.min(88,index+imaIndex[code&7]));
        if(first+frame>=0)output[first+frame]=sample/32768;
      }
    }
  }
}

async function readSamples(stream,format,cursor,channelsFor,signal){
  const {rate,frames,data,stride,bits,encoding,channels,blockFrames=1}=format;
  const first=Math.floor(cursor/blockFrames),last=Math.ceil(Math.min(frames,cursor+Math.ceil(rate*.12))/blockFrames);
  const count=Math.min(last*blockFrames,frames)-cursor;
  const input=await readRange(stream,data+first*stride,(last-first)*stride,signal);
  const outputs=channelsFor(count);
  if(encoding===0x11){
    decodeIma(input,outputs,format,cursor-first*blockFrames,count);
  }else{
    for(let channel=0;channel<channels;channel++){
      const output=outputs[channel];
      for(let i=0,at=channel*bits/8;i<count;i++,at+=stride){
        const sample=encoding===3?input.readFloatLE(at):bits===8?(input[at]-128)/128:input.readIntLE(at,bits/8)/2**(bits-1);
        output[i]=Number.isFinite(sample)?sample:0;
      }
    }
  }
  return count;
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
  async waveform(signal){
    const {frames,channels,rate,blockFrames=1}=this.format,count=Math.min(frames,256);
    const bins=Array.from({length:count},()=>[0,0]);
    const capacity=Math.min(frames,Math.ceil(rate*.12)+blockFrames-1);
    const data=Array.from({length:channels},()=>new Float32Array(capacity));
    for(let cursor=0,index=0;cursor<frames;){
      const length=await readSamples(this.stream,this.format,cursor,()=>data,signal);
      for(let sample=0;sample<length;sample++){
        if(cursor+sample>=Math.floor((index+1)*frames/count))index++;
        const bin=bins[index];
        for(const channel of data){
          bin[0]=Math.min(bin[0],channel[sample]);bin[1]=Math.max(bin[1],channel[sample]);
        }
      }
      cursor+=length;
    }
    return {duration:this.duration,bins};
  }
  async fill(controller){
    if(!controller||controller.signal.aborted||this.loading===controller)return;
    this.loading=controller;
    const {rate,frames,channels}=this.format;
    try{
      while(this.controller===controller&&this.sources.size<48&&this.scheduled-this.context.currentTime<.22){
        if(this.cursor>=frames){if(!this.loop)break;this.cursor=0;}
        let buffer;
        const length=await readSamples(this.stream,this.format,this.cursor,count=>{
          buffer=this.context.createBuffer(channels,count,rate);
          return Array.from({length:channels},(_,channel)=>buffer.getChannelData(channel));
        },controller.signal);
        if(this.controller!==controller)return;
        const source=this.context.createBufferSource();source.buffer=buffer;source.playbackRate.value=this.rate;source.connect(this.output);
        source.onended=()=>{this.sources.delete(source);source.disconnect();};
        this.scheduled=Math.max(this.scheduled,this.context.currentTime+.005);
        try{source.start(this.scheduled);}catch(error){source.disconnect();throw error;}
        this.sources.add(source);this.cursor+=length;this.scheduled+=length/rate/this.rate;
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
