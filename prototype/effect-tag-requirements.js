import {validGameplayTag,hasGameplayTag} from './scene-systems.js';
export const effectTagRoles=Object.freeze(['source','target','instigator','causer']);
const tagList=value=>Array.isArray(value)&&value.length<=32&&value.every(validGameplayTag)&&new Set(value).size===value.length;
export const validEffectTagRule=row=>!!row&&typeof row==='object'&&!Array.isArray(row)&&Object.keys(row).every(key=>['all','any','none','exact'].includes(key))&&['all','any','none'].every(key=>row[key]===undefined||tagList(row[key]))&&(row.exact===undefined||typeof row.exact==='boolean');
export function validEffectTagRequirements(value){
 if(value===undefined)return true;
 return !!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(role=>effectTagRoles.includes(role))&&Object.values(value).every(validEffectTagRule);
}
export function effectTagsMatch(requirements,application){
 if(!requirements)return true;
 for(const role of effectTagRoles){const row=requirements[role];if(!row)continue;const tags=application?.[role+'Tags']||[],has=tag=>row.exact?tags.includes(tag):hasGameplayTag(tags,tag);if((row.all||[]).some(tag=>!has(tag))||row.any?.length&&!row.any.some(has)||(row.none||[]).some(has))return false;}
 return true;
}
export function editEffectTagRequirements(data,index,requirements){
 if(index!==null&&(!Number.isInteger(index)||!data.modifiers[index]))throw Error('효과 변경 항목을 선택하세요.');
 if(!validEffectTagRequirements(requirements))throw Error('효과 태그 조건을 확인하세요.');
 const owner=index===null?data:data.modifiers[index],key=index===null?'applicationRequirements':'tagRequirements';
 if(requirements===undefined)delete owner[key];else{owner[key]=structuredClone(requirements);data.version=Math.max(data.version,2);}
}

export const effectTagRequirementsContract={assetVersions:[1,2,3,4],requirementsVersion:2,application:'effect.applicationRequirements',modifier:'effect.modifiers[i].tagRequirements',roles:effectTagRoles,fields:['all?: string[]','any?: string[]','none?: string[]','exact?: boolean'],semantics:'All roles AND; all tags required, any empty is unrestricted, none blocks. Hierarchical gameplay tags by default; exact true compares full tags.',capture:'Primitive apply-time role tag snapshots; no ongoing tag listener. Stack refresh recaptures; level/parameter/live numeric changes retain the captured decision. Unqualified rows retain original indices, skip arithmetic/input reads/dependency edges, including override.',authoring:'effect.tags.edit uses existing revision/dryRun/Undo; enabling requirements upgrades to v2 atomically. Removal retains v2; explicit downgrade to v1 only when all requirements removed.',inspection:'runtime.effect copied per-modifier qualified/tagRequirements and applicationRequirements.',limits:['ongoing requirements have a separate v4 contract; immunity v3','network prediction','per-pulse historical input reconstruction','older engines reject unsupported v2/v3/v4']};
