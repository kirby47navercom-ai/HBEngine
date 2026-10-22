import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {probeInfluenceFixture1426} from './probe-influence-fixture-1426.mjs';
import {probeInfluenceWeight,probeInfluenceFields} from '../prototype/reflection-probe-influence.js';
import {ProbeSpatialIndex} from '../prototype/reflection-probe-spatial.js';
import {componentPropertyVisible,makeSceneComponent,validComponentProperties} from '../prototype/scene-components.js';
const fixture=probeInfluenceFixture1426();let maxError=0;
for(const row of fixture.rows){const actual=probeInfluenceWeight(row.probe,row.point,row.normal,row.ray),error=Math.abs(actual-row.expected);maxError=Math.max(maxError,error);assert(Number.isFinite(actual)&&error<1e-10,JSON.stringify({point:row.point,normal:row.normal,ray:row.ray,shape:row.probe.p.volumeShape,mode:row.settings.blendPositive[3],actual,expected:row.expected,error}));}
const p=makeSceneComponent('ReflectionProbe').properties;assert(validComponentProperties('ReflectionProbe',p));
for(const advanced of [false,true]){const values={...p,advancedBlend:advanced};assert.equal(!!componentPropertyVisible('ReflectionProbe','blendPositive',values),advanced);assert.equal(!!componentPropertyVisible('ReflectionProbe','blendNormalDistance',values),!advanced);}
assert.equal(componentPropertyVisible('ReflectionProbe','advancedBlend',{...p,volumeShape:'sphere'}),false);
assert(!validComponentProperties('ReflectionProbe',{...p,fadePositive:[1,2,1]}));assert(!validComponentProperties('ReflectionProbe',{...p,blendNormalDistance:-1}));
const stride=20*4,records=new Float32Array(2*stride);for(let i=0;i<2;i++){const row=fixture.rows[i].settings;for(let j=0;j<fixture.fields.length;j++){// Browser and native have different fixed field order.
 const field=fixture.fields[j],browser=({center:0,minimum:1,maximum:2,localX:3,localY:4,localZ:5,faceScale:6})[field];if(browser!==undefined)records.set(row[field],i*stride+browser*4);}}
const index=new ProbeSpatialIndex();assert(index.update(records,2,{recordTexels:20}));for(let k=0;k<probeInfluenceFields.length;k++)records[14*4+k*4]=.5;assert.equal(index.update(records,2,{recordTexels:20}),false,'influence-only edits must retain spatial geometry');
await fs.writeFile('native/build/probe-influence-1426.json',JSON.stringify({passed:true,cases:fixture.count,maxError,independentPlaneOracle:true,conditionalInspector:true,boundsValidated:true,metadataNoSpatialRebuild:true,scope:'Independent transformed plane distances and analytic angular/normal shell oracle against CPU. Identity boundary/zero ray/zero normal/outside, negative and nonuniform scale/shear, asymmetric0-distance faces, basic/advanced/normal modes, sphere uniform normal shell. GPU/native/actual authoring/game separate.'},null,2));
console.log(JSON.stringify({passed:true,cases:fixture.count,maxError}));
