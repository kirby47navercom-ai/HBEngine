import {calculatedAttributeBase} from './ability-calculations.js';
import {effectAtLevel,effectModifierAtLevel} from './effect-scaling.js';
import {hasLiveEffectInputs} from './effect-magnitude-inputs.js';
const finite=value=>Number.isFinite(value)&&Math.abs(value)<=1e9;
export function liveEffectSource(system,effect){const ref=effect.captureSource,source=ref&&system.owners.get(ref.id);return source&&ref&&source.generation===ref.generation&&source.object.poolActive!==false?source:null;}
export function unregisterLiveEffect(system,target,effect){for(const generation of effect.liveDependencies||[]){const targets=system.liveDependents.get(generation),count=targets?.get(target)||0;if(count<=1)targets?.delete(target);else targets.set(target,count-1);if(targets&&!targets.size)system.liveDependents.delete(generation);}delete effect.liveDependencies;}
function bind(system,target,effect){
 const source=liveEffectSource(system,effect),dependencies=new Set();if(effect.inhibited)return;for(const [index,row]of effect.definition.data.modifiers.entries()){if(effect.data.modifiers[index]?.qualified===false)continue;const input=row.magnitudeSource;if(input?.type==='attribute'&&input.snapshot===false){const owner=input.owner==='target'?target:source;if(owner)dependencies.add(owner.generation);}}
 effect.liveDependencies=[...dependencies];for(const generation of dependencies){let targets=system.liveDependents.get(generation);if(!targets)system.liveDependents.set(generation,targets=new Map());targets.set(target,(targets.get(target)||0)+1);}system.liveTargets.add(target);
}
export function registerLiveEffect(system,target,effect,source){
 unregisterLiveEffect(system,target,effect);
 if(!hasLiveEffectInputs(effect.definition.data)){delete effect.captureSource;return;}
 effect.captureSource={id:source.object.id,generation:source.generation};if(effect.data.period===0)bind(system,target,effect);
}
export function affectedLiveOwners(system,source){const result=new Set([source]),queue=[source];for(let i=0;i<queue.length;i++)for(const target of system.liveDependents.get(queue[i].generation)?.keys()||[])if(!result.has(target)&&system.owners.get(target.object.id)===target){result.add(target);queue.push(target);}return result;}
export function rebuildLiveEffectsIndex(system){system.liveDependents.clear();system.liveTargets.clear();for(const target of system.owners.values())for(const effect of target.effects.values()){delete effect.liveDependencies;if(effect.data.period===0&&effect.captureSource&&!effect.inhibited&&hasLiveEffectInputs(effect.definition.data))bind(system,target,effect);}}
// Resolve only when an attribute/effect changes, never on idle ticks. Numeric
// input snapshots and generation IDs are retained; source actor objects are not.
// All values are prepared before publication so a cycle/overflow rolls back the
// entire initiating operation, including already affected owners and cues.
export function refreshLiveEffects(system,affected=system.liveTargets){
 if(!system.liveTargets.size)return[];
 const entries=[],targets=[];
 for(const target of affected){if(!system.liveTargets.has(target))continue;if(system.owners.get(target.object.id)!==target){system.liveTargets.delete(target);continue;}const effects=[...target.effects.values()].filter(e=>e.data.period===0&&e.captureSource&&!e.inhibited&&hasLiveEffectInputs(e.definition.data));if(!effects.length){system.liveTargets.delete(target);continue;}targets.push(target);for(const effect of effects)entries.push({target,effect});}
 const memo=new Map(),visiting=new Map();
 const read=(state,name,basis)=>{
  let cache=memo.get(state);if(!cache)memo.set(state,cache=new Map());const key=name+'\0'+basis;if(cache.has(key))return cache.get(key);
  let active=visiting.get(state);if(!active)visiting.set(state,active=new Set());if(active.has(key))throw Object.assign(Error('실시간 효과 속성 계산 순환: '+state.object.id+'.'+name),{code:'LIVE_EFFECT_CYCLE'});active.add(key);
  const attribute=state.attributes.get(name);if(!attribute)throw Error('실시간 효과 캡처 속성이 없어요: '+state.object.id+'.'+name);
  const calc=attribute.calculation;let value;
  if(basis==='base')value=calc?calculatedAttributeBase(calc,{base:calc.policy==='current'?0:read(state,calc.attribute,'base'),current:calc.policy==='base'?0:read(state,calc.attribute,'current')},state.curves):attribute.base;
  else{value=read(state,name,'base');for(const effect of state.effects.values())if(effect.data.period===0&&!effect.inhibited){const definition=effect.definition,source=liveEffectSource(system,effect);for(let i=0;i<effect.data.modifiers.length;i++){let modifier=effect.data.modifiers[i];if(modifier.qualified===false||modifier.attribute!==name)continue;const raw=definition?.data.modifiers[i],input=raw?.magnitudeSource;if(input?.type==='attribute'&&input.snapshot===false&&(input.owner==='target'||source)){const inputValue=read(input.owner==='target'?state:source,input.attribute,input.basis);modifier=effectModifierAtLevel(definition,effect.level,raw,i,{...effect.context,attributes:{[i]:inputValue}});}if(modifier.operation==='add')value+=modifier.magnitude*effect.stacks;else if(modifier.operation==='multiply')value*=modifier.magnitude**effect.stacks;else value=modifier.magnitude;}}}
  if(!finite(value))throw Error('실시간 효과 속성 계산 범위 초과: '+state.object.id+'.'+name);value=Math.max(attribute.min,Math.min(attribute.max,value));cache.set(key,value);active.delete(key);return value;
 };
 const prepared=[];for(const{target,effect}of entries){const source=liveEffectSource(system,effect),attributes=[...effect.context.attributes];for(const[index,row]of effect.definition.data.modifiers.entries()){if(effect.data.modifiers[index]?.qualified===false)continue;const input=row.magnitudeSource;if(input?.type==='attribute'&&input.snapshot===false&&(input.owner==='target'||source))attributes[index]=read(input.owner==='target'?target:source,input.attribute,input.basis);}const context={...effect.context,attributes},data=effectAtLevel(effect.definition,effect.level,context);for(const modifier of data.modifiers)if(modifier.qualified!==false)read(target,modifier.attribute,'current');prepared.push({effect,context,data});}
 for(const{effect,context,data}of prepared){effect.context=context;effect.data=data;}for(const target of targets)target.values=null;return targets;
}
