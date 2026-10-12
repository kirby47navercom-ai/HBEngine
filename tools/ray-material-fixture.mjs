import {rayOperationMask} from '../prototype/ray-materials.js';
import * as THREE from 'three';
import {makeMaterialNode,materialDefaults} from '../prototype/material-runtime.js';
import {GeometryGIWorld} from '../prototype/geometry-gi.js';
export function rayMaterialFixture(kind='color'){
 const surface=makeMaterialNode('surface'),sample=makeMaterialNode('texture'),uv=makeMaterialNode('uv'),shift=makeMaterialNode('scalarParameter'),add=makeMaterialNode('add');sample.texture='Assets/RayBands.svg';sample.parameter='Bands';sample.colorSpace=kind==='normal'?'linear':'srgb';shift.parameter='Shift';shift.value=0;
 const nodes=[surface,sample,uv,shift,add],edges=[],wire=(a,p,b,q)=>edges.push({from:{node:a.id,pin:p},to:{node:b.id,pin:q}});wire(uv,'value',add,'a');wire(shift,'value',add,'b');wire(add,'value',sample,'uv');
 const data={surface:{...materialDefaults,color:kind==='normal'?'#ffffff':'#000000',metalness:0,roughness:1,emissiveIntensity:2,...kind==='mask'?{blendMode:'masked',alphaTest:.5}:{}},graph:{nodes,edges},parameters:{Shift:0}};
 if(kind==='normal'){const normal=makeMaterialNode('normalMap');nodes.push(normal);wire(sample,'rgb',normal,'value');wire(normal,'value',surface,'normal');}
 else if(kind==='mask')wire(sample,'a',surface,'opacity');else if(kind==='checker'){const checker=makeMaterialNode('checker');checker.inputValues={scale:[2,1]};nodes.push(checker);wire(add,'value',checker,'uv');wire(checker,'value',surface,'emissive');}else wire(sample,'rgb',surface,'emissive');return data;
}
export function rayMaterialPackets106(){
 const result={};for(const kind of ['color','mask','normal','checker']){const data=rayMaterialFixture(kind),bytes=kind==='normal'?[128,128,255,255,128,128,255,255,255,128,128,255,255,128,128,255]:[255,0,0,kind==='mask'?0:255,255,0,0,kind==='mask'?0:255,0,255,0,255,0,255,0,255],texture=new THREE.DataTexture(new Uint8Array([...bytes,...bytes]),4,2);texture.magFilter=THREE.NearestFilter;texture.flipY=false;texture.needsUpdate=true;const m=new THREE.MeshPhysicalMaterial();m.userData.materialSource=data;m.userData.rayTextures=()=>[{map:texture,type:'texture2d',parameter:'Bands',path:'Assets/RayBands.svg'}];const scene=new THREE.Scene(),mesh=new THREE.Mesh(new THREE.PlaneGeometry(2,2),m);mesh.position.z=kind==='mask'?.3:.6;mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh);if(kind==='mask'){const background=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.MeshPhysicalMaterial({color:0,emissive:0x00ff00,emissiveIntensity:2}));background.position.z=.6;scene.add(background);}if(kind==='normal'){const light=new THREE.DirectionalLight(0xffffff,3);light.position.z=-1;scene.add(light);}
  const world=new GeometryGIWorld(),p=world.prepare(scene,true);result[kind]={...p,operationMask:rayOperationMask(p.rayInfo.operations).map((v,i)=>i===2?v+(p.rayInfo.registers-1)*4+(p.rayInfo.fields||[]).reduce((n,f)=>n+2**f,0)*256:v),rayPrograms:p.rayInfo.programs,rayInfo:{registers:p.rayInfo.registers,instructions:p.rayInfo.instructions,materials:p.rayInfo.materials,textures:p.rayInfo.textures},data:[...p.data]};world.dispose();scene.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});texture.dispose();}
 return result;
}
