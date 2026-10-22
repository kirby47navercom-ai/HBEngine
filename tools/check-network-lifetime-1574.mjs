import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import WebSocket from 'ws';
import * as THREE from 'three';
import {retainTestEvidence,pruneTestArtifacts} from './test-artifacts.mjs';

const at=process.argv.indexOf('--implementation-root'),implementationRoot=at<0?path.resolve(import.meta.dirname,'..'):path.resolve(process.argv[at+1]);
const load=p=>import(pathToFileURL(path.join(implementationRoot,p)).href);
const {NetworkWorld}=await load('prototype/network-runtime.js'),{makeSceneComponent}=await load('prototype/scene-components.js');
const {engineOperations}=await load('prototype/engine-services.js'),{BlueprintRuntime}=await load('prototype/blueprint-runtime.js');
const {createAsset}=await load('prototype/asset-documents.js'),{makeNode}=await load('prototype/blueprint-model.js');
const {prepareSpawnCatalog,initializeSpawn}=await load('prototype/runtime-spawn.js'),{startMultiplayerServer}=await load('tools/multiplayer-server.mjs');
const {inspectNetworkWorld}=await load('prototype/network-inspection.js');
const work=await fs.mkdtemp(path.resolve('native/build/network-lifetime-1574-'));retainTestEvidence(work);
const checks=[],worlds=[],sleep=ms=>new Promise(r=>setTimeout(r,ms));
const until=async(fn,label)=>{const end=Date.now()+7000;while(Date.now()<end){if(fn())return;await sleep(5);}throw Error(label);};
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const object=id=>({id,name:id,kind:'empty',visible:true,position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],components:[makeSceneComponent('NetworkReplica',{interpolation:0})]});
const remote=(id,asset='Assets/BP_Remote.hbblueprint.json',root=id)=>({id,owner:'host',spawn:{asset,root,local:root===id?'root':'child'},position:[5,3,0],rotation:[0,0,0],scale:[1,1,1]});
function fixture(hooks={}){const world=new NetworkWorld(hooks),objects=[],vm={objects,bindings:[],active:true,generation:1,object:id=>objects.find(o=>o.id===id),custom:async()=>{}};world.config={authority:false};world.status='connected';world.peer='client';worlds.push(world);return {world,vm,objects};}
let server,host,services,vm;const originalSocket=globalThis.WebSocket;
try{
  {
    let spawns=0;const f=fixture({spawn:async()=>spawns++});f.world.receive(remote('Root'));f.world.status='synchronizing';await f.world.reconcile(f.vm);assert.equal(spawns,0);assert.equal(f.world.failedSpawns.size,0);f.world.status='connected';await f.world.reconcile(f.vm);assert.equal(spawns,1);
    const root=object('Root');root.spawnRoot='Root';root.spawnAsset='Assets/BP_Remote.hbblueprint.json';f.objects.push(root);f.world.register(root);f.world.receive(remote('Root_1',undefined,'Root'));await f.world.reconcile(f.vm);assert.equal(spawns,1);
    checks.push('partial snapshots do not spawn/cache failures; an existing root is not spawned again for an unreplicated child');
  }
  {
    const gate=deferred(),entered=deferred();let removed=0;const f=fixture({update:async()=>{entered.resolve();await gate.promise;},remove:async()=>removed++}),o=object('Static');f.objects.push(o);f.world.register(o);const first={hidden:true};f.world.removals.set(o.id,first);const frame=f.world.reconcile(f.vm);await entered.promise;f.world.receive({id:o.id,deleted:true});const second=f.world.removals.get(o.id);gate.resolve();await frame;assert.equal(f.world.removals.get(o.id),second);await f.world.reconcile(f.vm);assert.equal(removed,1);assert.equal(f.world.replicas.size,0);
    checks.push('a newer deletion arriving during async hide survives the older removal acknowledgement');
  }
  {
    const gate=deferred(),entered=deferred(),f=fixture({remove:async()=>{entered.resolve();await gate.promise;}}),old=object('Root');old.spawnRoot=old.id;f.objects.push(old);f.world.register(old);f.world.receive({id:old.id,deleted:true});const frame=f.world.reconcile(f.vm);await entered.promise;f.world.unregister(old);f.objects.length=0;const replacement=object(old.id);replacement.spawnRoot=replacement.id;f.objects.push(replacement);f.world.register(replacement);f.world.stamps.set(replacement.id,'new');gate.resolve();await frame;assert.equal(f.world.replicas.get(old.id).object,replacement);assert.equal(f.world.stamps.get(old.id),'new');f.world.unregister(old);assert.equal(f.world.replicas.get(old.id).object,replacement);
    checks.push('awaited old-root cleanup and repeated unregister preserve a replacement object with the same ID');
  }
  {
    const gate=deferred(),entered=deferred(),f=fixture({spawn:async()=>{entered.resolve();await gate.promise;throw Error('old build rejected');}});f.world.receive(remote('Root'));const frame=f.world.tick(.05,f.vm);await entered.promise;f.world.disconnect();f.world.config={authority:false};f.world.status='connected';f.world.error='new-session';f.world.receive(remote('New'));gate.resolve();await frame;assert.equal(f.world.failedSpawns.size,0);assert.equal(f.world.error,'new-session');assert.equal(f.world.elapsed,.05);assert(f.world.remote.has('New'));
    checks.push('old spawn rejection cannot mark a new session failed or continue the previous publication/RPC frame');
  }
  {
    const f=fixture(),o=object('Released');f.objects.push(o);f.world.register(o);f.world.stamps.set(o.id,'old');f.world.published.add(o.id);f.world.unregister(o);assert.equal(f.world.replicas.size,0);assert.equal(f.world.stamps.size,0);assert(f.world.published.has(o.id));f.world.register(object(o.id));assert.equal(f.world.replicas.size,1);f.world.disconnect();f.world.unregister(f.world.replicas.get(o.id).object);assert.equal(f.world.replicas.size,0);
    checks.push('offline release unregisters exact objects immediately while retaining host tombstones until publication');
  }
  {
    const f=fixture(),owner=object('Session'),keep=object('Keep'),old=object('Old');f.objects.push(owner,keep,old);f.world.register(keep);f.world.register(old);f.world.hooks.WebSocket=class{close(){}constructor(){this.readyState=1;this.bufferedAmount=0;}send(){}};f.world.connect(owner,'ws://owned.invalid','owned',false);f.world.remote.set(old.id,{id:old.id,owner:'host'});
    const message=p=>f.world.socket.onmessage({data:JSON.stringify(p)});message({type:'welcome',peer:'client',resume:'owned',sequence:1,states:[{id:keep.id,owner:'host',position:[99,0,0]}],chunks:true});await f.world.tick(0,f.vm);assert.equal(keep.position[0],0);assert.equal(f.world.replicas.get(old.id).hiddenState,undefined);message({type:'welcomeEnd',sequence:1});await f.world.tick(0,f.vm);assert.equal(keep.position[0],99);assert.equal(old.visible,false);assert.equal(f.world.snapshotPrevious,null);
    message({type:'welcome',peer:'client',resume:'owned',sequence:2,states:[]});assert.equal(f.world.status,'connected');assert.equal(f.world.snapshotPrevious,null);assert(f.world.removals.has(keep.id));await f.world.tick(0,f.vm);assert.equal(keep.visible,false);
    checks.push('chunked snapshots keep existing actors unchanged until completion; single-packet snapshots perform the same missing-row cleanup and release the previous snapshot');
  }
  {
    const f=fixture();for(let i=0;i<1000;i++){const o=object('R'+i);Object.defineProperty(o,'nativeProperties',{get(){throw Error('inspection read gameplay properties');}});f.world.register(o);f.world.receive({...remote(o.id),position:[i,0,0]});}
    const page=inspectNetworkWorld(f.world,{kind:'replicas',offset:990,limit:5});assert.equal(page.count,1000);assert.equal(page.items.length,5);assert.equal(page.items[0].id,'R990');assert(page.readOnly);assert(!JSON.stringify(page).includes('position'));page.items[0].id='local-copy';assert(f.world.replicas.has('R990'));const filtered=inspectNetworkWorld(f.world,{kind:'remote',query:'r99',limit:3});assert.equal(filtered.count,11);assert.equal(filtered.items.length,3);assert.throws(()=>inspectNetworkWorld(f.world,{limit:129}));assert.throws(()=>inspectNetworkWorld(f.world,{kind:'unknown'}));assert.throws(()=>inspectNetworkWorld(f.world,{offset:-1}));
    checks.push('bounded AI inspection pages 1000 replicas without reading native properties or returning transforms/secrets; exact query counts, copies and strict page bounds');
  }
  {
    for(const stopAt of ['construction','actor','systems','beginPlay']){let live=true;const calls=[],o=object('Spawn'),binding={self:o.id,root:createAsset('blueprint','BP_Stop')},vm={active:true,generation:1,object:()=>o,bindings:[binding],emit:async(_b,key)=>{calls.push(key);if(key===stopAt)live=false;},custom:async()=>calls.push('acquire')};await initializeSpawn(vm,[binding],{startActor:async()=>{calls.push('actor');if(stopAt==='actor')live=false;},startSystems:async()=>{calls.push('systems');if(stopAt==='systems')live=false;}},[o],{reused:true,isCurrent:()=>live});assert.deepEqual(calls,['construction','actor','systems','beginPlay'].slice(0,['construction','actor','systems','beginPlay'].indexOf(stopAt)+1));}
    checks.push('network lifetime predicate is rechecked between construction, actor systems, BeginPlay and pool-acquire callbacks');
  }
  {
    const gate=deferred(),entered=deferred();const updates=[];const f=fixture({update:async o=>{updates.push(o);entered.resolve();await gate.promise;}}),old=object('Swap');f.objects.push(old);f.world.register(old);f.world.replicas.get(old.id).hiddenState={visible:true};f.world.receive({id:old.id,owner:'host',position:[12,0,0]});const frame=f.world.tick(0,f.vm);await entered.promise;f.world.unregister(old);f.objects.length=0;const replacement=object(old.id);f.objects.push(replacement);f.world.register(replacement);gate.resolve();await frame;assert.equal(updates.filter(o=>o===old).length,1);assert.equal(updates.filter(o=>o===replacement).length,1);assert.deepEqual(old.position,[0,0,0]);assert.deepEqual(replacement.position,[12,0,0]);
    checks.push('an object replaced during async unhide is not subsequently interpolated or updated through the old frame');
  }

  const bp=createAsset('blueprint','BP_Remote'),begin=makeNode('beginPlay'),print=makeNode('print');print.inputValues={message:'remote-ready'};bp.components=[makeSceneComponent('NetworkReplica',{interpolation:0})];bp.nodes=[begin,print];bp.edges=[{from:{node:begin.id,pin:'then'},to:{node:print.id,pin:'exec'}}];
  const asset='Assets/BP_Remote.hbblueprint.json',catalog=await prepareSpawnCatalog([{path:asset,kind:'blueprint'}],{readAsset:async()=>structuredClone(bp),readText:async()=>'',buildNative:()=>{throw Error('no native fixture');},builds:new Map()});
  server=await startMultiplayerServer();const received=new Map();
  globalThis.WebSocket=class extends WebSocket{constructor(url){super(url);this.on('message',wire=>{const p=JSON.parse(wire);for(const row of p.states||[])received.set(row.id,row);});}};
  host=new WebSocket(server.url+'?role=host&key='+encodeURIComponent(server.hostKey));let hostReady=false;host.on('message',wire=>{if(JSON.parse(wire).type==='welcomeEnd')hostReady=true;});await until(()=>hostReady,'host welcome');
  const director={...object('Director'),components:[]},groups=new Map(),messages=[];let waiting,buildEntered;
  services=engineOperations({headless:true,spawnCatalog:catalog,readAsset:async()=>structuredClone(bp),physicsOptions:{backend:'legacy',gravity:[0,0,0]},build:o=>{const g=new THREE.Group();groups.set(o.id,g);if(waiting){g.userData.ready=waiting.promise;buildEntered.resolve(o);}return g;},remove:o=>groups.delete(o.id),mesh:id=>groups.get(id),update:()=>{}});
  vm=new BlueprintRuntime([director], [],{...services,log:m=>messages.push(m)});await vm.start();const binding={self:director.id,root:{components:[]}},op=(key,args={})=>services.operation(key,args,binding,vm);
  const connect=async()=>{await op('netConnect',{endpoint:server.url,accessKey:server.clientKey,authority:false});await until(()=>services.networkState().status==='connected','client welcome');};
  await connect();
  for(const reason of ['disconnect','delete','asset-change','move']){
    const id='Remote_'+reason,row=remote(id,asset);waiting=deferred();buildEntered=deferred();host.send(JSON.stringify({type:'state',rows:[row]}));await until(()=>received.get(id)?.spawn?.asset===asset,'spawn packet '+reason);const frame=services.physics(0,vm);await buildEntered.promise;
    if(reason==='disconnect')await op('netDisconnect');
    else if(reason==='delete'){host.send(JSON.stringify({type:'destroy',ids:[id]}));await until(()=>received.get(id)?.deleted,'delete while loading');}
    else{const changed={...row,...(reason==='asset-change'?{spawn:{...row.spawn,asset:'Assets/Other.hbblueprint.json'}}:{position:[9,4,0]})};host.send(JSON.stringify({type:'state',rows:[changed]}));await until(()=>reason==='asset-change'?received.get(id)?.spawn?.asset===changed.spawn.asset:received.get(id)?.position?.[0]===9,'changed while loading '+reason);}
    waiting.resolve();waiting=null;await frame;
    if(reason==='move'){assert(vm.object(id));assert.deepEqual(vm.object(id).position,[9,4,0]);assert.equal(messages.filter(m=>m==='remote-ready').length,1);await op('netDisconnect');await op('sceneDestroy',{target:id});assert(!vm.object(id));}
    else{assert(!vm.object(id),reason+' staged actor');assert(!vm.bindings.some(b=>b.self===id));assert(!groups.has(id));assert.equal(messages.length,0);}
    if(reason!=='move'&&reason!=='delete'){host.send(JSON.stringify({type:'destroy',ids:[id]}));if(reason==='disconnect')await connect();}
  }
  checks.push('actual sockets and engineOperations: pending prefab disconnect/delete/asset replacement rolls back actor, render group and BP binding before BeginPlay; position updates remain valid and apply');
  const pooled=(await op('sceneSpawn',{blueprintOrPrefab:asset,transform:{position:[1,2,0],rotation:[0,0,0],scale:[1,1,1]}})).return;
  assert(services.networkState({kind:'replicas'}).items.some(r=>r.object===pooled));await op('poolRelease',{target:pooled});assert(!services.networkState({kind:'replicas'}).items.some(r=>r.object===pooled));await op('poolAcquire',{pool:[pooled],transform:{position:[3,4,0],rotation:[0,0,0],scale:[1,1,1]}});assert(services.networkState({kind:'replicas'}).items.some(r=>r.object===pooled));assert.deepEqual(vm.object(pooled).position,[3,4,0]);await op('sceneDestroy',{target:pooled});assert.equal(services.networkState({kind:'replicas'}).counts.replicas,0);
  checks.push('real SceneSpawn/poolRelease/poolAcquire/SceneDestroy re-registers a NetworkReplica-only actor and leaves no offline registration');
  const result={passed:true,implementationRoot,work,checks,scope:'Actual NetworkWorld async identity/generation fixtures and actual local ws server plus BlueprintRuntime/engineOperations prefab build-ready gate. Public netConnect/netDisconnect/SceneDestroy exercised; no native renderer, internet loss/prediction, rollback of arbitrary user callback side effects or dedicated authority claim.'};
  await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify(result,null,2));if(implementationRoot===path.resolve(import.meta.dirname,'..'))await fs.writeFile('native/build/network-lifetime-1574.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}catch(error){await fs.writeFile(path.join(work,'failure.json'),JSON.stringify({passed:false,error:error.message,location:error.stack?.split('\n').find(l=>l.includes('check-network-lifetime-1574.mjs'))},null,2));console.error(JSON.stringify({passed:false,work,error:error.message,location:error.stack?.split('\n').find(l=>l.includes('check-network-lifetime-1574.mjs'))}));process.exitCode=1;
}finally{for(const w of worlds)w.dispose();await vm?.stop();services?.dispose();host?.terminate();await server?.close();globalThis.WebSocket=originalSocket;await pruneTestArtifacts(work);}
