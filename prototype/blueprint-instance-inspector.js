import {valueControl} from './blueprint-details.js';
import {blueprintInstanceDefaults} from './blueprint-overrides.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function blueprintInstanceMarkup(root,object,objects=[]){
  const values=blueprintInstanceDefaults(root,object),definition=root.native?.classes.find(c=>c.name===root.settings?.parentClass),overrides=object.overrides||{};
  const row=(kind,d,value)=>{const id=kind==='variables'?d.id:d.name,explicit=Object.hasOwn(overrides[kind]||{},id)||Object.hasOwn(overrides,id)||Object.hasOwn(overrides,d.name)||kind==='nativeProperties'&&(Object.hasOwn(overrides,definition.name+'.'+id)||Object.hasOwn(overrides.nativeProperties||{},definition.name+'.'+id)||Object.hasOwn(object.nativeProperties||{},id));return '<div class="bp-detail-row '+(explicit?'overridden-property':'')+'"><label>'+esc(d.name)+'</label>'+valueControl(d.type,value,'data-bp-instance="'+kind+'" data-bp-instance-id="'+esc(id)+'"',d.name,d.array||d.container==='array',objects)+'<button class="property-reset" data-reset-instance="'+kind+'" data-bp-instance-id="'+esc(id)+'" aria-label="'+esc(d.name)+' 기본값으로 되돌리기" '+(explicit?'':'disabled')+'>↶</button></div>';};
  return '<section class="component-section"><h3>블루프린트 인스턴스</h3>'+root.variables.filter(v=>v.instanceEditable!==false&&!v.private).map(v=>row('variables',v,values.variables[v.id])).join('')+(definition?.properties||[]).map(p=>row('nativeProperties',p,values.nativeProperties[p.name])).join('')+'</section>';
}
export function editBlueprintInstance(root,object,kind,id,value,{reset=false}={}){
  if(!['variables','nativeProperties'].includes(kind))throw Error('인스턴스 속성 종류 오류');const definition=kind==='variables'?root.variables.find(v=>v.id===id):root.native?.classes.find(c=>c.name===root.settings?.parentClass)?.properties.find(p=>p.name===id);if(!definition)throw Error('인스턴스 속성이 없어요.');
  const next=structuredClone(object);next.overrides??={};const names=[id,definition.name,...(kind==='nativeProperties'?[root.settings.parentClass+'.'+id]:[])];for(const name of names){delete next.overrides[name];delete next.overrides[kind]?.[name];if(kind==='nativeProperties')delete next.nativeProperties?.[name];}
  if(!reset){next.overrides[kind]??={};next.overrides[kind][id]=structuredClone(value);}
  if(next.overrides[kind]&&!Object.keys(next.overrides[kind]).length)delete next.overrides[kind];if(!Object.keys(next.overrides).length)delete next.overrides;
  blueprintInstanceDefaults(root,next);object.overrides=next.overrides;if(object.overrides===undefined)delete object.overrides;if(kind==='nativeProperties')object.nativeProperties=next.nativeProperties;return object;
}
