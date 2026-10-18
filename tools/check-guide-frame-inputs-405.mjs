import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {guideFrames} from '../prototype/path-guide-frames.js';import {rayMaterialTimeHistoryCompatible} from '../prototype/ray-surface-history-context.js';
const identity=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],rows=[];
for(let field=0;field<10;field++)for(const op of [3,4,5]){
 const programs=Array.from({length:10},()=>[]);programs[field]=[[op,0,3,3,-1,-1,-1,-1,0,0,0,0],[8,-1,3,3,0,-1,-1,-1,0,3,1,3]];
 const attributes=new Float32Array(20),values=new Float32Array(8);values[6]=100;const t={instanceID:'rigid',sourceID:'triangle',inverseWorld:identity,rayMaterial:{programs,normalConnected:field===3}};
 const result=guideFrames([t],new Map([['rigid',identity]]),200,attributes,100,values,0);assert.equal(attributes[15],field===3?-200:200);assert.equal(attributes[19],203);assert.equal(result.data.length,24);assert.ok(result.data.every(Number.isFinite));rows.push({field,op,pointer:attributes[15],prior:attributes[19]});
 const missing=new Float32Array(20);guideFrames([t],new Map(),200,missing,100,values,0);assert.equal(missing[19],0,'missing committed pose remains unavailable');
}
for(const options of [{cpuTimeDependent:true},{transmission:true}])assert.equal(rayMaterialTimeHistoryCompatible({...options,programs:Array.from({length:10},()=>[])}),false);
await fs.writeFile('native/build/guide-frame-inputs-405-cpu.json',JSON.stringify({passed:true,cases:rows.length,rows,missingPreviousStillRejected:true,CPUAndTransmissiveTimeResetPreserved:true,bytesPerRigidInstance:96,newGPUResources:0,scope:'Producer encoding only. Legacy -2 decoders unchanged; actual guide equal/change/recovery is separate gate.'},null,2));console.log(JSON.stringify({passed:true,cases:rows.length}));
