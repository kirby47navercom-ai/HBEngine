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
 const auto final=upload(valid);assert(final.at("raySceneUpdates")==2&&final.at("raySceneUpdateBytes")==32);const Json patch={{"row",0},{"rows",1},{"rgbaBase64","AAAAAAAAAAAAAAAAAAAAAA=="}};Json batch={{"id","ray"},{"kind","raySceneUpdates"},{"width",1},{"height",2},{"patches",Json::array({patch,patch})}};batch["patches"][1]["row"]=1;assert(upload(batch).at("raySceneUpdates")==4);int batchGuards=0;for(int i=0;i<7;i++){auto bad=batch;if(i==0)bad["patches"][1]["row"]=0;if(i==1)bad["patches"][1]["rows"]=2;if(i==2)bad["patches"][1]["row"]=1.5;if(i==3)bad["patches"][1]["rgbaBase64"]="AADAfwAAAAAAAAAAAAAAAA==";if(i==4)bad["patches"]=Json::array();if(i==5)bad["patches"]="not array";if(i==6)bad["width"]=std::uint64_t(4294967297);bool rejected=false;try{upload(bad);}catch(const std::exception&){rejected=true;}assert(rejected);batchGuards++;}assert(upload(batch).at("raySceneUpdates")==6);bridge.shutdown();
 std::cout<<Json({{"passed",true},{"jsonIntegerRangeGuards",guards},{"validPatches",6},{"batchAtomicGuards",batchGuards},{"rejectedPatchesDidNotWrite",true}}).dump();
}
