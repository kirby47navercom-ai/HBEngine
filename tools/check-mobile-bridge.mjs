import assert from 'node:assert/strict';
import {platformBridge,connectAndroidChannel} from '../prototype/mobile-player.js';

const originalSet=globalThis.setTimeout,originalClear=globalThis.clearTimeout,originalNow=Object.getOwnPropertyDescriptor(performance,'now');
let now=0,id=0;const timers=new Map(),sent=[];
globalThis.setTimeout=(callback,delay)=>{const key=++id;timers.set(key,{callback,at:now+delay});return key;};globalThis.clearTimeout=key=>timers.delete(key);Object.defineProperty(performance,'now',{value:()=>now,configurable:true});
const advance=ms=>{now+=ms;for(const [key,timer] of [...timers])if(timer.at<=now&&timers.delete(key))timer.callback();};
try{
  const bridge=platformBridge(packet=>sent.push(packet)),first=bridge.request('native',{},async q=>q.value+1);
  advance(4000);bridge.setActive(false);assert.equal(timers.size,0);advance(90000);
  const saved=bridge.request('storageWrite',{});assert.equal(timers.size,0);assert.equal(sent.length,2);
  await bridge.receive({id:'1',queryId:'physics-1',query:{value:3}});assert.deepEqual(sent.at(-1),{operation:'queryReply',id:'physics-1',data:{ok:true,value:4}});
  bridge.setActive(true);assert.equal(timers.size,2);bridge.setActive(true);assert.equal(timers.size,2);
  advance(10000);await bridge.receive({id:'1',data:{ok:true}});assert.deepEqual(await first,{ok:true});
  bridge.setActive(false);advance(60000);bridge.setActive(true);advance(4000);await bridge.receive({id:'2',data:{saved:true}});assert.deepEqual(await saved,{saved:true});assert.equal(timers.size,0);
  const overdue=bridge.request('native',{}),failure=assert.rejects(overdue,/시간 초과/);advance(14999);assert.equal(timers.size,1);advance(1);await failure;assert.equal(timers.size,0);await bridge.receive({id:'3',data:{late:true}});
  const rejected=platformBridge(()=>{throw Error('send failed');});await assert.rejects(rejected.request('native',{}),/send failed/);assert.equal(timers.size,0);
  const replyError=bridge.request('native',{}),replyFailure=assert.rejects(replyError,/native error/);await bridge.receive({id:'4',error:'native error'});await replyFailure;assert.equal(timers.size,0);
  let listener,started=0,closed=0,received;
  const port={start:()=>started++,close:()=>closed++},host={crypto:{randomUUID:()=> '01234567-89ab-cdef-0123-456789abcdef'},location:{origin:'https://hbengine.local'},addEventListener:(type,callback)=>{assert.equal(type,'message');listener=callback;},removeEventListener:(type,callback)=>{assert.equal(type,'message');assert.equal(callback,listener);listener=null;}};
  const handshake={receive:async packet=>{received=packet;},request:async(operation,{nonce})=>{assert.equal(operation,'channel');const event={data:nonce,origin:'',source:null,ports:[port]};for(const change of [{data:'wrong'},{origin:'https://foreign.test'},{source:{}},{ports:[port,port]}])listener({...event,...change});assert.equal(started,0);listener(event);}};
  const connected=await connectAndroidChannel(handshake,host);assert.equal(listener,null);assert.equal(connected.port,port);assert.deepEqual(connected.info,{origin:'',sourceIsWindow:false,sourceNull:true});assert.equal(started,1);port.onmessage({data:'{"id":"test","queryId":"physics","query":{"ray":true}}'});assert.deepEqual(received,{id:'test',queryId:'physics',query:{ray:true}});
  await assert.rejects(connectAndroidChannel({request:async()=>{listener({data:host.crypto.randomUUID(),origin:host.location.origin,source:host,ports:[port]});throw Error('channel failure');}},host),/channel failure/);assert.equal(closed,1);assert.equal(listener,null);
}finally{globalThis.setTimeout=originalSet;globalThis.clearTimeout=originalClear;if(originalNow)Object.defineProperty(performance,'now',originalNow);else delete performance.now;}
console.log('모바일 브리지: 활성 시간·배경/복귀·질의·저장·응답/오류 정리·채널 확인 값/출처/포트 수·실패 정리 통과');
