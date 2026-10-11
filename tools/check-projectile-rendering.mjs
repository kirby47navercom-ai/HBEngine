import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createAsset} from '../prototype/asset-documents.js';
import {projectileRenderer} from '../prototype/projectile-rendering.js';
import {ProjectileWorld} from '../prototype/projectile-runtime.js';
import {createNativeProjectileMaterial} from '../prototype/native-scene-renderer.js';
const full={...createAsset('sprite','Full'),texture:'Assets/Sheet.png',slices:[{id:'top',name:'Top',rect:[0,0,32,16],pivot:[.5,.5],border:[0,0,0,0]}]},child={...createAsset('sprite','Top'),sheet:'Assets/Full.hbsprite.json',sliceId:'top'};
const original=THREE.TextureLoader.prototype.loadAsync;
try{
 for(const createMaterial of [undefined,createNativeProjectileMaterial]){
  const scene=new THREE.Scene(),errors=[],loaded=[],released=[];THREE.TextureLoader.prototype.loadAsync=async url=>{const t=new THREE.DataTexture(new Uint8Array(32*32*4),32,32);t.addEventListener('dispose',()=>released.push(t));loaded.push(url);return t;};
  const view=projectileRenderer({scene:()=>scene,fileUrl:p=>p,readAsset:async p=>p.includes('Top')?child:full,error:e=>errors.push(e),createMaterial}),world=new ProjectileWorld({capacity:8,render:w=>view.update(w),dispose:()=>view.dispose()});
  for(const [texture,shape,uv] of [['Assets/Full.hbsprite.json',[1,1],[0,0,1,1]],['Assets/Top.hbsprite.json',[1,.5],[0,.5,1,.5]]]){
   world.fire({origin:[1,2,3],size:4,texture},'owner');for(let i=0;i<8;i++)await new Promise(r=>setTimeout(r,0));const mesh=scene.children[0];assert.equal(mesh.geometry.instanceCount,1);assert.deepEqual(mesh.material.uniforms.shape.value.toArray(),shape);assert.deepEqual(mesh.material.uniforms.uvRect.value.toArray(),uv);assert.deepEqual(Array.from(mesh.geometry.attributes.shotPosition.array.slice(0,3)),[1,2,3]);world.clear('owner');assert.equal(scene.children.length,0);
  }
  assert.deepEqual(loaded,['Assets/Sheet.png','Assets/Sheet.png']);assert.equal(released.length,2);assert.equal(errors.length,0);world.dispose();
  let complete;THREE.TextureLoader.prototype.loadAsync=()=>new Promise(r=>complete=r);const lateScene=new THREE.Scene(),late=projectileRenderer({scene:()=>lateScene,fileUrl:p=>p,readAsset:async()=>full,error:e=>errors.push(e),createMaterial}),lateWorld=new ProjectileWorld({capacity:8,render:w=>late.update(w),dispose:()=>late.dispose()});lateWorld.fire({origin:[0,0,0],texture:'Assets/Late.png'},'owner');lateWorld.clear();const lateMap=new THREE.DataTexture(new Uint8Array(4),1,1);let disposals=0;lateMap.addEventListener('dispose',()=>disposals++);complete(lateMap);await new Promise(r=>setTimeout(r,0));assert.equal(disposals,1);assert.equal(lateScene.children.length,0);lateWorld.dispose();
 }
 console.log('투사체 공용 GL/DirectX 머테리얼: 전체 영역·자식 시트·UV/비율·지연 로딩 해제 PASS');
}finally{THREE.TextureLoader.prototype.loadAsync=original;}
