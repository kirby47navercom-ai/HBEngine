import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createAsset} from '../prototype/asset-documents.js';
import {makeNode,connect,validBlueprint,effectivePins} from '../prototype/blueprint-model.js';
import {BlueprintRuntime} from '../prototype/blueprint-runtime.js';
import {detailsMarkup} from '../prototype/blueprint-details.js';
import {makeSceneComponent} from '../prototype/scene-components.js';
import {engineOperations} from '../prototype/engine-services.js';
import {parseNativeHeader} from '../prototype/native-model.js';
import {NativeHost} from './native-host.mjs';

const object=id=>({id,name:id,kind:'empty',position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],components:[]});
const pair=(a,b,trigger=true,component='sensor')=>({a,b,trigger,componentA:component,componentB:component,colliderA:{component:{type:'BoxCollider',blueprintSources:[{name:'BP_Contacts',id:component}]}},colliderB:{component:{type:'BoxCollider',blueprintSources:[{name:'BP_Contacts',id:component}]}},position:[2,3,4],normal:[1,0,0]});
const header='#include <HBEngine/Game.hpp>\nHB_CLASS(Blueprintable) class ContactProbe:public hb::Actor { public: HB_PROPERTY(BlueprintReadWrite) std::string Order; HB_PROPERTY(BlueprintReadWrite) hb::Vec3 Normal; HB_PROPERTY(BlueprintReadWrite) float LastDelta=0; HB_FUNCTION(BlueprintCallable) void Record(int phase,hb::Actor* other,hb::HitResult hit,float delta=0); };';
const source='void ContactProbe::Record(int phase,hb::Actor* other,hb::HitResult hit,float delta){if(!other&&phase!=2&&phase!=6)throw std::runtime_error("missing other actor");Order+=std::to_string(phase)+",";if(phase>=3&&phase!=4){if(hit.actor!=other)throw std::runtime_error("wrong hit receiver");if(hit.hit!=(phase!=6))throw std::runtime_error("wrong contact state");Normal=hit.normal;}if(delta>0)LastDelta=delta;}';
const root=createAsset('blueprint','BP_Contacts');root.native={...parseNativeHeader(header),header,source};root.settings.parentClass='ContactProbe';root.nodes=[];root.edges=[];
for(const [phase,key,component] of [[1,'beginOverlap','sensor'],[2,'endOverlap','sensor'],[3,'hitEvent','solid']]){
  const event=makeNode(key),call=makeNode('nativeCall');event.options={componentId:component};call.nativeId='ContactProbe.Record';call.inputValues={phase,hit:{hit:false,position:[0,0,0],normal:[0,0,0],actor:null}};root.nodes.push(event,call);
  for(const [out,input] of [['then','exec'],['other','other'],...(key==='hitEvent'?[['hit','hit']]:[])])assert.ok(connect(root,{node:event.id,pin:out},{node:call.id,pin:input}).ok);
}
const continued=structuredClone(root);
for(const [phase,key,component] of [[4,'overlapStay','sensor'],[5,'hitStay','solid'],[6,'endHit','solid']]){
  const event=makeNode(key),call=makeNode('nativeCall');event.options={componentId:component};call.nativeId='ContactProbe.Record';call.inputValues={phase};continued.nodes.push(event,call);
  for(const [out,input] of [['then','exec'],['other','other'],...(key!=='overlapStay'?[['hit','hit']]:[]),...(key!=='endHit'?[['delta','delta']]:[])])assert.ok(connect(continued,{node:event.id,pin:out},{node:call.id,pin:input}).ok);
  if(key!=='endHit')assert.ok(effectivePins(event,'out',continued).some(p=>p.id==='delta'&&p.type==='float'));
}
continued.components.push(makeSceneComponent('BoxCollider',{trigger:true},'sensor'),makeSceneComponent('BoxCollider',{},'solid'));
assert.ok(validBlueprint(continued));
const markup=detailsMarkup(continued,continued,{kind:'component',id:'sensor'},[],[]);
for(const key of ['beginOverlap','overlapStay','endOverlap','hitEvent','hitStay','endHit'])assert.ok(markup.includes('data-component-event="'+key+'"'));
for(const event of continued.nodes.filter(n=>['overlapStay','hitStay','endHit'].includes(n.key)))assert.ok(detailsMarkup(continued,continued,{kind:'node',id:event.id},[],[]).includes('value="solid"'));
const host=new NativeHost(),build=await host.build(header,source),proof=[],stayProof=[],fixedProof=[];
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
    contacts=[pair('a','b',false,'solid')];await vm.collisions();assert.deepEqual(calls.slice(-2),[['a',3],['b',3]]);
    contacts=[pair('b','c')];await vm.collisions();const reordered=calls.length;vm.bindings=vm.bindings.filter(b=>b.self!=='a');objects.splice(objects.findIndex(o=>o.id==='a'),1);
    await vm.collisions();assert.equal(calls.length,reordered,'removing an unrelated earlier actor must not re-enter/exit existing pairs');
    objects.splice(objects.findIndex(o=>o.id==='c'),1);vm.bindings=vm.bindings.filter(b=>b.self!=='c');contacts=[];await vm.collisions();assert.deepEqual(calls.slice(reordered),[['b',2]],'only the surviving owner receives Exit after its other actor is removed');
    const recycled={...object('recycled'),nativeClass:'ContactProbe',nativeProperties:{Order:'',Normal:[0,0,0]}};objects.push(recycled);vm.addBindings([{root,self:recycled.id}]);contacts=[pair('b',recycled.id)];await vm.collisions();const beforePool=calls.length;
    recycled.poolActive=false;vm.bindings=vm.bindings.filter(b=>b.self!==recycled.id);contacts=[];await vm.collisions();assert.deepEqual(calls.slice(beforePool),[['b',2]],'pooled owner is not called after its lifetime ends');
    recycled.poolActive=true;vm.addBindings([{root,self:recycled.id}]);contacts=[pair('b',recycled.id)];await vm.collisions();assert.deepEqual(calls.slice(-2),[['b',1],[recycled.id,1]],'a reused actor gets a fresh contact lifetime');
    contacts=[];await vm.collisions();const beforeUnknown=calls.length;contacts=[{...pair('b',recycled.id,true,'unknown'),colliderA:undefined,colliderB:undefined}];await vm.collisions();contacts=[];await vm.collisions();assert.equal(calls.length,beforeUnknown,'unknown collider metadata never matches a selected component through undefined type');
    proof.push({batched,calls,properties:objects.map(o=>o.nativeProperties)});await vm.stop();
    await host.call(build.token,{command:'reset',objects:[]});
    const stayObjects=['first','second'].map(id=>({...object(id),nativeClass:'ContactProbe',nativeProperties:{Order:'',Normal:[0,0,0],LastDelta:0}})),stayCalls=[];let stayVM;
    let stayContacts=[pair('first','second'),pair('first','second',false,'solid')];
    stayVM=new BlueprintRuntime(stayObjects,stayObjects.map(o=>({root:continued,self:o.id})),{contacts:()=>stayContacts,nativeBuild:()=>({...build,metadata:{...build.metadata,nativeBatch:batched?1:undefined}}),native:async request=>{
      stayCalls.push(...(request.calls||[request]).map(c=>[c.self,c.args.phase]));const result=await host.call(build.token,{...request,objects:stayObjects,scopes:[...stayVM.scopes]});
      for(const state of result.objects){const target=stayObjects.find(o=>o.id===state.id);Object.assign(target,state,{nativeProperties:{...target.nativeProperties,...state.nativeProperties}});}return result;
    }});
    await stayVM.start();await stayVM.collisions(1/60);assert.deepEqual(stayCalls,[['first',1],['first',3],['second',1],['second',3]]);
    await stayVM.collisions();assert.equal(stayCalls.length,4,'render fallback must not deliver Stay again');
    await stayVM.collisions(1/60);assert.deepEqual(stayCalls.slice(4),[['first',4],['first',5],['second',4],['second',5]]);
    for(const o of stayObjects)assert.ok(Math.abs(o.nativeProperties.LastDelta-1/60)<1e-7,'fixed step reaches typed C++ float');
    const sleeping={isFixed:()=>false,isSleeping:()=>true};for(const contact of stayContacts.filter(c=>!c.trigger))for(const collider of [contact.colliderA,contact.colliderB])collider.r={body:sleeping};
    await stayVM.collisions(1/60);assert.deepEqual(stayCalls.slice(8),[['first',4],['second',4]],'sleeping solid bodies suppress Stay while sensors remain active');
    stayContacts=[];await stayVM.collisions(1/60);assert.deepEqual(stayCalls.slice(10),[['first',2],['second',2],['first',6],['second',6]]);
    assert.deepEqual(stayObjects[0].nativeProperties.Normal,[1,0,0]);assert.deepEqual(stayObjects[1].nativeProperties.Normal.map(v=>v||0),[-1,0,0]);
    stayContacts=[pair('first','second',false,'solid')];await stayVM.collisions(1/60);const beforeRemoval=stayCalls.length;
    stayObjects.pop();stayVM.bindings=stayVM.bindings.filter(b=>b.self!=='second');stayContacts=[];await stayVM.collisions(1/60);assert.deepEqual(stayCalls.slice(beforeRemoval),[['first',6]],'removed actor resolves to null in a surviving owner\'s typed C++ Collision Exit');
    stayProof.push({batched,calls:stayCalls,properties:stayObjects.map(o=>o.nativeProperties)});await stayVM.stop();
    for(const dimension of [2,3]){
      await host.call(build.token,{command:'reset',objects:[]});const graph=structuredClone(continued);graph.components=[makeSceneComponent(dimension===2?'BoxCollider2D':'BoxCollider',{trigger:true},'sensor'),makeSceneComponent(dimension===2?'Rigidbody2D':'Rigidbody',{useGravity:false},'body')];
      const scene=['fixed-first','fixed-second'].map(id=>({...object(id),nativeClass:'ContactProbe',nativeProperties:{Order:'',Normal:[0,0,0],LastDelta:0}})),calls=[],services=engineOperations({update:()=>{},readAsset:async()=>null});let physicalVM;
      physicalVM=new BlueprintRuntime(scene,scene.map(o=>({root:graph,self:o.id})),{...services,nativeBuild:()=>({...build,metadata:{...build.metadata,nativeBatch:batched?1:undefined}}),native:async request=>{
        calls.push(...(request.calls||[request]).map(c=>[c.self,c.args.phase]));const result=await host.call(build.token,{...request,objects:scene,scopes:[...physicalVM.scopes]});
        for(const state of result.objects){const target=scene.find(o=>o.id===state.id);Object.assign(target,state,{nativeProperties:{...target.nativeProperties,...state.nativeProperties}});}return result;
      }});
      try{
        await physicalVM.start();await physicalVM.tick(1/60);assert.deepEqual(calls,[['fixed-first',1],['fixed-second',1]]);
        await physicalVM.tick(1/120);assert.equal(calls.length,2);await physicalVM.tick(1/120);assert.equal(calls.length,4);
        await physicalVM.tick(1/30);assert.equal(calls.length,8,'two physics steps deliver exactly two Stay events per receiver');
        for(const o of scene)assert.ok(Math.abs(o.nativeProperties.LastDelta-1/60)<1e-7);
        scene[1].position=[20,0,0];await physicalVM.tick(1/60);assert.deepEqual(calls.slice(8),[['fixed-first',2],['fixed-second',2]]);
        fixedProof.push({batched,dimension,calls,properties:scene.map(o=>o.nativeProperties)});
      }finally{await physicalVM.stop();services.dispose();}
    }
  }
}finally{host.close();}
assert.deepEqual(proof[0].calls,proof[1].calls);assert.deepEqual(proof[0].properties,proof[1].properties);
assert.deepEqual(stayProof[0].calls,stayProof[1].calls);assert.deepEqual(stayProof[0].properties,stayProof[1].properties);
for(let i=0;i<2;i++){assert.deepEqual(fixedProof[i].calls,fixedProof[i+2].calls);assert.deepEqual(fixedProof[i].properties,fixedProof[i+2].properties);}

// Same callback-free workload before/after the patch. This is dispatch CPU cost,
// not physical collision simulation, render cost, mobile speed or whole-game FPS.
const objects=Array.from({length:512},(_,i)=>object('o'+i)),empty=createAsset('blueprint','BP_NoContactEvents');empty.nodes=[];empty.edges=[];
const contacts=Array.from({length:64},(_,i)=>pair('o'+i,'o'+(i+1))),vm=new BlueprintRuntime(objects,objects.map(o=>({root:empty,self:o.id})),{contacts:()=>contacts});await vm.start();
for(let i=0;i<10;i++)await vm.collisions();const samples=[];for(let batch=0;batch<5;batch++){const started=performance.now();for(let i=0;i<60;i++)await vm.collisions();samples.push((performance.now()-started)/60);}assert.equal(vm.overlaps.size,128);await vm.stop();
const runtime=await fs.readFile(new URL('../prototype/blueprint-runtime.js',import.meta.url)),result={passed:true,proof,stayProof,fixedProof,bindings:512,contacts:64,framesPerBatch:60,dispatchMs:samples,medianMs:[...samples].sort((a,b)=>a-b)[2],runtimeSHA256:createHash('sha256').update(runtime).digest('hex')};
const out=await fs.mkdtemp(path.join(path.resolve(import.meta.dirname,'../native/build'),'collision-dispatch-'));await fs.writeFile(path.join(out,'acceptance.json'),JSON.stringify(result,null,2));console.log('충돌 BP→실제 C++ 순서·정방향/역방향·Enter/Exit·핀 필터·배치 동일성 PASS: '+out);console.log(JSON.stringify({medianMs:result.medianMs,samples}));
