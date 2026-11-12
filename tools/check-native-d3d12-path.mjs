// Builds and runs native/tests/d3d12-path.cpp: path-traced screen variants (rendering-118/120 packets) on D3D11 vs D3D12.
// Hardware only by default: WARP JIT-compiles the path-tracing shaders far beyond an hour; pass --warp to include it.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {prepareNative,jsonInclude} from './prepare-native.mjs';
import {retainTestEvidence} from './test-artifacts.mjs';
import {rendering118Packets} from './rendering-118-fixture.mjs';
import {rendering120Packets} from './rendering-120-fixture.mjs';
import * as THREE from 'three';
import {prepareDistanceFieldMesh,bakeMeshDistanceField} from '../prototype/mesh-distance-field-core.js';

const run=promisify(execFile),root=path.resolve(import.meta.dirname,'..'),compiler=process.env.CXX||'C:/msys64/ucrt64/bin/g++.exe',env={...process.env,PATH:path.dirname(compiler)+path.delimiter+process.env.PATH};
const work=await fs.mkdtemp(path.join(root,'native/build/d3d12-path-'));retainTestEvidence(work);
await prepareNative();
// Distance-field atlas from the engine's own MeshDistanceFieldScene; the browser bake worker runs in-process here.
globalThis.Worker??=class{constructor(){queueMicrotask(()=>this.onmessage?.({data:{ready:true}}));}postMessage({id,vertices,options}){(async()=>{try{const triangles=[];for(let i=0;i<vertices.length;i+=9)triangles.push({points:[vertices.subarray(i,i+3),vertices.subarray(i+3,i+6),vertices.subarray(i+6,i+9)]});const field=await bakeMeshDistanceField(prepareDistanceFieldMesh(triangles),{...options,onProgress:()=>{}});this.onmessage?.({data:{id,field}});}catch(error){this.onmessage?.({data:{id,error:error.message,code:error.code}});}})();}terminate(){}};
const {MeshDistanceFieldScene}=await import('../prototype/mesh-distance-field-scene.js');
const distanceField=await (async()=>{const scene=new THREE.Scene(),material=new THREE.MeshStandardMaterial();const cube=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),material);cube.position.set(.2,-.3,0);const floor=new THREE.Mesh(new THREE.BoxGeometry(4,.1,4),material);floor.position.y=-.9;scene.add(cube,floor);scene.updateMatrixWorld(true);
  const owner=new MeshDistanceFieldScene();let frame;for(let i=0;i<200;i++){frame=owner.update(scene,{aoEnabled:true,aoMode:'distanceField',aoIntensity:1,aoDistanceFieldResolution:16},{});if(owner.state().ready)break;await new Promise(r=>setTimeout(r,25));}
  assert.equal(owner.state().objects,2,'distance field atlas not ready');const t=frame.texture;const out={data:[...t.image.data],width:t.image.width,height:t.image.height,encoded:frame.encodedSize};owner.dispose();return out;})();
const packets=path.join(work,'path-packets.json');await fs.writeFile(packets,JSON.stringify({rendering118:rendering118Packets(),rendering120:rendering120Packets(),distanceField}));
const binary=path.join(work,'d3d12-path.exe');
await run(compiler,['-std=c++17','-O2','-Wall','-Wextra','-Werror','-I','native/include','-I',path.relative(root,jsonInclude),'native/tests/d3d12-path.cpp','-o',path.relative(root,binary),'-ldxgi','-ld3dcompiler','-lole32','-luuid','-lgdi32'],{cwd:root,env,windowsHide:true,timeout:180000,maxBuffer:4194304});
let output;try{output=(await run(binary,[packets,...(process.argv.includes('--warp')?[]:['--hardware-only'])],{cwd:root,env,windowsHide:true,timeout:3600000,maxBuffer:256<<20})).stdout;}catch(error){output=error.stdout||'';if(!output)throw error;console.error(error.stderr);}
const result=JSON.parse(output.trim().split('\n').pop());
await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify({...result,scope:'rendering-118/120 JS packets (area, HDRI, mixed, direct, lens; caustic targets for 120) on SceneRenderer over D3D11On12 (exact reference: same D3D12 driver compiler) and SceneMeshRenderer (D3D12), with native D3D11 differences reported: raw progressive path tracing, spatial denoise, temporal filter, caustic photons; plus distance-field AO from a MeshDistanceFieldScene atlas (on/off). Max channel diff <= 2, debug-layer errors 0.'},null,2));
console.log(JSON.stringify(result));
assert.equal(result.passed,true,result.error||result.hardware?.error);
assert.equal(result.hardware.validationErrors,0);if(result.software)assert.equal(result.software.validationErrors,0);
