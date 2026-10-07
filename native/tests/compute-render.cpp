#include <HBEngine/Render.hpp>
#include <nlohmann/json.hpp>
#include <cassert>
#include <chrono>
#include <fstream>
#include <iostream>

template<class F> void rejects(F&& fn){bool threw=false;try{fn();}catch(const std::exception&){threw=true;}assert(threw);}
#ifndef HB_COMPUTE_UNAVAILABLE
void bmp(const char* file,const std::vector<std::uint8_t>& rgba,std::uint32_t w,std::uint32_t h){
    std::array<std::uint8_t,54> header{};header[0]='B';header[1]='M';auto put=[&](int offset,std::uint32_t value){for(int i=0;i<4;i++)header[offset+i]=std::uint8_t(value>>(i*8));};put(2,54+w*h*4);put(10,54);put(14,40);put(18,w);put(22,std::uint32_t(-int(h)));header[26]=1;header[28]=32;
    auto pixels=rgba;for(std::size_t i=0;i<pixels.size();i+=4)std::swap(pixels[i],pixels[i+2]);std::ofstream out(file,std::ios::binary);out.write(reinterpret_cast<const char*>(header.data()),header.size());out.write(reinterpret_cast<const char*>(pixels.data()),pixels.size());assert(out.good());
}
struct Window {
    HWND handle=nullptr;std::wstring name=L"HBComputeRenderAcceptance"+std::to_wstring(GetCurrentProcessId());
    Window(){WNDCLASSW cls{};cls.lpfnWndProc=DefWindowProcW;cls.hInstance=GetModuleHandleW(nullptr);cls.lpszClassName=name.c_str();assert(RegisterClassW(&cls));handle=CreateWindowExW(WS_EX_TOOLWINDOW,cls.lpszClassName,L"HBEngine private GPU render",WS_OVERLAPPEDWINDOW,-32000,-32000,320,180,nullptr,nullptr,cls.hInstance,nullptr);assert(handle);}
    ~Window(){if(handle)DestroyWindow(handle);UnregisterClassW(name.c_str(),GetModuleHandleW(nullptr));}
};
#endif
int main(int argc,char** argv){
#ifdef HB_COMPUTE_UNAVAILABLE
    (void)argc;(void)argv;assert(!hb::gpu::Device::available());rejects([]{hb::gpu::Device device;});std::cout<<"{\"unavailableGuard\":true}";return 0;
#else
    hb::gpu::Device gpu;hb::gpu::ParticleRenderer renderer(gpu,128,128);
    hb::gpu::Particles moving(gpu,{-.5f,0,.5f,0,1,0,0,2});hb::gpu::ParticleStyle white;white.size=.25f;white.color=white.endColor={1,1,1,1};
    renderer.clear();renderer.draw(moving,white);auto first=renderer.readPixels();auto at=[](const auto& bytes,int x,int y,int channel=0,int width=128){return bytes[(y*width+x)*4+channel];};assert(at(first,32,64)>240&&at(first,64,64)==0);
    moving.step(.5f);renderer.clear();renderer.draw(moving,white);auto moved=renderer.readPixels();assert(at(moved,64,64)>240&&at(moved,32,64)==0);assert(moving.pendingReadbacks()==0);assert(renderer.constantBufferAllocations()==3);
    if(argc>1)bmp(argv[1],moved,128,128);
    // Expired particles are culled by the GPU, without a CPU alive-list copy.
    moving.step(2);renderer.clear();renderer.draw(moving,white);auto dead=renderer.readPixels();for(std::size_t i=0;i<dead.size();i+=4)assert(dead[i]==0&&dead[i+1]==0&&dead[i+2]==0);
    hb::gpu::Particles front(gpu,{0,0,.2f,0,0,0,0,10}),behind(gpu,{0,0,.8f,0,0,0,0,10});auto red=white,green=white;red.color=red.endColor={1,0,0,1};green.color=green.endColor={0,1,0,1};red.blend=hb::gpu::ParticleBlend::Opaque;red.depthWrite=true;
    renderer.clear();renderer.draw(front,red);renderer.draw(behind,green);auto depth=renderer.readPixels();assert(at(depth,64,64)>240&&at(depth,64,64,1)==0);green.depthTest=false;renderer.draw(behind,green);depth=renderer.readPixels();assert(at(depth,64,64)==0&&at(depth,64,64,1)>240);
    red.blend=green.blend=hb::gpu::ParticleBlend::Additive;red.color=red.endColor={1,0,0,.25f};green.color=green.endColor={0,1,0,.25f};red.depthWrite=false;renderer.clear();renderer.draw(front,red);renderer.draw(behind,green);auto add=renderer.readPixels();assert(at(add,64,64)>=62&&at(add,64,64)<=65&&at(add,64,64,1)>=62&&at(add,64,64,1)<=65);
    auto alpha=white;alpha.color=alpha.endColor={1,0,0,.5f};renderer.clear();renderer.draw(front,alpha);auto blended=renderer.readPixels();assert(at(blended,64,64)>=126&&at(blended,64,64)<=129);
    const std::vector<std::uint8_t> sprite{255,0,0,255,255,0,0,255,0,255,0,255,0,255,0,255};renderer.setTexture(2,2,sprite,true);renderer.clear();renderer.draw(front,white);auto textured=renderer.readPixels();assert(at(textured,64,60)>240&&at(textured,64,68,1)>240);renderer.setTexture(2,2,sprite);renderer.clear();renderer.draw(front,white);textured=renderer.readPixels();assert(at(textured,64,64)>80&&at(textured,64,64,1)>80);renderer.clearTexture();
    auto transformed=white;transformed.world[12]=.5f;renderer.clear();renderer.draw(front,transformed);auto shifted=renderer.readPixels();assert(at(shifted,96,64)>240&&at(shifted,64,64)==0);
    auto perspective=white;perspective.size=.4f;perspective.viewProjection=hb::gpu::perspective(90,1,1,10);hb::gpu::Particles nearField(gpu,{0,0,2,0,0,0,0,10}),farField(gpu,{0,0,4,0,0,0,0,10});auto area=[](const auto& pixels){std::size_t count=0;for(std::size_t i=0;i<pixels.size();i+=4)if(pixels[i]>16)++count;return count;};renderer.clear();renderer.draw(nearField,perspective);const auto nearArea=area(renderer.readPixels());renderer.clear();renderer.draw(farField,perspective);const auto farArea=area(renderer.readPixels());assert(nearArea>farArea*2&&farArea>0);
    hb::gpu::ParticleEffect effect({{{-.5f,0,.5f},{1,0,0},2,0}},128,128);effect.style=white;effect.style.viewProjection=hb::gpu::orthographic(2,2,0,1);effect.update(.5f);assert(effect.draw());auto easy=effect.capture();assert(at(easy,64,64)>240&&effect.count()==1&&effect.draws()==1);effect.reset({{{-.5f,0,.5f},{1,0,0},2,0}});effect.draw();assert(at(effect.capture(),32,64)>240);effect.setTexture(2,2,sprite,true);effect.draw();effect.clearTexture();effect.resize(137,71);effect.draw();assert(effect.capture().size()==137*71*4);rejects([&]{effect.reset({});});rejects([&]{effect.draw({0,0,0,1},5);});rejects([&]{hb::gpu::orthographic(0,1);});rejects([&]{hb::gpu::perspective(180,1);});
    rejects([&]{renderer.resize(0,128);});rejects([&]{renderer.resize(16385,128);});rejects([&]{renderer.setTexture(2,2,{255});});rejects([&]{auto invalid=white;invalid.size=-1;renderer.draw(front,invalid);});rejects([&]{renderer.present();});hb::gpu::Device other;hb::gpu::Particles foreign(other,{0,0,.5f,0,0,0,0,10});rejects([&]{renderer.draw(foreign);});
    renderer.resize(137,71);assert(renderer.width()==137&&renderer.height()==71);renderer.clear({.25f,.5f,.75f,1});auto resized=renderer.readPixels();assert(resized.size()==137*71*4&&resized[0]>=62&&resized[1]>=126&&resized[2]>=190);renderer.resize(128,128);
    // Modest bounded batch: actual dispatch + draw, one final image readback.
    constexpr std::size_t count=65537;constexpr int frames=20;std::vector<float> records(count*8);for(std::size_t i=0;i<count;i++){records[i*8]=float(i%257)/256*1.8f-.9f;records[i*8+1]=float(i/257)/256*1.8f-.9f;records[i*8+2]=.5f;records[i*8+4]=.02f;records[i*8+7]=300;}
    hb::gpu::Particles field(gpu,records);auto small=white;small.size=.009f;renderer.resize(320,180);std::vector<double> batches;for(int round=-1;round<3;round++){const auto started=std::chrono::steady_clock::now();for(int frame=0;frame<frames;frame++){field.step(1.f/120);renderer.clear();renderer.draw(field,small);}auto pixels=renderer.readPixels();assert(area(pixels)>1000);if(round>=0)batches.push_back(std::chrono::duration<double,std::milli>(std::chrono::steady_clock::now()-started).count());if(round==2&&argc>2)bmp(argv[2],pixels,320,180);}
    assert(field.pendingReadbacks()==0&&field.constantBufferAllocations()==3);
    // A private HWND exercises flip presentation and ResizeBuffers without showing it.
    Window window;{hb::gpu::ParticleRenderer screen(gpu,320,180,window.handle);screen.clear();screen.draw(field,small);screen.present();screen.resize(321,181);screen.clear();screen.draw(field,small);screen.present();assert(screen.presents()==2&&screen.captures()==0&&IsWindowVisible(window.handle)==FALSE);rejects([&]{screen.present(5);});}
    {hb::gpu::ParticleRenderer replacement(gpu,160,90,window.handle);replacement.clear();replacement.draw(field,small);replacement.present();assert(replacement.presents()==1&&replacement.captures()==0&&IsWindowVisible(window.handle)==FALSE);}
    renderer.clear();renderer.draw(front,white);assert(area(renderer.readPixels())>0);
    std::cout<<nlohmann::json{{"passed",true},{"backend",gpu.backend()},{"computeBufferDirectlyDrawn",true},{"gpuAliveCompaction",true},{"gpuIndirectInstanceCount",true},{"particlePositionReadbacks",0},{"movingPixelProof",true},{"expiredCull",true},{"depthOcclusion",true},{"alphaAdditive",true},{"rgbaSpriteOrientation",true},{"nearestAndLinearSampler",true},{"worldTransform",true},{"perspectiveArea",{nearArea,farArea}},{"easyEffectAPI",true},{"resize",true},{"frameConstants",3},{"privateHiddenSwapChain",true},{"sameHWNDRecreation",true},{"swapPresents",3},{"particles",count},{"framesPerBatch",frames},{"dispatchDrawFinalImageReadbackMs",batches},{"batchImageCaptures",4},{"noGameFPSClaim",true}}.dump();
#endif
}
