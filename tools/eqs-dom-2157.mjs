// Minimal owned DOM surface for production EQS controls/overlay event tests.
// No browser/window/GPU is opened, and no UI layout/pixel claim is made.
export class EqsTestElement{
 constructor(document,tag){this.ownerDocument=document;this.tagName=tag.toUpperCase();this.children=[];this.parentElement=null;this.dataset={};this.attributes={};this._text='';this._value='';this.style={setProperty(){}};this.hidden=false;this.disabled=false;}
 get isConnected(){return this===this.ownerDocument.root||!!this.parentElement?.isConnected;}
 get options(){return this.children.filter(c=>c.tagName==='OPTION');}
 get value(){return this._value||this.options[0]?.value||'';}set value(v){this._value=String(v);}
 append(...items){for(const child of items){if(typeof child==='string'){this.children.push(child);continue;}child.parentElement=this;this.children.push(child);}}
 prepend(...items){const old=this.children;this.children=[];this.append(...items,...old);}
 replaceChildren(...items){for(const c of this.children)if(typeof c!=='string')c.parentElement=null;this.children=[];this._text='';this._value='';this.append(...items);}
 set textContent(value){const selected=this._value;this.replaceChildren();this._value=selected;this._text=String(value);}get textContent(){return this._text+this.children.map(c=>typeof c==='string'?c:c.textContent).join('');}
 setAttribute(key,value){this.attributes[key]=String(value);}getAttribute(key){return this.attributes[key]??null;}
 remove(){if(this.parentElement){const p=this.parentElement;p.children=p.children.filter(c=>c!==this);this.parentElement=null;}}
 getBoundingClientRect(){return {left:0,top:0,width:640,height:400};}
 all(){return this.children.flatMap(c=>typeof c==='string'?[]:[c,...c.all()]);}
 data(key,value){return this.all().find(c=>Object.hasOwn(c.dataset,key)&&(value===undefined||c.dataset[key]===String(value)));}
}
export function eqsTestDocument(){const document={createElement:tag=>new EqsTestElement(document,tag)};document.root=document.createElement('main');return document;}
