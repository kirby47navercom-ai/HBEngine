#include <HBEngine/SceneRender.hpp>
#include <nlohmann/json.hpp>
#include <cassert>
#include <future>
#include <iostream>
using namespace hb::gpu;using namespace std::chrono_literals;using Json=nlohmann::json;
template<class F>void until(F fn){const auto end=std::chrono::steady_clock::now()+20s;while(!fn()){if(std::chrono::steady_clock::now()>end)throw std::runtime_error("material preparation timeout");std::this_thread::sleep_for(1ms);}}
struct Blocker{
 std::promise<void> entered,release;std::shared_ptr<detail::ShaderPreparationQueue::Job> job;bool open=false;
 explicit Blocker(const std::string& key){auto gate=release.get_future().share();auto started=entered.get_future();job=ScreenEffectsPass::sharedPreparationQueue().submit(key,key.size()+128,[this,gate]{entered.set_value();gate.wait();return std::vector<unsigned char>{};});started.get();}
 void resume(){if(!open){open=true;release.set_value();}}
 ~Blocker(){resume();}
};
int main(){try{
 Device gpu;SceneRenderer renderer(gpu,16,16);const std::vector<SceneVertex> vertices={{{-1,-1,.4f}},{{1,-1,.4f}},{{1,1,.4f}},{{-1,1,.4f}}};auto mesh=renderer.createMesh(vertices,{0,1,2,0,2,3});SceneMaterial red;red.unlit=true;red.toneMapped=false;red.doubleSided=true;red.color={1,0,0,1};SceneFrame frame;const auto pixel=[&]{const auto b=renderer.readPixels();const unsigned at=(8*16+8)*4;return std::array<unsigned,4>{b[at],b[at+1],b[at+2],b[at+3]};};renderer.begin(frame);renderer.draw(mesh,identity,identity,red);assert(pixel()[0]>252);
 const std::string declarations="StructuredBuffer<float> hbParameters:register(t7);",evaluation="base=float4(0,hbParameters[0],0,1);emit=0;";Blocker blocker("ScenePreparation553");const auto start=GetTickCount64();auto initial=renderer.createProgramAsync(declarations,evaluation,{.2f});auto program=std::move(initial);const auto submitMS=GetTickCount64()-start;assert(!program.ready()&&program.preparationInfo().pending);renderer.setProgramParameters(program,{.9f});renderer.begin(frame);renderer.draw(mesh,identity,identity,red);renderer.draw(mesh,identity,identity,red,{}, {},0,0,&program);const auto during=pixel();assert(renderer.draws()==1&&during[0]>252&&during[1]<3);const auto queued=ScreenEffectsPass::sharedPreparationQueue().info();assert(queued.queued==2&&queued.worker&&queued.bytes<=queued.budget);blocker.resume();until([&]{return renderer.pollProgramPreparation(program);});assert(program.ready()&&!program.preparationInfo().pending);renderer.begin(frame);renderer.draw(mesh,identity,identity,red,{}, {},0,0,&program);const auto ready=pixel();assert(ready[0]<3&&ready[1]>240&&ready[2]<3);
 auto synchronous=renderer.createProgram(declarations,evaluation,{.9f});assert(synchronous.ready());renderer.begin(frame);renderer.draw(mesh,identity,identity,red,{}, {},0,0,&synchronous);assert(pixel()==ready);
 const auto cancelledBefore=ScreenEffectsPass::sharedPreparationQueue().info().cancelled;{Blocker hold("SceneCancellation553");{auto obsolete=renderer.createProgramAsync(declarations,evaluation,{.1f});assert(obsolete.preparationInfo().pending);}const auto q=ScreenEffectsPass::sharedPreparationQueue().info();assert(q.cancelled>=cancelledBefore+2&&q.queued==0);hold.resume();}
 auto bad=renderer.createProgramAsync("","base=missing553;",{});bool error=false;try{until([&]{return renderer.pollProgramPreparation(bad);});}catch(const std::exception& e){error=std::string(e.what()).find("missing553")!=std::string::npos;}assert(error&&!bad.preparationInfo().error.empty());
 // Exercise the asynchronous retry without asking the real driver to reject
 // valid bytecode: its first adoption failure forces a fresh worker compile.
 SceneProgramPreparation retry(SceneRenderer::materialProgramSource(declarations,evaluation));until([&]{retry.poll();return retry.bytecode(0)&&retry.bytecode(1);});retry.reject(0,E_FAIL);assert(retry.info().pending);until([&]{retry.poll();return retry.bytecode(0)!=nullptr;});retry.reject(0,E_FAIL);assert(!retry.info().pending&&!retry.info().error.empty());
 until([&]{const auto q=ScreenEffectsPass::sharedPreparationQueue().info();return !q.worker&&q.bytes==0;});const auto final=ScreenEffectsPass::sharedPreparationQueue().info();std::cout<<Json{{"passed",true},{"actualD3D11",true},{"submitMS",submitMS},{"pendingRaster",during},{"readyRaster",ready},{"syncIdentical",true},{"parameterWriteBeforeReadiness",true},{"moveOwnership",true},{"cancelled",final.cancelled},{"compilerFailure",error},{"workerStarts",final.workersStarted},{"idleWorker",final.worker},{"queueBytes",final.bytes},{"forcedRetryThenFailure",true}};
 }catch(const std::exception& e){std::cerr<<e.what();return 1;}}
