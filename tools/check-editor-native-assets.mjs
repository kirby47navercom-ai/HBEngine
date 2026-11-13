// Hidden owned editor: the content browser entries are the native EditorListPanel (Win32 child window, Direct2D).
// Real window messages select, Ctrl-select, open a folder, go back with Backspace, run a context-menu entry through the
// native popup (built from the browser's HTML menu) and drag a model out onto the scene viewport, which places it.
// node tools/check-editor-native-assets.mjs [--executable path/HBEngine.exe]
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createProject} from './project-manifest.mjs';
import {editorWindowProbe} from './editor-window-probe.mjs';
import {activeInstalledVersions} from './install-editor.mjs';
import {retainTestEvidence,pruneTestArtifacts} from './test-artifacts.mjs';

assert.deepEqual(await activeInstalledVersions('C:/Users/kirby/HBEngine'),[]);
const work=await fs.mkdtemp(path.resolve('native/build/editor-native-assets-'));retainTestEvidence(work);let probe;const steps=[];
try{
  const project=await createProject('EditorNativeAssets',work,'3d');await fs.copyFile(path.join(project.root,'Assets/Models/Cube.obj'),path.join(project.root,'Assets/Models/Cube2.obj'));
  const at=process.argv.indexOf('--executable');probe=await editorWindowProbe({work,project:project.file,...at<0?{}:{executable:path.resolve(process.argv[at+1])}});
  await probe.until(()=>probe.evaluate('window.hbEditorRendererDebug?.ready?.()'),'editor ready',120000);
  const panel=(op,data)=>probe.evaluate(`new Promise((resolve,reject)=>{const id='p'+Math.random();const on=e=>{if(e.data?.channel==='hb.panel'&&e.data.id===id){window.chrome.webview.removeEventListener('message',on);e.data.ok?resolve(e.data.value??null):reject(Error(e.data.error));}};window.chrome.webview.addEventListener('message',on);window.chrome.webview.postMessage({channel:'hb.panel',panel:'assets',op:${JSON.stringify(op)},id,data:${JSON.stringify(data??{})}});})`);
  const state=()=>probe.evaluate('window.hbEditorRendererDebug.assets()');
  let s=await probe.until(async()=>{const v=await state();return v.entries.length>1&&v;},'content entries',20000);
  const view=await probe.until(async()=>{const v=await panel('inspect');return v.shown&&v.paints>0&&v.items.length===s.entries.length&&v;},'native asset list painted',20000);
  assert.equal(view.topmost,true);await fs.writeFile(path.join(work,'native-assets.png'),Buffer.from(await panel('snapshot'),'base64'));steps.push({items:view.items.length,view:view.view,folder:s.folder});
  const root=s.folder;await panel('probe',{action:'dblclick',index:s.entries.findIndex(e=>e.path==='Assets/Models')});s=await probe.until(async()=>{const v=await state();return v.folder==='Assets/Models'&&v.entries.length>=2&&(await panel('inspect')).items.length===v.entries.length&&v;},'open Models by double click',10000);steps.push('open-folder');
  const files=s.entries.map((e,i)=>({...e,i})).filter(e=>e.kind!=='folder');assert.ok(files.length>=2,'two files to select: '+JSON.stringify(s.entries));
  await panel('probe',{action:'click',index:files[0].i});await probe.until(async()=>JSON.stringify((await state()).selected)===JSON.stringify([files[0].path]),'single select',5000);steps.push('select');
  await panel('probe',{action:'click',index:files[1].i,ctrl:true});await probe.until(async()=>(await state()).selected.length===2,'ctrl select',5000);steps.push('ctrl-select');
  await panel('probe',{action:'click',index:files[0].i});await probe.until(async()=>(await state()).selected.length===1,'back to one selection',5000);
  await panel('probe',{action:'right',index:files[0].i,command:'에셋 정보'});await probe.until(async()=>(await state()).dialogs.length>0,'context menu entry through native popup',8000).catch(async error=>{throw Error(error.message+' menu='+JSON.stringify((await panel('inspect')).lastMenu)+' html='+await probe.evaluate('String(!!document.querySelector(".project-menu"))'));});
  const menu=(await panel('inspect')).lastMenu;steps.push({menuEntries:menu.length});await probe.evaluate('document.querySelectorAll("dialog[open]").forEach(d=>d.close())');steps.push('context-menu');
  const model=files.find(f=>f.kind==='model'),before=(await state()).objects;
  if(model){const target=await probe.evaluate('(()=>{const r=document.querySelector("#scene-canvas").getBoundingClientRect(),d=devicePixelRatio;return {x:Math.round((r.left+r.width/2)*d),y:Math.round((r.top+r.height/2)*d)};})()');
    await panel('probe',{action:'click',index:model.i});await panel('probe',{action:'drag',index:model.i,x:target.x,y:target.y});await probe.until(async()=>(await state()).objects===before+1,'model dropped into the viewport',10000);steps.push('drag-to-viewport');}
  await panel('probe',{action:'key',vk:0x08});await probe.until(async()=>(await state()).folder===root,'Backspace back',5000);steps.push('backspace');
  // Folder tree (second native list) and the toolbars (native single-row forms).
  const other=(name,op,data)=>probe.evaluate(`new Promise((resolve,reject)=>{const id='p'+Math.random();const on=e=>{if(e.data?.channel==='hb.panel'&&e.data.id===id){window.chrome.webview.removeEventListener('message',on);e.data.ok?resolve(e.data.value??null):reject(Error(e.data.error));}};window.chrome.webview.addEventListener('message',on);window.chrome.webview.postMessage({channel:'hb.panel',panel:${JSON.stringify(name)},op:${JSON.stringify(op)},id,data:${JSON.stringify(data??{})}});})`);
  const tree=await probe.until(async()=>{s=await state();const v=await other('folders','inspect');return s.folders.includes('Assets/Materials')&&v.shown&&v.items.length===s.folders.length&&v;},'native folder tree',10000);
  await fs.writeFile(path.join(work,'native-folders.png'),Buffer.from(await other('folders','snapshot'),'base64'));
  await other('folders','probe',{action:'click',index:s.folders.indexOf('Assets/Materials')});await probe.until(async()=>(await state()).folder==='Assets/Materials','folder tree click navigates',5000).catch(async error=>{const v=await other('folders','inspect');throw Error(error.message+' folders='+JSON.stringify(s.folders)+' panel='+JSON.stringify({items:v.items,revision:v.revision,shown:v.shown,rect:v.rect})+' now='+(await state()).folder);});steps.push({folderTree:tree.items.length});
  const tools=await probe.until(async()=>{const v=await other('assets-tools','inspect');return v.shown&&v.rows.length===1&&v;},'native toolbar',10000);await fs.writeFile(path.join(work,'native-tools.png'),Buffer.from(await other('assets-tools','snapshot'),'base64'));
  const toolControls=tools.rows[0].controls;const search=toolControls.find(c=>c.kind==='text');assert.ok(search,'search field');
  await other('assets-tools','probe',{action:'click',i:toolControls.find(c=>c.kind==='button'&&c.i===toolControls.filter(k=>k.kind==='button').at(-1).i).i});await probe.until(async()=>(await state()).view==='tiles','tiles view button',5000);
  await probe.until(async()=>(await panel('inspect')).view==='tiles','native list shows tiles',5000);steps.push('view-tiles');
  await other('assets-tools','probe',{action:'edit',i:search.i,text:'Cube2'});await probe.until(async()=>{const v=await state();return v.query==='Cube2'&&v.entries.length===1;},'search through native EDIT',8000);steps.push('search');
  await other('assets-tools','probe',{action:'edit',i:search.i,text:''});await probe.until(async()=>(await state()).query==='','search cleared',5000);
  const nav=await other('assets-navigation','inspect'),navButtons=nav.rows[0].controls;await other('assets-navigation','probe',{action:'click',i:navButtons[0].i});await probe.until(async()=>(await state()).folder!=='Assets/Materials','back button',5000);steps.push('back-button');
  const status=await probe.until(async()=>{const v=await other('assets-status','inspect');return v.shown&&v.rows[0]?.controls.length>=3&&v;},'native status bar',5000);
  await other('assets-status','probe',{action:'click',i:status.rows[0].controls.at(-1).i});await probe.until(async()=>(await state()).dialogs.length>0,'new folder dialog from native button',5000);await probe.evaluate('document.querySelectorAll("dialog[open]").forEach(d=>d.close())');steps.push({status:status.rows[0].label});
  await panel('probe',{action:'wheel',delta:-120});
  const errors=probe.errors.filter(e=>!/favicon/.test(JSON.stringify(e)));assert.deepEqual(errors,[]);
  const doc=await probe.call('editor.state');for(const d of doc.documents.filter(d=>d.dirty)){const latest=await probe.call('document.get',{path:d.path});await probe.call('document.save',{path:d.path,expectedRevision:latest.revision});}
  const exit=await probe.finish().catch(error=>{throw Error(error.message+' '+JSON.stringify(probe.ended));});probe=null;
  await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify({passed:true,steps,exit,scope:'Actual hidden owned editor: native Win32/Direct2D content browser entry list above the WebView; real WM_ messages drive select, Ctrl-select, the native context menu built from the browser HTML menu (에셋 정보), dragging a model onto the scene viewport (placeAsset through the existing HTML drop), folder open by double click and Backspace back. Folder tree (second native list: click navigates) and toolbars (native single-row forms: tiles view button, search through a Win32 EDIT, back button, new-folder button) are covered too. Not human visual inspection.'},null,2));
  console.log(JSON.stringify({passed:true,work,steps}));
}catch(error){await fs.writeFile(path.join(work,'failure.json'),JSON.stringify({error:error.stack,steps,errors:probe?.errors},null,2)).catch(()=>{});throw error;}
finally{await probe?.stop();await pruneTestArtifacts(work);}
