// Keep one submitted presentation in flight while the next simulation runs.
// Its pixels/commands are already detached; the next draw waits for its ACK.
export class NativePresentationQueue {
 constructor({profile=false}={}){this.profile=profile;this.preparations=0;this.overlappedPreparations=0;this.pending=null;this.failure=null;this.completed=0;this.maxPending=0;}
 throwIfFailed(){if(this.failure)throw this.failure;}
 async flush(){const pending=this.pending;if(pending){await pending;if(this.pending===pending)this.pending=null;}this.throwIfFailed();}
 // Prepare the next frame's independent CPU state while the previous detached
 // presentation is in flight. Temporal render encoding still waits for its ACK.
 async prepare(work,{renderOnly=false}={}){this.throwIfFailed();this.preparations++;if(this.pending)this.overlappedPreparations++;const start=this.profile?performance.now():0;const result=await work(),prepared=this.profile?performance.now():0;await (renderOnly?this.flushRender():this.flush());if(this.profile)this.lastPreparation={prepareMS:prepared-start,waitMS:performance.now()-prepared};return result;}
 // UI and scene presentation have separate acknowledged histories. A completed
 // scene can encode N+1 while UI N finishes; neither channel skips a frame.
 async flushRender(){if(!this.splitMode)return this.flush();const pending=this.renderPending;if(pending)await pending;this.throwIfFailed();}
 async submitFrame(renderWork,uiWork){
  if(this.submitting)throw Error('Native presentation submission already active');this.submitting=true;
  try{
   await this.flushRender();this.splitMode=true;this.throwIfFailed();
   let mark;const queued=new Promise(resolve=>{mark=resolve;}),previousUI=this.uiPending;
   const observe=work=>Promise.resolve().then(work).catch(error=>{this.failure??=error;});
   const render=observe(renderWork);this.renderPending=render;render.then(()=>{if(this.renderPending===render)this.renderPending=null;});
   const ui=observe(async()=>{if(previousUI)await previousUI;this.throwIfFailed();return uiWork(mark);});this.uiPending=ui;ui.then(()=>{if(this.uiPending===ui)this.uiPending=null;});
   this.maxPending=Math.max(this.maxPending,previousUI?2:1);
   const finished=Promise.all([render,ui]).then(()=>{if(!this.failure)this.completed++;}).finally(mark);this.pending=finished;finished.then(()=>{if(this.pending===finished)this.pending=null;});
   await queued;this.throwIfFailed();
  }finally{this.submitting=false;}
 }
 async submit(work){
  if(this.submitting)throw Error('Native presentation submission already active');this.submitting=true;try{
  await this.flush();this.splitMode=false;let submitted;const queued=new Promise(resolve=>{submitted=resolve;});let task;
  try{task=work(submitted);}catch(error){this.failure=error;submitted();throw error;}
  this.maxPending=Math.max(this.maxPending,1);
  this.pending=Promise.resolve(task).then(()=>{this.completed++;},error=>{this.failure=error;}).finally(submitted);
  await queued;this.throwIfFailed();
  }finally{this.submitting=false;}
 }
 diagnostics(){return {preparations:this.preparations,overlappedPreparations:this.overlappedPreparations,...this.profile?{lastPreparation:this.lastPreparation}:{},maxPendingFrames:this.maxPending,splitPresentation:!!this.splitMode,pendingRender:!!this.renderPending,pendingUI:!!this.uiPending,completedFrames:this.completed,pending:!!this.pending,failure:this.failure?.message||null};}
}
