import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {createCanvas} from '@napi-rs/canvas';
import {createWidgetAsset,createWidgetNode} from '../prototype/ui-assets.js';
import {retainTestEvidence} from './test-artifacts.mjs';
import {activeInstalledVersions} from './install-editor.mjs';

const baseline=path.resolve(process.argv[2]),candidate=path.resolve(process.argv[3]);
assert.deepEqual(await activeInstalledVersions(path.join(process.env.USERPROFILE,'HBEngine')),[]);
const work=await fs.mkdtemp('native/build/ui-transport-cost-');retainTestEvidence(work);
const picture=createCanvas(1024,1024),ctx=picture.getContext('2d'),gradient=ctx.createLinearGradient(0,0,1024,1024);
gradient.addColorStop(0,'#236799');gradient.addColorStop(1,'#ac7639');ctx.fillStyle=gradient;ctx.fillRect(0,0,1024,1024);
await fs.writeFile(work+'/picture.png',picture.toBuffer('image/png'));picture.width=picture.height=1;
const widget=createWidgetAsset('engine transport fixture'),image=createWidgetNode('Image','image');
image.slot.offset=[0,0,1280,720];image.properties.texture='picture.png';image.properties.imageFit='fill';widget.nodes.push(image);
for(let i=0;i<12;i++){const text=createWidgetNode('Text','label'+i);text.slot.offset=[i%3*420,Math.floor(i/3)*160,400,140];text.properties.text='공용 엔진 HUD · 한글과 alpha 123';text.properties.fontSize=24;widget.nodes.push(text);}
// Two installed copies of the native canvas addon cannot exchange their wrapper
// instances. Share only dependencies proven byte-identical between these owners.
const baselineOwner=path.join(baseline,'tools/native-widget-layer.mjs');let baselineCode=await fs.readFile(baselineOwner,'utf8');
for(const match of [...baselineCode.matchAll(/from\s*['"](\.\.?\/[^'"]+)['"]/g)]){const relative=match[1],old=path.resolve(path.dirname(baselineOwner),relative),next=path.resolve(candidate,'tools',relative);assert((await fs.readFile(old)).equals(await fs.readFile(next)),'benchmark dependency differs: '+relative);baselineCode=baselineCode.replaceAll("'"+relative+"'","'"+pathToFileURL(next).href+"'");}
baselineCode=baselineCode.replace("'@napi-rs/canvas'","'"+pathToFileURL(path.join(candidate,'node_modules/@napi-rs/canvas/index.js')).href+"'");
await fs.writeFile(work+'/baseline.mjs',baselineCode);
const make=async root=>{const owner=root===baseline?path.resolve(work,'baseline.mjs'):path.join(root,'tools/native-widget-layer.mjs'),{NativeWidgetLayer}=await import(pathToFileURL(owner));let payload=0;const layer=new NativeWidgetLayer({resolve:async()=>path.resolve(work,'picture.png')},async(op,frame)=>{payload+=Buffer.byteLength(JSON.stringify(frame));return {ok:true};},{profile:true});const data=structuredClone(widget);layer.create(data,{acceptInput:()=>true,event(){},input(){}},{});return {layer,data,samples:[],bytes:()=>payload};};
const a=await make(baseline),b=await make(candidate),percentiles=rows=>{const values=[...rows].sort((a,b)=>a-b),at=p=>values[Math.ceil(p*values.length)-1];return {p50:at(.5),p95:at(.95),p99:at(.99),max:values.at(-1)};};
try{
 for(let round=0;round<60;round++)for(const entry of round%2?[a,b]:[b,a]){entry.data.nodes.at(-1).properties.text='동일한 프레임 '+round;entry.layer.revision++;await entry.layer.draw(1280,720);if(round>=10)entry.samples.push({...entry.layer.lastProfile});}
 assert(Buffer.from(a.layer.canvas.data()).equals(Buffer.from(b.layer.canvas.data())),'same final Skia pixels');
 assert.equal(a.layer.images.size,b.layer.images.size);const ownerSHA=async root=>createHash('sha256').update(await fs.readFile(path.join(root,'tools/native-widget-layer.mjs'))).digest('hex');
 const result={passed:true,pixelParity:true,dimensions:[1280,720],samples:50,alternatingOrder:true,nodeVersion:process.version,scope:'engine HUD assets/layout/Skia and lossless frame encoding; immediate simulated ACK, excludes OS decode/presentation and whole-game FPS',baseline:{ownerSHA:await ownerSHA(baseline),totalMS:percentiles(a.samples.map(x=>x.totalMS)),paintMS:percentiles(a.samples.map(x=>x.paintMS)),encodeMS:percentiles(a.samples.map(x=>x.encodeMS)),wireBytes:a.bytes()},candidate:{ownerSHA:await ownerSHA(candidate),totalMS:percentiles(b.samples.map(x=>x.totalMS)),paintMS:percentiles(b.samples.map(x=>x.paintMS)),encodeMS:percentiles(b.samples.map(x=>x.encodeMS)),wireBytes:b.bytes(),frameMemory:b.layer.diagnostics().frameMemory},timings:{baseline:a.samples,candidate:b.samples}};
 await fs.writeFile(work+'/acceptance.json',JSON.stringify(result,null,2));console.log(JSON.stringify({work,...result,timings:undefined}));
}finally{a.layer.dispose();b.layer.dispose();}
