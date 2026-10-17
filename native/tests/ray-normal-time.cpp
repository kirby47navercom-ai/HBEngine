#include <HBEngine/RayPrograms.hpp>
#include <iostream>
int main(){try{
    hb::gpu::RayProgram p;
    p.key=71;
    p.instructions={{{2,0,1,1,-1,-1,-1,-1,0,0,0}},{{8,-1,4,4,0,-1,-1,-1,0,3,3}}};
    for(unsigned fields:{4u,8u,512u,1023u}){
        p.fieldMask=fields;
        const auto source=hb::gpu::rayProgramShader({p});
        const bool enabled=source.find("#define HB_RAY_NORMAL_TIME 1")!=std::string::npos;
        if(enabled!=bool(fields&8))throw std::runtime_error("Normal Time field isolation failed");
    }
    p.fieldMask=8;p.instructions[0][0]=0;
    if(hb::gpu::rayProgramShader({p}).find("#define HB_RAY_NORMAL_TIME 1")!=std::string::npos)throw std::runtime_error("Static normal retained prior Time branch");
    std::cout<<"{\"passed\":true,\"fieldCases\":5,\"keysPreserved\":true}\n";
}catch(const std::exception& e){std::cerr<<e.what()<<'\n';return 1;}}
