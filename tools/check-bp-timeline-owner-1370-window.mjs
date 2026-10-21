import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {clipboardFixture} from './curve-clipboard-fixture-1345.mjs';
import {makeNode,validBlueprint} from '../prototype/blueprint-model.js';
import {createProject} from './project-manifest.mjs';
import {editorWindowProbe} from './editor-window-probe.mjs';
import {activeInstalledVersions} from './install-editor.mjs';
import {retainTestEvidence,pruneTestArtifacts} from './test-artifacts.mjs';

assert.deepEqual(await activeInstalledVersions('C:/Users/kirby/HBEngine'),[]);
const work=await fs.mkdtemp(path.resolve('native/build/bp-timeline-owner-1370-window-'));
retainTestEvidence(work);let probe;
try {
  const at=process.argv.indexOf('--executable'),executable=at<0?null:path.resolve(process.argv[at+1]);
  const record=await createProject('TimelineOwner1370',work,'3d'),fixture=clipboardFixture();
  let bpPath=record.manifest.startupBlueprint;
  const timeline=fixture.bp.nodes.find(n=>n.id==='Timeline'),sink={...makeNode('setPosition'),id:'Sink'};
  timeline.timeline.tracks.push({id:'Vector',name:'Vector',type:'vec3',interpolation:'linear',keys:[{time:0,value:[1,2,3]}]});
  fixture.bp.nodes.push(sink);
  const wire={from:{node:'Timeline',pin:'Vector'},to:{node:'Sink',pin:'position'}};
  fixture.bp.edges.push(wire);assert(validBlueprint(fixture.bp));
  await record.project.write(bpPath,JSON.stringify(fixture.bp));
  probe=await editorWindowProbe({work,project:record.file,...executable?{executable}:{}});
  const {call,evaluate}=probe,get=()=>call('document.get',{path:bpPath});
  const open=async()=>{await call('document.open',{path:bpPath});await evaluate(`document.querySelector('.bp-node[data-node="Timeline"]').dispatchEvent(new MouseEvent('dblclick',{bubbles:true}))`);await probe.until(()=>evaluate('!!document.querySelector(".timeline-editor")'),'timeline open',5000);};
  await open();
  // Replace the graph through Undo before removing the track: captured old root must not win.
  let doc=await get();await call('document.patch',{path:bpPath,expectedRevision:doc.revision,operations:[{op:'add',path:'/nodes/0/title',value:'Temporary'}]});
  doc=await get();await call('editor.undo',{path:bpPath,expectedRevision:doc.revision});
  await evaluate(`document.querySelector('.timeline-editor [data-track="Vector"]').click();document.querySelector('.timeline-editor [data-remove-track]').click()`);
  doc=await get();assert(!doc.data.nodes.find(n=>n.id==='Timeline').timeline.tracks.some(t=>t.id==='Vector'));
  assert(!doc.data.edges.some(e=>e.from.node==='Timeline'&&e.from.pin==='Vector'),'removed output wire persisted');
  await call('editor.undo',{path:bpPath,expectedRevision:doc.revision});
  doc=await get();assert(doc.data.nodes.find(n=>n.id==='Timeline').timeline.tracks.some(t=>t.id==='Vector'));
  assert(doc.data.edges.some(e=>e.from.node==='Timeline'&&e.from.pin==='Vector'),'one Undo must restore track and wire');
  await call('editor.redo',{path:bpPath,expectedRevision:doc.revision});
  doc=await get();assert(!doc.data.edges.some(e=>e.from.node==='Timeline'&&e.from.pin==='Vector'));
  await call('document.save',{path:bpPath,expectedRevision:doc.revision});
  // Rename through the real content browser dialog, then close and reopen the owned timeline.
  await call('project.browser.view',{settings:{folder:bpPath.split('/').slice(0,-1).join('/'),selected:[bpPath]}});
  await evaluate(`document.querySelector('[data-project-grid]').dispatchEvent(new KeyboardEvent('keydown',{key:'F2',bubbles:true}));`);
  await probe.until(()=>evaluate('!!document.querySelector("dialog input[aria-label=이름]")'),'rename dialog',5000);
  await evaluate(`(()=>{const d=document.querySelector('dialog input[aria-label=이름]');d.value='BP_Renamed1370';d.form.requestSubmit();})()`);
  bpPath=bpPath.split('/').slice(0,-1).join('/')+'/BP_Renamed1370.hbblueprint.json';
  await probe.until(async()=>{try{return (await get()).path===bpPath;}catch{return false;}},'renamed live document',10000);
  await evaluate(`(async()=>{const{timelineEditorAt}=await import('/prototype/timeline-editor.js');window.__closedTimeline=timelineEditorAt(document.querySelector('.timeline-editor'));})()`);
  await call('window.close',{id:'timeline:'+bpPath+':Timeline'});
  assert(await evaluate(`(async()=>{const{timelineEditorAt}=await import('/prototype/timeline-editor.js');return window.__closedTimeline.disposed&&timelineEditorAt(window.__closedTimeline.el)===null&&!document.contains(window.__closedTimeline.el);})()`));
  await open();
  assert(await evaluate(`(async()=>{const{timelineEditorAt}=await import('/prototype/timeline-editor.js');return timelineEditorAt(document.querySelector('.timeline-editor'))!==window.__closedTimeline;})()`),'reopen reused disposed editor');
  doc=await get();assert(!doc.data.edges.some(e=>e.from.node==='Timeline'&&e.from.pin==='Vector'));
  await probe.capture('timeline-owner-undo-rename.png');
  const exit=await probe.finish();probe=null;
  await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify({passed:true,installedDirectory:executable?path.dirname(executable):null,checks:{currentGraphAfterUndo:true,trackAndWireSingleUndoRedo:true,save:true,realBrowserRename:true,renamedCloseDisposes:true,reopenFreshEditor:true},exit,scope:'Owned hidden editor: track deletion after graph replacement removes live wire and saves one Undo; real content-browser rename followed by timeline close releases map/listener/observer/WeakMap; reopening creates a fresh usable editor. User windows/clipboard/profiles untouched.'},null,2));
  console.log(JSON.stringify({passed:true,work}));
} catch(error) {
  await fs.writeFile(path.join(work,'failure.json'),JSON.stringify({error:error.stack,diagnostics:await probe?.diagnostics()},null,2));throw error;
} finally {await probe?.stop();await pruneTestArtifacts(work);}
