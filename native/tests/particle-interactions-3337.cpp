#include <HBEngine/Compute.hpp>
#include <SceneRenderBridge.hpp>
#include <cassert>
#include <chrono>
#include <thread>
#include <iostream>
using namespace hb::gpu;
static std::uint32_t bits(float v){std::uint32_t out;std::memcpy(&out,&v,4);return out;}
static FrameResult read(Particles& p){const auto deadline=std::chrono::steady_clock::now()+std::chrono::seconds(8);while(std::chrono::steady_clock::now()<deadline){if(auto result=p.pollEvents())return std::move(*result);std::this_thread::sleep_for(std::chrono::milliseconds(1));}throw std::runtime_error("particle events readback timeout");}
static void close3337(float a,float b){if(std::abs(a-b)>.0001f)throw std::runtime_error("particle value mismatch");}
int main(){try{Device::configureShaderCache("ShaderCache");Device gpu;
  ParticleInteraction c;c.mode=1;c.normal={0,2,0};c.restitution=.5f;c.friction=.25f;c.collision=true;c.death=true;c.capacity=4;c.time=12.5f;
  Particles p(gpu,std::vector<float>{0,.5f,0,0,2,-4,0,5});p.interact(.25f,{0,0,0},0,0,c);auto state=p.read();close3337(state[0],.5f);close3337(state[1],0);close3337(state[4],1.5f);close3337(state[5],2);auto events=read(p);assert(bits(events.values[0])==1&&bits(events.values[4])==2);close3337(events.values[6],.5f);close3337(events.values[7],0);close3337(events.values[14],12.5f);assert(p.storageBytes()==32+(16+48*4)*4);
  p.interact(.1f,{0,0,0},0,0,c);events=read(p);assert(bits(events.values[0])==0);state=p.read();close3337(state[1],.2f);p.clear();assert(!p.pollEvents());assert(p.storageBytes()==32);
  p.emit({0,.5f,0,0,2,-4,0,5});c.mode=2;p.interact(.25f,{0,0,0},0,0,c);events=read(p);assert(bits(events.values[0])==2&&bits(events.values[4])==2&&bits(events.values[16])==1);state=p.read();close3337(state[3],state[7]);
  p.interact(.25f,{0,0,0},0,0,c);assert(bits(read(p).values[0])==0);
  p.clear();p.emit({0,.5f,0,0,2,-4,0,5});p.interact(.25f,{0,0,0},0,0,c);c.generation++;c.time=99;p.interact(.1f,{0,0,0},0,0,c);assert(bits(read(p).values[0])==0);assert(!p.pollEvents());
  p.clear();p.emit({1,2,3,0,4,5,6,.1f});c.mode=0;p.interact(.25f,{2,0,0},0,0,c);events=read(p);assert(bits(events.values[0])==1&&bits(events.values[4])==1);close3337(events.values[6],1.41f);close3337(events.values[7],2.5f);close3337(events.values[9],.25f);
  // Saturation is explicit; the full living-particle buffer never participates in event readback.
  std::vector<float> many(65536*8);for(std::size_t i=0;i<65536;i++){many[i*8+1]=.5f;many[i*8+5]=-4;many[i*8+7]=.2f;}Particles dense(gpu,many);c.mode=2;c.capacity=16;dense.interact(.3f,{0,0,0},0,0,c);events=read(dense);assert(bits(events.values[0])==131072);assert(events.values.size()==4+16*12);
  for(int i=0;i<4;i++)dense.interact(.1f,{0,0,0},0,0,c);assert(dense.droppedEventFrames()==1);for(int i=0;i<3;i++)read(dense);assert(!dense.pollEvents());dense.clear();assert(!dense.pollEvents());
  // Collision-only leaves no event GPU/staging allocation. Legacy no-interaction integration is retained.
  Particles plain(gpu,std::vector<float>{0,.5f,0,0,2,-4,0,5});c.mode=1;c.death=c.collision=false;plain.interact(.25f,{0,0,0},0,0,c);close3337(plain.read()[5],2);assert(plain.storageBytes()==32&&plain.eventCapacity()==0);c.mode=0;Particles old(gpu,std::vector<float>{0,.5f,0,0,2,-4,0,5}),next(gpu,std::vector<float>{0,.5f,0,0,2,-4,0,5});old.step(.25f,{1,2,3},.5f,.3f);next.interact(.25f,{1,2,3},.5f,.3f,c);assert(old.read()==next.read());
  c.normal={0,0,0};bool rejected=false;try{plain.interact(1,{0,0,0},0,0,c);}catch(...){rejected=true;}assert(rejected);
  std::cout<<"{\"passed\":true,\"actualD3D11\":true,\"cases\":8,\"denseParticles\":65536,\"denseEventAttempts\":131072,\"boundedEventRecords\":16,\"eventReadbackBytes\":784,\"GUI\":false}";
}catch(const std::exception& e){std::cerr<<e.what();return 1;}}
