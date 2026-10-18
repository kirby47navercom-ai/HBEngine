import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';import {createHash} from 'node:crypto';import {NativeHost} from './native-host.mjs';import {createAsset} from '../prototype/asset-documents.js';import {makeNode} from '../prototype/blueprint-model.js';import {BlueprintRuntime} from '../prototype/blueprint-runtime.js';import {activeInstalledVersions} from './install-editor.mjs';import {retainTestEvidence,pruneTestArtifacts} from './test-artifacts.mjs';
assert.deepEqual(await activeInstalledVersions('C:/Users/kirby/HBEngine'),[]);const work=await fs.mkdtemp(path.resolve('native/build/compute-async-runtime-609-'));retainTestEvidence(work);const arg=process.argv.indexOf('--sdk-root'),installed=arg>=0?await fs.realpath(process.argv[arg+1]):null,Host=installed?(await import(pathToFileURL(path.join(installed,'tools/native-host.mjs')))).NativeHost:NativeHost,host=new Host();let vm;
const header=`#pragma once
#include <HBEngine/Game.hpp>
#include <HBEngine/Compute.hpp>
HB_CLASS(Blueprintable) class AsyncGpu609 : public hb::Actor {
public:
 HB_PROPERTY(BlueprintReadWrite) bool verified=false;
 HB_PROPERTY(BlueprintReadWrite) bool pendingSeen=false;
 HB_PROPERTY(BlueprintReadWrite) bool released=false;
 HB_PROPERTY(BlueprintReadWrite) int ticks=0;
 HB_PROPERTY(BlueprintReadWrite) float result=0;
 HB_FUNCTION(BlueprintCallable) void Begin();
 HB_FUNCTION(BlueprintCallable) void Poll();
 HB_FUNCTION(BlueprintCallable) void Cleanup();
private:
 std::unique_ptr<hb::gpu::Device> gpu;
 std::optional<hb::gpu::KernelPreparation> request;
 std::optional<hb::gpu::Kernel> kernel;
 std::optional<hb::gpu::Buffer> values;
 std::optional<hb::gpu::FrameResources> frames;
 std::shared_ptr<hb::gpu::detail::ShaderPreparationQueue::Job> hold;
};`;
const source=`void AsyncGpu609::Begin(){
 Cleanup();verified=false;pendingSeen=false;released=false;ticks=0;result=0;gpu=std::make_unique<hb::gpu::Device>();
 // Owned deterministic fixture gate, not a delay inserted into the engine.
 hold=hb::gpu::detail::sharedShaderPreparationQueue().submit("Runtime609Hold",128,[]{std::this_thread::sleep_for(std::chrono::milliseconds(100));return std::vector<unsigned char>{};});
 request.emplace(gpu->compileAsync("RWStructuredBuffer<float> values:register(u0);[numthreads(4,1,1)]void Main(uint3 id:SV_DispatchThreadID){values[id.x]=values[id.x]*2+1;}"));
}
void AsyncGpu609::Poll(){
 ++ticks;if(verified)return;
 if(request){if(!gpu->pollKernel(*request)){pendingSeen=true;return;}kernel.emplace(request->take());request.reset();hold.reset();values.emplace(gpu->create({1,2,3,4}));gpu->dispatch(*kernel,{&*values},1);frames.emplace(gpu->createFrameResources(*values));if(!gpu->enqueueFrame(*frames,*values))throw std::runtime_error("fixture frame enqueue");return;}
 if(frames){if(auto done=gpu->pollFrame(*frames)){verified=done->values==std::vector<float>({3,5,7,9});result=done->values.at(3);}}
}
void AsyncGpu609::Cleanup(){if(request)request->cancel();request.reset();hold.reset();frames.reset();values.reset();kernel.reset();gpu.reset();released=true;}`;
try{
 await fs.writeFile(path.join(work,'User.hpp'),header);await fs.writeFile(path.join(work,'User.cpp'),source);const built=await host.build(header,source,{configuration:'development'}),bp=createAsset('blueprint','BP_AsyncGpu609');bp.native={...built.metadata,header,source};bp.settings.parentClass='AsyncGpu609';const begin=makeNode('beginPlay'),tick=makeNode('tick'),end=makeNode('endPlay'),start=makeNode('nativeCall'),poll=makeNode('nativeCall'),clean=makeNode('nativeCall');start.nativeId='AsyncGpu609.Begin';poll.nativeId='AsyncGpu609.Poll';clean.nativeId='AsyncGpu609.Cleanup';bp.nodes=[begin,tick,end,start,poll,clean];bp.edges=[[begin,start],[tick,poll],[end,clean]].map(([a,b])=>({from:{node:a.id,pin:'then'},to:{node:b.id,pin:'exec'}}));await fs.writeFile(path.join(work,'BP_AsyncGpu609.json'),JSON.stringify(bp,null,2));
 const actor={id:'GPU609',kind:'empty',name:'GPU609',visible:true,position:[7,8,9],rotation:[0,0,0],scale:[1,1,1],components:[],nativeClass:'AsyncGpu609',nativeProperties:{verified:false,pendingSeen:false,released:false,ticks:0,result:0}},objects=[actor];let calls=0;vm=new BlueprintRuntime(objects,[{root:bp,self:actor.id}],{native:async request=>{calls++;const reply=await host.call(built.token,{...request,objects});for(const state of reply.objects)Object.assign(actor,state);return reply;}});await vm.start();const deadline=performance.now()+10000;while(!actor.nativeProperties.verified){assert(performance.now()<deadline);await vm.tick(1/60);await new Promise(resolve=>setTimeout(resolve,2));}assert(actor.nativeProperties.pendingSeen);assert.equal(actor.nativeProperties.result,9);assert(actor.nativeProperties.ticks>=2);assert.deepEqual(actor.position,[7,8,9]);const ticks=actor.nativeProperties.ticks;await vm.stop();assert(actor.nativeProperties.released);await host.release(built.token);
 const proof={passed:true,installedDirectory:installed,blueprintToCppToHardware:true,perActorGPUState:true,pendingObserved:true,ticks,calls,result:9,placedTransformPreserved:true,frameResourcesReadback:true,endPlayReleases:true,headerSHA256:createHash('sha256').update(header).digest('hex'),sourceSHA256:createHash('sha256').update(source).digest('hex'),scope:'Owned BP BeginPlay/Tick/EndPlay calls reflected C++ wrappers around compileAsync/poll/take and3-frame GPU readback. No private draw loop or user project/profile;100ms worker gate only in fixture to observe pending. No FPS claim.'};await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify(proof,null,2));console.log(JSON.stringify({work,...proof}));
}catch(error){await fs.writeFile(path.join(work,'failure.json'),JSON.stringify({error:error.stack},null,2));throw error;}finally{await vm?.stop().catch(()=>{});await host.close();await pruneTestArtifacts(work);}
