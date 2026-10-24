// Store primitive identities/tag snapshots, never actor or owner-state objects.
export function captureEffectApplication(target,source,{instigator=source,causer=source}={}){
 const roles={source,target,instigator,causer},result={};for(const[key,object]of Object.entries(roles)){if(!object||typeof object.id!=='string')throw Error('효과 적용 문맥의 오브젝트를 확인하세요.');result[key]=object.id;result[key+'Tags']=[...(object.tags||[])];}return result;
}
export const copyEffectApplication=context=>context?.application?structuredClone(context.application):undefined;
