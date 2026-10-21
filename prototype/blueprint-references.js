import {basePins,fieldsFor} from './blueprint-model.js';
const copy=value=>structuredClone(value);
function childReference(parent,key,type,array=false){return {type,array,get:()=>parent.get()?.[key],set:value=>{const root=copy(parent.get());root[key]=copy(value);parent.set(root);}};}
// Only declared storage and reference-preserving nodes can be written through.
export async function inputReference(vm,node,pin,frame,seen=new Set()){
 const edge=frame.g.edges.find(e=>e.to.node===node.id&&e.to.pin===pin);if(!edge)return null;
 const source=frame.g.nodes.find(n=>n.id===edge.from.node),[base,...path]=edge.from.pin.split('.'),key=source?.id+':'+edge.from.pin;if(!source||seen.has(key))return null;seen=new Set([...seen,key]);let ref;
 if(source.key==='getVariable'&&base==='value'){const v=frame.g.variables.find(v=>v.id===source.variableId);if(v)ref={type:v.type,array:v.container==='array',get:()=>frame.b.variables.get(v.id),set:value=>frame.b.variables.set(v.id,copy(value))};}
 else if(source.key==='reroute'&&base==='value'||source.key==='setMembers'&&base==='value')ref=await inputReference(vm,source,'value',frame,seen);
 else if(['functionInput','macroInput'].includes(source.key))ref=frame.referenceInputs?.get(base);
 else if(source.key==='arrayGet'&&base==='return'){
  const parent=await inputReference(vm,source,'array',frame,seen),p=basePins(source,'in',frame.g).find(p=>p.id==='index'),index=frame.arrayIndices?.has(source.id)?frame.arrayIndices.get(source.id):await vm.read(source,p,frame);
  if(parent?.array&&Number.isInteger(index)&&index>=0&&index<parent.get().length)ref=childReference(parent,index,parent.type);
 }
 if(!ref)return null;
 for(const part of path){if(ref.array)return null;const fields=fieldsFor(ref.type),i=fields.findIndex(p=>p.id===part);if(i<0)return null;const field=fields[i];ref=childReference(ref,['vec2','vec3','color'].includes(ref.type)?i:part,field.type,field.array);}
 return ref;
}
