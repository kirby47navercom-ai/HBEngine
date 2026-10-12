import assert from 'node:assert/strict';
import * as THREE from 'three';
import {materialDefaults,validMaterialSurface,makeMaterialPreset,compileMaterial,validMaterialGraph} from '../prototype/material-runtime.js';
import {createNativeMaterial,compileNativeMaterial} from '../prototype/native-materials.js';
import {createGPUMaterial} from '../prototype/gpu-materials.js';
import {createThreeMaterial} from '../prototype/material-runtime.js';
import {componentDefaults,validComponentProperties,makeSceneComponent} from '../prototype/scene-components.js';
import {packedPostProcess,postProcessSettings} from '../prototype/post-processing.js';
import {createAsset} from '../prototype/asset-documents.js';
import {gpuPostProcessing} from '../prototype/gpu-post-processing.js';
import {vec4} from 'three/tsl';
for(const key of ['cloth','brushedMetal','thinFilm']){const d=makeMaterialPreset(key);assert.ok(validMaterialGraph(d.graph));assert.ok(validMaterialSurface(d.surface));compileMaterial(d);compileNativeMaterial(d);}
for(const [k,v]of [['sheen',2],['anisotropy',-1],['iridescenceThickness',NaN],['iridescenceIOR',0],['specularColor',[1,2,0]]])assert.ok(!validMaterialSurface({...materialDefaults,[k]:v}),k);
for(const make of [d=>createThreeMaterial(THREE,d),d=>createGPUMaterial(d),d=>createNativeMaterial(THREE,d,{renderer:{}})]){const m=make(createAsset('material','M_Lobes'));for(const [k,v]of [['Sheen',1],['Anisotropy',.8],['Iridescence',1]])assert.ok(m.userData.updateFloat(k,v));const version=m.version;
 for(let i=0;i<100;i++){m.userData.updateFloat('AnisotropyRotation',i*.01);m.userData.updateFloat('IridescenceThickness',200+i);m.userData.updateVector('SheenColor',[.1,.2,.3]);m.userData.updateVector('SpecularColor',[.4,.5,.6]);}assert.equal(m.version,version);assert.deepEqual(m.userData.materialSource.surface.sheenColor,[.1,.2,.3]);m.dispose();}
const p=componentDefaults('PostProcessVolume');p.bloomEnabled=false;assert.equal(postProcessSettings([{components:[makeSceneComponent('PostProcessVolume',p)]}]),null);Object.assign(p,{colorGradingEnabled:true,postExposure:1,contrast:50,saturation:-100,hueShift:90});assert.ok(validComponentProperties('PostProcessVolume',p));assert.deepEqual(packedPostProcess(p).grade,[1,1.5,0,Math.PI/2]);assert.ok(postProcessSettings([{components:[makeSceneComponent('PostProcessVolume',p)]}]));assert.ok(!validComponentProperties('PostProcessVolume',{...p,postExposure:NaN}));assert.ok(!validComponentProperties('ReflectionProbe',{...componentDefaults('ReflectionProbe'),bounces:9}));
assert.ok(!validComponentProperties('ReflectionProbe',{...componentDefaults('ReflectionProbe'),bounces:1.5}));
for(const ca of [false,true]){const post=gpuPostProcessing(vec4(1),ca);post.update(p,1);assert.ok(post.node.isNode);}
console.log('Rendering 098: physical surfaces/typed uniforms, presets, post-volume validation, GI bounce bounds and GPU post node construction PASS');
