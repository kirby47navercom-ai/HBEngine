const errorsOrThrow=(errors,message)=>{if(errors.length===1)throw errors[0];if(errors.length)throw new AggregateError(errors,message,{cause:errors[0]});};
const cleanupRecord=(r,node,m)=>{if(m)delete m.taskData;if(r.memory.get(node.id)!==m)return;r.memory.delete(node.id);r.activeNodes.delete(node.id);r.observers.delete(node.id);for(const[key,owner]of r.proxyOwners)if(owner===node.id)r.observers.delete(key);};
const capabilities=new WeakMap();
function programDefers(program){if(!program)return false;if(capabilities.has(program))return capabilities.get(program);const value=!!program.data?.nodes.some(node=>node.properties.waitForAbort)||[...(program.subtrees?.values()||[])].some(programDefers);capabilities.set(program,value);return value;}

// Sparse state only for a reset currently dispatching, or explicitly awaiting
// abort completion. No timer, polling job or captured world snapshot.
export class BehaviorAborts {
 constructor(runner){this.runner=runner;this.pending=new Map();this.capable=runner.asset.nodes.some(node=>node.properties.waitForAbort)||programDefers(runner.hooks.program);}
 begin(node,m,{task=false,silent=false}={}){const ticket={node,m,task,wait:task&&node.properties.waitForAbort===true&&!silent,initializing:true,retired:false,scopeClosed:false,deferred:false};if(task){m.aborting=true;m.abortDone=false;if(ticket.wait)ticket.scope=m.handle+':abort';}this.pending.set(node.id,ticket);return ticket;}
 ready(ticket){return !ticket.initializing&&(!ticket.task||!ticket.wait||ticket.m.abortDone||this.runner.forceAbortRequested)&&!ticket.m.child?.aborts?.pending.size;}
 async closeScope(ticket){if(!ticket.scope||ticket.scopeClosed)return;ticket.scopeClosed=true;await this.runner.hooks.scopeEnd?.(ticket.scope);}
 async retire(ticket){if(ticket.retired||ticket.retiring)return;ticket.retiring=true;const r=this.runner;let failure,failed=false;try{await this.closeScope(ticket);}catch(error){failed=true;failure=error;}finally{ticket.retired=true;ticket.retiring=false;ticket.m.aborting=false;if(!ticket.initializing)ticket.m.resetting=false;if(this.pending.get(ticket.node.id)===ticket)this.pending.delete(ticket.node.id);cleanupRecord(r,ticket.node,ticket.m);if(ticket.deferred||!r.ticking&&!r.shuttingDown)r.wake=true;}if(failed)throw failure;}
 async force(ticket,{silent=false}={}){if(ticket.retired||ticket.forcing)return;ticket.forcing=true;const errors=[];try{if(ticket.m.child)try{await ticket.m.child.stop({silent,force:true});}catch(error){errors.push(error);}ticket.m.abortDone=true;try{await this.retire(ticket);}catch(error){errors.push(error);}}finally{ticket.forcing=false;}errorsOrThrow(errors,'행동트리 중단 강제 정리 실패');}
 belongs(id,root){const seen=new Set();for(let at=id;at&&!seen.has(at);at=this.runner.parents.get(at)){if(at===root)return true;seen.add(at);}return false;}
 async forceBranch(id,options){const errors=[];for(const ticket of [...this.pending.values()])if(id===undefined||this.belongs(ticket.node.id,id))try{await this.force(ticket,options);}catch(error){errors.push(error);}errorsOrThrow(errors,'행동트리 중단 범위 정리 실패');}
 async finish(handle){const r=this.runner;for(const m of r.memory.values()){
  if(m.aborting&&m.handle===handle&&!m.abortDone){m.abortDone=true;const ticket=[...this.pending.values()].find(t=>t.m===m);if(ticket){await this.closeScope(ticket);if(this.ready(ticket))await this.retire(ticket);}r.wake=true;r.hooks.changed?.();return true;}
  if(m.child&&await m.child.finishAbort(handle)){r.wake=true;return true;}
 }return false;}
 async poll(){const errors=[];for(const ticket of [...this.pending.values()]){if(ticket.initializing||ticket.retired)continue;try{await ticket.m.child?.aborts?.poll();if(this.ready(ticket))await this.retire(ticket);}catch(error){errors.push(error);try{await this.force(ticket);}catch(cleanup){errors.push(cleanup);}}}const r=this.runner;if(!r.running&&!this.pending.size&&r.shutdownDeferred&&!r.resetDepth&&!r.shuttingDown)try{await shutdownBehavior(r,r.stopSilent,{force:true});}catch(error){errors.push(error);}errorsOrThrow(errors,'행동트리 중단 완료 정리 실패');}
 deferredBranch(id){if(!this.capable)return false;const r=this.runner,m=r.memory.get(id);if(m?.aborting||m?.taskActive&&r.nodes.get(id)?.properties.waitForAbort)return true;if(m?.child?.aborts.pending.size)return true;if(m?.child?.aborts?.deferredBranch(m.child.asset.root))return true;return (r.nodes.get(id)?.children||[]).some(child=>this.deferredBranch(child));}
}

export async function resetBehaviorNode(r,id,{silent=false,force=r.forceAbortRequested}={}){
 const node=r.nodes.get(id);if(!node)return;const m=r.memory.get(id),existing=r.aborts.pending.get(id);if(m?.resetting){if(force&&existing)await r.aborts.force(existing,{silent});return;}if(!m&&!node.children.length&&!r.activeNodes.has(id)&&!r.observers.has(id))return;
 if(m)m.resetting=true;const children=node.children.map(child=>[child,r.memory.get(child)]);r.resetDepth++;const errors=[],attempt=async fn=>{try{await fn();}catch(error){errors.push(error);}};let ticket;
 try{
  for(const[child,memory]of children)if(r.memory.get(child)===memory)await attempt(()=>r.reset(child,{silent,force:force||r.forceAbortRequested}));
  if(m?.child)await attempt(()=>m.child.stop({silent,force:force||r.forceAbortRequested}));
  if(m?.taskActive){m.taskActive=false;ticket=r.aborts.begin(node,m,{task:true,silent});await attempt(()=>r.hooks.scopeEnd?.(m.handle));if(ticket.scope)await attempt(()=>r.hooks.scopeBegin?.(ticket.scope));if(r.memory.get(id)===m)r.status[id]='aborting';r.activeNodes.delete(id);await attempt(()=>r.hooks.changed?.());if(!silent)await attempt(()=>r.notify(node.properties.onAbort,node,{phase:'abort',task:m.handle,abortScope:ticket.scope||''},true));}
  if(m?.moving&&!silent)await attempt(()=>r.hooks.cancelMove?.(id));
 }finally{
  if(!silent)await attempt(()=>r.deactivate(node,m));if(!ticket&&m?.child?.aborts.pending.size)ticket=r.aborts.begin(node,m,{silent});
  if(ticket){ticket.initializing=false;if(force||r.forceAbortRequested||errors.length)await attempt(()=>r.aborts.force(ticket,{silent}));else if(r.aborts.ready(ticket))await attempt(()=>r.aborts.retire(ticket));else{ticket.deferred=true;r.activeNodes.delete(id);if(r.memory.get(id)===m)r.status[id]='aborting';}}
  else {cleanupRecord(r,node,m);if(m)m.resetting=false;}
  if(ticket?.retired&&m)m.resetting=false;r.resetDepth--;if(m&&!r.ticking&&!r.shuttingDown)r.wake=true;
 }
 if(errors.length)await attempt(()=>r.aborts.forceBranch(id,{silent}));errorsOrThrow(errors,'행동트리 노드 정리 실패');
}

export async function shutdownBehavior(r,silent=false,{force=true}={}){
 if(force)r.forceAbortRequested=true;if(r.shutdownComplete)return;if(r.shuttingDown){if(force)await r.aborts.forceBranch(undefined,{silent});return;}r.shuttingDown=true;const errors=[];const attempt=async fn=>{try{await fn();}catch(error){errors.push(error);}};
 try{await attempt(()=>r.reset(r.asset.root,{silent,force:force||r.forceAbortRequested}));if(force||r.forceAbortRequested||errors.length)await attempt(()=>r.aborts.forceBranch(undefined,{silent}));}
 finally{if(!r.aborts.pending.size||force||r.forceAbortRequested||errors.length){r.memory.clear();r.activeNodes.clear();r.observers.clear();r.cooldowns.clear();r.serviceTimes.clear();r.aborts.pending.clear();r.shutdownComplete=true;r.shutdownDeferred=false;r.deferredBehaviorResult=undefined;await attempt(()=>r.hooks.changed?.());}else{r.shutdownDeferred=true;r.result='running';}r.shuttingDown=false;}
 errorsOrThrow(errors,'행동트리 종료 정리 실패');
}

export const behaviorAbortContract={assetVersions:[1,2],deferredVersion:2,taskFlag:'waitForAbort?: boolean',operations:['behaviorTaskAbortFinish','behaviorTaskIsAborting','behaviorTaskIsExecuting'],sdk:['hb::AI::FinishAbort','hb::AI::IsTaskAborting','hb::AI::IsTaskExecuting'],authoring:'behavior.task.abort upgrades a task and its document version atomically through revision/dryRun/Undo. False/omitted retains immediate legacy abort.',lifetime:'Cancel executing scope; opt-in abort callback gets separate handle:abort scope. Keep task handle reachable and pause tree transitions until explicit completion. Active ancestor services keep due timing. Forced Stop/replacement/world shutdown/error cancels cleanup scopes immediately.',limits:['native BTTask base classes/instanced node memory','uncooperative callback promises/external rollback','older engines reject v2']};
