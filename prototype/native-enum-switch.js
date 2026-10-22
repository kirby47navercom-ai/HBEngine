import {nativeEnumDefinition} from './native-enums.js';
export function configureNativeEnumSwitch(root,graph,nodeId,enumName,view='event'){
 const node=graph.nodes.find(node=>node.id===nodeId),definition=nativeEnumDefinition(root.native,{enumName});
 if(node?.key!=='switchInt'||!definition)throw Error('정수 Switch와 enum 선언이 필요해요.');
 if(root.inheritance?.inherited.nodes.includes(nodeId))throw Error('부모 그래프에서 편집하세요.');
 const values=[...new Set(definition.entries.filter(entry=>!entry.hidden).map(entry=>entry.value))],before=node.flowOutputs||[],cases=node.caseValues||{},next=[],nextCases={};let index=0;
 for(const value of values){let id=before.find(id=>cases[id]===value);if(!id){while(before.includes('out'+index)||next.includes('out'+index))index++;id='out'+index++;}next.push(id);nextCases[id]=value;}
 const kept=new Set(next);graph.edges=graph.edges.filter(edge=>(edge.from.node!==nodeId||edge.from.pin==='default'||kept.has(edge.from.pin))&&(edge.to.node!==nodeId||['exec','selection'].includes(edge.to.pin)));
 if(root.watches)root.watches=root.watches.filter(watch=>watch.node!==nodeId||watch.view!==view||watch.direction==='in'&&['exec','selection'].includes(watch.pin)||watch.direction==='out'&&(watch.pin==='default'||kept.has(watch.pin)));
 node.enumName=definition.name;node.flowOutputs=next;node.caseValues=nextCases;node.inputValues={selection:node.inputValues?.selection??values[0]??0};
 return node;
}
