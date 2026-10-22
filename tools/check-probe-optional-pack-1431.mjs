import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ReflectionProbeAtlas} from '../prototype/reflection-probe-atlas.js';
import {reflectionProbeVolume} from '../prototype/reflection-probe-volume.js';
import {probeInfluenceSettings,probeInfluenceFields} from '../prototype/reflection-probe-influence.js';
import {probeProjectionSettings,probeProjectionFields} from '../prototype/reflection-probe-projection.js';
import {makeSceneComponent} from '../prototype/scene-components.js';

const count=512,source=new THREE.DataTexture(new Float32Array(336*64*4),336,64,THREE.RGBAFormat,THREE.FloatType),atlas=new ReflectionProbeAtlas();let target=null,copies=0;
const renderer={backend:{updateTexture(){}},capabilities:{maxTextureSize:4096},getRenderTarget:()=>target,setRenderTarget:t=>{target=t;},clear(){},copyTextureToTexture(){copies++;}};
const probes=Array.from({length:count},(_,i)=>({id:'P'+i,center:[i*.01,0,0],p:makeSceneComponent('ReflectionProbe',{blendDistance:0}).properties,localBox:reflectionProbeVolume(new THREE.Matrix4(),[-5,-5,-5],[5,5,5]),projection:{mode:0,volume:null}})),entries=new Map(probes.map(p=>[p.id,{target:{texture:source}}]));
try{
 const defaults=probeInfluenceSettings(probes[0].p);assert.equal(probeInfluenceSettings({...probes[0].p}),defaults);assert(Object.isFrozen(defaults));
 atlas.update(renderer,probes,entries);const table=atlas.table,initial=table.image.data.slice(),version=table.version,info=atlas.info();
 let optionalReads=0,optionalWrites=0;const data=table.image.data;
 table.image.data=new Proxy(data,{get(t,k){if(typeof k==='string'&&/^\d+$/.test(k)&&+k<count*80&&+k%80>=36)optionalReads++;const v=Reflect.get(t,k,t);return typeof v==='function'?v.bind(t):v;},set(t,k,v){if(typeof k==='string'&&/^\d+$/.test(k)&&+k<count*80&&+k%80>=36)optionalWrites++;return Reflect.set(t,k,v,t);}});
 atlas.update(renderer,probes,entries);table.image.data=data;
 assert.equal(table.version,version);assert.equal(copies,1);assert.equal(optionalWrites,0);assert.equal(optionalReads,count*4);assert.deepEqual(data,initial);
 const baseline={optionalReads,optionalWrites,rows:count};
 Object.assign(probes[0].p,{advancedBlend:true,blendPositive:[.2,.4,.6],fadeNegative:[0,.5,1],blendNormalPositive:[1,2,3]});probes[0].projection={mode:3,volume:null};atlas.update(renderer,probes,entries);
 assert.equal(atlas.table,table);assert.equal(copies,1);assert.equal(atlas.spatial.builds,info.spatial.builds);assert(atlas.influenceActive);
 Object.assign(probes[0].p,{advancedBlend:false,blendNormalDistance:0});probes[0].projection={mode:0,volume:null};atlas.update(renderer,probes,entries);assert.deepEqual(table.image.data,initial);assert.equal(atlas.influenceActive,false);
 const extra={...probes[1],id:'Extra'};entries.set(extra.id,{target:{texture:source}});atlas.update(renderer,[...probes,extra],entries);
 const checkDefaults=(index,p)=>{for(const[base,fields,settings]of [[9,probeProjectionFields,probeProjectionSettings(p.projection)],[14,probeInfluenceFields,probeInfluenceSettings(p.p)]])for(let field=0;field<fields.length;field++)for(let c=0;c<4;c++)assert.equal(atlas.table.image.data[index*80+(base+field)*4+c],Math.fround(settings[fields[field]][c]));};
 assert.equal(atlas.table,table,'count growth with the same table size');for(let i=0;i<probes.length+1;i++)checkDefaults(i,i===probes.length?extra:probes[i]);
 const added=Array.from({length:64},(_,i)=>({...extra,id:'Extra'+i}));for(const row of added)entries.set(row.id,{target:{texture:source}});const grown=[...probes,...added];atlas.update(renderer,grown,entries);assert.notEqual(atlas.table,table);for(let i=0;i<grown.length;i++)checkDefaults(i,grown[i]);
 probes[1].p={...probes[1].p,advancedBlend:true,blendPositive:[.2,.4,.6]};atlas.update(renderer,[probes[1],probes[0],...grown.slice(2)],entries);checkDefaults(0,probes[1]);checkDefaults(1,probes[0]);assert.equal(copies,1);
 await fs.writeFile('native/build/probe-optional-pack-1431.json',JSON.stringify({passed:true,baseline,defaultOptionalFields:44,fourScalarChecksPerRow:true,canonicalLegacyObjectShared:true,restoreByteExact:true,sameSizeCountGrowthInitialized:true,resizeInitialized:true,reorderRestored:true,copies,scope:'Actual production atlas CPU packing with a no-GPU copy/target stub. Proxy counts optional Float32 indexed accesses on512unchanged rows, 4reads/0writes per row; defaults/advanced/infinite restore/resize/reorder bytes and no recopy/spatial rebuild. Not GPU timing/FPS or heap allocation measurement.'},null,2));
 console.log(JSON.stringify({passed:true,baseline,copies}));
}finally{atlas.dispose();source.dispose();}
