const kinds=new Set(['sequence','multiGate','switchInt','switchString']);
const exec=(id,label)=>({id,label,type:'exec',array:false});
export const isFlowNode=node=>kinds.has(node?.key);
export const isSwitchNode=node=>['switchInt','switchString'].includes(node?.key);
export const flowOutputIds=node=>node.flowOutputs??(node.key==='sequence'?['first','second']:['out0','out1','out2']);
export const flowCaseId=id=>'case'+id.slice(3);
export function validFlowNode(node){return !!node&&(node.flowOutputs===undefined||isFlowNode(node)&&Array.isArray(node.flowOutputs)&&node.flowOutputs.length<=10000&&(isSwitchNode(node)||node.flowOutputs.length>0)&&new Set(node.flowOutputs).size===node.flowOutputs.length&&node.flowOutputs.every(id=>typeof id==='string'&&(node.key==='sequence'?/^(?:first|second|then[0-9]+)$/:/^out[0-9]+$/).test(id)&&id.length<=40))&&(node.flowHasDefault===undefined||isSwitchNode(node)&&typeof node.flowHasDefault==='boolean');}
export function dynamicFlowPins(node,direction){
 if(!isFlowNode(node)||node.flowOutputs===undefined&&node.flowHasDefault===undefined)return null;
 const ids=flowOutputIds(node),switchNode=isSwitchNode(node),type=node.key==='switchInt'?'int':'string';
 if(direction==='in'){if(node.key==='sequence')return [exec('exec','실행')];if(node.key==='multiGate')return [exec('exec','Enter'),exec('reset','Reset'),{id:'loop',label:'Loop',type:'bool',array:false},{id:'random',label:'Random',type:'bool',array:false},{id:'startIndex',label:'Start index',type:'int',array:false}];return [exec('exec','Enter'),{id:'selection',label:'Selection',type,array:false},...ids.map((id,i)=>({id:flowCaseId(id),label:'Case '+i,type,array:false}))];}
 return [...ids.map((id,i)=>exec(id,switchNode?String(node.inputValues?.[flowCaseId(id)]??'Case '+i):(node.key==='sequence'?'Then ':'Out ')+i)),...(switchNode?(node.flowHasDefault===false?[]:[exec('default','Default')]):node.key==='multiGate'?[{id:'index',label:'Index',type:'int',array:false}]:[])];
}
export function addFlowOutput(graph,nodeId){
 const node=graph.nodes.find(n=>n.id===nodeId);if(!isFlowNode(node))return null;const ids=[...flowOutputIds(node)];if(ids.length>=10000)throw Error('한 이벤트 실행량 10000을 넘는 출력은 추가할 수 없어요.');let index=node.key==='sequence'?2:0;while(ids.includes((node.key==='sequence'?'then':'out')+index))index++;
 const id=(node.key==='sequence'?'then':'out')+index;node.flowOutputs=[...ids,id];if(isSwitchNode(node)){node.inputValues??={};const used=new Set(ids.map(id=>node.inputValues[flowCaseId(id)]));let value=index;while(used.has(node.key==='switchInt'?value:'Case '+value))value++;node.inputValues[flowCaseId(id)]=node.key==='switchInt'?value:'Case '+value;}return id;
}
function prune(graph,nodeId,pins,root,view){graph.edges=graph.edges.filter(e=>!(e.from.node===nodeId&&pins.has(e.from.pin))&&!(e.to.node===nodeId&&pins.has(e.to.pin)));if(root?.watches)root.watches=root.watches.filter(w=>w.node!==nodeId||w.view!==view||!pins.has(w.pin));}
export function removeFlowOutput(graph,nodeId,pinId,root=graph,view='event'){
 const node=graph.nodes.find(n=>n.id===nodeId);if(!isFlowNode(node))return false;const ids=flowOutputIds(node);if(!ids.includes(pinId)||!isSwitchNode(node)&&ids.length===1)return false;node.flowOutputs=ids.filter(id=>id!==pinId);const pins=new Set([pinId]);if(isSwitchNode(node)){pins.add(flowCaseId(pinId));if(node.inputValues)delete node.inputValues[flowCaseId(pinId)];}prune(graph,nodeId,pins,root,view);return true;
}
export function setFlowDefault(graph,nodeId,value,root=graph,view='event'){const node=graph.nodes.find(n=>n.id===nodeId);if(!isSwitchNode(node)||typeof value!=='boolean')return false;node.flowHasDefault=value;if(!value)prune(graph,nodeId,new Set(['default']),root,view);return true;}
