import {snapshotNativeMetadata} from './native-model.js';
import {nativeRecordDefinition,validNativeRecordValue} from './native-records.js';

const shape=pin=>JSON.stringify([pin.type,!!pin.array,pin.structName||'',pin.enumName||'',pin.enumSource||'',pin.maskEnumName||'',pin.className||'']);
const fail=message=>{throw Error('구조체 데이터 이관: '+message);};

// A plan owns its metadata snapshots. No project-global migration state and no
// runtime hot-reload permission: only missing, newly declared members expand.
export function createNativeRecordMigration(before,after){
 if(before?.sourceReference||after?.sourceReference)fail('원본 참조를 먼저 읽어야 해요.');
 before=snapshotNativeMetadata(before);after=snapshotNativeMetadata(after);const checked=new Set(),stats={values:0,addedFields:0};
 const additive=(name,depth=0)=>{
  if(depth>=16)fail('타입 중첩 깊이를 확인하세요.');if(checked.has(name))return;
  const old=nativeRecordDefinition(before,{structName:name}),next=nativeRecordDefinition(after,{structName:name});if(!old||!next||old.sourcePath!==next.sourcePath)fail('이전·새 타입 원본을 확인하세요: '+name);
  for(const field of old.fields){const n=next.fields.find(n=>n.name===field.name);if(!n||shape(field)!==shape(n))fail('기존 멤버의 삭제·자료형 변경은 자동 처리하지 않아요: '+name+'.'+field.name);if(field.type==='record')additive(field.structName,depth+1);}
  checked.add(name);
 };
 const migrate=(descriptor,value)=>{
  const pin={...descriptor,array:!!descriptor.array||descriptor.container==='array'};if(pin.type!=='record')return value;
  if(validNativeRecordValue(after,pin,value))return value;additive(pin.structName);
  const budget={left:20000};let added=0;
  const walk=(field,current,depth=0)=>{
   if(--budget.left<0||depth>16)fail('값 크기·중첩 깊이를 확인하세요.');
   if(field.array){if(!Array.isArray(current)||current.length>128)fail('배열 자료형·크기를 확인하세요.');let result=current;for(let i=0;i<current.length;i++){if(!Object.hasOwn(current,i))fail('배열 값이 빠졌어요.');const next=walk({...field,array:false},current[i],depth+1);if(next!==current[i]){if(result===current)result=current.slice();result[i]=next;}}return result;}
   if(field.type!=='record'){if(!validNativeRecordValue(after,field,current))fail('기존 값의 자료형을 확인하세요.');return current;}
   const old=nativeRecordDefinition(before,field),next=nativeRecordDefinition(after,field);if(!old){if(validNativeRecordValue(after,field,current,budget,depth))return current;fail('새 타입의 값이 맞지 않아요: '+field.structName);}additive(field.structName);
   if(!current||typeof current!=='object'||Array.isArray(current)||![Object.prototype,null].includes(Object.getPrototypeOf(current)))fail('구조체 값이 아니에요: '+field.structName);
   const names=new Set(next.fields.map(f=>f.name));if(Object.keys(current).some(k=>!names.has(k))||old.fields.some(f=>!Object.hasOwn(current,f.name)))fail('알 수 없는 멤버나 기존 값 누락이 있어요: '+field.structName);
   const oldNames=new Set(old.fields.map(f=>f.name));let result=current;
   for(const member of next.fields){let v;if(Object.hasOwn(current,member.name))v=walk(member,current[member.name],depth+1);else{if(oldNames.has(member.name))fail('기존 값이 빠졌어요: '+member.name);if(!validNativeRecordValue(after,member,member.value,budget,depth+1))fail('새 멤버 기본값의 크기를 확인하세요.');v=structuredClone(member.value);added++;}if(!Object.hasOwn(current,member.name)||v!==current[member.name]){if(result===current)result={...current};Object.defineProperty(result,member.name,{value:v,writable:true,enumerable:true,configurable:true});}}
   return result;
  };
  const result=walk(pin,value);if(!validNativeRecordValue(after,pin,result))fail('새 선언에 맞지 않아요: '+pin.structName);if(result!==value){stats.values++;stats.addedFields+=added;}return result;
 };
 migrate.stats=stats;return migrate;
}
