import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createAsset} from '../prototype/asset-documents.js';
import {makeNode,connect} from '../prototype/blueprint-model.js';
import {BlueprintRuntime} from '../prototype/blueprint-runtime.js';
import {parseNativeHeader} from '../prototype/native-model.js';
import {NativeHost} from './native-host.mjs';

const object=id=>({id,name:id,kind:'empty',position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],components:[]});
const pair=(a,b,trigger=true,component='sensor')=>({a,b,trigger,componentA:component,componentB:component,colliderA:{component:{type:'BoxCollider',blueprintSources:[{name:'BP_Contacts',id:component}]}},colliderB:{component:{type:'BoxCollider',blueprintSources:[{name:'BP_Contacts',id:component}]}},position:[2,3,4],normal:[1,0,0]});
const header='#include <HBEngine/Game.hpp>\nHB_CLASS(Blueprintable) class ContactProbe:public hb::Actor { public: HB_PROPERTY(BlueprintReadWrite) std::string Order; HB_PROPERTY(BlueprintReadWrite) hb::Vec3 Normal; HB_FUNCTION(BlueprintCallable) void Record(int phase,hb::Actor* other,hb::HitResult hit); };';
const source='void ContactProbe::Record(int phase,hb::Actor* other,hb::HitResult hit){if(!other)throw std::runtime_error("missing other actor");Order+=std::to_string(phase)+",";if(hit.hit){if(hit.actor!=other)throw std::runtime_error("wrong hit receiver");Normal=hit.normal;}}';
const root=createAsset('blueprint','BP_Contacts');root.native={...parseNativeHeader(header),header,source};root.settings.parentClass='ContactProbe';root.nodes=[];root.edges=[];
for(const [phase,key,component] of [[1,'beginOverlap','sensor'],[2,'endOverlap','sensor'],[3,'hitEvent','solid']]){
  const event=makeNode(key),call=makeNode('nativeCall');event.options={componentId:component};call.nativeId='ContactProbe.Record';call.inputValues={phase,hit:{hit:false,position:[0,0,0],normal:[0,0,0],actor:null}};root.nodes.push(event,call);
  for(const [out,input] of [['then','exec'],['other','other'],...(key==='hitEvent'?[['hit','hit']]:[])])assert.ok(connect(root,{node:event.id,pin:out},{node:call.id,pin:input}).ok);
}
const host=new NativeHost(),build=await host.build(header,source),proof=[];
try{
  for(const batched of [false,true]){
    await host.call(build.token,{command:'reset',objects:[]});const objects=['a','b','c','none'].map(id=>({...object(id),nativeClass:'ContactProbe',nativeProperties:{Order:'',Normal:[0,0,0]}})),noEvents=structuredClone(root);noEvents.nodes=[];noEvents.edges=[];
    let contacts=[pair('a','b'),pair('a','c'),pair('a','b',false,'solid'),pair('a','b',true,'ignored')],vm;const calls=[];
    vm=new BlueprintRuntime(objects,objects.map(o=>({root:o.id==='none'?noEvents:root,self:o.id})),{contacts:()=>contacts,nativeBuild:()=>({...build,metadata:{...build.metadata,nativeBatch:batched?1:undefined}}),native:async request=>{
      calls.push(...(request.calls||[request]).map(c=>[c.self,c.args.phase]));const result=await host.call(build.token,{...request,objects:vm.objects,scopes:[...vm.scopes]});
      for(const state of result.objects){const target=objects.find(o=>o.id===state.id),properties={...target.nativeProperties,...state.nativeProperties};Object.assign(target,state,{nativeProperties:properties});}return result;
    }});
    await vm.start();await vm.collisions();assert.deepEqual(calls,[['a',1],['a',1],['a',3],['b',1],['b',3],['c',1]]);assert.equal(vm.overlaps.size,6);assert.equal(vm.hits.size,2);
    assert.deepEqual(objects[0].nativeProperties.Normal,[1,0,0]);assert.deepEqual(objects[1].nativeProperties.Normal.map(v=>v||0),[-1,0,0]);const count=calls.length;
    await vm.collisions();assert.equal(calls.length,count,'persistent contact does not repeat Begin/Hit');assert.equal(vm.overlaps.size,6,'unconnected component contact remains tracked');
    contacts=[];await vm.collisions();assert.deepEqual(calls.slice(count),[['a',2],['a',2],['b',2],['c',2]]);assert.equal(vm.overlaps.size,0);assert.equal(vm.hits.size,0);
    contacts=[pair('a','b',false,'solid')];await vm.collisions();assert.deepEqual(calls.slice(-2),[['a',3],['b',3]]);proof.push({batched,calls,properties:objects.map(o=>o.nativeProperties)});await vm.stop();
  }
}finally{host.close();}
assert.deepEqual(proof[0].calls,proof[1].calls);assert.deepEqual(proof[0].properties,proof[1].properties);

// Same callback-free workload before/after the patch. This is dispatch CPU cost,
// not physical collision simulation, render cost, mobile speed or whole-game FPS.
const objects=Array.from({length:512},(_,i)=>object('o'+i)),empty=createAsset('blueprint','BP_NoContactEvents');empty.nodes=[];empty.edges=[];
const contacts=Array.from({length:64},(_,i)=>pair('o'+i,'o'+(i+1))),vm=new BlueprintRuntime(objects,objects.map(o=>({root:empty,self:o.id})),{contacts:()=>contacts});await vm.start();
for(let i=0;i<10;i++)await vm.collisions();const samples=[];for(let batch=0;batch<5;batch++){const started=performance.now();for(let i=0;i<60;i++)await vm.collisions();samples.push((performance.now()-started)/60);}assert.equal(vm.overlaps.size,128);await vm.stop();
const runtime=await fs.readFile(new URL('../prototype/blueprint-runtime.js',import.meta.url)),result={passed:true,proof,bindings:512,contacts:64,framesPerBatch:60,dispatchMs:samples,medianMs:[...samples].sort((a,b)=>a-b)[2],runtimeSHA256:createHash('sha256').update(runtime).digest('hex')};
const out=await fs.mkdtemp(path.join(path.resolve(import.meta.dirname,'../native/build'),'collision-dispatch-'));await fs.writeFile(path.join(out,'acceptance.json'),JSON.stringify(result,null,2));console.log('충돌 BP→실제 C++ 순서·정방향/역방향·Enter/Exit·핀 필터·배치 동일성 PASS: '+out);console.log(JSON.stringify({medianMs:result.medianMs,samples}));
