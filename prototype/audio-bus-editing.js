import {validAudioMixer} from './audio-mixer.js';
const unique=(name,used)=>{const root=name.slice(0,72);let result=root,i=2;while(used.has(result))result=root+' '+i++;return result;};
// Pure document edit: validate the complete routing graph before publishing it.
// Removing an input send/sidechain removes that route, rather than introducing
// a second audible route through the parent or retaining a missing bus ID.
export function editMixerBus(data,{operation,bus,id}={}){
 if(!validAudioMixer(data))throw Error('믹서 자료를 확인하세요.');
 const source=data.buses.find(b=>b.id===bus);if(!source||!source.parent)throw Error('하위 오디오 버스를 선택하세요.');
 if(!['duplicate','remove'].includes(operation))throw Error('믹서 버스 작업을 확인하세요.');
 const next=structuredClone(data);let selected;
 if(operation==='remove'){
  next.buses=next.buses.filter(b=>b.id!==bus);
  for(const b of next.buses){if(b.parent===bus)b.parent=source.parent;if(b.sends)b.sends=b.sends.filter(s=>s.bus!==bus);if(b.ducking?.source===bus)delete b.ducking;}
  next.exposed=next.exposed.filter(e=>e.bus!==bus);
  for(const s of next.snapshots){delete s.values[bus];if(s.transitions){delete s.transitions[bus];if(!Object.keys(s.transitions).length)delete s.transitions;}}
  selected=source.parent;
 }else{
  id??=globalThis.crypto.randomUUID();
  if(typeof id!=='string'||!id||id.length>80||next.buses.some(b=>b.id===id))throw Error('새 버스 식별자를 확인하세요.');
  const copy=structuredClone(source);copy.id=id;copy.name=unique(source.name,new Set(next.buses.map(b=>b.name)));next.buses.splice(next.buses.findIndex(b=>b.id===bus)+1,0,copy);
  for(const s of next.snapshots){Object.defineProperty(s.values,id,{value:structuredClone(s.values[bus]),writable:true,enumerable:true,configurable:true});if(s.transitions&&Object.hasOwn(s.transitions,bus))Object.defineProperty(s.transitions,id,{value:structuredClone(s.transitions[bus]),writable:true,enumerable:true,configurable:true});}
  const names=new Set(next.exposed.map(e=>e.name));for(const e of data.exposed.filter(e=>e.bus===bus)){const name=unique(e.name,names);names.add(name);next.exposed.push({...e,name,bus:id});}
  selected=id;
 }
 if(!validAudioMixer(next))throw Error('버스 수·노출 수·신호 경로를 확인하세요.');
 return{data:next,selected};
}
