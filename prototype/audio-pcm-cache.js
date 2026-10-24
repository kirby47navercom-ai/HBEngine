export const audioPCMCacheContract={retainedBytes:33554432,concurrentLoads:2,queue:'Same URL shares one pending load; distinct URLs wait without fetching until a slot is free. No voice-count limit.',lifecycle:'Dispose rejects queued/active callers and aborts outstanding fetches. An already executing platform decode is not cancellable; its result is discarded.',scope:'Retained PCM cache and in-flight load counts only. Active voices, reverse PCM and OS/codec allocations are outside the retained byte budget.'};
const stopped=()=>Error('오디오 실행이 종료됐어요.');
export class AudioPCMCache{
 constructor({fetch=globalThis.fetch,budgetBytes=33554432,concurrency=2}={}){
  if(typeof fetch!=='function'||!Number.isSafeInteger(budgetBytes)||budgetBytes<0||!Number.isSafeInteger(concurrency)||concurrency<1)throw Error('오디오 PCM 캐시 설정을 확인하세요.');
  this.fetch=fetch;this.budgetBytes=budgetBytes;this.concurrency=concurrency;this.buffers=new Map();this.bytes=0;this.pending=new Map();this.queue=[];this.active=new Set();this.disposed=false;
 }
 read(context,url){
  if(this.disposed)return Promise.reject(stopped());const cached=this.buffers.get(url);if(cached){this.buffers.delete(url);this.buffers.set(url,cached);return Promise.resolve(cached.buffer);}if(this.pending.has(url))return this.pending.get(url);
  let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;}),job={context,url,promise,resolve,reject,controller:new AbortController()};this.pending.set(url,promise);this.queue.push(job);this.pump();return promise;
 }
 pump(){
  while(!this.disposed&&this.active.size<this.concurrency&&this.queue.length){const job=this.queue.shift();this.active.add(job);const work=async()=>{const response=await this.fetch(job.url,{signal:job.controller.signal});if(this.disposed)throw stopped();if(!response.ok)throw Error('오디오 파일 요청 실패: '+response.status);const compressed=await response.arrayBuffer();if(this.disposed)throw stopped();const buffer=await job.context.decodeAudioData(compressed);if(this.disposed)throw stopped();const bytes=buffer.length*buffer.numberOfChannels*4;if(!Number.isSafeInteger(bytes)||bytes<0)throw Error('디코딩한 오디오 PCM 크기를 확인하세요.');
    if(bytes<=this.budgetBytes){for(const[key,cached]of this.buffers){if(this.bytes+bytes<=this.budgetBytes)break;this.buffers.delete(key);this.bytes-=cached.bytes;}this.buffers.set(job.url,{buffer,bytes});this.bytes+=bytes;}return buffer;};
   const finish=(error,buffer)=>{this.active.delete(job);if(this.pending.get(job.url)===job.promise)this.pending.delete(job.url);if(error)job.reject(this.disposed?stopped():error);else job.resolve(buffer);this.pump();};void work().then(buffer=>finish(null,buffer),error=>finish(error));
  }
 }
 inspect(){return{retainedBytes:this.bytes,budgetBytes:this.budgetBytes,entries:this.buffers.size,pending:this.pending.size,queued:this.queue.length,active:this.active.size,concurrency:this.concurrency,disposed:this.disposed};}
 dispose(){if(this.disposed)return;this.disposed=true;for(const job of [...this.active,...this.queue]){job.controller.abort();job.reject(stopped());}this.queue=[];this.pending.clear();this.buffers.clear();this.bytes=0;}
}
