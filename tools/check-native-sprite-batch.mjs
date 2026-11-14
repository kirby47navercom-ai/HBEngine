// Sprite batching keeps every sprite's effective draw: renderer A (hbSpriteBatching=false) and renderer B (batching) see
// the same sprite scene; B's batches, expanded through their instance values like the host does, must equal A's draws
// in draw order every frame (world, normal, colour, map UV rows and all other draw values).
// node tools/check-native-sprite-batch.mjs
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createNativeSceneRenderer} from '../prototype/native-scene-renderer.js';

const texture=new THREE.DataTexture(new Uint8Array(16).fill(255),2,2),other=new THREE.DataTexture(new Uint8Array(16).fill(128),2,2);texture.needsUpdate=other.needsUpdate=true;
const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-10,10,10,-10,.1,100);camera.position.z=20;
const sprites=[];
for(let i=0;i<40;i++){const material=new THREE.MeshBasicMaterial({map:i%13===5?other:texture,transparent:i%17!==3,color:new THREE.Color().setHSL(i/40,.5,.5)}),mesh=new THREE.Mesh(new THREE.PlaneGeometry(i%11===4?2:1,1),material);mesh.userData.sprite=true;mesh.position.set(i%8*2-7,Math.floor(i/8)*2-4,0);mesh.renderOrder=i;scene.add(mesh);sprites.push(mesh);}

function host(){
 const state={draws:new Map(),instances:new Map(),order:[]};
 return {state,apply(op,data){
  if(op==='upload')for(const r of data)if(r.kind==='instances')state.instances.set(r.id,r);
  if(op!=='frame')return;for(const r of data.resources||[])if(r.kind==='instances')state.instances.set(r.id,r);
  for(const id of data.remove||[])state.draws.delete(id);for(const d of data.updates||[])state.draws.set(d.id,d);if(data.order)state.order=data.order;for(const id of data.release?.instances||[])state.instances.delete(id);
 }};
}
// One row per drawn sprite: instance values replace world/normal/colour/map UV rows of the batch draw.
function expand(state){
 const rows=[];
 for(const id of state.order){const d=state.draws.get(id);assert(d,'ordered draw exists '+id);const {id:_i,mesh:_m,instances,world,normal,material,...rest}=d,{color,uvX,uvY,...mat}=material;
  if(!instances){rows.push(JSON.stringify({world,normal,color,uv:[uvX[0].slice(0,3),uvY[0].slice(0,3)],rest,mat}));continue;}
  const r=state.instances.get(instances);assert(r?.uv,'uv instance data '+instances);assert.deepEqual(world,[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);assert.deepEqual(color,[1,1,1,1]);
  for(let o=0;o<r.values.length;o+=44){const v=r.values;rows.push(JSON.stringify({world:v.slice(o,o+16),normal:v.slice(o+16,o+32),color:v.slice(o+32,o+36),uv:[v.slice(o+36,o+39),v.slice(o+40,o+43)],rest,mat}));}
 }
 return rows;
}
const hosts=[host(),host()],renderers=[];
for(const [index,h] of hosts.entries()){
 const listeners=new Set(),bridge={addEventListener:(_,f)=>listeners.add(f),removeEventListener:(_,f)=>listeners.delete(f),postMessage(packet){h.apply(packet.op,JSON.parse(JSON.stringify(packet.data??null)));for(const f of listeners)f({data:{channel:'hb.render',id:packet.id,ok:true,value:packet.op==='frame'?{calls:1,meshes:1,textures:0}:{}}});}};
 const r=await createNativeSceneRenderer({clientWidth:64,clientHeight:64},()=>{},{bridge});r.hbSpriteBatching=index===1;renderers.push(r);
}
let batches=0,frames=0;
for(let frame=0;frame<40;frame++){
 if(frame===5)sprites[3].position.x+=.5;
 if(frame===10)sprites[7].material.color.set(0xff0000);
 if(frame===15)sprites[12].renderOrder=100;
 if(frame===20)scene.remove(sprites[20]);
 if(frame===25)sprites[9].material.map=other;
 if(frame===30)sprites[30].material.opacity=.5;
 if(frame===35){for(const s of sprites)s.position.y+=.25;}
 for(const r of renderers){await r.render(scene,camera);await r.hbFinishFrame();}
 const [a,b]=hosts.map(h=>expand(h.state));assert.deepEqual(b,a,'expanded sprite draws frame '+frame);
 assert.equal([...hosts[0].state.draws.values()].filter(d=>d.instances).length,0,'batching off draws no batches');
 batches=Math.max(batches,[...hosts[1].state.draws.values()].filter(d=>d.instances).length);frames++;
}
assert(batches>0,'sprites were batched');
assert(hosts[1].state.order.length<hosts[0].state.order.length,'fewer draws with batching');
console.log(JSON.stringify({passed:true,frames,sprites:hosts[0].state.order.length,batchedDraws:hosts[1].state.order.length,batches,scope:'Expanded batched sprite draws equal unbatched draws (JS packets); GPU pixels are checked separately.'}));
for(const r of renderers)await r.dispose();
