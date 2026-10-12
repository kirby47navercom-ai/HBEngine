import assert from 'node:assert/strict';
import {componentDefaults,makeSceneComponent,validComponentProperties,editComponentProperty} from '../prototype/scene-components.js';
import {packedScreenEffects} from '../prototype/screen-effects.js';
import {resolvePostVolumes} from '../prototype/post-volume.js';
const defaults=componentDefaults('PostProcessVolume');assert.equal(defaults.screenRayRefineSteps,4);assert.equal(defaults.screenRayEdgeFade,.08);assert.deepEqual(packedScreenEffects(defaults).indirect,[0,24,4,.08]);
for(const invalid of [{screenRayRefineSteps:-1},{screenRayRefineSteps:9},{screenRayRefineSteps:1.5},{screenRayEdgeFade:NaN},{screenRayEdgeFade:.50001}])assert.equal(validComponentProperties('PostProcessVolume',invalid),false);
for(const value of [0,4,8])assert.equal(validComponentProperties('PostProcessVolume',{screenRayRefineSteps:value}),true);assert.equal(validComponentProperties('PostProcessVolume',{screenRayEdgeFade:0,postOverrides:['ray']}),true);
const volume=(id,p)=>({id,components:[makeSceneComponent('PostProcessVolume',{bloomEnabled:false,...p})]});
for(const groups of [['reflection'],['indirect'],['reflection','indirect'],['ray']]){const value=resolvePostVolumes([volume('test',{weight:.5,postOverrides:groups,screenRayRefineSteps:8,screenRayEdgeFade:.4})]);assert.equal(value.screenRayRefineSteps,6);assert.ok(Math.abs(value.screenRayEdgeFade-.24)<1e-12);}
const unrelated=resolvePostVolumes([volume('test',{postOverrides:['color'],screenRayRefineSteps:8})]);assert.equal(unrelated.screenRayRefineSteps,4);
const patched=editComponentProperty('PostProcessVolume',{},'screenRayRefineSteps',8);assert.equal(validComponentProperties('PostProcessVolume',patched),true);assert.equal(packedScreenEffects({...defaults,...patched}).indirect[2],8);
console.log('102 PASS: quality packing/ranges, integer guards, legacy and indirect overrides, no double spatial weighting and typed component edit');
