// Matrix-only draw updates: renderer A (hbMatrixOnlyUpdates=false) sends full records, renderer B sends drawTransforms
// for retained draws whose only change is their world/normal matrix. Applied to a mock host, both must hold identical
// draws (every value) and order every frame while meshes move, rotate, change material, appear and disappear.
// node tools/check-native-matrix-updates.mjs
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createNativeSceneRenderer} from '../prototype/native-scene-renderer.js';
import {applyDrawTransforms} from './native-mock-draw-transforms.mjs';

const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(60,1,.1,200);camera.position.set(0,6,18);camera.lookAt(0,0,0);
scene.add(new THREE.AmbientLight(0xffffff,.3));const light=new THREE.DirectionalLight(0xffffff,1);light.position.set(3,8,2);scene.add(light);
const geometry=new THREE.BoxGeometry(),meshes=[];
for(let i=0;i<60;i++){const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:new THREE.Color().setHSL(i/60,.6,.5),roughness:.5}));mesh.position.set(i%10*1.6-7,0,Math.floor(i/10)*1.6-4);scene.add(mesh);meshes.push(mesh);}

function host(){
 const state={draws:new Map(),order:[],transforms:0};
 const resources=list=>{for(const r of list||[])if(r.kind==='drawTransforms')state.transforms+=applyDrawTransforms(state.draws,r);};
 return {state,apply(op,data){
  if(op==='upload')resources(data);
  if(op!=='frame')return;resources(data.resources);
  for(const id of data.remove||[])state.draws.delete(id);for(const d of data.updates||[])state.draws.set(d.id,d);if(data.order)state.order=data.order;
 }};
}
const hosts=[host(),host()],renderers=[];
for(const [index,h] of hosts.entries()){
 const listeners=new Set(),bridge={addEventListener:(_,f)=>listeners.add(f),removeEventListener:(_,f)=>listeners.delete(f),postMessage(packet){h.apply(packet.op,JSON.parse(JSON.stringify(packet.data??null)));for(const f of listeners)f({data:{channel:'hb.render',id:packet.id,ok:true,value:packet.op==='frame'?{calls:1,meshes:1,textures:0}:{}}});}};
 const r=await createNativeSceneRenderer({clientWidth:64,clientHeight:64},()=>{},{bridge});r.hbMatrixOnlyUpdates=index===1;renderers.push(r);
}
// Every held draw (batch members too: shadows and probe captures use them) plus the draw order.
const snapshot=state=>[JSON.stringify(state.order),...[...state.draws.keys()].sort().map(id=>JSON.stringify(state.draws.get(id)))];
for(let frame=0;frame<60;frame++){
 meshes.forEach((m,i)=>{if(i%3===0){m.position.y=Math.sin(frame*.2+i)*.5;m.rotation.y=frame*.05*(i%5);}});
 if(frame===10)meshes[1].material.color.set(0xff0000);
 if(frame===15)meshes[3].scale.set(1,2,1);
 if(frame===20){scene.remove(meshes[6]);}
 if(frame===25){scene.add(meshes[6]);meshes[6].position.x+=.3;}
 if(frame===30)meshes[9].material.roughness=.1;
 if(frame===40)meshes[12].visible=false;
 if(frame===45)meshes[12].visible=true;
 for(const r of renderers){await r.render(scene,camera);await r.hbFinishFrame();}
 assert.deepEqual(snapshot(hosts[1].state),snapshot(hosts[0].state),'host draws frame '+frame);
}
assert.equal(hosts[0].state.transforms,0,'full records only when off');assert(hosts[1].state.transforms>500,'matrix-only updates used: '+hosts[1].state.transforms);
console.log(JSON.stringify({passed:true,frames:60,draws:hosts[0].state.draws.size,ordered:hosts[0].state.order.length,matrixOnlyUpdates:hosts[1].state.transforms,scope:'Matrix-only drawTransforms vs full records: identical host draws and order every frame (JS packets); GPU pixels separately.'}));
for(const r of renderers)await r.dispose();
