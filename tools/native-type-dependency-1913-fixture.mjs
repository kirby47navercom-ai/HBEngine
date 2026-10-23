import {createNativeTypeAsset,compileNativeTypeAsset} from '../prototype/native-type-assets.js';
import {createNativeTypeImportResolver} from '../prototype/native-type-imports.js';
import {nativeSourceReference} from '../prototype/native-model.js';
import {makeNode} from '../prototype/blueprint-model.js';
import {library as original,header as oldHeader,source as oldSource,headerPath,sourcePath,owner,statsDefault} from './native-type-asset-1662-fixture.mjs';
import {pureTypeBlueprint,emptyBlueprint} from './native-type-import-1676-fixture.mjs';
export {headerPath,sourcePath,owner};
export const enumPath='Assets/Types/E_State.hbenum.json',damagePath='Assets/Types/F_Damage.hbstruct.json',statsPath='Assets/Types/F_Stats.hbstruct.json';
export function dependencyFixture1913(){
 const data=structuredClone(original),enumeration={...createNativeTypeAsset('상태'),namespace:'ModeTypes',enums:data.enums,primary:{kind:'enum',id:data.enums[0].id}};
 const damage={...createNativeTypeAsset('피해'),namespace:'DamageTypes',structs:[data.structs[1]],primary:{kind:'struct',id:data.structs[1].id}};
 const stats={...createNativeTypeAsset('능력치'),namespace:'Combat',structs:[data.structs[0]],imports:[enumPath,damagePath],primary:{kind:'struct',id:data.structs[0].id}};
 const libraries=new Map([[enumPath,enumeration],[damagePath,damage],[statsPath,stats]]),built=compileNativeTypeAsset(stats,{libraries}),header=oldHeader.replace(/#include "HBGenerated\/[^\n]+"/, '#include "'+built.path.slice(7)+'"');
 const source=oldSource.replace('static_cast<float>(value.Hit.Amount),3,2','static_cast<float>(value.Hit.Amount),value.Hit.Weight+value.Hits[0].Weight,static_cast<float>(value.Mode)');
 const reference={version:1,sourceReference:true,typeLibraries:[statsPath]},value={...statsDefault(),Target:'Actor_Keep'};value.Hit.Amount=99;
 const pureBlueprint=async()=>{const bp=JSON.parse(JSON.stringify(await pureTypeBlueprint()).replaceAll('Combat::Damage','DamageTypes::Damage'));bp.native=structuredClone(reference);return bp;};
 const cppBlueprint=()=>{const bp=emptyBlueprint();bp.name='BP_CppDependencies';bp.native=nativeSourceReference({header,source,headerPath,sourcePath});bp.settings.parentClass='RecordOwner';const begin=makeNode('beginPlay',20,20),drive=makeNode('nativeCall',300,20);drive.nativeId='RecordOwner.Drive';drive.inputValues={value:structuredClone(value)};bp.nodes=[begin,drive];bp.edges=[{from:{node:begin.id,pin:'then'},to:{node:drive.id,pin:'exec'}}];return bp;};
 const expanded=()=>{const next=structuredClone(damage);next.structs[0].fields.push({id:crypto.randomUUID(),symbol:'Weight',label:'가중치',tooltip:'',type:'float',array:false,readOnly:false,value:2});return next;};
 const metadata=()=>createNativeTypeImportResolver(async p=>JSON.stringify(libraries.get(p)))(reference);
 return {libraries,enumeration,damage,stats,built,header,source,reference,value,pureBlueprint,cppBlueprint,expanded,metadata};
}
