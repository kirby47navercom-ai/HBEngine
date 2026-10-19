#include <HBEngine/RayPrograms.hpp>
#include <nlohmann/json.hpp>
#include <fstream>
#include <iostream>
#include <cassert>
int main(int argc,char** argv){try{
 if(argc!=2)throw std::runtime_error("context cases required");
 std::ifstream file(argv[1]);nlohmann::json cases;file>>cases;nlohmann::json results=nlohmann::json::array();
 for(const auto& c:cases){const auto programs=hb::gpu::readRayPrograms(c.at("programs"));const auto source=hb::gpu::rayProgramShader(programs);for(int field=0;field<10;++field){assert(source.find("vec4 hbRayPreviousRunField"+std::to_string(field)+"(")!=std::string::npos);}const auto& p=programs.front();const bool physical=hb::gpu::rayFieldUsesFrame(p,0),coat=hb::gpu::rayFieldUsesFrame(p,5,true),fullCoat=hb::gpu::rayFieldUsesFrame(p,5),copied=source.find("vec4 hbRayPreviousProgram"+std::to_string(p.key)+"(")!=std::string::npos;
  assert(physical==c.at("physical").get<bool>()&&coat==c.at("coat").get<bool>()&&fullCoat==c.at("fullCoat").get<bool>()&&copied==c.at("copied").get<bool>());assert((source.find("#define HB_RAY_SURFACE_HISTORY_0 1")!=std::string::npos)==physical);assert((source.find("#define HB_RAY_SURFACE_HISTORY_5 1")!=std::string::npos)==fullCoat);
  results.push_back({{"name",c.at("name")},{"physical",physical},{"coat",coat},{"fullCoat",fullCoat},{"copied",copied},{"shaderBytes",source.size()}});
 }std::cout<<nlohmann::json({{"passed",true},{"results",results}});
}catch(const std::exception& error){std::cerr<<error.what()<<'\n';return 1;}}
