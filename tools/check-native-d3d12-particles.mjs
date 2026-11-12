// Builds and runs native/tests/d3d12-particles.cpp: real D3D12 command lists (no D3D11On12) on hardware and WARP.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {prepareNative,jsonInclude} from './prepare-native.mjs';
import {retainTestEvidence} from './test-artifacts.mjs';

const run=promisify(execFile),root=path.resolve(import.meta.dirname,'..'),compiler=process.env.CXX||'C:/msys64/ucrt64/bin/g++.exe',env={...process.env,PATH:path.dirname(compiler)+path.delimiter+process.env.PATH};
const work=await fs.mkdtemp(path.join(root,'native/build/d3d12-particles-'));retainTestEvidence(work);
await prepareNative();
const binary=path.join(work,'d3d12-particles.exe');
await run(compiler,['-std=c++17','-O2','-Wall','-Wextra','-Werror','-I','native/include','-I',path.relative(root,jsonInclude),'native/tests/d3d12-particles.cpp','-o',path.relative(root,binary),'-ldxgi','-ld3dcompiler','-lole32','-luuid','-lgdi32'],{cwd:root,env,windowsHide:true,timeout:180000,maxBuffer:4194304});
let output;try{output=(await run(binary,[],{cwd:root,env,windowsHide:true,timeout:120000})).stdout;}catch(error){output=error.stdout||'';if(!output)throw error;console.error(error.stderr);}
const result=JSON.parse(output.trim().split('\n').pop());
await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify({...result,scope:'Same command sequence on hb::gpu::Particles (D3D11) and d3d12::Particles: step, emit into scanned free slots, plane bounce with collision events, kill with death events, 3-deep readback ring (fourth enqueue refused), clear, reset. Records and events compared as sorted multisets (GPU append order differs), max abs difference 1e-5, debug-layer errors 0.'},null,2));
console.log(JSON.stringify(result));
assert.equal(result.passed,true,result.error||result.hardware?.error);
assert.equal(result.hardware.validationErrors,0);assert.equal(result.software.validationErrors,0);
