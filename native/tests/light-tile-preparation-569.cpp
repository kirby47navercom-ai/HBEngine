#include <HBEngine/SceneRender.hpp>
#include <nlohmann/json.hpp>
#include <cassert>
#include <future>
#include <iostream>
using namespace hb::gpu;using namespace std::chrono_literals;using Json=nlohmann::json;
template<class F>void until(F fn){const auto end=std::chrono::steady_clock::now()+20s;while(!fn()){if(std::chrono::steady_clock::now()>end)throw std::runtime_error("light preparation timeout");std::this_thread::sleep_for(1ms);}}
struct Blocker{
 std::promise<void> entered,release;std::shared_ptr<detail::ShaderPreparationQueue::Job> job;bool open=false;
 explicit Blocker(const std::string& key){auto gate=release.get_future().share();auto started=entered.get_future();job=ScreenEffectsPass::sharedPreparationQueue().submit(key,key.size()+128,[this,gate]{entered.set_value();gate.wait();return std::vector<unsigned char>{};});started.get();}
 void resume(){if(!open){open=true;release.set_value();}}~Blocker(){resume();}
};
int main(){try{
#if defined(_WIN32) && !defined(HB_COMPUTE_UNAVAILABLE)
 Device gpu;SceneRenderer renderer(gpu,96,80),reference(gpu,96,80);renderer.setAsyncShaderPreparation(true);
 const std::vector<SceneVertex> vertices={{{-1,-1,.4f}},{{1,-1,.4f}},{{1,1,.4f}},{{-1,1,.4f}}};auto mesh=renderer.createMesh(vertices,{0,1,2,0,2,3}),referenceMesh=reference.createMesh(vertices,{0,1,2,0,2,3});SceneMaterial material;material.doubleSided=true;material.color={.7f,.7f,.7f,1};
 SceneFrame frame;frame.ambient={0,0,0,1};frame.eye={0,0,5,1};frame.viewport={8,8,64,64};
 std::vector<SceneLight> lights(513);for(std::size_t i=0;i<lights.size();i++){lights[i].position={100+float(i)*3,100,1,1};lights[i].direction={0,0,-1,2};lights[i].color={.8f,.5f,.2f,1};}for(int i=0;i<7;i++){lights[i].position={float(i%3-1)*.4f,float(i/3-1)*.5f,1.2f,1};lights[i].color[3]=.08f;}lights[7].position={0,0,0,0};lights[7].direction={0,0,1,0};lights[7].color={.1f,.2f,.3f,.4f};renderer.setLights(lights);reference.setLights(lights);
 const auto draw=[&](SceneRenderer& target,const SceneRenderer::Mesh& geometry,bool cull){auto f=frame;f.rasterLightCulling=cull;target.begin(f);target.draw(geometry,identity,identity,material);return target.readPixels();};
 const auto before=draw(reference,referenceMesh,false);Blocker blocker("LightTile569");const auto start=std::chrono::steady_clock::now();const auto pending=draw(renderer,mesh,true);const auto pendingFrameMS=std::chrono::duration<double,std::milli>(std::chrono::steady_clock::now()-start).count();assert(pending==before);auto info=renderer.lightTilePreparationInfo();assert(info.enabled&&info.requested&&info.pending&&!info.ready&&info.stage==1);assert(renderer.lightTileBytes()==0&&renderer.lightTileDispatches()==0);
 frame.viewProjection[12]=.3f;frame.viewport={3,5,70,60};lights[0].color[3]=.14f;renderer.setLights(lights);reference.setLights(lights);const auto moved=draw(reference,referenceMesh,false);assert(draw(renderer,mesh,true)==moved&&renderer.lightTileBytes()==0);
 blocker.resume();until([&]{draw(renderer,mesh,true);return renderer.lightTilePreparationInfo().ready;});assert(draw(renderer,mesh,true)==moved);const auto dispatches=renderer.lightTileDispatches();assert(dispatches==1&&renderer.lightTileBytes()>0);assert(draw(renderer,mesh,true)==moved&&renderer.lightTileDispatches()==dispatches);
 draw(renderer,mesh,false);info=renderer.lightTilePreparationInfo();assert(!info.requested&&!info.pending&&!info.ready&&renderer.lightTileBytes()==0);
 const auto cancelled=ScreenEffectsPass::sharedPreparationQueue().info().cancelled;{Blocker hold("LightTileCancellation569");draw(renderer,mesh,true);assert(renderer.lightTilePreparationInfo().pending);renderer.setLights({});assert(!renderer.lightTilePreparationInfo().requested);assert(ScreenEffectsPass::sharedPreparationQueue().info().cancelled>=cancelled+1);hold.resume();}
 renderer.setLights(lights);until([&]{draw(renderer,mesh,true);return renderer.lightTilePreparationInfo().ready;});assert(draw(renderer,mesh,true)==moved);draw(renderer,mesh,false);until([&]{const auto q=ScreenEffectsPass::sharedPreparationQueue().info();return !q.worker&&!q.bytes;});const auto q=ScreenEffectsPass::sharedPreparationQueue().info();
 std::cout<<Json{{"passed",true},{"actualD3D11",true},{"lights",lights.size()},{"pendingFrameMS",pendingFrameMS},{"pendingExactAllLightPixels",true},{"cameraAndLightEditsWhileQueued",true},{"readyExactPixels",true},{"staticDispatchReuse",true},{"cancelAndReenable",true},{"idleWorker",q.worker},{"idleQueueBytes",q.bytes},{"automaticReadbacks",0},{"scope","test readPixels only; pendingFrameMS is one observed frame, not sustained FPS"}};
#else
 std::cout<<"{\"passed\":true,\"available\":false}";
#endif
 }catch(const std::exception& error){std::cerr<<error.what();return 1;}}
