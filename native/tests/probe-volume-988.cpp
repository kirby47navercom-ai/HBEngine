#define main probeVolumeComputeMain988
#include "path-previous-context-308.cpp"
#undef main
#include <HBEngine/SceneProbes.hpp>
#include <sstream>
int main(int argc,char** argv){try{
 using namespace hb::gpu;ProbeSettings settings;Matrix inverse=identity;inverse[0]=-.5f;inverse[4]=.2f;inverse[5]=2;inverse[12]=3;setProbeWorldToLocal(settings,inverse);
 if(settings.localX!=std::array<float,4>{-.5f,.2f,0,3}||settings.localY!=std::array<float,4>{0,2,0,0}||std::abs(settings.faceScale[0]-float(1/std::hypot(.5,.2)))>1e-6||settings.faceScale[1]!=.5f||!probeVolumeBasisUsable(settings))throw std::runtime_error("Probe SDK affine setup");
 const auto before=settings;int rejected=0;for(const int kind:{0,1,2}){Matrix bad=identity;if(kind==0)bad[0]=0;if(kind==1)bad[3]=.1f;if(kind==2)bad[12]=std::numeric_limits<float>::quiet_NaN();try{setProbeWorldToLocal(settings,bad);}catch(const std::exception&){++rejected;}if(settings.localX!=before.localX||settings.localY!=before.localY||settings.localZ!=before.localZ||settings.faceScale!=before.faceScale)throw std::runtime_error("Probe SDK failed mutation");}if(rejected!=3)throw std::runtime_error("Probe SDK rejects");settings.localX={0,0,0,0};if(probeVolumeBasisUsable(settings))throw std::runtime_error("Probe singular rows accepted");
 std::ostringstream captured;auto* original=std::cout.rdbuf(captured.rdbuf());const int result=probeVolumeComputeMain988(argc,argv);std::cout.rdbuf(original);if(result)return result;auto output=Json::parse(captured.str());output["sdkAffineGuards"]=true;output["legacyDefaultsAndSize"]=sizeof(ProbeSettings)==128;std::cout<<output.dump();return 0;
}catch(const std::exception& error){std::cerr<<error.what();return 1;}}
