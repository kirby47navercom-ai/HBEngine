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
// Bridge coverage: every renderer method the committed engine bridge calls must exist on the D3D12 renderer.
// Camera-view methods are being reworked in an uncommitted change elsewhere and are ported after it lands.
{const bridge=(await run('git',['show','HEAD:native/desktop/SceneRenderBridge.hpp'],{cwd:root,maxBuffer:64<<20})).stdout,header=await fs.readFile(path.join(root,'native/include/HBEngine/SceneRenderD3D12.hpp'),'utf8');
  const used=[...new Set([...bridge.matchAll(/renderer->([A-Za-z0-9_]+)\(/g)].map(m=>m[1]))].sort(),deferred=new Set(['selectCameraView','cameraViewBytes']);
  const missing=used.filter(name=>!deferred.has(name)&&!new RegExp('[ *&>:]'+name+'\\(').test(header));console.log(JSON.stringify({bridgeMethods:used.length,deferred:[...deferred],missing}));assert.deepEqual(missing,[],'D3D12 renderer lacks bridge methods: '+missing.join(', '));}
await prepareNative();
const binary=path.join(work,'d3d12-scene.exe');
await run(compiler,['-std=c++17','-O2','-Wall','-Wextra','-Werror','-I','native/include','-I',path.relative(root,jsonInclude),'native/tests/d3d12-scene.cpp','-o',path.relative(root,binary),'-ldxgi','-ld3dcompiler','-lole32','-luuid','-lgdi32'],{cwd:root,env,windowsHide:true,timeout:180000,maxBuffer:4194304});
let output;try{output=(await run(binary,[],{cwd:root,env,windowsHide:true,timeout:1200000,maxBuffer:256<<20})).stdout;}catch(error){output=error.stdout||'';if(!output)throw error;console.error(error.stderr);}
const result=JSON.parse(output.trim().split('\n').pop());
await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify({...result,scope:'Same scene shader (VS/PS from SceneRenderer) on direct D3D12: meshes, secondary UV, material constants, sRGB/linear maps with sampler keys, directional/point/spot/hemisphere lights, fog, tone mapping, alpha/additive blend, depth test/write, cull and mirrored winding, viewport and scissor, instancing (mirrored instance), shot positions, skin+morph, directional and spot shadow maps (shadow pass proven by an unshadowed D3D11 render), 20-light tile culling, reflection probe capture/filter/binding, sky HDRI and global probe atlas (each proven by an off render), baked lightmap with reflection mix, HDR bloom, full post chain (grade/vignette/chroma/grain/DOF/occlusion/auto exposure/LUT/FXAA), transmission capture, GPU mip generation, screen effects (SSR, SSGI with Hi-Z, AO, geometry GI, TAA, motion blur with previous world/pose/instances via MRT), node material programs (graph, surface/MRT, shadow), dynamic mesh streams, viewport clear, 2D render targets (mask/lit/light-mask/blend/cookie, stencil and additive offscreen modes, nested 2D sampling), GPU particles (compaction, bitonic sort, indirect draw, sprite sheet, HDR, 2D mask), explicit mips with region patches, ray-scene row updates; plus D3D11-equal statistics after the same script, and self-managed frames presented to a hidden window with resize and GPU timestamps. D3D12 pixels compared to D3D11 on the same driver (max channel diff <= 2). Not particle emit/interact, not path-traced screen variants (path/denoise/caustics), distance-field AO or HDRI path environment/point-light cube shadows, not game FPS.'},null,2));
console.log(JSON.stringify(result));
assert.equal(result.passed,true,result.error||result.hardware?.error);
assert.equal(result.hardware.validationErrors,0);assert.equal(result.software.validationErrors,0);
