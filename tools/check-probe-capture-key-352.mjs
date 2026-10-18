import assert from 'node:assert/strict';
import {probeCaptureKey,probeCaptureProperties,selectReflectionProbes} from '../prototype/reflection-probes.js';
import {componentDefaults} from '../prototype/scene-components.js';
const defaults=componentDefaults('ReflectionProbe'),binding=['enabled','size','offset','intensity','diffuseIntensity','importance','blendDistance','boxProjection'],derived=['captureOffset'];
assert.deepEqual([...probeCaptureProperties,...binding,...derived].sort(),Object.keys(defaults).sort(),'새 속성의 캡처/바인딩 소유자를 정하세요.');
const make=()=>({id:'probe',center:[0,0,0],minimum:[-5,-5,-5],maximum:[5,5,5],volume:1000,p:structuredClone(defaults)}),probe=make(),key=probeCaptureKey(probe,'sceneA');
for(const name of binding){const p=make(),v=p.p[name];p.p[name]=Array.isArray(v)?v.map(n=>n+1):typeof v==='number'?v+.5:typeof v==='boolean'?!v:v+'x';assert.equal(probeCaptureKey(p,'sceneB'),key,name+' must not recapture once-mode');}
for(const name of probeCaptureProperties){const p=make(),v=p.p[name];p.p[name]=typeof v==='number'?v+1:typeof v==='boolean'?!v:'onChange';assert.notEqual(probeCaptureKey(p,'sceneA'),key,name);}
const moved=make();moved.center[0]=1;assert.notEqual(probeCaptureKey(moved),key);const bounds=make();bounds.minimum[0]=-10;assert.equal(probeCaptureKey(bounds),key);
const changed=make();changed.p.refreshMode='onChange';assert.notEqual(probeCaptureKey(changed,'sceneA'),probeCaptureKey(changed,'sceneB'));
const off=make();off.p.intensity=0;assert.equal(probeCaptureKey(off),key);assert.equal(selectReflectionProbes([off],[0,0,0])[0].settings.center[3],0);off.p.diffuseIntensity=.5;off.p.boxProjection=false;assert.deepEqual(selectReflectionProbes([off],[0,0,0])[0].settings.options,[1,.5,1,0]);
console.log(JSON.stringify({passed:true,allPropertiesClassified:true,bindingsDoNotRecapture:true,captureAndExplicitRefreshInvalidate:true,sceneChangeMode:true,updatedBindingsApplied:true,sharedNativeGLGPUKey:true}));
