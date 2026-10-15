import {validEditorTool,runEditorTool} from './editor-tool-assets.js';
export class EditorTool {
 constructor(element,doc,hooks){this.el=element;this.doc=doc;this.hooks=hooks;this.values={};this.render();}
 render(){
  const owner=this.el.ownerDocument;this.el.replaceChildren();this.el.classList.add('editor-tool');const toolbar=owner.createElement('div');toolbar.className='document-toolbar';const title=owner.createElement('strong');title.textContent=this.doc.data.name;toolbar.append(title);this.el.append(toolbar);
  const form=owner.createElement('form');form.className='editor-tool-form';form.onsubmit=e=>e.preventDefault();this.el.append(form);
  for(const f of this.doc.data.inputs){const label=owner.createElement('label'),caption=owner.createElement('span');caption.textContent=f.label;label.append(caption);let control;
   const value=this.values[f.id]??f.default;
   if(f.type==='vec3'){control=owner.createElement('span');control.className='asset-vector-fields';for(let i=0;i<3;i++){const input=owner.createElement('input');input.type='number';input.step='any';input.value=value[i];input.ariaLabel=f.label+' '+'XYZ'[i];input.onchange=()=>{const v=[...(this.values[f.id]??f.default)];v[i]=Number(input.value);this.values[f.id]=v;};const cell=owner.createElement('span'),axis=owner.createElement('span');cell.className='editor-tool-axis';cell.dataset.axis=i;axis.textContent='XYZ'[i];cell.append(axis,input);control.append(cell);}}
   else {control=owner.createElement(f.type==='select'?'select':'input');if(f.type==='select')for(const c of f.choices){const option=owner.createElement('option');option.value=c.value;option.textContent=c.label;control.append(option);}else {control.type=f.type==='bool'?'checkbox':f.type==='number'?'number':'text';if(f.min!==undefined)control.min=f.min;if(f.max!==undefined)control.max=f.max;control.step='any';}if(f.type==='bool')control.checked=value;else control.value=value;control.onchange=()=>this.values[f.id]=f.type==='bool'?control.checked:f.type==='number'?Number(control.value):control.value;control.ariaLabel=f.label;}
   label.append(control);form.append(label);
  }
  const buttons=owner.createElement('div');buttons.className='editor-tool-actions';for(const a of this.doc.data.actions){const button=owner.createElement('button');button.type='button';button.textContent=a.label;button.dataset.toolAction=a.id;button.onclick=async()=>{button.disabled=true;try{await this.run(a.id,this.values);}catch(e){this.hooks.error(e.message);}finally{button.disabled=false;}};buttons.append(button);}form.append(buttons);
  const details=owner.createElement('details'),summary=owner.createElement('summary'),source=owner.createElement('textarea'),apply=owner.createElement('button');summary.textContent='도구 편집';source.value=JSON.stringify(this.doc.data,null,2);source.ariaLabel='도구 정의';source.spellcheck=false;apply.textContent='적용';apply.onclick=()=>{try{const data=JSON.parse(source.value);if(!validEditorTool(data))throw Error('도구 정의를 확인하세요.');this.hooks.before();this.doc.data=data;this.hooks.change();this.render();}catch(e){this.hooks.error(e.message);}};details.append(summary,source,apply);this.el.append(details);
 }
 run(action,inputs={}){return runEditorTool(this.doc.data,action,inputs,this.hooks.context(),this.hooks.methods());}
 dispose(){this.el.replaceChildren();}
}
