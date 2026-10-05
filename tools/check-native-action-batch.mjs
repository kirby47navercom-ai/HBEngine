import assert from 'node:assert/strict';
import {createAsset} from '../prototype/asset-documents.js';
import {makeNode,makeDefinition,graphContext} from '../prototype/blueprint-model.js';
import {parseNativeHeader} from '../prototype/native-model.js';
import {BlueprintRuntime} from '../prototype/blueprint-runtime.js';
import {NativeHost} from './native-host.mjs';
import {NativeProtocol} from '../prototype/native-protocol.js';
import {RuntimeInput} from '../prototype/runtime-input.js';

const actionPath='Assets/Action.hbia.json',contextPath='Assets/Keys.hbimc.json';
const header=`#include <HBEngine/Game.hpp>
HB_CLASS(Blueprintable) class ActionProbe : public hb::Actor { public:
 HB_PROPERTY(BlueprintReadWrite) int Count=0;
 HB_PROPERTY(BlueprintReadWrite) std::string OwnState;
 HB_PROPERTY(BlueprintReadWrite) std::string OtherState;
 HB_PROPERTY(BlueprintReadWrite) float OwnValue=0;
 HB_PROPERTY(BlueprintReadWrite) float OtherValue=0;
 HB_PROPERTY(BlueprintReadWrite) float OwnElapsed=0;
 HB_PROPERTY(BlueprintReadWrite) float OtherElapsed=0;
 HB_PROPERTY(BlueprintReadWrite) bool OwnEvent=false;
 HB_PROPERTY(BlueprintReadWrite) bool OtherEvent=false;
 HB_FUNCTION(BlueprintCallable) void Probe(hb::Actor* other,int amount);
 HB_FUNCTION(BlueprintCallable) void Think(int amount);
 HB_FUNCTION(BlueprintNativeEvent) virtual void Changed(int amount);
};`;
const source=`void ActionProbe::Probe(hb::Actor* other,int amount){
 Count+=amount;if(amount==-1)throw std::runtime_error("action failure");
 OwnState=hb::Input::GetActionState(this,"${actionPath}");OtherState=hb::Input::GetActionState(other,"${actionPath}");
 OwnValue=hb::Input::GetActionValue(this,"${actionPath}").x;OtherValue=hb::Input::GetActionValue(other,"${actionPath}").x;
 OwnElapsed=hb::Input::GetActionElapsed(this,"${actionPath}");OtherElapsed=hb::Input::GetActionElapsed(other,"${actionPath}");
 OwnEvent=hb::Input::HasActionEvent(this,"${actionPath}","triggered");OtherEvent=hb::Input::HasActionEvent(other,"${actionPath}","triggered");
 if(amount==-2)Changed(9);
}void ActionProbe::Think(int amount){Count+=amount;}void ActionProbe::Changed(int){}`;
const metadata={...parseNativeHeader(header),nativeBatch:1,nativeInputBatch:1};
const edge=(root,a,out,b,input='exec')=>root.edges.push({from:{node:a.id,pin:out},to:{node:b.id,pin:input}});
function graph(trigger='pressed',{wrapped=false,macro=false}={}){
 const root=createAsset('blueprint','BP_Actions');root.nodes=[];root.edges=[];root.construction={nodes:[],edges:[],comments:[]};root.settings.parentClass='ActionProbe';root.settings.inputMapping=contextPath;root.native={...metadata,header,source};root.variables=[{id:'amount',name:'Amount',type:'int',container:'single',value:2},{id:'other',name:'Other',type:'object',container:'single',value:null}];
 const event=makeNode('inputAction'),read=makeNode('getVariable'),other=makeNode('getVariable');event.options={action:actionPath};event.valueType='bool';read.variableId='amount';other.variableId='other';root.nodes.push(event,read,other);
 for(const pin of ['triggered','completed']){const a=makeNode('nativeCall'),b=makeNode('nativeCall');a.nativeId='ActionProbe.Probe';b.nativeId='ActionProbe.Think';root.nodes.push(a,b);edge(root,event,pin,a);edge(root,a,'then',b);edge(root,read,'value',a,'amount');edge(root,read,'value',b,'amount');edge(root,other,'value',a,'other');}
 if(wrapped){for(const pin of ['triggered','completed']){const first=root.nodes.find(n=>n.id===root.edges.find(e=>e.from.node===event.id&&e.from.pin===pin).to.node),last=root.nodes.find(n=>n.id===root.edges.find(e=>e.from.node===first.id&&e.from.pin==='then').to.node),definition=makeDefinition(root,macro?'macro':'function','Work_'+pin).definition,g=graphContext(root,definition.id),entry=g.nodes.find(n=>n.key.endsWith('Input')),exit=g.nodes.find(n=>n.key.endsWith('Output')),call=makeNode(macro?'callMacro':'callFunction');definition.inputs.push({id:'amount',label:'Amount',type:'int',array:false},{id:'other',label:'Other',type:'object',array:false});call.definitionId=definition.id;
  root.edges=root.edges.filter(e=>![first.id,last.id].includes(e.from.node)&&![first.id,last.id].includes(e.to.node));root.nodes=root.nodes.filter(n=>![first.id,last.id].includes(n.id));root.nodes.push(call);edge(root,event,pin,call);edge(root,read,'value',call,'amount');edge(root,other,'value',call,'other');g.edges.length=0;g.nodes.push(first,last);edge(g,entry,'exec',first);edge(g,first,'then',last);edge(g,last,'then',exit,'then');edge(g,entry,'amount',first,'amount');edge(g,entry,'amount',last,'amount');edge(g,entry,'other',first,'other');
 }}
 const changed=makeNode('nativeEvent'),write=makeNode('setVariable');changed.nativeId='ActionProbe.Changed';write.variableId='amount';root.nodes.push(changed,write);edge(root,changed,'then',write);edge(root,changed,'amount',write,'value');return root;
}
async function world(batched,host,{trigger='pressed',boundary=false,fail=false,empty=false,root=graph(trigger)}={}){
 const objects=Array.from({length:50},(_,i)=>({id:'actor_'+i,name:'Actor '+i,kind:'empty',position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],components:[],nativeClass:'ActionProbe',nativeProperties:{Count:0,OwnState:'',OtherState:'',OwnValue:0,OtherValue:0,OwnElapsed:0,OtherElapsed:0,OwnEvent:false,OtherEvent:false}})),packets=[],traces=[],seen=[];
 const build=host?await host.build(header,source):{token:'actions',metadata};build.metadata={...build.metadata,...(!batched?{nativeBatch:undefined}:{})};let vm;
 const native=async request=>{
  packets.push(structuredClone(request));let result;
  if(host)result=await host.call(build.token,{...request,objects,input:vm.inputSnapshot(),scopes:[...vm.scopes]});
  else{const snapshot=vm.inputSnapshot(),results=[],events=[];let error;
   for(const call of request.calls||[request]){for(const update of call.actionUpdates||[]){const index=snapshot.actions.findIndex(a=>a.owner===update.owner&&a.path===update.path);if(index<0)snapshot.actions.push(structuredClone(update));else snapshot.actions[index]=structuredClone(update);}
    const object=objects.find(o=>o.id===call.self),p=object.nativeProperties,amount=call.args.amount;if(amount===-1&&call.nativeId.endsWith('.Probe')){error='action failure';break;}p.Count+=amount;
    if(call.nativeId.endsWith('.Probe')){const own=snapshot.actions.find(a=>a.owner===object.id&&a.path===actionPath),other=snapshot.actions.find(a=>a.owner===call.args.other&&a.path===actionPath);p.OwnState=own?.state||'none';p.OtherState=other?.state||'none';p.OwnValue=Number(own?.value||0);p.OtherValue=Number(other?.value||0);p.OwnElapsed=Math.fround(own?.elapsed||0);p.OtherElapsed=Math.fround(other?.elapsed||0);p.OwnEvent=own?.events.includes('triggered')||false;p.OtherEvent=other?.events.includes('triggered')||false;}
    results.push({outputs:{}});if(amount===-2&&call.nativeId.endsWith('.Probe')){events.push({nativeId:'ActionProbe.Changed',target:object.id,args:{amount:9}});break;}
   }if(error&&!request.calls)throw Error(error);result={objects:[],events,operations:[],results,outputs:results[0]?.outputs,...(error?{nativeError:error}:{})};
  }
  for(const state of result.objects)Object.assign(objects.find(o=>o.id===state.id),state);return result;
 };
 const actions=new Map([[actionPath,{name:'Action',valueType:'bool',trigger,holdTime:.03,oneShot:true,deadZone:0,consumeInput:false}]]),contexts=new Map([[contextPath,{priority:0,mappings:[{action:actionPath,key:'E',axis:0,scale:1}]}]]);
 vm=new BlueprintRuntime(objects,objects.map(o=>({root,self:o.id})),{native,nativeBuild:()=>build,inputAssets:{actions,contexts},trace:(n,f)=>{traces.push([n.id,f.b.self,vm.depth,f.scope]);if(n.key==='nativeCall')seen.push([f.b.self,structuredClone(f.args)]);if(boundary&&n.key==='setVariable'){assert.equal(vm.bindings[1].input.keys.get('e'),undefined,'future keys stay at their original event boundary');for(const b of vm.bindings.slice(1))b.variables.set('amount',17);vm.bindings[1].input.removeContext(contextPath);}}});
 await vm.start();for(const [i,b] of vm.bindings.entries()){b.variables.set('other','actor_'+(i<49?i+1:0));if(empty&&i===0)b.root.edges=b.root.edges.filter(e=>e.from.node!==b.root.nodes.find(n=>n.key==='inputAction').id);}if(boundary)vm.bindings[0].variables.set('amount',-2);if(fail)vm.bindings[1].variables.set('amount',-1);return {vm,objects,packets,traces,seen};
}
const state=w=>w.vm.bindings.map(b=>({keys:[...b.input.keys],previous:[...b.input.previous],states:[...b.input.states],events:[...b.input.events].map(([p,s])=>[p,[...s]]),time:b.input.time,variables:[...b.variables]}));
async function run(host,options={}){
 const settings={...options,root:graph(options.trigger||'pressed',options)},old=await world(false,host,settings),next=await world(true,host,settings);
 if(options.fail){await assert.rejects(old.vm.input('E'),/action failure/);await assert.rejects(next.vm.input('E'),/action failure/);assert.equal(next.objects[0].nativeProperties.Count,4);assert.equal(next.objects[1].nativeProperties.Count,0);assert.equal(next.vm.bindings[2].input.keys.get('e'),undefined);assert.equal(next.packets.length,1);}
 else{await old.vm.input('E');await next.vm.input('E');
  if(options.trigger==='hold'){for(let i=0;i<3;i++){await old.vm.tick(.01);await next.vm.tick(.01);}assert.equal(next.packets.length,1);assert.equal(next.packets[0].calls.length,100);assert.equal(next.objects[0].nativeProperties.OwnState,'triggered');assert.equal(next.objects[0].nativeProperties.OtherState,'ongoing');assert.equal(next.objects[0].nativeProperties.OtherElapsed,Math.fround(.02));}
  else if(options.boundary){assert.equal(next.objects[0].nativeProperties.Count,options.wrapped?-4:7);assert.equal(next.objects[1].nativeProperties.Count,0);assert.ok(next.objects.slice(2).every(o=>o.nativeProperties.Count===34));assert.ok(next.packets.length<old.packets.length);}
  else{assert.equal(next.packets.length,1);assert.equal(next.packets[0].calls.length,options.empty?98:100);assert.equal(next.objects[options.empty?1:0].nativeProperties.OwnState,'triggered');assert.equal(next.objects[options.empty?1:0].nativeProperties.OtherState,'none');assert.equal(next.objects[49].nativeProperties.OtherState,'triggered','earlier action state, including a no-call owner, is visible');old.packets.length=next.packets.length=0;await old.vm.input('E',0);await next.vm.input('E',0);assert.equal(next.packets.length,1);assert.equal(next.objects[options.empty?1:0].nativeProperties.OtherState,'triggered');}
 }
 assert.deepEqual(next.objects,old.objects);assert.deepEqual(next.traces,old.traces);assert.deepEqual(next.seen,old.seen);assert.deepEqual([...next.vm.values],[...old.vm.values]);assert.deepEqual(state(next),state(old));assert.equal(next.vm.depth,0);await old.vm.stop();await next.vm.stop();
}
const cases=[{}, {trigger:'hold'}, {boundary:true}, {fail:true}, {empty:true}, {wrapped:true}, {wrapped:true,boundary:true}, {wrapped:true,macro:true}, {wrapped:true,macro:true,trigger:'hold'}, {wrapped:true,macro:true,boundary:true}];for(const options of cases)await run(null,options);
const legacyOld=await world(false,null),legacyNext=await world(true,null);legacyNext.vm.hooks.nativeBuild().metadata.nativeInputBatch=undefined;await legacyOld.vm.input('E');await legacyNext.vm.input('E');assert.equal(legacyNext.packets.length,50,'old workers retain one safe per-owner action packet');assert.deepEqual(legacyNext.objects,legacyOld.objects);await legacyOld.vm.stop();await legacyNext.vm.stop();


for(const batched of [false,true]){const w=await world(batched,null),root=w.vm.bindings[0].root,bad=makeNode('inputAction'),call=makeNode('nativeCall');bad.options={action:actionPath};bad.valueType='float';call.nativeId='ActionProbe.Think';call.inputValues={amount:2};const first=root.nodes.find(n=>n.key==='inputAction'),early=makeNode('nativeCall');early.nativeId='ActionProbe.Think';early.inputValues={amount:4};root.nodes.push(bad,call,early);edge(root,first,'started',early);edge(root,bad,'triggered',call);await assert.rejects(w.vm.input('E'),/자료형 불일치/);assert.equal(w.objects[0].nativeProperties.Count,4,'later invalid action retains the earlier native prefix');await w.vm.stop();}

const protocol=new NativeProtocol(),objects=[{id:'actor',position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]}],input=new RuntimeInput().snapshot(),call={key:'nativeCall',nativeId:'ActionProbe.Think',args:{target:'actor',amount:2},self:'actor',scope:'',overrides:[]},update={owner:'actor',path:actionPath,value:true,state:'triggered',elapsed:0,events:['started','triggered']},request={calls:[{...call,actionUpdates:[update]}],objects,input};
protocol.validate({metadata},request);
for(const updates of [[{...update,owner:'missing'}],[{...update,value:2}],[update,update],[{...update,elapsed:-1}],[{...update,events:['wrong']}],[{...update,path:'x'.repeat(1001)}]])assert.throws(()=>protocol.validate({metadata},{...request,calls:[{...call,actionUpdates:updates}]}));
assert.throws(()=>protocol.validate({metadata},{...request,input:{...input,actions:Array.from({length:4096},(_,i)=>({...update,path:'path_'+i}))}}));
assert.throws(()=>protocol.validate({metadata:{...metadata,nativeInputBatch:undefined}},request));assert.throws(()=>protocol.validate({metadata},{...call,objects,input,actionUpdates:[update]}));
if(process.argv.includes('--cpp')){const host=new NativeHost();try{for(const options of cases)await run(host,options);}finally{host.close();}}
console.log('Input Action native batches: 50 owners/100 calls→1, ordered own/future states/elapsed/events, empty owner, release/hold/callback/failure and protocol rejection passed');
