import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
import * as THREE from 'three';
import {collectGeometryGI,packGeometryGI} from '../prototype/geometry-gi.js';
import {createAsset} from '../prototype/asset-documents.js';
import {makeMaterialNode} from '../prototype/material-runtime.js';

const scene=new THREE.Scene(),geometry=new THREE.SphereGeometry(1,12,8),doc=createAsset('material','Pack122');
Object.assign(doc.surface,{metalness:1,roughness:.3,clearcoat:.8,iridescence:.4});
const checker=makeMaterialNode('checker'),surface=makeMaterialNode('surface');
doc.graph={nodes:[checker,surface],edges:[{from:{node:checker.id,pin:'value'},to:{node:surface.id,pin:'roughness'}}]};
const material=new THREE.MeshPhysicalMaterial();material.userData.materialSource=doc;
for(let i=0;i<32;i++){const mesh=new THREE.Mesh(geometry,material);mesh.position.set(i%8*3,Math.floor(i/8)*3,0);scene.add(mesh);}
const source=collectGeometryGI(scene,true,true),triangles=source.triangles,motion=new Map(triangles.map(t=>[t.sourceID,t.points]));
const first=packGeometryGI(triangles,source.lights,true,null,null,true,motion,true),snapshot=first.data.slice();
const unchanged=packGeometryGI(triangles,source.lights,true,null,first,true,motion,true);
assert.equal(unchanged.data,first.data);assert.equal(unchanged.changedRows.length,0);assert.deepEqual(unchanged.data,snapshot);
const moved=triangles.map(t=>({...t,points:t.points.map(p=>[p[0]+.1,p[1],p[2]]),center:[t.center[0]+.1,t.center[1],t.center[2]]}));
const next=packGeometryGI(moved,source.lights,true,null,unchanged,true,motion,true);
assert.ok(next.changedRows.length>0);assert.ok(next.motionChanged);assert.ok(next.work.reusedMaterialBlock);
const preserved=next.data.slice(),bad=triangles.map((t,i)=>i? t:{...t,uv:[[NaN,0],[0,0],[0,0]]});
assert.throws(()=>packGeometryGI(bad,source.lights,true,null,next,true,motion,true));assert.deepEqual(next.data,preserved);
const empty=packGeometryGI([],[],false);assert.equal(empty.triangles,0);assert.deepEqual([...empty.data],[0,0,0,0]);
const result={passed:true,triangles:triangles.length,instances:32,staticBufferReused:true,unchangedRowsZero:true,changedRowsAndMotionPreserved:true,invalidUVAtomic:true,emptyScene:true,atlasBytes:next.data.byteLength};

// Optional local before-change sources prove byte parity and measure only packing, never game FPS.
const baselineArg=process.argv.indexOf('--baseline');
if(baselineArg>=0){
 const directory=path.resolve(process.argv[baselineArg+1]),root=path.resolve('prototype');
 const moduleURL=code=>'data:text/javascript;base64,'+Buffer.from(code).toString('base64');
 const absoluteImports=code=>code.replace(/from '(\.\/[^']+|three[^']*)'/g,(_,p)=>"from '"+(p.startsWith('./')?pathToFileURL(path.join(root,p)).href:import.meta.resolve(p))+"'");
 const oldRay=moduleURL(absoluteImports(await fs.readFile(path.join(directory,'ray-materials-before-122.txt'),'utf8')));
 const oldCode=absoluteImports(await fs.readFile(path.join(directory,'geometry-gi-before-122.txt'),'utf8')).replace(pathToFileURL(path.join(root,'ray-materials.js')).href,oldRay);
 const {packGeometryGI:oldPack}=await import(moduleURL(oldCode));
 for(const transport of [false,true])for(const targets of [false,true])for(const moving of [false,true]){
  const a=oldPack(triangles,source.lights,transport,null,null,true,moving?motion:null,targets),b=packGeometryGI(triangles,source.lights,transport,null,null,true,moving?motion:null,targets);
  assert.deepEqual(b.data,a.data);for(const key of ['width','height','nodeCount','triangleOffset','materialsOffset','emitterOffset','emitterCount','motionOffset','causticTargets'])assert.deepEqual(b[key],a[key],key);
 }
 const oldTimes=[],newTimes=[];
 for(let i=0;i<18;i++){const pair=i%2?[[packGeometryGI,newTimes],[oldPack,oldTimes]]:[[oldPack,oldTimes],[packGeometryGI,newTimes]];for(const[pack,times]of pair){const start=performance.now();pack(triangles,source.lights,true,null,null,true,motion,true);if(i>=6)times.push(performance.now()-start);}}
 const median=times=>times.sort((a,b)=>a-b)[Math.floor(times.length/2)];
 result.baseline={allEightLayoutsByteIdentical:true,alternatingPairs:12,oldMedianMs:median(oldTimes),newMedianMs:median(newTimes),scope:'Fixed prepared triangle input, packing only; excludes collection, upload, rendering and game FPS.'};
}
geometry.dispose();material.dispose();
if(process.argv.includes('--record'))await fs.writeFile('native/build/rendering-122-cpu.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result));
