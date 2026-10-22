const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const timelineMinimumSpan = data => Math.min(data.length, 1 / Math.max(1, data.fps || 60));

export function timelineViewRange(data, value) {
  const length = data.length;
  if (!value || !Number.isFinite(value.start) || !Number.isFinite(value.end) || value.end <= value.start) return {start: 0, end: length};
  const span = clamp(value.end - value.start, timelineMinimumSpan(data), length), start = clamp(value.start, 0, length - span);
  return {start, end: start + span};
}
export function validateTimelineRange(data, value) {
  if (!value || !Number.isFinite(value.start) || !Number.isFinite(value.end) || value.start < 0 || value.end > data.length || value.end <= value.start) throw Error('표시 범위는 문서 안의 유한한 시작 < 끝이에요.');
  return timelineViewRange(data, value);
}
export function zoomTimelineRange(data, range, factor, pivot = .5) {
  if (!Number.isFinite(factor) || factor <= 0 || !Number.isFinite(pivot)) throw Error('타임라인 확대 배율·기준점을 확인하세요.');
  const before = timelineViewRange(data, range), old = before.end - before.start, span = clamp(old * factor, timelineMinimumSpan(data), data.length), start = before.start + (old - span) * clamp(pivot, 0, 1);
  return timelineViewRange(data, {start, end: start + span});
}
export const timelineFraction = (time, range) => (time - range.start) / (range.end - range.start);
export const timelineTimeAt = (fraction, range) => range.start + fraction * (range.end - range.start);
export const timelineIntervalVisible = (start, duration, range) => start <= range.end && start + Math.max(0, duration || 0) >= range.start;
export function timelineSegmentGeometry(item, range) {
  const duration = item.duration || 0, end = item.start + duration;
  return {left: timelineFraction(duration ? Math.max(range.start, item.start) : item.start, range) * 100,
    width: duration ? Math.max(0, Math.min(end, range.end) - Math.max(item.start, range.start)) / (range.end - range.start) * 100 : null,
    clippedStart: duration > 0 && item.start < range.start, clippedEnd: duration > 0 && end > range.end};
}
export function timelineRulerTicks(data, range, width = 800, frames = false) {
  const scale = frames ? data.fps || 60 : 1, start = range.start * scale, end = range.end * scale, raw = (end - start) / Math.max(2, Math.min(20, Math.floor(width / 80))), power = 10 ** Math.floor(Math.log10(raw)), ratio = raw / power;
  const step = Math.max(frames ? 1 : Number.MIN_VALUE, (ratio <= 1 ? 1 : ratio <= 2 ? 2 : ratio <= 5 ? 5 : 10) * power), digits = Math.max(0, Math.min(9, -Math.floor(Math.log10(step)))), ticks = [];
  for (let i = Math.ceil(start / step - 1e-9); i * step <= end + step * 1e-9 && ticks.length < 32; i++) {
    const value = i * step; ticks.push({left: timelineFraction(value / scale, range) * 100, label: frames ? String(Math.round(value)) : Number(value.toFixed(digits)).toString()});
  }
  return ticks;
}

export function timelineSelectionBounds(kind, data, selection) {
  let low = Infinity, high = -Infinity;
  const add = (start, duration = 0) => { if (Number.isFinite(start)) { low = Math.min(low, start); high = Math.max(high, start + duration); } };
  if (kind === 'montage') {
    for (const section of data.sections) if (selection === 'sections' || selection === section.id) add(section.time);
    for (const notify of data.notifies) if (selection === 'notifies' || selection === notify.id) add(notify.time);
    for (const notify of data.notifyStates || []) if (selection === 'notify-state:' + notify.id || selection === notify.id) add(notify.time, notify.duration);
    for (const clip of data.clips) if (selection === 'slot:' + clip.slot || selection === clip.id) add(clip.start, clip.duration);
  } else {
    for (const track of data.tracks) {
      if (selection === track.id) { for (const key of track.keys) add(key.time); for (const clip of track.clips) add(clip.start, clip.duration); }
      else if (typeof selection === 'string' && selection.startsWith(track.id + ':')) {
        const suffix = selection.slice(track.id.length + 1), index = Number(suffix);
        if (String(index) === suffix && Number.isSafeInteger(index) && index >= 0 && index < track.keys.length) add(track.keys[index].time);
      }
      for (const clip of track.clips) if (selection === clip.id) add(clip.start, clip.duration);
    }
    for (const section of data.sections || []) if (selection === section.id || selection === 'section-row:' + section.kind + ':' + section.row) add(section.start, section.duration);
  }
  return low <= high ? {start: low, end: high} : null;
}
export function frameTimelineSelection(data, bounds) {
  if (!bounds) return {start: 0, end: data.length};
  const span = Math.max(bounds.end - bounds.start, timelineMinimumSpan(data) * 10), start = (bounds.start + bounds.end - span * 1.2) / 2;
  return timelineViewRange(data, {start, end: start + span * 1.2});
}
