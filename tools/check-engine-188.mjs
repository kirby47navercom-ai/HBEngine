import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {EditorShortcuts,defaultShortcutData,validShortcutData,normalizeShortcutData,shortcutCommands}from '../prototype/editor-shortcuts.js';
import {assetShortcutKinds,assetShortcutCommands}from '../prototype/asset-shortcut-commands.js';
import {assetShortcutScope,assetShortcutContexts,dispatchAssetShortcut}from '../prototype/asset-shortcuts.js';
import {createAsset,validAsset}from '../prototype/asset-documents.js';
import {makeAnimationNotifyState}from '../prototype/animation-sync.js';
import {SpriteRigEditor}from '../prototype/sprite-rig-editor.js';
import {MaterialEditor}from '../prototype/material-editor.js';
import {makeMaterialNode,copyMaterialNodes}from '../prototype/material-runtime.js';
import {retainTestEvidence}from './test-artifacts.mjs';
const work=await fs.mkdtemp(path.resolve('native/build/engine-188-'));retainTestEvidence(work);const checks=[];
async function check(name,fn){try{await fn();checks.push({name,passed:true});}catch(e){checks.push({name,passed:false,error:e.stack});process.exitCode=1;}}
const key=(code,extra={})=>({code,...extra});
await check('all dedicated default chords resolve only in their active context, with unique commands and no global conflict',()=>{
 const m=new EditorShortcuts();assert.ok(validShortcutData(m.snapshot()));assert.equal(new Set(shortcutCommands.map(c=>c.id)).size,shortcutCommands.length);
 for(const c of assetShortcutCommands)for(const chord of c.keys){const parts=chord.split('+'),event=key(parts.at(-1),{ctrlKey:parts.includes('Primary'),shiftKey:parts.includes('Shift'),altKey:parts.includes('Alt')});assert.equal(m.resolve(event,{scope:c.scope,contexts:c.when?[c.when]:[]}).command?.id,c.id);assert.notEqual(m.resolve(event,{scope:'other'}).command?.id,c.id);}
 for(const [kind,scope]of Object.entries(assetShortcutKinds)){assert.equal(assetShortcutScope({id:'asset'},kind,'asset'),scope);assert.equal(assetShortcutScope({id:'asset'},kind,'other'),'other');}assert.equal(assetShortcutScope({id:'asset'},'animgraph','asset',{closest:()=>({})}),'other');
});
await check('remaps suppress old shifted and unshifted keys while keeping different editors independent',()=>{
 const m=new EditorShortcuts();m.assign('materialDuplicate',['Primary+KeyL']);m.assign('rigToolBone',['KeyO']);assert.equal(m.resolve(key('KeyD',{ctrlKey:true}),{scope:'material'}).consume,true);assert.equal(m.resolve(key('KeyD',{ctrlKey:true}),{scope:'material'}).command,undefined);assert.equal(m.resolve(key('KeyL',{ctrlKey:true}),{scope:'material'}).command.id,'materialDuplicate');assert.equal(m.resolve(key('KeyW',{shiftKey:true}),{scope:'rig'}).command,undefined);assert.equal(m.resolve(key('KeyO'),{scope:'rig'}).command.id,'rigToolBone');assert.equal(m.resolve(key('KeyW'),{scope:'viewport'}).command.id,'moveTool');assert.equal(m.resolve(key('KeyD',{ctrlKey:true}),{scope:'blueprint'}).command.id,'duplicate');
});
await check('text, IME, dialogs, flight and game input ownership prevent editor mutations',()=>{
 const m=new EditorShortcuts();for(const c of assetShortcutCommands.filter(c=>c.keys.length&&!c.when)){const chord=c.keys[0].split('+'),event=key(chord.at(-1),{ctrlKey:chord.includes('Primary'),shiftKey:chord.includes('Shift'),altKey:chord.includes('Alt')});for(const options of [{editing:true},{dialog:true},{navigating:true},{running:true}])assert.notEqual(m.resolve(event,{scope:c.scope,...options}).command?.id,c.id);assert.equal(m.resolve({...event,isComposing:true},{scope:c.scope}).command,undefined);}assert.equal(m.resolve(key('KeyW'),{scope:'viewport',running:true}).consume,false);assert.equal(m.resolve(key('Delete'),{scope:'material',running:true}).consume,true);assert.equal(m.resolve(key('KeyS',{ctrlKey:true}),{scope:'curve',editing:true}).command.id,'save');
});
await check('old explicit global keys preserve profiles and disable newly conflicting implicit defaults',()=>{
 const data=defaultShortcutData();data.active='old';data.profiles.push({id:'old',name:'사용자',bindings:{save:['Delete'],delete:[],undo:['Home']}});const old=structuredClone(data),next=normalizeShortcutData(data);assert.deepEqual(data,old);assert.ok(validShortcutData(next));const m=new EditorShortcuts(next);assert.equal(m.snapshot().active,'old');assert.deepEqual(m.keys('save'),['Delete']);assert.deepEqual(m.keys('materialDelete'),['Backspace']);assert.deepEqual(m.keys('curveDelete'),[]);assert.deepEqual(m.keys('curveFit'),['KeyA']);assert.deepEqual(m.keys('sequenceFirst'),[]);
});
await check('notify shortcuts preserve the selected resize handle, exact frame step, validation and unrelated data',()=>{
 const data=createAsset('montage','Montage');data.notifyStates=[makeAnimationNotifyState('Window',.2,.4)];const n=data.notifyStates[0],other=structuredClone(data.sections),element={dataset:{selectItem:n.id},focus(){},querySelector(){return this;}},target={dataset:{notifyResize:'start'},closest:()=>element},e={doc:{kind:'montage',data},element:{querySelectorAll:()=>[element]},hooks:{running:()=>false},change(fn){fn(data);assert.ok(validAsset('montage',data));}};assert.deepEqual(assetShortcutContexts(e,{target}),['notify']);const end=n.time+n.duration;assert.equal(dispatchAssetShortcut('notifyRightFast',e,{target}),true);assert.ok(Math.abs(n.time-(.2+10/60))<1e-9);assert.ok(Math.abs(n.time+n.duration-end)<1e-9);assert.deepEqual(data.sections,other);assert.equal(dispatchAssetShortcut('notifyDelete',e,{target}),true);assert.equal(data.notifyStates.length,0);
});
await check('rig clipboard is shared by original and reassigned commands, copies values and preserves metadata',()=>{
 const source={doc:{kind:'spriterig',data:createAsset('spriterig','Source')},copy:SpriteRigEditor.prototype.copy};source.doc.data.bones[0].length=3;assert.equal(dispatchAssetShortcut('rigCopy',source),true);source.doc.data.bones[0].length=5;const target={doc:{kind:'spriterig',data:createAsset('spriterig','Target')},change(fn){fn(this.doc.data);assert.ok(validAsset('spriterig',this.doc.data));},paste:SpriteRigEditor.prototype.paste};assert.equal(dispatchAssetShortcut('rigPaste',target),true);assert.equal(target.doc.data.bones[0].length,3);assert.equal(target.doc.data.name,'Target');target.doc.data.bones[0].length=7;assert.equal(source.doc.data.bones[0].length,5);
});
await check('disposed, preview and game guards reject direct dispatch without changing owners',()=>{let calls=0;for(const guard of [{disposed:true},{testing:true},{hooks:{running:()=>true}}]){const editor={doc:{kind:'material'},copySelection:()=>calls++,...guard};assert.equal(dispatchAssetShortcut('materialCopy',editor),false);}assert.equal(calls,0);});
await check('late material clipboard replies never paste into a switched document, disposed editor or running game',async()=>{
 const node=makeMaterialNode('scalar'),clip=copyMaterialNodes({nodes:[node],edges:[]},new Set([node.id]));
 for(const mode of ['switch','dispose','running','success']){
  const original={kind:'material',data:createAsset('material','Original'),view:{}},other={kind:'material',data:createAsset('material','Other'),view:{}};let current=original,resolve,changes=0,running=false;
  const e={get doc(){return current;},document:{defaultView:{navigator:{clipboard:{readText:()=>new Promise(r=>resolve=r)}}}},pan:{x:0,y:0},zoom:1,render(){},hooks:{running:()=>running,before(){},change:()=>changes++},mutate:MaterialEditor.prototype.mutate};const count=original.data.graph.nodes.length,pending=MaterialEditor.prototype.pasteSelection.call(e);
  if(mode==='switch')current=other;if(mode==='dispose')e.disposed=true;if(mode==='running')running=true;resolve(JSON.stringify(clip));await pending;
  assert.equal(changes,mode==='success'?1:0,mode);assert.equal(original.data.graph.nodes.length,count+(mode==='success'?1:0),mode);assert.equal(other.data.name,'Other');
 }
});
const result={passed:checks.filter(c=>c.passed).length,total:checks.length,commands:assetShortcutCommands.length,checks,newDependencies:0,newTimers:0};await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({work,...result}));
