// Hidden owned editor: the scene viewport is drawn by the engine's native renderer (Direct3D12 first) behind the transparent WebView.
// node tools/check-editor-native-viewport.mjs [--executable path/HBEngine.exe]
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createProject} from './project-manifest.mjs';
import {createPlacedObject} from '../prototype/placement-catalog.js';
import {editorWindowProbe} from './editor-window-probe.mjs';
import {activeInstalledVersions} from './install-editor.mjs';
import {retainTestEvidence,pruneTestArtifacts} from './test-artifacts.mjs';

assert.deepEqual(await activeInstalledVersions('C:/Users/kirby/HBEngine'),[]);
const work=await fs.mkdtemp(path.resolve('native/build/editor-native-viewport-'));retainTestEvidence(work);let probe;
try{
  const project=await createProject('EditorNativeViewport',work,'3d'),file=project.manifest.startupScene,scene=JSON.parse(await fs.readFile(path.join(project.root,file),'utf8'));
  for(let i=0;i<9;i++)scene.objects.push(createPlacedObject(['cube','sphere','torus'][i%3],{id:'shape'+i,position:[(i%3-1)*2,.8,(Math.floor(i/3)-1)*2]}));
  await project.project.write(file,JSON.stringify(scene));
  const at=process.argv.indexOf('--executable');probe=await editorWindowProbe({work,project:project.file,...at<0?{}:{executable:path.resolve(process.argv[at+1])}});
  await probe.until(()=>probe.evaluate('window.hbEditorRendererDebug?.ready?.()'),'editor viewport ready',120000);
  // Several frames so presents and draws are counted.
  const viewport=await probe.until(async()=>{const v=await probe.evaluate('window.hbEditorRendererDebug.viewport()');return v?.presents>2&&v;},'native viewport frames',30000);
  assert.equal(viewport.backend,'D3D12');assert.equal(viewport.requestedBackend,'auto');assert.ok(viewport.calls>=9,'scene draws reach the native renderer: '+viewport.calls);
  const layout=await probe.evaluate('(()=>{const r=document.querySelector("#scene-canvas").getBoundingClientRect(),d=devicePixelRatio;return {x:r.left*d,y:r.top*d,w:r.width*d,h:r.height*d,windowW:innerWidth*d,windowH:innerHeight*d,body:(()=>{const e=document.createElement("div");e.style.background="var(--bg)";document.body.append(e);const c=getComputedStyle(e).backgroundColor;e.remove();return c;})()};})()');
  const png=await probe.evaluate('window.hbEditorRendererDebug.captureViewport()');await fs.writeFile(path.join(work,'native-surface.png'),Buffer.from(png.split(',')[1],'base64'));
  // The surface covers the window; inside the canvas rectangle there is scene content, outside it the editor background.
  const pixels=await probe.evaluate(`(async()=>{const i=new Image();i.src=${JSON.stringify(png)};await i.decode();const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const g=c.getContext('2d');g.drawImage(i,0,0);
    const r=document.querySelector("#scene-canvas").getBoundingClientRect(),d=devicePixelRatio,sx=i.width/(innerWidth*d),sy=i.height/(innerHeight*d),at=(x,y)=>[...g.getImageData(Math.round(x*sx),Math.round(y*sy),1,1).data];
    const inside=[];for(let k=1;k<8;k++)for(let m=1;m<8;m++)inside.push(at((r.left+r.width*k/8)*d,(r.top+r.height*m/8)*d));return {size:[i.width,i.height],inside,outside:at(2,(innerHeight-2)*d)};})()`);
  const distinct=new Set(pixels.inside.map(p=>p.slice(0,3).join(','))).size,outside=pixels.outside.slice(0,3),bg=layout.body.match(/\d+/g).slice(0,3).map(Number);
  assert.ok(distinct>=4,'viewport shows shaded geometry, not a flat clear: '+distinct);
  assert.ok(outside.every((v,i)=>Math.abs(v-bg[i])<=3),'outside the viewport matches the editor background '+outside+' vs '+bg);
  await probe.capture('webview.png');const errors=probe.errors.filter(e=>!/favicon/.test(JSON.stringify(e)));assert.deepEqual(errors,[]);
  const exit=await probe.finish();probe=null;
  await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify({passed:true,viewport:{backend:viewport.backend,requestedBackend:viewport.requestedBackend,draws:viewport.calls,presents:viewport.presents},layout,pixels:{size:pixels.size,distinctInside:distinct,outside},exit,scope:'Actual hidden owned editor with a temporary 3D project: scene viewport rendered by the native SceneRenderBridge (auto: direct Direct3D12) into the host window behind a transparent WebView; native surface capture shows shaded geometry inside the canvas rectangle and the editor background outside. Not visible-window human inspection; the material preview stays WebGL2.'},null,2));
  console.log(JSON.stringify({passed:true,work,viewport:{backend:viewport.backend,draws:viewport.calls},distinct,outside}));
}catch(error){await fs.writeFile(path.join(work,'failure.json'),JSON.stringify({error:error.stack,errors:probe?.errors},null,2)).catch(()=>{});throw error;}
finally{await probe?.stop();await pruneTestArtifacts(work);}
