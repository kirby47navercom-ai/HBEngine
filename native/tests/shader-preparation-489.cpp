#include <HBEngine/ShaderBytecodeCompiler.hpp>
#include <HBEngine/ShaderPreparationQueue.hpp>
#include <nlohmann/json.hpp>
#include <cassert>
#include <future>
#include <iostream>
using namespace std::chrono_literals;
using namespace hb::gpu;
using Json=nlohmann::json;
const std::string shader="RWStructuredBuffer<float> result:register(u0);[numthreads(1,1,1)]void Main(uint3 id:SV_DispatchThreadID){result[0]=7;}";
template<class F> void until(F predicate){const auto end=std::chrono::steady_clock::now()+5s;while(!predicate()){if(std::chrono::steady_clock::now()>end)throw std::runtime_error("Preparation timeout");std::this_thread::sleep_for(1ms);}}
int main(int argc,char** argv){try{
 if(argc!=2)throw std::runtime_error("private directory required");
 const auto root=std::filesystem::absolute(argv[1]);detail::ShaderBytecodeCompiler::configure(root/"A");
 std::promise<void> entered,release;const auto gate=release.get_future().share();auto at=entered.get_future();
 auto compilation=std::async(std::launch::async,[&]{return detail::ShaderBytecodeCompiler::create(shader,"PreparationLock489","Main","cs_5_0",[&](const void*,std::size_t){entered.set_value();gate.wait();return S_OK;});});
 at.get();auto inspect=std::async(std::launch::async,[]{return detail::ShaderBytecodeCompiler::info();});
 const bool inspectionReady=inspect.wait_for(500ms)==std::future_status::ready;
 std::future<void> configure;
#ifndef HB_BASELINE_489
 configure=std::async(std::launch::async,[&]{detail::ShaderBytecodeCompiler::configure(root/"B");});
 const bool configureReady=configure.wait_for(500ms)==std::future_status::ready;
#else
#endif
 release.set_value();const auto compiled=compilation.get();inspect.get();if(configure.valid())configure.get();
#ifdef HB_BASELINE_489
 assert(!inspectionReady);std::cout<<Json({{"passed",true},{"inspectionReadyWhileCreateBlocked",inspectionReady},{"baseline",true}});return 0;
#else
 assert(inspectionReady&&configureReady&&compiled.compiled&&!compiled.code.empty());
 assert(detail::ShaderBytecodeCompiler::info()[2]==0); // old job must not write into new root B
 const auto fresh=detail::ShaderBytecodeCompiler::create(shader,"PreparationLock489","Main","cs_5_0",[](const void*,std::size_t){return S_OK;});
 assert(fresh.compiled&&detail::ShaderBytecodeCompiler::info()[2]==1);
 using Queue=detail::ShaderPreparationQueue;Queue queue(1024,50ms);
 std::promise<void> workerEntered,workerRelease;auto workerGate=workerRelease.get_future().share();auto workerAt=workerEntered.get_future();
 auto first=queue.submit("same",400,[&]{workerEntered.set_value();workerGate.wait();return std::vector<unsigned char>{1,2};});workerAt.get();
 auto duplicate=queue.submit("same",400,[]{return std::vector<unsigned char>{9};});assert(first==duplicate);
 auto abandoned=queue.submit("abandoned",400,[]{throw std::runtime_error("must never execute");return std::vector<unsigned char>{};});abandoned.reset();assert(queue.info().cancelled==1);
 auto full=queue.submit("capacity",800,[]{return std::vector<unsigned char>{};});assert(!full);
 bool oversized=false;try{queue.submit("oversized",1025,[]{return std::vector<unsigned char>{};});}catch(const std::runtime_error&){oversized=true;}assert(oversized);
 workerRelease.set_value();until([&]{return first->status.load()==Queue::Status::ready;});assert(first->code==std::vector<unsigned char>({1,2}));
 auto error=queue.submit("error",100,[]()->std::vector<unsigned char>{throw std::runtime_error("expected failure");});until([&]{return error->status.load()==Queue::Status::failed;});assert(error->error=="expected failure");
 auto actual=queue.submit("actual",400,[]{return detail::ShaderBytecodeCompiler::create(shader,"QueueActual489","Main","cs_5_0",[](const void*,std::size_t){return S_OK;}).code;});until([&]{return actual->status.load()==Queue::Status::ready;});assert(!actual->code.empty());
 until([&]{return !queue.info().worker;});const auto before=queue.info();assert(before.bytes==0&&!before.active&&before.queued==0&&before.workersStarted==1);
 auto restart=queue.submit("restart",100,[]{return std::vector<unsigned char>{3};});until([&]{return restart->status.load()==Queue::Status::ready;});until([&]{return !queue.info().worker;});
 const auto info=queue.info();assert(info.workersStarted==2&&info.completed==3&&info.failed==1&&info.cancelled==1&&info.deduplicated==1&&info.bytes==0);
 std::cout<<Json({{"passed",true},{"inspectionReadyWhileCreateBlocked",inspectionReady},{"configureReadyWhileCreateBlocked",configureReady},{"oldGenerationNotWrittenToNewRoot",true},{"actualFXCWorker",true},{"deduplicated",info.deduplicated},{"cancelled",info.cancelled},{"completed",info.completed},{"failed",info.failed},{"workerRestartCount",info.workersStarted},{"idleWorkers",0},{"retainedQueueBytes",info.bytes},{"budget",info.budget}});
#endif
}catch(const std::exception& e){std::cerr<<e.what();return 1;}}
