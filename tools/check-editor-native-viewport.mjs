// Hidden owned editor: the scene viewport is drawn by the engine's native renderer (Direct3D12 first) behind the transparent WebView.
// node tools/check-editor-native-viewport.mjs [--executable path/HBEngine.exe]
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createProject} from './project-manifest.mjs';
import {createPlacedObject} from '../prototype/placement-catalog.js';
import {createAsset} from '../prototype/asset-documents.js';
import {editorWindowProbe} from './editor-window-probe.mjs';
import {activeInstalledVersions} from './install-editor.mjs';
import {retainTestEvidence,pruneTestArtifacts} from './test-artifacts.mjs';

assert.deepEqual(await activeInstalledVersions('C:/Users/kirby/HBEngine'),[]);
const work=await fs.mkdtemp(path.resolve('native/build/editor-native-viewport-'));retainTestEvidence(work);let probe,stage='launch';
try{
  const project=await createProject('EditorNativeViewport',work,'3d'),file=project.manifest.startupScene,scene=JSON.parse(await fs.readFile(path.join(project.root,file),'utf8'));
  for(let i=0;i<9;i++)scene.objects.push(createPlacedObject(['cube','sphere','torus'][i%3],{id:'shape'+i,position:[(i%3-1)*2,.8,(Math.floor(i/3)-1)*2]}));
  await project.project.write(file,JSON.stringify(scene));
  const animationPath='Assets/Preview.hbanimation.json';
  await project.project.write(animationPath,JSON.stringify(createAsset('animation','Preview')));
  const at=process.argv.indexOf('--executable');probe=await editorWindowProbe({work,project:project.file,...at<0?{}:{executable:path.resolve(process.argv[at+1])}});
  await probe.until(()=>probe.evaluate('window.hbEditorRendererDebug?.ready?.()'),'editor viewport ready',120000);
  // Several frames so presents and draws are counted.
  const viewport=await probe.until(async()=>{const v=await probe.evaluate('window.hbEditorRendererDebug.viewport()');return v?.presents>2&&v;},'native viewport frames',30000);
  assert.equal(viewport.backend,'D3D12');assert.equal(viewport.requestedBackend,'d3d12');assert.ok(viewport.calls>=9,'scene draws reach the native renderer: '+viewport.calls);
  const layout=await probe.evaluate('(()=>{const r=document.querySelector("#scene-canvas").getBoundingClientRect(),d=devicePixelRatio;return {x:r.left*d,y:r.top*d,w:r.width*d,h:r.height*d,windowW:innerWidth*d,windowH:innerHeight*d,body:(()=>{const e=document.createElement("div");e.style.background="var(--bg)";document.body.append(e);const c=getComputedStyle(e).backgroundColor;e.remove();return c;})()};})()');
  const png=await probe.evaluate('window.hbEditorRendererDebug.captureViewport()');await fs.writeFile(path.join(work,'native-surface.png'),Buffer.from(png.split(',')[1],'base64'));
  // The Win32 surface is scoped to the canvas, including when the viewport is detached.
  const pixels=await probe.evaluate(`(async()=>{const i=new Image();i.src=${JSON.stringify(png)};await i.decode();const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const g=c.getContext('2d');g.drawImage(i,0,0);
    const inside=[];for(let k=1;k<8;k++)for(let m=1;m<8;m++)inside.push([...g.getImageData(Math.round(i.width*k/8),Math.round(i.height*m/8),1,1).data]);
    return {size:[i.width,i.height],inside};})()`);
  const distinct=new Set(pixels.inside.map(p=>p.slice(0,3).join(','))).size;
  assert.ok(distinct>=4,'viewport shows shaded geometry, not a flat clear: '+distinct);
  const mainSurface=()=>probe.evaluate('window.hbEditorRendererDebug.surfaces().then(s=>s.find(v=>v.id==="scene-viewport"))');
  const main=await mainSurface();
  assert.deepEqual(pixels.size,main.window.size);
  assert.ok(main.window.size[0]<layout.windowW&&main.window.size[1]<layout.windowH);
  await probe.call('window.detach',{id:'scene'});
  await probe.until(async()=>{const s=await mainSurface();return s.window.visible&&s.window.owner!==main.window.owner&&s.presents>main.presents;},'main D3D12 viewport follows its detached window');
  await probe.call('window.redock',{id:'scene'});
  await probe.until(async()=>{const s=await mainSurface();return s.window.visible&&s.window.owner===main.window.owner;},'main D3D12 viewport returns to the editor');
  const panels=(panel,op,data={})=>probe.evaluate(`new Promise((resolve,reject)=>{
    const id='viewport-test-'+Math.random(),bridge=window.chrome.webview;
    const on=event=>{const m=event.data;if(m?.channel!=='hb.panel'||m.id!==id)return;bridge.removeEventListener('message',on);m.ok?resolve(m.value??null):reject(Error(m.error));};
    bridge.addEventListener('message',on);bridge.postMessage({channel:'hb.panel',id,panel:${JSON.stringify(panel)},op:${JSON.stringify(op)},data:${JSON.stringify(data)}});
  })`);
  const panelShown=name=>probe.until(async()=>{const state=await panels(name,'inspect');return state.shown&&state.paints>0&&state;},name+' painted');
  stage='native menu';
  const menu=await panelShown('main-menu');
  const viewMenu=menu.rows[0].controls.find(c=>c.text==='보기');
  await panels('main-menu','probe',{action:'menu',command:'새 콘텐츠 브라우저'});
  await panels('main-menu','probe',{action:'click',i:viewMenu.i});
  stage='additional browser';
  const list=await panelShown('project:2:assets');
  const tools=await panelShown('project:2:assets-tools');
  assert.ok(tools.rows[0].controls.some(c=>c.icon==='refresh'&&c.text===''&&c.hint));
  stage='detach browser';
  await probe.call('window.detach',{id:'project:2'});
  await probe.until(async()=>{const detached=await panels('project:2:assets','inspect');return detached.shown&&detached.owner!==list.owner;},'additional browser native list in detached window');
  const folders=await panelShown('project:2:folders');
  await panels('project:2:folders','probe',{action:'click',index:folders.items.findIndex(f=>f.name==='Models')});
  await probe.until(()=>probe.evaluate('window.hbEditorRendererDebug.assets("project:2").folder==="Assets/Models"'),'detached folder change');
  stage='redock browser';
  await probe.call('window.redock',{id:'project:2'});
  await probe.until(async()=>{const redocked=await panels('project:2:assets','inspect');return redocked.shown&&redocked.owner===list.owner;},'additional browser returned to main window');

  stage='extra D3D12 viewport';
  const {created:[extra]}=await probe.call('window.open',{kind:'viewport',target:'scene'});
  const surface=async(id)=> (await probe.evaluate('window.hbEditorRendererDebug.surfaces()')).find(s=>s.id===id);
  const presented=async id=>probe.until(async()=>{const s=await surface(id);return s?.window.visible&&s.calls>0&&s.presents>0&&!s.pipelinePreparation?.pending&&s;},id+' native frame',110000);
  const extraFrame=await presented(extra);
  assert.equal(extraFrame.backend,'D3D12');assert.equal(extraFrame.nativeCommandLists,true);
  stage='detach D3D12 viewport';
  await probe.call('window.detach',{id:extra});
  await probe.until(async()=>{const s=await surface(extra);return s?.window.visible&&s.window.owner!==extraFrame.window.owner;},'extra viewport native surface reparent');
  await probe.call('window.redock',{id:extra});
  stage='D3D12 material';
  await probe.call('document.open',{path:'Assets/Materials/Moss_stone.hbmaterial.json'});
  const material=await presented('material-preview');
  assert.equal(material.backend,'D3D12');assert.equal(material.nativeCommandLists,true);
  assert.ok(material.skyEnvironmentBytes>0,'material environment was prepared on Direct3D12');
  const materialPng=await probe.evaluate('window.hbEditorRendererDebug.capture("material")');
  await fs.writeFile(path.join(work,'native-material.png'),Buffer.from(materialPng.split(',')[1],'base64'));
  stage='console';
  await probe.call('window.open',{kind:'console',target:'project'});
  const logPanel=await panelShown('console-log');
  assert.equal(logPanel.view,'log');assert.ok(logPanel.items.length>0);
  const logToolbar=await panelShown('console-toolbar');
  await panels('console-toolbar','probe',{action:'click',i:logToolbar.rows[0].controls.find(c=>c.text==='지우기').i});
  await probe.until(async()=>(await panels('console-log','inspect')).items.length===0,'clear Win32 output log');
  stage='D3D12 Blueprint component preview';
  await probe.call('blueprint.preview.open',{path:project.manifest.startupBlueprint});
  const components=await probe.until(async()=>{
    const found=(await probe.evaluate('window.hbEditorRendererDebug.surfaces()')).find(s=>s.id.startsWith('component:'));
    return found?.window.visible&&found.calls>0&&found;
  },'Blueprint native preview',60000);
  assert.equal(components.backend,'D3D12');assert.equal(components.nativeCommandLists,true);
  stage='D3D12 animation preview';
  await probe.call('document.open',{path:animationPath});
  const animation=await probe.until(async()=>{
    const found=(await probe.evaluate('window.hbEditorRendererDebug.surfaces()')).find(s=>s.id.startsWith('animation:'));
    return found?.window.visible&&found.calls>0&&found;
  },'animation native preview',60000);
  assert.equal(animation.backend,'D3D12');assert.equal(animation.nativeCommandLists,true);
  await probe.capture('webview.png');const errors=probe.errors.filter(e=>!/favicon/.test(JSON.stringify(e)));assert.deepEqual(errors,[]);
  const exit=await probe.finish();probe=null;
  await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify({passed:true,viewport:{backend:viewport.backend,requestedBackend:viewport.requestedBackend,draws:viewport.calls,presents:viewport.presents},surfaces:{main,extra:extraFrame,material,components,animation},layout,pixels:{size:pixels.size,distinctInside:distinct},exit,scope:'Actual hidden owned Windows editor and temporary project. Native command lists, secondary HWNDs, menus, content browser, console, and viewport pixel readback.'},null,2));
  console.log(JSON.stringify({passed:true,work,viewport:{backend:viewport.backend,draws:viewport.calls},material:{backend:material.backend,draws:material.calls},extra:{backend:extraFrame.backend,draws:extraFrame.calls},distinct}));
}catch(error){await fs.writeFile(path.join(work,'failure.json'),JSON.stringify({stage,error:error.stack,errors:probe?.errors},null,2)).catch(()=>{});throw new Error(stage,{cause:error});}
finally{await probe?.stop();await pruneTestArtifacts(work);}
