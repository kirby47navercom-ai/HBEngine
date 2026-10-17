import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {createProject} from './project-manifest.mjs';import {editorWindowProbe} from './editor-window-probe.mjs';import {pruneTestArtifacts,retainTestEvidence} from './test-artifacts.mjs';
const arg=process.argv.indexOf('--executable'),executable=arg<0?path.resolve('HBEngine.exe'):path.resolve(process.argv[arg+1]),work=await fs.mkdtemp(path.resolve('native/build/display-colors-283-window-'));retainTestEvidence(work);const record=await createProject('Display283',work,'2d');let probe;
try{
 probe=await editorWindowProbe({work,project:record.file,executable});
 const results=await probe.evaluate(`(async()=>{
  const T=await import('three'),N=await import('three/webgpu'),S=await import('three/tsl'),{createGPURenderer}=await import('/prototype/gpu-particles.js');
  const rows={};for(const gpu of[false,true]){const canvas=document.createElement('canvas'),r=gpu?await createGPURenderer(canvas):new T.WebGLRenderer({canvas,alpha:true,antialias:false,preserveDrawingBuffer:true});r.setSize(32,32);r.setPixelRatio(1);r.toneMapping=T.ACESFilmicToneMapping;const scene=new T.Scene(),camera=new T.OrthographicCamera(-1,1,1,-1,.1,10);camera.position.z=3;const geometry=new T.PlaneGeometry(2,2),display=new T.MeshBasicMaterial({color:new T.Color('#4fba75'),toneMapped:false}),lit=new T.MeshBasicMaterial({color:new T.Color().setRGB(2,.3,.05)}),front=new T.Mesh(geometry,display),back=new T.Mesh(geometry,lit);front.position.z=.1;scene.add(back,front);const images={};
  async function draw(name){await r.renderAsync?.(scene,camera);if(!gpu)r.render(scene,camera);if(gpu)await r.backend.device.queue.onSubmittedWorkDone();const bitmap=await createImageBitmap(canvas),target=new OffscreenCanvas(32,32),ctx=target.getContext('2d');ctx.drawImage(bitmap,0,0);bitmap.close();images[name]=[...ctx.getImageData(16,16,1,1).data];}
  try{
   await draw('opaque');const mixed=gpu?{...r.hbDisplayColorResources}:null;display.transparent=true;display.opacity=.5;display.needsUpdate=true;await draw('displayOverScene');
   let rawHDR;if(gpu){rawHDR=[...await r.readRenderTargetPixelsAsync(r._frameBufferTarget,16,16,1,1)].map(v=>T.DataUtils.fromHalfFloat(v));}
   display.premultipliedAlpha=true;display.needsUpdate=true;await draw('premultiplied');display.premultipliedAlpha=false;display.needsUpdate=true;
   display.transparent=false;display.opacity=1;display.needsUpdate=true;front.position.z=0;back.position.z=.1;lit.transparent=true;lit.opacity=.5;lit.depthWrite=false;lit.needsUpdate=true;await draw('sceneOverDisplay');
   lit.transparent=false;lit.opacity=1;lit.depthWrite=true;lit.needsUpdate=true;await draw('sceneOccludes');
   back.visible=false;front.position.z=.1;scene.background=new T.Color('#34567a');display.transparent=true;display.opacity=.5;display.needsUpdate=true;await draw('coloredClear');scene.background=null;r.setClearColor(new T.Color('#34567a'),.25);await draw('transparentClear');scene.background=new T.Color('#34567a');
   if(gpu){const m=new N.NodeMaterial();m.fragmentNode=S.vec4(S.uniform(new N.Color('#4fba75')),1);m.toneMapped=false;front.material=m;back.visible=true;back.position.z=0;await draw('customFragment');front.material=display;m.dispose();}
   display.transparent=false;display.opacity=1;display.needsUpdate=true;back.visible=false;await draw('displayOnly');const pure=gpu?{...r.hbDisplayColorResources}:null;
   front.visible=false;back.visible=true;await draw('sceneOnly');const released=gpu?{...r.hbDisplayColorResources}:null;
   front.visible=true;front.position.z=.2;await r.compileAsync(scene,camera);await draw('afterCompile');
   let hdr;if(gpu){const target=new N.RenderTarget(1,1,{type:N.FloatType,depthBuffer:false});r.setRenderTarget(target);front.visible=false;await r.renderAsync(scene,camera);hdr=[...await r.readRenderTargetPixelsAsync(target,0,0,1,1)];r.setRenderTarget(null);target.dispose();}
   rows[gpu?'webgpu':'webgl']={images,mixed,pure,released,rawHDR,hdr,errors:gpu?r.hbGPUErrors:[]};
  }finally{geometry.dispose();display.dispose();lit.dispose();r.dispose();r.forceContextLoss?.();}
  }return rows;
 })()`);
 await fs.writeFile(path.join(work,'pixels.json'),JSON.stringify(results,null,2));
 for(const[name,pixel]of Object.entries(results.webgl.images))assert.ok(pixel.every((v,i)=>Math.abs(v-results.webgpu.images[name][i])<=2),JSON.stringify({name,webgl:pixel,webgpu:results.webgpu.images[name]}));
 assert.deepEqual(results.webgpu.images.opaque,[79,186,117,255]);assert.deepEqual(results.webgpu.images.customFragment,[79,186,117,255]);assert.equal(results.webgpu.mixed.targets,1);assert.equal(results.webgpu.mixed.bytes,8192);assert.equal(results.webgpu.pure.targets,0);assert.equal(results.webgpu.released.targets,0);assert.equal(results.webgpu.released.mode,'scene');assert.ok(Math.abs(results.webgpu.hdr[0]-2)<1e-5,JSON.stringify(results.webgpu.hdr));assert.ok(Math.abs(results.webgpu.rawHDR[0]-(2+.0781874218)/2)<.002,JSON.stringify(results.webgpu.rawHDR));assert.deepEqual(results.webgpu.errors,[]);
 const exit=await probe.finish();probe=null;await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify({passed:true,executable,results,exit,scope:'Actual private WebGL/WebGPU canvas pixels, per-material alpha/depth/custom fragment, compile, HDR offscreen and attachment release. No whole-game FPS claim.'},null,2));console.log(JSON.stringify({work,passed:true,results}));
}catch(error){await fs.writeFile(path.join(work,'failure.json'),JSON.stringify({error:error.stack,diagnostics:await probe?.diagnostics()},null,2));throw error;}finally{await probe?.stop();await pruneTestArtifacts(work);}
