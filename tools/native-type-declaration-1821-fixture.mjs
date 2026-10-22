import {reconcileNativeTypeDefaults} from '../prototype/native-type-defaults.js';
import {library,header as oldHeader,source as oldSource,headerPath,sourcePath,owner,statsDefault} from './native-type-asset-1662-fixture.mjs';
import {createAsset} from '../prototype/asset-documents.js';
import {compileNativeTypeAsset} from '../prototype/native-type-assets.js';
import {pureTypeBlueprint,emptyBlueprint} from './native-type-import-1676-fixture.mjs';
import {makeNode} from '../prototype/blueprint-model.js';
import {nativeSourceReference} from '../prototype/native-model.js';
export {owner,headerPath,sourcePath,emptyBlueprint};
export const structPath='Assets/F_Stats.hbstruct.json',enumPath='Assets/E_Mode.hbenum.json';
export const structure={...structuredClone(library),primary:{kind:'struct',id:library.structs.find(d=>d.symbol==='Stats').id}};
export const enumeration=createAsset('enumasset','E_Mode');enumeration.namespace='Controls';enumeration.enums[0].entries.push({id:crypto.randomUUID(),symbol:'Attack',label:'공격',tooltip:'',value:37,hidden:false});
export const structBuilt=compileNativeTypeAsset(structure),enumBuilt=compileNativeTypeAsset(enumeration);
export const header=oldHeader.replace('#pragma once\n','#pragma once\n#include "'+enumBuilt.path.slice(7)+'"\n');
export const source=oldSource.replace('static_cast<float>(value.Hit.Amount),3,2','static_cast<float>(value.Hit.Amount),value.Hit.Weight+value.Hits[0].Weight,static_cast<float>(Controls::E_Mode::Attack)');
export const reference={version:1,sourceReference:true,typeLibraries:[structPath,enumPath]};
export async function pureBlueprint(){const bp=await pureTypeBlueprint();bp.native=structuredClone(reference);bp.variables.push({id:'mode',name:'Mode',type:'int',enumName:'Controls::E_Mode',container:'single',value:0});const set=makeNode('setVariable',20,450);set.variableId='mode';set.inputValues={value:37};const first=bp.edges.find(e=>e.from.node===bp.nodes.find(n=>n.key==='beginPlay').id);const destination=structuredClone(first.to);first.to={node:set.id,pin:'exec'};bp.nodes.push(set);bp.edges.push({from:{node:set.id,pin:'then'},to:destination});return bp;}
export function cppBlueprint(){
 const bp=emptyBlueprint();bp.name='BP_CppDeclaration';bp.native=nativeSourceReference({header,source,headerPath,sourcePath});bp.settings.parentClass='RecordOwner';
 const begin=makeNode('beginPlay',20,20),drive=makeNode('nativeCall',300,20);drive.nativeId='RecordOwner.Drive';drive.inputValues={value:{...statsDefault(),Hit:{Amount:99,Direction:[1,2,3]},Target:'Actor_Keep'}};
 bp.nodes=[begin,drive];bp.edges=[{from:{node:begin.id,pin:'then'},to:{node:drive.id,pin:'exec'}}];return bp;
}
export function appendedStructure(before=structure){const next=structuredClone(before);next.structs.find(d=>d.symbol==='Damage').fields.push({id:crypto.randomUUID(),symbol:'Weight',label:'가중치',tooltip:'',type:'float',array:false,readOnly:false,value:2});return reconcileNativeTypeDefaults(before,next);}
