// Hidden owned editor: the outliner is the native EditorTreePanel (Win32 child window, Direct2D/DirectWrite).
// Real window messages drive select, multi-select, visibility/lock toggles, fold, drag reparent, native context menu and keys.
// node tools/check-editor-native-hierarchy.mjs [--executable path/HBEngine.exe]
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createProject} from './project-manifest.mjs';
import {createPlacedObject} from '../prototype/placement-catalog.js';
import {editorWindowProbe} from './editor-window-probe.mjs';
import {activeInstalledVersions} from './install-editor.mjs';
import {retainTestEvidence,pruneTestArtifacts} from './test-artifacts.mjs';

assert.deepEqual(await activeInstalledVersions('C:/Users/kirby/HBEngine'),[]);
const work=await fs.mkdtemp(path.resolve('native/build/editor-native-hierarchy-'));retainTestEvidence(work);let probe;const steps=[];
try{
  const project=await createProject('EditorNativeHierarchy',work,'3d'),file=project.manifest.startupScene,scene=JSON.parse(await fs.readFile(path.join(project.root,file),'utf8'));
  scene.objects.push({...createPlacedObject('group',{id:'Group'}),name:'그룹'},{...createPlacedObject('cube',{id:'Child',position:[0,1,0]}),name:'자식 큐브',parent:'Group'},{...createPlacedObject('sphere',{id:'Ball',position:[2,1,0]}),name:'공'});
  await project.project.write(file,JSON.stringify(scene));
  const at=process.argv.indexOf('--executable');probe=await editorWindowProbe({work,project:project.file,...at<0?{}:{executable:path.resolve(process.argv[at+1])}});
  await probe.until(()=>probe.evaluate('window.hbEditorRendererDebug?.ready?.()'),'editor ready',120000);
  const panel=(op,data)=>probe.evaluate(`new Promise((resolve,reject)=>{const id='p'+Math.random();const on=e=>{if(e.data?.channel==='hb.panel'&&e.data.id===id){window.chrome.webview.removeEventListener('message',on);e.data.ok?resolve(e.data.value??null):reject(Error(e.data.error));}};window.chrome.webview.addEventListener('message',on);window.chrome.webview.postMessage({channel:'hb.panel',op:${JSON.stringify(op)},id,data:${JSON.stringify(data??{})}});})`);
  const state=()=>probe.evaluate('window.hbEditorRendererDebug.hierarchy()'),settle=()=>new Promise(r=>setTimeout(r,250));
  let lastInspect;const inspect=await probe.until(async()=>{const v=lastInspect=await panel('inspect');steps.splice(0,steps.length,{waiting:v});return v.shown&&v.paints>0&&v.rows.length>=7&&v.paintedRows>0&&v;},'native panel painted',20000);
  assert.equal(inspect.topmost,true,'panel window is above the WebView');const domRows=await probe.evaluate('document.querySelectorAll("#hierarchy-list [data-scene-row]").length');assert.equal(domRows,0,'HTML rows are not drawn');
  await fs.writeFile(path.join(work,'native-hierarchy.png'),Buffer.from(await panel('snapshot'),'base64'));
  const rowOf=async id=>(await panel('inspect')).rows.findIndex(r=>r.id===id);steps.push({initial:inspect.rows.map(r=>r.name),rect:inspect.rect,paintMS:inspect.lastPaintMS});
  await panel('probe',{action:'click',row:await rowOf('Ball'),part:'item'});await settle();let s=await state();assert.deepEqual(s.selected,['Ball']);steps.push('select');
  await panel('probe',{action:'click',row:await rowOf('Group'),part:'item',ctrl:true});await settle();s=await state();assert.deepEqual(new Set(s.selected),new Set(['Ball','Group']));steps.push('ctrl-select');
  await panel('probe',{action:'click',row:await rowOf('Ball'),part:'eye'});await settle();s=await state();assert.equal(s.objects.find(o=>o.id==='Ball').visible,false);steps.push('hide');
  await panel('probe',{action:'click',row:await rowOf('Ball'),part:'lock'});await settle();s=await state();assert.equal(s.objects.find(o=>o.id==='Ball').locked,true);steps.push('lock');
  const before=(await panel('inspect')).rows.length;await panel('probe',{action:'click',row:await rowOf('Group'),part:'fold'});await settle();s=await state();assert.ok(s.collapsed.includes('Group'));assert.equal((await panel('inspect')).rows.length,before-1,'folded child row hidden');
  await panel('probe',{action:'click',row:await rowOf('Group'),part:'fold'});await settle();assert.equal((await panel('inspect')).rows.length,before);steps.push('fold');
  await panel('probe',{action:'drag',row:await rowOf('Ball'),to:await rowOf('Group')});await settle();s=await state();assert.equal(s.objects.find(o=>o.id==='Ball').parent,'Group');steps.push('drag-reparent');
  await panel('probe',{action:'drag',row:await rowOf('Ball'),to:-1});await settle();s=await state();assert.equal(s.objects.find(o=>o.id==='Ball').parent,'');steps.push('drag-to-root');
  // Context menu: 7th entry of the selection menu is 복제 (scene:duplicate).
  await panel('probe',{action:'click',row:await rowOf('Child'),part:'item'});await settle();const count=(await state()).objects.length;
  await panel('probe',{action:'right',row:await rowOf('Child'),part:'item',menuIndex:7});await probe.until(async()=>(await state()).objects.length===count+1,'native menu duplicate',5000);
  const menu=(await panel('inspect')).lastMenu;assert.equal(menu[6],'scene:duplicate');steps.push('context-menu');
  await panel('probe',{action:'key',vk:0x2E});await probe.until(async()=>(await state()).objects.length===count,'Delete key from native panel',5000);steps.push('delete-key');
  // Header rows are native single-row forms: quick-add button, search through a Win32 EDIT, titles.
  const form=(name,op,data)=>probe.evaluate(`new Promise((resolve,reject)=>{const id='p'+Math.random();const on=e=>{if(e.data?.channel==='hb.panel'&&e.data.id===id){window.chrome.webview.removeEventListener('message',on);e.data.ok?resolve(e.data.value??null):reject(Error(e.data.error));}};window.chrome.webview.addEventListener('message',on);window.chrome.webview.postMessage({channel:'hb.panel',panel:${JSON.stringify(name)},op:${JSON.stringify(op)},id,data:${JSON.stringify(data??{})}});})`);
  const shownForm=name=>probe.until(async()=>{const v=await form(name,'inspect');return v.shown&&v.paints>0&&v.rows.length===1&&v;},name+' shown',10000);
  const heading=await shownForm('hierarchy-heading'),inspectorHeading=await shownForm('inspector-heading'),rootRow=await shownForm('hierarchy-root'),footer=await shownForm('hierarchy-footer'),search=await shownForm('hierarchy-search');
  assert.equal(heading.rows[0].label,'아웃라이너');assert.equal(inspectorHeading.rows[0].text,'속성');assert.match(rootRow.rows[0].text,/개/);
  for(const name of ['hierarchy-heading','hierarchy-search','hierarchy-footer'])await fs.writeFile(path.join(work,'native-'+name+'.png'),Buffer.from(await form(name,'snapshot'),'base64'));
  const total=(await state()).objects.length;await form('hierarchy-footer','probe',{action:'click',i:footer.rows[0].controls[0].i});await probe.until(async()=>(await state()).objects.length===total+1,'quick add from native button',5000);steps.push('quick-add');
  const all=(await panel('inspect')).rows.length;await form('hierarchy-search','probe',{action:'edit',i:search.rows[0].controls[0].i,text:'공'});await probe.until(async()=>{const rows=(await panel('inspect')).rows;return rows.length<all&&rows.some(r=>r.name.includes('공'));},'search filters native rows',5000);
  await form('hierarchy-search','probe',{action:'edit',i:search.rows[0].controls[0].i,text:''});await probe.until(async()=>(await panel('inspect')).rows.length===all,'search cleared',5000);steps.push('search');
  await panel('probe',{action:'wheel',delta:-120});const after=await panel('inspect');
  await probe.evaluate("window.hbEditorRendererDebug.hierarchy()");const latest=await probe.call('document.read',{path:file});await probe.call('document.save',{path:file,expectedRevision:latest.revision});
  const errors=probe.errors.filter(e=>!/favicon/.test(JSON.stringify(e)));assert.deepEqual(errors,[]);
  const exit=await probe.finish().catch(error=>{throw Error(error.message+' '+JSON.stringify(probe.ended));});probe=null;
  await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify({passed:true,steps,final:{paints:after.paints,updates:after.updates,rows:after.rows.length},exit,scope:'Actual hidden owned editor: native Win32/Direct2D outliner window above the WebView; real WM_ mouse/key messages sent to the panel window drive select, Ctrl multi-select, visibility and lock toggles, fold, drag reparent and drag to root, the native TrackPopupMenu path (scripted index) and Delete. Not human visual inspection; HTML rows are no longer drawn.'},null,2));
  console.log(JSON.stringify({passed:true,work,steps:steps.length}));
}catch(error){await fs.writeFile(path.join(work,'failure.json'),JSON.stringify({error:error.stack,steps,errors:probe?.errors},null,2)).catch(()=>{});throw error;}
finally{await probe?.stop();await pruneTestArtifacts(work);}
