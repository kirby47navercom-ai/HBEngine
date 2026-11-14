// Host static sets (docs/HOST_SCENE_DESIGN.md stage 1): renderer A draws without sets, renderer B moves clean static
// groups into host sets. A test host expands both main passes (B's sets culled with the same sphere/plane test as the
// C++ bridge) and every frame the opaque main-pass draws must be equal; B's shadow casters must contain A's, and any
// extra B caster row must lie outside that shadow frustum. Announced moves, hiding, material changes, removal and camera
// moves must keep the result equal, and B must actually draw through sets.
// node tools/check-host-static-sets.mjs
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createNativeSceneRenderer} from '../prototype/native-scene-renderer.js';
import {watchStaticGroup} from '../prototype/static-groups.js';
import {touchTransform,touchComponents,revisionConfig} from '../prototype/object-revision.js';

revisionConfig.verify=false;
function world(){
 const scene=new THREE.Scene(),root=new THREE.Group(),objects=[],groups=new Map(),geometries=[new THREE.BoxGeometry(),new THREE.SphereGeometry(.5,10,8)];scene.add(root);
 for(let i=0;i<400;i++){const object={id:'o'+i,position:[(i%20)*2-19,0,Math.floor(i/20)*2-19],rotation:[0,0,0],scale:[1,1,1],components:[{id:'t',type:'Transform'},{id:'m',type:'MeshRenderer'}]};
  const group=new THREE.Group(),mesh=new THREE.Mesh(geometries[i%2],new THREE.MeshStandardMaterial({color:new THREE.Color().setHSL((i%5)/5,.5,.5),roughness:i%7===3?.2:.7}));mesh.castShadow=mesh.receiveShadow=true;mesh.uuid='mesh-'+i;group.uuid='group-'+i;group.add(mesh);root.add(group);watchStaticGroup(group,object);groups.set(object.id,group);objects.push(object);}
 const sync=o=>{const g=groups.get(o.id);g.position.fromArray(o.position);g.rotation.set(...o.rotation);g.scale.fromArray(o.scale);touchTransform(o);};for(const o of objects)sync(o);
 const sun=new THREE.DirectionalLight(0xffffff,2);sun.position.set(10,20,5);sun.castShadow=true;sun.shadow.camera.left=sun.shadow.camera.bottom=-10;sun.shadow.camera.right=sun.shadow.camera.top=10;scene.add(sun,sun.target);
 const camera=new THREE.PerspectiveCamera(50,1,.1,60);camera.position.set(0,12,18);camera.lookAt(0,0,0);
 return {scene,camera,objects,groups,sync};
}
const decode=v=>{const bytes=typeof v==='string'?Buffer.from(v,'base64'):Buffer.from(v);return new Float32Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));};
function planes(m){const p=[[m[3]-m[0],m[7]-m[4],m[11]-m[8],m[15]-m[12]],[m[3]+m[0],m[7]+m[4],m[11]+m[8],m[15]+m[12]],[m[3]+m[1],m[7]+m[5],m[11]+m[9],m[15]+m[13]],[m[3]-m[1],m[7]-m[5],m[11]-m[9],m[15]-m[13]],[m[3]-m[2],m[7]-m[6],m[11]-m[10],m[15]-m[14]],[m[3]+m[2],m[7]+m[6],m[11]+m[10],m[15]+m[14]]];
 return p.map(q=>{const l=Math.hypot(q[0],q[1],q[2]);return q.map(v=>v/l);});}
const inside=(ps,s)=>ps.every(p=>p[0]*s[0]+p[1]*s[1]+p[2]*s[2]+p[3]>=-s[3]);
function host(){
 const state={draws:new Map(),sets:new Map(),instances:new Map(),meshes:new Map(),order:[],casters:null,shadows:null,vp:null};
 const resource=r=>{if(r.kind==='cullSet')state.sets.set(r.id,{rows:decode(r.rows),spheres:decode(r.spheres)});if(r.kind==='instances')state.instances.set(r.id,r);if(r.kind==='mesh')state.meshes.set(r.id,JSON.stringify([r.vertices,r.indices]));};
 return {state,apply(op,data){if(op==='upload')for(const r of data)resource(r);if(op!=='frame')return;for(const r of data.resources||[])resource(r);for(const id of data.remove||[])state.draws.delete(id);for(const d of data.updates||[])state.draws.set(d.id,d);if(data.order)state.order=data.order;if(data.shadowCasters)state.casters=data.shadowCasters;if(data.shadows)state.shadows=data.shadows;state.vp=data.viewProjection;for(const id of data.release?.cullSets||[])state.sets.delete(id);}};
}
const round=v=>Array.from(v,x=>Math.fround(x));
// One descriptor per drawn instance: world, normal, colour, uv, shape and every other draw value. filter(sphere) picks set rows.
function rows(state,id,filter){
 const d=state.draws.get(id);assert(d,'draw exists '+id);const {id:_i,mesh,instances,cullSet,world,normal,material,...rest}=d,{color,uvX,uvY,...mat}=material,shape=state.meshes.get(mesh);assert(shape,'mesh data '+mesh);
 if(instances&&!cullSet){const r=state.instances.get(instances),v=r.values,out=[];for(let o=0;o<v.length;o+=44)out.push(JSON.stringify({world:round(v.slice(o,o+16)),normal:round(v.slice(o+16,o+32)),color:round(v.slice(o+32,o+36)),uv:[round(v.slice(o+36,o+39)),round(v.slice(o+40,o+43))],shape,rest,mat}));return out;}
 if(!cullSet)return [JSON.stringify({world:round(world),normal:round(normal),color:round(color),uv:[round(uvX[0].slice(0,3)),round(uvY[0].slice(0,3))],shape,rest,mat})];
 const set=state.sets.get(cullSet),out=[];assert(set,'cull set data '+cullSet);
 for(let i=0;i<set.spheres.length/4;i++){const sphere=set.spheres.subarray(i*4,i*4+4);if(!filter(sphere))continue;const v=set.rows.subarray(i*44,i*44+44);out.push(JSON.stringify({world:Array.from(v.subarray(0,16)),normal:Array.from(v.subarray(16,32)),color:Array.from(v.subarray(32,36)),uv:[Array.from(v.subarray(36,39)),Array.from(v.subarray(40,43))],shape,rest,mat}));}
 return out;
}
const hosts=[host(),host()],renderers=[],worlds=[world(),world()];
for(const [index,h] of hosts.entries()){
 const listeners=new Set(),bridge={addEventListener:(_,f)=>listeners.add(f),removeEventListener:(_,f)=>listeners.delete(f),postMessage(packet){h.apply(packet.op,JSON.parse(JSON.stringify(packet.data??null)));for(const f of listeners)f({data:{channel:'hb.render',id:packet.id,ok:true,value:packet.op==='frame'?{calls:1,meshes:1,textures:0}:{}}});}};
 const r=await createNativeSceneRenderer({clientWidth:64,clientHeight:64},()=>{},{bridge});r.hbHostStatic=index===1;renderers.push(r);
}
let hostGroups=0,setDraws=0,extraCasters=0,leftSets=false;
for(let frame=0;frame<170;frame++){
 for(const w of worlds){
  if(frame===100){const o=w.objects[150];o.position=[o.position[0],1,o.position[2]];w.sync(o);}
  if(frame===110)w.groups.get('o152').visible=false;
  if(frame===115){w.groups.get('o154').children[0].material.color.set(0xff0000);touchComponents(w.objects[154]);}
  if(frame===120)w.groups.get('o156').removeFromParent();
  if(frame>=130&&frame<150)w.camera.position.x=(frame-130)*.5;
 }
 for(const [i,r] of renderers.entries()){await r.render(worlds[i].scene,worlds[i].camera);await r.hbFinishFrame();}
 const [a,b]=hosts.map(h=>h.state),view=planes(b.vp);
 const main=(s,ps)=>s.order.flatMap(id=>rows(s,id,sphere=>inside(ps,sphere))).sort();
 assert.deepEqual(main(b,view),main(a,planes(a.vp)),'main pass draws frame '+frame);
 if(a.casters){for(let layer=0;layer<a.casters.length;layer++){const shadow=planes(b.shadows[layer].slice(0,16)),ac=a.casters[layer].flatMap(id=>rows(a,id,()=>true)),bc=new Set(b.casters[layer].flatMap(id=>rows(b,id,()=>true)));
   for(const row of ac)assert(bc.has(row),'shadow caster kept frame '+frame);
   const acSet=new Set(ac);for(const id of b.casters[layer]){const d=b.draws.get(id);if(!d.cullSet)continue;const inShadow=rows(b,id,sphere=>inside(shadow,sphere));for(const row of inShadow)assert(acSet.has(row),'extra caster row only outside the shadow frustum, frame '+frame);extraCasters+=rows(b,id,()=>true).length-inShadow.length;}}}
 if(frame===125){const g=worlds[1].groups;leftSets=['o150','o152','o154','o156'].every(id=>!g.get(id).hbHost)&&renderers[1].hbHostStats.groups>100;}
 hostGroups=Math.max(hostGroups,renderers[1].hbHostStats?.groups||0);setDraws=Math.max(setDraws,b.order.filter(id=>id.startsWith('host:')).length);
}
assert(hostGroups>100,'groups moved into host sets: '+hostGroups);assert(setDraws>0,'main pass draws host sets');
const ra=renderers[1].hbHostStats;assert(leftSets,'changed groups left their sets');
console.log(JSON.stringify({passed:true,frames:170,hostGroups,setDraws,finalStats:ra,mainPassDraws:[hosts[0].state.order.length,hosts[1].state.order.length],extraShadowRowsOutsideFrustum:extraCasters,scope:'Host static sets vs per-object draws: identical culled main pass, shadow casters a superset only outside each shadow frustum.'}));
for(const r of renderers)await r.dispose();
