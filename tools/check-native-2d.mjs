import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createNativeSceneRenderer} from '../prototype/native-scene-renderer.js';
import {TwoDRendering} from '../prototype/two-d-rendering.js';
import {nativeMaskMaterial,nativeOffscreenDraw} from '../prototype/native-2d.js';
import {componentDefaults} from '../prototype/scene-components.js';

let pendingRaster=false;
const savedWindow=globalThis.window,savedDocument=globalThis.document,listeners=new Set(),packets=[];
globalThis.window={chrome:{webview:{addEventListener:(_,f)=>listeners.add(f),removeEventListener:(_,f)=>listeners.delete(f),postMessage(packet){packets.push(structuredClone(packet));queueMicrotask(()=>{for(const f of listeners)f({data:{channel:'hb.render',id:packet.id,ok:true,value:{calls:1,meshes:1,textures:1,shaderPreparation:{enabled:pendingRaster,pending:pendingRaster,revision:1,stages:[0,0,0,0,0,0],raster:{pending:pendingRaster,basePending:pendingRaster,stages:[]}}}}});});}}}};
globalThis.document={documentElement:{classList:{add(){},remove(){}}},createElement(){let bytes;return {getContext:()=>({putImageData:data=>bytes=data.data,getImageData:()=>({data:bytes})})};}};
const savedImageData=globalThis.ImageData;globalThis.ImageData=class{constructor(data){this.data=data;}};
const twoD=new TwoDRendering(),scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-4,4,4,-4,.1,100);camera.position.z=10;
const actor=new THREE.Group(),mask=new THREE.Group(),light=new THREE.Group();actor.userData.objectId='Actor';mask.userData.objectId='Mask';light.userData.objectId='Light';scene.add(actor,mask,light);
const geometry=new THREE.PlaneGeometry(4,4),material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),sprite=new THREE.Mesh(geometry,material),maskMesh=new THREE.Mesh(geometry,material.clone());actor.add(sprite);mask.add(maskMesh);
sprite.userData.objectId='Actor';sprite.userData.draw2d={...componentDefaults('SpriteRenderer'),maskInteraction:'inside'};actor.userData.spriteMesh=sprite;mask.userData.maskMesh=maskMesh;maskMesh.visible=false;maskMesh.userData.spriteMask=true;maskMesh.userData.maskProperties=componentDefaults('SpriteMask');
let renderer;try{
  const map=new THREE.DataTexture(new Uint8Array(4),1,1);map.magFilter=THREE.NearestFilter;map.wrapS=THREE.RepeatWrapping;map.wrapT=THREE.MirroredRepeatWrapping;const m=nativeMaskMaterial(map,.5),node=new THREE.Mesh(geometry,m);const draw=nativeOffscreenDraw(node,camera,()=>"mesh",()=>"map",[]);assert.equal(draw.sampling,7);m.dispose();map.dispose();
  renderer=await createNativeSceneRenderer({clientWidth:64,clientHeight:64});maskMesh.userData.maskMaterial=renderer.hbMaskMaterial(null,.5);
  const render=async()=>{packets.length=0;twoD.prepare(renderer,scene,camera,[actor,mask,light]);renderer.render(scene,camera);await renderer.hbFinishFrame();return packets.find(p=>p.op==='frame').data;};
  let frame=await render();assert.equal(frame.passes2d.length,1);assert.equal(frame.passes2d[0].draws[0].mode,1);assert.equal(frame.updates[0].twoD.settings.pass[1],1);assert.equal(packets.filter(p=>p.op==='upload').length,1,'auxiliary and scene uploads share one packet');assert.ok(packets.find(p=>p.op==='upload').data.some(r=>r.kind==='target2d'));
  assert.equal(renderer.hbDiagnostics().maskCachedTargets,1);frame=await render();assert.equal(frame.passes2d.length,0);assert.equal(frame.updates.length,0);assert.equal(packets.some(p=>p.op==='upload'),false);
  pendingRaster=true;await render();assert.equal(renderer.hbDiagnostics().maskCachedTargets,0,'pending base raster cannot commit mask cache');pendingRaster=false;frame=await render();assert.equal(frame.passes2d.length,1,'first ready frame replays skipped mask');assert.equal(renderer.hbDiagnostics().maskCachedTargets,1);frame=await render();assert.equal(frame.passes2d.length,0,'ready unchanged frame caches masks again');
  camera.position.x=1;frame=await render();assert.equal(frame.passes2d.length,1,'camera movement invalidates mask');
  maskMesh.userData.maskProperties={...componentDefaults('SpriteMask'),customRange:true,backSortingOrder:2};frame=await render();assert.equal(frame.passes2d.length,0);assert.equal(frame.updates[0].twoD.maps[0]!==maskMesh.userData.maskProxy?.material.map?.uuid,true,'empty mask is explicit');
  sprite.material=new THREE.MeshStandardMaterial({side:THREE.DoubleSide});sprite.userData.draw2d={...componentDefaults('SpriteRenderer'),shading:'lit2d'};light.userData.light2d={...componentDefaults('Light2D'),lightType:'freeform',normalMode:'disabled'};
  frame=await render();const resources=packets.find(p=>p.op==='upload').data;assert.ok(resources.some(r=>r.kind==='dataTexture'&&r.channels===2&&r.floating));assert.ok(resources.some(r=>r.kind==='dataTexture'&&r.channels===4&&r.floating));assert.equal(frame.updates[0].twoD.settings.screen[3],1);
  frame=await render();assert.equal(frame.passes2d.length,0);assert.equal(packets.some(p=>p.op==='upload'),false);light.userData.light2d.intensity=2;frame=await render();assert.ok(packets.find(p=>p.op==='upload').data.some(r=>r.kind==='dataTexture'));
  twoD.dispose();assert.equal(renderer.hbDiagnostics().maskCachedTargets,0);await renderer.hbReleaseScene();assert.equal(packets.at(-1).op,'reset');
}finally{twoD.dispose();await renderer?.dispose();geometry.dispose();material.dispose();sprite.material.dispose();maskMesh.material.dispose();maskMesh.userData.maskMaterial.dispose();globalThis.window=savedWindow;globalThis.document=savedDocument;globalThis.ImageData=savedImageData;}
console.log('DirectX 2D: shared mask range, single-frame prepasses, cached camera invalidation, pending base mask replay, RG/RGBA light uploads and release PASS');
