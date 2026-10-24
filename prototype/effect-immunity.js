import {effectTagRoles,validEffectTagRule,effectTagsMatch} from './effect-tag-requirements.js';
import {hasGameplayTag} from './scene-systems.js';
export const effectImmunityRoles=Object.freeze(['effect',...effectTagRoles]);
export function validEffectImmunity(value){return value===undefined||!!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(role=>effectImmunityRoles.includes(role))&&Object.values(value).every(validEffectTagRule);}
export function effectImmunityMatches(requirements,incoming,application){
 if(!requirements||!effectTagsMatch(requirements,application))return false;const row=requirements.effect;if(!row)return true;const tags=incoming.grantedTags||[],has=tag=>row.exact?tags.includes(tag):hasGameplayTag(tags,tag);
 return !(row.all||[]).some(tag=>!has(tag))&&(!row.any?.length||row.any.some(has))&&!(row.none||[]).some(has);
}
export function editEffectImmunity(data,requirements){
 if(!validEffectImmunity(requirements)||requirements!==undefined&&data.duration===0)throw Error('면역에는 지속 효과와 올바른 태그 조건이 필요해요.');
 if(requirements===undefined)delete data.immunity;else{data.immunity=structuredClone(requirements);data.version=3;}
}
export const effectImmunityContract=Object.freeze({assetVersion:3,field:'effect.immunity',roles:effectImmunityRoles,matching:'Same all/any/none/exact tag rows. effect reads incoming grantedTags (also available on instant definitions); other roles read the incoming apply-time application snapshot. All roles AND. Explicit empty immunity matches every incoming effect.',lifetime:'Only a duration or infinite active effect grants immunity. Evaluated on new applications/refreshes, before numeric captures, arithmetic, stack/timer changes, input/dependency registration and apply cues. Existing effects and level/parameter updates are not retroactively removed.',blocked:'Return the existing empty effect handle. Optional v3 guard cue on=blocked carries effect/incoming asset, immunity/guard asset, guard handle and incoming role snapshot. No installed effect or granted tags from the blocked definition.',authoring:'effect.immunity.edit expectedRevision/dryRun/compact preview; structured editor reuses tag controls and one Undo. Enable upgrades only that asset to v3; remove retains v3; older readers reject v3.',cost:'Scan active target effects on explicit application only, no per-frame tag polling, listener, new task or retained actor reference.',remaining:['dynamic ongoing suppression/removal','network prediction','immunity to attributes beyond incoming tags/context']});
