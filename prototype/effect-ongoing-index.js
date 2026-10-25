const prefixes=tag=>{const result=[tag];for(let i=tag.indexOf('.');i>=0;i=tag.indexOf('.',i+1))result.push(tag.slice(0,i));return result;};
function add(map,key,index){let values=map.get(key);if(!values)map.set(key,values=new Set());values.add(index);}
// All maps live for one synchronous fixed-point transaction. Mutable assets and
// actors are never put in a persistent dependency cache.
class OngoingTagIndex{
 constructor(base){this.base=base;this.records=new Map();}
 record(object){let row=this.records.get(object);if(row)return row;const counts=new Map(),hierarchy=new Map();for(const tag of new Set(this.base.get(object)||object.tags||[])){counts.set(tag,1);for(const prefix of prefixes(tag))hierarchy.set(prefix,(hierarchy.get(prefix)||0)+1);}row={counts,hierarchy,exactReaders:new Map(),hierarchyReaders:new Map()};this.records.set(object,row);return row;}
 bind(object,rule,index){const row=this.record(object),readers=rule.exact?row.exactReaders:row.hierarchyReaders;for(const kind of ['all','any','none'])for(const tag of rule[kind]||[])add(readers,tag,index);return{row,rule};}
 matches({row,rule}){const counts=rule.exact?row.counts:row.hierarchy,has=tag=>(counts.get(tag)||0)>0;return !(rule.all||[]).some(tag=>!has(tag))&&(!rule.any?.length||rule.any.some(has))&&!(rule.none||[]).some(has);}
 changed(entries,flips,active){const before=new Map();for(const index of flips){const {state,effect}=entries[index],row=this.records.get(state.object);if(!row)continue;let tags=before.get(row);if(!tags)before.set(row,tags=new Map());const delta=active[index]?1:-1;for(const tag of effect.data.grantedTags){if(!tags.has(tag))tags.set(tag,(row.counts.get(tag)||0)>0);const count=(row.counts.get(tag)||0)+delta;if(count)row.counts.set(tag,count);else row.counts.delete(tag);}}
 const dirty=new Set();for(const[row,tags]of before){const hierarchyDelta=new Map();for(const[tag,was]of tags){const now=(row.counts.get(tag)||0)>0;if(was===now)continue;for(const index of row.exactReaders.get(tag)||[])dirty.add(index);for(const prefix of prefixes(tag))hierarchyDelta.set(prefix,(hierarchyDelta.get(prefix)||0)+(now?1:-1));}for(const[tag,delta]of hierarchyDelta){if(!delta)continue;const previous=row.hierarchy.get(tag)||0,next=previous+delta;if(next)row.hierarchy.set(tag,next);else row.hierarchy.delete(tag);if((previous>0)!==(next>0))for(const index of row.hierarchyReaders.get(tag)||[])dirty.add(index);}}
 return dirty;
 }
}
export function solveOngoingActivation(entries,base,resolveRole){
 const index=new OngoingTagIndex(base),conditions=entries.map(({effect},i)=>{const rows=[];for(const role of Object.keys(effect.data.ongoingRequirements)){const object=resolveRole(effect,role);if(!object)return null;rows.push(index.bind(object,effect.data.ongoingRequirements[role],i));}return rows;}),active=entries.map(()=>false),seen=new Set();let pending=new Set(entries.map((_,i)=>i)),evaluations=0,passes=0;
 for(let pass=0;;pass++){
  const flips=[];for(const i of pending){evaluations++;const rows=conditions[i],value=!!rows&&rows.every(row=>index.matches(row));if(value!==active[i])flips.push(i);}if(!flips.length)break;
  for(const i of flips)active[i]=!active[i];const key=active.map(Number).join('');if(seen.has(key)||pass>entries.length*2+2)throw Object.assign(Error('지속 효과 태그 조건이 서로 순환해요. 차단 태그와 부여 태그를 확인하세요.'),{code:'ONGOING_EFFECT_CYCLE'});seen.add(key);passes++;pending=index.changed(entries,flips,active);
 }
 return{active,evaluations,passes};
}