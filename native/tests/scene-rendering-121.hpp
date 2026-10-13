#pragma once
inline nlohmann::json rendering121Proof(hb::gpu::Device& gpu,const std::string& fixture){
 auto proof=rendering118Proof(gpu,fixture,"rendering121",true);hb::gpu::SceneRenderer renderer(gpu,64,64);hb::gpu::SceneFrame frame;frame.screenEffects.emplace();auto& targets=frame.screenEffects->pathCausticTargets;int rejected=0;
 for(const std::array<float,4> bad:std::array<std::array<float,4>,9>{{{-1,0,0,0},{.5f,0,1,0},{0,.5f,1,0},{0,0,2,0},{0,0,1,1},{1,0,0,0},{2,0,1,0},{0,1,1,0},{std::numeric_limits<float>::quiet_NaN(),0,0,0}}}){targets=bad;try{renderer.begin(frame);}catch(const std::exception&){++rejected;}}
 assert(rejected==9);proof["nativeTargetBounds"]=rejected;proof["selectionTableUsed"]=true;return proof;
}
