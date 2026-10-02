import {storageKey,storage} from './project-session.js';
const leaf=(tabs,active=tabs[0])=>({tabs,active});
const zones=new Set(['center','left','right','top','bottom']);
export const defaultDockRatio=(height=globalThis.innerHeight??900)=>Math.max(.60,Math.min(.82,1-300/Math.max(400,height-110)));
const layoutLeaves=n=>n.tabs?[n]:[...layoutLeaves(n.a),...layoutLeaves(n.b)];
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
/** The tab strip always merges. Edge targets only split the pane's content. */
export function dockDropZone(rect,point,{tabStrip=false,explicitZone}={}){
  if(zones.has(explicitZone))return explicitZone;
  if(tabStrip||point.y-rect.top<=31)return 'center';
  const x=(point.x-rect.left)/Math.max(1,rect.width),y=(point.y-rect.top-31)/Math.max(1,rect.height-31);
  return y<.22?'top':y>.78?'bottom':x<.22?'left':x>.78?'right':'center';
}
/** Moving a tab preserves other split ratios and collapses only empty leaves. */
export function moveLayoutTab(tree,id,target,zone='center'){
  if(!tree||!zones.has(zone)||!layoutLeaves(tree).includes(target))return tree;
  const old=layoutLeaves(tree).find(n=>n.tabs.includes(id));
  if(old===target&&old.tabs.length===1&&zone!=='center')return tree;
  if(old===target&&zone==='center'){target.active=id;return tree;}
  if(old){old.tabs=old.tabs.filter(tab=>tab!==id);if(old.active===id)old.active=old.tabs[0];}
  if(zone==='center'){target.tabs.push(id);target.active=id;}
  else{
    const after=zone==='right'||zone==='bottom',added=leaf([id]),split={axis:zone==='left'||zone==='right'?'row':'column',ratio:.5,a:after?target:added,b:after?added:target};
    if(tree===target)tree=split;
    else{
      const replace=n=>{if(n.tabs)return false;if(n.a===target){n.a=split;return true;}if(n.b===target){n.b=split;return true;}return replace(n.a)||replace(n.b);};
      replace(tree);
    }
  }
  const clean=n=>{if(n.tabs)return n.tabs.length?n:null;const a=clean(n.a),b=clean(n.b);return a&&b?{...n,a,b}:a||b;};
  return clean(tree);
}
export class DockLayout {
  constructor(host,entries,onFocus,options={}){
    this.host=host;this.entries=new Map(entries.map(e=>[e.id,e]));this.onFocus=onFocus;this.options=options;this.parking=document.createElement('div');this.parking.hidden=true;host.after(this.parking);
    this.tree={axis:'column',ratio:defaultDockRatio(),a:leaf(['scene']),b:leaf(['project','console'])};
    try{const ids=new Set(this.entries.keys()),saved=restoreLayout(JSON.parse(storage.getItem(storageKey('hbengine.docks.v2'))),ids);if(validLayout(saved,ids))this.tree=saved;}catch{}
    this.render();
  }
  leaves(n=this.tree){return layoutLeaves(n);}
  paneFor(id){return this.leaves().find(n=>n.tabs.includes(id));}
  focus(id){this.focused=id;this.onFocus?.(id);}
  save(){storage.setItem(storageKey('hbengine.docks.v2'),JSON.stringify(this.tree));this.options.onChange?.(this.tree);}
  add(entry,target,zone='center'){this.entries.set(entry.id,entry);this.open(entry.id,target,zone);}
  open(id,target,zone='center'){
    if(!this.entries.has(id))return;const existing=this.paneFor(id);
    if(this.maximized&&existing!==this.maximized)this.maximized=null;
    if(existing&&zone==='center'&&!target){existing.active=id;this.render();this.focus(id);return;}
    this.move(id,target||this.leaves()[0],zone);
  }
  move(id,target,zone='center'){
    if(!this.entries.has(id)||!zones.has(zone)||!this.leaves().includes(target))return;
    this.tree=moveLayoutTab(this.tree,id,target,zone);this.maximized=null;this.render();this.focus(id);
  }
  close(id){
    const n=this.paneFor(id);if(!n||this.leaves().length===1&&n.tabs.length===1)return;
    n.tabs=n.tabs.filter(tab=>tab!==id);if(n.active===id)n.active=n.tabs[0];
    const clean=tree=>{if(tree.tabs)return tree.tabs.length?tree:null;const a=clean(tree.a),b=clean(tree.b);return a&&b?{...tree,a,b}:a||b;};
    this.tree=clean(this.tree);if(!this.leaves().includes(this.maximized))this.maximized=null;this.render();
    if(this.focused===id)this.focus(this.leaves()[0].active);
  }
  remove(id){
    const pane=this.paneFor(id);if(pane&&this.leaves().length===1&&pane.tabs.length===1&&id!=='scene'&&this.entries.has('scene'))pane.tabs.push('scene');
    this.close(id);if(this.paneFor(id))return;
    this.entries.get(id)?.dispose?.();this.entries.get(id)?.element.remove();this.entries.delete(id);
  }
  visible(id){return (this.maximized?[this.maximized]:this.leaves()).some(n=>n.active===id);}
  reset(){this.maximized=null;this.tree={axis:'column',ratio:defaultDockRatio(),a:leaf(['scene']),b:leaf(['project','console'])};this.render();this.focus('scene');}
  clearDrop(){
    this.host.classList.remove('dock-dragging');
    this.host.querySelectorAll('[data-drop]').forEach(el=>delete el.dataset.drop);
    this.host.querySelectorAll('[data-dock-zone]').forEach(el=>el.classList.remove('active'));
  }
  dropZone(el,event){
    return dockDropZone(el.getBoundingClientRect(),{x:event.clientX,y:event.clientY},{tabStrip:!!event.target.closest('.dock-tabs'),explicitZone:event.target.closest('[data-dock-zone]')?.dataset.dockZone});
  }
  render(){
    this.clearDrop();
    for(const entry of this.entries.values()){entry.element.classList.remove('active');this.parking.append(entry.element);}this.host.replaceChildren();
    const build=n=>{
      const el=document.createElement('div');el.className=n.tabs?'dock-pane':'dock-split';
      if(!n.tabs){
        el.style.flexDirection=n.axis;const a=build(n.a),b=build(n.b),grip=document.createElement('div');grip.className='dock-divider '+n.axis;grip.tabIndex=0;grip.role='separator';grip.ariaLabel='창 크기 조절';a.style.flex=`${n.ratio} 1 0`;b.style.flex=`${1-n.ratio} 1 0`;el.append(a,grip,b);
        const adjust=position=>{const r=el.getBoundingClientRect();n.ratio=Math.min(.9,Math.max(.1,n.axis==='row'?(position-r.left)/r.width:(position-r.top)/r.height));a.style.flex=`${n.ratio} 1 0`;b.style.flex=`${1-n.ratio} 1 0`;this.save();};
        grip.onpointerdown=e=>{e.preventDefault();grip.setPointerCapture(e.pointerId);grip.onpointermove=e=>adjust(n.axis==='row'?e.clientX:e.clientY);grip.onpointerup=grip.onpointercancel=()=>grip.onpointermove=null;};
        grip.onkeydown=e=>{if((n.axis==='row'?['ArrowLeft','ArrowRight']:['ArrowUp','ArrowDown']).includes(e.key)){e.preventDefault();const r=el.getBoundingClientRect();adjust((n.axis==='row'?r.left+n.ratio*r.width:r.top+n.ratio*r.height)+(['ArrowRight','ArrowDown'].includes(e.key)?15:-15));}};
        return el;
      }
      const bar=document.createElement('div');bar.className='dock-tabs';bar.role='tablist';el.onpointerdown=el.onfocusin=()=>this.focus(n.active);
      el.oncontextmenu=event=>{if(event.defaultPrevented||!event.target.closest('.dock-tabs,.panel-heading,.asset-panel-top,.viewport-header,.document-toolbar'))return;event.preventDefault();event.stopPropagation();this.menu(n.active,n,event.clientX,event.clientY);};
      for(const id of n.tabs){
        const entry=this.entries.get(id),button=document.createElement('button');button.className='dock-tab'+(n.active===id?' active':'');button.textContent=entry.title;button.draggable=true;button.dataset.dock=id;button.role='tab';button.setAttribute('aria-selected',String(n.active===id));
        button.onclick=()=>{n.active=id;this.focus(id);this.render();};
        button.ondragstart=event=>{this.drag=id;event.dataTransfer.setData('application/x-hb-window',id);event.dataTransfer.effectAllowed='move';this.host.classList.add('dock-dragging');};
        button.ondragend=()=>{this.drag=null;this.clearDrop();};
        button.ondblclick=()=>{this.maximized=this.maximized===n?null:n;this.render();};
        button.onauxclick=event=>{if(event.button===1){event.preventDefault();event.stopPropagation();this.close(id);}};
        button.oncontextmenu=event=>{event.preventDefault();event.stopPropagation();this.focus(id);this.menu(id,n,event.clientX,event.clientY);};
        bar.append(button);
      }
      const close=document.createElement('button');close.className='dock-close';close.textContent='×';close.ariaLabel='창 닫기';close.disabled=this.leaves().length===1&&n.tabs.length===1;close.onclick=()=>this.close(n.active);bar.append(close);el.append(bar);
      const view=this.entries.get(n.active).element;view.classList.add('active');el.append(view);
      const guide=document.createElement('div');guide.className='dock-drop-guide';guide.setAttribute('aria-hidden','true');
      for(const [zone,label] of [['top','위'],['left','왼쪽'],['center','탭 합치기'],['right','오른쪽'],['bottom','아래']]){const target=document.createElement('span');target.dataset.dockZone=zone;target.textContent=label;guide.append(target);}el.append(guide);
      el.ondragover=event=>{
        if(!this.drag)return;event.preventDefault();event.stopPropagation();event.dataTransfer.dropEffect='move';
        for(const pane of this.host.querySelectorAll('[data-drop]'))if(pane!==el)delete pane.dataset.drop;
        const zone=this.dropZone(el,event);el.dataset.drop=zone;guide.querySelectorAll('[data-dock-zone]').forEach(target=>target.classList.toggle('active',target.dataset.dockZone===zone));
      };
      el.ondragleave=event=>{if(!el.contains(event.relatedTarget))delete el.dataset.drop;};
      el.ondrop=event=>{
        if(!this.drag)return;event.preventDefault();event.stopPropagation();const id=this.drag,zone=this.dropZone(el,event);this.drag=null;this.clearDrop();this.move(id,n,zone);
      };
      return el;
    };
    this.host.append(build(this.maximized||this.tree));this.save();window.dispatchEvent(new Event('resize'));
  }
  menu(id,n,x,y){
    this.dismissMenu?.();document.querySelector('.dock-menu')?.remove();
    const menu=document.createElement('div');menu.className='dock-menu';menu.role='menu';
    const dismiss=()=>{menu.remove();document.removeEventListener('pointerdown',outside);this.dismissMenu=null;};
    const outside=event=>{if(!menu.contains(event.target))dismiss();};this.dismissMenu=dismiss;
    const add=(label,action,disabled=false)=>{const button=document.createElement('button');button.role='menuitem';button.textContent=label;button.disabled=disabled;button.onclick=()=>{dismiss();action();};menu.append(button);};
    if(this.options.createWindow)for(const item of this.options.windows||[{kind:'project',title:'새 콘텐츠 브라우저'},{kind:'viewport',title:'새 뷰포트'},{kind:'console',title:'출력 로그'}])add(item.title,()=>this.options.createWindow(item.kind,{target:n,sourceId:id}));
    for(const target of this.leaves().filter(target=>target!==n))add('탭 합치기 → '+this.entries.get(target.active).title,()=>this.move(id,target,'center'));
    for(const [label,zone] of [['왼쪽으로 분할','left'],['오른쪽으로 분할','right'],['위로 분할','top'],['아래로 분할','bottom']])add(label,()=>this.move(id,n,zone),n.tabs.length===1);
    add('최대화 / 복원',()=>{this.maximized=this.maximized===n?null:n;this.render();});
    add('닫기',()=>this.close(id),this.leaves().length===1&&n.tabs.length===1);
    document.body.append(menu);menu.style.left=Math.max(6,Math.min(x,innerWidth-menu.offsetWidth-6))+'px';menu.style.top=Math.max(6,Math.min(y,innerHeight-menu.offsetHeight-6))+'px';
    document.addEventListener('pointerdown',outside);
    menu.onkeydown=event=>{if(event.key==='Escape'){event.preventDefault();dismiss();}else if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();const buttons=[...menu.querySelectorAll('button:not(:disabled)')],index=buttons.indexOf(document.activeElement);buttons[event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();}};
    menu.querySelector('button:not(:disabled)')?.focus();
  }
}
