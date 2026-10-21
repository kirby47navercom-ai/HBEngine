export const sequenceTrackLayout = Object.freeze({rowHeight: 46, rulerHeight: 38, overscan: 3, virtualThreshold: 32});

export function sequenceTrackMatches(track, query) {
  const search = query.toLocaleLowerCase();
  return !search || [track.id, track.name, track.type, track.target].some(v => String(v ?? '').toLocaleLowerCase().includes(search));
}

export function sequenceTrackWindow(total, scrollTop, height) {
  const {rowHeight, rulerHeight, overscan, virtualThreshold} = sequenceTrackLayout;
  if (!Number.isInteger(total) || total < 0) throw Error('트랙 행 수를 확인하세요.');
  if (total <= virtualThreshold) return {first: 0, end: total, before: 0, after: 0, total};
  const visible = Math.max(1, Math.ceil(Math.max(0, Number(height) - rulerHeight || 0) / rowHeight));
  const first = Math.min(Math.max(0, total - 1), Math.max(0, Math.floor(Math.max(0, Number(scrollTop) || 0) / rowHeight) - overscan));
  const end = Math.min(total, first + visible + overscan * 2 + 1);
  return {first, end, before: first * rowHeight, after: (total - end) * rowHeight, total};
}

export function readSequenceTracks(data, {offset = 0, limit = 100, query = '', type = '', target} = {}) {
  if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(limit) || limit < 1 || limit > 256) throw Error('트랙 페이지는 offset 0 이상, limit 1~256이에요.');
  if (typeof query !== 'string' || query.length > 1000 || typeof type !== 'string' || type.length > 80 || target !== undefined && typeof target !== 'string') throw Error('트랙 검색 조건을 확인하세요.');
  const rows = [];
  let total = 0;
  for (let index = 0; index < data.tracks.length; index++) {
    const track = data.tracks[index];
    if (type && track.type !== type || target !== undefined && track.target !== target || !sequenceTrackMatches(track, query)) continue;
    if (total >= offset && rows.length < limit) rows.push({index, id: track.id, name: track.name, type: track.type, target: track.target, keys: track.keys.length, clips: track.clips.length});
    total++;
  }
  return {total, offset, limit, items: rows, nextOffset: offset + rows.length < total ? offset + rows.length : null, readOnly: true};
}
