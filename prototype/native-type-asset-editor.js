import {compileNativeTypeAsset,nativeTypeAssetDefault,nativeAssetValueTypes} from './native-type-assets.js';

export function renderNativeTypeAssetEditor(element,doc,hooks){
 const document=element.ownerDocument,view=doc.view??={},expanded=view.typeExpanded??={};let saved;try{saved=JSON.parse(doc.saved);}catch{saved={};}
 const persisted=new Set([...(saved.enums||[]),...(saved.structs||[])].flatMap(d=>[d.id,...(d.entries||d.fields).map(f=>f.id)]));
 const node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 const edit=change=>{try{const next=structuredClone(doc.data);change(next);compileNativeTypeAsset(next);hooks.before();doc.data=next;hooks.change();renderNativeTypeAssetEditor(element,doc,hooks);}catch(e){hooks.error(e.message);}};
 const input=(parent,label,value,change,{type='text',disabled=false}={})=>{const row=node('label',label),field=node('input');field.type=type;if(type==='number')field.step='any';field.setAttribute('aria-label',label);field.disabled=disabled;if(type==='checkbox')field.checked=value;else field.value=value;field.onchange=()=>change(type==='checkbox'?field.checked:type==='number'?Number(field.value):field.value);row.append(field);parent.append(row);return field;};
 const button=(parent,text,action)=>{const n=node('button',text);n.type='button';n.onclick=action;parent.append(n);return n;};
 const section=(title,action)=>{const s=node('section'),h=node('div');h.className='form-section-heading';h.append(node('h3',title));if(action)button(h,'추가',action);s.append(h);return s;};
 const unique=(list,prefix)=>{let i=1;while(list.some(d=>d.symbol===prefix+i))i++;return prefix+i;};
 const add=(kind)=>edit(d=>{const list=d[kind],symbol=unique([...d.enums,...d.structs],kind==='enums'?'Enum':'Struct'),base={id:crypto.randomUUID(),symbol,label:kind==='enums'?'열거형':'구조체',tooltip:''};list.push(kind==='enums'?{...base,flags:false,entries:[{id:crypto.randomUUID(),symbol:'None',label:'없음',tooltip:'',value:0,hidden:false}]}:{...base,fields:[{id:crypto.randomUUID(),symbol:'Value',label:'값',tooltip:'',type:'float',array:false,readOnly:false,value:0}]});});
 const header=node('header');header.className='asset-editor-heading';header.append(node('h2',doc.data.name));const form=node('div');form.className='asset-form';element.replaceChildren(header,form);element.dataset.nativeTypeEditor='';
 const identity=section('라이브러리');input(identity,'이름',doc.data.name,v=>edit(d=>d.name=v));input(identity,'C++ namespace',doc.data.namespace,v=>edit(d=>d.namespace=v),{disabled:!!saved.id});const path=node('code',compileNativeTypeAsset(doc.data).path);path.dataset.typeHeader='';identity.append(path);form.append(identity);
 for(const kind of ['enums','structs']){
  const group=section(kind==='enums'?'열거형':'구조체',()=>add(kind));form.append(group);
  doc.data[kind].forEach((definition,index)=>{
   const box=node('details');box.open=expanded[definition.id]??true;box.ontoggle=()=>expanded[definition.id]=box.open;box.dataset.typeId=definition.id;box.append(node('summary',definition.label+' · '+definition.symbol));group.append(box);
   const update=change=>edit(d=>change(d[kind][index]));
   input(box,'C++ 이름',definition.symbol,v=>update(d=>d.symbol=v),{disabled:persisted.has(definition.id)});
   input(box,'표시 이름',definition.label,v=>update(d=>d.label=v));input(box,'설명',definition.tooltip,v=>update(d=>d.tooltip=v));
   if(kind==='enums')input(box,'비트 플래그',definition.flags,v=>update(d=>d.flags=v),{type:'checkbox'});
   const key=kind==='enums'?'entries':'fields',rows=definition[key];
   rows.forEach((field,i)=>{
    const row=node('details');row.open=expanded[field.id]??(kind==='enums'||i===0);row.ontoggle=()=>expanded[field.id]=row.open;row.dataset.typeField=field.id;row.append(node('summary',field.label+' · '+field.symbol));box.append(row);const set=change=>update(d=>change(d[key][i]));
    input(row,'멤버 이름',field.symbol,v=>set(d=>d.symbol=v),{disabled:persisted.has(field.id)});input(row,'표시 이름',field.label,v=>set(d=>d.label=v));input(row,'설명',field.tooltip,v=>set(d=>d.tooltip=v));
    if(kind==='enums'){input(row,'정수 값',field.value,v=>set(d=>d.value=v),{type:'number',disabled:persisted.has(field.id)});input(row,'메뉴에서 숨김',field.hidden,v=>set(d=>d.hidden=v),{type:'checkbox'});}
    else{
     const label=node('label','자료형'),select=node('select');select.ariaLabel='자료형';select.disabled=persisted.has(field.id);
     const choices=nativeAssetValueTypes.map(t=>[t,t]);for(const [type,defs]of [['enum',doc.data.enums],['record',doc.data.structs.filter(d=>d!==definition)]])for(const d of defs)choices.push([type+':'+d.id,d.label+' · '+d.symbol]);
     for(const[value,text]of choices){const o=node('option',text);o.value=value;select.append(o);}select.value=['record','enum'].includes(field.type)?field.type+':'+field.typeId:field.type;
     select.onchange=()=>{const[type,typeId]=select.value.split(':'),next={...field,type,...typeId?{typeId}:{}};if(!typeId)delete next.typeId;try{next.value=nativeTypeAssetDefault(doc.data,next);set(d=>{Object.keys(d).forEach(k=>delete d[k]);Object.assign(d,next);});}catch(e){hooks.error(e.message);}};label.append(select);row.append(label);
     input(row,'배열',field.array,v=>{try{const next={...field,array:v};next.value=nativeTypeAssetDefault(doc.data,next);set(d=>Object.assign(d,next));}catch(e){hooks.error(e.message);}},{type:'checkbox',disabled:persisted.has(field.id)});
     input(row,'읽기 전용',field.readOnly,v=>set(d=>d.readOnly=v),{type:'checkbox'});
     if(!field.array&&['bool','float','int','string'].includes(field.type))input(row,'기본값',field.value,v=>set(d=>d.value=v),{type:field.type==='bool'?'checkbox':field.type==='string'?'text':'number'});
     else{const label=node('label','기본값'),value=node('textarea');value.ariaLabel='기본값';value.value=JSON.stringify(field.value,null,2);value.rows=4;value.onchange=()=>{try{const v=JSON.parse(value.value);set(d=>d.value=v);}catch(e){hooks.error(e.message);}};label.append(value);row.append(label);}
    }
    if(!persisted.has(field.id)&&rows.length>1)button(row,'삭제',()=>update(d=>d[key].splice(i,1)));
   });
   button(box,kind==='enums'?'항목 추가':'필드 추가',()=>update(d=>{const symbol=unique(d[key],kind==='enums'?'Entry':'Field');d[key].push(kind==='enums'?{id:crypto.randomUUID(),symbol,label:'항목',tooltip:'',value:Math.max(-1,...d.entries.map(e=>e.value))+1,hidden:false}:{id:crypto.randomUUID(),symbol,label:'필드',tooltip:'',type:'float',array:false,readOnly:false,value:0});}));
   if(!persisted.has(definition.id))button(box,'선언 삭제',()=>edit(d=>d[kind].splice(index,1)));
  });
 }
}
