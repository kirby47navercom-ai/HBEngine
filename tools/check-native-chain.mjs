import assert from 'node:assert/strict';
import {createAsset} from '../prototype/asset-documents.js';
import {makeNode,makeDefinition,graphContext} from '../prototype/blueprint-model.js';
import {parseNativeHeader} from '../prototype/native-model.js';
import {BlueprintRuntime} from '../prototype/blueprint-runtime.js';
import {NativeHost} from './native-host.mjs';
const header=`#include <HBEngine/Game.hpp>
HB_CLASS(Blueprintable) class ChainStats : public hb::Actor { public:
 HB_PROPERTY(BlueprintReadWrite) int Count=0;
 HB_FUNCTION(BlueprintCallable) int Think(int value);
 HB_FUNCTION(BlueprintNativeEvent) virtual void Changed(int value);
};`;
const source=`int ChainStats::Think(int value){Count+=value;if(value==-1)throw std::runtime_error("chain failure");if(value==-2)Changed(9);return value;}void ChainStats::Changed(int){}`;
const metadata={...parseNativeHeader(header),nativeBatch:1},edge=(g,a,out,b,input='exec')=>g.edges.push({from:{node:a.id,pin:out},to:{node:b.id,pin:input}});
function graph(phase='customEvent',count=50,{wrapped=false,boundary=false,fail=false,dependency=false}={}){
 const root=createAsset('blueprint','BP_Chain');root.nodes=[];root.edges=[];root.construction={nodes:[],edges:[],comments:[]};root.settings.parentClass='ChainStats';root.native={...metadata,header,source};root.variables=[{id:'amount',name:'Amount',type:'int',container:'single',value:2}];
 const event=makeNode(phase);if(phase==='nativeEvent')event.nativeId='ChainStats.Changed';event.options={eventName:'Chain',key:'E'};root.nodes.push(event);let g=root,entry=event,outputPin='then';if(phase==='construction'){root.nodes=[];root.construction.nodes.push(event);g=graphContext(root,'construction');}
 if(wrapped){const d=makeDefinition(root,'function','Work').definition;g=graphContext(root,d.id);g.edges.length=0;entry=g.nodes.find(n=>n.key==='functionInput');outputPin='exec';const call=makeNode('callFunction');call.definitionId=d.id;root.nodes.push(call);edge(root,event,'then',call);}
 const read=makeNode('getVariable');read.variableId='amount';g.nodes.push(read);let previous=entry;const calls=[];
 for(let i=0;i<count;i++){const n=makeNode('nativeCall');n.nativeId='ChainStats.Think';n.inputValues={value:fail&&i===2?-1:boundary&&i===0?-2:2};g.nodes.push(n);edge(g,previous,previous===entry?outputPin:'then',n);if(!fail&&!boundary||boundary&&i>0)edge(g,read,'value',n,'value');calls.push(n);previous=n;}
 if(wrapped){const exit=g.nodes.find(n=>n.key==='functionOutput');edge(g,previous,'then',exit,'then');}
 if(boundary){const changed=makeNode('nativeEvent');changed.nativeId='ChainStats.Changed';const write=makeNode('setVariable');write.variableId='amount';root.nodes.push(changed,write);edge(root,changed,'then',write);edge(root,changed,'value',write,'value');}
 if(dependency){const readCount=makeNode('nativeGet');readCount.nativeId='ChainStats.Count';g.nodes.push(readCount);g.edges=g.edges.filter(e=>!(e.to.node===calls[1].id&&e.to.pin==='value'));edge(g,readCount,'value',calls[1],'value');if(wrapped)root.functions[0].graph.edges=g.edges;}
 return root;
}
async function world(root,batched,host,instances=1){
 const object={id:'actor',name:'actor',kind:'empty',position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],components:[],nativeClass:'ChainStats',nativeProperties:{Count:0}},objects=Array.from({length:instances},(_,i)=>({...structuredClone(object),id:instances===1?'actor':'actor_'+i})),packets=[],traces=[],build=host?await host.build(header,source):{token:'chain',metadata};build.metadata={...build.metadata,...(!batched?{nativeBatch:undefined}:{})};
 const native=async request=>{packets.push(structuredClone(request));let result;
 if(host)result=await host.call(build.token,{...request,objects,scopes:['work']});
 else{const calls=request.calls||[request],results=[],events=[];let error;for(const call of calls){if(call.key==='nativeGet'){results.push({outputs:{value:object.nativeProperties.Count}});continue;}const target=objects.find(o=>o.id===call.self),value=call.args.value;if(value===-1){error='chain failure';break;}target.nativeProperties.Count+=value;results.push({outputs:{result:value}});if(value===-2){events.push({nativeId:'ChainStats.Changed',target:target.id,args:{value:9}});break;}}if(error&&!request.calls)throw Error(error);result={results,outputs:results[0]?.outputs,objects:[],events,operations:[],...(error?{nativeError:error}:{})};}
 for(const state of result.objects)Object.assign(objects.find(o=>o.id===state.id),state);return result;};
 const vm=new BlueprintRuntime(objects,objects.map(o=>({root,self:o.id})),{native,nativeBuild:()=>build,trace:n=>traces.push(n.id)});await vm.start();vm.beginScope('work');return {vm,object:objects[0],objects,packets,traces};
}
async function run(phase,options={},host){const root=graph(phase,options.count||50,options),old=await world(root,false,host),next=await world(root,true,host);
 if(phase==='construction'){old.packets.length=next.packets.length=old.traces.length=next.traces.length=0;}
 const trigger=async w=>phase==='input'?w.vm.input('E'):phase==='construction'?w.vm.emit(w.vm.bindings[0],phase,{},graphContext(w.vm.bindings[0].root,'construction'),()=>true,'then','work'):w.vm.emit(w.vm.bindings[0],phase,{},w.vm.bindings[0].root,()=>true,'then','work');
 await trigger(old);await trigger(next);assert.deepEqual(next.object,old.object);assert.deepEqual(next.traces,old.traces);assert.deepEqual([...next.vm.values],[...old.vm.values]);assert.deepEqual([...next.vm.bindings[0].variables],[...old.vm.bindings[0].variables]);
 const expected=options.dependency?3:options.boundary?2:1;assert.equal(next.packets.length,expected);if(!options.dependency)assert.equal(next.packets[0].calls.length,options.count||50);if(phase!=='input')assert.ok(next.packets.flatMap(p=>p.calls||[p]).every(c=>c.scope==='work'));await old.vm.stop();await next.vm.stop();}
for(const phase of ['customEvent','input','inputAxis','beginOverlap','endOverlap','hitEvent','anyDamage','nativeEvent','construction','endPlay']){await run(phase);}
await run('customEvent',{wrapped:true});await run('customEvent',{boundary:true});await run('customEvent',{count:2,dependency:true});
for(const batched of [false,true]){const w=await world(graph('customEvent',5,{fail:true}),batched);await assert.rejects(w.vm.custom(w.vm.bindings[0],'Chain'),/chain failure/);assert.equal(w.object.nativeProperties.Count,4);assert.equal(w.packets.length,batched?1:3);assert.equal(w.traces.length,3);await w.vm.stop();}
for(const batched of [false,true]){const root=graph('customEvent',5);root.nodes.filter(n=>n.key==='nativeCall')[2].breakpoint=true;const w=await world(root,batched);let stops=0;w.vm.hooks.breakpoint=()=>{stops++;w.vm.continue();};await w.vm.custom(w.vm.bindings[0],'Chain');assert.equal(stops,1);assert.equal(w.object.nativeProperties.Count,10);assert.equal(w.packets.length,batched?3:5);assert.equal(w.traces.length,5);await w.vm.stop();}
async function manyActors(host){const root=graph('tick',2),old=await world(root,false,host,50),next=await world(root,true,host,50);await old.vm.tick(1/60);await next.vm.tick(1/60);assert.deepEqual(next.objects,old.objects);assert.deepEqual(next.traces,old.traces);assert.equal(old.packets.length,100);assert.equal(next.packets.length,1);assert.equal(next.packets[0].calls.length,100);assert.ok(next.objects.every(o=>o.nativeProperties.Count===4));await old.vm.stop();await next.vm.stop();}
await manyActors();
if(process.argv.includes('--cpp')){const host=new NativeHost();try{await manyActors(host);await run('customEvent',{},host);await run('customEvent',{wrapped:true},host);await run('customEvent',{boundary:true},host);await run('customEvent',{count:2,dependency:true},host);await run('construction',{},host);for(const batched of [false,true]){const w=await world(graph('customEvent',5,{fail:true}),batched,host);await assert.rejects(w.vm.custom(w.vm.bindings[0],'Chain'),/chain failure/);assert.equal(w.object.nativeProperties.Count,4);assert.equal(w.packets.length,batched?1:3);assert.equal(w.traces.length,3);await w.vm.stop();}}finally{host.close();}}
console.log('Native chains: input/collision/custom events and BP functions, 50→1 calls, equal values/order/trace/scope, output/event boundaries and no failed-call replay passed');
