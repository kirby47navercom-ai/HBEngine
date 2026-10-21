// History owns these values. Restoring a frame must still clone it before editing.
// Only ordinary JSON-like trees share storage; structuredClone handles other graphs.
const fallback = Symbol('structured-clone');
const plain = value => value && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);

export function shareDocumentSnapshot(value, previous) {
  const visited = new WeakSet();
  const copy = (source, before) => {
    if (source === null || typeof source !== 'object') {
      if (typeof source === 'function' || typeof source === 'symbol') throw fallback;
      return source;
    }
    if (visited.has(source) || !Array.isArray(source) && !plain(source)) throw fallback;
    visited.add(source);
    const array = Array.isArray(source), keys = Object.keys(source);
    const compatible = before !== source && before && typeof before === 'object' && (array ? Array.isArray(before) && source.length === before.length : !Array.isArray(before) && plain(before));
    const oldKeys = compatible ? Object.keys(before) : [];
    let same = !!compatible && keys.length === oldKeys.length;
    const result = array ? new Array(source.length) : {};
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i], owned = compatible && Object.hasOwn(before, key), old = owned ? before[key] : undefined;
      const next = copy(source[key], old);
      if (!owned || oldKeys[i] !== key || !Object.is(next, old)) same = false;
      // An authored own __proto__ member must remain data, never a setter call.
      if (key === '__proto__') Object.defineProperty(result, key, {value: next, writable: true, enumerable: true, configurable: true});
      else result[key] = next;
    }
    return same ? before : result;
  };
  try { return copy(value, previous); }
  catch (error) { if (error !== fallback) throw error; return structuredClone(value); }
}

export function documentHistoryStorage(history, future, {objectBudget = 250000} = {}) {
  if (!Number.isInteger(objectBudget) || objectBudget < 1 || objectBudget > 1000000) throw Error('이력 조회 예산은 1~1000000이에요.');
  const seen = new WeakSet(), stack = [...history, ...future];
  let uniqueObjects = 0, sharedReferences = 0, slots = 0, estimatedPayloadBytes = 0, truncated = false;
  while (stack.length) {
    const value = stack.pop();
    if (value && typeof value === 'object') {
      if (seen.has(value)) { sharedReferences++; continue; }
      if (uniqueObjects === objectBudget) { truncated = true; break; }
      seen.add(value); uniqueObjects++;
      for (const key of Object.keys(value)) { slots++; estimatedPayloadBytes += 8 + (Array.isArray(value) ? 0 : key.length * 2); stack.push(value[key]); }
    } else if (typeof value === 'string') estimatedPayloadBytes += value.length * 2;
    else if (typeof value === 'number' || typeof value === 'bigint') estimatedPayloadBytes += 8;
    else if (typeof value === 'boolean') estimatedPayloadBytes++;
  }
  return {undo: history.length, redo: future.length, uniqueObjects, sharedReferences, slots, estimatedPayloadBytes, truncated, objectBudget, readOnly: true, scope: 'Retained history graph payload estimate; excludes JS engine/object headers, allocator, file-batch backups and live document. Not measured heap.'};
}
