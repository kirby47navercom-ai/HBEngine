import {nativeRecordDefault,nativeRecordFields} from './native-records.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function nativeRecordTypeChoices(metadata,choices){return [...choices.filter(([type])=>type!=='record'),...(metadata?.structs||[]).filter(definition=>definition.blueprintType).map(definition=>['record:'+definition.name,definition.label+' · 구조체'])];}
export const nativeRecordTypeChoice=pin=>pin.type==='record'||pin.valueType==='record'?'record:'+pin.structName:pin.type||pin.valueType;
export function nativeRecordControl(definition,value,attrs,label,array,{metadata,render}={}){
 if(!definition)return `<textarea ${attrs} data-value-type="record" data-value-array="${!!array}" aria-label="${esc(label)}" spellcheck="false">${esc(JSON.stringify(value))}</textarea>`;
 const address=(path,isArray)=>attrs+(path.length?' data-value-record-path="'+esc(JSON.stringify(path))+'"':'')+' data-value-record-type="record" data-value-record-array="'+isArray+'"';
 const fields=(definition,value,path)=>nativeRecordFields(metadata,definition).map(field=>{
  const next=[...path,field.name];
  if(field.type==='record')return '<div class="bp-record-field">'+record(field.structInfo,value[field.name],next,field.array,field.label)+'</div>';
  const control=render(field,value[field.name],attrs+' data-value-record-path="'+esc(JSON.stringify(next))+'" data-value-record-type="'+field.type+'" data-value-record-array="'+field.array+'"',field.label);
  return '<div class="bp-record-field"><label>'+esc(field.label)+'</label>'+control+'</div>';
 }).join('');
 const record=(definition,value,path,isArray,name)=>{
  if(!isArray)return '<details class="bp-record-value" open><summary>'+esc(name)+'</summary><div>'+fields(definition,value,path)+'</div></details>';
  const controls=address(path,true)+' data-value-record-struct="'+esc(definition.name)+'"';
  return '<div class="bp-record-array">'+value.map((item,index)=>'<details class="bp-record-value" open><summary><span>'+index+'</span><span class="bp-record-actions">'+[['up','↑',index===0],['down','↓',index===value.length-1],['remove','−',false]].map(([action,text,disabled])=>'<button type="button" '+controls+' data-value-record-action="'+action+'" data-value-record-index="'+index+'" '+(disabled?'disabled':'')+' aria-label="'+esc(name)+' '+index+' '+action+'">'+text+'</button>').join('')+'</span></summary><div>'+fields(definition,item,[...path,index])+'</div></details>').join('')+'<button type="button" '+controls+' data-value-record-action="add" '+(value.length>=128?'disabled':'')+' aria-label="'+esc(name)+' 항목 추가">+ 항목</button></div>';
 };
 return record(definition,value,[],!!array,definition.label||label);
}
export function editNativeRecordControl(metadata,current,control,read){
 const dataset=control.dataset;
 if(dataset.valueRecordPath!==undefined){
  const path=JSON.parse(dataset.valueRecordPath);if(!Array.isArray(path)||!path.length||path.length>16||path.some(part=>typeof part==='number'?(!Number.isInteger(part)||part<0||part>=128):typeof part!=='string'||!/^[A-Za-z_]\w{0,79}$/.test(part)))throw Error('구조체 필드 경로 오류');
  const output=structuredClone(current);let owner=output;
  for(const part of path.slice(0,-1)){if(!owner||typeof owner!=='object'||!Object.hasOwn(owner,part))throw Error('구조체 필드가 없어요.');owner=owner[part];}
  const key=path.at(-1);if(!owner||!Object.hasOwn(owner,key))throw Error('구조체 필드가 없어요.');
  const child={value:control.value,checked:control.checked,type:control.type,dataset:{...dataset}};delete child.dataset.valueRecordPath;
  const value=read(child,dataset.valueRecordType,owner[key],dataset.valueRecordArray==='true');Object.defineProperty(owner,key,{value,writable:true,configurable:true,enumerable:true});return output;
 }
 if(!Array.isArray(current))throw Error('구조체 배열을 확인하세요.');const output=current.slice(),action=dataset.valueRecordAction,index=Number(dataset.valueRecordIndex);
 if(action==='add'){if(output.length>=128)throw Error('배열 항목은128개까지예요.');output.push(nativeRecordDefault(metadata,{type:'record',structName:dataset.valueRecordStruct}));return output;}
 if(!Number.isInteger(index)||index<0||index>=output.length)throw Error('구조체 배열 항목이 없어요.');
 if(action==='remove')output.splice(index,1);else if(action==='up'||action==='down'){const next=index+(action==='up'?-1:1);if(next<0||next>=output.length)throw Error('구조체 배열 순서 범위 오류');[output[index],output[next]]=[output[next],output[index]];}else throw Error('구조체 배열 조작 오류');
 return output;
}
