import assert from 'node:assert/strict';
import {DetachedWindows,editorAnimationFrame,cancelEditorAnimationFrame} from '../prototype/detached-window.js';

function frameWindow(now){
  let id=0;const queued=new Map();
  return {closed:false,performance:{now:()=>now},queued,
    requestAnimationFrame(callback){const handle=++id;queued.set(handle,callback);return handle;},
    cancelAnimationFrame(handle){queued.delete(handle);},removeEventListener(){},
    run(){const callbacks=[...queued.values()];queued.clear();for(const callback of callbacks)callback(now);}
  };
}
function manager(owner,children=[]){
  const value=Object.assign(Object.create(DetachedWindows.prototype),{owner,frames:new Map(),items:new Map(children.map((child,i)=>[String(i),{child,ready:true}])),restoreAll(){this.items.clear();}});
  owner.hbEngineDetachedManager=value;return value;
}

const owner=frameWindow(12345),first=frameWindow(400),second=frameWindow(700),closed=frameWindow(800),loading=frameWindow(900);closed.closed=true;
const windows=manager(owner,[first,second,closed]);windows.items.set('loading',{child:loading,ready:false});
let calls=0,time;windows.requestAnimationFrame(value=>{calls++;time=value;});
assert.equal(owner.queued.size,1);assert.equal(first.queued.size,1);assert.equal(second.queued.size,1);
assert.equal(closed.queued.size,0);assert.equal(loading.queued.size,0);
const staleParent=[...owner.queued.values()][0],staleFirst=[...first.queued.values()][0];
// Main and first windows are suspended: only the second native window advances.
second.run();assert.equal(calls,1);assert.equal(time,12345,'모든 자식 창은 부모 performance 시간축을 사용한다');
assert.equal(owner.queued.size,0);assert.equal(first.queued.size,0);assert.equal(second.queued.size,0);assert.equal(windows.frames.size,0);
staleParent(12345);staleFirst(400);assert.equal(calls,1,'이미 전달 큐에 들어간 경쟁 콜백도 중복 실행하지 않는다');

const cancel=windows.requestAnimationFrame(()=>calls++);windows.cancelAnimationFrame(cancel);
assert.equal(owner.queued.size+first.queued.size+second.queued.size,0);assert.equal(windows.frames.size,0);
owner.run();first.run();second.run();assert.equal(calls,1);

second.opener=owner;const moved={ownerDocument:{defaultView:second}};
const movedFrame=editorAnimationFrame(moved,()=>calls++);cancelEditorAnimationFrame(moved,movedFrame);
assert.equal(owner.queued.size+first.queued.size+second.queued.size,0,'DOM 이동 후 에셋 편집기 취소도 전체 창 예약을 제거한다');
windows.requestAnimationFrame(()=>calls++);windows.requestAnimationFrame(()=>calls++);windows.dispose();
assert.equal(owner.queued.size+first.queued.size+second.queued.size,0);assert.equal(windows.frames.size,0);assert.equal(owner.hbEngineDetachedManager,undefined);
owner.run();first.run();second.run();assert.equal(calls,1,'종료된 편집기 재생이 남지 않는다');

const alone=frameWindow(15000),single=manager(alone);single.requestAnimationFrame(()=>calls++);single.dispose();
assert.equal(alone.queued.size,0,'분리 창이 없는 부모 예약도 종료 시 취소한다');alone.run();assert.equal(calls,1);
const restored=frameWindow(19000),element={ownerDocument:{defaultView:restored}},handle=editorAnimationFrame(element,()=>calls++);
cancelEditorAnimationFrame(element,handle);restored.run();assert.equal(calls,1,'manager 없는 창에서는 원래 request/cancelAnimationFrame을 사용한다');
console.log('분리 창 렌더 수명: 활성 둘째 창 진행·부모 시간축·경쟁 중복 방지·이동 후 취소·전체 창 및 단일 창 종료 정리 통과');
