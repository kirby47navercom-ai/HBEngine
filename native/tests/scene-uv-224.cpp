#include <HBEngine/SceneRender.hpp>
#include <cassert>
#include <iostream>
#include <limits>
using namespace hb::gpu;
int main(){
#if defined(_WIN32) && !defined(HB_COMPUTE_UNAVAILABLE)
 Device gpu;SceneRenderer renderer(gpu,32,32);std::vector<SceneVertex> vertices={{{-1,-1,.4f}},{{1,-1,.4f}},{{1,1,.4f}},{{-1,1,.4f}}};for(auto& v:vertices)v.uv={0,1};const std::vector<std::uint32_t> indices={0,1,2,0,2,3};auto legacy=renderer.createMesh(vertices,indices),secondary=renderer.createMesh(vertices,indices,std::vector<std::array<float,2>>(4,{1,0}));SceneMaterial mat;mat.unlit=true;mat.toneMapped=false;mat.doubleSided=true;SceneFrame frame;frame.ambient={0,0,0,1};auto uv0=renderer.createProgram("","base.rgb=float3(i.uv,0);",{}),uv1=renderer.createProgram("","base.rgb=float3(i.uv1,0);",{});
 const auto center=(16*32+16)*4;const auto draw=[&](const auto& mesh,const auto& program){renderer.begin(frame);renderer.draw(mesh,identity,identity,mat,{}, {},0,0,&program);return renderer.readPixels();};
 auto a=draw(secondary,uv1);assert(a[center]>250&&a[center+1]<3);auto b=draw(secondary,uv0);assert(b[center]<3&&b[center+1]>250);auto c=draw(legacy,uv1);assert(c[center]<3&&c[center+1]<3);assert(draw(secondary,uv1)==a);
 const auto reject=[&](auto data){bool failed=false;try{renderer.createMesh(vertices,indices,data);}catch(const std::exception&){failed=true;}assert(failed);};reject(std::vector<std::array<float,2>>(3,{1,0}));reject(std::vector<std::array<float,2>>(4,{std::numeric_limits<float>::quiet_NaN(),0}));static_assert(sizeof(SceneVertex)==48,"Legacy vertex memory must remain unchanged");
 std::cout<<"{\"passed\":true,\"legacyVertexBytes\":48,\"optionalUVBytesPerVertex\":8,\"readbacks\":4,\"uvChannelsIndependent\":true,\"missingUV1Zero\":true,\"invalidRejected\":true}";
#else
 std::cout<<"{\"passed\":true,\"unavailable\":true}";
#endif
}
