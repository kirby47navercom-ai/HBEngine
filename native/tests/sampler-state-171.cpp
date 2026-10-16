#include <HBEngine/SceneRender.hpp>
#include <cassert>
#include <iostream>
int main(){
    hb::gpu::Device gpu;hb::gpu::SceneRenderer renderer(gpu,64,64);
    D3D11_SAMPLER_DESC d{};
    renderer.samplerState(65536u|128u|256u)->GetDesc(&d);
    assert(d.Filter==D3D11_FILTER_MIN_POINT_MAG_LINEAR_MIP_POINT&&d.MaxLOD==0);
    renderer.samplerState(65536u|512u|(7u<<10u))->GetDesc(&d);
    assert(d.Filter==D3D11_FILTER_ANISOTROPIC&&d.MaxAnisotropy==8);
    auto* cached=renderer.samplerState(65536u|512u|(7u<<10u));
    assert(cached==renderer.samplerState(65536u|512u|(7u<<10u)));
    bool rejected=false;try{renderer.samplerState(65536u|127u);}catch(const std::exception&){rejected=true;}assert(rejected);
    std::cout<<"{\"passed\":true,\"independentMinMag\":true,\"noMip\":true,\"anisotropy\":8,\"reuse\":true,\"invalidGuard\":true}";
}
