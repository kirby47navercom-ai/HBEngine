import assert from 'node:assert/strict';
import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {ListSelection,reorderListItems,listSelectionEvent} from '../prototype/list-selection.js';
import {writeWidgetRowItem,widgetRowBindings} from '../prototype/widget-row.js';
import {createWidgetAsset,addWidget,validWidgetAsset} from '../prototype/ui-assets.js';
export function listEditingFixture1079(){
 const row=createWidgetAsset('EditableRow');row.referenceSize=[600,64];
 for(const [type,name,x,width]of [['TextInput','Name',0,220],['CheckBox','Enabled',230,120],['Slider','Health',360,200]]){const id=addWidget(row,type,{name}),node=row.nodes.find(n=>n.id===id);node.slot.offset=[x,0,width,48];node.events.changed='EditItem';}
 const list=createWidgetAsset('EditableList'),id=addWidget(list,'ListView',{name:'Items'}),node=list.nodes.find(n=>n.id===id);node.slot.offset=[0,0,620,280];node.events.changed='Selection';
 Object.assign(node.properties,{selectionMode:'multiple',reorderable:true,rowWriteback:true,rowHeight:48,rowWidget:'Assets/EditableRow.hbwidget.json',rowBindings:JSON.stringify({Name:{text:'name'},Enabled:{checked:'enabled'},Health:{value:'stats.hp'}}),listItems:JSON.stringify(Array.from({length:80},(_,i)=>({id:'Item'+i,name:'항목 '+i,enabled:i%2===0,stats:{hp:.5}})))});
 return{list,row,files:{'Assets/EditableList.hbwidget.json':list,'Assets/EditableRow.hbwidget.json':row}};
}
export async function checkListEditing1079(){
 const rows=Array.from({length:12},(_,key)=>({key})),model=new ListSelection('multiple');model.choose(rows,2);model.choose(rows,5,{shiftKey:true});assert.deepEqual(model.indices(rows),[2,3,4,5]);model.choose(rows,3,{ctrlKey:true});assert.deepEqual(model.indices(rows),[2,4,5]);model.choose(rows,9,{focusOnly:true});assert.deepEqual(model.indices(rows),[2,4,5]);model.choose(rows,7,{ctrlKey:true,shiftKey:true});assert.deepEqual(model.indices(rows),[2,3,4,5,6,7]);model.configure('single');assert.equal(model.keys.size,1);model.configure('none');model.choose(rows,3);assert.equal(model.keys.size,0);assert.throws(()=>model.configure('invalid'));
 const source=['same','same','c','d','e'],moved=reorderListItems(source,[0,2],5);assert.deepEqual(moved.items,['same','d','e','same','c']);assert.deepEqual(moved.indices,[3,4]);assert.equal(moved.positions.get(0),3);assert.deepEqual(source,['same','same','c','d','e']);assert.equal(reorderListItems(source,[1,2],3).changed,false);assert.throws(()=>reorderListItems(source,[99],0));
 const item={name:'old',enabled:true,stats:{hp:.5},untouched:{token:3}},bindings=widgetRowBindings('{"Name":{"text":"name"},"Enabled":{"checked":"enabled"},"Health":{"value":"stats.hp"}}');
 const edit=(type,name,key,value,source=item)=>writeWidgetRowItem(source,bindings,{type,name,properties:{[key]:value}},'changed');
 const changed=edit('Slider','Health','value',.75);assert.equal(changed.stats.hp,.75);assert.equal(changed.untouched,item.untouched);assert.equal(item.stats.hp,.5);assert.equal(edit('TextInput','Name','text','한글').name,'한글');assert.equal(edit('CheckBox','Enabled','checked',false).enabled,false);assert.equal(edit('Slider','Health','value','wrong'),item);assert.equal(edit('Slider','Health','value',Infinity),item);assert.equal(edit('TextInput','Other','text','ignored'),item);
 for(const invalid of ['__proto__.bad','stats.constructor.bad','stats.prototype.bad'])assert.throws(()=>widgetRowBindings(JSON.stringify({Name:{text:invalid}})));
 assert.equal(writeWidgetRowItem(item,{Name:{text:'missing.field'}},{type:'TextInput',name:'Name',properties:{text:'no'}},'changed'),item);assert.equal(writeWidgetRowItem('old',{Name:{text:'$item'}},{type:'TextInput',name:'Name',properties:{text:'new'}},'changed'),'new');
 const huge=listSelectionEvent({type:'ListView',properties:{selectedIndices:JSON.stringify(Array.from({length:100000},(_,i)=>i))}});assert.equal(huge.selectedCount,100000);assert.equal(huge.selectionTruncated,true);assert.equal(huge.selectedIndices,'[]');
 const f=listEditingFixture1079();assert(validWidgetAsset(f.list));assert(validWidgetAsset(f.row));for(const [key,value]of [['selectionMode','bad'],['selectedIndices','[1,1]'],['selectedItemIds','[1]'],['rowWriteback','true']]){const invalid=structuredClone(f.list);invalid.nodes[1].properties[key]=value;assert(!validWidgetAsset(invalid),key);}
 const work=await fs.mkdtemp(path.resolve('native/build/list-editing-1079-')),proof={passed:true,groups:5,scope:'Pure selection/ranges/modes, stable duplicate-value reorder remap, typed own-path writeback and source sharing, blocked prototype paths, authored widget validation. Browser focus/pooling/editor/runtime separate.'};await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify(proof,null,2));return{work,...proof};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await checkListEditing1079()));
