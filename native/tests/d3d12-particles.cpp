// D3D12 particle simulation parity: the same command sequence on hb::gpu::Particles (D3D11) and d3d12::Particles.
// Free-slot and event order depend on GPU append order, so records and events are compared as sorted multisets.
// Prints one JSON line.
#include <HBEngine/D3D12Particles.hpp>
#include <nlohmann/json.hpp>
#include <iostream>

using namespace hb::gpu;
#define REQUIRE(x) do{if(!(x))throw std::runtime_error("check failed: " #x);}while(0)

// Living records only: which expired slot a birth reuses (and so which stale dead record remains) is GPU order.
static std::vector<std::array<float,8>> records(const std::vector<float>& v){std::vector<std::array<float,8>> out;for(std::size_t i=0;i+8<=v.size();i+=8)if(v[i+3]<v[i+7]){std::array<float,8> r;std::copy_n(v.begin()+i,8,r.begin());out.push_back(r);}std::sort(out.begin(),out.end());return out;}
// Event packet: uint count, 3 pad, then 12 uints per event (kind, index, particle 8 floats, time, 0).
static std::vector<std::array<std::uint32_t,12>> eventList(const std::vector<float>& v){
    std::uint32_t count;std::memcpy(&count,v.data(),4);const auto capacity=(v.size()-4)/12;std::vector<std::array<std::uint32_t,12>> out(std::min<std::size_t>(count,capacity));
    // The slot index depends on which free slot a birth landed in, so it is not compared.
    for(std::size_t i=0;i<out.size();i++){std::memcpy(out[i].data(),v.data()+4+i*12,48);out[i][1]=0;}
    std::sort(out.begin(),out.end());return out;
}
static float maxDifference(const std::vector<std::array<float,8>>& a,const std::vector<std::array<float,8>>& b){REQUIRE(a.size()==b.size());float worst=0;for(std::size_t i=0;i<a.size();i++)for(int k=0;k<8;k++)worst=std::max(worst,std::abs(a[i][k]-b[i][k]));return worst;}

struct Snapshot {std::vector<std::vector<float>> states;std::vector<std::vector<float>> eventPackets;std::uint32_t collisionEvents=0,deathEvents=0;};

static std::vector<float> initial(){
    std::vector<float> v;for(int i=0;i<256;i++){const float x=float(i%16)*.2f-1.5f,z=float(i/16)*.2f-1.5f;const bool dead=i%3==0;v.insert(v.end(),{x,1.f+.01f*float(i%7),z,dead?2.f:0.f,.1f*float(i%5)-.2f,-.5f-.05f*float(i%4),.05f*float(i%3),dead?1.f:4.f});}return v;
}
static std::vector<float> births(){std::vector<float> v;for(int i=0;i<40;i++)v.insert(v.end(),{float(i)*.05f,.4f,-float(i)*.03f,0,.3f,-2.f,0,3});return v;}

// Same script for both backends; flush() makes queued GPU work and readbacks complete.
template<class P,class Flush> static Snapshot run(P& p,Flush flush){
    Snapshot s;p.step(.2f,{.1f,0,0},.5f,.1f);s.states.push_back(p.read());
    p.emit(births());s.states.push_back(p.read());
    ParticleInteraction bounce;bounce.mode=1;bounce.capacity=1024;bounce.normal={0,1,0};bounce.offset=0;bounce.restitution=.6f;bounce.friction=.1f;bounce.collision=true;bounce.time=1.25f;
    p.interact(.4f,{0,0,0},1.f,0,bounce);flush();std::optional<FrameResult> e;for(int i=0;i<200&&!e;i++){e=p.pollEvents();if(!e)flush();}REQUIRE(e.has_value());s.eventPackets.push_back(e->values);s.states.push_back(p.read());
    ParticleInteraction kill=bounce;kill.mode=2;kill.collision=false;kill.death=true;kill.generation=1;kill.time=2.5f;
    p.interact(3.f,{0,0,0},1.f,0,kill);flush();e.reset();for(int i=0;i<200&&!e;i++){e=p.pollEvents();if(!e)flush();}REQUIRE(e.has_value());s.eventPackets.push_back(e->values);s.states.push_back(p.read());
    // Non-blocking frame readback ring: three enqueues fill it, a fourth is refused until one is polled.
    REQUIRE(p.enqueueReadback()&&p.enqueueReadback()&&p.enqueueReadback());REQUIRE(!p.enqueueReadback());flush();std::optional<FrameResult> r;for(int i=0;i<200&&!r;i++){r=p.pollReadback();if(!r)flush();}REQUIRE(r.has_value());REQUIRE(records(r->values)==records(s.states.back()));
    p.clear();s.states.push_back(p.read());p.reset(initial());s.states.push_back(p.read());
    return s;
}

static std::size_t validationErrors(d3d12::Device& gpu){
    detail::Com<ID3D12InfoQueue> info;if(FAILED(gpu.device->QueryInterface(__uuidof(ID3D12InfoQueue),reinterpret_cast<void**>(&info.p))))return 0;
    std::size_t errors=0;for(UINT64 i=0;i<info->GetNumStoredMessages();i++){SIZE_T size=0;info->GetMessage(i,nullptr,&size);std::vector<char> raw(size);auto* m=reinterpret_cast<D3D12_MESSAGE*>(raw.data());info->GetMessage(i,m,&size);
        if(m->Severity<=D3D12_MESSAGE_SEVERITY_ERROR){errors++;std::cerr<<"D3D12 validation: "<<std::string(m->pDescription,m->DescriptionByteLength)<<"\n";}}
    return errors;
}

static nlohmann::json proof(DeviceDriver driver){
    nlohmann::json out;Snapshot reference,ported;
    {hb::gpu::Device gpu11(driver);hb::gpu::Particles p(gpu11,initial());reference=run(p,[]{Sleep(2);});out["software11"]=gpu11.software();}
    d3d12::Device gpu(driver,true);out["software"]=gpu.software;out["debugLayer"]=gpu.debug;
    {auto prepared=d3d12::Particles::prepare(gpu);REQUIRE(prepared.poll());d3d12::Particles p(gpu,initial(),prepared);
        ported=run(p,[&]{if(gpu.isRecording())gpu.end();gpu.waitIdle();});
        out["storageBytes"]=p.storageBytes();out["emissionAllocations"]=p.emissionBufferAllocations();out["revision"]=p.revision();if(gpu.isRecording())gpu.end();gpu.waitIdle();}
    const char* names[]={"step","emit","bounce","kill","clear","reset"};float worst=0;
    for(std::size_t i=0;i<reference.states.size();i++){const auto d=maxDifference(records(reference.states[i]),records(ported.states[i]));out["stateDiff"][names[i]]=d;worst=std::max(worst,d);}
    for(std::size_t i=0;i<2;i++){const auto a=eventList(reference.eventPackets[i]),b=eventList(ported.eventPackets[i]);out["events"][i?"death":"collision"]={{"d3d11",a.size()},{"d3d12",b.size()},{"equal",a==b}};REQUIRE(a.size()==b.size()&&!a.empty()&&a.size()<1024);float eventDiff=0;for(std::size_t k=0;k<a.size();k++){REQUIRE(a[k][0]==b[k][0]&&a[k][10]==b[k][10]);for(int f=2;f<10;f++){float x,y;std::memcpy(&x,&a[k][f],4);std::memcpy(&y,&b[k][f],4);eventDiff=std::max(eventDiff,std::abs(x-y));}}out["events"][i?"death":"collision"]["maxDiff"]=eventDiff;REQUIRE(eventDiff<=1e-5f);}
    // Emitted births must land exactly once each (40 requests, enough expired slots).
    auto alive=[](const std::vector<float>& v){std::size_t n=0;for(std::size_t i=0;i<v.size();i+=8)n+=v[i+3]<v[i+7];return n;};
    out["alive"]={{"step",alive(ported.states[0])},{"emit",alive(ported.states[1])}};REQUIRE(alive(ported.states[1])==alive(ported.states[0])+40);
    out["maxStateDiff"]=worst;out["validationErrors"]=validationErrors(gpu);REQUIRE(worst<=1e-5f);REQUIRE(out["validationErrors"]==0);return out;
}

int main(){
    try{SetErrorMode(SEM_FAILCRITICALERRORS|SEM_NOGPFAULTERRORBOX);nlohmann::json result;
        try{result["hardware"]=proof(DeviceDriver::Hardware);}catch(const std::exception& e){result["hardware"]["error"]=e.what();}
        try{result["software"]=proof(DeviceDriver::Software);}catch(const std::exception& e){result["software"]["error"]=e.what();}
        result["passed"]=!result["hardware"].contains("error")&&!result["software"].contains("error");std::cout<<result.dump()<<std::endl;return result["passed"]?0:1;
    }catch(const std::exception& e){nlohmann::json failed;failed["passed"]=false;failed["error"]=e.what();std::cout<<failed.dump()<<std::endl;return 1;}
}
