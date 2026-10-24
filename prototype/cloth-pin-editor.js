import {clothPins,ropeShape} from './cloth-config.js';
const W=264,M=12;
function gridConfig(p){return ropeShape(p)?{...p,columns:p.particles,rows:1}:p;}
function location(index,columns,rows,h){return{x:M+Math.floor(index/rows)*(W-2*M)/(columns-1),y:rows===1?h/2:M+(index%rows)*(h-2*M)/(rows-1)};}
export function clothPinControls(properties,attrs,esc,{disabled=false}={}){
 const p=gridConfig(properties),h=p.rows===1?64:170,pins=clothPins(p),id='cloth-grid-'+attrs.replace(/[^a-zA-Z0-9]/g,''),off=disabled?' disabled':'';
 let path='';for(const index of pins){const{x,y}=location(index,p.columns,p.rows,h);path+='M'+x.toFixed(2)+','+y.toFixed(2)+'h.01';}
 return '<div class="cloth-pin-editor" data-cloth-columns="'+p.columns+'" data-cloth-rows="'+p.rows+'" data-cloth-pin-mode="'+p.pinMode+'" data-cloth-height="'+h+'">'+
 '<input type="hidden" '+attrs+' data-cloth-pin-change value="'+esc(JSON.stringify(p.pinOverrides))+'">'+
 '<button type="button" data-cloth-pin-grid data-cloth-active="0" style="height:'+h+'px" aria-label="입자 고정 편집"'+off+'><svg viewBox="0 0 '+W+' '+h+'" preserveAspectRatio="none" aria-hidden="true">'+
 '<defs><pattern id="'+id+'" x="12" y="'+(p.rows===1?h/2:12)+'" width="'+((W-2*M)/(p.columns-1))+'" height="'+(p.rows===1?h:(h-2*M)/(p.rows-1))+'" patternUnits="userSpaceOnUse"><circle r="1.2" fill="#66717d"/></pattern></defs>'+
 '<rect x="10" y="10" width="244" height="'+(h-20)+'" fill="url(#'+id+')"/><path d="'+path+'" stroke="#79b6e8" stroke-width="5" stroke-linecap="round"/><circle data-cloth-pin-cursor r="5" fill="none" stroke="#f0f3f7" stroke-width="1" visibility="hidden"/></svg></button>'+
 '<div class="cloth-pin-summary"><span>'+pins.size+' / '+p.columns*p.rows+' 고정</span><button type="button" data-cloth-pin-clear'+off+'>재정의 초기화</button></div></div>';
}
function select(root,index){const grid=root.querySelector('[data-cloth-pin-grid]'),h=Number(root.dataset.clothHeight),columns=Number(root.dataset.clothColumns),rows=Number(root.dataset.clothRows),{x,y}=location(index,columns,rows,h),cursor=grid.querySelector('[data-cloth-pin-cursor]');grid.dataset.clothActive=String(index);grid.setAttribute('aria-label','입자 '+index+' 고정 편집');cursor.setAttribute('cx',x);cursor.setAttribute('cy',y);cursor.setAttribute('visibility','visible');}
export function handleClothPinKey(event){
 const grid=event.target.closest?.('[data-cloth-pin-grid]');if(!grid||grid.disabled)return false;
 const root=grid.closest('.cloth-pin-editor'),rows=Number(root.dataset.clothRows),columns=Number(root.dataset.clothColumns),current=Number(grid.dataset.clothActive)||0;
 const steps={ArrowLeft:-rows,ArrowRight:rows,ArrowUp:-1,ArrowDown:1,Home:-current,End:rows*columns-1-current};
 if(Object.hasOwn(steps,event.key)){select(root,Math.max(0,Math.min(rows*columns-1,current+steps[event.key])));event.preventDefault();event.stopPropagation();return true;}
 if(event.key===' '||event.key==='Enter'){event.preventDefault();event.stopPropagation();grid.click();return true;}return false;
}
export function handleClothPinClick(event){
 const button=event.target.closest?.('[data-cloth-pin-grid],[data-cloth-pin-clear]');if(!button||button.disabled)return false;
 const root=button.closest('.cloth-pin-editor'),input=root.querySelector('[data-cloth-pin-change]'),columns=Number(root.dataset.clothColumns),rows=Number(root.dataset.clothRows),pinMode=root.dataset.clothPinMode;
 let overrides=JSON.parse(input.value),index=0;
 if(button.hasAttribute('data-cloth-pin-clear'))overrides=[];
 else{
  if(event.detail===0)index=Number(button.dataset.clothActive)||0;
  else{const rect=button.getBoundingClientRect(),h=Number(root.dataset.clothHeight),u=Math.max(0,Math.min(columns-1,Math.round(((event.clientX-rect.left)/rect.width*W-M)/(W-2*M)*(columns-1)))),v=Math.max(0,Math.min(rows-1,Math.round(((event.clientY-rect.top)/rect.height*h-M)/(h-2*M)*(rows-1))));index=u*rows+v;}
  const pinned=!clothPins({columns,rows,pinMode,pinOverrides:overrides}).has(index);overrides=overrides.filter(row=>row.index!==index);overrides.push({index,pinned});
 }
 input.value=JSON.stringify(overrides);event.preventDefault();event.stopPropagation();input.dispatchEvent(new Event('change',{bubbles:true}));
 // A scene/BP edit may rebuild the inspector. Keep keyboard focus on its replacement.
 const match=[...input.ownerDocument.querySelectorAll('[data-cloth-pin-change]')].find(el=>el.dataset.sceneComponent===input.dataset.sceneComponent&&el.dataset.componentProperty===input.dataset.componentProperty);
 if(match){const replacement=match.closest('.cloth-pin-editor');select(replacement,index);replacement.querySelector('[data-cloth-pin-grid]').focus({preventScroll:true});}
 return true;
}
