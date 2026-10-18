#include <HBEngine/SceneRender.hpp>
#include <nlohmann/json.hpp>
#include <cassert>
#include <fstream>
#include <iostream>
using namespace hb::gpu;
template<class F> void rejects(F fn){bool failed=false;try{fn();}catch(const std::exception&){failed=true;}assert(failed);}
std::vector<std::uint8_t> decode(const std::string& text){const std::string alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";std::vector<std::uint8_t> out;unsigned value=0,bits=0;for(char c:text){if(c=='=')break;const auto at=alphabet.find(c);if(at==std::string::npos)throw std::runtime_error("invalid base64");value=(value<<6)|static_cast<unsigned>(at);bits+=6;if(bits>=8){bits-=8;out.push_back(static_cast<std::uint8_t>(value>>bits));}}return out;}
int main(int argc,char** argv){
 assert(argc==2);Device gpu;SceneRenderer renderer(gpu,16,16);const std::vector<SceneVertex> vertices={{{-1,-1,.4f}},{{1,-1,.4f}},{{1,1,.4f}},{{-1,1,.4f}}};auto mesh=renderer.createMesh(vertices,{0,1,2,0,2,3});SceneMaterial material;material.unlit=true;material.toneMapped=false;material.doubleSided=true;SceneFrame frame;frame.ambient={0,0,0,1};
 const auto pixel=[&](const SceneRenderer::Texture& texture,const std::string& expression){auto program=renderer.createProgram("Texture2D tex:register(t8);SamplerState samp:register(s0);","base="+expression+";",{});renderer.begin(frame);renderer.draw(mesh,identity,identity,material,{}, {},0,0,&program,{&texture},{0});const auto bytes=renderer.readPixels();const auto at=(8*16+8)*4;return std::array<int,4>{bytes[at],bytes[at+1],bytes[at+2],bytes[at+3]};};
 const auto solid=[](int count,std::array<std::uint8_t,4> color){std::vector<std::uint8_t> bytes;for(int i=0;i<count;i++)bytes.insert(bytes.end(),color.begin(),color.end());return bytes;};
 const auto base=solid(16,{255,0,0,255});const std::vector<SceneRenderer::TextureMipLevel> levels={{2,2,solid(4,{0,255,0,255})},{1,1,{0,0,255,255}}};auto texture=renderer.createTexture(4,4,base,false,levels);assert(texture.storageBytes()==84);
 nlohmann::json results=nlohmann::json::array();for(int lod=0;lod<3;lod++){const auto rgb=pixel(texture,"tex.SampleLevel(samp,float2(.5,.5),"+std::to_string(lod)+")");for(int c=0;c<3;c++)assert(std::abs(rgb[c]-(c==lod?255:0))<3);results.push_back({{"lod",lod},{"rgba",rgb}});}
 rejects([&]{renderer.createTexture(4,4,base,false,std::vector<SceneRenderer::TextureMipLevel>{{3,2,solid(6,{0,0,0,0})}});});rejects([&]{renderer.createTexture(4,4,base,false,std::vector<SceneRenderer::TextureMipLevel>{{2,2,{0,0,0,0}}});});rejects([&]{auto extra=levels;extra.push_back({1,1,{0,0,0,0}});renderer.createTexture(4,4,base,false,extra);});rejects([&]{renderer.createDataTexture(4,4,base,4,false,1,false,false,"2d",true,false,levels);});
 auto srgb=renderer.createTexture(2,1,{0,0,0,255,128,128,128,255},true,std::vector<SceneRenderer::TextureMipLevel>{});const auto filtered=pixel(srgb,"tex.SampleLevel(samp,float2(.5,.5),0)");assert(std::abs(filtered[0]-92)<=3);
 std::ifstream file(argv[1]);nlohmann::json packet;file>>packet;std::vector<SceneRenderer::TextureMipLevel> imported;for(const auto& level:packet.at("mipLevels"))imported.push_back({level.at("width"),level.at("height"),decode(level.at("rgbaBase64"))});auto loaded=renderer.createDataTexture(packet.at("width"),packet.at("height"),decode(packet.at("rgbaBase64")),4,false,1,packet.at("srgb"),false,"2d",false,false,imported);
 const auto blue=pixel(loaded,"tex.SampleLevel(samp,float2(.25,.25),0)"),green=pixel(loaded,"tex.SampleLevel(samp,float2(.75,.75),0)"),mip=pixel(loaded,"tex.SampleLevel(samp,float2(.5,.5),1)");assert(blue[2]>252&&blue[0]<3);assert(std::abs(green[1]-128)<3&&green[0]<3);for(int c=0;c<3;c++)assert(std::abs(mip[c]-imported[0].rgba[c])<3);
 std::cout<<nlohmann::json{{"passed",true},{"actualD3D11",true},{"explicitLevels",results},{"storageBytes",texture.storageBytes()},{"hardwareSRGBFiltered",filtered},{"packetBlue",blue},{"packetGreen",green},{"packetMip",mip},{"validationRejected",4}};
}
