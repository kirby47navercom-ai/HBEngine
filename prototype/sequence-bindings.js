import {loadSceneBindings} from './asset-documents.js';
import {blueprintInstanceDefaults} from './blueprint-overrides.js';
import {recordableRuntimeValues} from './sequence-values.js';
import {makeSequenceTrack} from './gameplay-assets.js';

// Resolve metadata/defaults only. This never constructs a user C++ actor or
// executes a Blueprint. A selected actor is cloned before applying defaults.
export async function sequenceBindingChoices(owner,read,readText){
 if(!owner||owner.sequencePlayback||['component','widget'].includes(owner.kind))throw Error('변수 트랙의 장면 오브젝트를 선택하세요.');
 const object=structuredClone(owner),loaded=await loadSceneBindings([object],read,readText),bindings=loaded.bindings.map(row=>{
  const defaults=blueprintInstanceDefaults(row.root,object),definition=row.root.native?.classes.find(c=>c.name===row.root.settings.parentClass);
  if(definition){object.nativeClass=definition.name;object.nativeProperties=defaults.nativeProperties;}
  return {...row,variables:new Map(Object.entries(defaults.variables))};
 });
 return recordableRuntimeValues(object,bindings).map(row=>structuredClone({...row,target:object.id}));
}
export function appendSequenceBinding(data,target,key,choices,time=0){
 const row=choices.find(r=>r.target===target&&r.key===key);if(!row)throw Error('쓰기 가능한 변수·C++ 속성을 다시 선택하세요.');
 if(!Number.isFinite(time)||time<0||time>data.length)throw Error('시퀀스 키 시간을 확인하세요.');
 if(data.tracks.some(t=>t.target===target&&t.type===row.type&&(row.type==='variable'?t.variable===row.variable:t.className===row.className&&t.property===row.property)))throw Error('이미 연결된 변수 트랙이에요.');
 const track=makeSequenceTrack(row.type);track.target=target;track.name=row.name.slice(0,80);for(const field of ['variable','className','property','valueType','array','structName'])if(row[field]!==undefined)track[field]=row[field];
 track.keys=[{time,value:structuredClone(row.value),interpolation:row.discrete?'step':'linear'}];data.tracks.push(track);return track;
}
