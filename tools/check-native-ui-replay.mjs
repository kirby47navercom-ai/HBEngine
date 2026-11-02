import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {retainTestEvidence} from './test-artifacts.mjs';
const [candidateArg,baseArg,recordArg,packArg]=process.argv.slice(2);
assert(candidateArg&&baseArg&&recordArg&&packArg,'candidate, baseline, recorded UI draws, immutable package required');
const candidate=path.resolve(candidateArg),baseline=path.resolve(baseArg),pack=path.resolve(packArg),records=JSON.parse(await fs.readFile(recordArg,'utf8')),work=await fs.mkdtemp('native/build/ui-replay-');retainTestEvidence(work);
assert(records.length>=32&&records[0].rows.every(row=>row.data));
const pixels=[],workers=[],profiles=[[],[]];
function decode(frame,previous){if(frame.encoding==='pipe-rgba8-premultiplied')return Buffer.from(frame.pixels);assert.equal(frame.encoding,'pipe-rgba8-premultiplied-tiles');const result=Buffer.from(previous),packet=frame.pixels;let at=4;for(let n=0;n<packet.readUInt32LE(0);n++){const x=packet.readUInt32LE(at),y=packet.readUInt32LE(at+4),w=packet.readUInt32LE(at+8),h=packet.readUInt32LE(at+12);at+=16;for(let row=0;row<h;row++){packet.copy(result,((y+row)*frame.width+x)*4,at,at+w*4);at+=w*4;}}assert.equal(at,packet.length);return result;}
try{
 for(const [i,root]of [baseline,candidate].entries()){const {NativeWidgetLayer}=await import(pathToFileURL(path.join(root,'tools/native-widget-layer.mjs'))),layer=new NativeWidgetLayer({},async(op,frame)=>{assert.equal(op,'ui');pixels[i]=decode(frame,pixels[i]);return {};},{rasterPackage:pack,rawFrames:true,profile:true});workers.push(layer);}
 for(let i=0;i<records.length;i++){const results=[];for(const index of i%2?[1,0]:[0,1]){const result=await workers[index].raster.request({...structuredClone(records[i]),layout:false});results[index]=result;if(i>=8)profiles[index].push(result.profile);}assert(pixels[0].equals(pixels[1]),'actual-game UI pixels '+i);assert.deepEqual(results[0].hits,results[1].hits,'actual-game hit geometry '+i);}
 const quantile=(rows,key)=>{const values=rows.map(row=>key.split('.').reduce((value,k)=>value?.[k],row)).filter(Number.isFinite).sort((a,b)=>a-b);return {n:values.length,p50MS:values[Math.ceil(values.length*.5)-1],p95MS:values[Math.ceil(values.length*.95)-1]};};
 const describe=rows=>({paint:quantile(rows,'paintMS'),encode:quantile(rows,'encodeMS'),total:quantile(rows,'totalMS'),readback:quantile(rows,'encodingSteps.readbackMS'),paintPixels:quantile(rows,'encodingSteps.paintPixels'),readbackPixels:quantile(rows,'encodingSteps.readbackPixels'),partialFrames:rows.filter(row=>row.encodingSteps?.partialReadback).length});
 const report={passed:true,records:records.length,allPixelsEqual:true,allInputGeometryEqual:true,before:describe(profiles[0]),after:describe(profiles[1]),recordSource:path.resolve(recordArg),immutablePackage:pack,profiles,scope:'Identical recorded real-game UI packets, CPU Skia + raster worker; alternating order. No game logic, ordinary full-game FPS or physical-device acceptance.'};await fs.writeFile(work+'/acceptance.json',JSON.stringify(report,null,2));console.log(JSON.stringify({work,...report,profiles:undefined}));
}finally{await Promise.all(workers.map(worker=>worker.dispose()));}
