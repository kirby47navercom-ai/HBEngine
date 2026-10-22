import {createAsset} from '../prototype/asset-documents.js';
import {createNativeTypeImportResolver} from '../prototype/native-type-imports.js';
import {makeNode,connect} from '../prototype/blueprint-model.js';
import {configureStructNode} from '../prototype/struct-operations.js';
import {library,statsDefault,owner} from './native-type-asset-1662-fixture.mjs';
export {library,owner};
export const typePath='Assets/Shared.hbtypes.json',reference={version:1,sourceReference:true,typeLibraries:[typePath]};
export function emptyBlueprint(){const bp=createAsset('blueprint','BP_PureTypes');bp.nodes=[];bp.edges=[];bp.components=[];bp.construction={nodes:[],edges:[],comments:[]};return bp;}
export async function pureTypeBlueprint(){
 const root=emptyBlueprint();root.native=await createNativeTypeImportResolver(async()=>JSON.stringify(library))(reference);root.variables=[{id:'stats',name:'Stats',type:'record',structName:'Combat::Stats',container:'single',value:{...statsDefault(),Target:'self'}}];
 const begin=makeNode('beginPlay',20,20),get=makeNode('getVariable',20,180),patch=makeNode('setMembers',260,20),stats=makeNode('breakStruct',260,250),hit=makeNode('breakStruct',520,250),move=makeNode('setPosition',780,20);get.variableId='stats';root.nodes=[begin,get,patch,stats,hit,move];
 for(const[node,structName,members]of [[patch,'Combat::Stats',['Hit']],[stats,'Combat::Stats'],[hit,'Combat::Damage']])configureStructNode(root,root,node.id,{type:'record',structName,...members?{members}:{}});
 patch.inputValues={member_Hit:{Amount:99,Direction:[99,3,2]}};
 for(const[from,p,to,q]of [[begin,'then',patch,'exec'],[get,'value',patch,'value'],[patch,'then',move,'exec'],[get,'value',stats,'value'],[stats,'Hit',hit,'value'],[stats,'Target',move,'target'],[hit,'Direction',move,'position']]){const r=connect(root,{node:from.id,pin:p},{node:to.id,pin:q});if(!r.ok)throw Error(r.reason);}
 root.native=structuredClone(reference);return root;
}
