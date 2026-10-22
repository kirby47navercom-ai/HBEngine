import {validNative} from './native-model.js';
import {validValue,defaultsFor} from './blueprint-model.js';
import {validNativeRecordPin} from './native-records.js';
import {validNativeEnumPin} from './native-enums.js';
const shape=p=>JSON.stringify([p.type,p.array,p.className||'',p.structName||'',p.enumName||'']);
const signature=f=>JSON.stringify([f.static,f.pure,f.event,f.lifecycle??null,f.inputs.map(p=>[p.id,shape(p)]),f.outputs.map(p=>[p.id,shape(p)])]);
// The worker owns private C++ storage; only reflected state can cross binaries.
export function nativeReloadPlan(before,after,objects){
 if(!validNative(before,validValue)||!validNative(after,validValue))throw Error('재적용 C++ 메타데이터 오류');
 for(const old of before.structs||[]){const next=after.structs?.find(definition=>definition.name===old.name),layout=definition=>JSON.stringify(definition?.fields.map(field=>[field.name,shape(field),field.readOnly]));if(!next||layout(old)!==layout(next))throw Error('실행 중 구조체 레이아웃 변경은 다시 실행해야 해요: '+old.name);}
 for(const old of before.enums||[]){const next=after.enums?.find(definition=>definition.name===old.name);if(!next||old.underlying.bits!==next.underlying.bits||old.underlying.unsigned!==next.underlying.unsigned)throw Error('실행 중 enum 기반형 변경은 다시 실행해야 해요: '+old.name);}
 const classes=new Map(after.classes.map(c=>[c.name,c]));
 for(const old of before.classes){const next=classes.get(old.name);if(!next||next.base!==old.base||(next.cppName||next.name)!==(old.cppName||old.name)||JSON.stringify(next.cppNamespace||[])!==JSON.stringify(old.cppNamespace||[]))throw Error('실행 중 클래스·상속 변경은 다시 실행해야 해요: '+old.name);
  for(const property of old.properties){const p=next.properties.find(p=>p.name===property.name);if(!p||shape(p)!==shape(property)||p.readOnly!==property.readOnly)throw Error('공개 속성 타입 변경은 다시 실행해야 해요: '+old.name+'.'+property.name);}
  for(const method of old.functions){const f=next.functions.find(f=>f.name===method.name);if(!f||signature(f)!==signature(method))throw Error('공개 함수 시그니처 변경은 다시 실행해야 해요: '+old.name+'.'+method.name);}
  if(next.functions.some(f=>f.lifecycle!==undefined&&!old.functions.some(previous=>previous.name===f.name)))throw Error('C++ Lifecycle 추가는 다시 실행해야 해요: '+old.name);
 }
 return objects.filter(o=>o.nativeClass&&classes.has(o.nativeClass)).map(object=>{
  const properties={...object.nativeProperties};let current=classes.get(object.nativeClass);const seen=new Set();
  while(current){if(seen.has(current.name))throw Error('C++ 상속이 순환해요.');seen.add(current.name);for(const p of current.properties){const v=Object.hasOwn(properties,p.name)?properties[p.name]:p.value??(p.array?[]:defaultsFor(p.type));if(!validNativeEnumPin(after,p,v,{runtime:true})||p.type==='record'&&!validNativeRecordPin(after,p,v,{runtime:true})||(p.array?!Array.isArray(v)||v.length>100000||!v.every(v=>validValue(p.type,v)):!validValue(p.type,v)))throw Error('공개 실행 값이 새 클래스와 맞지 않아요: '+p.name);Object.defineProperty(properties,p.name,{value:structuredClone(v),writable:true,configurable:true,enumerable:true});}current=classes.get(current.base);}
  return {object,properties};
 });
}
