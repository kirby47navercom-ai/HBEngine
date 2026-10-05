import assert from 'node:assert/strict';
import {createAsset} from '../prototype/asset-documents.js';
import {makeNode} from '../prototype/blueprint-model.js';
import {parseNativeHeader} from '../prototype/native-model.js';
import {BlueprintRuntime} from '../prototype/blueprint-runtime.js';
import {NativeProtocol} from '../prototype/native-protocol.js';
import {NativeWorldClient} from '../prototype/native-transport.js';
import {NativeHost} from './native-host.mjs';

const header=`#include <HBEngine/Game.hpp>
HB_CLASS(Blueprintable) class BatchStats : public hb::Actor { public:
 HB_PROPERTY(BlueprintReadWrite) int Count=0;
 HB_PROPERTY(BlueprintReadWrite) float MaxHp=3;
 HB_FUNCTION(BlueprintCallable) int Think(float delta,int amount);
 HB_FUNCTION(BlueprintNativeEvent) virtual void Changed(int value);
};
HB_CLASS(Blueprintable) class BatchDirector : public hb::Actor { hb::Actor* previous=nullptr; public:
 HB_FUNCTION(BlueprintCallable) float ReadAndChange(const std::vector<hb::Actor*>& enemies);
 HB_FUNCTION(BlueprintCallable) void Remember(hb::Actor* other);
 HB_FUNCTION(BlueprintPure) bool Same(hb::Actor* other) const;
};`;
const source=`int BatchStats::Think(float,int amount){Count++;if(amount==-1)throw std::runtime_error("planned failure");if(amount==-2)hb::Scene::SetLocalPosition(this,{9,2,0});if(amount==-3)Changed(99);return amount;}
void BatchStats::Changed(int){}
float BatchDirector::ReadAndChange(const std::vector<hb::Actor*>& enemies){auto* enemy=dynamic_cast<BatchStats*>(enemies.at(0));if(!enemy)throw std::runtime_error("real class missing");const float value=enemy->MaxHp;enemy->MaxHp+=1;return value;}
void BatchDirector::Remember(hb::Actor* other){previous=other;}bool BatchDirector::Same(hb::Actor* other)const{return previous==other;}`;
const metadata={...parseNativeHeader(header),workerProtocol:3,nativeBatch:1},protocol=new NativeProtocol();
const actor=id=>({id,name:id,kind:'empty',visible:true,position:[0,2,0],rotation:[0,0,0],scale:[1,1,1],nativeClass:'BatchStats',nativeProperties:{Count:0,MaxHp:7.25},components:[]});
const bp=createAsset('blueprint','BP_Batch');bp.settings.parentClass='BatchStats';bp.native={...metadata,header,source};bp.variables=[{id:'amount',name:'Amount',type:'int',container:'single',value:7}];
const call=makeNode('nativeCall');call.nativeId='BatchStats.Think';const get=makeNode('getVariable');get.variableId='amount';const event=makeNode('nativeEvent');event.nativeId='BatchStats.Changed';const set=makeNode('setVariable');set.variableId='amount';
bp.nodes.push(call,get,event,set);bp.edges=[{from:{node:'tick',pin:'then'},to:{node:call.id,pin:'exec'}},{from:{node:'tick',pin:'delta'},to:{node:call.id,pin:'delta'}},{from:{node:get.id,pin:'value'},to:{node:call.id,pin:'amount'}},{from:{node:event.id,pin:'then'},to:{node:set.id,pin:'exec'}},{from:{node:event.id,pin:'value'},to:{node:set.id,pin:'value'}}];
function fakeWorld({count=50,batched=true,effects=false,fail=false,dependency=false,pool=false,interval=0,phase='tick',autoplay=false}={}){
  const objects=Array.from({length:count},(_,i)=>actor('actor'+i)),root=structuredClone(bp),executed=[],packets=[],operations=[],traces=[];if(interval)root.settings.tickInterval=interval;
  if(phase!=='tick'){root.nodes.find(n=>n.id==='tick').key=phase;if(phase==='beginPlay'){root.edges=root.edges.filter(e=>!(e.from.node==='tick'&&e.from.pin==='delta'));root.nodes.find(n=>n.id===call.id).inputValues={delta:1/60};}}
  if(autoplay){const timeline=makeNode('timeline');timeline.timeline.autoplay=true;root.nodes.push(timeline);}
  if(dependency){const print=makeNode('print');print.inputValues={message:'after'};root.nodes.push(print);root.edges.push({from:{node:call.id,pin:'then'},to:{node:print.id,pin:'exec'}});}
  if(pool)objects[2].poolActive=false;
  const build={token:'one-worker',metadata:{...metadata,...(!batched?{nativeBatch:undefined}:{})}},session={metadata:build.metadata},client=new NativeWorldClient();let vm,fired=false;
  const operation=async(key,args,b)=>{operations.push([key,b.self]);assert.equal(key,'setLocalPosition');objects.find(o=>o.id===args.target).position=args.position;};
  const native=async request=>{
    const result=await client.call({...request,objects,scopes:[]},build.metadata,async packet=>{
      packets.push(structuredClone(packet));const decoded=protocol.decodeRequest(session,packet);protocol.validate(session,decoded);const state=structuredClone(decoded.objects),entries=decoded.calls||[decoded],outputs=[],events=[],ops=[];let checkpoint=[],nativeError;
      for(const item of entries){if(fail&&item.self==='actor1'){nativeError='planned failure';break;}const object=state.find(o=>o.id===item.self);object.nativeProperties.Count++;executed.push([item.self,item.args.amount]);outputs.push({outputs:{result:item.args.amount}});checkpoint=structuredClone(state.filter(o=>o.nativeProperties.Count!==decoded.objects.find(p=>p.id===o.id).nativeProperties.Count));if(effects&&!fired){fired=true;events.push({nativeId:'BatchStats.Changed',target:'actor1',args:{value:99}});ops.push({key:'setLocalPosition',args:{target:'actor2',position:[5,2,0]}});break;}}
      const reply={ok:true,objects:checkpoint,events,operations:ops,clock:{time:0,delta:0,scale:1,paused:false},timerCallbacks:[],...(decoded.calls?{results:outputs,batchBoundary:events.length>0||ops.length>0,...(nativeError?{nativeError}:{})}:{outputs:outputs[0]?.outputs})};protocol.validateReply(session,decoded,reply);session.requestWorld=decoded.objects;session.requestWorldId=packet.worldId;session.requestSequence=packet.worldSequence;return {...reply,worldSequence:packet.worldSequence};
    });for(const state of result.objects)Object.assign(objects.find(o=>o.id===state.id),state);if(!request.calls)for(const op of result.operations)await operation(op.key,op.args,vm.bindings.find(b=>b.self===request.self));return result;
  };
  vm=new BlueprintRuntime(objects,objects.map(o=>({root,self:o.id})),{native,nativeBuild:()=>build,operation,trace:(n,f)=>traces.push([n.key,f.b.self]),log:()=>{}});return {vm,objects,executed,packets,operations,traces};
}
const ordinary=fakeWorld({batched:false}),batch=fakeWorld();await ordinary.vm.start();await batch.vm.start();await ordinary.vm.tick(1/60);await batch.vm.tick(1/60);
assert.equal(ordinary.packets.length,50);assert.equal(batch.packets.length,1);assert.equal(batch.packets[0].calls.length,50);assert.deepEqual(batch.executed,ordinary.executed);assert.deepEqual(batch.objects,ordinary.objects);assert.deepEqual(batch.traces,ordinary.traces);await batch.vm.tick(1/60);assert.equal(batch.packets[1].objects,undefined);assert.ok(batch.packets[1].objectPatch.length>0,'later frames carry changed state instead of another full scene');
for(const batched of [false,true]){const w=fakeWorld({count:4,batched,effects:true});await w.vm.start();await w.vm.tick(1/60);assert.deepEqual(w.executed,[['actor0',7],['actor1',99],['actor2',7],['actor3',7]],'host event changes future native arguments before they execute');assert.deepEqual(w.operations,[['setLocalPosition','actor0']]);assert.deepEqual(w.objects[2].position,[5,2,0]);if(batched)assert.equal(w.packets.length,2,'only the actual host-effects boundary separates batches');await w.vm.stop();}
const failure=fakeWorld({count:4,fail:true});await failure.vm.start();await assert.rejects(failure.vm.tick(1/60),/planned failure/);assert.deepEqual(failure.executed,[['actor0',7]]);assert.equal(failure.objects[0].nativeProperties.Count,1);assert.equal(failure.objects[1].nativeProperties.Count,0);assert.equal(failure.packets.length,1,'failed C++ is never automatically retried');assert.deepEqual(failure.traces,[['nativeCall','actor0'],['nativeCall','actor1']]);await failure.vm.stop();
const dependent=fakeWorld({count:3,dependency:true});await dependent.vm.start();await dependent.vm.tick(1/60);assert.equal(dependent.packets.length,3,'BP continuations use their original ordering boundary');await dependent.vm.stop();
const pooled=fakeWorld({count:5,pool:true});await pooled.vm.start();await pooled.vm.tick(1/60);assert.equal(pooled.objects[2].nativeProperties.Count,0);assert.equal(pooled.executed.length,4);await pooled.vm.stop();
const paced=fakeWorld({count:3,interval:.1});await paced.vm.start();await paced.vm.tick(.04);assert.equal(paced.packets.length,0);await paced.vm.tick(.04);await paced.vm.tick(.04);assert.equal(paced.packets.length,1);assert.equal(paced.packets[0].calls[0].args.delta,.12);await paced.vm.stop();
for(const phase of ['beginPlay','fixedTick']){const old=fakeWorld({phase,batched:false}),next=fakeWorld({phase});await old.vm.start();await next.vm.start();if(phase==='fixedTick'){await old.vm.fixedTick(1/60);await next.vm.fixedTick(1/60);}assert.equal(old.packets.length,50);assert.equal(next.packets.length,1);assert.deepEqual(next.executed,old.executed);assert.deepEqual(next.objects,old.objects);assert.deepEqual(next.traces,old.traces);await old.vm.stop();await next.vm.stop();}
const initialPool=fakeWorld({phase:'beginPlay',count:5,pool:true});await initialPool.vm.start();assert.equal(initialPool.executed.length,5,'inactive pooled actors still receive Begin Play');await initialPool.vm.stop();
const initialEffects=fakeWorld({phase:'beginPlay',count:4,effects:true});await initialEffects.vm.start();assert.deepEqual(initialEffects.executed,[['actor0',7],['actor1',99],['actor2',7],['actor3',7]]);assert.equal(initialEffects.packets.length,2);await initialEffects.vm.stop();
const auto=fakeWorld({phase:'beginPlay',count:3,autoplay:true});await auto.vm.start();assert.equal(auto.packets.length,3,'autoplay remains between each actor Begin Play and the next actor');assert.equal(auto.vm.timelines.size,3);await auto.vm.stop();
const valid={calls:[{key:'nativeCall',nativeId:'BatchStats.Think',self:'actor0',args:{target:'actor0',delta:.1,amount:7},overrides:[]}],objects:[actor('actor0')]};protocol.validate({metadata},valid);
for(const invalid of [{...valid,calls:[]},{...valid,calls:Array(1001).fill(valid.calls[0])},{...valid,calls:[{...valid.calls[0],command:'reset'}]},{...valid,calls:[{...valid.calls[0],objects:[]}]},{...valid,calls:[{...valid.calls[0],args:{target:'missing',delta:.1,amount:7}}]},{...valid,calls:[{...valid.calls[0],args:{target:'actor0',delta:'wrong',amount:7}}]}])assert.throws(()=>protocol.validate({metadata},invalid));assert.throws(()=>protocol.validate({metadata:{...metadata,nativeBatch:undefined}},valid));
const reply={results:[{outputs:{result:7}}],objects:[],events:[],operations:[],clock:{time:0,delta:0,scale:1,paused:false}};protocol.validateReply({metadata},valid,reply);
for(const invalid of [{...reply,results:[null]},{...reply,results:[7]},{...reply,results:[{}]},{...reply,results:[{outputs:[]}]},{...reply,results:[{outputs:{result:'wrong'}}]},{...reply,nativeError:'failure after all calls'},{...reply,batchBoundary:'yes'},{...reply,results:[]}])assert.throws(()=>protocol.validateReply({metadata},valid,invalid));
protocol.validateReply({metadata},{command:'frame',objects:valid.objects},{...reply,results:undefined});
await ordinary.vm.stop();await batch.vm.stop();console.log('Native batch: 50→1 RPC, input delta, same order/trace/state, host event/operation boundary, no failed-call retry, legacy continuation/pool/interval and protocol rejection passed');

if(process.argv.includes('--cpp')){
 const host=new NativeHost();try{const build=await host.build(header,source),objects=Array.from({length:50},(_,i)=>actor('actor'+i)),director={...actor('director'),nativeClass:'BatchDirector',nativeProperties:{}};objects.push(director);const client=new NativeWorldClient(),packets=[];
  const send=request=>client.call({...request,objects},build.metadata,packet=>{packets.push(structuredClone(packet));return host.call(build.token,packet);}),apply=result=>{for(const state of result.objects)Object.assign(objects.find(o=>o.id===state.id),state);return result;};
  const request=(nativeId,args,self='director')=>({key:'nativeCall',nativeId,args,self});const read=apply(await send(request('BatchDirector.ReadAndChange',{target:'director',enemies:['actor0']})));assert.equal(read.outputs.result,7.25);assert.equal(objects[0].nativeProperties.MaxHp,8.25);
  await send(request('BatchDirector.Remember',{target:'director',other:'actor0'}));for(const active of [false,true]){objects[0].poolActive=active;assert.equal((await send(request('BatchDirector.Same',{target:'director',other:'actor0'}))).outputs.result,true,'pool state preserves the actual C++ instance pointer');}
  const calls=objects.slice(0,50).map(o=>request('BatchStats.Think',{target:o.id,delta:1/60,amount:7},o.id)),result=apply(await send({calls,self:'actor0'}));assert.equal(result.results.length,50);assert.ok(objects.slice(0,50).every(o=>o.nativeProperties.Count===1));
  const failed=apply(await send({calls:[calls[0],{...calls[1],args:{...calls[1].args,amount:-1}},calls[2]],self:'actor0'}));assert.match(failed.nativeError,/planned failure/);assert.equal(failed.results.length,1);assert.equal(objects[0].nativeProperties.Count,2);assert.equal(objects[1].nativeProperties.Count,1,'failed call changes are excluded from the applied checkpoint');
  const recovered=apply(await send({calls,self:'actor0'}));assert.equal(packets.at(-1).baseSequence,0,'partial failure forces explicit full resynchronization');assert.equal(recovered.results.length,50);assert.equal(objects[1].nativeProperties.Count,2);
  const boundary=apply(await send({calls:[{...calls[0],args:{...calls[0].args,amount:-2}},calls[1]],self:'actor0'}));assert.equal(boundary.results.length,1);assert.equal(boundary.batchBoundary,true);assert.equal(boundary.operations[0].key,'setLocalPosition');
  const emitted=apply(await send({calls:[{...calls[0],args:{...calls[0].args,amount:-3},overrides:['BatchStats.Changed']},calls[1]],self:'actor0'}));assert.equal(emitted.results.length,1);assert.equal(emitted.events[0].nativeId,'BatchStats.Changed');
  await send({command:'reset'});assert.equal((await send(request('BatchDirector.Same',{target:'director',other:'actor0'}))).outputs.result,false,'Stop/Play reset releases previous pointers');console.log('Actual C++: dynamic_cast/defaults/writeback, pooled pointer identity, 50-instance batch, failure checkpoint/recovery, operation/event boundaries and reset passed');
 }finally{host.close();}
}
