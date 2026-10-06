import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {NativeHost} from './native-host.mjs';
import {createAsset} from '../prototype/asset-documents.js';
import {createGameplayAsset,makeState} from '../prototype/gameplay-assets.js';
import {makeNode} from '../prototype/blueprint-model.js';
import {makeSceneComponent} from '../prototype/scene-components.js';
import {parseNativeHeader,nativeRequestWorld} from '../prototype/native-model.js';
import {preparePlayWorld} from '../prototype/play-world.js';
import {nativeBindings} from '../prototype/native-module-query.js';
import {nativeWorldClient} from '../prototype/native-transport.js';
import {BlueprintRuntime} from '../prototype/blueprint-runtime.js';
import {engineOperations} from '../prototype/engine-services.js';
import {NativeProtocol} from '../prototype/native-protocol.js';

const header=`#include <HBEngine/Game.hpp>
HB_CLASS(Blueprintable) class FSMProbe:public hb::Actor{public:
 HB_PROPERTY(BlueprintReadWrite) hb::Actor* Peer=nullptr;
 HB_PROPERTY(BlueprintReadWrite) int Calls=0;
 HB_PROPERTY(BlueprintReadWrite) float Own=0;
 HB_PROPERTY(BlueprintReadWrite) float Next=0;
 HB_PROPERTY(BlueprintReadWrite) bool Signal=false;
 HB_PROPERTY(BlueprintReadWrite) bool Fail=false;
 HB_PROPERTY(BlueprintReadWrite) std::string Events="";
 HB_FUNCTION(BlueprintCallable) void Think(); HB_FUNCTION(BlueprintCallable) void Entered();
};`;
const source=`void FSMProbe::Think(){if(Fail)throw std::runtime_error("planned FSM failure");Calls++;Own=hb::States::GetElapsed(this);Next=hb::States::GetElapsed(Peer);Events+="update;";if(Signal){hb::States::SetBool(Peer,"Ready",true);Signal=false;}}void FSMProbe::Entered(){Events+="entered;";}`;
const native={...parseNativeHeader(header),header,source,headerPath:'Source/FSM.h',sourcePath:'Source/FSM.cpp'};
const blueprint=createAsset('blueprint','BP_FSM');blueprint.native=native;blueprint.settings.parentClass='FSMProbe';blueprint.settings.tickEnabled=false;blueprint.components=[makeSceneComponent('StateMachine',{asset:'Assets/FSM.hbstatemachine.json',autoStart:true})];blueprint.nodes=[];blueprint.edges=[];
for(const [name,fn] of [['Update','Think'],['Enter','Entered']]){const event=makeNode('customEvent'),call=makeNode('nativeCall');event.options={eventName:name};call.nativeId='FSMProbe.'+fn;blueprint.nodes.push(event,call);blueprint.edges.push({from:{node:event.id,pin:'then'},to:{node:call.id,pin:'exec'}});}
const fsm=createGameplayAsset('statemachine','FSM');const idle={...makeState('Idle'),id:'idle',onUpdate:'Update'},done={...makeState('Done'),id:'done',onUpdate:'Update',onEnter:'Enter'};fsm.states=[idle,done];fsm.initial='idle';fsm.parameters=[{name:'Ready',type:'bool',value:false}];fsm.transitions=[{id:'ready',from:'idle',to:'done',event:'',hasExitTime:false,exitTime:0,conditions:[{key:'Ready',operator:'equal',value:true}]}];
const assets=new Map([['Assets/BP_FSM.hbblueprint.json',blueprint],['Assets/FSM.hbstatemachine.json',fsm]]),host=new NativeHost(),directory=await fs.mkdtemp(path.resolve(import.meta.dirname,'../native/build/state-native-batch-'));
async function run(batched,signal=false,fail=false){
  const objects=Array.from({length:5},(_,i)=>({id:'actor'+i,name:'Actor'+i,kind:'empty',visible:true,position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],blueprintAsset:'Assets/BP_FSM.hbblueprint.json',overrides:{nativeProperties:{Peer:'actor'+((i+1)%5),Signal:signal&&i===0,Fail:fail&&i===0}}}));
  const prepared=await preparePlayWorld(objects,{autoSpawnPlayer:false,dimension:'2d'},{readAsset:async p=>structuredClone(assets.get(p)),readText:async p=>p.endsWith('.h')?header:source,buildNative:(h,s)=>host.build(h,s)}),build=prepared.builds.get('Assets/BP_FSM.hbblueprint.json');
  const services=engineOperations({headless:true,readAsset:async p=>structuredClone(assets.get(p)),asset:async p=>p,physicsOptions:{backend:'legacy',gravity:[0,0,0]},update(){},mesh:()=>null}),vm=new BlueprintRuntime(objects,prepared.bindings,{...services,nativeBuild:()=>batched?build:{...build,metadata:{...build.metadata,nativeStateBatch:0}}});
  let packets=0;const framePackets=[];vm.hooks.native=async request=>{packets++;const reply=await nativeWorldClient(build,vm).call({...request,nativeBindings:nativeBindings(objects,prepared.builds,vm.bindings,request,build.metadata),scopes:[...vm.scopes],objects:nativeRequestWorld(objects,new Set(prepared.builds.keys()),request,build.metadata)},build.metadata,p=>host.call(build.token,p));for(const state of reply.objects)Object.assign(vm.object(state.id),state);if(!request.calls)await vm.applyNativeOperations(reply.operations||[],vm.bindings.find(b=>b.self===request.self));return reply;};
  try{await vm.start();packets=0;if(fail){await assert.rejects(vm.tick(.1),/planned FSM failure/);objects[0].nativeProperties.Fail=false;await vm.tick(.1);}else for(let i=0;i<3;i++){const before=packets;await vm.tick(.1);framePackets.push(packets-before);}return {packets,framePackets,objects:objects.filter(o=>o.nativeClass==='FSMProbe').map(o=>({props:structuredClone(o.nativeProperties),state:structuredClone(o.gameplayDebug.stateMachine),parameters:structuredClone(o.gameplayDebug.parameters)}))};}finally{await vm.stop();services.dispose();}
}
try{
  const build=await host.build(header,source),protocol=new NativeProtocol(),actor={id:'actor',nativeClass:'FSMProbe',position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]},call={key:'nativeCall',nativeId:'FSMProbe.Think',self:'actor',args:{target:'actor'}};
  const request={objects:[actor],calls:[call]};protocol.validate(build,request);
  for(const stateUpdates of [null,{},[{id:'missing',gameplayDebug:{}}],[{id:'actor',gameplayDebug:{},position:[1,2,3]}],[{id:'actor',gameplayDebug:{}},{id:'actor',gameplayDebug:{}}],[{id:'actor',gameplayDebug:{time:NaN}}],[{id:'actor',gameplayDebug:{text:'x'.repeat(65536)}}]])assert.throws(()=>protocol.validate(build,{...request,calls:[{...call,stateUpdates}]}),/상태 콜백/);
  const validUpdate=[{id:'actor',gameplayDebug:{stateMachine:{elapsed:.1}}}];protocol.validate(build,{...request,calls:[{...call,stateUpdates:validUpdate}]});assert.throws(()=>protocol.validate(build,{...call,objects:[actor],stateUpdates:validUpdate}),/묶음 호출/);assert.throws(()=>protocol.validate({...build,metadata:{...build.metadata,nativeStateBatch:0}},{...request,calls:[{...call,stateUpdates:validUpdate}]}),/상태 콜백/);
  const plain=await run(false),batch=await run(true);assert.deepEqual(batch.objects,plain.objects);assert.deepEqual(plain.framePackets,[5,5,5]);assert.deepEqual(batch.framePackets,[1,1,1]);assert.ok(Math.abs(batch.objects[0].props.Next-.2)<1e-6);assert.ok(Math.abs(batch.objects[4].props.Next-.3)<1e-6);
  const plainBoundary=await run(false,true),batchBoundary=await run(true,true);assert.deepEqual(batchBoundary.objects,plainBoundary.objects);assert.equal(batchBoundary.objects[1].state.active.at(-1).name,'Done');assert.equal(batchBoundary.objects[1].props.Events,'update;entered;update;update;');
  const failure=await run(true,false,true);assert.ok(failure.objects.every(o=>o.props.Calls===1));
  await fs.writeFile(path.join(directory,'acceptance.json'),JSON.stringify({passed:true,plain,batch,plainBoundary,batchBoundary,failure},null,2));console.log(JSON.stringify({directory,passed:true,packets:{plain:plain.packets,batched:batch.packets},boundary:batchBoundary.packets}));
}catch(error){await fs.writeFile(path.join(directory,'failure.json'),JSON.stringify({passed:false,error:error.stack},null,2));throw error;}finally{host.close();}
