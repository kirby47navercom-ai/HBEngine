import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as THREE from 'three';
import {GeometryGIWorld} from '../prototype/geometry-gi.js';
import {packedRaySceneUpdate} from '../prototype/native-scene-renderer.js';
import {mipMaterial109} from './rendering-109-fixture.mjs';
const map=new THREE.DataTexture(new Uint8Array(128*128*4).fill(255),128,128);map.generateMipmaps=true;map.minFilter=THREE.LinearMipmapLinearFilter;map.needsUpdate=true;
const material=new THREE.MeshPhysicalMaterial();material.userData.materialSource=mipMaterial109();material.userData.rayTextures=()=>[{map,type:'texture2d',parameter:'Bands',path:'Assets/Mip109.svg'}];
const scene=new THREE.Scene(),mesh=new THREE.Mesh(new THREE.PlaneGeometry(),material),world=new GeometryGIWorld();scene.add(mesh);world.prepare(scene,true);
const texture=world.texture,initial=world.packed.data.slice(),bytes=initial.byteLength;texture.onUpdate(texture);
let patchBytes=0;for(let i=1;i<=20;i++){mesh.position.x=i*.01;world.prepare(scene,true);assert.equal(world.texture,texture);const patch=packedRaySceneUpdate(texture),payload=Buffer.from(patch.rgbaBase64,'base64');assert.equal(payload.length,patch.rows*patch.width*16);const simulated=initial.slice();new Uint8Array(simulated.buffer).set(payload,patch.row*patch.width*16);assert.deepEqual(simulated,world.packed.data);patchBytes=payload.length;assert.ok(patchBytes<bytes,JSON.stringify({bytes,patchBytes}));initial.set(world.packed.data);texture.onUpdate(texture);assert.equal(texture.updateRanges.length,0);}
const version=texture.version;assert.equal(world.prepare(scene,true),world.packed);assert.equal(texture.version,version);
for(let i=0;i<80;i++){mesh.position.y=i*.01;world.prepare(scene,true);}assert.ok(texture.updateRanges.length<=texture.image.height);assert.equal(new Set(texture.updateRanges.map(r=>r.start)).size,texture.updateRanges.length);
const pending=packedRaySceneUpdate(texture);assert.ok(pending.rows<=texture.image.height);
texture.onUpdate(texture);mesh.position.y=.2;world.prepare(scene,true);material.userData.materialSource.parameters.Scale=16;world.prepare(scene,true);const combined=packedRaySceneUpdate(texture);const destination=initial.slice();new Uint8Array(destination.buffer).set(Buffer.from(combined.rgbaBase64,'base64'),combined.row*combined.width*16);assert.deepEqual(destination,world.packed.data);
texture.onUpdate(texture);const resized=new THREE.DataTexture(new Uint8Array(2*2*4).fill(255),2,2);resized.needsUpdate=true;material.userData.rayTextures=()=>[{map:resized,type:'texture2d',parameter:'Bands',path:'Assets/Mip109.svg'}];let disposed=0;texture.addEventListener('dispose',()=>disposed++);world.prepare(scene,true);assert.notEqual(world.texture,texture);assert.equal(disposed,1);
const probe=new THREE.DataTexture(new Float32Array(16).fill(1),2,2,THREE.RGBAFormat,THREE.FloatType);probe.userData.hbRayScene=true;probe.addUpdateRange(8,8);assert.equal(Buffer.from(packedRaySceneUpdate(probe).rgbaBase64,'base64').length,32);
for(const range of [{start:-8,count:8},{start:1,count:8},{start:8,count:0},{start:8,count:16},{start:0,count:1},{start:NaN,count:8}]){probe.updateRanges=[range];assert.throws(()=>packedRaySceneUpdate(probe));}
probe.updateRanges=[{start:8,count:8}];probe.image.data[0]=NaN;assert.throws(()=>packedRaySceneUpdate(probe));probe.image.data[0]=1;probe.flipY=true;assert.throws(()=>packedRaySceneUpdate(probe));
world.dispose();assert.equal(world.texture,null);mesh.geometry.dispose();material.dispose();map.dispose();resized.dispose();probe.dispose();
const result={passed:true,frames:20,resourceReused:true,partialCopyMatchesFullPacket:true,pendingRangesUnionBounded:true,resizeReallocates:true,invalidRangesAndValuesRejected:true,atlasBytes:bytes,translationPatchBytes:patchBytes,translationBytesFraction:patchBytes/bytes,webgpu:'Resource reused; installed Three r180 still uploads complete DataTexture.'};
if(process.argv.includes('--record')){await fs.mkdir('native/build',{recursive:true});await fs.writeFile('native/build/ray-atlas-110.json',JSON.stringify(result,null,2)+'\n');}console.log(JSON.stringify(result));
