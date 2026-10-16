import {validAbilityAsset} from './ability-assets.js';
import {hasGameplayTag} from './scene-systems.js';
const finite=v=>Number.isFinite(v)&&Math.abs(v)<=1e9;
const attributeName=v=>typeof v==='string'&&/^[\w가-힣 .-]{1,80}$/.test(v);
// One owner state is shared by native commands, graph nodes and editor-authored assets.
export class AbilitySystem {
  constructor(read){this.read=read;this.owners=new Map();this.time=0;this.serial=0;this.events=[];}
  cue(s,data,phase,args={}){for(const row of data.cues||[])if(row.on===phase)this.events.push({owner:s.object.id,event:row.event,args:{...args,tag:row.tag,phase}});}
  removeEffect(s,handle,reason){const e=s.effects.get(handle);if(!e)return;s.effects.delete(handle);this.cue(s,e.data,'remove',{effect:e.asset,handle,reason});}
  state(o){let s=this.owners.get(o.id);if(!s){s={object:o,attributes:new Map(),effects:new Map(),abilities:new Map(),baseTags:new Set(o.tags||[])};this.owners.set(o.id,s);}return s;}
  async initialize(object,settings,vm){
    if(this.owners.has(object.id))return;
    // Resolve the complete starting set before installing any owner state.
    // Existing projects retain their Health/Mana and single starting ability.
    const set=settings.abilitySet?await this.load(settings.abilitySet,'abilityset'):null,attributes=new Map([['Health',{base:settings.health,min:0,max:settings.health}],['Mana',{base:settings.mana,min:0,max:settings.mana}]]);
    for(const row of set?.attributes||[])attributes.set(row.name,{base:row.base,min:row.min,max:row.max});
    const paths=[...new Set([settings.ability,...set?.abilities||[]].filter(Boolean))],definitions=await Promise.all(paths.map(async path=>[path,await this.load(path,'ability')]));
    if(vm.active===false||vm.object(object.id)!==object||object.poolActive===false||this.owners.has(object.id))return;
    const state=this.state(object);state.attributes=attributes;for(const tag of set?.grantedTags||[])state.baseTags.add(tag);for(const [asset,data]of definitions)state.abilities.set(asset,{asset,data,ready:0,active:false,end:0});this.sync(state);
  }
  tagChange(o,tag,add){const s=this.owners.get(o.id);if(!s)return;if(add)s.baseTags.add(tag);else s.baseTags.delete(tag);this.sync(s);}
  value(s,name){const a=s.attributes.get(name);if(!a)throw Error('등록되지 않은 속성: '+name);let v=a.base;for(const e of s.effects.values())if(e.data.period===0)for(const m of e.data.modifiers)if(m.attribute===name){if(m.operation==='add')v+=m.magnitude*e.stacks;else if(m.operation==='multiply')v*=m.magnitude**e.stacks;else v=m.magnitude;}return Math.max(a.min,Math.min(a.max,v));}
  sync(s){const tags=new Set(s.baseTags);for(const e of s.effects.values())for(const tag of e.data.grantedTags)tags.add(tag);for(const a of s.abilities.values())if(a.active)for(const tag of a.data.grantedTags)tags.add(tag);s.object.tags=[...tags];s.object.gameplayDebug={...s.object.gameplayDebug,ability:{time:this.time,attributes:Object.fromEntries([...s.attributes].map(([k,a])=>[k,{...a,current:this.value(s,k)}])),effects:[...s.effects.values()].map(e=>({handle:e.handle,asset:e.asset,stacks:e.stacks,remaining:e.end===Infinity?-1:Math.max(0,e.end-this.time)})),abilities:Object.fromEntries([...s.abilities].map(([k,a])=>[k,{active:a.active,cooldown:Math.max(0,a.ready-this.time)}]))}};}
  modify(s,mods,stacks=1){const next=new Map([...s.attributes].map(([k,a])=>[k,{...a}]));for(const m of mods){const a=next.get(m.attribute);if(!a)throw Error('효과 속성이 없어요: '+m.attribute);const v=m.operation==='add'?a.base+m.magnitude*stacks:m.operation==='multiply'?a.base*m.magnitude**stacks:m.magnitude;if(!finite(v))throw Error('효과 속성 계산 범위 초과');a.base=Math.max(a.min,Math.min(a.max,v));}s.attributes=next;}
  validateModifiers(s,data){for(const m of data.modifiers)if(!s.attributes.has(m.attribute))throw Error('효과 속성이 없어요: '+m.attribute);}
  apply(s,asset,data){this.validateModifiers(s,data);if(data.duration===0){this.modify(s,data.modifiers);this.cue(s,data,'apply',{effect:asset,handle:'',stacks:1});return '';}
    const matches=[...s.effects.values()].filter(e=>e.asset===asset),prior=matches[0];if(data.stackPolicy==='independent'&&matches.length>=data.stackLimit)return '';let e=prior;
    if(e&&data.stackPolicy==='reject')return '';
    if(!e||data.stackPolicy==='independent'){e={handle:'effect_'+(++this.serial),asset,data,stacks:1,end:data.duration<0?Infinity:this.time+data.duration,next:this.time+data.period};s.effects.set(e.handle,e);}
    else{e.stacks=Math.min(data.stackLimit,e.stacks+1);if(data.stackPolicy==='extend')e.end=data.duration<0?Infinity:e.end+data.duration;else e.end=data.duration<0?Infinity:this.time+data.duration;}
    if(data.period>0&&data.executeOnApply)this.modify(s,data.modifiers,e.stacks);this.cue(s,data,'apply',{effect:asset,handle:e.handle,stacks:e.stacks});return e.handle;
  }
  async load(asset,kind){const d=await this.read(asset);if(!validAbilityAsset(kind,d))throw Error('능력·효과 에셋 검증 실패: '+asset);return structuredClone(d);}
  end(s,a,reason){if(!a.active)return;a.active=false;this.cue(s,a.data,'end',{ability:a.asset,reason});if(a.data.onEnd)this.events.push({owner:s.object.id,event:a.data.onEnd,args:{ability:a.asset,reason}});}
  async operation(key,a,b,vm){if(!key.startsWith('ability')&&!key.startsWith('attribute')&&!key.startsWith('effect'))return undefined;const o=vm.object(a.target===null||a.target===undefined?b.self:a.target,b);if(!o)throw Error('능력 소유 오브젝트가 없어요.');const s=this.state(o);
    if(key==='attributeDefine'){if(!attributeName(a.attribute)||![a.value,a.min,a.max].every(finite)||a.min>a.max||a.value<a.min||a.value>a.max)throw Error('속성 정의 범위 오류');if(s.attributes.has(a.attribute))throw Error('이미 등록된 속성이에요.');s.attributes.set(a.attribute,{base:a.value,min:a.min,max:a.max});}
    else if(key==='attributeSet'){const at=s.attributes.get(a.attribute);if(!at||!finite(a.value))throw Error('속성 이름·값 오류');at.base=Math.max(at.min,Math.min(at.max,a.value));}
    else if(key==='attributeGet')return {return:this.value(s,a.attribute)};
    else if(key==='abilityGrant'){const d=await this.load(a.asset,'ability');if(vm.object(o.id)!==o||vm.active===false||o.poolActive===false||this.owners.get(o.id)!==s)return {}; if(!s.abilities.has(a.asset))s.abilities.set(a.asset,{asset:a.asset,data:d,ready:0,active:false,end:0});}
    else if(key==='abilityActivate'){const entry=s.abilities.get(a.asset);if(!entry)throw Error('먼저 능력을 부여하세요.');const d=entry.data;if(entry.active||entry.ready>this.time||d.requiredTags.some(t=>!hasGameplayTag(o.tags||[],t,false))||d.blockedTags.some(t=>hasGameplayTag(o.tags||[],t,false)))return {return:false};
      const costs=new Map();for(const c of d.costs)costs.set(c.attribute,(costs.get(c.attribute)||0)+c.amount);for(const [k,c] of costs)if(!s.attributes.has(k)||this.value(s,k)<c||s.attributes.get(k).base-s.attributes.get(k).min<c)return {return:false};
      // Resolve and validate every effect before spending anything.
      const effects=await Promise.all(d.effects.map(async path=>[path,await this.load(path,'effect')]));if(vm.object(o.id)!==o||vm.active===false)return {return:false};for(const [,data] of effects)this.validateModifiers(s,data);
      const eventCheckpoint=this.events.length,checkpoint=structuredClone({attributes:s.attributes,effects:s.effects});try{for(const [k,c] of costs){const at=s.attributes.get(k);at.base=Math.max(at.min,at.base-c);}for(const [path,data] of effects)this.apply(s,path,data);for(const k of s.attributes.keys())if(!finite(this.value(s,k)))throw Error('능력 속성 계산 범위 초과');}catch(error){s.attributes=checkpoint.attributes;s.effects=checkpoint.effects;this.events.splice(eventCheckpoint);throw error;}
      entry.ready=this.time+d.cooldown;entry.active=d.duration!==0;entry.end=d.duration<0?Infinity:this.time+d.duration;this.cue(s,d,'activate',{ability:a.asset});if(d.onActivate)this.events.push({owner:o.id,event:d.onActivate,args:{ability:a.asset}});this.sync(s);return {return:true};
    }
    else if(key==='abilityCancel'||key==='abilityRemove'){const entry=s.abilities.get(a.asset);if(entry)this.end(s,entry,'cancelled');if(key==='abilityRemove')s.abilities.delete(a.asset);}
    else if(key==='abilityCooldown')return {return:Math.max(0,(s.abilities.get(a.asset)?.ready||0)-this.time)};
    else if(key==='abilityActive')return {return:!!s.abilities.get(a.asset)?.active};
    else if(key==='effectApply'){const d=await this.load(a.asset,'effect');if(vm.object(o.id)!==o||vm.active===false)return {};const handle=this.apply(s,a.asset,d);this.sync(s);return {return:handle};}
    else if(key==='effectRemove')this.removeEffect(s,a.handle,'removed');
    else if(key==='effectList')return {return:JSON.stringify(o.gameplayDebug?.ability?.effects||[])};
    else throw Error('능력 함수 오류: '+key);this.sync(s);return {};
  }
  async tick(delta,vm){this.time+=delta;for(const [id,s] of this.owners){if(!vm.object(id)||s.object.poolActive===false){this.remove(id);continue;}let dirty=false;for(const [handle,e] of s.effects){const until=Math.min(this.time,e.end);if(e.data.period>0&&e.next<=until){const count=Math.floor((until-e.next)/e.data.period)+1; // Exact catch-up; no lost periodic damage after a long frame.
          const mods=e.data.modifiers.map(m=>m.operation==='add'?{...m,magnitude:m.magnitude*count}:m.operation==='multiply'?{...m,magnitude:m.magnitude**count}:m);this.modify(s,mods,e.stacks);e.next+=count*e.data.period;this.cue(s,e.data,'period',{effect:e.asset,handle:e.handle,count,stacks:e.stacks});dirty=true;}if(e.end<=this.time){this.removeEffect(s,handle,'expired');dirty=true;}}
      for(const a of s.abilities.values())if(a.active&&a.end<=this.time){this.end(s,a,'completed');dirty=true;}const cooldown=[...s.abilities.values()].some(a=>a.ready>this.time);if(dirty||s.effects.size||cooldown||s.cooldown||[...s.abilities.values()].some(a=>a.active))this.sync(s);s.cooldown=cooldown;}
    for(const event of this.events.splice(0)){if(!vm.active||!vm.object(event.owner))continue;for(const b of vm.bindings.filter(b=>b.self===event.owner))await vm.custom(b,event.event,event.args);}
  }
  remove(id){const state=this.owners.get(id);if(state)state.object.tags=[...state.baseTags];this.owners.delete(id);this.events=this.events.filter(e=>e.owner!==id);}
  dispose(){for(const s of this.owners.values())s.object.tags=[...s.baseTags];this.owners.clear();this.events=[];}
}
