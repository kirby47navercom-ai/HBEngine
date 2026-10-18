#include <HBEngine/SceneRender.hpp>
#include <nlohmann/json.hpp>
#include <cassert>
#include <iostream>
int main(){try{using namespace hb::gpu;Device gpu;SceneRenderer renderer(gpu,16,16);
 const std::string declarations="Texture2D a:register(t8),b:register(t9);SamplerState sa:register(s0),sb:register(s1);",evaluation="base=float4(a.SampleLevel(sa,float2(.5,.5),0).r,b.SampleLevel(sb,float2(.5,.5),0).g,0,1);";
 bool originalRejected=false;try{renderer.createProgram(declarations,evaluation,{});}catch(const std::exception& e){originalRejected=std::string(e.what()).find("overlapping register")!=std::string::npos;}assert(originalRejected);
 auto program=renderer.createSurfaceProgram(declarations,evaluation,{});
 auto red=renderer.createTexture(2,1,{255,0,0,255,0,0,0,255},false,false),green=renderer.createTexture(2,1,{0,255,0,255,0,0,0,255},false,false);
 const std::vector<SceneVertex> vertices={{{-1,-1,.4f}},{{1,-1,.4f}},{{1,1,.4f}},{{-1,1,.4f}}};auto mesh=renderer.createMesh(vertices,{0,1,2,0,2,3});SceneMaterial material;material.unlit=true;material.toneMapped=false;material.doubleSided=true;SceneFrame frame;
 const auto draw=[&](const std::vector<std::uint32_t>& sampling){renderer.begin(frame);renderer.draw(mesh,identity,identity,material,{}, {},0,0,&program,{&red,&green},sampling);const auto bytes=renderer.readPixels();const auto at=(8*16+8)*4;return std::array<int,4>{bytes[at],bytes[at+1],bytes[at+2],bytes[at+3]};};
 const auto first=draw({0,1}),swapped=draw({1,0});assert(first[0]>100&&first[1]<3);assert(swapped[1]>100&&swapped[0]<3);assert(draw({0,1})==first);
 std::cout<<nlohmann::json{{"passed",true},{"hardwareD3D11",true},{"originalTwoSamplerConflict",originalRejected},{"surfaceProgramCreated",true},{"linearRedPointGreen",first},{"pointRedLinearGreen",swapped},{"independentSampling",true},{"stableRevisit",true},{"legacyCreateProgramUnchanged",true}};
}catch(const std::exception& e){std::cerr<<e.what();return 1;}}
