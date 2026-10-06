import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import * as THREE from 'three';
import {NativeHost} from './native-host.mjs';
import {nativeRequestWorld} from '../prototype/native-model.js';
import {preparePlayWorld} from '../prototype/play-world.js';
import {BlueprintRuntime} from '../prototype/blueprint-runtime.js';
import {engineOperations} from '../prototype/engine-services.js';
import {nativeSpawnRequest,spawnQueryRequest} from '../prototype/native-spawn.js';
import {nativeWorldClient} from '../prototype/native-transport.js';
import {nativeBindings,mergeNativeReply} from '../prototype/native-module-query.js';

import {nativeSpawnFixture} from './native-spawn-fixture.mjs';

const dir=await fs.mkdtemp(path.resolve(import.meta.dirname,'../native/build/native-spawn-modules-')),host=new NativeHost(),cases=[];
try{
  const {files,assets,objects}=nativeSpawnFixture();
  const prepared=await preparePlayWorld(objects,{autoSpawnPlayer:false},{readAsset:async p=>structuredClone(assets.get(p)),readText:async p=>files.get(p),buildNative:(h,s)=>host.build(h,s),listAssets:async()=>[...assets.keys()].map(path=>({path,kind:'blueprint'}))});
  const groups=new Map(),services=engineOperations({spawnCatalog:prepared.spawnCatalog,gameplay:prepared.gameplay,physicsOptions:{backend:'legacy',gravity:[0,0,0]},build:o=>{const g=new THREE.Group();groups.set(o.id,g);return g;},update(){},remove:o=>groups.delete(o.id),mesh:id=>groups.get(id)}),vm=new BlueprintRuntime(objects,prepared.bindings,{...services,inputAssets:prepared.inputAssets}),build=prepared.builds.get('Assets/BP_Director.hbblueprint.json');
  await vm.start();
  try{
    for(let repeat=0;repeat<2;repeat++){
      const paths=new Set([...prepared.builds].filter(([,b])=>b.token===build.token).map(([p])=>p)),request={key:'nativeCall',nativeId:'Spawner.CreateAndCall',self:'director',args:{asset:'BP_Enemy'},objects:nativeRequestWorld(objects,paths,{},build.metadata),...nativeSpawnRequest(vm,build,prepared.spawnCatalog)};
      request.nativeBindings=nativeBindings(objects,prepared.builds,vm.bindings,request,build.metadata);
      const reply=mergeNativeReply(await nativeWorldClient(build,vm).call(request,build.metadata,p=>host.call(build.token,p)),'director'),id=reply.outputs.result;
      assert.equal(reply.operations[0].key,'sceneSpawn');assert.equal(reply.operations[1].key,'setVelocity');
      for(const state of reply.objects){const o=vm.object(state.id);if(o)Object.assign(o,state);}for(const op of reply.operations)await services.operation(op.key,op.args,vm.bindings.find(b=>b.self===op.self)||vm.bindings[0],vm);
      assert.equal(vm.object(id).nativeProperties.HP,6);assert.deepEqual(vm.object(id).position,[7,5,6]);assert.deepEqual(vm.object(id).velocity,[1,2,3]);
      assert.throws(()=>spawnQueryRequest(request,{objects:[...request.objects,{id:'forged',position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]}]},build.metadata,request.spawnTemplates),/월드 범위/);
    }
    cases.push('Spawn followed immediately by another module GetFloat/SetFloat/Call and physics overlap works in the same C++ call, including the later catalog-cached frame');
    cases.push('foreign transform/property writes and commands commit after Spawn in actual execution order; unregistered query actors are rejected');
  }finally{await vm.stop();services.dispose();}
  await fs.writeFile(path.join(dir,'acceptance.json'),JSON.stringify({passed:true,cases},null,2));console.log(JSON.stringify({dir,passed:true,cases}));
}catch(error){await fs.writeFile(path.join(dir,'failure.json'),JSON.stringify({passed:false,error:error.stack},null,2));console.error(JSON.stringify({dir,passed:false,error:error.message}));throw error;}finally{host.close();}
