import {bindVirtualControl,drawVirtualControl,virtualTypes,virtualDefaults} from './virtual-controls.js';
import {validWidgetAsset,widgetContainers,widgetDefaults,widgetScale,widgetImageSource} from './ui-assets.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function renderWidgetTree(host,data,{preview=false,fileUrl=p=>p,event=()=>{},select=()=>{},input=()=>{},acceptInput=()=>true}={}){
  if(!validWidgetAsset(data))throw Error('위젯 에셋 검증 실패');
  const elements=new Map(),controls=new Map(),root=data.nodes.find(n=>!n.parent),document=host.ownerDocument;
  const frame=document.createElement('div');frame.className='hb-ui-safe-area';if(data.safeArea)for(const [index,side] of ['top','right','bottom','left'].entries())frame.style[side]=`calc(env(safe-area-inset-${side}, 0px) + ${data.safeAreaPadding?.[index]||0}px)`;const canvas=document.createElement('div');canvas.className='hb-ui-canvas';frame.append(canvas);host.replaceChildren(frame);let scale=1;
  const images=new Map();
  const updateImages=()=>{for(const {img,node} of images.values()){const p=node.properties,source=widgetImageSource(p,scale,document.defaultView.devicePixelRatio||1);if(img.dataset.asset!==source){img.dataset.asset=source;if(source)img.src=fileUrl(source);else img.removeAttribute('src');}img.style.objectFit=p.imageFit||'contain';img.style.imageRendering=/\.svg$/i.test(source)?'auto':p.imageRendering||'auto';img.hidden=!source;}};
  const enabled=node=>{let at=node;while(at){if(!at.properties.enabled)return false;at=data.nodes.find(n=>n.id===at.parent);}return true;};
  const build=node=>{
    const p={...widgetDefaults,...node.properties},tag={Button:'button',TouchButton:'button',Image:'img',Slider:'input',TextInput:'input',CheckBox:'label'}[node.type]||'div',element=document.createElement(tag);
    element.className='hb-ui-element hb-ui-'+node.type;element.dataset.widgetId=node.id;element.dataset.widgetName=node.name;element.title=p.tooltip;
    if(node.type==='Slider'){element.type='range';element.setAttribute('aria-label',node.name);}
    if(node.type==='TextInput'){element.type='text';element.setAttribute('aria-label',node.name);element.placeholder=p.placeholder;element.maxLength=p.maxLength;}
    if(node.type==='Image'){element.alt=p.text;element.draggable=false;images.set(node.id,{img:element,node});}
    if(['Button','TouchButton'].includes(node.type)){const img=document.createElement('img');img.alt='';img.draggable=false;img.className='hb-ui-button-image';element.append(img);images.set(node.id,{img,node});if(node.type==='Button'){const label=document.createElement('span');label.className='hb-ui-button-label';element.append(label);}}
    if(node.type==='CheckBox'){const input=document.createElement('input');input.type='checkbox';input.setAttribute('aria-label',p.text||node.name);const text=document.createElement('span');element.append(input,text);}
    if(node.type==='ProgressBar'){element.setAttribute('role','progressbar');element.setAttribute('aria-label',node.name);const fill=document.createElement('div');fill.className='hb-ui-progress-fill';element.append(fill);}
    const parent=data.nodes.find(n=>n.id===node.parent),s=node.slot;
    if(node.parent&&['Canvas','Panel'].includes(parent.type)){
      const [ax,ay,bx,by]=s.anchors,[x,y,w,h]=s.offset;
      Object.assign(element.style,{position:'absolute',left:`calc(${ax*100}% + ${x}px)`,top:`calc(${ay*100}% + ${y}px)`,width:ax===bx?`${Math.max(0,w)}px`:`max(0px, calc(${(bx-ax)*100}% - ${x+w}px))`,height:ay===by?`${Math.max(0,h)}px`:`max(0px, calc(${(by-ay)*100}% - ${y+h}px))`,transform:`translate(${-s.alignment[0]*100}%,${-s.alignment[1]*100}%)`});
    }else if(node.parent){Object.assign(element.style,{position:'relative',width:s.fill?'auto':`${Math.max(0,s.offset[2])}px`,height:s.fill&&parent.type==='VerticalBox'?'auto':`${Math.max(0,s.offset[3])}px`,flex:s.fill?`${s.fill} 1 0`:'0 0 auto'});}
    else Object.assign(element.style,{position:'absolute',inset:'0',width:'100%',height:'100%'});
    Object.assign(element.style,{zIndex:String(s.zIndex),fontSize:p.fontSize+'px',color:p.color,background:p.background,border:`${p.borderWidth}px solid ${p.borderColor}`,borderRadius:p.radius+'px',padding:widgetContainers.has(node.type)?p.padding+'px':'0',gap:p.gap+'px',textAlign:p.align,whiteSpace:p.wrap?'pre-wrap':'nowrap',gridTemplateColumns:node.type==='Grid'?`repeat(${p.columns}, minmax(0,1fr))`:'none'});
    for(const key of ['accent','hover','pressed'])element.style.setProperty('--ui-'+key,p[key]);
    element.tabIndex=preview?-1:p.focusable&&['Button','TouchButton','Slider','TextInput','CheckBox','ScrollBox'].includes(node.type)?0:-1;
    const control=node.type==='CheckBox'?element.querySelector('input'):element;
    const signal=type=>{if(preview||!enabled(node)||!node.properties.visible)return;if(['changed','click','submit'].includes(type)){if(node.type==='Slider')node.properties.value=Number(control.value);if(node.type==='CheckBox')node.properties.checked=control.checked;if(node.type==='TextInput')node.properties.text=control.value;}event(node,type);};
    if(virtualTypes.has(node.type)&&preview)drawVirtualControl(element,node);
    if(virtualTypes.has(node.type)&&!preview)controls.set(node.id,bindVirtualControl(element,node,{input,event:signal,accept:()=>acceptInput()&&enabled(node)&&node.properties.visible}));
    if(node.type==='CheckBox'){element.tabIndex=-1;control.tabIndex=preview||!p.focusable?-1:0;}
    if(!preview){control.addEventListener('click',()=>signal('click'));control.addEventListener(node.type==='CheckBox'?'change':'input',()=>signal('changed'));control.addEventListener('focus',()=>signal('focus'));control.addEventListener('blur',()=>signal('blur'));control.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter'&&node.type==='TextInput')signal('submit');});element.addEventListener('pointerdown',e=>e.stopPropagation());element.addEventListener('wheel',e=>e.stopPropagation());}
    else element.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();select(node,e);});
    elements.set(node.id,element);for(const child of data.nodes.filter(n=>n.parent===node.id))element.append(build(child));return element;
  };
  canvas.append(build(root));
  const update=()=>{for(const node of data.nodes){const el=elements.get(node.id),p=node.properties,control=node.type==='CheckBox'?el.querySelector('input'):el,active=enabled(node);const device=p.deviceVisibility||virtualDefaults.deviceVisibility,touch=(document.defaultView.navigator.maxTouchPoints||0)>0||document.defaultView.matchMedia?.('(any-pointer: coarse)').matches;el.hidden=!p.visible||!preview&&(device==='touch'&&!touch||device==='mouse'&&touch);const controlState=controls.get(node.id);if((!active||el.hidden)&&controlState)controlState.reset();controlState?.update();el.style.opacity=String(p.opacity);el.classList.toggle('is-disabled',!active);el.setAttribute('aria-disabled',String(!active));if('disabled' in control)control.disabled=!active;if(node.type==='Text')el.textContent=p.text;if(node.type==='Button')el.querySelector('.hb-ui-button-label').textContent=p.text;if(node.type==='Image')el.alt=p.text;if(node.type==='TextInput'&&control.value!==p.text)control.value=p.text;if(node.type==='CheckBox'){control.checked=p.checked;el.querySelector('span').textContent=p.text;}if(node.type==='Slider'){el.min=p.min;el.max=p.max;el.step=p.step;el.value=p.value;}if(node.type==='ProgressBar'){const t=clamp((p.value-p.min)/(p.max-p.min),0,1);el.firstElementChild.style.width=t*100+'%';el.setAttribute('aria-valuemin',p.min);el.setAttribute('aria-valuemax',p.max);el.setAttribute('aria-valuenow',p.value);}}updateImages();};
  const resize=()=>{const w=frame.clientWidth||host.clientWidth||data.referenceSize[0],h=frame.clientHeight||host.clientHeight||data.referenceSize[1];scale=widgetScale(data,data.scaleRule?host.clientWidth||w:w,data.scaleRule?host.clientHeight||h:h);Object.assign(canvas.style,{width:w/scale+'px',height:h/scale+'px',zoom:String(scale)});canvas.dataset.uiScale=String(scale);updateImages();};
  const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;observer?.observe(host);observer?.observe(frame);const window=document.defaultView;window.addEventListener('resize',resize);resize();update();
  return {elements,data,update,resetControls:emit=>{for(const control of controls.values())control.reset(emit);},endFrame:()=>{for(const control of controls.values())control.endFrame();},dispose(){observer?.disconnect();window.removeEventListener('resize',resize);for(const control of controls.values())control.dispose();frame.remove();}};
}

export class WidgetSystem {
  constructor(hooks={}){this.hooks=hooks;this.instances=new Map();this.events=[];this.disposed=false;}
  key(owner,instance){return JSON.stringify([owner,instance]);}
  state(owner,instance){const state=this.instances.get(this.key(owner,instance));if(!state)throw Error('위젯 인스턴스를 찾을 수 없어요: '+instance);return state;}
  node(state,name){const node=state.data.nodes.find(n=>n.id===name||n.name===name);if(!node)throw Error('위젯 요소가 없어요: '+name);return node;}
  sync(state,vm){const owner=vm.object(state.owner);if(!owner)return;owner.gameplayDebug??={};owner.gameplayDebug.ui??={};owner.gameplayDebug.ui[state.instance]=Object.fromEntries(state.data.nodes.map(n=>[n.name,{type:n.type,...n.properties,value:n.type==='CheckBox'?Number(n.properties.checked):n.properties.value}]));}
  async operation(key,a,b,vm){
    if(!key.startsWith('ui'))return undefined;
    const owner=!a.target||a.target==='self'?b.self:a.target;if(!vm.object(owner))throw Error('위젯 소유 오브젝트가 없어요.');
    if(key==='uiShow'){
      if(typeof a.instance!=='string'||!a.instance||a.instance.length>80)throw Error('위젯 인스턴스 이름을 확인하세요.');
      const data=await this.hooks.readAsset(a.asset);if(this.disposed)return {};if(!validWidgetAsset(data))throw Error('위젯 에셋 검증 실패');if(!this.instances.has(this.key(owner,a.instance))&&this.instances.size>=32)throw Error('위젯 인스턴스 제한 초과');
      this.remove(owner,a.instance,vm);const state={owner,instance:a.instance,data:structuredClone(data)};this.instances.set(this.key(owner,a.instance),state);
      const overlay=this.hooks.overlay?.();if(overlay){const host=overlay.ownerDocument.createElement('div');host.className='hb-ui-host';host.dataset.widgetInstance=a.instance;overlay.append(host);state.host=host;state.view=renderWidgetTree(host,state.data,{fileUrl:this.hooks.fileUrl,input:(key,value,source)=>{if(vm.active&&!vm.paused&&!vm.stopping)vm.dispatchInput({key,value,source}).catch(error=>this.hooks.error?.(error));},acceptInput:()=>vm.active&&!vm.paused&&!vm.stopping,event:(node,type)=>{this.sync(state,vm);if(node.events[type]){if(this.events.length>=256)this.events.shift();this.events.push({state,node:node.id,event:node.events[type],type,text:node.properties.text,value:node.type==='CheckBox'?Number(node.properties.checked):node.properties.value});}}});}
      this.sync(state,vm);return {};
    }
    if(key==='uiRemove'){this.remove(owner,a.instance,vm);return {};}
    const state=this.state(owner,a.instance),node=this.node(state,a.element),p=node.properties;
    if(key==='uiGetText')return {return:p.text};if(key==='uiGetValue')return {return:node.type==='CheckBox'?Number(p.checked):p.value};
    if(key==='uiSetText'){if(typeof a.text!=='string'||a.text.length>10000)throw Error('위젯 텍스트 길이 초과');p.text=a.text;}
    else if(key==='uiSetValue'){if(!Number.isFinite(a.value))throw Error('위젯 값은 유한한 수여야 해요.');p.value=clamp(a.value,p.min,p.max);if(node.type==='CheckBox')p.checked=Boolean(a.value);}
    else if(key==='uiSetVisible')p.visible=Boolean(a.visible);
    else if(key==='uiSetEnabled')p.enabled=Boolean(a.enabled);
    else if(key==='uiFocus'){const el=state.view?.elements.get(node.id);(el?.querySelector('input')||el)?.focus();}
    else throw Error('위젯 함수가 없어요: '+key);
    state.view?.update();this.sync(state,vm);return {};
  }
  remove(owner,instance,vm){const key=this.key(owner,instance),state=this.instances.get(key);if(!state)return;state.view?.dispose();state.host?.remove();this.instances.delete(key);this.events=this.events.filter(e=>e.state!==state);const ui=vm.object(owner)?.gameplayDebug?.ui;if(ui)delete ui[instance];}
  removeOwner(owner,vm){for(const state of [...this.instances.values()])if(state.owner===owner)this.remove(owner,state.instance,vm);}
  releaseInput(){for(const state of this.instances.values())state.view?.resetControls(false);}
  async tick(vm){
    const queued=this.events.splice(0);for(const e of queued){if(this.disposed||this.instances.get(this.key(e.state.owner,e.state.instance))!==e.state)continue;for(const b of vm.bindings.filter(b=>b.self===e.state.owner))await vm.custom(b,e.event,{widget:e.state.instance,element:e.node,type:e.type,text:e.text,value:e.value});}
    for(const state of [...this.instances.values()]){if(!vm.object(state.owner)){this.remove(state.owner,state.instance,vm);continue;}const binding=vm.bindings.find(b=>b.self===state.owner);for(const node of state.data.nodes)for(const [property,variable] of Object.entries(node.bindings)){const symbol=binding?.root.variables.find(v=>v.id===variable||v.name===variable),key=symbol?.id||variable;if(!variable||!binding?.variables.has(key))continue;const value=binding.variables.get(key);if(property==='text')node.properties.text=String(value).slice(0,10000);else if(property==='value'&&Number.isFinite(value))node.properties.value=clamp(value,node.properties.min,node.properties.max);else if(['visible','enabled','checked'].includes(property)&&typeof value==='boolean')node.properties[property]=value;}state.view?.update();state.view?.endFrame();this.sync(state,vm);}
  }
  dispose(){this.disposed=true;for(const state of this.instances.values()){state.view?.dispose();state.host?.remove();}this.instances.clear();this.events=[];}
}
