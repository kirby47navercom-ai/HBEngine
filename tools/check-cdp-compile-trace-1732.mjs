import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {compileTrace} from './cdp-compile-trace.mjs';
const oldFetch=globalThis.fetch,oldSocket=globalThis.WebSocket;let scenario,rows=[];
class Socket{
 constructor(){this.closed=false;queueMicrotask(()=>this.onopen?.());}
 send(text){const m=JSON.parse(text);rows.push(m.method);let result={};if(m.method==='Browser.getVersion')result={product:'owned-test'};if(m.method==='Tracing.getCategories')result={categories:[]};if(m.method==='IO.read')result={data:Buffer.from(scenario.raw).toString('base64'),base64Encoded:true,eof:true};queueMicrotask(()=>{this.onmessage?.({data:JSON.stringify({id:m.id,result})});if(m.method==='Tracing.end')this.onmessage?.({data:JSON.stringify({method:'Tracing.tracingComplete',params:{stream:'owned',dataLossOccurred:!!scenario.loss}})});});}
 close(){if(this.closed)return;this.closed=true;rows.push('socket.close');this.onclose?.();}
}
try{
 globalThis.WebSocket=Socket;globalThis.fetch=async()=>({json:async()=>({webSocketDebuggerUrl:'ws://127.0.0.1:12345/devtools/browser/owned'})});
 scenario={raw:JSON.stringify({traceEvents:[{cat:'gpu.angle',name:'D3DCompile',ph:'X',ts:10,dur:1000,args:{source:'owned shader'}}]})};let trace=await compileTrace(12345),r=await trace.finish();assert.equal(r.events.length,1);assert.equal(r.events[0].sourceBytes,12);assert(!JSON.stringify(r.events).includes('owned shader'));await trace.close();assert.equal(rows.filter(x=>x==='IO.close').length,1);assert.equal(rows.filter(x=>x==='socket.close').length,1);assert.deepEqual(trace.categories,[]);
 for(const bad of [{raw:'{bad json'},{raw:'x'.repeat(16777217)},{raw:'{}',loss:true}]){scenario=bad;rows=[];trace=await compileTrace(12345);await assert.rejects(()=>trace.finish());await trace.close();assert.equal(rows.filter(x=>x==='IO.close').length,1);assert.equal(rows.filter(x=>x==='socket.close').length,1);}
 globalThis.fetch=async()=>({json:async()=>({webSocketDebuggerUrl:'ws://example.com:12345/devtools/browser/unowned'})});await assert.rejects(()=>compileTrace(12345),/escaped/);await assert.rejects(()=>compileTrace(0),/port/);
}finally{globalThis.fetch=oldFetch;globalThis.WebSocket=oldSocket;}
const report={passed:true,base64StreamAndEarlyComplete:true,sourceSummarizedByHash:true,malformedJSONAnd16MiBCap:true,dataLossRejected:true,streamAndSocketReleased:true,endpointPortGuard:true,scope:'Protocol-double failure/ownership gates only; actual ANGLE/D3D timing is the isolated1728 window report.'};await fs.writeFile('native/build/cdp-compile-trace-1732.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
