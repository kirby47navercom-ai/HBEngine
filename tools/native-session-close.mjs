// Stop only the child owned by this session. Retire its cache lease after the
// process and every already queued RPC have actually finished.
export function closeNativeSession(session){
 if(session.closeJob)return session.closeJob;session.closing=true;
 session.closeJob=(async()=>{
  const child=session.process;
  if(child&&child.exitCode===null&&child.signalCode===null)await new Promise((resolve,reject)=>{let done=false;const finish=error=>{if(done)return;done=true;clearTimeout(timer);child.off('close',closed);error?reject(error):resolve();},closed=()=>finish(),timer=setTimeout(()=>finish(Error('C++ 실행 프로세스 종료 시간 제한 초과')),5000);child.once('close',closed);try{if(!child.kill())finish(Error('C++ 실행 프로세스를 종료하지 못했어요.'));}catch(error){finish(error);}});
  await session.queue?.catch(()=>{});session.lines?.close();session.lines=null;session.process=null;session.requestWorld=session.transportWorld=null;session.spawnContexts?.clear();session.rendererQuery=null;
  const release=session.releaseCache;session.releaseCache=null;await release?.();
 })();return session.closeJob;
}
