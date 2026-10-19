import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {timedNormalFixture} from './rendering-187-fixture.mjs';
import {editorWindowProbe} from './editor-window-probe.mjs';
import {createProject} from './project-manifest.mjs';
import {activeInstalledVersions} from './install-editor.mjs';
import {retainTestEvidence,pruneTestArtifacts} from './test-artifacts.mjs';

assert.deepEqual(await activeInstalledVersions('C:/Users/kirby/HBEngine'),[]);
const work=await fs.mkdtemp(path.resolve('native/build/ray-atlas-785-'));retainTestEvidence(work);
const executableIndex=process.argv.indexOf('--executable');let probe;
try{
 const f=timedNormalFixture(),material=f.data;f.dispose();
 const project=await createProject('RayAtlas785',work,'2d');
 probe=await editorWindowProbe({work,project:project.file,...(executableIndex<0?{}:{executable:path.resolve(process.argv[executableIndex+1])})});
 const result=await probe.evaluate(`(async()=>{
 const G=await import('three'),{GeometryGIWorld}=await import('/prototype/geometry-gi.js'),{prepareGLRayAtlas,glRayAtlasInfo}=await import('/prototype/gl-ray-atlas.js'),world=new GeometryGIWorld(),scene=new G.Scene(),map=new G.DataTexture(new Uint8Array(64*64*4).fill(128),64,64),material=new G.MeshPhysicalMaterial(),geometry=new G.PlaneGeometry(),mesh=new G.Mesh(geometry,material),renderers=[];
 material.userData.materialSource=${JSON.stringify(material)};material.userData.rayTextures=()=>[{map,type:'texture2d',parameter:'Bands',path:'Assets/RayBands.svg'}];scene.add(mesh);map.needsUpdate=true;
 const makeRenderer=()=>{const r=new G.WebGLRenderer({antialias:false});r.setSize(2,2);renderers.push(r);return r;},prepare=time=>{scene.userData.hbMaterialTime=time;return world.prepare(scene,true,null,true,true,false,true);},rows=[];
 const pixels=(renderer,texture)=>{const gl=renderer.getContext(),draw=gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING),read=gl.getParameter(gl.READ_FRAMEBUFFER_BINDING),buffer=gl.createFramebuffer(),data=new Float32Array(texture.image.data.length);try{gl.bindFramebuffer(gl.READ_FRAMEBUFFER,buffer);gl.framebufferTexture2D(gl.READ_FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,renderer.properties.get(texture).__webglTexture,0);if(gl.checkFramebufferStatus(gl.READ_FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Float atlas framebuffer incomplete');gl.readPixels(0,0,texture.image.width,texture.image.height,gl.RGBA,gl.FLOAT,data);if(gl.getError())throw Error('Float atlas read failed');return data;}finally{gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,draw);gl.bindFramebuffer(gl.READ_FRAMEBUFFER,read);gl.deleteFramebuffer(buffer);}},equal=(a,b)=>a.length===b.length&&a.every((v,i)=>Object.is(v,b[i])||v===b[i]),check=(name,renderer,changed)=>{const texture=world.texture,cpu=texture.image.data,gpu=pixels(renderer,texture);if(!equal(cpu,gpu))throw Error(name+': CPU/GPU atlas mismatch at '+cpu.findIndex((v,i)=>v!==gpu[i]));rows.push({name,changed,info:glRayAtlasInfo(renderer),first:[...gpu.slice(0,4)]});};
 try{
  prepare(0);world.commit();prepare(1);world.commit();prepare(2);
  const texture=world.texture,r=makeRenderer(),ranges=texture.updateRanges.map(v=>({...v}));if(!ranges.length||ranges.some(v=>v.start<4096*4)||texture.image.height<2)throw Error('Fixture must queue only later rows before its first upload');
  r.initTexture(texture);const broken=pixels(r,texture),cpu=texture.image.data;if(equal(cpu,broken)||broken[3]!==0||cpu[3]===0)throw Error('Control must reproduce new-allocation partial upload failure');rows.push({name:'unfixed-control',ranges,firstCPU:[...cpu.slice(0,4)],firstGPU:[...broken.slice(0,4)]});
  check('initial-recovery',r,prepareGLRayAtlas(r,texture));
  world.commit();prepare(3);const partial=texture.updateRanges.map(v=>({...v}));if(!partial.length||partial.some(v=>v.start<4096*4))throw Error('Later time changes must retain row updates');if(prepareGLRayAtlas(r,texture))throw Error('Steady state must not force full upload');r.initTexture(texture);check('partial-later-row',r,false);
  const before=glRayAtlasInfo(r).fullUploads;texture.dispose();check('dispose-recreate',r,prepareGLRayAtlas(r,texture));if(glRayAtlasInfo(r).fullUploads!==before+1)throw Error('Disposed GL resource not initialized');
  texture.wrapS=G.RepeatWrapping;check('sampler-recreate',r,prepareGLRayAtlas(r,texture));
  const gl=r.getContext(),old=r.properties.get(texture).__webglTexture,event=name=>new Promise((resolve,reject)=>{const id=setTimeout(()=>reject(Error(name+' timeout')),6000);r.domElement.addEventListener(name,()=>{clearTimeout(id);resolve();},{once:true});});let awaited=event('webglcontextlost');r.forceContextLoss();await awaited;awaited=event('webglcontextrestored');await new Promise(resolve=>setTimeout(resolve,150));r.forceContextRestore();await awaited;check('context-restore',r,prepareGLRayAtlas(r,texture));if(r.properties.get(texture).__webglTexture===old||gl.getError())throw Error('GL resource identity/recovery');
  const second=makeRenderer();check('second-renderer',second,prepareGLRayAtlas(second,texture));if(prepareGLRayAtlas(second,texture))throw Error('Second renderer repeated full upload');
  return {width:texture.image.width,height:texture.image.height,bytes:texture.image.data.byteLength,partial,rows};
 }finally{world.dispose();geometry.dispose();material.dispose();map.dispose();for(const r of renderers){r.dispose();r.forceContextLoss();}}
 })()`);
 assert.equal(result.rows.length,7);for(const row of result.rows.slice(1))assert.equal(row.changed,row.name!=='partial-later-row');
 const exit=await probe.finish();probe=null;
 await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify({passed:true,result,exit,scope:'Owned real GeometryGIWorld atlas with Time-only later-row CPU updates before initial GPU allocation. Unfixed control reproduces missing BVH row; actual Float32 GPU bytes equal CPU after full initialization, normal partial writes, dispose, sampler change, real lose/restore events and second renderer. Readback/FBO exist only in this test. No driver heap or FPS claim.'},null,2));console.log(JSON.stringify({passed:true,work,rows:result.rows.map(r=>r.name),bytes:result.bytes}));
}catch(error){await fs.writeFile(path.join(work,'failure.json'),JSON.stringify({error:error.stack,diagnostics:await probe?.diagnostics()},null,2));throw error;}finally{await probe?.stop();await pruneTestArtifacts(work);}
