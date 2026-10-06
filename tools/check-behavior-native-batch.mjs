import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {NativeHost} from './native-host.mjs';
import {createAsset} from '../prototype/asset-documents.js';
import {createGameplayAsset,makeBehaviorNode} from '../prototype/gameplay-assets.js';
import {makeNode} from '../prototype/blueprint-model.js';
import {makeSceneComponent} from '../prototype/scene-components.js';
import {parseNativeHeader,nativeRequestWorld} from '../prototype/native-model.js';
import {preparePlayWorld} from '../prototype/play-world.js';
import {nativeBindings} from '../prototype/native-module-query.js';
import {nativeWorldClient} from '../prototype/native-transport.js';
import {BlueprintRuntime} from '../prototype/blueprint-runtime.js';
import {engineOperations} from '../prototype/engine-services.js';

const header=`#include <HBEngine/Game.hpp>
HB_CLASS(Blueprintable) class BTProbe:public hb::Actor{public:
 HB_PROPERTY(BlueprintReadWrite) BTProbe* Peer=nullptr;
 HB_PROPERTY(BlueprintReadWrite) int Calls=0;
 HB_PROPERTY(BlueprintReadWrite) int Next=0;
 HB_PROPERTY(BlueprintReadWrite) bool Signal=false;
 HB_PROPERTY(BlueprintReadWrite) bool Fail=false;
 HB_PROPERTY(BlueprintReadWrite) std::string Events="";
 HB_FUNCTION(BlueprintCallable) void Think();
 HB_FUNCTION(BlueprintCallable) void Finished();
 HB_FUNCTION(BlueprintCallable) void Aborted();
};`;
const source=`void BTProbe::Think(){if(Fail)throw std::runtime_error("planned BT failure");Calls++;Next=Peer?Peer->Calls:-1;Events+="tick;";if(Signal){hb::AI::FinishTask(this,hb::AI::GetTaskHandle(this,"Work"),true);Signal=false;}}void BTProbe::Finished(){Events+="finish;";}void BTProbe::Aborted(){Events+="abort;";}`;
const native={...parseNativeHeader(header),header,source,headerPath:'Source/BT.h',sourcePath:'Source/BT.cpp'};
const blueprint=createAsset('blueprint','BP_BT');blueprint.native=native;blueprint.settings.parentClass='BTProbe';blueprint.settings.tickEnabled=false;blueprint.components=[makeSceneComponent('BehaviorTree',{asset:'Assets/BT.hbbehaviortree.json',autoStart:true})];blueprint.nodes=[];blueprint.edges=[];
for(const [name,fn] of [['Update','Think'],['Finish','Finished'],['Abort','Aborted']]){const event=makeNode('customEvent'),call=makeNode('nativeCall');event.options={eventName:name};call.nativeId='BTProbe.'+fn;blueprint.nodes.push(event,call);blueprint.edges.push({from:{node:event.id,pin:'then'},to:{node:call.id,pin:'exec'}});}
const tree=createGameplayAsset('behaviortree','BT'),task=makeBehaviorNode('task');task.name='Work';task.properties={onStart:'',onTick:'Update',onFinish:'Finish',onAbort:'Abort'};tree.nodes=[task];tree.root=task.id;tree.interval=.1;
const assets=new Map([['Assets/BP_BT.hbblueprint.json',blueprint],['Assets/BT.hbbehaviortree.json',tree]]),host=new NativeHost(),directory=await fs.mkdtemp(path.resolve(import.meta.dirname,'../native/build/behavior-native-batch-'));
async function run(batched,signal=false,fail=false){
 const objects=Array.from({length:5},(_,i)=>({id:'actor'+i,name:'Actor'+i,kind:'empty',visible:true,position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],blueprintAsset:'Assets/BP_BT.hbblueprint.json',overrides:{nativeProperties:{Peer:'actor'+((i+1)%5)}}}));
 const prepared=await preparePlayWorld(objects,{autoSpawnPlayer:false,dimension:'2d'},{readAsset:async p=>structuredClone(assets.get(p)),readText:async p=>p.endsWith('.h')?header:source,buildNative:(h,s)=>host.build(h,s)}),build=prepared.builds.get('Assets/BP_BT.hbblueprint.json');
 const services=engineOperations({headless:true,readAsset:async p=>structuredClone(assets.get(p)),asset:async p=>p,physicsOptions:{backend:'legacy',gravity:[0,0,0]},update(){},mesh:()=>null}),vm=new BlueprintRuntime(objects,prepared.bindings,{...services,nativeBuild:()=>batched?build:{...build,metadata:{...build.metadata,nativeStateBatch:0}}});
 let packets=0;const framePackets=[];vm.hooks.native=async request=>{packets++;const reply=await nativeWorldClient(build,vm).call({...request,nativeBindings:nativeBindings(objects,prepared.builds,vm.bindings,request,build.metadata),scopes:[...vm.scopes],objects:nativeRequestWorld(objects,new Set(prepared.builds.keys()),request,build.metadata)},build.metadata,p=>host.call(build.token,p));for(const state of reply.objects)Object.assign(vm.object(state.id),state);if(!request.calls)await vm.applyNativeOperations(reply.operations||[],vm.bindings.find(b=>b.self===request.self));return reply;};
 try{await vm.start();await vm.tick(.1);packets=0;objects[2].nativeProperties.Signal=signal;objects[2].nativeProperties.Fail=fail;
  if(fail){await assert.rejects(vm.tick(.1),/planned BT failure/);objects[2].nativeProperties.Fail=false;await vm.tick(.1);}else for(let i=0;i<3;i++){const before=packets;await vm.tick(.1);framePackets.push(packets-before);}
  return {packets,framePackets,objects:objects.filter(o=>o.nativeClass==='BTProbe').map(o=>({props:structuredClone(o.nativeProperties),result:o.gameplayDebug.behavior.result,status:structuredClone(o.gameplayDebug.behavior.status),tasks:o.gameplayDebug.behavior.tasks.map(({handle,...t})=>t)}))};
 }finally{await vm.stop();services.dispose();}
}
try{const plain=await run(false),batch=await run(true);assert.deepEqual(batch.objects,plain.objects);assert.deepEqual(plain.framePackets,[5,5,5]);assert.deepEqual(batch.framePackets,[1,1,1]);const plainBoundary=await run(false,true),batchBoundary=await run(true,true);assert.deepEqual(batchBoundary.objects,plainBoundary.objects);assert.ok(batchBoundary.objects[2].props.Events.includes('finish;'));
 const plainFailure=await run(false,false,true),batchFailure=await run(true,false,true);assert.deepEqual(batchFailure.objects,plainFailure.objects);
 const wrappers=[];for(const type of ['selector','sequence','timeLimit','repeat']){const root=makeBehaviorNode(type);root.id='root';root.children=[task.id];if(type==='timeLimit')root.properties.duration=10;tree.nodes=[root,task];tree.root=root.id;const baseline=await run(false),grouped=await run(true);assert.deepEqual(grouped.objects,baseline.objects);assert.deepEqual(grouped.framePackets,[1,1,1]);wrappers.push(type);}
 await fs.writeFile(path.join(directory,'acceptance.json'),JSON.stringify({passed:true,plain,batch,plainBoundary,batchBoundary,plainFailure,batchFailure,wrappers},null,2));console.log(JSON.stringify({directory,passed:true,packets:{plain:plain.packets,batched:batch.packets},boundary:batchBoundary.packets,wrappers}));
}catch(error){await fs.writeFile(path.join(directory,'failure.json'),JSON.stringify({passed:false,error:error.stack},null,2));throw error;}finally{host.close();}
