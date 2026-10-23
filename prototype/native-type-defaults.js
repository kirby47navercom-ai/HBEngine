import {nativeTypeClosure} from './native-type-graph.js';
const definitions=(data,libraries)=>libraries?nativeTypeClosure(data,libraries).flatMap(d=>d.structs):data.structs||[];
const layout=structs=>new Map(structs.map(d=>[d.id,JSON.stringify(d.fields.map(f=>[f.id,f.symbol,f.type,f.typeId,f.array]))]));
const sameField=(a,b)=>a.type===b.type&&a.typeId===b.typeId&&a.array===b.array;

// This reconciles an authored library edit, not saved scene/BP instances.
// Existing IDs identify fields through an unsaved rename. Unknown keys and
// malformed literals remain for the shared compiler to reject.
export function reconcileNativeTypeDefaults(previous,next,{beforeLibraries,libraries}={}){
 const before=layout(definitions(previous,beforeLibraries)),after=layout(definitions(next,libraries));if(before.size===after.size&&[...after].every(([id,value])=>before.get(id)===value))return next;
 const result=structuredClone(next),currentDefinitions=new Map(definitions(result,libraries).map(d=>[d.id,d])),oldDefinitions=new Map(definitions(previous,beforeLibraries).map(d=>[d.id,d])),complete=new Set(),active=new Set();let remaining=200000;
 const adapt=(field,value,oldField,depth=0)=>{
  if(--remaining<0||depth>16)throw Error('타입 기본값의 크기·중첩 깊이를 확인하세요.');
  if(oldField&&!sameField(field,oldField)){value=structuredClone(field.value);oldField=undefined;}
  if(field.array){if(!Array.isArray(value)||value.length>128)return value;return value.map(v=>adapt({...field,array:false},v,oldField?{...oldField,array:false}:undefined,depth+1));}
  if(field.type!=='record')return value;
  const definition=currentDefinitions.get(field.typeId);if(!definition||!value||Object.getPrototypeOf(value)!==Object.prototype)return value;
  const old=oldDefinitions.get(field.typeId),oldFields=new Map((old?.fields||[]).map(f=>[f.id,f])),knownOld=new Set((old?.fields||[]).map(f=>f.symbol)),knownNew=new Set(definition.fields.map(f=>f.symbol)),entries=[];
  for(const child of definition.fields){const oldChild=oldFields.get(child.id);let current;if(Object.hasOwn(value,child.symbol))current=value[child.symbol];else if(oldChild&&Object.hasOwn(value,oldChild.symbol))current=value[oldChild.symbol];else if(!oldChild)current=structuredClone(child.value);else continue;entries.push([child.symbol,adapt(child,current,oldChild,depth+1)]);}
  for(const [key,current]of Object.entries(value))if(!knownOld.has(key)&&!knownNew.has(key))entries.push([key,current]);
  return Object.fromEntries(entries);
 };
 const visit=(definition,depth=0)=>{
  if(depth>=16||active.has(definition.id))throw Error('타입 기본값의 순환·중첩 깊이를 확인하세요.');if(complete.has(definition.id))return;active.add(definition.id);
  for(const field of definition.fields)if(field.type==='record'&&result.structs.includes(currentDefinitions.get(field.typeId)))visit(currentDefinitions.get(field.typeId),depth+1);
  const old=new Map((oldDefinitions.get(definition.id)?.fields||[]).map(f=>[f.id,f]));for(const field of definition.fields)field.value=adapt(field,field.value,old.get(field.id));active.delete(definition.id);complete.add(definition.id);
 };
 result.structs.forEach(d=>visit(d));return result;
}
