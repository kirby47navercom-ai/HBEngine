// Software occlusion: a big wall hides a small box behind it, not one beside it, in front of it, or partly off screen;
// transparent / tiny meshes never occlude; the wall itself is never culled.
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {SoftwareOcclusion} from '../prototype/occlusion-culling.js';

const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(60,16/9,.1,500);camera.position.set(0,1,10);camera.lookAt(0,1,0);camera.updateMatrixWorld();
const wall=new THREE.Mesh(new THREE.BoxGeometry(12,6,.5),new THREE.MeshStandardMaterial());wall.position.set(0,1,0);scene.add(wall);
const glass=new THREE.Mesh(new THREE.BoxGeometry(30,30,.1),new THREE.MeshStandardMaterial({transparent:true,opacity:.5}));glass.position.set(0,1,6);scene.add(glass);
scene.updateMatrixWorld(true);
const frustum=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
const occlusion=new SoftwareOcclusion();occlusion.begin(scene,camera,16/9,frustum);
assert.equal(occlusion.stats.occluders,1,'only the opaque wall occludes');assert.ok(occlusion.occluders.has(wall));
const sphere=(x,y,z,r=.5)=>new THREE.Sphere(new THREE.Vector3(x,y,z),r);
assert.equal(occlusion.occludedSphere(sphere(0,1,-5)),true,'box behind the wall is hidden');
assert.equal(occlusion.occludedSphere(sphere(9,1,-5)),false,'box beside the wall stays');
assert.equal(occlusion.occludedSphere(sphere(0,1,3)),false,'box in front stays');
assert.equal(occlusion.occludedSphere(sphere(0,4.5,-1,1)),false,'box peeking over the top stays');
assert.equal(occlusion.occludedSphere(sphere(0,1,-5,40)),false,'huge sphere reaching past the wall stays');
assert.equal(occlusion.occludedSphere(wall.geometry.boundingSphere.clone().applyMatrix4(wall.matrixWorld),wall),false,'occluder never culls itself');
const ortho=new SoftwareOcclusion();ortho.begin(scene,new THREE.OrthographicCamera(),1,frustum);assert.equal(ortho.active,false,'orthographic views skip occlusion');
console.log(JSON.stringify({passed:true,stats:occlusion.stats}));
