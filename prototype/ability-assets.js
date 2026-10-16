import {validGameplayTag} from './scene-systems.js';
const num=(v,a=-1e9,b=1e9)=>Number.isFinite(v)&&v>=a&&v<=b;
const name=v=>typeof v==='string'&&/^[\w가-힣 .-]{1,80}$/.test(v);
const list=(v,check,max=256)=>Array.isArray(v)&&v.length<=max&&v.every(check);
const tags=v=>list(v,validGameplayTag,32);
const asset=v=>typeof v==='string'&&/^Assets\/.+\.hb(?:ability|effect)\.json$/.test(v)&&!v.includes('..');
export const abilityAssetTypes={ability:{label:'게임플레이 능력',prefix:'GA_',group:'게임플레이'},effect:{label:'게임플레이 효과',prefix:'GE_',group:'게임플레이'}};
export const abilityAssetSuffix={ability:'.hbability.json',effect:'.hbeffect.json'};
export function createAbilityAsset(kind,name){
  if(kind==='ability')return {version:1,name,cooldown:1,duration:0,costs:[],requiredTags:[],blockedTags:[],grantedTags:[],effects:[],onActivate:'',onEnd:'',cues:[]};
  return {version:1,name,duration:0,period:0,executeOnApply:true,stackLimit:1,stackPolicy:'refresh',modifiers:[{attribute:'Health',operation:'add',magnitude:-10}],grantedTags:[],cues:[]};
}
export function validAbilityAsset(kind,d){
  if(d?.cues!==undefined&&!list(d.cues,c=>validGameplayTag(c?.tag)&&typeof c.event==='string'&&c.event.trim().length>0&&c.event.length<=80&&!/[\x00-\x1f]/.test(c.event)&&(kind==='ability'?['activate','end']:['apply','period','remove']).includes(c.on),128))return false;
  if(d?.version!==1||!name(d.name)||!tags(d.grantedTags)||!(d.duration===-1||num(d.duration,0,86400)))return false;
  if(kind==='effect')return num(d.period,0,86400)&&typeof d.executeOnApply==='boolean'&&Number.isInteger(d.stackLimit)&&num(d.stackLimit,1,10000)&&['refresh','extend','independent','reject'].includes(d.stackPolicy)&&list(d.modifiers,m=>name(m?.attribute)&&['add','multiply','override'].includes(m.operation)&&num(m.magnitude));
  return kind==='ability'&&num(d.cooldown,0,86400)&&list(d.costs,c=>name(c?.attribute)&&num(c.amount,0))&&tags(d.requiredTags)&&tags(d.blockedTags)&&list(d.effects,asset)&&[d.onActivate,d.onEnd].every(v=>typeof v==='string'&&v.length<=80);
}
