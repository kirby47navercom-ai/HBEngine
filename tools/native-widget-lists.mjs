import {listLayout} from '../prototype/list-layout.js';
import {MeasuredListLayout} from '../prototype/measured-list-layout.js';
import {widgetTextLines,widgetLineHeight} from '../prototype/widget-visual-contract.js';
import {ListSelection,reorderListItems} from '../prototype/list-selection.js';
import {reparentTreeItems,transferListItems,transferTreeItems} from '../prototype/list-transfer.js';
import {paintWidgetText} from './native-widget-paint.mjs';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export class NativeWidgetList {
 constructor(node,{changed=()=>{},invalidate=()=>{}}={}){this.node=node;this.changed=changed;this.revision=0;this.invalidate=()=>{this.revision++;invalidate();};this.tree=node.type==='TreeView';this.expanded=new Set();this.selection=new ListSelection();this.focus=-1;this.layoutBuilds=0;this.measurements=new Map();this.measurementRevision=0;this.update();}
 update(){
  const p=this.node.properties;if(p.rowWidget)throw Error('네이티브 사용자 행 위젯은 아직 지원하지 않아요.');const stamp=[p.listItems,p.rowHeight,p.variableRows,p.autoRows];
  if(!this.stamp||stamp.some((v,i)=>v!==this.stamp[i])){this.items=JSON.parse(p.listItems||'[]');this.measurements.clear();this.measurementRevision++;this.rebuild();this.stamp=stamp;for(const id of this.expanded)if(!this.layout.keys.has(id))this.expanded.delete(id);}
  this.selection.configure(p.selectionMode||'single');const selected=[p.selectedIndex,p.selectedItemId,p.selectedIndices,p.selectedItemIds,p.selectionMode];
  if(!this.selected||selected.some((v,i)=>v!==this.selected[i])){const ids=JSON.parse(p.selectedItemIds||'[]');if(this.tree&&ids.length)this.selection.keys=new Set(ids.filter(id=>this.layout.keys.has(id)));else this.selection.set(this.layout.rows,p.selectionMode==='multiple'?JSON.parse(p.selectedIndices||'[]'):[p.selectedIndex??-1]);if(this.tree&&p.selectedItemId){this.focus=this.layout.rows.findIndex(r=>r.key===p.selectedItemId);if(this.selection.mode==='single')this.selection.keys=new Set(this.layout.keys.has(p.selectedItemId)?[p.selectedItemId]:[]);}else this.focus=clamp(p.selectedIndex??-1,-1,this.layout.rows.length-1);if(this.selection.mode==='none')this.selection.keys.clear();this.selected=selected;this.revision++;}
  return this;
 }
 rebuild(){this.revision++;const p=this.node.properties,base=listLayout(this.items,{tree:this.tree,rowHeight:p.rowHeight||40,variable:p.variableRows||false,expanded:this.expanded});
  this.layout=p.autoRows?Object.assign(new MeasuredListLayout(base,this.measurements),{keys:base.keys}):base;this.layoutBuilds++;}
 notify(info={}){const p=this.node.properties,row=this.layout.rows[this.focus];Object.assign(p,{selectedIndex:this.focus,selectedItemId:this.tree?row?.key||'':'',selectedIndices:JSON.stringify(this.selection.indices(this.layout.rows)),selectedItemIds:JSON.stringify(this.tree?[...this.selection.keys]:[]),value:this.focus,text:row?String(row.item?.text??row.item):''});this.selected=undefined;this.changed({...this.node,...info});this.invalidate();}
 choose(index,event={}){this.update();if(!this.layout.rows[index])return;this.focus=index;this.selection.choose(this.layout.rows,index,event);if(this.selection.mode!=='none')this.notify();else this.invalidate();}
 toggle(index){this.update();const row=this.layout.rows[index];if(!row?.branch)return;const key=this.layout.rows[this.focus]?.key;this.expanded.has(row.key)?this.expanded.delete(row.key):this.expanded.add(row.key);this.rebuild();this.focus=this.layout.rows.findIndex(r=>r.key===key);this.invalidate();}
 offset(index){return this.layout.offset?this.layout.offset(index):this.layout.offsets[index];}
 measureRows(ctx,w,h,scale,font,scroll){
  const p=this.node.properties;
  if(!p.autoRows)return scroll;
  const stamp=[w,scale,font,p.fontSize,p.wrap].join('|');
  if(stamp!==this.measureStamp){
   this.measureStamp=stamp;
   if(this.measurements.size){this.measurements.clear();this.measurementRevision++;this.rebuild();}
  }
  const anchor=this.layout.at(scroll/scale),shift=scroll/scale-this.offset(anchor);
  ctx.save();ctx.font=p.fontSize*scale+'px '+font;
  const range=this.layout.range(scroll/scale,h/scale);
  for(let i=range.start;i<range.end;i++){
   const row=this.layout.rows[i];
   if(this.measurements.has(row.key)||p.variableRows&&row.item?.height!==undefined)continue;
   const indent=(this.tree?(row.depth-1)*16+24:8)*scale;
   const lines=widgetTextLines(String(row.item?.text??row.item),Math.max(1,w-indent-12),p.wrap,text=>ctx.measureText(text).width);
   const height=clamp(Math.max(p.rowHeight||40,lines.length*p.fontSize*widgetLineHeight+12),8,4096);
   this.layout.measure(i,height);this.measurements.set(row.key,height);this.measurementRevision++;
  }
  ctx.restore();
  return (this.offset(anchor)+shift)*scale;
 }
 dragSelection(index){
  this.update();
  const row=this.layout.rows[index];
  if(!row)return null;
  const selected=this.selection.keys.has(row.key);
  return {items:this.items,keys:selected?[...this.selection.keys]:[row.key],indices:selected?this.selection.indices(this.layout.rows):[index]};
 }
 dropLocation(y,scale,offset){
  this.update();
  const at=(y+offset)/scale,index=this.layout.at(at),row=this.layout.rows[index];
  if(!row||at>=this.layout.total)return {parent:'',destination:this.items.length,y:this.layout.total*scale-offset};
  const top=this.offset(index),fraction=(at-top)/row.height;
  if(this.tree&&fraction>=.25&&fraction<.75)return {parent:row.key,destination:row.item.children?.length||0,y:top*scale-offset,h:row.height*scale};
  const after=fraction>=.5;
  return {parent:this.tree?row.parent:'',destination:(this.tree?row.position-1:index)+Number(after),y:(top+(after?row.height:0))*scale-offset};
 }
 click(x,y,scale,offset,event={}){this.update();const index=this.layout.at((y+offset)/scale),row=this.layout.rows[index];if(!row||y+offset>=this.layout.total*scale)return;if(this.tree&&row.branch&&x<((row.depth-1)*16+24)*scale)this.toggle(index);else this.choose(index,event);}
 key(key,modifiers={}){this.update();const rows=this.layout.rows;if(!['arrowup','arrowdown','arrowleft','arrowright','home','end','pageup','pagedown','enter',' ','a'].includes(key))return false;
  if(key==='a'){if(!modifiers.ctrlKey||this.selection.mode!=='multiple')return false;this.selection.set(rows,rows.map((_,i)=>i));if(this.focus<0&&rows.length)this.focus=0;this.notify();return true;}
  if(!rows.length)return true;let index=this.focus;const row=rows[index];
  if(key==='arrowright'){if(!this.tree)return false;if(row?.branch&&!this.expanded.has(row.key)){this.toggle(index);return true;}if(row?.branch)index++;}
  else if(key==='arrowleft'){if(!this.tree)return false;if(row?.branch&&this.expanded.has(row.key)){this.toggle(index);return true;}if(row?.parent)index=rows.findIndex(r=>r.key===row.parent);}
  else if(key==='enter'||key===' '){if(index>=0)this.choose(index,key===' '&&this.selection.mode==='multiple'?{...modifiers,ctrlKey:true}:modifiers);return true;}
  else index=key==='home'?0:key==='end'?rows.length-1:index+(key==='arrowup'?-1:key==='pageup'?-10:key==='pagedown'?10:1);
  this.choose(clamp(index,0,rows.length-1),{...modifiers,focusOnly:modifiers.ctrlKey});return true;
 }
 stage(items,keys,focusKey,info){const layout=listLayout(items,{tree:this.tree,rowHeight:this.node.properties.rowHeight||40,variable:this.node.properties.variableRows||false,expanded:this.expanded}),json=JSON.stringify(items),valid=keys.filter(key=>layout.keys.has(key)),selected=this.selection.mode==='none'?[]:this.selection.mode==='single'?valid.slice(0,1):valid;return{commit:()=>{this.items=items;this.measurements.clear();this.measurementRevision++;this.node.properties.listItems=json;this.stamp=undefined;this.rebuild();this.selection.keys=new Set(selected);this.focus=this.layout.rows.findIndex(r=>r.key===focusKey);},notify:()=>this.notify(info)};}
 moveItems(indices,destination){this.update();if(this.tree)throw Error('일반 목록을 선택하세요.');const result=reorderListItems(this.items,indices,destination);if(!result.changed)return false;const stage=this.stage(result.items,this.selection.indices(this.layout.rows).map(i=>result.positions.get(i)),result.positions.get(this.focus),{listChange:'reordered',reorderFrom:JSON.stringify(indices),reorderTo:destination});stage.commit();stage.notify();return true;}
 reparentItems(ids,parent,destination){this.update();if(!this.tree)throw Error('트리 목록을 선택하세요.');const result=reparentTreeItems(this.items,ids,parent,destination);if(!result.changed)return false;if(parent)this.expanded.add(parent);const stage=this.stage(result.items,[...this.selection.keys],this.layout.rows[this.focus]?.key,{listChange:'reparented',reorderFrom:JSON.stringify(result.from),reorderParent:parent,reorderTo:destination});stage.commit();stage.notify();return true;}
 transferItems(to,selection,parent,destination){this.update();to.update();if(this.tree!==to.tree)throw Error('같은 종류의 목록을 선택하세요.');if(to===this)return this.tree?this.reparentItems(selection,parent,destination):this.moveItems(selection,destination);const result=this.tree?transferTreeItems(this.items,selection,to.items,parent,destination):transferListItems(this.items,selection,to.items,destination),keys=this.tree?[...this.selection.keys]:this.selection.indices(this.layout.rows).flatMap(i=>result.positions.has(i)?[result.positions.get(i)]:[]);if(parent)to.expanded.add(parent);const from=this.stage(result.sourceItems,keys,this.tree?this.layout.rows[this.focus]?.key:result.positions.get(this.focus),{listChange:'transferOut',listPeer:to.node.id}),targetKeys=result.keys||result.indices,toStage=to.stage(result.targetItems,targetKeys,targetKeys[0],{listChange:'transferIn',listPeer:this.node.id});from.commit();toStage.commit();from.notify();toStage.notify();return true;}
 applyMeasurements(rows){
  this.update();
  if(!this.node.properties.autoRows)return;
  const next=new Map(rows);
  if(next.size===this.measurements.size&&rows.every(([id,value])=>this.measurements.get(id)===value))return;
  this.measurements=next;this.rebuild();
 }
 paintState(){this.update();if(this.cachedState?.revision!==this.revision)this.cachedState={revision:this.revision,expanded:[...this.expanded],selection:[...this.selection.keys],focus:this.focus};return this.cachedState;}
 applyPaintState(state){this.update();if(state.expanded.length!==this.expanded.size||state.expanded.some(key=>!this.expanded.has(key))){this.expanded=new Set(state.expanded);this.rebuild();}this.selection.keys=new Set(state.selection);this.focus=state.focus;}
 paint(ctx,w,h,scale,font,offset,drop){this.update();offset=this.measureRows(ctx,w,h,scale,font,offset);const p=this.node.properties,layout=this.layout,max=Math.max(0,layout.total*scale-h),top=clamp(offset,0,max),range=layout.range(top/scale,h/scale);ctx.save();ctx.beginPath();ctx.rect(0,0,w,h);ctx.clip();let painted=0;for(let i=range.start;i<range.end;i++){const row=layout.rows[i],y=this.offset(i)*scale-top,height=row.height*scale;if(y+height<=0||y>=h)continue;ctx.save();ctx.translate(0,y);if(this.selection.keys.has(row.key)){ctx.fillStyle=p.accent;ctx.fillRect(0,0,w,height);}const indent=(this.tree?(row.depth-1)*16+24:8)*scale;if(this.tree&&row.branch){ctx.fillStyle=p.color;ctx.beginPath();const x=indent-14*scale,cy=height/2;if(this.expanded.has(row.key)){ctx.moveTo(x,cy-3*scale);ctx.lineTo(x+8*scale,cy-3*scale);ctx.lineTo(x+4*scale,cy+3*scale);}else{ctx.moveTo(x,cy-4*scale);ctx.lineTo(x+6*scale,cy);ctx.lineTo(x,cy+4*scale);}ctx.fill();}ctx.translate(indent,0);paintWidgetText(ctx,'Text',{...p,text:String(row.item?.text??row.item),padding:4,wrap:p.wrap},Math.max(0,w-indent-12),height,scale,font);ctx.restore();painted++;}if(drop){ctx.strokeStyle=p.color;ctx.lineWidth=Math.max(2,scale);if(drop.h)ctx.strokeRect(1,drop.y+1,w-2,drop.h-2);else{const y=clamp(drop.y,1,h-1);ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}}ctx.restore();this.painted=painted;return {max,offset:top,thumb:Math.min(h,Math.max(24,h*h/Math.max(h,layout.total*scale)))};}
 dispose(){this.items=[];this.measurements.clear();this.expanded.clear();this.selection.keys.clear();this.layout=listLayout([]);}
}
