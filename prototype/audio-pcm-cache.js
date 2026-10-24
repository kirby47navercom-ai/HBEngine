export const audioPCMCacheContract={retainedBytes:33554432,concurrentLoads:2,queue:'Same URL shares one load; distinct URLs use a FIFO linked queue without fetching until a slot is free. Enqueue, dequeue and queued cancellation do not shift the queue. No new voice-count limit.',cancellation:'read(context,url,{signal}) cancels one caller. Abort the shared job only when every cancellable caller has left and no unsignalled caller is waiting. Cancelled queued work is never fetched; abandoned active decodes still count against concurrency until they settle.',lifecycle:'Dispose rejects queued/active callers and aborts outstanding fetches. An already executing platform decode is not cancellable; its result is discarded.',scope:'Retained PCM cache and in-flight load counts only. Active voices, reverse PCM and OS/codec allocations are outside the retained byte budget.'};
const stopped=()=>Error('오디오 실행이 종료됐어요.');
export const audioAbortReason=signal=>signal?.reason!==undefined?signal.reason:Object.assign(Error('오디오 로딩이 취소됐어요.'),{name:'AbortError'});
export class AudioPCMCache{
 constructor({fetch=globalThis.fetch,budgetBytes=33554432,concurrency=2}={}){
  if(typeof fetch!=='function'||!Number.isSafeInteger(budgetBytes)||budgetBytes<0||!Number.isSafeInteger(concurrency)||concurrency<1)throw Error('오디오 PCM 캐시 설정을 확인하세요.');
  this.fetch=fetch;this.budgetBytes=budgetBytes;this.concurrency=concurrency;this.buffers=new Map();this.bytes=0;this.pending=new Map();this.jobs=new Map();this.queueHead=null;this.queueTail=null;this.queued=0;this.active=new Set();this.disposed=false;
 }
 enqueue(job){job.state='queued';job.previous=this.queueTail;job.next=null;if(this.queueTail)this.queueTail.next=job;else this.queueHead=job;this.queueTail=job;this.queued++;}
 unlink(job){if(job.state!=='queued')return;if(job.previous)job.previous.next=job.next;else this.queueHead=job.next;if(job.next)job.next.previous=job.previous;else this.queueTail=job.previous;job.previous=job.next=null;job.state='removed';this.queued--;}
 cancel(job,error){if(job.cancelled||job.state==='done')return;job.cancelled=true;job.cancelReason=error;this.unlink(job);if(this.jobs.get(job.url)===job)this.jobs.delete(job.url);if(this.pending.get(job.url)===job.promise)this.pending.delete(job.url);job.controller.abort();job.reject(error);}
 subscribe(job,signal){
  return new Promise((resolve,reject)=>{const subscription={signal},detach=()=>{subscription.signal?.removeEventListener('abort',subscription.abort);subscription.signal=null;job.subscribers.delete(subscription);};
   subscription.abort=()=>{const error=audioAbortReason(subscription.signal);detach();reject(error);if(!job.permanent&&!job.subscribers.size)this.cancel(job,error);};job.subscribers.add(subscription);signal.addEventListener('abort',subscription.abort,{once:true});job.promise.then(buffer=>{detach();resolve(buffer);},error=>{detach();reject(error);});if(signal.aborted)subscription.abort();
  });
 }
 read(context,url,{signal}={}){
  if(this.disposed)return Promise.reject(stopped());if(signal?.aborted)return Promise.reject(audioAbortReason(signal));if(signal&&(typeof signal.addEventListener!=='function'||typeof signal.removeEventListener!=='function'))return Promise.reject(Error('오디오 취소 신호를 확인하세요.'));
  const cached=this.buffers.get(url);if(cached){this.buffers.delete(url);this.buffers.set(url,cached);return Promise.resolve(cached.buffer);}let job=this.jobs.get(url);
  if(!job){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});job={context,url,promise,resolve,reject,controller:new AbortController(),subscribers:new Set(),permanent:false,cancelled:false};this.jobs.set(url,job);this.pending.set(url,promise);this.enqueue(job);}
  let promise;if(signal)promise=this.subscribe(job,signal);else{job.permanent=true;promise=job.promise;}this.pump();return promise;
 }
 pump(){
  while(!this.disposed&&this.active.size<this.concurrency&&this.queueHead){const job=this.queueHead;this.unlink(job);job.state='active';this.active.add(job);const check=()=>{if(this.disposed)throw stopped();if(job.cancelled)throw job.cancelReason;},work=async()=>{check();const response=await this.fetch(job.url,{signal:job.controller.signal});check();if(!response.ok)throw Error('오디오 파일 요청 실패: '+response.status);const compressed=await response.arrayBuffer();check();const buffer=await job.context.decodeAudioData(compressed);check();const bytes=buffer.length*buffer.numberOfChannels*4;if(!Number.isSafeInteger(bytes)||bytes<0)throw Error('디코딩한 오디오 PCM 크기를 확인하세요.');
    return{buffer,bytes};};
   const finish=(ok,value)=>{this.active.delete(job);job.state='done';if(this.jobs.get(job.url)===job)this.jobs.delete(job.url);if(this.pending.get(job.url)===job.promise)this.pending.delete(job.url);if(this.disposed){ok=false;value=stopped();}else if(job.cancelled){ok=false;value=job.cancelReason;}
    if(ok){const{buffer,bytes}=value;if(bytes<=this.budgetBytes){for(const[key,cached]of this.buffers){if(this.bytes+bytes<=this.budgetBytes)break;this.buffers.delete(key);this.bytes-=cached.bytes;}this.buffers.set(job.url,{buffer,bytes});this.bytes+=bytes;}job.resolve(buffer);}else job.reject(value);this.pump();};void work().then(value=>finish(true,value),error=>finish(false,error));
  }
 }
 inspect(){return{retainedBytes:this.bytes,budgetBytes:this.budgetBytes,entries:this.buffers.size,pending:this.pending.size,queued:this.queued,active:this.active.size,abandonedActive:[...this.active].filter(job=>job.cancelled).length,concurrency:this.concurrency,disposed:this.disposed};}
 dispose(){if(this.disposed)return;this.disposed=true;for(const job of new Set([...this.active,...this.jobs.values()]))this.cancel(job,stopped());this.queueHead=this.queueTail=null;this.queued=0;this.jobs.clear();this.pending.clear();this.buffers.clear();this.bytes=0;}
}
