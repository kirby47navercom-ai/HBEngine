// Navigation changes per-document view state only. No authored edits or timers.
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
    if (![1, 2].includes(event.button) || active || hooks.busy?.()) return;
    event.preventDefault(); event.stopImmediatePropagation(); suppressContext = false;
    const start = hooks.range(), pointer = event.pointerId, top = element.scrollTop;
    active = {pointer, moved: false};
    const move = next => {
      if (next.pointerId !== pointer) return;
      const dx = next.clientX - event.clientX, dy = next.clientY - event.clientY;
      if (!active.moved && Math.hypot(dx, dy) < 3) return;
      if (!active.moved) hooks.begin?.(); active.moved = true;
      if (event.button === 2 && event.altKey && event.shiftKey) hooks.zoom(Math.exp(Math.max(-10, Math.min(10, dx * .005))), fraction(event.clientX), start);
      else { const delta = -dx / width() * (start.end - start.start); hooks.set({start: start.start + delta, end: start.end + delta}); element.scrollTop = Math.max(0, top - dy); }
    };
    const finish = next => {
      if (!active || next.pointerId !== undefined && next.pointerId !== pointer) return;
      const moved = active.moved, cancelled = next.type !== 'pointerup'; active = null;
      element.removeEventListener('pointermove', move); element.removeEventListener('pointerup', finish); element.removeEventListener('pointercancel', finish); element.removeEventListener('lostpointercapture', finish); element.ownerDocument.defaultView.removeEventListener('blur', cancel);
      if (element.hasPointerCapture(pointer)) element.releasePointerCapture(pointer);
      if (cancelled && moved) { hooks.set(start); element.scrollTop = top; } suppressContext = !cancelled && moved;
    };
    const cancel = () => finish({type: 'pointercancel', pointerId: pointer}); active.cancel = cancel;
    element.addEventListener('pointermove', move); element.addEventListener('pointerup', finish); element.addEventListener('pointercancel', finish); element.addEventListener('lostpointercapture', finish); element.ownerDocument.defaultView.addEventListener('blur', cancel);
    element.setPointerCapture(pointer);
  };
  element.addEventListener('wheel', wheel, {passive: false}); element.addEventListener('pointerdown', down, true); element.addEventListener('contextmenu', context, true);
  return () => { active?.cancel(); element.removeEventListener('wheel', wheel); element.removeEventListener('pointerdown', down, true); element.removeEventListener('contextmenu', context, true); };
}
