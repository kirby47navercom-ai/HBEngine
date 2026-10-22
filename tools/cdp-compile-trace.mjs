import {createHash} from 'node:crypto';
// Only the unique port returned by an owned editorWindowProbe is accepted by
// callers. Never attach to a user's browser or enable process-wide tracing.
export async function compileTrace(port){
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('owned CDP port required');
 const version=await(await fetch('http://127.0.0.1:'+port+'/json/version',{signal:AbortSignal.timeout(5000)})).json(),endpoint=new URL(version.webSocketDebuggerUrl);
 if(!['127.0.0.1','localhost'].includes(endpoint.hostname)||Number(endpoint.port)!==port||endpoint.protocol!=='ws:')throw Error('CDP endpoint escaped owned port');
 const socket=new WebSocket(endpoint),pending=new Map();let serial=0,complete,started=false,closed=false;
 const fail=error=>{for(const p of pending.values()){clearTimeout(p.timer);p.reject(error);}pending.clear();if(complete){clearTimeout(complete.timer);complete.reject(error);complete=null;}};
 socket.onmessage=({data})=>{const m=JSON.parse(data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}}else if(m.method==='Tracing.tracingComplete'&&complete){const p=complete;complete=null;clearTimeout(p.timer);p.resolve(m.params);}};
 socket.onclose=()=>fail(Error('owned trace connection closed'));socket.onerror=()=>fail(Error('owned trace connection failed'));
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{socket.close();reject(Error('owned trace connect timeout'));},5000);socket.onopen=()=>{clearTimeout(timer);resolve();};socket.onerror=()=>{clearTimeout(timer);reject(Error('owned trace connect failed'));};});
 const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial,timer=setTimeout(()=>{pending.delete(id);reject(Error('trace CDP timeout '+method));},20000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));});
 const close=async()=>{if(closed)return;closed=true;if(started)await call('Tracing.end').catch(()=>{});socket.close();fail(Error('owned trace finished'));};
 try{const browser=await call('Browser.getVersion'),categories=(await call('Tracing.getCategories')).categories;await call('Tracing.start',{categories:'-*,gpu.angle',transferMode:'ReturnAsStream',streamFormat:'json'});started=true;
  return{browser,categories:categories.filter(c=>/angle|shader/i.test(c)),close,finish:async()=>{if(!started)throw Error('trace not started');const done=new Promise((resolve,reject)=>{complete={resolve,reject,timer:setTimeout(()=>{complete=null;reject(Error('trace completion timeout'));},20000)};});done.catch(()=>{});await call('Tracing.end');started=false;const result=await done;if(result.dataLossOccurred){if(result.stream)await call('IO.close',{handle:result.stream}).catch(()=>{});throw Error('trace buffer lost events');}if(!result.stream)throw Error('trace stream unavailable');let bytes=0,chunks=[];
   try{while(true){const r=await call('IO.read',{handle:result.stream,size:262144}),b=Buffer.from(r.data,r.base64Encoded?'base64':'utf8');bytes+=b.length;if(bytes>16777216)throw Error('trace exceeds 16 MiB');chunks.push(b);if(r.eof)break;}}finally{await call('IO.close',{handle:result.stream}).catch(()=>{});}
   const raw=Buffer.concat(chunks),parsed=JSON.parse(raw),events=parsed.traceEvents;if(!Array.isArray(events))throw Error('trace events unavailable');const digest=s=>createHash('sha256').update(s).digest('hex');return{raw,bytes,sha256:digest(raw),events:events.map(e=>{const source=e.args?.source;return{cat:e.cat,name:e.name,ph:e.ph,ts:e.ts,dur:e.dur,pid:e.pid,tid:e.tid,...typeof source==='string'?{sourceBytes:Buffer.byteLength(source),sourceSHA256:digest(source)}:{}};})};}};
 }catch(error){await close();throw error;}
}
