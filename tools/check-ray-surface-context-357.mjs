import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {execFile} from 'node:child_process';import {promisify} from 'node:util';
import {rayFieldUsesFrame,rayGuidePreviousFields,rayPreviousProgramRequired} from '../prototype/ray-surface-history-context.js';import {rayProgramGLSL} from '../prototype/ray-material-shader.js';import {prepareNative,jsonInclude} from './prepare-native.mjs';import {retainTestEvidence,pruneTestArtifacts} from './test-artifacts.mjs';
const value=(op,dest)=>[op,dest,4,4,-1,-1,-1,-1,0,0,0],store=(reg,start=0,count=4)=>[8,-1,4,4,reg,-1,-1,-1,start,count,4];
const definitions=[
 ['constant physical',[0],[value(0,0),store(0)],false,false,false,false],
 ['live Time',[0],[value(2,0),store(0)],true,false,false,true],
 ['overwritten register',[0],[value(2,0),value(0,0),store(0)],false,false,false,false],
 ['output retains old register version',[0],[value(2,0),store(0,0,1),value(0,0),store(0,1,1)],true,false,false,true],
 ['output overwritten by constant',[0],[value(2,0),store(0),value(0,1),store(1)],false,false,false,false],
 ['coat anisotropy only',[5],[value(4,0),store(0,2,1),value(0,1),store(1,0,2)],false,false,true,true],
 ['coat mirror amount',[5],[value(1,0),store(0,0,1),value(0,1),store(1,1,3)],false,true,true,true],
 ['normal context retained',[3],[value(0,0),store(0,0,3)],false,false,false,true],
 ['previous emission context',[2],[value(5,0),store(0)],false,false,false,true],
 ['legacy fields',undefined,[value(3,0),store(0)],true,true,true,true]
];
const cases=definitions.map(([name,fields,instructions,physical,coat,fullCoat,copied],i)=>({name,programs:[{key:901+i,...fields?{fields}:{},instructions}],physical,coat,fullCoat,copied}));
const work=await fs.mkdtemp(path.resolve('native/build/ray-surface-context-357-'));retainTestEvidence(work);const run=promisify(execFile),compiler=process.env.CXX||'C:/msys64/ucrt64/bin/g++.exe',env={...process.env,PATH:path.dirname(compiler)+path.delimiter+process.env.PATH};
try{
 for(const c of cases){const p=c.programs[0],source=rayProgramGLSL(c.programs);assert.equal(rayFieldUsesFrame(p,0),c.physical,c.name);assert.equal(rayFieldUsesFrame(p,5,[0,1]),c.coat,c.name);assert.equal(rayFieldUsesFrame(p,5),c.fullCoat,c.name);assert.equal(rayPreviousProgramRequired(p),c.copied,c.name);assert.deepEqual(rayGuidePreviousFields(c.programs),c.name==='legacy fields'?[0,1,2,4,5,6,7,8,9]:c.name==='previous emission context'?[2]:[...(c.physical?[0]:[]),...(c.fullCoat?[5]:[])]);assert.equal(source.includes('vec4 hbRayPreviousProgram'+p.key+'('),c.copied);assert.equal(source.includes('#define HB_RAY_SURFACE_HISTORY_0 1'),c.physical);assert.equal(source.includes('#define HB_RAY_SURFACE_HISTORY_5 1'),c.fullCoat);if(!c.copied)assert.ok(source.includes('return hbRayProgram'+p.key+'(program.x'),'static full-field API reuses the current program body');}
 const input=path.join(work,'cases.json'),binary=path.join(work,'probe.exe');await fs.writeFile(input,JSON.stringify(cases));await prepareNative();await run(compiler,['-std=c++17','-O2','-Wall','-Wextra','-Werror','-I','native/include','-I',path.relative(process.cwd(),jsonInclude),'native/tests/ray-surface-context-357.cpp','-o',path.relative(process.cwd(),binary)],{env,windowsHide:true,timeout:60000,maxBuffer:1048576});const native=JSON.parse((await run(binary,[input],{env,windowsHide:true,timeout:10000})).stdout);assert.equal(native.passed,true);await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify({passed:true,cases:cases.length,native,scope:'Version-aware output liveness and guide-only channel dependency in JS/GLSL and generated C++; full previous coating/anisotropy values retain all-channel context; guide history selects every observed channel while legacy coat mirror classification remains xy-only. GPU values/game rendering are separate gates.'},null,2));console.log(JSON.stringify({work,passed:true,cases:cases.length}));
}catch(error){await fs.writeFile(path.join(work,'failure.json'),JSON.stringify({error:error.stack,stderr:error.stderr},null,2));throw error;}finally{await pruneTestArtifacts(work);}
