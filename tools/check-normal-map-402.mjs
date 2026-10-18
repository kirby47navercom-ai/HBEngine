import {engineSchema} from './editor-automation.mjs';
import {compileNativeMaterial} from '../prototype/native-materials.js';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {decodeNormalMap,normalMapGLSL,normalMapContract} from '../prototype/normal-map.js';
import {evaluateMaterial,makeMaterialNode,materialDefaults} from '../prototype/material-runtime.js';
const cases=[];
for(const value of [[.5,.5,.5],[1,.5,.5],[0,.5,.5],[.5,.5,1],[.5,.5,0],[.6,.3,.8],[.5+2**-24,.5,.5]])for(const strength of [0,1,2,-1]){
 const n=decodeNormalMap(value,strength);assert.ok(n.every(Number.isFinite));assert.ok(Math.abs(Math.hypot(...n)-1)<1e-14);
 const v=[(value[0]*2-1)*strength,(value[1]*2-1)*strength,value[2]*2-1],length=Math.hypot(...v),expected=length?v.map(x=>x/length):[0,0,1];assert.deepEqual(n,expected);cases.push({value,strength,expected});
}
const surface=makeMaterialNode('surface'),normal=makeMaterialNode('normalMap');normal.inputValues={value:[.5,.5,.5],strength:1};const graph={nodes:[surface,normal],edges:[{from:{node:normal.id,pin:'value'},to:{node:surface.id,pin:'normal'}}]};const result=evaluateMaterial({surface:materialDefaults,graph});assert.deepEqual(result.normal,[0,0,1]);
const native=compileNativeMaterial({surface:materialDefaults,graph});assert.ok(native.declarations.includes('float3 hbDecodeNormalMap('));assert.ok(native.lines.includes('hbDecodeNormalMap('));
assert.ok(normalMapGLSL.includes('max(size,1e-20)'));
assert.equal(engineSchema().raySurfaceHistory.normalDecode,normalMapContract);assert.ok(Object.isFrozen(normalMapContract)&&Object.isFrozen(normalMapContract.backends));assert.throws(()=>{normalMapContract.zeroLength='unsafe';});
await fs.writeFile('native/build/normal-map-402-cpu.json',JSON.stringify({passed:true,cases,graphNeutral:result.normal,neutralOnCancellation:true,nonzeroFormulaPreserved:true,newGPUResources:0,scope:'Shared CPU graph and shader contract; actual raster/ray/committed fields are separate driver gates.'},null,2));console.log(JSON.stringify({passed:true,cases:cases.length,graphNeutral:result.normal}));
