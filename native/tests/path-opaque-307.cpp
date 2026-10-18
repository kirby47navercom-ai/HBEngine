#include <HBEngine/SceneRender.hpp>
#include <nlohmann/json.hpp>
#include <cassert>
#include <chrono>
#include <iostream>

int main(){
 using namespace hb::gpu;
 Device gpu;SceneRenderer renderer(gpu,32,32);SceneFrame frame;frame.clear={0,0,0,1};frame.eye={0,0,10,1};frame.screenEffects.emplace();auto& s=*frame.screenEffects;
 s.eye=frame.eye;s.camera={.1f,100,1,1};s.path={1,4,8,0};s.pathQuality={1,0,0,0};s.pathEnvironment={.15f,.2f,.3f,64};s.geometry={0,20,1,4};s.geometryLimits={256,.01f,15,0};s.transport={15,1,1,32};
 std::vector<float> data{-100,-100,.5f,1,100,100,.5f,0,2,0,0,0};
 const auto triangle=[&](std::array<float,3>a,std::array<float,3>b,std::array<float,3>c){for(float v:a)data.push_back(v);data.push_back(.2f);for(int i=0;i<3;i++)data.push_back(b[i]-a[i]);data.push_back(.35f);for(int i=0;i<3;i++)data.push_back(c[i]-a[i]);data.push_back(0);data.insert(data.end(),{0,0,-1,1.5f,.7f,.5f,.3f,1,.3f,.1f,.05f,0});};
 triangle({-100,-100,.5f},{100,-100,.5f},{100,100,.5f});triangle({-100,-100,.5f},{100,100,.5f},{-100,100,.5f});
 for(int i=0;i<2;i++)data.insert(data.end(),{1,1,1,0,1,1,0,0});
 std::vector<std::uint8_t> bytes(data.size()*sizeof(float));std::memcpy(bytes.data(),data.data(),bytes.size());const auto width=static_cast<unsigned>(data.size()/4);auto atlas=renderer.createDataTexture(width,1,bytes,4,true);renderer.setGeometryScene(&atlas);s.geometryInfo={float(width),1,1,3};
 nlohmann::json rows=nlohmann::json::array();std::vector<std::uint8_t> baseline;std::uint64_t compilations=0,sourceBuilds=0;int maxError=0,visible=0;
 for(int mode=0;mode<4;mode++){
  s.noTransmission=mode%2!=0;const auto start=std::chrono::steady_clock::now();renderer.begin(frame);const auto pixels=renderer.readPixels();const auto stats=renderer.shaderCompilationInfo();
  if(mode==0){baseline=pixels;compilations=stats[0];sourceBuilds=stats[8];for(std::size_t n=0;n<pixels.size();n++)if(n%4!=3&&pixels[n]>5)visible++;assert(visible>100);}
  else{assert(pixels.size()==baseline.size());for(std::size_t n=0;n<pixels.size();n++)maxError=std::max(maxError,std::abs(int(pixels[n])-int(baseline[n])));assert(maxError==0);assert(stats[0]==compilations+1);assert(stats[8]==sourceBuilds);}
  const auto elapsed=std::chrono::duration<double,std::milli>(std::chrono::steady_clock::now()-start).count();rows.push_back({{"noTransmission",s.noTransmission},{"elapsedMS",elapsed},{"compilations",stats[0]},{"cacheHits",stats[1]},{"cacheBytes",stats[4]},{"cacheBudget",stats[5]},{"sourceBuilds",stats[8]},{"lastCompileMS",stats[6]}});assert(stats[4]<=stats[5]);
 }
 data[31]=data[55]=.45f;std::memcpy(bytes.data(),data.data(),bytes.size());auto alphaAtlas=renderer.createDataTexture(width,1,bytes,4,true);renderer.setGeometryScene(&alphaAtlas);std::vector<std::uint8_t> alphaBaseline;int alphaChanged=0,alphaError=0;
 for(int mode=0;mode<2;mode++){
  s.noTransmission=mode!=0;renderer.begin(frame);const auto pixels=renderer.readPixels();const auto stats=renderer.shaderCompilationInfo();assert(stats[0]==compilations+1);assert(stats[8]==sourceBuilds);
  if(mode==0){alphaBaseline=pixels;for(std::size_t n=0;n<pixels.size();n++)if(n%4!=3&&pixels[n]!=baseline[n])alphaChanged++;assert(alphaChanged>100);}else{for(std::size_t n=0;n<pixels.size();n++)alphaError=std::max(alphaError,std::abs(int(pixels[n])-int(alphaBaseline[n])));assert(alphaError==0);}
  rows.push_back({{"alpha",.45},{"noTransmission",s.noTransmission},{"compilations",stats[0]},{"cacheHits",stats[1]},{"sourceBuilds",stats[8]},{"lastCompileMS",stats[6]}});
 }
 frame.screenEffects.reset();renderer.begin(frame);assert(renderer.bloomTextureBytes()==0);renderer.setGeometryScene(nullptr);
 std::cout<<nlohmann::json({{"passed",true},{"rows",rows},{"maxByteError",maxError},{"visibleRGB",visible},{"alphaMaxByteError",alphaError},{"alphaChangedRGB",alphaChanged},{"alphaPreserved",true},{"defaultLegacy",true},{"variantsSeparated",true},{"returnReusesBytecode",true},{"sourcePlanReused",true},{"resourcesReleased",true}}).dump();
}
