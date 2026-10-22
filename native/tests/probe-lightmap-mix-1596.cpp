#include <HBEngine/SceneRender.hpp>
#include <nlohmann/json.hpp>
#include <iostream>
using namespace hb::gpu;
static float linear(int byte){const float v=byte/255.f;return v<=.04045f?v/12.92f:std::pow((v+.055f)/1.055f,2.4f);}
static int display(float v){v=std::clamp(v,0.f,1.f);return int(std::round(255*(v<=.0031308f?v*12.92f:1.055f*std::pow(v,1/2.4f)-.055f)));}
int main(){try{
 _set_error_mode(_OUT_TO_STDERR);_set_abort_behavior(0,_CALL_REPORTFAULT);SetErrorMode(SEM_FAILCRITICALERRORS|SEM_NOGPFAULTERRORBOX);
 Device gpu;SceneRenderer r(gpu,32,16);SceneFrame frame;frame.eye={0,0,10,1};frame.ambient={0,0,0,1};r.setLights({});r.begin(frame);
 auto capture=r.createProbe(16);for(UINT face=0;face<6;face++){r.beginProbe(capture,face,identity,{0,0,.5f,1},{.2f,.2f,.2f,1});r.endProbe();}r.filterProbe(capture);
 std::vector<SceneVertex> vertices={{{-1,-1,.5f}},{{1,-1,.5f}},{{1,1,.5f}},{{-1,1,.5f}}};for(auto& v:vertices)v.uv={.5f,.5f};auto mesh=r.createMesh(vertices,{0,1,2,0,2,3},std::vector<std::array<float,2>>(4,{.5f,.5f}));
 const float baked=3.141592654f*.2f*.25f;const std::array<float,4> rgba{baked,baked,baked,1};const auto* bytes=reinterpret_cast<const std::uint8_t*>(rgba.data());auto lightmap=r.createDataTexture(1,1,{bytes,bytes+sizeof(rgba)},4,true);
 SceneMaterial material;material.color={1,1,1,1};material.metalness=1;material.roughness=.3f;material.toneMapped=false;material.doubleSided=true;
 ProbeSettings settings;settings.center={0,0,.5f,1};settings.minimum={-5,-5,-5,0};settings.maximum={5,5,5,0};settings.options={1,0,1,0};std::array<SceneRenderer::ProbeBinding,2> pair{};pair[0]={&capture,settings};
 const auto draw=[&](bool global,bool enabled,float rough,float coat,bool hasLightmap=true){material.lightmapReflectionMix=enabled;material.roughness=rough;material.physical[0]=coat;material.physical[1]=rough;r.begin(frame);r.draw(mesh,identity,identity,material,{},{},0,0,nullptr,{},{},nullptr,nullptr,nullptr,global?nullptr:&pair,nullptr,0,hasLightmap?&lightmap:nullptr,global);return r.readPixels();};
 nlohmann::json cases=nlohmann::json::array();int maximumError=0;const auto verify=[&](const auto& before,const auto& after,float scale){for(std::size_t channel=0;channel<3;channel++){const auto index=(8*32+16)*4+channel;if(before[index]<10)throw std::runtime_error("missing physical reference");const int expected=display(linear(before[index])*scale),error=std::abs(int(after[index])-expected);maximumError=std::max(maximumError,error);if(error>3)throw std::runtime_error(nlohmann::json({{"actual",after[index]},{"expected",expected},{"scale",scale},{"error",error}}).dump());}};
 for(const bool global:{false,true}){
  if(global)r.setGlobalProbes({{&capture,settings},{&capture,settings},{&capture,settings}});
  for(const auto& entry:std::array<std::array<float,2>,5>{{{.05f,0},{.2f,0},{.5f,0},{.2f,1},{.5f,1}}}){const float rough=entry[0],coat=entry[1],weight=std::clamp((rough-.1f)/.2f,0.f,1.f),scale=1+(.25f-1)*weight;verify(draw(global,false,rough,coat),draw(global,true,rough,coat),scale);cases.push_back({{"global",global},{"roughness",rough},{"coat",coat},{"scale",scale}});}
  material.lightmapIntensity=0;verify(draw(global,false,.5f,0),draw(global,true,.5f,0),1);material.lightmapIntensity=1;verify(draw(global,false,.5f,0,false),draw(global,true,.5f,0,false),1);
  pair[0].settings.center[3]=2;auto doubled=settings;doubled.center[3]=2;if(global)r.setGlobalProbes({{&capture,doubled},{&capture,doubled},{&capture,doubled}});verify(draw(global,false,.5f,0),draw(global,true,.5f,0),.125f);pair[0].settings=settings;
 }
 r.setGlobalProbes({});std::cout<<nlohmann::json({{"passed",true},{"cases",cases},{"maximumDisplayByteError",maximumError},{"zeroLightmapBypass",true},{"missingLightmapBypass",true},{"captureIntensityReference",true},{"diffuseIntensityZeroReference",true}}).dump();return 0;
}catch(const std::exception& error){std::cerr<<error.what();return 1;}}
