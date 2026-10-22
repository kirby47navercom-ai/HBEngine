import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {engineOperations} from '../prototype/engine-services.js';
import {makeSceneComponent} from '../prototype/scene-components.js';
import {makeNode,effectivePins} from '../prototype/blueprint-model.js';
const component=makeSceneComponent('ReflectionProbe'),actor={id:'Probe',components:[component]},vm={object:id=>id===actor.id?actor:null};let updates=0;
const api=engineOperations({update:()=>{updates++;}}),call=(key,args)=>api.operation(key,{target:actor.id,...args},{self:actor.id},vm),cases=[];
try{
 for(const[key,a,b]of [['reflectionProbeBlendFaces','blendPositive','blendNegative'],['reflectionProbeFaceFade','fadePositive','fadeNegative'],['reflectionProbeNormalFaces','blendNormalPositive','blendNormalNegative']]){
  const positive=[.1,.2,.3],negative=[.4,.5,.6];await call(key,{positive,negative});assert.deepEqual(component.properties[a],positive);assert.deepEqual(component.properties[b],negative);
  positive[0]=.9;negative[0]=.9;assert.equal(component.properties[a][0],.1);assert.equal(component.properties[b][0],.4);
  const before=structuredClone(component.properties),n=updates;await assert.rejects(call(key,{positive:[.2,.3,.4],negative:[.1,-1,.2]}));assert.deepEqual(component.properties,before);assert.equal(updates,n);
  const node=makeNode(key),pins=effectivePins(node,'in',{nodes:[node],edges:[]});assert.equal(pins.find(p=>p.id==='positive').type,'vec3');assert.equal(pins.find(p=>p.id==='negative').type,'vec3');cases.push(key);
 }
 await call('reflectionProbeAdvancedBlend',{value:true});assert.equal(component.properties.advancedBlend,true);await assert.rejects(call('reflectionProbeAdvancedBlend',{value:'yes'}));
 await call('reflectionProbeNormalBlend',{value:.5});assert.equal(component.properties.blendNormalDistance,.5);await assert.rejects(call('reflectionProbeNormalBlend',{value:Infinity}));assert.equal(updates,5);
 await fs.writeFile('native/build/probe-influence-services-1433.json',JSON.stringify({passed:true,cases,updates,pairAtomic:true,inputArraysIsolated:true,typedPins:true,boolFloatGuards:true,scope:'Real shared runtime service objects and generated node pins; successful paired writes are detached from caller arrays, invalid second vectors/bool/float preserve state and update count. C++/GPU execution separately.'},null,2));console.log(JSON.stringify({passed:true,cases:cases.length,updates}));
}finally{await api.dispose();}
