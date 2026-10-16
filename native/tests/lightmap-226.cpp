#include <HBEngine/SceneRender.hpp>
#include <cassert>
#include <iostream>
using namespace hb::gpu;
int main(){
#if defined(_WIN32) && !defined(HB_COMPUTE_UNAVAILABLE)
 Device gpu;SceneRenderer r(gpu,32,32);std::vector<SceneVertex> vertices={{{-1,-1,.4f}},{{1,-1,.4f}},{{1,1,.4f}},{{-1,1,.4f}}};for(auto& v:vertices)v.uv={1,1};const std::vector<std::uint32_t> indices={0,1,2,0,2,3};auto mesh=r.createMesh(vertices,indices,std::vector<std::array<float,2>>(4,{.25f,.25f})),middle=r.createMesh(vertices,indices,std::vector<std::array<float,2>>(4,{.5f,.5f})),legacy=r.createMesh(vertices,indices);
 const std::vector<std::uint16_t> pixels={0x4248,0,0,0x3c00,0,0x4248,0,0x3c00,0,0,0x4248,0x3c00,0x4248,0x4248,0x4248,0x3c00};const auto* bytes=reinterpret_cast<const std::uint8_t*>(pixels.data());auto map=r.createDataTexture(2,2,{bytes,bytes+pixels.size()*2},4,true,1,false,false,"2d",false,true);assert(map.storageBytes()==32);
 SceneFrame frame;frame.ambient={0,0,0,1};r.setLights({});SceneMaterial material;material.color={1,1,1,1};material.roughness=1;material.metalness=0;material.doubleSided=true;material.toneMapped=false;const auto draw=[&](const auto& geometry,const SceneRenderer::Texture* texture){r.begin(frame);r.draw(geometry,identity,identity,material,{}, {},0,0,nullptr,{}, {},nullptr,nullptr,nullptr,nullptr,nullptr,0,texture);return r.readPixels();};const auto center=(16*32+16)*4;
 const auto dark=draw(mesh,nullptr),red=draw(mesh,&map),mixed=draw(middle,&map);assert(dark[center]<3&&red[center]>250&&red[center+1]<3&&red[center+2]<3);assert(mixed[center]>60&&mixed[center]<240&&std::abs(int(mixed[center])-int(mixed[center+1]))<=1&&std::abs(int(mixed[center])-int(mixed[center+2]))<=1);material.lightmapIntensity=.5f;const auto dim=draw(mesh,&map);assert(dim[center]>60&&dim[center]<red[center]);bool rejected=false;try{draw(legacy,&map);}catch(const std::exception&){rejected=true;}assert(rejected);std::vector<std::uint8_t> invalid(8);invalid[0]=0;invalid[1]=0x7c;rejected=false;try{r.createDataTexture(1,1,invalid,4,true,1,false,false,"2d",false,true);}catch(const std::exception&){rejected=true;}assert(rejected);
 std::cout<<"{\"passed\":true,\"halfTextureBytes\":32,\"equivalentFloatBytes\":64,\"secondaryUVPixel\":true,\"bilinearLoad\":true,\"intensity\":true,\"missingUVRejected\":true,\"nonFiniteRejected\":true,\"readbacks\":4}";
#else
 std::cout<<"{\"passed\":true,\"unavailable\":true}";
#endif
}
