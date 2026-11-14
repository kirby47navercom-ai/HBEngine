// Real D3D12 pixels: the same packaged static 2D scene rendered with sprite batching off (HB_SPRITE_BATCH=0) and on must
// match (per channel difference <= 1 for float rounding of the moved colour multiply) and use fewer draw calls when on.
// Scene: 360 sprites (checker texture or none, colours, flips, two sizes, interleaved sorting orders, unlit and lit2d,
// additive blend), 2D point + global lights, no player (static camera), no particles.
// node tools/check-native-sprite-batch-gpu.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createProject} from './project-manifest.mjs';
import {buildGame} from './build-game.mjs';
import {defaultBuildProfile} from '../prototype/build-profile.js';
import {createPlacedObject} from '../prototype/placement-catalog.js';
import {retainTestEvidence} from './test-artifacts.mjs';
import {activeInstalledVersions} from './install-editor.mjs';

assert.deepEqual(await activeInstalledVersions('C:/Users/kirby/HBEngine'),[]);
const root=path.resolve(import.meta.dirname,'..'),work=await fs.mkdtemp(path.join(root,'native/build/sprite-batch-gpu-'));retainTestEvidence(work);
const record=await createProject('스프라이트 묶음 화면 비교',path.join(work,'Project'),'2d'),scenePath=record.manifest.startupScene;
// 8x8 RGBA checker PNG (four colours, opaque and half alpha).
function png(width,height,pixel){const raw=Buffer.alloc((width*4+1)*height);for(let y=0;y<height;y++){raw[y*(width*4+1)]=0;for(let x=0;x<width;x++)Buffer.from(pixel(x,y)).copy(raw,y*(width*4+1)+1+x*4);}
 const chunk=(type,data)=>{const b=Buffer.alloc(12+data.length);b.writeUInt32BE(data.length,0);b.write(type,4,'ascii');data.copy(b,8);b.writeUInt32BE(zlib.crc32(b.subarray(4,8+data.length))>>>0,8+data.length);return b;};
 const header=Buffer.alloc(13);header.writeUInt32BE(width,0);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);}
await fs.mkdir(path.join(record.root,'Assets'),{recursive:true});
await fs.writeFile(path.join(record.root,'Assets/checker.png'),png(8,8,(x,y)=>[(x+y)%2?255:40,x*32,y*32,x<4?255:128]));
const scene=JSON.parse(await fs.readFile(path.join(record.root,scenePath),'utf8'));
scene.objects=scene.objects.filter(o=>o.kind!=='character2d');
for(let i=0;i<360;i++){
 const sprite=createPlacedObject('sprite',{id:'sprite'+i,position:[(i%24-11.5)*.62,(Math.floor(i/24)-7)*.5+2,0]}),p=sprite.components.find(c=>c.type==='SpriteRenderer').properties;
 sprite.scale=[.5,.5,1];Object.assign(p,{texture:i%9===4?'':'Assets/checker.png',color:i%5===0?[1,1,1,1]:[(i%7)/7,(i%3)/3,1,i%6===1?.6:1],flipX:i%4===1,flipY:i%10===3,width:i%15===7?1.4:1,sortingOrder:i%3,shading:i%8===2?'lit2d':'unlit',blendMode:i%23===11?'additive':'translucent'});
 sprite.components=sprite.components.filter(c=>c.type!=='BoxCollider2D');scene.objects.push(sprite);
}
for(let i=0;i<3;i++)scene.objects.push(createPlacedObject('pointLight2d',{id:'light'+i,position:[i*5-5,2,0]}));
scene.objects.push(createPlacedObject('globalLight2d',{id:'global',position:[0,0,0]}));
await record.project.write(scenePath,JSON.stringify(scene));
const built=await buildGame(record,{...defaultBuildProfile(record.manifest),configuration:'release',width:640,height:360});
await fs.mkdir(path.join(work,'Temp'),{recursive:true});
async function run(batch){
 const name='batch-'+batch,report=path.join(work,name+'.json'),capture=path.join(work,name+'.rgba');
 const env={SystemRoot:process.env.SystemRoot||'C:/Windows',WINDIR:process.env.WINDIR||'C:/Windows',PATH:(process.env.SystemRoot||'C:/Windows')+'/System32',TEMP:path.join(work,'Temp'),TMP:path.join(work,'Temp'),LOCALAPPDATA:path.join(work,'User-'+name),APPDATA:path.join(work,'User-'+name,'Roaming'),HB_NATIVE_TEST_STATE:path.join(work,'State-'+name),HB_SPRITE_BATCH:batch?'1':'0',HB_CAPTURE_FRAME:'50',HB_CAPTURE_OUT:capture};
 const child=spawn(built.executable,['--hidden','--silent','--uncapped','--frames','60','--report',report,'--graphics-api','d3d12'],{windowsHide:true,env});let stderr='';child.stderr.on('data',b=>stderr+=b);
 const code=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{child.kill();reject(Error(name+' timeout'));},300000);child.once('error',reject);child.once('close',c=>{clearTimeout(timer);resolve(c);});});
 assert.equal(code,0,stderr+await fs.readFile(path.join(work,'State-'+name,'native-runtime.log'),'utf8').catch(()=>''));
 const result=JSON.parse(await fs.readFile(report,'utf8')),size=JSON.parse(await fs.readFile(capture+'.json','utf8'));
 return {calls:result.renderer?.info?.calls,size,rgba:await fs.readFile(capture)};
}
const off=await run(false),on=await run(true);
assert.deepEqual(on.size,off.size);assert.equal(on.rgba.length,off.rgba.length);
let maxDiff=0,differing=0,lit=0;for(let i=0;i<off.rgba.length;i+=4){let d=0;for(let k=0;k<4;k++)d=Math.max(d,Math.abs(off.rgba[i+k]-on.rgba[i+k]));if(d)differing++;maxDiff=Math.max(maxDiff,d);if(off.rgba[i]+off.rgba[i+1]+off.rgba[i+2]>30)lit++;}
assert(lit>off.rgba.length/4*.1,'sprites cover the frame');
assert(maxDiff<=1,'pixel difference '+maxDiff);
assert(on.calls<off.calls,'batching reduces draw calls '+off.calls+' -> '+on.calls);
const report={passed:true,width:off.size.width,height:off.size.height,callsOff:off.calls,callsOn:on.calls,maxChannelDifference:maxDiff,differingPixels:differing,coveredPixels:lit,scope:'Packaged D3D12 frame 50 of one static 2D scene, sprite batching off vs on.'};
await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
