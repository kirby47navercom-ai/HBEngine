import {nativeRecordDefinition,nativeRecordTemplate} from './native-records.js';
import {fieldsFor} from './struct-operations.js';
const page=(offset,limit)=>{if(!Number.isInteger(offset)||offset<0||!Number.isInteger(limit)||limit<1||limit>128)throw Error('구조체 조회 범위는1–128이에요.');};
const preview=value=>typeof value==='string'?{kind:'string',length:value.length,text:value.slice(0,80),truncated:value.length>80}:Array.isArray(value)?{kind:'array',count:value.length}:value&&typeof value==='object'?{kind:'record',count:Object.keys(value).length}:{kind:value===null?'null':typeof value,value};
const fieldSummary=field=>{const {value,...definition}=field;return {...definition,defaultPreview:preview(value)};};
export function inspectNativeRecords(metadata,{name,offset=0,limit=32}={}){
 page(offset,limit);const definitions=metadata?.structs||[];
 if(name===undefined)return {readOnly:true,count:definitions.length,offset,structs:definitions.slice(offset,offset+limit).map(({fields,...definition})=>({...definition,fields:fields.length}))};
 const definition=nativeRecordDefinition(metadata,{structName:name});if(!definition)throw Error('구조체 선언이 없어요.');
 const {fields,...summary}=definition;return {readOnly:true,...summary,count:fields.length,offset,fields:fields.slice(offset,offset+limit).map(fieldSummary)};
}
export function inspectNativeRecordDefault(metadata,{name,fieldPath=[],offset=0,limit=32}={}){
 page(offset,limit);if(!Array.isArray(fieldPath)||fieldPath.length>16)throw Error('구조체 기본값 경로를 확인하세요.');const definition=nativeRecordDefinition(metadata,{structName:name});if(!definition)throw Error('구조체 선언이 없어요.');
 let pin={type:'record',structName:name},value=nativeRecordTemplate(definition);
 for(const part of fieldPath){
  if(Array.isArray(value)){if(!Number.isInteger(part)||part<0||part>=value.length||!Object.hasOwn(value,part))throw Error('배열 기본값 번호를 확인하세요.');value=value[part];pin=pin.array?{...pin,array:false}:{type:'float',array:false};}
  else {const field=fieldsFor(pin.type,nativeRecordDefinition(metadata,pin),metadata).find(field=>field.id===part);if(!field||!value||!Object.hasOwn(value,part))throw Error('구조체 기본값 필드가 없어요.');value=value[part];pin=field;}
 }
 const base={readOnly:true,name,fieldPath:structuredClone(fieldPath),type:pin.type,array:!!pin.array,...pin.structName?{structName:pin.structName}:{},...pin.enumName?{enumName:pin.enumName}:{}};
 if(Array.isArray(value))return {...base,kind:'array',count:value.length,offset,items:value.slice(offset,offset+limit).map((value,index)=>({index:offset+index,...preview(value)}))};
 if(value&&typeof value==='object'){const fields=fieldsFor(pin.type,nativeRecordDefinition(metadata,pin),metadata);return {...base,kind:'record',count:fields.length,offset,members:fields.slice(offset,offset+limit).map(field=>({name:field.id,type:field.type,array:!!field.array,...field.structName?{structName:field.structName}:{},preview:preview(value[field.id])}))};}
 return {...base,kind:value===null?'null':typeof value,value};
}
