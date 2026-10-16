import {createAsset} from '../prototype/asset-documents.js';
import {makeSceneComponent} from '../prototype/scene-components.js';
import {resolvePrefab} from '../prototype/prefab-variants.js';
import {createPrefabInstance} from '../prototype/prefab-instances.js';
export async function prefab206Fixture(){
 const inner='Assets/PF_Inner206.hbprefab.json',outer='Assets/PF_Outer206.hbprefab.json',variant='Assets/PF_Variant206.hbprefab.json';
 const a=createAsset('prefab','Inner206'),row=(id,parent)=>({...structuredClone(a.objects[0]),id,name:id,kind:'empty',components:[],...(parent?{parent}:{} )});
 a.objects=[row('root'),{...row('body','root'),components:[makeSceneComponent('AIController',{target:'root',speed:3},'ai')]}];
 const b={...createAsset('prefab','Outer206'),objects:[row('root'),{...row('left','root'),nestedPrefab:inner},{...row('right','root'),nestedPrefab:inner}],overrides:[{object:'left/body',path:['components','ai','properties'],value:{...a.objects[1].components[0].properties,speed:4,stoppingDistance:.7}}]};
 const c={...createAsset('prefab','Variant206'),parent:outer,objects:[],overrides:[{object:'left/body',path:['components','ai','properties','speed'],value:5}]};
 const sources=new Map([[inner,a],[outer,b],[variant,c]]),read=async p=>structuredClone(sources.get(p)),resolved=await resolvePrefab(variant,read);let serial=0;
 const objects=createPrefabInstance(variant,{...resolved,dependencies:[variant,outer,inner]},{id:()=> 'world206_'+serial++}),root=objects.find(o=>o.prefabLink),body=objects.find(o=>o.prefabLocalId==='left/body');
 return {inner,outer,variant,sources,read,resolved,objects,root,body,row};
}
