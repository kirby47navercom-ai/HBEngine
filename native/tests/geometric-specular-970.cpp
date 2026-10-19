#include <HBEngine/SceneRender.hpp>
#include <nlohmann/json.hpp>
#include <iostream>
int main(){try{
 using namespace hb::gpu;Device gpu;SceneRenderer renderer(gpu,32,16);SceneFrame frame;frame.clear={0,0,0,1};frame.ambient={0,0,0,1};frame.eye={0,0,10,1};renderer.setLights({{{0,0,0,0},{0,0,1,0},{1,1,1,.5f},{1,0,2,0}}});
 nlohmann::json rows=nlohmann::json::array();
 for(const std::string name:{"flat","curved","graph","graph-normal","clamped","unlit","emissive","coat"}){
  const bool flat=name=="flat";const std::array<float,3> left=flat?std::array<float,3>{0,0,1}:std::array<float,3>{-.8f,0,.6f},right=flat?left:std::array<float,3>{.8f,0,.6f};
  const std::vector<SceneVertex> vertices={{{-1,-1,.5f},left},{{1,-1,.5f},right},{{1,1,.5f},right},{{-1,1,.5f},left}};auto mesh=renderer.createMesh(vertices,{0,1,2,0,2,3});SceneMaterial material;material.color={.6f,.4f,.2f,1};material.roughness=name=="clamped"?.99f:.2f;material.metalness=1;material.physical={name=="coat"?1.f:0.f,name=="clamped"?.98f:.25f,1.5f,0};material.doubleSided=true;material.toneMapped=false;material.unlit=name=="unlit"||name=="emissive";if(name=="emissive")material.emissive={.1f,.2f,.3f,1};
  std::optional<SceneRenderer::Program> program;if(name=="graph"||name=="graph-normal")program.emplace(renderer.createProgram("",name=="graph"?"rough=.35;coatRough=.45;":"rough=.35;coatRough=.45;n=float3(0,0,1);cn=float3(0,0,1);",{}));renderer.begin(frame);renderer.draw(mesh,identity,identity,material,{}, {},0,0,program?&*program:nullptr);const auto pixels=renderer.readPixels();rows.push_back({{"name",name},{"pixels",pixels},{"width",32},{"height",16}});
 }
 std::cout<<nlohmann::json({{"passed",true},{"rows",rows},{"hardware",true}}).dump();
}catch(const std::exception& error){std::cerr<<error.what();return 1;}}
