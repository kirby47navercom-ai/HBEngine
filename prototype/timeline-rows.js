import {sequenceTrackMatches} from './sequence-track-window.js';

// Per-render row descriptions hold authored items by reference. Presentation
// copies and key-density samples are built only for rows entering the viewport.
export function timelineRows(kind, data, {query = '', keyItems = () => [], visible = () => true} = {}) {
  if (!['sequenceasset', 'montage'].includes(kind)) throw Error('시퀀스·몽타주 문서가 필요해요.');
  if (typeof query !== 'string' || query.length > 1000) throw Error('행 검색어를 확인하세요.');
  const rows = [];
  const row = (id, name, type, source, items, extra = {}) => ({id, name, type, count: source.length, items,
    contains: selection => selection === id || source.some(item => item.id === selection), ...extra});
  if (kind === 'montage') {
    rows.push(row('sections', 'Sections', 'sections', data.sections, () => data.sections.filter(visible).map(s => ({...s, start: s.time, duration: 0}))));
    const slots = new Map();
    for (const clip of data.clips) {
      if (!slots.has(clip.slot)) slots.set(clip.slot, []);
      slots.get(clip.slot).push(clip);
    }
    for (const [slot, clips] of slots) rows.push(row('slot:' + slot, slot, 'slot', clips, () => clips.filter(visible), {slot, clips: clips.length}));
    rows.push(row('notifies', 'Notifies', 'notifies', data.notifies, () => data.notifies.filter(visible).map(n => ({...n, name: n.event, start: n.time, duration: 0}))));
    for (const notify of data.notifyStates || []) rows.push(row('notify-state:' + notify.id, notify.name, 'notify-state', [notify], () => visible(notify) ? [{...notify, start: notify.time, notifyState: true}] : [], {defaultSelection: notify.id}));
  } else {
    for (const track of data.tracks) rows.push(row(track.id, track.name, track.type, track.clips, () => [...track.clips.filter(visible), ...keyItems(track)], {
      target: track.target, keys: track.keys.length, clips: track.clips.length, count: track.keys.length + track.clips.length,
      contains: selection => {
        const suffix = typeof selection === 'string' && selection.startsWith(track.id + ':') ? selection.slice(track.id.length + 1) : '', index = Number(suffix);
        return selection === track.id || suffix !== '' && String(index) === suffix && Number.isSafeInteger(index) && index >= 0 && index < track.keys.length || track.clips.some(clip => clip.id === selection);
      }
    }));
    const sections = new Map();
    for (const section of data.sections || []) {
      const group = section.kind + ':' + section.row;
      if (!sections.has(group)) sections.set(group, []);
      sections.get(group).push(section);
    }
    for (const group of [...sections.keys()].sort()) {
      const source = sections.get(group);
      rows.push(row('section-row:' + group, (group.startsWith('shot:') ? 'Shots ' : 'Sub-Sequences ') + group.split(':')[1], group.split(':')[0], source,
        () => source.filter(visible).map(section => ({...section, clip: section.asset, notifyState: true, section: true}))));
    }
  }
  return rows.map((value, index) => ({...value, index})).filter(item => sequenceTrackMatches(item, query));
}

export function timelineRowContains(row, selection) { return !!row.contains?.(selection); }

export function readTimelineRows(rows, {offset = 0, limit = 100} = {}) {
  if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(limit) || limit < 1 || limit > 256) throw Error('타임라인 행 페이지는 offset 0 이상, limit 1~256이에요.');
  const items = rows.slice(offset, offset + limit).map(({index, id, name, type, target, count, keys, clips}) => ({index, id, name, type, ...(target === undefined ? {} : {target}), count, ...(keys === undefined ? {} : {keys}), ...(clips === undefined ? {} : {clips})}));
  return {total: rows.length, offset, limit, items, nextOffset: offset + items.length < rows.length ? offset + items.length : null, readOnly: true};
}

export function timelineRowSelection(rows, {row, item} = {}) {
  if (typeof row !== 'string' || item !== undefined && typeof item !== 'string') throw Error('타임라인 행·항목 ID를 확인하세요.');
  const index = rows.findIndex(value => value.id === row);
  if (index < 0 || item !== undefined && !timelineRowContains(rows[index], item)) throw Error('타임라인 행·항목을 찾을 수 없어요.');
  return {row, index, selection: item ?? rows[index].defaultSelection ?? row};
}
