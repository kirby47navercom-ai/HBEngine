// Host 2D sets (docs/HOST_SCENE_DESIGN.md): renderer A draws sprites per object, renderer B moves clean static sprites
// into ordered host 2D sets drawn as row ranges. Each frame 2D sorting assigns renderOrder (TwoDRendering.prepare), and
// the main pass of both renderers, expanded in order (B's ranges culled with the host sphere test, rows kept in order),
// must be the same sequence. Moving sprites cross the static ones (splitting ranges), the camera moves, a static sprite
// moves (announced), one is hidden and one changes its sorting order (announced); B must draw through ranges.
// node tools/check-host-2d-sets.mjs
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createNativeSceneRenderer} from '../prototype/native-scene-renderer.js';
import {TwoDRendering} from '../prototype/two-d-rendering.js';
import {watchStaticGroup} from '../prototype/static-groups.js';
import {touchTransform,touchComponents,revisionConfig} from '../prototype/object-revision.js';
import {applyDrawTransforms,instanceValues} from './native-mock-draw-transforms.mjs';

revisionConfig.verify=false;
function world(){
 const scene=new THREE.Scene(),root=new THREE.Group(),groups=[],objects=[],statics=new Map(),movers=[],geometry=new THREE.PlaneGeometry(1,1),colors=[0xffffff,0xff8080];scene.add(root);
 const sprite=(id,position,color,order,watch,opacity=.8)=>{const object={id,position,rotation:[0,0,0],scale:[1,1,1],components:[{id:'t',type:'Transform'},{id:'s',type:'SpriteRenderer'}]};
  const group=new THREE.Group(),mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color,transparent:true,opacity:.8,alphaTest:opacity<.7?.05:0,depthWrite:false}));group.uuid='g-'+id;mesh.uuid='m-'+id;group.userData.objectId=mesh.userData.objectId=id;mesh.userData.draw2d={sortingLayer:'default',sortingOrder:order};mesh.userData.sprite=true;group.add(mesh);root.add(group);group.position.fromArray(position);
  if(watch){watchStaticGroup(group,object);touchTransform(object);statics.set(id,{object,group});}groups.push(group);objects.push(object);return group;};
 for(let i=0;i<300;i++)sprite('s'+i,[(i%20)*.9-9,Math.floor(i/20)*.9-7,((i*37)%100)/100],colors[(i>>3)%2],0,true,i%3===0?.6:.8);
 for(let i=0;i<3;i++)movers.push(sprite('mover'+i,[i*3-3,0,0],0x80ff80,0,false));
 const camera=new THREE.OrthographicCamera(-12,12,9,-9,.1,100);camera.position.set(0,0,20);scene.add(camera);
 const sync=id=>{const {object,group}=statics.get(id);group.position.fromArray(object.position);touchTransform(object);};
 return {scene,root,groups,statics,movers,camera,sync,two:new TwoDRendering()};
}
const decode=v=>{const bytes=typeof v==='string'?Buffer.from(v,'base64'):Buffer.from(v);return new Float32Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));};
function planes(m){const p=[[m[3]-m[0],m[7]-m[4],m[11]-m[8],m[15]-m[12]],[m[3]+m[0],m[7]+m[4],m[11]+m[8],m[15]+m[12]],[m[3]+m[1],m[7]+m[5],m[11]+m[9],m[15]+m[13]],[m[3]-m[1],m[7]-m[5],m[11]-m[9],m[15]-m[13]],[m[3]-m[2],m[7]-m[6],m[11]-m[10],m[15]-m[14]],[m[3]+m[2],m[7]+m[6],m[11]+m[10],m[15]+m[14]]];return p.map(q=>{const l=Math.hypot(q[0],q[1],q[2]);return q.map(v=>v/l);});}
const inside=(ps,s)=>ps.every(p=>p[0]*s[0]+p[1]*s[1]+p[2]*s[2]+p[3]>=-s[3]);
function host(){
 const state={draws:new Map(),sets:new Map(),instances:new Map(),order:[],vp:null};
 const resourceOf=r=>{if(r.kind==='cullSet')state.sets.set(r.id,{rows:decode(r.rows),spheres:decode(r.spheres)});if(r.kind==='instances')state.instances.set(r.id,instanceValues(r));};
 return {state,apply(op,data){const resource=r=>r.kind==='drawTransforms'?applyDrawTransforms(state.draws,r):resourceOf(r);if(op==='upload')for(const r of data)resource(r);if(op!=='frame')return;for(const r of data.resources||[])resource(r);for(const id of data.remove||[])state.draws.delete(id);for(const d of data.updates||[])state.draws.set(d.id,d);if(data.order)state.order=data.order;state.vp=data.viewProjection;for(const id of data.release?.cullSets||[])state.sets.delete(id);}};
}
const round=v=>Array.from(v,x=>Math.fround(x));
// Rows in draw order: world, colour, uv and every other draw value (mesh ids differ per renderer and are left out).
function rows(state,id,ps){
 const d=state.draws.get(id);assert(d,'draw exists '+id);const {id:_i,mesh:_m,instances,cullSet,cullRange,world,normal:_n,material,...rest}=d,{color,uvX,uvY,...mat}=material;
 const row=(w,c,x,y)=>JSON.stringify({world:round(w),color:round(c),uv:[round(x),round(y)],rest,mat});
 if(cullSet){const set=state.sets.get(cullSet),out=[];assert(set,'set '+cullSet);for(let i=cullRange?cullRange[0]:0;i<(cullRange?cullRange[1]:set.spheres.length/4);i++){if(!inside(ps,set.spheres.subarray(i*4,i*4+4)))continue;const v=set.rows.subarray(i*44,i*44+44);out.push(row(v.subarray(0,16),v.subarray(32,36),v.subarray(36,39),v.subarray(40,43)));}return out;}
 if(instances){const v=state.instances.get(instances).values,out=[];for(let o=0;o<v.length;o+=44)out.push(row(v.slice(o,o+16),v.slice(o+32,o+36),v.slice(o+36,o+39),v.slice(o+40,o+43)));return out;}
 return [row(world,color,uvX[0].slice(0,3),uvY[0].slice(0,3))];
}
const hosts=[host(),host()],renderers=[],worlds=[world(),world()],stub={getDrawingBufferSize:v=>v.set(64,64),hbDisplayCounts:false};
for(const [index,h] of hosts.entries()){
 const listeners=new Set(),bridge={addEventListener:(_,f)=>listeners.add(f),removeEventListener:(_,f)=>listeners.delete(f),postMessage(packet){h.apply(packet.op,JSON.parse(JSON.stringify(packet.data??null)));for(const f of listeners)f({data:{channel:'hb.render',id:packet.id,ok:true,value:packet.op==='frame'?{calls:1,meshes:1,textures:0}:{}}});}};
 const r=await createNativeSceneRenderer({clientWidth:64,clientHeight:64},()=>{},{bridge});r.hbHostStatic=index===1;renderers.push(r);
}
const FRAMES=260;let hosted=0,maxRuns=0,rangeDraws=0;
for(let frame=0;frame<FRAMES;frame++){
 for(const w of worlds){
  w.movers.forEach((g,i)=>{g.position.z=.5+.5*Math.sin(frame*.07+i*2);g.position.x=Math.sin(frame*.03+i)*6;});
  if(frame===150){const s=w.statics.get('s40');s.object.position=[s.object.position[0],s.object.position[1],.95];w.sync('s40');}
  if(frame===160)w.statics.get('s41').group.visible=false;
  if(frame===170){const s=w.statics.get('s42');s.group.children[0].userData.draw2d={...s.group.children[0].userData.draw2d,sortingOrder:5};touchComponents(s.object);}
  if(frame>=200&&frame<230)w.camera.position.x=(frame-200)*.2;
 }
 for(const [i,r] of renderers.entries()){const w=worlds[i];w.scene.updateMatrixWorld();w.two.prepare(stub,w.scene,w.camera,w.groups,undefined,{});await r.render(w.scene,w.camera);await r.hbFinishFrame();}
 const [a,b]=hosts.map(h=>h.state),seq=s=>s.order.flatMap(id=>rows(s,id,planes(s.vp)));
 assert.deepEqual(seq(b),seq(a),'ordered main pass frame '+frame);
 const stats=renderers[1].hbHostStats||{};hosted=Math.max(hosted,stats.groups||0);maxRuns=Math.max(maxRuns,stats.runs2D||0);rangeDraws=Math.max(rangeDraws,b.order.filter(id=>id.startsWith('host2d:')).length);
}
assert(maxRuns>10,'interleaved sets give many runs: '+maxRuns);assert(hosted>=290,'static sprites moved into host 2D sets: '+hosted);assert(rangeDraws>1,'ranges drawn (split by moving sprites): '+rangeDraws);
console.log(JSON.stringify({passed:true,frames:FRAMES,hosted,maxRuns,maxRangeDraws:rangeDraws,finalStats:renderers[1].hbHostStats,mainPassDraws:[hosts[0].state.order.length,hosts[1].state.order.length],scope:'Ordered host 2D sets vs per-object sprites: identical ordered main pass with moving sprites splitting ranges.'}));
for(const r of renderers)await r.dispose();
