#include <HBEngine/ShaderBytecodeCompiler.hpp>
#include <HBEngine/ScreenEffectsPass.hpp>
#include <nlohmann/json.hpp>
#include <cassert>
#include <future>
#include <iostream>
#include <type_traits>
using namespace hb::gpu;using Json=nlohmann::json;
static_assert(!std::is_copy_constructible_v<KernelPreparation>&&std::is_move_constructible_v<KernelPreparation>);
#if defined(_WIN32) && !defined(HB_COMPUTE_UNAVAILABLE)
using namespace std::chrono_literals;
template<class F>void until(F fn){const auto end=std::chrono::steady_clock::now()+20s;while(!fn()){if(std::chrono::steady_clock::now()>end)throw std::runtime_error("compute607 timeout");std::this_thread::sleep_for(1ms);}}
struct Hold{std::promise<void> entered,release;std::shared_ptr<detail::ShaderPreparationQueue::Job> job;bool open=false;Hold(){auto gate=release.get_future().share();auto e=entered.get_future();job=detail::sharedShaderPreparationQueue().submit("Compute607Hold",128,[this,gate]{entered.set_value();gate.wait();return std::vector<unsigned char>{};});e.get();}void resume(){if(!open){open=true;release.set_value();}}~Hold(){resume();}};
const std::string source="RWStructuredBuffer<float> values:register(u0);cbuffer Params:register(b0){float scale,bias;float2 pad;}[numthreads(4,1,1)]void Main(uint3 id:SV_DispatchThreadID){values[id.x]=values[id.x]*scale+bias;}";
int main(int argc,char** argv){try{
 if(argc!=3)throw std::runtime_error("private cache/mode required");
 const std::string mode=argv[2];Device gpu,other;
 if(mode=="exit-active"){
  auto job=detail::sharedShaderPreparationQueue().submit("Compute607Exit",256,[]{std::this_thread::sleep_for(20ms);auto& screen=detail::screenShaderCompilerState();{std::lock_guard<std::mutex> lock(screen.mutex);assert(screen.cache.budget()==8388608);}return detail::ShaderBytecodeCompiler::create(source,"HBCompute","Main","cs_5_0",[](const void*,std::size_t){return S_OK;}).code;});until([&]{return job->status.load(std::memory_order_acquire)==detail::ShaderPreparationQueue::Status::compiling;});std::cout<<Json{{"passed",true},{"activeAtMainReturn",true}};return 0;
 }
 if(mode!="unconfigured")Device::configureShaderCache(argv[1]);
 auto baseline=gpu.compile(source+"\n// synchronous baseline");auto baselineBuffer=gpu.create({1,2,3,4});gpu.dispatch(baseline,{&baselineBuffer},1,1,1,{}, {2,1});assert(gpu.read(baselineBuffer)==std::vector<float>({3,5,7,9}));
 if(mode=="poison"){const std::string v="float4 Main(float4 p:POSITION):SV_Position{return p;}";detail::Com<ID3DBlob> code,error;const auto compile=detail::libraries().symbol<decltype(&D3DCompile)>(detail::libraries().compiler,"D3DCompile");detail::check(compile(v.data(),v.size(),"Poison607",nullptr,nullptr,"Main","vs_5_0",detail::ShaderBytecodeCompiler::flags,0,&code.p,&error.p),"poison607");const auto* bytes=static_cast<const unsigned char*>(code->GetBufferPointer());ShaderBytecodeDiskCache disk(argv[1]);assert(disk.put(detail::ShaderBytecodeCompiler::key(source,"HBCompute","Main","cs_5_0"),{bytes,bytes+code->GetBufferSize()}));}
 KernelPreparation request,otherRequest;std::uint64_t submitMS=0;{
  Hold hold;const auto start=GetTickCount64();auto initial=gpu.compileAsync(source);request=std::move(initial);otherRequest=other.compileAsync(source);submitMS=GetTickCount64()-start;assert(initial.info().state=="unused"&&!initial.ready());assert(request.info().pending&&!request.ready());assert(&detail::sharedShaderPreparationQueue()==&ScreenEffectsPass::sharedPreparationQueue());assert(detail::sharedShaderPreparationQueue().info().queued==1);
  bool foreign=false,premature=false;try{other.pollKernel(request);}catch(...){foreign=true;}try{request.take();}catch(...){premature=true;}assert(foreign&&premature);auto cancelled=gpu.compileAsync(source+"\n// cancelled");cancelled.cancel();assert(cancelled.info().state=="cancelled");assert(detail::sharedShaderPreparationQueue().info().queued==1);
  {std::optional<KernelPreparation> orphan;{Device temporary;orphan.emplace(temporary.compileAsync(source+"\n// abandoned device"));}orphan->cancel();}assert(detail::sharedShaderPreparationQueue().info().queued==1);
  gpu.upload(baselineBuffer,{4,3,2,1});gpu.dispatch(baseline,{&baselineBuffer},1,1,1,{}, {2,1});assert(gpu.read(baselineBuffer)==std::vector<float>({9,7,5,3}));hold.resume();until([&]{const bool a=gpu.pollKernel(request),b=other.pollKernel(otherRequest);return a&&b;});
 }
 assert(request.ready()&&request.info().state=="ready");auto kernel=request.take(),otherKernel=otherRequest.take();assert(request.info().state=="taken"&&!request.ready());bool consumed=false;try{gpu.pollKernel(request);}catch(...){consumed=true;}assert(consumed);
 auto buffer=gpu.create({1,2,3,4}),otherBuffer=other.create({1,2,3,4});gpu.dispatch(kernel,{&buffer},1,1,1,{}, {2,1});other.dispatch(otherKernel,{&otherBuffer},1,1,1,{}, {2,1});assert(gpu.read(buffer)==std::vector<float>({3,5,7,9}));assert(other.read(otherBuffer)==gpu.read(buffer));bool foreignDispatch=false;try{other.dispatch(kernel,{&otherBuffer},1);}catch(...){foreignDispatch=true;}assert(foreignDispatch);
 const auto stable=Device::shaderDiskCacheInfo();std::vector<float> expected{3,5,7,9};for(unsigned i=0;i<8;i++){gpu.dispatch(kernel,{&buffer},1,1,1,{}, {2,1});for(auto& value:expected)value=value*2+1;}assert(gpu.read(buffer)==expected);assert(kernel.constantBufferAllocations()==3);assert(Device::shaderDiskCacheInfo()==stable);
 auto frames=gpu.createFrameResources(buffer);for(unsigned i=0;i<3;i++)assert(gpu.enqueueFrame(frames,buffer));assert(!gpu.enqueueFrame(frames,buffer));for(unsigned i=0;i<3;i++){std::optional<FrameResult> result;until([&]{result=gpu.pollFrame(frames);return result.has_value();});assert(result->values==expected&&result->sequence==i+1);}assert(frames.pending()==0);
 auto bad=gpu.compileAsync("invalid shader607");bool failed=false;try{until([&]{return gpu.pollKernel(bad);});}catch(const std::exception& e){failed=std::string(e.what()).find("error")!=std::string::npos;}assert(failed&&bad.info().state=="failed"&&!bad.info().pending);
 // Length-prefixed entry names separate these otherwise identical queue keys.
 {Hold held;auto good=gpu.compileAsync("// comment:cached:\n"+source),invalidEntry=gpu.compileAsync("\n"+source,"Main:cached:// comment");assert(detail::sharedShaderPreparationQueue().info().queued==2);held.resume();until([&]{return gpu.pollKernel(good);});bool rejected=false;try{until([&]{return gpu.pollKernel(invalidEntry);});}catch(...){rejected=true;}assert(rejected&&invalidEntry.info().state=="failed");}
 bool invalid=false;try{gpu.compileAsync("");}catch(...){invalid=true;}assert(invalid);until([&]{auto q=detail::sharedShaderPreparationQueue().info();return !q.worker&&q.bytes==0;});const auto disk=Device::shaderDiskCacheInfo();if(mode=="warm")assert(disk[2]==0&&disk[0]>=2);if(mode=="poison")assert(disk[6]>=1);
 std::cout<<Json{{"passed",true},{"mode",mode},{"submitMS",submitMS},{"result",expected},{"sharedSingleQueue",true},{"sourceDeduplication",true},{"entryDelimiterCollisionRejected",true},{"moveAndCancellation",true},{"ownerAdoption",true},{"foreignAndTakenRejected",true},{"dispatchDuringPreparation",true},{"dispatchCacheIO",0},{"frameResources",3},{"constantBuffers",3},{"compilerFailure",true},{"activeDeviceAbandonment",true},{"disk",disk},{"idleWorker",false},{"queueBytes",0}};
}catch(const std::exception& e){std::cerr<<e.what();return 1;}}
#else
int main(){assert(!Device::available());KernelPreparation p;assert(!p.ready()&&!p.info().pending);bool rejected=false;try{p.take();}catch(...){rejected=true;}assert(rejected);std::cout<<Json{{"passed",true},{"unavailableGuard",true},{"moveOnlyAPI",true}};}
#endif
