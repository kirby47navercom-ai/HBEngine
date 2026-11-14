// 2D static sort block (incremental sorting): two identical orthographic 2D scenes, A with static skipping off (full
// sort every frame), B with the block. Every frame the sprites ordered by renderOrder must be the same sequence in both.
// Moving sprites cross static ones, sprites use camera-depth and y sorting, layers and orders mix, the camera pans, a
// static sprite moves (announced), one changes its sorting order (announced), one group is removed; B must use the block.
// node tools/check-two-d-sort-block.mjs
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {TwoDRendering,twoDStaticStats} from '../prototype/two-d-rendering.js';
import {watchStaticGroup,staticConfig} from '../prototype/static-groups.js';
import {touchTransform,touchComponents,revisionConfig} from '../prototype/object-revision.js';

revisionConfig.verify=false;
const layers=[{id:'default'},{id:'ground',sortMode:'y'},{id:'front'}];
function build(){
 const scene=new THREE.Scene(),root=new THREE.Group(),groups=[],statics=new Map(),movers=[],geometry=new THREE.PlaneGeometry();scene.add(root);
 const sprite=(id,position,draw2d,watch)=>{const object={id,position,rotation:[0,0,0],scale:[1,1,1],components:[{id:'t',type:'Transform'},{id:'s',type:'SpriteRenderer'}]};
  const group=new THREE.Group(),mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({transparent:true}));group.userData.objectId=mesh.userData.objectId=id;mesh.userData.draw2d=draw2d;mesh.userData.draw2dId='sprite';group.add(mesh);root.add(group);group.position.fromArray(position);
  if(watch){watchStaticGroup(group,object);touchTransform(object);statics.set(id,{object,group});}groups.push(group);return group;};
 for(let i=0;i<400;i++)sprite('s'+i,[(i%25)*.8-10,Math.floor(i/25)*.8-6,((i*53)%97)/97],{sortingLayer:layers[i%3].id,sortingOrder:(i>>2)%3},true);
 for(let i=0;i<4;i++)movers.push(sprite('m'+i,[0,0,0],{sortingLayer:layers[i%3].id,sortingOrder:1},false));
 const camera=new THREE.OrthographicCamera(-12,12,9,-9,.1,100);camera.position.set(0,0,20);scene.add(camera);
 return {scene,groups,statics,movers,camera,two:new TwoDRendering()};
}
const renderer={getDrawingBufferSize:v=>v.set(64,64),hbDisplayCounts:false};
function run(enabled){
 staticConfig.enabled=enabled;const w=build(),frames=[];
 for(let frame=0;frame<200;frame++){
  w.movers.forEach((g,i)=>{g.position.set(Math.sin(frame*.05+i)*8,Math.cos(frame*.04+i*2)*5,.5+.5*Math.sin(frame*.09+i));});
  if(frame>=40&&frame<80)w.camera.position.set((frame-40)*.1,(frame-40)*.05,20+(frame-40)*.1);
  if(frame===100){const s=w.statics.get('s30');s.object.position=[1,1,.99];s.group.position.fromArray(s.object.position);touchTransform(s.object);}
  if(frame===120){const s=w.statics.get('s31'),mesh=s.group.children[0];mesh.userData.draw2d={...mesh.userData.draw2d,sortingOrder:9};touchComponents(s.object);}
  if(frame===140){const s=w.statics.get('s32');s.group.removeFromParent();w.groups.splice(w.groups.indexOf(s.group),1);}
  w.scene.updateMatrixWorld();w.two.prepare(renderer,w.scene,w.camera,w.groups,layers,{});
  frames.push(w.groups.map(g=>[g.userData.objectId,g.children[0].renderOrder]).sort((a,b)=>a[1]-b[1]).map(([id])=>id).join());
 }
 return frames;
}
const off=run(false),before=twoDStaticStats.blockFrames,on=run(true),blockFrames=twoDStaticStats.blockFrames-before;staticConfig.enabled=true;
for(let i=0;i<off.length;i++)assert.equal(on[i],off[i],'sorted sequence frame '+i);
assert(blockFrames>150,'block used: '+blockFrames);
console.log(JSON.stringify({passed:true,frames:off.length,sprites:404,blockFrames,blockBuilds:twoDStaticStats.blockBuilds,scope:'2D static sort block vs full sorting: identical renderOrder sequence every frame (orthographic, moving sprites, y and camera depth, pan, announced changes, removal).'}));
