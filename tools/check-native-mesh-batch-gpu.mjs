// Real D3D12 pixels for mesh batching: one packaged static 3D scene (300 primitives of 4 shapes with varied scale and
// rotation, sun + point light shadows, a reflection probe, no player so the camera stays still) rendered with batching
// off (HB_SPRITE_BATCH=0) and on must match (per channel difference <= 1) and use fewer draw calls when on.
// node tools/check-native-mesh-batch-gpu.mjs [static|host]   (static: static group skipping off/on; host: host static sets
// off/on in the same scene without the reflection probe, captured after the groups moved into sets)
const staticMode=process.argv[2]==='static',hostMode=process.argv[2]==='host',captureFrame=hostMode?150:50;
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createProject} from './project-manifest.mjs';
import {buildGame} from './build-game.mjs';
import {defaultBuildProfile} from '../prototype/build-profile.js';
import {createPlacedObject} from '../prototype/placement-catalog.js';
import {retainTestEvidence} from './test-artifacts.mjs';
import {activeInstalledVersions} from './install-editor.mjs';

assert.deepEqual(await activeInstalledVersions('C:/Users/kirby/HBEngine'),[]);
const root=path.resolve(import.meta.dirname,'..'),work=await fs.mkdtemp(path.join(root,'native/build/mesh-batch-gpu-'));retainTestEvidence(work);
const record=await createProject('메시 묶음 화면 비교',path.join(work,'Project'),'3d'),scenePath=record.manifest.startupScene;
const scene=JSON.parse(await fs.readFile(path.join(record.root,scenePath),'utf8'));
scene.objects=scene.objects.filter(o=>o.kind!=='character');
const shapes=['cube','sphere','cylinder','cone'];
for(let i=0;i<300;i++){const o=createPlacedObject(shapes[i%4],{id:'mesh'+i,position:[(i%20-9.5)*.9,.4+(i%3)*.15,(Math.floor(i/20)-7)*.9]});const s=i%7===3?.6:.4;o.scale=[s,s,s];o.rotation=[0,(i*37)%360,0];scene.objects.push(o);}
scene.objects.push(createPlacedObject('pointLight',{id:'point',position:[0,3,0]}));if(!hostMode)scene.objects.push(createPlacedObject('reflectionProbe',{id:'probe',position:[0,1,0]}));
await record.project.write(scenePath,JSON.stringify(scene));
const built=await buildGame(record,{...defaultBuildProfile(record.manifest),configuration:'release',width:640,height:360});
await fs.mkdir(path.join(work,'Temp'),{recursive:true});
async function run(batch){
 const name='batch-'+batch,report=path.join(work,name+'.json'),capture=path.join(work,name+'.rgba');
 const env={SystemRoot:process.env.SystemRoot||'C:/Windows',WINDIR:process.env.WINDIR||'C:/Windows',PATH:(process.env.SystemRoot||'C:/Windows')+'/System32',TEMP:path.join(work,'Temp'),TMP:path.join(work,'Temp'),LOCALAPPDATA:path.join(work,'User-'+name),APPDATA:path.join(work,'User-'+name,'Roaming'),HB_NATIVE_TEST_STATE:path.join(work,'State-'+name),...(hostMode?{HB_HOST_STATIC:batch?'1':'0'}:staticMode?{HB_STATIC_GROUPS:batch?'1':'0'}:{HB_SPRITE_BATCH:batch?'1':'0'}),HB_CAPTURE_FRAME:String(captureFrame),HB_CAPTURE_OUT:capture};
 const child=spawn(built.executable,['--hidden','--silent','--uncapped','--frames',String(captureFrame+10),'--report',report,'--graphics-api','d3d12'],{windowsHide:true,env});let stderr='';child.stderr.on('data',b=>stderr+=b);
 const code=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{child.kill();reject(Error(name+' timeout'));},300000);child.once('error',reject);child.once('close',c=>{clearTimeout(timer);resolve(c);});});
 assert.equal(code,0,stderr+await fs.readFile(path.join(work,'State-'+name,'native-runtime.log'),'utf8').catch(()=>''));
 const result=JSON.parse(await fs.readFile(report,'utf8')),size=JSON.parse(await fs.readFile(capture+'.json','utf8'));
 return {calls:result.renderer?.info?.calls,cullSets:result.renderer?.cullSets||0,cullVisible:result.renderer?.cullVisible||0,size,rgba:await fs.readFile(capture)};
}
const off=await run(false),on=await run(true);
assert.deepEqual(on.size,off.size);assert.equal(on.rgba.length,off.rgba.length);
let maxDiff=0,differing=0,lit=0;for(let i=0;i<off.rgba.length;i+=4){let d=0;for(let k=0;k<4;k++)d=Math.max(d,Math.abs(off.rgba[i+k]-on.rgba[i+k]));if(d)differing++;maxDiff=Math.max(maxDiff,d);if(off.rgba[i]+off.rgba[i+1]+off.rgba[i+2]>30)lit++;}
assert(lit>off.rgba.length/4*.1,'meshes cover the frame');
assert(maxDiff<=1,'pixel difference '+maxDiff);
if(hostMode){assert.equal(off.cullSets,0);assert(on.cullSets>0&&on.cullVisible>0,'host sets drawn: '+on.cullSets+' sets, '+on.cullVisible+' visible rows');}else if(staticMode)assert.equal(on.calls,off.calls,'static skipping keeps draw calls');else assert(on.calls<off.calls,'batching reduces draw calls '+off.calls+' -> '+on.calls);
const report={passed:true,width:off.size.width,height:off.size.height,callsOff:off.calls,callsOn:on.calls,...(hostMode?{hostSets:on.cullSets,hostVisibleRows:on.cullVisible}:{}),maxChannelDifference:maxDiff,differingPixels:differing,coveredPixels:lit,scope:'Packaged D3D12 frame '+captureFrame+' of one static 3D scene, '+(hostMode?'host static sets':staticMode?'static group skipping':'mesh batching')+' off vs on.'};
await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
