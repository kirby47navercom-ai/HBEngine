import {deformableParticleCount,validDeformableMassWeights} from './deformable-distribution.js';
import {ropeShape} from './cloth-config.js';
const W=264,M=12,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const grid=p=>ropeShape(p)?{columns:p.particles,rows:1}:{columns:p.columns,rows:p.rows};
export const clothMassBrushDefaults=()=>({radius:2,strength:1,weight:2,falloff:'smooth'});
export class ClothMassBrushStroke{
 constructor(p,rows,settings={}){
  this.grid=grid(p);this.count=deformableParticleCount(p);this.settings={...clothMassBrushDefaults(),...settings};const s=this.settings;
  if(!validDeformableMassWeights({...p,massWeights:rows})||this.count>65536||!Number.isSafeInteger(this.grid.columns)||this.grid.columns<2||!Number.isSafeInteger(this.grid.rows)||this.grid.rows<1||!Number.isFinite(s.radius)||s.radius<.5||s.radius>128||!Number.isFinite(s.strength)||s.strength<0||s.strength>1||!Number.isFinite(s.weight)||s.weight<.001||s.weight>1000||!['smooth','linear','constant'].includes(s.falloff))throw Error('질량 브러시의 범위·강도·가중치를 확인하세요.');
  this.rows=rows;this.original=new Map(rows.map(r=>[r.index,r.weight]));this.values=new Map(this.original);this.influences=new Map();this.previous=null;
 }
 stamp(x,y){
  const {columns,rows}=this.grid,s=this.settings,r=s.radius,[a,b]=this.previous||[x,y],dx=x-a,dy=y-b,length=dx*dx+dy*dy;
  for(let u=Math.max(0,Math.ceil(Math.min(a,x)-r));u<=Math.min(columns-1,Math.floor(Math.max(a,x)+r));u++)for(let v=Math.max(0,Math.ceil(Math.min(b,y)-r));v<=Math.min(rows-1,Math.floor(Math.max(b,y)+r));v++){
   const projection=length?clamp(((u-a)*dx+(v-b)*dy)/length,0,1):0,distance=Math.hypot(u-a-dx*projection,v-b-dy*projection);if(distance>r)continue;const t=1-distance/r,falloff=s.falloff==='constant'?1:s.falloff==='linear'?t:t*t*(3-2*t),influence=s.strength*falloff,index=u*rows+v;
   if(influence<=(this.influences.get(index)||0))continue;this.influences.set(index,influence);const start=this.original.get(index)??1,value=Math.round(clamp(start+(s.weight-start)*influence,.001,1000)*1e6)/1e6;
   if(value===1)this.values.delete(index);else this.values.set(index,value);
  }
 }
 dab(x,y){
  if(!Number.isFinite(x)||!Number.isFinite(y))throw Error('브러시 위치를 확인하세요.');x=clamp(x,0,this.grid.columns-1);y=clamp(y,0,this.grid.rows-1);
  this.stamp(x,y);this.previous=[x,y];return this;
 }
 result(){if(this.values.size===this.original.size&&[...this.values].every(([i,v])=>this.original.get(i)===v))return this.rows;return [...this.values].sort((a,b)=>a[0]-b[0]).map(([index,weight])=>({index,weight}));}
}
function location(index,g,h){return [M+Math.floor(index/g.rows)*(W-2*M)/(g.columns-1),g.rows===1?h/2:M+(index%g.rows)*(h-2*M)/(g.rows-1)];}
export function clothMassHeat(rows,g,h){const paths=new Map();for(const {index,weight}of rows){const c=weight<1?'#70b8ef':weight<=2?'#e4ba7a':weight<=8?'#eb9659':'#e77353',[x,y]=location(index,g,h);paths.set(c,(paths.get(c)||'')+'M'+x.toFixed(2)+','+y.toFixed(2)+'h.01');}return [...paths].map(([color,d])=>'<path d="'+d+'" stroke="'+color+'" stroke-width="5" stroke-linecap="round"/>').join('');}
export function clothMassBrushControls(p,attrs,esc,{disabled=false}={}){
 const g=grid(p),h=g.rows===1?64:170,off=disabled?' disabled':'',id='mass-grid-'+attrs.replace(/[^a-zA-Z0-9]/g,'');
 return '<details class="cloth-mass-brush" data-mass-columns="'+g.columns+'" data-mass-rows="'+g.rows+'" data-mass-height="'+h+'"><summary>질량 브러시</summary><div class="component-vector">'+
 [['radius','반경',2,.5,128,.5],['strength','강도',1,0,1,.1],['weight','가중치',2,.001,1000,.1]].map(([key,label,value,min,max,step])=>'<label>'+label+'<input type="number" data-mass-brush-setting="'+key+'" value="'+value+'" min="'+min+'" max="'+max+'" step="'+step+'" aria-label="브러시 '+label+'"'+off+'></label>').join('')+'</div><label>감쇠<select data-mass-brush-setting="falloff" aria-label="브러시 감쇠"'+off+'><option value="smooth">부드럽게</option><option value="linear">선형</option><option value="constant">일정</option></select></label>'+
 '<button type="button" data-mass-brush-grid data-mass-active="0" style="height:'+h+'px" aria-label="질량 칠하기 입자 0"'+off+'><svg viewBox="0 0 '+W+' '+h+'" preserveAspectRatio="none" aria-hidden="true"><defs><pattern id="'+id+'" x="12" y="'+(g.rows===1?h/2:M)+'" width="'+((W-2*M)/(g.columns-1))+'" height="'+(g.rows===1?h:(h-2*M)/(g.rows-1))+'" patternUnits="userSpaceOnUse"><circle r="1.2" fill="#66717d"/></pattern></defs><rect x="10" y="10" width="244" height="'+(h-20)+'" fill="url(#'+id+')"/><g data-mass-brush-heat>'+clothMassHeat(p.massWeights||[],g,h)+'</g><ellipse data-mass-brush-cursor fill="none" stroke="#f0f3f7" visibility="hidden"/></svg></button><span data-mass-brush-position>입자 0 · 파랑 가벼움 · 주황 무거움</span></details>';
}
const installs=new WeakMap();
export function installClothMassBrush(doc,{error=()=>{}}={}){
 if(installs.has(doc))return installs.get(doc);let active=null;const listeners=[];
 const listen=(target,name,fn)=>{target?.addEventListener(name,fn,true);listeners.push(()=>target?.removeEventListener(name,fn,true));};
 const context=button=>{const root=button.closest('.cloth-mass-brush'),owner=root.closest('.cloth-mass-editor'),input=owner.querySelector('[data-cloth-mass-change]'),settings=Object.fromEntries([...root.querySelectorAll('[data-mass-brush-setting]')].map(el=>[el.dataset.massBrushSetting,el.dataset.massBrushSetting==='falloff'?el.value:Number(el.value)]));return{button,root,input,settings,g:{columns:Number(root.dataset.massColumns),rows:Number(root.dataset.massRows)},h:Number(root.dataset.massHeight)};};
 const select=(c,x,y)=>{const index=Math.round(x)*c.g.rows+Math.round(y),[cx,cy]=location(index,c.g,c.h),cursor=c.button.querySelector('[data-mass-brush-cursor]');c.button.dataset.massActive=String(index);c.button.setAttribute('aria-label','질량 칠하기 입자 '+index);c.root.querySelector('[data-mass-brush-position]').textContent='입자 '+index+' · 파랑 가벼움 · 주황 무거움';for(const[key,value]of Object.entries({cx,cy,rx:c.settings.radius*(W-2*M)/(c.g.columns-1),ry:c.g.rows===1?8:c.settings.radius*(c.h-2*M)/(c.g.rows-1),visibility:'visible'}))cursor.setAttribute(key,value);};
 const paint=c=>{c.button.querySelector('[data-mass-brush-heat]').innerHTML=clothMassHeat(c.stroke.result(),c.g,c.h);};
 const release=c=>{try{if(c.pointer!==undefined&&c.button.hasPointerCapture?.(c.pointer))c.button.releasePointerCapture(c.pointer);}catch{}};
 const cancel=()=>{if(!active)return;const c=active;active=null;c.button.querySelector('[data-mass-brush-heat]').innerHTML=clothMassHeat(JSON.parse(c.before),c.g,c.h);release(c);};
 const guarded=fn=>event=>{try{fn(event);}catch(e){cancel();error(e.message);}};
 const begin=button=>{const c=context(button);c.before=c.input.value;c.stroke=new ClothMassBrushStroke({columns:c.g.columns,rows:c.g.rows},JSON.parse(c.before),c.settings);return c;};
 const point=(c,e)=>{const r=c.button.getBoundingClientRect();if(!(r.width>0&&r.height>0))throw Error('브러시 영역 크기를 확인하세요.');return [clamp(((e.clientX-r.left)/r.width*W-M)/(W-2*M)*(c.g.columns-1),0,c.g.columns-1),c.g.rows===1?0:clamp(((e.clientY-r.top)/r.height*c.h-M)/(c.h-2*M)*(c.g.rows-1),0,c.g.rows-1)];};
 const commit=c=>{if(c.button.disabled||c.input.isConnected===false||c.input.value!==c.before)throw Error('칠하는 동안 컴포넌트가 바뀌었어요. 다시 칠하세요.');const next=c.stroke.result();if(JSON.stringify(next)===c.before)return;c.input.value=JSON.stringify(next);c.input.dispatchEvent(new doc.defaultView.Event('change',{bubbles:true}));const replacement=[...doc.querySelectorAll('[data-cloth-mass-change]')].find(el=>el.dataset.sceneComponent===c.input.dataset.sceneComponent&&el.dataset.componentProperty===c.input.dataset.componentProperty&&el.dataset.componentField===c.input.dataset.componentField),root=replacement?.closest('.cloth-mass-editor')?.querySelector('.cloth-mass-brush');if(root){root.open=true;for(const el of root.querySelectorAll('[data-mass-brush-setting]'))el.value=String(c.settings[el.dataset.massBrushSetting]);const button=root.querySelector('[data-mass-brush-grid]');select({...c,root,button},...(c.stroke.previous||[0,0]));button.focus({preventScroll:true});}};
 const consume=e=>{e.preventDefault();e.stopPropagation();};
 listen(doc,'pointerdown',guarded(e=>{const button=e.target.closest?.('[data-mass-brush-grid]');if(!button||button.disabled||e.button!==0)return;cancel();const c=begin(button);c.pointer=e.pointerId;active=c;button.setPointerCapture?.(e.pointerId);const p=point(c,e);c.stroke.dab(...p);select(c,...p);paint(c);consume(e);}));
 listen(doc,'pointermove',guarded(e=>{const c=active;if(!c||c.pointer!==e.pointerId)return;const p=point(c,e);c.stroke.dab(...p);select(c,...p);paint(c);consume(e);}));
 listen(doc,'pointerup',guarded(e=>{const c=active;if(!c||c.pointer!==e.pointerId)return;const p=point(c,e);c.stroke.dab(...p);paint(c);active=null;release(c);try{commit(c);}catch(err){c.button.querySelector('[data-mass-brush-heat]').innerHTML=clothMassHeat(JSON.parse(c.before),c.g,c.h);throw err;}consume(e);}));
 for(const name of ['pointercancel','lostpointercapture'])listen(doc,name,e=>{if(active?.pointer===e.pointerId)cancel();});
 listen(doc,'keydown',guarded(e=>{if(e.key==='Escape'&&active){cancel();consume(e);return;}const button=e.target.closest?.('[data-mass-brush-grid]');if(!button||button.disabled||e.repeat&&[' ','Enter'].includes(e.key))return;const c=context(button),index=Number(button.dataset.massActive)||0,x=Math.floor(index/c.g.rows),y=index%c.g.rows,step={ArrowLeft:[x-1,y],ArrowRight:[x+1,y],ArrowUp:[x,y-1],ArrowDown:[x,y+1],Home:[0,0],End:[c.g.columns-1,c.g.rows-1]}[e.key];if(step){select(c,clamp(step[0],0,c.g.columns-1),clamp(step[1],0,c.g.rows-1));consume(e);}else if([' ','Enter'].includes(e.key)){cancel();const c=begin(button);c.stroke.dab(x,y);commit(c);consume(e);}}));
 listen(doc.defaultView,'blur',cancel);listen(doc,'visibilitychange',()=>{if(doc.hidden)cancel();});
 const dispose=()=>{cancel();for(const remove of listeners)remove();installs.delete(doc);};installs.set(doc,dispose);return dispose;
}
export const clothMassBrushContract=Object.freeze({fields:clothMassBrushDefaults(),scope:'Cloth grid, Cloth rope and Rope2D massWeights only; no motion-distance constraints or partial pinning.',stroke:'Continuous grid-space falloff; strongest influence from original weights per particle per stroke. No repeated stationary-event buildup. Exact swept pointer segments; one existing validated scene/BP change and Undo per completed stroke. Weight1 erases sparse override.',lifetime:'Owner document pointer capture, Escape/cancel/lost capture/blur cancel without authoring; changed/detached owner rejects commit. No frame timer/worker/runtime paint pass.',execution:'Existing normalized per-particle mass distribution and queued componentSetJson / hb::Components::SetText. Cold rest-state rebuild on mass edit; total mass unchanged. Heat SVG retains bounded path elements, no DOM per particle.'});
