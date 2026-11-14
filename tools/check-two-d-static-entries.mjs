// Cached 2D sorting entries of clean static groups must give the same result as building them every frame: two
// identical scenes (static skipping off in A, on in B) get the same camera moves, announced moves, sorting changes,
// sort-point/sort-mode cases and a sorting group; render order and prepare results must match every frame, and B must
// actually reuse cached entries.
// node tools/check-two-d-static-entries.mjs
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {TwoDRendering,twoDStaticStats} from '../prototype/two-d-rendering.js';
import {watchStaticGroup,staticConfig} from '../prototype/static-groups.js';
import {touchTransform,touchComponents,revisionConfig} from '../prototype/object-revision.js';

revisionConfig.verify=false;
const layers=[{id:'default'},{id:'back',sortMode:'y'}];
function build(){
 const scene=new THREE.Scene(),root=new THREE.Group(),groups=[],objects=[];scene.add(root);
 const sorter=new THREE.Group();sorter.userData={objectId:'Sorter',sortingGroup:{sortingLayer:'default',sortingOrder:3}};root.add(sorter);groups.push(sorter);
 for(let i=0;i<300;i++){
  const object={id:'s'+i,position:[(i%20)-10,Math.floor(i/20)-7,(i%3)*.1],rotation:[0,0,0],scale:[1,1,1],components:[{id:'t',type:'Transform'},{id:'r',type:'SpriteRenderer'}]};
  const group=new THREE.Group();group.uuid='g'+i;group.userData.objectId=object.id;
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(),new THREE.MeshBasicMaterial({transparent:i%5===0,toneMapped:i%7!==0}));mesh.uuid='m'+i;mesh.userData.objectId=object.id;mesh.userData.draw2dId='sprite';
  mesh.userData.draw2d={sortingLayer:i%4===0?'back':'default',sortingOrder:i%3};if(i%6===0)mesh.userData.sortPoint=[0,-.5,0];if(i%9===0)mesh.userData.draw2d.sortMode='y';
  group.add(mesh);(i%25===0?sorter:root).add(group);watchStaticGroup(group,object);groups.push(group);objects.push(object);
 }
 const sync=o=>{const g=groups.find(g=>g.userData.objectId===o.id);g.position.fromArray(o.position);touchTransform(o);};for(const o of objects)sync(o);
 const camera=new THREE.PerspectiveCamera(60,1,.1,100);camera.position.set(0,0,20);scene.add(camera);
 return {scene,groups,objects,sync,camera,two:new TwoDRendering()};
}
const renderer={getDrawingBufferSize:v=>v.set(64,64)};
async function run(enabled){
 staticConfig.enabled=enabled;const w=build(),frames=[];
 for(let frame=0;frame<80;frame++){
  if(frame%8===0)w.camera.position.set(Math.sin(frame)*4,Math.cos(frame)*2,20-frame*.1);
  if(frame===20){const o=w.objects[41];o.position=[o.position[0],o.position[1]+3,o.position[2]];w.sync(o);}
  if(frame===30){const o=w.objects[57],mesh=w.groups.find(g=>g.userData.objectId===o.id).children[0];mesh.userData.draw2d={...mesh.userData.draw2d,sortingOrder:9};touchComponents(o);}
  if(frame===40){const mesh=w.groups.find(g=>g.userData.objectId==='s88').children[0];mesh.material.visible=false;}
  if(frame===50)w.groups.find(g=>g.userData.objectId==='s99').visible=false;
  if(frame===60)w.camera.position.set(-3,1,8);
  w.scene.updateMatrixWorld();
  const result=w.two.prepare(renderer,w.scene,w.camera,w.groups,layers,{});
  frames.push(JSON.stringify([result,w.groups.map(g=>g.children[0]?.renderOrder??null)]));
 }
 return frames;
}
const off=await run(false),before=twoDStaticStats.reusedGroups,on=await run(true),reused=twoDStaticStats.reusedGroups-before;staticConfig.enabled=true;
for(let i=0;i<off.length;i++)assert.equal(on[i],off[i],'frame '+i);
assert(reused>10000,'cached static entries reused: '+reused);
console.log(JSON.stringify({passed:true,frames:off.length,sprites:300,reusedGroups:reused,scope:'Cached static 2D sorting entries vs rebuilt entries: identical render order and prepare results.'}));
