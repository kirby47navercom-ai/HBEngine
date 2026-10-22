import {nativeEnumMask} from './native-enums.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function nativeEnumMaskControl(definition,value,attrs,label){
  return '<details class="bp-enum-mask"><summary>'+esc(label)+' · 0x'+(value>>>0).toString(16).toUpperCase()+'</summary>'+definition.entries.filter(entry=>!entry.hidden&&nativeEnumMask(definition,entry)).map(entry=>{const mask=nativeEnumMask(definition,entry);return '<label><input type="checkbox" '+attrs+' data-value-type="int" data-value-enum-mask="'+mask+'" '+((value&mask)=== (mask|0)?'checked':'')+'>'+esc(entry.label)+'</label>';}).join('')+'</details>';
}
export function nativeEnumOptions(definition,value) {
  const entries=definition.entries.filter(entry=>!entry.hidden),current=entries.find(entry=>entry.value===value),hidden=definition.entries.find(entry=>entry.value===value);
  return (!current?'<option value="'+esc(value)+'" selected>'+esc(hidden?.label??value)+(hidden?' · 숨김':' · 이름 없는 값')+'</option>':'')+entries.map(entry=>'<option value="'+entry.value+'" '+(entry.value===value?'selected':'')+' title="'+esc(entry.tooltip||entry.name)+'">'+esc(entry.label)+'</option>').join('');
}
export function nativeEnumControl(definition,value,attrs,label,array=false) {
  const select=(value,extra='')=>'<select '+attrs+' '+extra+' data-value-type="int" data-native-enum="'+esc(definition.name)+'" aria-label="'+esc(label)+'">'+nativeEnumOptions(definition,value)+'</select>';
  if(!array)return select(value);
  return '<div class="bp-enum-array">'+value.map((value,index)=>'<div><span>'+index+'</span>'+select(value,'data-value-enum-index="'+index+'"')+'<button type="button" '+attrs+' data-value-enum-action="remove" data-value-enum-index="'+index+'" aria-label="'+esc(label)+' '+index+' 삭제">−</button></div>').join('')+'<button type="button" '+attrs+' data-value-enum-action="add" data-value-enum-default="'+(definition.entries.find(entry=>!entry.hidden)?.value??0)+'" '+(value.length>=128?'disabled':'')+' aria-label="'+esc(label)+' 항목 추가">+ 항목</button></div>';
}
export function editNativeEnumArray(current,control) {
  const next=current.slice(),index=Number(control.dataset.valueEnumIndex),action=control.dataset.valueEnumAction;
  if(action==='add'){if(next.length>=128)throw Error('배열 항목은 128개까지예요.');next.push(Number(control.dataset.valueEnumDefault));}
  else {if(!Number.isInteger(index)||index<0||index>=next.length)throw Error('enum 배열 항목이 없어요.');if(action==='remove')next.splice(index,1);else next[index]=Number(control.value);}
  return next;
}
