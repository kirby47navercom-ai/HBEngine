// Keep one submitted presentation in flight while the next simulation runs.
// Its pixels/commands are already detached; the next draw waits for its ACK.
export class NativePresentationQueue {
 constructor(){this.pending=null;this.failure=null;this.completed=0;this.maxPending=0;}
 throwIfFailed(){if(this.failure)throw this.failure;}
 async flush(){const pending=this.pending;if(pending){await pending;if(this.pending===pending)this.pending=null;}this.throwIfFailed();}
 async submit(work){
  if(this.submitting)throw Error('Native presentation submission already active');this.submitting=true;try{
  await this.flush();let submitted;const queued=new Promise(resolve=>{submitted=resolve;});let task;
  try{task=work(submitted);}catch(error){this.failure=error;submitted();throw error;}
  this.maxPending=1;
  this.pending=Promise.resolve(task).then(()=>{this.completed++;},error=>{this.failure=error;}).finally(submitted);
  await queued;this.throwIfFailed();
  }finally{this.submitting=false;}
 }
 diagnostics(){return {maxPendingFrames:this.maxPending,completedFrames:this.completed,pending:!!this.pending,failure:this.failure?.message||null};}
}
