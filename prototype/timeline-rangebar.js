import {timelineFPS} from './timeline-rate.js';
import {timelineViewRange,timelineMinimumSpan} from './timeline-view.js';
export const timelineRangebarMarkup='<div class="timeline-rangebar" aria-label="타임라인 표시 범위"><div data-timeline-rangebar tabindex="0"><button data-range-part="body" aria-label="표시 범위 이동"></button><button data-range-part="start" role="slider" aria-label="표시 시작"></button><button data-range-part="end" role="slider" aria-label="표시 끝"></button><i data-range-playhead aria-hidden="true"></i></div></div>';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function changeTimelineRangebar(data,range,part,delta){
 const start=timelineViewRange(data,range),minimum=timelineMinimumSpan(data);if(!Number.isFinite(delta)||!['start','end','body'].includes(part))throw Error('표시 범위 이동을 확인하세요.');
 if(part==='start')return {start:clamp(start.start+delta,0,start.end-minimum),end:start.end};
 if(part==='end')return {start:start.start,end:clamp(start.end+delta,start.start+minimum,data.length)};
 return timelineViewRange(data,{start:start.start+delta,end:start.end+delta});
}
// This control owns view state only. Authored ranges, keys and Undo stay intact.
export function installTimelineRangebar(element,hooks){
 let active=null,rangeKey='',timeKey='';const window=element.ownerDocument.defaultView,body=element.querySelector('[data-range-part="body"]'),head=element.querySelector('[data-range-playhead]'),buttons={start:element.querySelector('[data-range-part="start"]'),end:element.querySelector('[data-range-part="end"]')};
 const update=()=>{
  const data=hooks.data(),range=timelineViewRange(data,hooks.range()),key=[data.length,timelineFPS(data),range.start,range.end].join(':');
  if(key!==rangeKey){rangeKey=key;body.style.left=range.start/data.length*100+'%';body.style.width=(range.end-range.start)/data.length*100+'%';for(const part of ['start','end']){const button=buttons[part],time=range[part];button.style.left=time/data.length*100+'%';button.setAttribute('aria-valuemin',String(part==='start'?0:range.start+timelineMinimumSpan(data)));button.setAttribute('aria-valuemax',String(part==='start'?range.end-timelineMinimumSpan(data):data.length));button.setAttribute('aria-valuenow',String(time));button.title=time.toFixed(3)+' s';}}
  const time=clamp(hooks.time(),0,data.length),nextTime=data.length+':'+time;if(nextTime!==timeKey){timeKey=nextTime;head.style.left=time/data.length*100+'%';}
 };
 const down=event=>{
  if(event.button!==0||active||hooks.busy?.())return;event.preventDefault();event.stopImmediatePropagation();hooks.begin?.();(event.target.closest('[data-range-part]')||element).focus({preventScroll:true});const part=event.target.closest('[data-range-part]')?.dataset.rangePart||'body',data=hooks.data(),start=hooks.range(),rect=element.getBoundingClientRect(),pointer=event.pointerId;
  let base=start;if(!event.target.closest('[data-range-part]')){const middle=clamp((event.clientX-rect.left)/Math.max(1,rect.width),0,1)*data.length,span=start.end-start.start;base=timelineViewRange(data,{start:middle-span/2,end:middle+span/2});hooks.set(base);}
  active={pointer,cancel:()=>finish({type:'pointercancel',pointerId:pointer})};
  const move=next=>{if(next.pointerId!==pointer)return;hooks.set(changeTimelineRangebar(data,base,part,(next.clientX-event.clientX)/Math.max(1,rect.width)*data.length));};
  const finish=next=>{if(!active||next.pointerId!==undefined&&next.pointerId!==pointer)return;active=null;element.removeEventListener('pointermove',move);element.removeEventListener('pointerup',finish);element.removeEventListener('pointercancel',finish);element.removeEventListener('lostpointercapture',finish);window.removeEventListener('blur',blur);window.removeEventListener('keydown',escape,true);if(element.hasPointerCapture(pointer))element.releasePointerCapture(pointer);if(next.type!=='pointerup')hooks.set(start);};
  const blur=()=>finish({type:'pointercancel',pointerId:pointer}),escape=next=>{if(next.key==='Escape'){next.preventDefault();next.stopImmediatePropagation();blur();}};element.addEventListener('pointermove',move);element.addEventListener('pointerup',finish);element.addEventListener('pointercancel',finish);element.addEventListener('lostpointercapture',finish);window.addEventListener('blur',blur);window.addEventListener('keydown',escape,true);element.setPointerCapture(pointer);
 };
 const key=event=>{if(active||hooks.busy?.())return;const data=hooks.data(),range=hooks.range(),part=event.target.dataset.rangePart||'body',amount=event.shiftKey?10:1;let next;if(['ArrowLeft','ArrowRight'].includes(event.key))next=changeTimelineRangebar(data,range,part,(event.key==='ArrowLeft'?-1:1)*(part==='body'?(range.end-range.start)*.1:1/(timelineFPS(data)))*amount);else if(event.key==='Home')next=timelineViewRange(data,{start:0,end:range.end-range.start});else if(event.key==='End')next=timelineViewRange(data,{start:data.length-(range.end-range.start),end:data.length});else return;event.preventDefault();event.stopImmediatePropagation();hooks.set(next);};
 const double=event=>{if(event.button===0&&!hooks.busy?.()){event.preventDefault();event.stopImmediatePropagation();hooks.set({start:0,end:hooks.data().length});}};
 element.addEventListener('pointerdown',down,true);element.addEventListener('keydown',key,true);element.addEventListener('dblclick',double);update();return {update,dispose(){active?.cancel();element.removeEventListener('pointerdown',down,true);element.removeEventListener('keydown',key,true);element.removeEventListener('dblclick',double);}};
}
