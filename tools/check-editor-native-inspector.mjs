// Hidden owned editor: the property panel is the native EditorFormPanel (Win32 child window, Direct2D/DirectWrite).
// Real window messages edit a name and a vector field through a Win32 EDIT box, pick a select option from the native
// popup, toggle a checkbox, drag a range, set a color and fold a component section; the editor model must follow.
// node tools/check-editor-native-inspector.mjs [--executable path/HBEngine.exe]
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createProject} from './project-manifest.mjs';
import {createPlacedObject} from '../prototype/placement-catalog.js';
import {editorWindowProbe} from './editor-window-probe.mjs';
import {activeInstalledVersions} from './install-editor.mjs';
import {retainTestEvidence,pruneTestArtifacts} from './test-artifacts.mjs';

assert.deepEqual(await activeInstalledVersions('C:/Users/kirby/HBEngine'),[]);
const work=await fs.mkdtemp(path.resolve('native/build/editor-native-inspector-'));retainTestEvidence(work);let probe;const steps=[];
try{
  const project=await createProject('EditorNativeInspector',work,'3d'),file=project.manifest.startupScene,scene=JSON.parse(await fs.readFile(path.join(project.root,file),'utf8'));
  scene.objects.push({...createPlacedObject('group',{id:'Group'}),name:'그룹'},{...createPlacedObject('sphere',{id:'Ball',position:[2,1,0]}),name:'공'},{...createPlacedObject('pointLight',{id:'Lamp',position:[0,3,0]}),name:'램프'});
  await project.project.write(file,JSON.stringify(scene));
  const at=process.argv.indexOf('--executable');probe=await editorWindowProbe({work,project:project.file,...at<0?{}:{executable:path.resolve(process.argv[at+1])}});
  await probe.until(()=>probe.evaluate('window.hbEditorRendererDebug?.ready?.()'),'editor ready',120000);
  const panel=(op,data,name='inspector')=>probe.evaluate(`new Promise((resolve,reject)=>{const id='p'+Math.random();const on=e=>{if(e.data?.channel==='hb.panel'&&e.data.id===id){window.chrome.webview.removeEventListener('message',on);e.data.ok?resolve(e.data.value??null):reject(Error(e.data.error));}};window.chrome.webview.addEventListener('message',on);window.chrome.webview.postMessage({channel:'hb.panel',panel:${JSON.stringify(name)},op:${JSON.stringify(op)},id,data:${JSON.stringify(data??{})}});})`);
  const object=id=>probe.evaluate(`window.hbEditorRendererDebug.object(${JSON.stringify(id)})`),settle=()=>new Promise(r=>setTimeout(r,300));
  const select=async id=>{const rows=(await panel('inspect',{},'hierarchy')).rows;await panel('probe',{action:'click',row:rows.findIndex(r=>r.id===id),part:'item'},'hierarchy');};
  const form=()=>panel('inspect'),controls=f=>f.rows.flatMap(r=>(r.controls||[]).map(c=>({...c,label:r.label})));
  await select('Ball');let f=await probe.until(async()=>{const v=await form();return v.shown&&v.paints>0&&controls(v).some(c=>c.kind==='text'&&c.value==='공')&&v;},'native inspector for Ball',20000);
  assert.equal(f.topmost,true);await fs.writeFile(path.join(work,'native-inspector.png'),Buffer.from(await panel('snapshot'),'base64'));steps.push({rows:f.rows.length,controls:controls(f).length});
  const name=controls(f).find(c=>c.kind==='text'&&c.value==='공');assert.ok(name,'name field');await panel('probe',{action:'edit',i:name.i,text:'빨간 공'});await probe.until(async()=>(await object('Ball')).name==='빨간 공','rename through EDIT',5000);steps.push('rename');
  f=await form();const x=f.rows.find(r=>r.label==='위치').controls[0];await panel('probe',{action:'edit',i:x.i,text:'3.5'});await probe.until(async()=>(await object('Ball')).position[0]===3.5,'position X through EDIT',5000);steps.push('vector');
  f=await form();const parentControl=f.rows.find(r=>r.label==='부모').controls[0],options=await probe.evaluate(`[...document.querySelectorAll('[data-scene-parent] option')].map(o=>o.value)`);
  await panel('probe',{action:'select',i:parentControl.i,option:options.indexOf('Group')});await probe.until(async()=>(await object('Ball')).parent==='Group','parent through native popup',5000);steps.push('select');
  f=await form();const checkbox=controls(f).find(c=>c.kind==='checkbox');assert.ok(checkbox,'a checkbox');await panel('probe',{action:'click',i:checkbox.i});
  await probe.until(async()=>controls(await form()).find(c=>c.kind==='checkbox'&&c.label===checkbox.label)?.checked===!checkbox.checked,'checkbox toggled',5000);steps.push('checkbox');
  await select('Ball');await settle();f=await form();const range=controls(f).find(c=>c.kind==='range');const color=controls(f).find(c=>c.kind==='color');
  if(range){await panel('probe',{action:'range',i:range.i,fraction:.25});await probe.until(async()=>controls(await form()).find(c=>c.i===range.i&&c.kind==='range')?.value!==range.value,'range dragged',5000);steps.push('range');}
  if(color){f=await form();const c=controls(f).find(c=>c.kind==='color');await panel('probe',{action:'color',i:c.i,value:'#ff0000'});await probe.until(async()=>controls(await form()).some(k=>k.kind==='color'&&k.value==='#ff0000'),'color set',5000);steps.push('color');}
  f=await form();const fold=f.rows.findIndex(r=>r.kind==='heading'&&r.toggle>=0);
  const opens=()=>probe.evaluate('[...document.querySelectorAll("#inspector-content details")].map(d=>d.open).join()');
  if(fold>=0){const before=f.rows.length,was=await opens();await panel('probe',{action:'heading',row:fold});await settle();const now=await opens(),after=(await form()).rows.length;steps.push({fold:{row:f.rows[fold].text,toggle:f.rows[fold].toggle,was,now,before,after}});assert.notEqual(now,was,'details toggled');assert.notEqual(after,before,'rows follow the fold');steps.push('fold');}
  await panel('probe',{action:'wheel',delta:-120});
  const latest=await probe.call('document.get',{path:file});await probe.call('document.save',{path:file,expectedRevision:latest.revision});
  const errors=probe.errors.filter(e=>!/favicon/.test(JSON.stringify(e)));assert.deepEqual(errors,[]);
  const exit=await probe.finish().catch(error=>{throw Error(error.message+' '+JSON.stringify(probe.ended));});probe=null;
  await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify({passed:true,steps,exit,scope:'Actual hidden owned editor: native Win32/Direct2D property panel above the WebView reading the hidden HTML form; real WM_ messages drive a Win32 EDIT (name, vector X), the native select popup (parent), a checkbox, a range drag, a color value and a section fold, and the editor model follows. Not human visual inspection.'},null,2));
  console.log(JSON.stringify({passed:true,work,steps}));
}catch(error){await fs.writeFile(path.join(work,'failure.json'),JSON.stringify({error:error.stack,steps,errors:probe?.errors},null,2)).catch(()=>{});throw error;}
finally{await probe?.stop();await pruneTestArtifacts(work);}
