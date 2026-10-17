import {validNative} from './native-model.js';
import {validValue,defaultsFor} from './blueprint-model.js';
const shape=p=>JSON.stringify([p.type,p.array,p.className||'']);
const signature=f=>JSON.stringify([f.static,f.pure,f.event,f.lifecycle??null,f.inputs.map(p=>[p.id,shape(p)]),f.outputs.map(p=>[p.id,shape(p)])]);
// The worker owns private C++ storage; only reflected state can cross binaries.
export function nativeReloadPlan(before,after,objects){
 if(!validNative(before,validValue)||!validNative(after,validValue))throw Error('재적용 C++ 메타데이터 오류');
 const classes=new Map(after.classes.map(c=>[c.name,c]));
 for(const old of before.classes){const next=classes.get(old.name);if(!next||next.base!==old.base)throw Error('실행 중 클래스·상속 변경은 다시 실행해야 해요: '+old.name);
  for(const property of old.properties){const p=next.properties.find(p=>p.name===property.name);if(!p||shape(p)!==shape(property))throw Error('공개 속성 타입 변경은 다시 실행해야 해요: '+old.name+'.'+property.name);}
  for(const method of old.functions){const f=next.functions.find(f=>f.name===method.name);if(!f||signature(f)!==signature(method))throw Error('공개 함수 시그니처 변경은 다시 실행해야 해요: '+old.name+'.'+method.name);}
  if(next.functions.some(f=>f.lifecycle!==undefined&&!old.functions.some(previous=>previous.name===f.name)))throw Error('C++ Lifecycle 추가는 다시 실행해야 해요: '+old.name);
 }
 return objects.filter(o=>o.nativeClass&&classes.has(o.nativeClass)).map(object=>{
  const properties={...object.nativeProperties};let current=classes.get(object.nativeClass);const seen=new Set();
  while(current){if(seen.has(current.name))throw Error('C++ 상속이 순환해요.');seen.add(current.name);for(const p of current.properties){const v=Object.hasOwn(properties,p.name)?properties[p.name]:p.value??(p.array?[]:defaultsFor(p.type));if(p.array?!Array.isArray(v)||v.length>128||!v.every(v=>validValue(p.type,v)):!validValue(p.type,v))throw Error('공개 실행 값이 새 클래스와 맞지 않아요: '+p.name);properties[p.name]=structuredClone(v);}current=classes.get(current.base);}
  return {object,properties};
 });
}
