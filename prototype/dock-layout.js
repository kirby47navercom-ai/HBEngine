const leaf=(tabs,active=tabs[0])=>({tabs,active});
export function restoreLayout(n,ids,depth=0){
  if(!n||depth>12)return null;
  if(Array.isArray(n.tabs)){const tabs=n.tabs.filter(id=>ids.has(id));return tabs.length?leaf(tabs,tabs.includes(n.active)?n.active:tabs[0]):null;}
  if(!['row','column'].includes(n.axis)||!Number.isFinite(n.ratio))return null;
  const a=restoreLayout(n.a,ids,depth+1),b=restoreLayout(n.b,ids,depth+1);return a&&b?{axis:n.axis,ratio:Math.min(.9,Math.max(.1,n.ratio)),a,b}:a||b;
}
export function validLayout(n,ids,seen=new Set(),depth=0){
  if(!n||depth>12)return false;
  if(n.tabs)return Array.isArray(n.tabs)&&n.tabs.length>0&&n.tabs.length<=30&&n.tabs.every(id=>ids.has(id)&&!seen.has(id)&&seen.add(id))&&n.tabs.includes(n.active);
  return ['row','column'].includes(n.axis)&&Number.isFinite(n.ratio)&&n.ratio>=.1&&n.ratio<=.9&&validLayout(n.a,ids,seen,depth+1)&&validLayout(n.b,ids,seen,depth+1);
}
export class DockLayout {
  constructor(host,entries,onFocus){
    this.host=host;this.entries=new Map(entries.map(e=>[e.id,e]));this.onFocus=onFocus;this.parking=document.createElement('div');this.parking.hidden=true;host.after(this.parking);
    this.tree={axis:'column',ratio:.68,a:leaf(['scene','material','animation','blueprint','code']),b:leaf(['project','console'])};
    try{const ids=new Set(this.entries.keys()),saved=restoreLayout(JSON.parse(localStorage.getItem('hbengine.docks.v1')),ids);if(validLayout(saved,ids))this.tree=saved;}catch{}
    this.render();
  }
  leaves(n=this.tree){return n.tabs?[n]:[...this.leaves(n.a),...this.leaves(n.b)];}
  save(){localStorage.setItem('hbengine.docks.v1',JSON.stringify(this.tree));}
  add(entry,target,zone='center'){this.entries.set(entry.id,entry);this.open(entry.id,target,zone);}
  open(id,target,zone='center'){
    if(!this.entries.has(id))return;const existing=this.leaves().find(l=>l.tabs.includes(id));
    if(this.maximized&&existing!==this.maximized)this.maximized=null;
    if(existing&&zone==='center'&&!target){existing.active=id;this.render();this.onFocus?.(id);return;}
    this.move(id,target||this.leaves()[0],zone);
    this.onFocus?.(id);
  }
  replace(old,next,n=this.tree){if(n===old){if(n===this.tree)this.tree=next;return true;}if(n.tabs)return false;if(n.a===old){n.a=next;return true;}if(n.b===old){n.b=next;return true;}return this.replace(old,next,n.a)||this.replace(old,next,n.b);}
  clean(n=this.tree){if(n.tabs)return n.tabs.length?n:null;const a=this.clean(n.a),b=this.clean(n.b);if(!a)return b;if(!b)return a;n.a=a;n.b=b;return n;}
  move(id,target,zone){
    const old=this.leaves().find(l=>l.tabs.includes(id));if(old===target&&old.tabs.length===1&&zone!=='center')return;
    if(old){old.tabs=old.tabs.filter(x=>x!==id);if(old.active===id)old.active=old.tabs[0];}
    if(zone==='center'){target.tabs.push(id);target.active=id;}else{const after=['right','bottom'].includes(zone),node={axis:['left','right'].includes(zone)?'row':'column',ratio:.5,a:after?target:leaf([id]),b:after?leaf([id]):target};this.replace(target,node);}
    this.tree=this.clean();this.render();
  }
  close(id){const l=this.leaves().find(l=>l.tabs.includes(id));if(!l)return;if(this.leaves().length===1&&l.tabs.length===1)return;l.tabs=l.tabs.filter(x=>x!==id);if(l.active===id)l.active=l.tabs[0];this.tree=this.clean();if(!this.leaves().includes(this.maximized))this.maximized=null;this.render();}
  remove(id){const pane=this.leaves().find(l=>l.tabs.includes(id));if(pane&&this.leaves().length===1&&pane.tabs.length===1&&id!=='scene')pane.tabs.push('scene');this.close(id);if(this.leaves().some(l=>l.tabs.includes(id)))return;this.entries.get(id)?.dispose?.();this.entries.get(id)?.element.remove();this.entries.delete(id);}
  visible(id){return (this.maximized?[this.maximized]:this.leaves()).some(l=>l.active===id);}
  reset(){this.maximized=null;this.tree={axis:'column',ratio:.68,a:leaf(['scene','material','animation','blueprint','code']),b:leaf(['project','console'])};this.render();this.onFocus?.('scene');}
  render(){
    for(const e of this.entries.values()){e.element.classList.remove('active');this.parking.append(e.element);}this.host.replaceChildren();
    const build=n=>{
      const el=document.createElement('div');el.className=n.tabs?'dock-pane':'dock-split';
      if(!n.tabs){el.style.flexDirection=n.axis;const a=build(n.a),b=build(n.b),grip=document.createElement('div');grip.className='dock-divider '+n.axis;grip.tabIndex=0;grip.role='separator';grip.ariaLabel='창 크기 조절';a.style.flex=`${n.ratio} 1 0`;b.style.flex=`${1-n.ratio} 1 0`;el.append(a,grip,b);
        const adjust=position=>{const r=el.getBoundingClientRect();n.ratio=Math.min(.9,Math.max(.1,n.axis==='row'?(position-r.left)/r.width:(position-r.top)/r.height));a.style.flex=`${n.ratio} 1 0`;b.style.flex=`${1-n.ratio} 1 0`;this.save();};
        grip.onpointerdown=e=>{grip.setPointerCapture(e.pointerId);grip.onpointermove=e=>adjust(n.axis==='row'?e.clientX:e.clientY);grip.onpointerup=grip.onpointercancel=()=>grip.onpointermove=null;};grip.onkeydown=e=>{if(e.key.startsWith('Arrow')){const r=el.getBoundingClientRect();adjust((n.axis==='row'?r.left+n.ratio*r.width:r.top+n.ratio*r.height)+(['ArrowRight','ArrowDown'].includes(e.key)?15:-15));}};return el;
      }
      const bar=document.createElement('div');bar.className='dock-tabs';el.onpointerdown=()=>this.onFocus?.(n.active);
      for(const id of n.tabs){const e=this.entries.get(id),button=document.createElement('button');button.className='dock-tab'+(n.active===id?' active':'');button.textContent=e.title;button.draggable=true;button.dataset.dock=id;button.onclick=()=>{n.active=id;this.onFocus?.(id);this.render();};button.ondragstart=ev=>{this.drag=id;ev.dataTransfer.setData('application/x-hb-window',id);ev.dataTransfer.effectAllowed='move';};button.ondragend=()=>{this.drag=null;this.host.querySelectorAll('[data-drop]').forEach(el=>delete el.dataset.drop);};button.ondblclick=()=>{this.maximized=this.maximized===n?null:n;this.render();};button.oncontextmenu=ev=>{ev.preventDefault();this.menu(id,n,ev.clientX,ev.clientY);};bar.append(button);}
      const close=document.createElement('button');close.className='dock-close';close.textContent='×';close.ariaLabel='창 닫기';close.onclick=()=>this.close(n.active);bar.append(close);el.append(bar);const view=this.entries.get(n.active).element;view.classList.add('active');el.append(view);
      el.ondragover=e=>{if(!this.drag)return;e.preventDefault();const r=el.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;this.zone=y<.22?'top':y>.78?'bottom':x<.22?'left':x>.78?'right':'center';el.dataset.drop=this.zone;};el.ondragleave=()=>delete el.dataset.drop;el.ondrop=e=>{if(!this.drag)return;e.preventDefault();e.stopPropagation();const id=this.drag;this.drag=null;delete el.dataset.drop;this.move(id,n,this.zone);};return el;
    };this.host.append(build(this.maximized||this.tree));this.save();window.dispatchEvent(new Event('resize'));
  }
  menu(id,n,x,y){
    document.querySelector('.dock-menu')?.remove();const menu=document.createElement('div');menu.className='dock-menu';menu.style.cssText=`left:${Math.min(x,innerWidth-145)}px;top:${Math.min(y,innerHeight-240)}px`;
    for(const [label,zone] of [['왼쪽으로 분할','left'],['오른쪽으로 분할','right'],['위로 분할','top'],['아래로 분할','bottom'],['닫기','close'],['최대화 / 복원','max']]){const b=document.createElement('button');b.textContent=label;b.onclick=()=>{menu.remove();if(zone==='close')this.close(id);else if(zone==='max'){this.maximized=this.maximized===n?null:n;this.render();}else{this.maximized=null;this.move(id,n,zone);}};menu.append(b);}document.body.append(menu);const dismiss=e=>{if(!menu.contains(e.target)){menu.remove();document.removeEventListener('pointerdown',dismiss);}};document.addEventListener('pointerdown',dismiss);
  }
}
