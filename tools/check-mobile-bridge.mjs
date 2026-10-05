import assert from 'node:assert/strict';
import {platformBridge} from '../prototype/mobile-player.js';

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
}finally{globalThis.setTimeout=originalSet;globalThis.clearTimeout=originalClear;if(originalNow)Object.defineProperty(performance,'now',originalNow);else delete performance.now;}
console.log('모바일 브리지: 활성 시간 제한·백그라운드 대기·복귀·진행 중 질의·저장·늦은 응답·오류 정리 통과');
