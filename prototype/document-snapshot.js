// History owns these values. Restoring a frame must still clone it before editing.
// Only ordinary JSON-like trees share storage; structuredClone handles other graphs.
const fallback = Symbol('structured-clone');
const plain = value => value && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
// Private history arrays created here retain their own dense index layout.
// Weak ownership adds no lifetime to discarded frames and never skips values.
const ownedDenseArrays = new WeakSet();
const denseArrayThreshold=64;

export function shareDocumentSnapshot(value, previous, {ownedPrevious = false, metrics} = {}) {
  // Optional counters cover this attempted tree walk, not structuredClone's
  // fallback allocations, Object.keys arrays, heap bytes or restoration copies.
  if (metrics) Object.assign(metrics, {visitedObjects: 0, containers: 0, reusedObjects: 0, fallback: false,previousKeyArrays:0,reusedDenseArrayKeys:0});
  const visited = new WeakSet();
  const make = source => {
    if (metrics) metrics.containers++;
    return Array.isArray(source) ? new Array(source.length) : {};
  };
  const put = (target, key, value) => {
    // Keep an authored own __proto__ member as data, never a setter call.
    if (key === '__proto__') Object.defineProperty(target, key, {value, writable: true, enumerable: true, configurable: true});
    else target[key] = value;
  };
  const copy = (source, before) => {
    if (source === null || typeof source !== 'object') {
      if (typeof source === 'function' || typeof source === 'symbol') throw fallback;
      return source;
    }
    if (visited.has(source) || !Array.isArray(source) && !plain(source)) throw fallback;
    visited.add(source);
    if (metrics) metrics.visitedObjects++;
    const array = Array.isArray(source), keys = Object.keys(source);
    const compatible = before !== source && before && typeof before === 'object' && (array ? Array.isArray(before) && source.length === before.length : !Array.isArray(before) && plain(before));
    const denseBefore=compatible&&ownedPrevious&&array&&source.length>=denseArrayThreshold&&ownedDenseArrays.has(before),oldKeys = compatible ? denseBefore?null:Object.keys(before) : [];
    if(metrics&&compatible){if(denseBefore)metrics.reusedDenseArrayKeys++;else metrics.previousKeyArrays++;}
    let same = !!compatible && keys.length === (denseBefore?before.length:oldKeys.length),dense=ownedPrevious&&array&&source.length>=denseArrayThreshold&&keys.length===source.length;
    // Engine-owned history frames contain data properties. Delay the result
    // container until a difference; unchanged branches need no throwaway copy.
    // The public two-argument path retains its previous getter/read behavior.
    let result = same && ownedPrevious ? null : make(source);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i],owned = compatible && Object.hasOwn(before, key), old = owned ? before[key] : undefined,keyMatches=denseBefore?owned&&Number(key)===i:oldKeys[i]===key;
      // A cached frame has only canonical indices. An extra/noncanonical key
      // cannot be its own member, including Proxy-provided key ordering.
      if(dense&&!(denseBefore?keyMatches:key===String(i)))dense=false;
      const next = copy(source[key], old);
      if (!owned || !keyMatches || !Object.is(next, old)) {
        same = false;
        if (!result) {
          result = make(source);
          for (let j = 0; j < i; j++) put(result, keys[j], before[keys[j]]);
        }
      }
      if (result) put(result, key, next);
    }
    if (same && metrics) metrics.reusedObjects++;
    if(!same&&ownedPrevious&&dense)ownedDenseArrays.add(result);
    return same ? before : result;
  };
  try { return copy(value, previous); }
  catch (error) { if (error !== fallback) throw error; if (metrics) metrics.fallback = true; return structuredClone(value); }
}

export function documentHistoryStorage(history, future, {objectBudget = 250000,slotBudget = 2000000} = {}) {
  if (!Number.isInteger(objectBudget) || objectBudget < 1 || objectBudget > 1000000) throw Error('이력 조회 예산은 1~1000000이에요.');
  if (!Number.isInteger(slotBudget) || slotBudget < 1 || slotBudget > 8000000) throw Error('이력 슬롯 조회 예산은 1~8000000이에요.');
  const seen = new WeakSet(), roots = [...history, ...future],stack = [{value:roots,index:roots.length-1,keys:null,root:true}];
  let uniqueObjects = 0, sharedReferences = 0, slots = 0, estimatedPayloadBytes = 0, truncated = false,truncatedBy=null;
  while (stack.length) {
    const frame=stack.at(-1);if(frame.index<0){stack.pop();continue;}
    if(!frame.root&&slots===slotBudget){truncated=true;truncatedBy='slots';break;}
    const key=frame.keys?frame.keys[frame.index--]:frame.index--,value=frame.value[key];
    if(!frame.root){slots++;estimatedPayloadBytes+=8+(Array.isArray(frame.value)?0:String(key).length*2);}
    if (value && typeof value === 'object') {
      if (seen.has(value)) { sharedReferences++; continue; }
      if (uniqueObjects === objectBudget) { truncated = true;truncatedBy='objects'; break; }
      seen.add(value); uniqueObjects++;
      // Owned dense history arrays have only canonical data indices. Walk them
      // lazily instead of materializing every key/value before checking budgets.
      const dense=Array.isArray(value)&&ownedDenseArrays.has(value),keys=dense?null:Object.keys(value);
      stack.push({value,keys,index:(dense?value.length:keys.length)-1,root:false});
    } else if (typeof value === 'string') estimatedPayloadBytes += value.length * 2;
    else if (typeof value === 'number' || typeof value === 'bigint') estimatedPayloadBytes += 8;
    else if (typeof value === 'boolean') estimatedPayloadBytes++;
  }
  return {undo: history.length, redo: future.length, uniqueObjects, sharedReferences, slots, estimatedPayloadBytes, truncated,truncatedBy, objectBudget,slotBudget, readOnly: true, scope: 'Retained history graph payload estimate; lazy container walk bounded by objects and slots. Excludes JS engine/object headers, allocator, file-batch backups and live document. Not measured heap.'};
}
