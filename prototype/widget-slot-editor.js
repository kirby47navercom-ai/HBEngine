// A slot assignment references another ordinary widget document. Its content
// keeps the existing editing, revision, event/binding and packaging contracts.
export function renderWidgetSlotFields(editor,data){
 const chosen=editor.doc.data.nodes.find(n=>n.id===editor.selected),inherited=!chosen?.parent&&!!data.inheritedWidget,mount=inherited?data.nodes.find(n=>n.id===data.inheritedWidget):chosen,inspector=editor.element.querySelector('.ui-properties')||editor.element.querySelector('.ui-inspector');
 inspector?.querySelector('[data-ui-slot-fields]')?.remove();if(!inspector||mount?.type!=='Widget'||!mount.properties.widgetAsset)return;
 const prefix=mount.name+'/',slots=data.nodes.filter(n=>n.type==='NamedSlot'&&n.name.startsWith(prefix)&&(!inherited||!n.properties.exposeOnInstanceOnly)),section=editor.document.createElement('section');section.dataset.uiSlotFields='';
 const title=editor.document.createElement('h3');title.textContent='명명 슬롯';section.append(title);if(!slots.length)return;
 const values=inherited?editor.doc.data.parentSlots||{}:JSON.parse(mount.properties.widgetSlots||'{}');
 for(const slot of slots){const name=slot.name.slice(prefix.length),row=editor.document.createElement('label'),select=editor.document.createElement('select');row.textContent=name;select.setAttribute('aria-label','명명 슬롯 '+name);select.dataset.uiSlot=name;
  const option=(value,label)=>{const el=editor.document.createElement('option');el.value=value;el.textContent=label;select.append(el);};option('','기본 내용');option('@empty','비우기');
  for(const file of editor.files().filter(f=>f.kind==='widget'&&f.path!==editor.doc.path&&f.path!==mount.properties.widgetAsset))option(file.path,file.path);
  const current=Object.hasOwn(values,name)?values[name]===null?'@empty':values[name]:'';if(current&&!Array.from(select.options).some(o=>o.value===current))option(current,current);select.value=current;
  select.onchange=event=>{event.stopPropagation();const value=select.value;editor.edit(next=>{const node=next.nodes.find(n=>n.id===mount.id),map=inherited?{...next.parentSlots}:JSON.parse(node.properties.widgetSlots||'{}');if(value==='')delete map[name];else map[name]=value==='@empty'?null:value;if(inherited)next.parentSlots=map;else node.properties.widgetSlots=JSON.stringify(map);});};row.append(select);section.append(row);
 }
 // Keep the instance's primary content choice beside its identity, before the
 // generic transform/appearance fields rather than at the bottom of the form.
 const identity=inspector.querySelector(':scope > section');inspector.insertBefore(section,identity?.nextSibling||null);
}
