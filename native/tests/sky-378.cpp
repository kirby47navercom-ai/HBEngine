#include <HBEngine/SceneRender.hpp>
#include <nlohmann/json.hpp>
#include <fstream>
#include <iostream>
using namespace hb::gpu;
int main(int argc,char** argv){try{
 if(argc!=2)throw std::runtime_error("sky packet required");
 nlohmann::json p;std::ifstream(argv[1])>>p;Device gpu;SceneRenderer renderer(gpu,32,32);std::vector<SceneVertex> vertices={{{-1,-1,.4f}},{{1,-1,.4f}},{{1,1,.4f}},{{-1,1,.4f}}};auto mesh=renderer.createMesh(vertices,{0,1,2,0,2,3});SceneMaterial material;material.sky=true;material.doubleSided=true;material.toneMapped=false;
 const auto set=[&](const char* key,auto& target){for(int i=0;i<3;i++)target[i]=p.at("parameters").at(key).at(i).template get<float>();};set("topColor",material.skyTop);set("horizonColor",material.skyHorizon);set("sunDirection",material.sunDirection);set("sunColor",material.sunColor);set("moonDirection",material.moonDirection);set("moonColor",material.moonColor);material.sunDirection[3]=p.at("parameters").at("sunDiskPower").get<float>();
 nlohmann::json rows=nlohmann::json::array();for(const auto& direction:p.at("directions")){SceneFrame frame;frame.eye={.03125f-direction[0].get<float>(),-.03125f-direction[1].get<float>(),.4f-direction[2].get<float>(),1};renderer.begin(frame);renderer.draw(mesh,identity,identity,material);const auto pixels=renderer.readPixels();const auto center=(16*32+16)*4;rows.push_back({pixels[center],pixels[center+1],pixels[center+2],pixels[center+3]});}
 material.moonColor[0]=NAN;bool rejected=false;try{SceneFrame frame;renderer.begin(frame);renderer.draw(mesh,identity,identity,material);}catch(const std::exception&){rejected=true;}if(!rejected)throw std::runtime_error("nonfinite moon accepted");
 std::cout<<nlohmann::json{{"passed",true},{"hardware",true},{"rows",rows},{"nonFiniteRejected",true}}.dump();return 0;
}catch(const std::exception& e){std::cerr<<e.what();return 1;}}
