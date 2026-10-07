#include <HBEngine/Compute.hpp>
#include <nlohmann/json.hpp>
#include <cassert>
#include <chrono>
#include <iostream>
#include <thread>

using Clock=std::chrono::steady_clock;
template<class F> void rejects(F&& fn){bool threw=false;try{fn();}catch(const std::exception&){threw=true;}assert(threw);}
int main(){
#ifdef HB_COMPUTE_UNAVAILABLE
    assert(!hb::gpu::Device::available());rejects([]{hb::gpu::Device gpu;});std::cout<<"{\"unavailableGuard\":true}";return 0;
#else
    hb::gpu::Device gpu;
    auto buffer=gpu.create({1,2,3,4});auto add=gpu.compile("RWStructuredBuffer<float> values:register(u0);cbuffer Params:register(b0){float amount;float3 unused;}[numthreads(64,1,1)]void Main(uint3 id:SV_DispatchThreadID){uint count,stride;values.GetDimensions(count,stride);if(id.x<count)values[id.x]+=amount;}");
    gpu.dispatch(add,{&buffer},1,1,1,{}, {2});assert(gpu.read(buffer)==std::vector<float>({3,4,5,6}));gpu.upload(buffer,{4,3,2,1});gpu.dispatch(add,{&buffer},1,1,1,{}, {3});assert(gpu.read(buffer)==std::vector<float>({7,6,5,4}));
    rejects([&]{gpu.create({});});rejects([&]{gpu.create({1,2,3},8);});rejects([&]{gpu.upload(buffer,{1});});rejects([&]{gpu.compile("invalid shader");});rejects([&]{gpu.dispatch(add,{&buffer},0);});rejects([&]{gpu.dispatch(add,{&buffer,&buffer},1);});rejects([&]{gpu.dispatch(add,{&buffer},1,1,1,{&buffer});});hb::gpu::Device other;rejects([&]{other.read(buffer);});rejects([&]{other.dispatch(add,{&buffer},1);});
    auto output=gpu.create({0,0,0,0});auto copy=gpu.compile("StructuredBuffer<float> src:register(t0);RWStructuredBuffer<float> dst:register(u0);[numthreads(64,1,1)]void Main(uint3 id:SV_DispatchThreadID){uint count,stride;dst.GetDimensions(count,stride);if(id.x<count)dst[id.x]=src[id.x]*2;}");gpu.dispatch(copy,{&output},1,1,1,{&buffer});assert(gpu.read(output)==std::vector<float>({14,12,10,8}));
    auto frames=gpu.createFrameResources(buffer);assert(!gpu.pollFrame(frames));assert(frames.pending()==0);rejects([&]{other.pollFrame(frames);});rejects([&]{other.enqueueFrame(frames,buffer);});auto wrongSize=gpu.create({0,0});rejects([&]{gpu.enqueueFrame(frames,wrongSize);});
    for(int i=0;i<3;i++){gpu.dispatch(add,{&buffer},1,1,1,{}, {1});assert(gpu.enqueueFrame(frames,buffer));}assert(frames.pending()==3);assert(!gpu.enqueueFrame(frames,buffer));assert(add.constantBufferAllocations()==3);
    const auto deadline=Clock::now()+std::chrono::seconds(3);int collected=0;std::size_t pollCalls=0;double maximumPollMs=0;
    while(collected<3){assert(Clock::now()<deadline);const auto start=Clock::now();const auto result=gpu.pollFrame(frames);maximumPollMs=std::max(maximumPollMs,std::chrono::duration<double,std::milli>(Clock::now()-start).count());++pollCalls;if(result){++collected;assert(result->sequence==std::uint64_t(collected));assert(result->values==std::vector<float>({7.f+collected,6.f+collected,5.f+collected,4.f+collected}));}else std::this_thread::sleep_for(std::chrono::milliseconds(1));}
    assert(frames.pending()==0);gpu.dispatch(add,{&buffer},1,1,1,{}, {2});assert(gpu.enqueueFrame(frames,buffer));while(frames.pending()){assert(Clock::now()<deadline);if(auto result=gpu.pollFrame(frames)){assert(result->sequence==4);assert(result->values[0]==12);}else std::this_thread::sleep_for(std::chrono::milliseconds(1));}assert(add.constantBufferAllocations()==3);
    constexpr std::size_t count=65537;constexpr int steps=20;constexpr float dt=1.f/120,drag=.3f,gravity=.2f;
    const std::array<float,3> force{.2f,.1f,-.05f};std::vector<float> initial(count*8);for(std::size_t i=0;i<count;i++){initial[i*8]=float(i%17)*.01f;initial[i*8+4]=2;initial[i*8+5]=-1;initial[i*8+6]=.5f;initial[i*8+7]=300;}
    hb::gpu::Particles particles(gpu,initial);assert(particles.count()==count);rejects([&]{particles.step(-1);});rejects([&]{particles.reset({1});});std::vector<double> cpuMs,gpuMs,perFrameGpuMs;double maximumError=0;
    for(int round=-1;round<3;round++){
        auto start=Clock::now();auto cpu=initial;const float f[3]={force[0],force[1]-9.81f*gravity,force[2]},half=dt*dt*.5f,decay=std::exp(-drag*dt);for(int step=0;step<steps;step++)for(std::size_t i=0;i<count;i++){auto* p=cpu.data()+i*8;for(int a=0;a<3;a++){p[a]+=p[a+4]*dt+f[a]*half;p[a+4]=(p[a+4]+f[a]*dt)*decay;}p[3]+=dt;}const auto cpuTime=std::chrono::duration<double,std::milli>(Clock::now()-start).count();
        start=Clock::now();particles.reset(initial);for(int step=0;step<steps;step++)particles.step(dt,force,gravity,drag);const auto values=particles.read();const auto gpuTime=std::chrono::duration<double,std::milli>(Clock::now()-start).count();for(std::size_t i=0;i<values.size();i++){maximumError=std::max(maximumError,double(std::abs(values[i]-cpu[i])));assert(std::abs(values[i]-cpu[i])<.001f);}if(round>=0){cpuMs.push_back(cpuTime);gpuMs.push_back(gpuTime);}
    }
    // The current WebGL renderer needs CPU positions. Measure that boundary too,
    // rather than reporting the resident batch time as game FPS.
    for(int round=-1;round<3;round++){particles.reset(initial);auto start=Clock::now();for(int step=0;step<steps;step++){particles.step(dt,force,gravity,drag);auto values=particles.read();assert(values.size()==initial.size());}const auto elapsed=std::chrono::duration<double,std::milli>(Clock::now()-start).count();if(round>=0)perFrameGpuMs.push_back(elapsed);}
    auto dying=initial;dying[7]=dt/2;hb::gpu::Particles shortLife(gpu,dying);shortLife.step(dt,force,gravity,drag);auto first=shortLife.read();shortLife.step(dt,force,gravity,drag);auto second=shortLife.read();assert(first[0]==second[0]&&first[3]==second[3]);
    assert(particles.constantBufferAllocations()==3);assert(shortLife.enqueueReadback());assert(shortLife.pendingReadbacks()==1);shortLife.reset(dying);assert(shortLife.pendingReadbacks()==0);assert(!shortLife.pollReadback());
    std::cout<<nlohmann::json{{"passed",true},{"hardwareBackend",gpu.backend()},{"particles",count},{"stepsPerBatch",steps},{"cpuMs",cpuMs},{"gpuUploadDispatchReadbackMs",gpuMs},{"gpuDispatchReadbackEveryStepMs",perFrameGpuMs},{"maximumError",maximumError},{"readbackPerBatch",1},{"allValuesCompared",true},{"partialLastWorkgroup",true},{"frameResources",{{"slots",frames.capacity()},{"fifoSnapshots",4},{"busyQueuePreserved",true},{"reuseAllocations",add.constantBufferAllocations()},{"pollCalls",pollCalls},{"maxPollMs",maximumPollMs},{"resetDiscardsOldSnapshots",true}}}}.dump();
#endif
}
