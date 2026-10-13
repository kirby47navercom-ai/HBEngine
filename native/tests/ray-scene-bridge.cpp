#include "../desktop/SceneRenderBridge.hpp"
#include <cassert>
#include <iostream>
int main(){
 using Json=nlohmann::json;SceneRenderBridge bridge;bridge.command({{"op","init"},{"data",{{"width",64},{"height",64}}}},nullptr,true);
 std::string initial(44,'A');initial.back()='=';const auto upload=[&](const Json& r){return bridge.command({{"op","upload"},{"data",Json::array({r})}},nullptr,true);};
 upload({{"id","ray"},{"kind","dataTexture"},{"width",1},{"height",2},{"channels",4},{"floating",true},{"layers",1},{"mipmaps",false},{"rgbaBase64",initial}});
 const Json valid={{"id","ray"},{"kind","raySceneUpdate"},{"width",1},{"height",2},{"row",0},{"rows",1},{"rgbaBase64","AAAAAAAAAAAAAAAAAAAAAA=="}};
 assert(upload(valid).at("raySceneUpdates")==1);int guards=0;
 for(const std::string name:{"width","height","row","rows"})for(const Json bad:{Json(-1),Json(1.5),Json(std::uint64_t(4294967297)),Json("1")}){Json r=valid;r[name]=bad;bool rejected=false;try{upload(r);}catch(const std::exception&){rejected=true;}assert(rejected);guards++;}
 for(const std::string name:{"width","height","rows"}){Json r=valid;r[name]=0;bool rejected=false;try{upload(r);}catch(const std::exception&){rejected=true;}assert(rejected);guards++;}
 const auto final=upload(valid);assert(final.at("raySceneUpdates")==2&&final.at("raySceneUpdateBytes")==32);bridge.shutdown();
 std::cout<<Json({{"passed",true},{"jsonIntegerRangeGuards",guards},{"validPatches",2},{"rejectedPatchesDidNotWrite",true}}).dump();
}
