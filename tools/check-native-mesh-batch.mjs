// Mesh batching: renderer A (hbSpriteBatching=false) and B (batching) see one 3D scene (identical-parameter boxes and
// spheres with their own geometry/material objects, colours, a different size, a different roughness, transparent
// boxes, a shadow-casting directional light, a reflection probe). Every frame B's main pass, expanded through instance
// values, must hold the same draws as A (opaque blocks as a set, transparent in order), and shadow casters must match.
// node tools/check-native-mesh-batch.mjs
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createNativeSceneRenderer} from '../prototype/native-scene-renderer.js';

const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(60,1,.1,200);camera.position.set(0,14,22);camera.lookAt(0,0,0);
const meshes=[];
for(let i=0;i<120;i++){
 const transparent=i%15===7,material=new THREE.MeshStandardMaterial({color:new THREE.Color().setHSL(i/120,.6,.5),roughness:i%23===5?.2:.7,transparent,opacity:transparent?.5:1});
 const geometry=i%3===2?new THREE.SphereGeometry(.5,12,8):new THREE.BoxGeometry(i%29===4?2:1,1,1),mesh=new THREE.Mesh(geometry,material);
 mesh.position.set(i%12*1.6-9,.5,Math.floor(i/12)*1.6-8);mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh);meshes.push(mesh);
}
const sun=new THREE.DirectionalLight(0xffffff,2);sun.position.set(5,10,4);sun.castShadow=true;scene.add(sun,sun.target);
const probe=new THREE.Group();probe.userData={objectId:'Probe',reflectionProbes:[{id:'Room',properties:{size:[30,10,30]}}]};scene.add(probe);

function host(){
 const state={draws:new Map(),instances:new Map(),meshes:new Map(),order:[],casters:null};
 const resource=r=>{if(r.kind==='instances')state.instances.set(r.id,r);if(r.kind==='mesh')state.meshes.set(r.id,JSON.stringify([r.vertices,r.indices]));};
 return {state,apply(op,data){if(op==='upload')for(const r of data)resource(r);if(op!=='frame')return;for(const r of data.resources||[])resource(r);for(const id of data.remove||[])state.draws.delete(id);for(const d of data.updates||[])state.draws.set(d.id,d);if(data.order)state.order=data.order;if(data.shadowCasters)state.casters=data.shadowCasters;for(const id of data.release?.instances||[])state.instances.delete(id);}};
}
function expand(state){
 const opaque=[],transparent=[];
 for(const id of state.order){const d=state.draws.get(id);assert(d,'ordered draw exists '+id);const {id:_i,mesh,instances,world,normal,material,...rest}=d,{color,uvX,uvY,...mat}=material,list=mat.blend===2?opaque:transparent,shape=state.meshes.get(mesh);assert(shape,'mesh data '+mesh);
  if(!instances){list.push(JSON.stringify({world,normal,color,uv:[uvX[0].slice(0,3),uvY[0].slice(0,3)],shape,rest,mat}));continue;}
  const r=state.instances.get(instances);assert(r?.uv,'instance data '+instances);
  for(let o=0;o<r.values.length;o+=44){const v=r.values;list.push(JSON.stringify({world:v.slice(o,o+16),normal:v.slice(o+16,o+32),color:v.slice(o+32,o+36),uv:[v.slice(o+36,o+39),v.slice(o+40,o+43)],shape,rest,mat}));}
 }
 return {opaque:opaque.sort(),transparent};
}
const hosts=[host(),host()],renderers=[];
for(const [index,h] of hosts.entries()){
 const listeners=new Set(),bridge={addEventListener:(_,f)=>listeners.add(f),removeEventListener:(_,f)=>listeners.delete(f),postMessage(packet){h.apply(packet.op,JSON.parse(JSON.stringify(packet.data??null)));for(const f of listeners)f({data:{channel:'hb.render',id:packet.id,ok:true,value:packet.op==='frame'?{calls:1,meshes:1,textures:0}:{}}});}};
 const r=await createNativeSceneRenderer({clientWidth:64,clientHeight:64},()=>{},{bridge});r.hbSpriteBatching=index===1;renderers.push(r);
}
let batches=0;
for(let frame=0;frame<30;frame++){
 if(frame===5)meshes[3].position.x+=.3;
 if(frame===10)meshes[8].material.color.set(0xff0000);
 if(frame===15)meshes[11].material.roughness=.1;
 if(frame===20)scene.remove(meshes[20]);
 if(frame===25)camera.position.x=3;
 for(const r of renderers){await r.render(scene,camera);await r.hbFinishFrame();}
 const [a,b]=hosts.map(h=>expand(h.state));assert.deepEqual(b.opaque,a.opaque,'opaque draws frame '+frame);assert.deepEqual(b.transparent,a.transparent,'transparent draws frame '+frame);
 assert.deepEqual(hosts[1].state.casters,hosts[0].state.casters,'shadow casters frame '+frame);
 batches=Math.max(batches,hosts[1].state.order.filter(id=>id.startsWith('sprites:')).length);
}
assert(batches>0,'meshes were batched');assert(hosts[1].state.order.length<hosts[0].state.order.length/4,'far fewer main-pass draws: '+hosts[0].state.order.length+' -> '+hosts[1].state.order.length);
console.log(JSON.stringify({passed:true,frames:30,mainPassDraws:[hosts[0].state.order.length,hosts[1].state.order.length],batches,scope:'Expanded batched mesh draws equal unbatched draws, shadow casters equal (JS packets).'}));
for(const r of renderers)await r.dispose();
