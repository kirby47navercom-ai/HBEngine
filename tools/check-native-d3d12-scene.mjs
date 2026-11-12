// Builds and runs native/tests/d3d12-scene.cpp: SceneRenderer (D3D11) vs SceneMeshRenderer (D3D12) pixels on hardware and WARP.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {prepareNative,jsonInclude} from './prepare-native.mjs';
import {retainTestEvidence} from './test-artifacts.mjs';

const run=promisify(execFile),root=path.resolve(import.meta.dirname,'..'),compiler=process.env.CXX||'C:/msys64/ucrt64/bin/g++.exe',env={...process.env,PATH:path.dirname(compiler)+path.delimiter+process.env.PATH};
const work=await fs.mkdtemp(path.join(root,'native/build/d3d12-scene-'));retainTestEvidence(work);
await prepareNative();
const binary=path.join(work,'d3d12-scene.exe');
await run(compiler,['-std=c++17','-O2','-Wall','-Wextra','-Werror','-I','native/include','-I',path.relative(root,jsonInclude),'native/tests/d3d12-scene.cpp','-o',path.relative(root,binary),'-ldxgi','-ld3dcompiler','-lole32','-luuid','-lgdi32'],{cwd:root,env,windowsHide:true,timeout:180000,maxBuffer:4194304});
let output;try{output=(await run(binary,[],{cwd:root,env,windowsHide:true,timeout:300000})).stdout;}catch(error){output=error.stdout||'';if(!output)throw error;console.error(error.stderr);}
const result=JSON.parse(output.trim().split('\n').pop());
await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify({...result,scope:'Same scene shader (VS/PS from SceneRenderer) on direct D3D12: meshes, secondary UV, material constants, sRGB/linear maps with sampler keys, directional/point/spot/hemisphere lights, fog, tone mapping, alpha/additive blend, depth test/write, cull and mirrored winding, viewport and scissor, instancing (mirrored instance), shot positions, skin+morph, directional and spot shadow maps (shadow pass proven by an unshadowed D3D11 render), 20-light tile culling. D3D12 pixels compared to D3D11 on the same driver (max channel diff <= 2). Not probes/material programs/2D/transmission/bloom/post/motion vectors/point-light cube shadows, not game FPS.'},null,2));
console.log(JSON.stringify(result));
assert.equal(result.passed,true,result.error||result.hardware?.error);
assert.equal(result.hardware.validationErrors,0);assert.equal(result.software.validationErrors,0);
