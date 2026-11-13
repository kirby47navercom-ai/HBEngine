// TwoDRendering.prepare without 2D lights refreshes only the nodes it sorts (and their parents).
// Two identical scenes get the same moves of parents and sprites each frame; scene A also gets a whole-scene
// updateMatrixWorld() before prepare (the old behaviour). Render order and sorted-node world matrices must match.
// node tools/check-two-d-sort-matrices.mjs
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {TwoDRendering} from '../prototype/two-d-rendering.js';

function build(){
 const scene=new THREE.Scene(),groups=[],holders=[];
 for(let h=0;h<6;h++){const holder=new THREE.Group();holder.position.set(h*2-5,0,0);scene.add(holder);holders.push(holder);
  for(let i=0;i<8;i++){const group=new THREE.Group();group.userData.objectId='o'+h+'-'+i;group.position.set(0,i*.5,i%3);const mesh=new THREE.Mesh(new THREE.PlaneGeometry(),new THREE.MeshBasicMaterial());mesh.userData.objectId=group.userData.objectId;mesh.userData.draw2d={sortingLayer:'default',sortingOrder:i%2};if(i%4===0)mesh.userData.particleRenderer=true;group.add(mesh);holder.add(group);groups.push(group);}}
 const camera=new THREE.PerspectiveCamera(60,1,.1,100);camera.position.set(0,2,12);scene.add(camera);
 return {scene,groups,holders,camera,two:new TwoDRendering()};
}
const renderer={getDrawingBufferSize:v=>v.set(64,64)},a=build(),b=build();let frames=0;
for(let frame=0;frame<120;frame++){
 for(const s of [a,b]){const h=s.holders[frame%6];h.position.z=Math.sin(frame*.7)*4;h.rotation.y=frame*.05;const g=s.groups[(frame*7)%s.groups.length];g.position.x=Math.cos(frame)*.8;if(frame%10===0)s.camera.position.x=Math.sin(frame)*3;}
 a.scene.updateMatrixWorld();
 const ra=a.two.prepare(renderer,a.scene,a.camera,a.groups,undefined,{}),rb=b.two.prepare(renderer,b.scene,b.camera,b.groups,undefined,{});
 assert.deepEqual(rb,ra);
 for(let i=0;i<a.groups.length;i++){const x=a.groups[i].children[0],y=b.groups[i].children[0];assert.equal(y.renderOrder,x.renderOrder,`order ${i} frame ${frame}`);assert.deepEqual(Array.from(y.matrixWorld.elements),Array.from(x.matrixWorld.elements));}
 frames++;
}
console.log(JSON.stringify({passed:true,frames,sprites:a.groups.length,scope:'2D sort order and sorted-node world matrices without a whole-scene pass (no 2D lights).'}));
