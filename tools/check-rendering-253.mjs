import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';import {execFile} from 'node:child_process';import {promisify} from 'node:util';
import {compileRayProgram} from '../prototype/ray-material-program.js';import {compileRayMaterial,rayProgramLayouts} from '../prototype/ray-materials.js';import {rayProgramGLSL} from '../prototype/ray-material-shader.js';import {sharedNormalFixture253,normalPacket253} from './rendering-253-fixture.mjs';import {retainTestEvidence} from './test-artifacts.mjs';
const work=await fs.mkdtemp(path.resolve('native/build/rendering-253-'));retainTestEvidence(work);const checks=[],metrics={};
const op=(operation,args=[],value=[0,0,0,0],size=1)=>({operation,args,value,size,inputSize:size});
function evaluate(program,uv,time){const registers=[],result=[0,0,0,0];for(const i of program){const [code,dest,size]=i,a=registers[i[4]],b=registers[i[5]],value=i.slice(8);if(code===8){for(let j=0;j<i[9];j++)result[i[8]+j]=a[i[11]<2?0:j]*i[10];continue;}let v;if(code===0)v=value;else if(code===1)v=[...uv,0,0];else if(code===2)v=[time,time,time,time];else if(code===10)v=a.map((v,j)=>v+b[j]);else if(code===12)v=a.map((v,j)=>v*b[j]);else throw Error('test operation '+code);if(size===1)v=Array(4).fill(v[0]);else v=v.map((v,j)=>j<size?v:0);registers[dest]=v;}return result;}
async function check(name,run){await run();checks.push(name);}
try{
 await check('sharing preserves ordered stores, scalar/vector widths, metadata and signed zero',()=>{
  const ops=[op(1,[],[0,0,0,0],2),op(0,[],[.25,.25,.25,.25]),op(10,[0,1],undefined,2),op(8,[2],[0,2,1,2],4),op(1,[],[0,0,0,0],2),op(0,[],[.25,.25,.25,.25]),op(10,[4,5],undefined,2),op(8,[6],[2,2,1,2],4)];
  const p=compileRayProgram(ops);assert.equal(p.length,5);assert.deepEqual(p.filter(i=>i[0]===8).map(i=>i.slice(8)),[[0,2,1,2],[2,2,1,2]]);
  for(let x=-2;x<=2;x+=.125)for(let y=-2;y<=2;y+=.125)assert.deepEqual(evaluate(p,[x,y],0),[x+.25,y+.25,x+.25,y+.25]);
  const z=compileRayProgram([op(0,[],[-0,-0,-0,-0]),op(8,[0],[0,1,1,1],4),op(0),op(8,[2],[1,1,1,1],4)]);assert.equal(z.length,4);assert.ok(Object.is(evaluate(z,[0,0],0)[0],-0));
 });
 await check('sharing falls back to recomputation when common values exceed 64 live registers',()=>{
  const ops=[];for(let pass=0;pass<2;pass++)for(let i=0;i<65;i++){const id=ops.length;ops.push(op(0,[],[i,i,i,i]),op(8,[id],[0,1,1,1],4));}const p=compileRayProgram(ops);assert.equal(p.length,ops.length);assert.equal(evaluate(p,[0,0],0)[0],64);
  const live=Array.from({length:65},(_,i)=>op(0,[],[i,i,i,i]));for(let i=0;i<65;i++)live.push(op(8,[i],[0,1,1,1],4));assert.throws(()=>compileRayProgram(live),/레지스터/);
  const stores=[op(0),...Array.from({length:4096},()=>op(8,[0],[0,1,1,1],4))];assert.throws(()=>compileRayProgram(stores),/명령/);
 });
 const run=promisify(execFile),rewrite=s=>s.replace(/(from\s*['"])(\.\/[^'"]+)(['"])/g,(_,a,p,b)=>a+pathToFileURL(path.resolve('prototype',p)).href+b);
 const baselineSource=(await run('git',['show','ee36745:prototype/ray-materials.js'],{windowsHide:true,maxBuffer:1024*1024})).stdout;
 const baselineFile=path.join(work,'ray-materials-baseline.mjs');await fs.writeFile(baselineFile,rewrite(baselineSource));const baseline=await import(pathToFileURL(baselineFile));
 const geometry= rewrite(await fs.readFile('prototype/geometry-gi.js','utf8')).replace(pathToFileURL(path.resolve('prototype/ray-materials.js')).href,pathToFileURL(baselineFile).href);const worldFile=path.join(work,'geometry-baseline.mjs');await fs.writeFile(worldFile,geometry);const {GeometryGIWorld:BeforeWorld}=await import(pathToFileURL(worldFile));
 await check('real duplicated normal/UV/texture graph compacts instruction, atlas and generated GLSL without changing fields/defaults',async()=>{
  const before=sharedNormalFixture253(BeforeWorld),after=sharedNormalFixture253();try{
   const a=baseline.compileRayMaterial(before.material,.5),b=compileRayMaterial(after.material,.5);assert.deepEqual(a.defaults,b.defaults);assert.deepEqual(a.fields,b.fields);assert.equal(a.normalConnected,b.normalConnected);
   const oldProgram=baseline.rayProgramLayouts(a.programs),newProgram=rayProgramLayouts(b.programs);metrics.graph={beforeInstructions:a.programs.flat().length,afterInstructions:b.programs.flat().length,beforeGLSLBytes:Buffer.byteLength(rayProgramGLSL(oldProgram)),afterGLSLBytes:Buffer.byteLength(rayProgramGLSL(newProgram)),beforeRegisters:a.registers,afterRegisters:b.registers};assert.ok(metrics.graph.afterInstructions<metrics.graph.beforeInstructions);assert.ok(metrics.graph.afterGLSLBytes<metrics.graph.beforeGLSLBytes);
   const packets={before:normalPacket253(before),after:normalPacket253(after)};await fs.writeFile(path.join(work,'packets.json'),JSON.stringify(packets));metrics.graph.beforeAtlasBytes=packets.before.data.length*4;metrics.graph.afterAtlasBytes=packets.after.data.length*4;assert.ok(metrics.graph.afterAtlasBytes<metrics.graph.beforeAtlasBytes);
  }finally{before.dispose();after.dispose();}
 });
 await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify({passed:true,checks,metrics,baselineRevision:'ee36745',newRuntimeCaches:0,newReadbacks:0,newHistoryTargets:0,scope:'Compile-time IR equivalence/size; actual driver pixels/compilation are a separate check, not full-game FPS.'},null,2));console.log(JSON.stringify({work,passed:true,metrics}));
}catch(error){await fs.writeFile(path.join(work,'failure.json'),JSON.stringify({error:error.stack,checks,metrics},null,2));throw error;}
