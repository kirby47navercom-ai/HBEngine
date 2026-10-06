import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {mobileSources} from './build-mobile.mjs';
import {runTool} from './mobile-android.mjs';
import {mobileBackend} from '../prototype/mobile-player.js';
import {nativeSpawnFixture} from './native-spawn-fixture.mjs';
import {preparePlayWorld} from '../prototype/play-world.js';
import {BlueprintRuntime} from '../prototype/blueprint-runtime.js';
import {engineOperations} from '../prototype/engine-services.js';
import {nativeSpawnRequest} from '../prototype/native-spawn.js';
import {nativeRequestWorld} from '../prototype/native-model.js';
import {nativeBindings,mergeNativeReply} from '../prototype/native-module-query.js';
import {nativeWorldClient} from '../prototype/native-transport.js';

const root=path.resolve(import.meta.dirname,'..'),dir=await fs.mkdtemp(path.join(root,'native/build/native-spawn-aot-')),signature=(header,source)=>createHash('sha256').update(JSON.stringify([header,source])).digest('hex');
let child,lines,vm,services,pending;let output='';
try{
  const {files,assets,objects}=nativeSpawnFixture(),codes=new Map();for(const b of assets.values())codes.set(signature(b.native.header,b.native.source),b.native);
  const native=await mobileSources(codes,dir),main='#include "Modules.hpp"\n#include <iostream>\nint main(){std::string line;while(std::getline(std::cin,line)){auto q=nlohmann::json::parse(line);auto result=HB_mobileInvoke(q.at("module").get<int>(),q.at("request").dump(),[](const std::string& query){std::cout<<"HB_QUERY\\t"<<query<<std::endl;std::string response;if(!std::getline(std::cin,response))throw std::runtime_error("query disconnected");return response;});std::cout<<"HB_RESULT\\t"<<result<<std::endl;}}';
  await fs.writeFile(path.join(dir,'Main.cpp'),main);const compiler=process.env.CXX||(process.platform==='win32'?'C:/msys64/ucrt64/bin/g++.exe':'g++'),env={...process.env,PATH:path.dirname(compiler)+path.delimiter+process.env.PATH},local=file=>path.relative(root,file),binary=path.join(dir,process.platform==='win32'?'probe.exe':'probe');
  await runTool(compiler,['-std=c++17','-pipe','-O1','-I',local(path.join(dir,'Native')),'-I',local(path.join(dir,'Native/include')),...native.sources.map(local),local(path.join(dir,'Main.cpp')),'-o',local(binary)],{cwd:root,env,timeout:60000});
  child=spawn(binary,[],{env,windowsHide:true,stdio:['pipe','pipe','pipe']});child.stderr.on('data',b=>output=(output+b).slice(-30000));lines=readline.createInterface({input:child.stdout});
  const raw=(module,request,query)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>{child.kill();reject(Error('AOT spawn timeout'));},10000);pending={resolve:value=>{clearTimeout(timer);resolve(value);},reject:error=>{clearTimeout(timer);reject(error);},query};child.stdin.write(JSON.stringify({module,request})+'\n');});
  lines.on('line',async line=>{try{if(line.startsWith('HB_QUERY\t')){let response;try{response={ok:true,value:await pending.query(JSON.parse(line.slice(9)))};}catch(error){response={ok:false,error:error.message};}child.stdin.write(JSON.stringify(response)+'\n');}else if(line.startsWith('HB_RESULT\t')){const p=pending;pending=null;p.resolve(JSON.parse(line.slice(10)));}}catch(error){pending?.reject(error);}});child.on('error',error=>pending?.reject(error));child.on('exit',code=>pending?.reject(Error('AOT spawn exit '+code+' '+output)));
  const backend=mobileBackend({version:1,id:'spawn-aot',name:'Spawn AOT',startupScene:'scene.hbscene.json',entries:[],nativeModules:native.modules},{read:async()=>{throw Error('unexpected read');},request:async(operation,data,query)=>{assert.equal(operation,'native');return raw(data.module,data.request,query);}});
  const prepared=await preparePlayWorld(objects,{autoSpawnPlayer:false},{readAsset:async p=>structuredClone(assets.get(p)),readText:async p=>files.get(p),buildNative:async(h,s)=>{const token=signature(h,s),module=native.modules.find(m=>m.signature===token);assert.ok(module);return {token,metadata:module.metadata};},listAssets:async()=>[...assets.keys()].map(path=>({path,kind:'blueprint'}))});
  const groups=new Map();services=engineOperations({spawnCatalog:prepared.spawnCatalog,gameplay:prepared.gameplay,physicsOptions:{backend:'legacy',gravity:[0,0,0]},build:o=>{const g=new THREE.Group();groups.set(o.id,g);return g;},update(){},remove:o=>groups.delete(o.id),mesh:id=>groups.get(id)});vm=new BlueprintRuntime(objects,prepared.bindings,{...services,inputAssets:prepared.inputAssets});await vm.start();const build=prepared.builds.get('Assets/BP_Director.hbblueprint.json');
  for(let repeat=0;repeat<2;repeat++){
    const paths=new Set([...prepared.builds].filter(([,b])=>b.token===build.token).map(([p])=>p)),request={key:'nativeCall',nativeId:'Spawner.CreateAndCall',self:'director',args:{asset:'BP_Enemy'},objects:nativeRequestWorld(objects,paths,{},build.metadata),...nativeSpawnRequest(vm,build,prepared.spawnCatalog)};request.nativeBindings=nativeBindings(objects,prepared.builds,vm.bindings,request,build.metadata);
    const reply=mergeNativeReply(await nativeWorldClient(build,vm).call(request,build.metadata,async request=>{const r=await backend('https://hbengine.local/api/native/call',{method:'POST',body:JSON.stringify({token:build.token,request})}),result=await r.json();if(!r.ok)throw Error(result.error);return result;}),'director');assert.equal(reply.operations[0].key,'sceneSpawn');assert.equal(reply.operations[1].key,'setVelocity');
    for(const state of reply.objects){const o=vm.object(state.id);if(o)Object.assign(o,state);}for(const op of reply.operations)await services.operation(op.key,op.args,vm.bindings.find(b=>b.self===op.self)||vm.bindings[0],vm);
    const actor=vm.object(reply.outputs.result);assert.equal(actor.nativeProperties.HP,6);assert.deepEqual(actor.position,[7,5,6]);assert.deepEqual(actor.velocity,[1,2,3]);
  }
  await fs.writeFile(path.join(dir,'acceptance.json'),JSON.stringify({passed:true,portableAot:true,actualCpp:true,cachedCatalog:true,foreignSynchronousCall:true,spawnPhysics:true,operationOrder:true},null,2));console.log(JSON.stringify({dir,passed:true}));
}catch(error){await fs.writeFile(path.join(dir,'failure.json'),JSON.stringify({passed:false,error:error.stack,output},null,2));console.error(JSON.stringify({dir,passed:false,error:error.message}));throw error;}finally{await vm?.stop();services?.dispose();child?.kill();lines?.close();}
