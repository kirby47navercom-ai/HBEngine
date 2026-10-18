#include <HBEngine/ScreenEffectsPass.hpp>
#include <nlohmann/json.hpp>
#include <iostream>
int main(){try{
 using namespace hb::gpu;using Json=nlohmann::json;Device gpu;ScreenEffectsPass pass(gpu);SceneScreenEffects settings;settings.path[0]=1;settings.transport[1]=1;settings.noTransmission=true;settings.pathDenoise[0]=1;settings.pathFilter[0]=.5f;Json rows=Json::array();
 const auto step=[&](const char* label,float lens){settings.pathLens[0]=lens;pass.begin(2,2,settings);const auto info=pass.compilationInfo();rows.push_back({{"label",label},{"info",info},{"bytes",pass.bytes()}});return info;};
 const auto cold=step("no-lens",0),same=step("same-no-lens",0);if(cold[0]!=5||cold!=same||cold[8]!=1)throw std::runtime_error("Guide initial stages or stable source reuse");
 const auto lens=step("lens",.03f),sameLens=step("same-lens",.03f);if(lens[0]!=cold[0]+2||lens!=sameLens||lens[8]!=1)throw std::runtime_error("Only guide variants must compile on lens transition");
 const auto restored=step("restore-no-lens",0),stable=step("stable-restored",0);if(restored[0]!=lens[0]||restored[1]!=lens[1]+2||restored!=stable||restored[8]!=1)throw std::runtime_error("Guide variants must reuse cached bytes on restoration");
 const auto bytes=rows[0]["bytes"].get<std::uint64_t>();for(const auto& row:rows)if(row["bytes"]!=bytes)throw std::runtime_error("Lens variant changed retained guide targets");
 if(detail::ShaderBytecodeCompiler::info()[9]!=0){throw std::runtime_error("Unexpected disk cache configuration");}
 pass.release();
 if(pass.bytes()!=0){throw std::runtime_error("Guide targets not released");}
 std::cout<<Json({{"passed",true},{"hardware",true},{"rows",rows},{"sourceBuilds",1},{"newLensCompilations",2},{"restoredBytecodeHits",2},{"bytesAfterRelease",pass.bytes()},{"diskConfigured",false}})<<'\n';
}catch(const std::exception& e){std::cerr<<e.what()<<'\n';return 1;}}
