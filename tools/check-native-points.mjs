// Native Points: a PointsMaterial point cloud becomes camera-facing quads (4 vertices / 6 indices per visible point),
// sized in pixels with perspective attenuation, keeping vertex colours; points behind the camera are dropped.
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {NativePointPool} from '../prototype/native-lines.js';

const camera=new THREE.PerspectiveCamera(60,1,.1,100);camera.position.set(0,0,5);camera.lookAt(0,0,0);camera.updateMatrixWorld();
const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0, 1,0,0, 0,0,10],3));geometry.setAttribute('color',new THREE.Float32BufferAttribute([1,0,0, 0,1,0, 0,0,1],3));
const points=new THREE.Points(geometry,new THREE.PointsMaterial({size:.2,vertexColors:true,sizeAttenuation:true}));points.updateMatrixWorld();
const pool=new NativePointPool();pool.begin();const mesh=pool.mesh(points,camera,800,600);
assert.ok(mesh?.isMesh,'points become a mesh');assert.equal(mesh.geometry.drawRange.count,12,'two visible points (one behind the camera)');
const p=mesh.geometry.attributes.position,c=mesh.geometry.attributes.color;
const width=new THREE.Vector3().fromBufferAttribute(p,1).distanceTo(new THREE.Vector3().fromBufferAttribute(p,0));
const expected=2*(.2*600/2/5)/800*(2*5*Math.tan(Math.PI/6))/2;assert.ok(Math.abs(width-expected)<1e-4,'quad width matches attenuated pixel size');
assert.deepEqual([c.getX(0),c.getY(0),c.getZ(0)],[1,0,0]);assert.deepEqual([c.getX(4),c.getY(4),c.getZ(4)],[0,1,0]);
assert.equal(pool.mesh(points,camera,800,600),mesh,'unchanged view reuses the quads');pool.end();
assert.throws(()=>pool.mesh(new THREE.Points(geometry,new THREE.MeshBasicMaterial()),camera,800,600),/PointsMaterial/);
pool.begin();pool.end();assert.equal(pool.entries.size,0,'unused clouds are released');
console.log(JSON.stringify({passed:true,width}));
