import * as THREE from 'three';
import {makeMaterialNode} from '../prototype/material-runtime.js';
import {GeometryGIWorld} from '../prototype/geometry-gi.js';
import {rayMaterialFixture} from './ray-material-fixture.mjs';

export function alphaPacket274(){
 const data=rayMaterialFixture('mask'),g=data.graph,surface=g.nodes[0],sample=g.nodes.find(n=>n.key==='texture');
 let from={node:sample.id,pin:'rgb'};
 for(let n=0;n<24;n++){const node=makeMaterialNode(n%2?'sine':'multiply');if(n%2===0)node.inputValues.b=1.125;g.nodes.push(node);g.edges.push({from,to:{node:node.id,pin:n%2?'value':'a'}});from={node:node.id,pin:'value'};}
 g.edges.push({from,to:{node:surface.id,pin:'baseColor'}});
 const pixels=new Uint8Array([255,80,20,0,40,255,80,255,255,80,20,0,40,255,80,255]),texture=new THREE.DataTexture(pixels,2,2);texture.minFilter=texture.magFilter=THREE.NearestFilter;texture.generateMipmaps=false;texture.flipY=false;texture.needsUpdate=true;
 const material=new THREE.MeshPhysicalMaterial();material.userData.materialSource=data;material.userData.rayTextures=()=>[{map:texture,type:'texture2d',parameter:'Bands',path:'Assets/RayBands.svg'}];
 const scene=new THREE.Scene(),geometry=new THREE.PlaneGeometry(2,2),mesh=new THREE.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh);const world=new GeometryGIWorld();
 try{const p=world.prepare(scene,true);return {data:[...p.data],width:p.width,height:p.height,rayInfo:p.rayInfo,geometryInfo:[p.width,p.height,p.nodeCount,p.triangleOffset],geometryRecords:p.geometryRecords,transport:[p.materialsOffset,p.transportVersion,0,32]};}
 finally{world.dispose();geometry.dispose();material.dispose();texture.dispose();}
}
