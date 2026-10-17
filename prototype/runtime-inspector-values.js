import {componentDefaults} from './scene-components.js';
export function runtimeInspectorStructure(object,bindings=[]){const rows=[object.id,object.nativeClass||'',...(object.components||[]).map(c=>c.id+':'+c.type+':'+(Array.isArray(c.properties?.wheels)?c.properties.wheels.length:'')+':'+(c.properties?.driveModel||'')+':'+(c.properties?.jointDOFs||[]).map(r=>r.mode+','+r.motor).join(';'))];for(const b of bindings)if(b.self===object.id){rows.push(...b.root.variables.map(v=>'v:'+v.id+':'+v.type+':'+v.container));rows.push(...(b.root.native?.classes.find(c=>c.name===object.nativeClass)?.properties||[]).map(p=>'n:'+p.name+':'+p.type+':'+p.array+':'+p.readOnly));}return JSON.stringify(rows);}
function assign(control,value,{json=false,object=false}={}){
 if(value===undefined||control.ownerDocument.activeElement===control)return;
 if(control.type==='checkbox'){if(control.checked!==!!value)control.checked=!!value;return;}
 const text=json?JSON.stringify(value):value===null&&object?'null':String(value??'');
 if(control.tagName==='SELECT'){
  for(const option of [...control.options])if(option.dataset.runtimeOption&&option.value!==text)option.remove();
  if(![...control.options].some(o=>o.value===text)){const option=control.ownerDocument.createElement('option');option.value=text;option.textContent=text;option.dataset.runtimeOption='true';control.append(option);}
 }
 if(control.value!==text)control.value=text;
}
// Update leaves in the existing inspector; no input/change events, document
// writes, history entries, layout recreation or permanent timer of its own.
export function updateRuntimeInspector(root,object,bindings=[]){
 if(!root||root.querySelector('.object-identity')?.title!==object?.id)return;
 const components=new Map((object.components||[]).map(c=>[c.id,c]));
 for(const control of root.querySelectorAll('[data-scene-component][data-component-field]')){if(!['INPUT','SELECT','TEXTAREA'].includes(control.tagName))continue;const c=components.get(control.dataset.sceneComponent);if(!c)continue;const key=control.dataset.componentField;let value=Object.hasOwn(c.properties||{},key)?c.properties[key]:componentDefaults(c.type)[key];if(control.dataset.vehicleRowIndex!==undefined){value=value?.[Number(control.dataset.vehicleRowIndex)];if(control.dataset.vehicleRowField!=='ratio')value=value?.[control.dataset.vehicleRowField];}if(control.dataset.jointDofIndex!==undefined)value=value?.[Number(control.dataset.jointDofIndex)]?.[control.dataset.jointDofField];if(control.dataset.wheelIndex!==undefined){value=value?.[Number(control.dataset.wheelIndex)]?.[control.dataset.wheelKey];if(control.dataset.wheelAxis!==undefined)value=value?.[Number(control.dataset.wheelAxis)];}if(key==='bodyType'&&c.properties?.isKinematic)value='kinematic';if(control.dataset.componentAxis!==undefined)value=value?.[Number(control.dataset.componentAxis)];if(control.dataset.componentLayer!==undefined)value=value?.includes(control.dataset.componentLayer);assign(control,value);}
 for(const control of root.querySelectorAll('[data-transform][data-axis]'))assign(control,object[control.dataset.transform]?.[Number(control.dataset.axis)]);
 const visible=root.querySelector('#object-visible');if(visible)assign(visible,object.visible);
 for(const [selector,value]of [['[data-object-name]',object.name],['[data-scene-parent]',object.parent||''],['[data-scene-tags]',(object.tags||[]).join(', ')]]){const control=root.querySelector(selector);if(control)assign(control,value);}
 const variables=new Map();for(const b of bindings)if(b.self===object.id)for(const [key,value]of b.variables)variables.set(key,value);
 for(const control of root.querySelectorAll('[data-bp-instance]')){let value=control.dataset.bpInstance==='variables'?variables.get(control.dataset.bpInstanceId):object.nativeProperties?.[control.dataset.bpInstanceId];if(control.dataset.valueAxis!==undefined)value=value?.[Number(control.dataset.valueAxis)];assign(control,value,{json:control.dataset.valueArray==='true'||['transform','hit'].includes(control.dataset.valueType),object:control.dataset.valueType==='object'});}
}
