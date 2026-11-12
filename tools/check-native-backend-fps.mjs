// Same packaged 3D game on each native graphics backend: hidden window, uncapped frames, steady-state frame rate.
// node tools/check-native-backend-fps.mjs [frames=600] [rounds=2] [light|heavy]
// heavy: 1920x1080 with SSR, SSGI, AO, TAA, motion blur, auto exposure and grading on the post volume.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createProject} from './project-manifest.mjs';
import {buildGame} from './build-game.mjs';
import {defaultBuildProfile} from '../prototype/build-profile.js';
import {createPlacedObject} from '../prototype/placement-catalog.js';
import {retainTestEvidence} from './test-artifacts.mjs';
import {activeInstalledVersions} from './install-editor.mjs';

assert.deepEqual(await activeInstalledVersions('C:/Users/kirby/HBEngine'),[]);
const frames=Number(process.argv[2]||600),rounds=Number(process.argv[3]||2),heavy=process.argv[4]==='heavy',backends=['d3d11','d3d12-11on12','d3d12'];
const root=path.resolve(import.meta.dirname,'..'),work=await fs.mkdtemp(path.join(root,'native/build/backend-fps-'));retainTestEvidence(work);
const record=await createProject('백엔드 FPS 비교',path.join(work,'Project'),'3d'),scenePath=record.manifest.startupScene;
const scene=JSON.parse(await fs.readFile(path.join(record.root,scenePath),'utf8'));
// 20x20 grid of lit, shadowed primitives, eight point lights, two spot lights, post volume, reflection probe, two particle systems.
const shapes=['cube','sphere','torus','cylinder','cone','capsule'];
for(let i=0;i<400;i++)scene.objects.push(createPlacedObject(shapes[i%shapes.length],{id:'mesh'+i,position:[(i%20-9.5)*1.6,.6+(i%3)*.4,(Math.floor(i/20)-9.5)*1.6]}));
for(let i=0;i<8;i++)scene.objects.push(createPlacedObject('pointLight',{id:'point'+i,position:[Math.cos(i)*10,3,Math.sin(i)*10]}));
for(let i=0;i<2;i++)scene.objects.push(createPlacedObject('spotLight',{id:'spot'+i,position:[i?8:-8,6,0]}));
for(const [key,id,position] of [['postProcess','post',[0,0,0]],['reflectionProbe','probe',[0,2,0]],['particles','fx0',[-4,1,-4]],['particles','fx1',[4,1,4]]])scene.objects.push(createPlacedObject(key,{id,position}));
if(heavy)Object.assign(scene.objects.find(o=>o.id==='post').components.find(c=>c.type==='PostProcessVolume').properties,{ssrEnabled:true,ssgiEnabled:true,aoEnabled:true,antiAliasing:'taa',motionBlurEnabled:true,autoExposureEnabled:true,colorGradingEnabled:true,vignetteEnabled:true});
await record.project.write(scenePath,JSON.stringify(scene));
const profile={...defaultBuildProfile(record.manifest),configuration:'release',width:heavy?1920:1280,height:heavy?1080:720},built=await buildGame(record,profile);

const env=name=>({SystemRoot:process.env.SystemRoot||'C:/Windows',WINDIR:process.env.WINDIR||'C:/Windows',PATH:(process.env.SystemRoot||'C:/Windows')+'/System32',TEMP:path.join(work,'Temp'),TMP:path.join(work,'Temp'),LOCALAPPDATA:path.join(work,'User-'+name),APPDATA:path.join(work,'User-'+name,'Roaming'),HB_NATIVE_TEST_STATE:path.join(work,'State-'+name)});
await fs.mkdir(path.join(work,'Temp'),{recursive:true});
async function run(api,round){
  const report=path.join(work,`report-${api}-${round}.json`),child=spawn(built.executable,['--hidden','--silent','--uncapped','--frames',String(frames),'--report',report,'--graphics-api',api],{windowsHide:true,env:env(api+'-'+round)});
  let stderr='';child.stderr.on('data',b=>stderr+=b);
  const code=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{child.kill();reject(Error(api+' timeout'));},600000);child.once('error',reject);child.once('close',c=>{clearTimeout(timer);resolve(c);});});
  const result=JSON.parse(await fs.readFile(report,'utf8').catch(async()=>{throw Error(api+' exit '+code+' '+stderr+await fs.readFile(path.join(work,'State-'+api+'-'+round,'native-runtime.log'),'utf8').catch(()=>''));}));
  assert.equal(code,0,stderr);assert.equal(result.frames,frames);
  const times=result.logic.profile.frames.map(f=>f.frameWorkMs).filter(Number.isFinite),steady=times.slice(Math.floor(times.length/4)).sort((a,b)=>a-b),pick=q=>steady[Math.min(steady.length-1,Math.floor(q*steady.length))];
  const total=steady.reduce((a,b)=>a+b,0);
  return {api,round,wallFPS:(()=>{const m=result.ms.slice(Math.floor(result.ms.length/4));return 1000*m.length/m.reduce((x,y)=>x+y,0);})(),runtime:result.runtime,backend:result.renderer?.backend,draws:result.renderer?.info?.calls,lastGpuMs:result.renderer?.gpuTimeMs,steadyFrames:steady.length,fps:1000*steady.length/total,median:pick(.5),p95:pick(.95),p99:pick(.99),max:steady.at(-1),rssMB:Math.round((result.memory?.rss||0)/1048576)};
}
const rows=[];for(let round=0;round<rounds;round++)for(const api of round%2?[...backends].reverse():backends){const row=await run(api,round);console.log(JSON.stringify(row));rows.push(row);}
const summary=Object.fromEntries(backends.map(api=>{const r=rows.filter(x=>x.api===api);return [api,{fps:r.reduce((a,x)=>a+x.fps,0)/r.length,wallFPS:r.reduce((a,x)=>a+x.wallFPS,0)/r.length,draws:r[0].draws,lastGpuMs:r.map(x=>x.lastGpuMs),median:r.reduce((a,x)=>a+x.median,0)/r.length,p99:Math.max(...r.map(x=>x.p99)),backend:r[0].backend}];}));
for(const api of backends)assert.equal(rows.find(r=>r.api===api).runtime,'win32-'+api+'-v8');
assert.equal(new Set(rows.map(r=>r.draws)).size,1,'every backend draws the same calls');
await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify({frames,rounds,mode:heavy?'heavy 1920x1080 SSR/SSGI/AO/TAA/motion blur/auto exposure':'light 1280x720 bloom only',cpu:os.cpus()[0]?.model,summary,rows,scope:'One packaged release 3D scene (400 shadowed primitives, 8 point + 2 spot lights, post volume, reflection probe, 2 particle systems) at 1280x720, hidden window, uncapped. fps = steady frames / sum of runtime frameWorkMs after the first quarter (simulation and submission time); wallFPS uses the runner whole per-frame time (stats.ms, including presentation wait) over the same steady frames. lastGpuMs is the GPU timestamp time of the final frame only. Same machine, alternating order per round.'},null,2));
console.log(JSON.stringify({work,summary}));
