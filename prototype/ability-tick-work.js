import {periodicEffectCount} from './ability-clock.js';
export const abilityTickFlags=Object.freeze({due:1,cooldown:2,active:4});
// One packed decision per live owner, without arrays or cached mutable flags.
// Owner retirement/ongoing-condition checks remain in AbilitySystem.tick.
export function abilityTickWork(state,time){
 let work=0;if(state.effects.size)for(const effect of state.effects.values())if(effect.end<=time||effect.data.period>0&&periodicEffectCount(effect,Math.min(time,effect.end))>0){work|=abilityTickFlags.due;break;}
 if(state.abilities.size)for(const ability of state.abilities.values()){if(ability.ready>time)work|=abilityTickFlags.cooldown;if(ability.active){work|=abilityTickFlags.active;if(ability.end<=time)work|=abilityTickFlags.due;}}
 return work;
}
export function abilityTickCooldown(state,time){if(state.abilities.size)for(const ability of state.abilities.values())if(ability.ready>time)return true;return false;}
// Clock-only publication follows a completed operation/sync. Reuse only rows
// whose displayed fields are time invariant; every ordinary mutation rebuilds.
export function abilityTickProjection(state,previous,time,clockOnly){
 const cached=clockOnly&&state.tickProjection&&state.tickProjection.debug===previous&&state.tickProjection.effectSource===state.effects&&state.tickProjection.abilitySource===state.abilities?state.tickProjection:null;
 let effectsStatic=true,abilitiesStatic=true;
 const effects=cached?.effectsStatic?previous.effects:[...state.effects.values()].map(effect=>{if(effect.end!==Infinity)effectsStatic=false;return{handle:effect.handle,asset:effect.asset,stacks:effect.stacks,level:effect.level??1,remaining:effect.end===Infinity?-1:Math.max(0,effect.end-time),...(effect.ongoingRefs?{inhibited:!!effect.inhibited}:{})};});
 const abilities=cached?.abilitiesStatic?previous.abilities:Object.fromEntries([...state.abilities].map(([key,ability])=>{const cooldown=Math.max(0,ability.ready-time);if(cooldown>0)abilitiesStatic=false;return[key,{active:ability.active,cooldown}];}));
 return{effects,abilities,effectsStatic,abilitiesStatic,effectSource:state.effects,abilitySource:state.abilities};
}
