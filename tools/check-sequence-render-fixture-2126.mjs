import {visualComponentSignature} from '../prototype/scene-component-signature.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {Group} from 'three';
import {renderAliasesFixture} from './sequence-render-aliases-fixture-2120.mjs';
import {exerciseRenderAliases} from './sequence-render-aliases-exercise-2120.mjs';
import {sceneRendering} from '../prototype/scene-rendering.js';
import {engineOperations} from '../prototype/engine-services.js';
import {BlueprintRuntime} from '../prototype/blueprint-runtime.js';
import {retainTestEvidence,pruneTestArtifacts} from './test-artifacts.mjs';

const work=await fs.mkdtemp(path.resolve('native/build/sequence-render-fixture-2126-'));retainTestEvidence(work);let vm,services,visuals;const groups=new Map();
try{
 const f=await renderAliasesFixture(work),read=async p=>JSON.parse(await fs.readFile(path.join(f.record.root,p),'utf8')),scene=await read(f.record.manifest.startupScene),objects=scene.objects.filter(o=>['A','B','Cube','Lamp'].includes(o.id));for(const object of objects){const group=new Group();group.userData.objectId=object.id;groups.set(object.id,group);}
 visuals=sceneRendering({current:id=>groups.get(id),all:()=>[...groups.values()],read,fileUrl:p=>p,error:message=>{throw Error(message);}});const update=async o=>{const g=groups.get(o.id);if(g.userData.componentSignature===visualComponentSignature(o))return;await visuals.build(o,g);await g.userData.ready;};for(const o of objects)await update(o);
 services=engineOperations({headless:true,mesh:id=>groups.get(id),readAsset:read,asset:async p=>p,materialFloat:visuals.materialFloat,update,build(){},remove(){}});vm=new BlueprintRuntime(objects,[],{...services,log(){}});await vm.start();
 // Source adapter deliberately does not load or compile the fixture's C++.
 const operations={Play:'playSequence',Seek:'sequenceSeek',Weight:'sequenceSetWeight',Priority:'sequenceSetPriority',Stop:'sequenceStop'},invoke=async(target,name,args={})=>{if(name==='Probe'){const value=await services.operation('light2dGetIntensity',{target:'Lamp'},{self:'Lamp'},vm);vm.object(target).nativeProperties={LampIntensity:value.return};return;}assert(operations[name],name);await services.operation(operations[name],{target,...args},{self:target},vm);if(name==='Play')await services.operation('sequencePause',{target,paused:true},{self:target},vm);};
 const result=await exerciseRenderAliases({actualCpp:false,paths:f.paths.render,invoke,inspect:async()=>({objects:structuredClone(objects)}),materials:async()=>visuals.materialState(),tick:()=>vm.tick(0)});assert.equal(result.rows.length,14);assert.equal(result.actualCppLightGetter,false);await vm.stop();vm=null;const report={passed:true,project:f.record.file,result,scope:'The saved combined fixture render assets execute through production BlueprintRuntime/engineOperations/sceneRendering Light2D and material uniforms without a GPU context. C++ control/getter shape is emulated by this source adapter; actual C++ compilation, GUI, independent player and installation are pending.'};await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:true,work,observations:result.rows.length,actualCpp:false}));
}catch(error){await fs.writeFile(path.join(work,'failure.json'),JSON.stringify({error:error.stack},null,2));throw error;}finally{await vm?.stop();services?.dispose();for(const group of groups.values())visuals?.dispose(group);await pruneTestArtifacts(work);}
