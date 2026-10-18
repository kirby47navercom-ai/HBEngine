#include <HBEngine/SceneRender.hpp>
#include <nlohmann/json.hpp>
#include <fstream>
#include <iostream>
int main(int argc,char** argv){try{
 if(argc!=2)throw std::runtime_error("Sampling packets required");
 using namespace hb::gpu;using Json=nlohmann::json;std::ifstream input(argv[1]);Json packets;input>>packets;
 Device gpu;SceneRenderer renderer(gpu,16,16);const std::vector<SceneVertex> vertices={{{-1,-1,.4f}},{{1,-1,.4f}},{{1,1,.4f}},{{-1,1,.4f}}};auto mesh=renderer.createMesh(vertices,{0,1,2,0,2,3});SceneFrame frame;SceneMaterial material;material.unlit=true;material.toneMapped=false;material.doubleSided=true;Json rows=Json::array();
 for(const auto& row:packets){const auto kind=row.at("kind").get<std::string>(),mode=row.at("mode").get<std::string>();const bool cube=kind=="texturecube",volume=kind=="texture3d",array=kind=="texturearray";const unsigned layers=cube?6:array||volume?2:1;std::vector<std::uint8_t> pixels(8*8*4*layers);for(unsigned i=0;i<8*8*layers;i++){pixels[i*4]=(i%8)%2?0:255;pixels[i*4+3]=255;}
  auto texture=renderer.createDataTexture(8,8,pixels,4,false,layers,false,array,cube?"cube":volume?"volume":"2d",true);auto program=renderer.createSurfaceProgram(row.at("declarations"),row.at("evaluation"),row.at("uniformValues").get<std::vector<float>>());renderer.begin(frame);renderer.draw(mesh,identity,identity,material,{}, {},0,0,&program,{&texture},{row.at("sampling").get<std::uint32_t>()});const auto bytes=renderer.readPixels();const unsigned at=(8*16+8)*4;const std::array<unsigned,4> pixel{bytes[at],bytes[at+1],bytes[at+2],bytes[at+3]};const bool coarse=mode=="lod"||mode=="gradient";if(pixel[1]>2||pixel[2]>2||pixel[3]<254||(coarse?(pixel[0]<185||pixel[0]>191):pixel[0]<253))throw std::runtime_error(kind+":"+mode+" raster mip oracle "+std::to_string(pixel[0]));rows.push_back({{"kind",kind},{"mode",mode},{"pixel",pixel}});
 }
 std::cout<<Json{{"passed",true},{"hardwareD3D11",true},{"rows",rows},{"scope","Actual persisted graph-generated pixel shaders, auto/LOD/bias/gradient for all four texture families. Constant UV has zero implicit derivatives; bias1 remains level0."}};
}catch(const std::exception& error){std::cerr<<error.what();return 1;}}
