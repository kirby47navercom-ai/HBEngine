// Navigation changes per-document view state only. No authored edits or timers.
import {installTimelineTouchNavigation} from './timeline-touch-navigation.js';
export function installTimelineNavigation(element, hooks) {
  let active = null, suppressContext = false;
  const width = () => element.querySelector('.gameplay-ruler>div')?.getBoundingClientRect().width || element.clientWidth || 1;
  const fraction = x => { const rect = element.querySelector('.gameplay-ruler>div')?.getBoundingClientRect() || element.getBoundingClientRect(); return (x - rect.left) / Math.max(1, rect.width); };
  const wheel = event => {
    if (hooks.busy?.()) { if (event.ctrlKey || event.metaKey || event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) event.preventDefault(); return; }
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientHeight : 1;
    if (event.ctrlKey || event.metaKey) { event.preventDefault(); hooks.zoom(Math.exp(Math.max(-1, Math.min(1, event.deltaY * unit * .002))), fraction(event.clientX)); }
    else if (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
      event.preventDefault(); const range = hooks.range(), delta = (event.shiftKey ? event.deltaY + event.deltaX : event.deltaX) * unit / width() * (range.end - range.start);
      hooks.set({start: range.start + delta, end: range.end + delta});
    }
  };
  const context = event => { if (active?.moved || suppressContext) { event.preventDefault(); event.stopImmediatePropagation(); suppressContext = false; } };
  const down = event => {
    const region=event.button===0&&(event.ctrlKey||event.metaKey)&&event.target.closest('.gameplay-ruler>div');
    if ((!region&&![1, 2].includes(event.button)) || event.pointerType==='touch' || active || hooks.busy?.()) return;
    event.preventDefault(); event.stopImmediatePropagation(); suppressContext = false;element.focus({preventScroll:true});
    const start = hooks.range(), pointer = event.pointerId, top = element.scrollTop;
    let overlay;if(region){overlay=element.ownerDocument.createElement('i');overlay.className='timeline-zoom-region';region.append(overlay);}
    active = {pointer, moved: false};
    const move = next => {
      if (next.pointerId !== pointer) return;
      const dx = next.clientX - event.clientX, dy = next.clientY - event.clientY;
      if (!active.moved && Math.hypot(dx, dy) < 3) return;
      if (!active.moved) hooks.begin?.(); active.moved = true;
      if(region){const a=Math.max(0,Math.min(1,fraction(event.clientX))),b=Math.max(0,Math.min(1,fraction(next.clientX)));overlay.style.left=Math.min(a,b)*100+'%';overlay.style.width=Math.abs(b-a)*100+'%';}
      else if (event.button === 2 && event.altKey && event.shiftKey) hooks.zoom(Math.exp(Math.max(-10, Math.min(10, dx * .005))), fraction(event.clientX), start);
      else { const delta = -dx / width() * (start.end - start.start); hooks.set({start: start.start + delta, end: start.end + delta}); element.scrollTop = Math.max(0, top - dy); }
    };
    const finish = next => {
      if (!active || next.pointerId !== undefined && next.pointerId !== pointer) return;
      const moved = active.moved, cancelled = next.type !== 'pointerup'; active = null;
      element.removeEventListener('pointermove', move); element.removeEventListener('pointerup', finish); element.removeEventListener('pointercancel', finish); element.removeEventListener('lostpointercapture', finish); element.ownerDocument.defaultView.removeEventListener('blur', cancel);element.ownerDocument.defaultView.removeEventListener('keydown',escape,true);
      if (element.hasPointerCapture(pointer)) element.releasePointerCapture(pointer);
      overlay?.remove();if(region&&moved&&!cancelled){if(next.clientX<event.clientX)hooks.reset?.();else{const a=Math.max(0,Math.min(1,fraction(event.clientX))),b=Math.max(0,Math.min(1,fraction(next.clientX))),span=start.end-start.start;if(b>a)hooks.set({start:start.start+a*span,end:start.start+b*span});}}
      if (cancelled && moved&&!region) { hooks.set(start); element.scrollTop = top; } suppressContext = !region&&!cancelled && moved;
    };
    const cancel = () => finish({type: 'pointercancel', pointerId: pointer}); active.cancel = cancel;
    const escape=next=>{if(next.key==='Escape'){next.preventDefault();next.stopImmediatePropagation();cancel();}};
    element.addEventListener('pointermove', move); element.addEventListener('pointerup', finish); element.addEventListener('pointercancel', finish); element.addEventListener('lostpointercapture', finish); element.ownerDocument.defaultView.addEventListener('blur', cancel);element.ownerDocument.defaultView.addEventListener('keydown',escape,true);
    element.setPointerCapture(pointer);
  };
  element.addEventListener('wheel', wheel, {passive: false}); element.addEventListener('pointerdown', down, true); element.addEventListener('contextmenu', context, true);
  const disposeTouch=installTimelineTouchNavigation(element,hooks);
  return () => { active?.cancel();disposeTouch(); element.removeEventListener('wheel', wheel); element.removeEventListener('pointerdown', down, true); element.removeEventListener('contextmenu', context, true); };
}
