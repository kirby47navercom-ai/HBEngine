// Cascaded directional shadows: a shadowed sun seen by a perspective camera packs one record per cascade,
// cascades grow with distance, each covers its split, and other lights keep their single record.
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {nativeShadows} from '../prototype/native-scene-renderer.js';

const sun=new THREE.DirectionalLight(0xffffff,1);sun.castShadow=true;sun.position.set(10,20,10);sun.target.position.set(0,0,0);
sun.shadow.camera.left=sun.shadow.camera.bottom=-20;sun.shadow.camera.right=sun.shadow.camera.top=20;sun.updateMatrixWorld(true);sun.target.updateMatrixWorld(true);
const camera=new THREE.PerspectiveCamera(60,16/9,.1,1000);camera.position.set(0,2,10);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);
const records=nativeShadows(sun,camera);
assert.equal(records.length,3,'three cascades by default');
assert.ok(records.every(r=>r.packed.length===24&&r.packed[22]===3),'size.z carries the cascade count');
const radii=records.map(r=>r.sphere.radius);assert.ok(radii[0]<radii[1]&&radii[1]<radii[2],'cascades grow with distance');
// A point near the camera is inside the first cascade, a far point only in the last.
const inside=(r,p)=>{const v=p.clone().applyMatrix4(new THREE.Matrix4().fromArray(r.packed.slice(0,16)));return Math.abs(v.x)<=1&&Math.abs(v.y)<=1&&v.z>=0&&v.z<=1;};
const nearPoint=new THREE.Vector3(0,0,8),farPoint=camera.position.clone().add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(70));
assert.ok(inside(records[0],nearPoint),'near point in cascade 0');assert.ok(!inside(records[0],farPoint)&&inside(records[2],farPoint),'far point only in the last cascade');
sun.userData.hbShadowCascades=1;assert.equal(nativeShadows(sun,camera).length,1,'one cascade keeps the fixed box');delete sun.userData.hbShadowCascades;
assert.equal(nativeShadows(sun).length,1,'no camera: fixed box');
const spot=new THREE.SpotLight(0xffffff,1);spot.castShadow=true;spot.updateMatrixWorld(true);assert.equal(nativeShadows(spot,camera).length,1,'spot lights unchanged');
console.log(JSON.stringify({passed:true,radii:radii.map(r=>Math.round(r*100)/100)}));
