#pragma once
// D3D12 port of hb::gpu::Particles: the same records, validation and kernels (step, clear, interact with events,
// free-slot scan + emit) on a d3d12::Device, with the same 3-deep non-blocking readback rings.
// Work is recorded into the device's current frame (a frame is opened when needed); results become readable after
// that frame is submitted and its fence passes.
#include "D3D12Direct.hpp"
#include "Compute.hpp"
#include "ParticleInteractions.hpp"
#if defined(_WIN32) && !defined(HB_COMPUTE_UNAVAILABLE)
#include <optional>

namespace hb::gpu::d3d12 {
class Particles {
public:
    // Kernels shared by every particle pool of one device (hb::gpu::Particles::Preparation counterpart).
    // ponytail: compiles synchronously through the shared bytecode cache; the async request/poll shape is kept.
    class Preparation {
        friend class Particles;
        struct Kernels {Com<ID3D12RootSignature> root;Com<ID3D12PipelineState> step,clear,freeScan,emit,interaction,events;};
        Device* owner=nullptr;std::shared_ptr<Kernels> kernels;
    public:
        // Same shape as hb::gpu::Particles::Preparation::Info (kernel stages are compiled up front).
        struct Info {std::array<KernelPreparation::Info,4> stages{};bool pending=false,ready=false,cancelled=false;std::string error;};
        explicit Preparation(Device& device):owner(&device),kernels(std::make_shared<Kernels>()){
            const D3D12_DESCRIPTOR_RANGE srv{D3D12_DESCRIPTOR_RANGE_TYPE_SRV,3,0,0,0},uav{D3D12_DESCRIPTOR_RANGE_TYPE_UAV,2,0,0,0};
            D3D12_ROOT_PARAMETER params[3]{};params[0].ParameterType=D3D12_ROOT_PARAMETER_TYPE_CBV;params[1].ParameterType=params[2].ParameterType=D3D12_ROOT_PARAMETER_TYPE_DESCRIPTOR_TABLE;params[1].DescriptorTable={1,&srv};params[2].DescriptorTable={1,&uav};
            D3D12_ROOT_SIGNATURE_DESC rd{};rd.NumParameters=3;rd.pParameters=params;auto& k=*kernels;k.root=device.rootSignature(rd);
            const auto make=[&](const std::string& source,const char* entry){return device.computePipeline(k.root.p,Device::shader(source,"HBCompute",entry,"cs_5_0"));};
            k.step=make(hb::gpu::Particles::source,"Main");k.clear=make(hb::gpu::Particles::source,"Clear");k.freeScan=make(hb::gpu::Particles::freeSource,"Main");k.emit=make(hb::gpu::Particles::emitSource,"Main");
            k.interaction=make(std::string("#define HB_PARTICLE_EVENTS 0\n")+particleInteractionSource,"Main");k.events=make(std::string("#define HB_PARTICLE_EVENTS 1\n")+particleInteractionSource,"Main");
        }
        Info info()const{Info i;i.ready=kernels!=nullptr;i.cancelled=!i.ready;for(auto& stage:i.stages){stage.state=i.ready?"complete":"unused";stage.ready=i.ready;}return i;}
        bool poll(){if(!kernels)throw std::runtime_error("Particle preparation was cancelled or moved");return true;}
        void cancel(){kernels.reset();}
    };
    static Preparation prepare(Device& device){return Preparation(device);}
private:
    static constexpr D3D12_RESOURCE_STATES readable=D3D12_RESOURCE_STATE_NON_PIXEL_SHADER_RESOURCE|D3D12_RESOURCE_STATE_PIXEL_SHADER_RESOURCE;
    // Three readback slots; each remembers the frame ticket whose fence makes it readable.
    struct Ring {std::array<Buffer,3> slots;std::array<std::uint64_t,3> tickets{},sequences{};std::size_t head=0,tail=0,inFlight=0;std::uint64_t serial=0;std::size_t bytes=0;};
    Device& gpu;std::shared_ptr<Preparation::Kernels> kernels;Buffer buffer_;std::size_t count_=0;
    std::optional<Ring> frames,eventFrames;Buffer events,freeIndices,freeCounter,freeCount,requests;std::size_t requestCapacity=0,requestAllocations=0;
    unsigned eventCapacity_=0;std::uint64_t eventDroppedFrames_=0,eventGeneration_=0;
    inline static std::atomic<std::uint64_t> sequence{0};std::uint64_t identity_=++sequence,revision_=0;
    static std::vector<float> empty(std::size_t capacity){if(!capacity||capacity>std::numeric_limits<std::uint32_t>::max()/32)throw std::runtime_error("GPU particle capacity byte size invalid");std::vector<float> values(capacity*8);for(std::size_t i=0;i<capacity;i++)values[i*8+3]=values[i*8+7]=1;return values;}
    void record(){if(!gpu.isRecording())gpu.begin();}
    Buffer storage(std::uint64_t bytes){return gpu.buffer(bytes,D3D12_RESOURCE_STATE_UNORDERED_ACCESS,D3D12_RESOURCE_FLAG_ALLOW_UNORDERED_ACCESS);}
    void write(Buffer& b,const void* data,std::size_t bytes,std::uint64_t offset=0){gpu.update(b,data,bytes,offset);}
    D3D12_SHADER_RESOURCE_VIEW_DESC structured(UINT count,UINT stride)const{D3D12_SHADER_RESOURCE_VIEW_DESC v{};v.Shader4ComponentMapping=D3D12_DEFAULT_SHADER_4_COMPONENT_MAPPING;v.ViewDimension=D3D12_SRV_DIMENSION_BUFFER;v.Buffer.NumElements=count;v.Buffer.StructureByteStride=stride;return v;}
    void uav(const DescriptorTable& t,UINT slot,ID3D12Resource* r,UINT count,UINT stride,ID3D12Resource* counter=nullptr){D3D12_UNORDERED_ACCESS_VIEW_DESC u{};u.ViewDimension=D3D12_UAV_DIMENSION_BUFFER;u.Buffer.NumElements=count;u.Buffer.StructureByteStride=stride;gpu.device->CreateUnorderedAccessView(r,counter,&u,t.cpuAt(slot));}
    // t0..t2 SRVs and u0..u1 UAVs filled by the caller's lambda after null defaults; constants padded like Device::dispatch.
    template<class Views> void dispatch(ID3D12PipelineState* kernel,const std::vector<float>& constants,std::uint32_t groups,Views views){
        gpu.reserveTables(5);auto srvs=gpu.table(3),uavs=gpu.table(2);
        for(UINT i=0;i<3;i++){const auto v=structured(1,4);gpu.device->CreateShaderResourceView(nullptr,&v,srvs.cpuAt(i));}for(UINT i=0;i<2;i++)uav(uavs,i,nullptr,1,4);
        views(srvs,uavs);std::vector<float> padded((std::max<std::size_t>(constants.size(),4)+3)/4*4,0.f);std::copy(constants.begin(),constants.end(),padded.begin());
        auto* list=gpu.list.p;list->SetComputeRootSignature(kernels->root.p);list->SetPipelineState(kernel);list->SetComputeRootConstantBufferView(0,gpu.constants(padded.data(),padded.size()*4));
        list->SetComputeRootDescriptorTable(1,srvs.gpu);list->SetComputeRootDescriptorTable(2,uavs.gpu);list->Dispatch(std::min(groups,65535u),(groups+65534)/65535,1);gpu.keep(buffer_.get());
    }
    std::uint32_t groups()const{return static_cast<std::uint32_t>((count_+63)/64);}
    Ring ring(std::size_t bytes){Ring r;r.bytes=bytes;auto d=D3D12_RESOURCE_DESC{};d.Dimension=D3D12_RESOURCE_DIMENSION_BUFFER;d.Width=bytes;d.Height=1;d.DepthOrArraySize=1;d.MipLevels=1;d.SampleDesc.Count=1;d.Layout=D3D12_TEXTURE_LAYOUT_ROW_MAJOR;
        for(auto& s:r.slots){s.value=gpu.committed(D3D12_HEAP_TYPE_READBACK,d,D3D12_RESOURCE_STATE_COPY_DEST,nullptr,"Direct3D12 particle readback");s.state=D3D12_RESOURCE_STATE_COPY_DEST;s.size=bytes;}return r;}
    bool enqueue(Ring& r,Buffer& source){
        if(r.inFlight==r.slots.size()){return false;}
        record();auto& slot=r.slots[r.tail];const auto restore=source.state;gpu.transition(source,D3D12_RESOURCE_STATE_COPY_SOURCE);gpu.list->CopyBufferRegion(slot.get(),0,source.get(),0,r.bytes);gpu.transition(source,restore);
        r.tickets[r.tail]=gpu.ticket();r.sequences[r.tail]=++r.serial;r.tail=(r.tail+1)%r.slots.size();++r.inFlight;return true;
    }
    std::optional<FrameResult> poll(Ring& r){
        if(!r.inFlight||!gpu.ticketDone(r.tickets[r.head])){return std::nullopt;}
        auto& slot=r.slots[r.head];FrameResult out{r.sequences[r.head],std::vector<float>(r.bytes/4)};void* mapped=nullptr;const D3D12_RANGE range{0,r.bytes};
        check(slot.value->Map(0,&range,&mapped),"Direct3D12 particle readback map");std::memcpy(out.values.data(),mapped,r.bytes);const D3D12_RANGE none{0,0};slot.value->Unmap(0,&none);r.head=(r.head+1)%r.slots.size();--r.inFlight;return out;
    }
    void create(const std::vector<float>& values){
        hb::gpu::Particles::valid(values);record();count_=values.size()/8;buffer_=storage(values.size()*4);write(buffer_,values.data(),values.size()*4);
    }
public:
    Particles(Device& device,const std::vector<float>& values):Particles(device,values,*std::make_unique<Preparation>(device)){}
    Particles(Device& device,std::size_t capacity):Particles(device,empty(capacity)){}
    Particles(Device& device,const std::vector<float>& values,Preparation& prepared):gpu(device),kernels(prepared.kernels){if(!kernels||prepared.owner!=&device)throw std::runtime_error("Particle preparation belongs to another device, was cancelled or moved");create(values);}
    Particles(Device& device,std::size_t capacity,Preparation& prepared):Particles(device,empty(capacity),prepared){}
    Particles(const Particles&)=delete;Particles& operator=(const Particles&)=delete;
    ~Particles(){for(auto* b:{&buffer_,&events,&freeIndices,&freeCounter,&freeCount,&requests})gpu.retire(std::move(b->value));for(auto* r:{&frames,&eventFrames})if(*r)for(auto& s:(*r)->slots)gpu.retire(std::move(s.value));}

    void step(float delta,const std::array<float,3>& force={0,0,0},float gravity=0,float drag=0){
        hb::gpu::Particles::validStep(delta,force,gravity,drag);if(!delta)return;record();
        dispatch(kernels->step.p,{delta,force[0],force[1],force[2],gravity,drag,0,0},groups(),[&](const DescriptorTable&,const DescriptorTable& u){uav(u,0,buffer_.get(),UINT(count_),32);});++revision_;
    }
    void interact(float delta,const std::array<float,3>& force,float gravity,float drag,const ParticleInteraction& c){
        hb::gpu::Particles::validStep(delta,force,gravity,drag);c.validate();const bool withEvents=c.death||c.collision;
        if(!withEvents){resetEvents();if(!c.mode){step(delta,force,gravity,drag);return;}}
        if(!delta){return;}
        record();
        if(withEvents&&(eventCapacity_!=c.capacity||eventGeneration_!=c.generation)){gpu.retire(std::move(events.value));const auto bytes=std::size_t(4+c.capacity*12)*4;events=storage(bytes);std::vector<std::uint32_t> zeros(bytes/4);write(events,zeros.data(),bytes);eventFrames.emplace(ring(bytes));eventCapacity_=c.capacity;eventGeneration_=c.generation;}
        if(withEvents){const std::uint32_t header[4]{};write(events,header,16);}
        const auto length=std::hypot(c.normal[0],c.normal[1],c.normal[2]);float packed;const auto capacity=c.capacity;std::memcpy(&packed,&capacity,4);
        dispatch(withEvents?kernels->events.p:kernels->interaction.p,{delta,force[0],force[1],force[2],gravity,drag,float(c.mode),c.restitution,c.normal[0]/length,c.normal[1]/length,c.normal[2]/length,c.offset,c.friction,packed,c.death?1.f:0.f,c.collision?1.f:0.f,c.time},groups(),
            [&](const DescriptorTable&,const DescriptorTable& u){uav(u,0,buffer_.get(),UINT(count_),32);if(withEvents)uav(u,1,events.get(),UINT(events.size/4),4);});++revision_;
        if(withEvents){D3D12_RESOURCE_BARRIER b{};b.Type=D3D12_RESOURCE_BARRIER_TYPE_UAV;b.UAV.pResource=events.get();gpu.list->ResourceBarrier(1,&b);if(!enqueue(*eventFrames,events))++eventDroppedFrames_;}
    }
    void resetEvents(){if(events.value.p)gpu.retire(std::move(events.value));events.size=0;if(eventFrames)for(auto& s:eventFrames->slots)gpu.retire(std::move(s.value));eventFrames.reset();eventCapacity_=0;}
    std::optional<FrameResult> pollEvents(){return eventFrames?poll(*eventFrames):std::nullopt;}
    unsigned eventCapacity()const{return eventCapacity_;}
    std::uint64_t droppedEventFrames()const{return eventDroppedFrames_;}
    // Births only: scan free slots on the GPU (append counter), copy the count into a typed buffer, then emit.
    void emit(const std::vector<float>& values){
        if(values.empty()){return;}
        hb::gpu::Particles::valid(values);for(std::size_t i=0;i<values.size();i+=8)if(values[i+3]>=values[i+7])throw std::runtime_error("GPU emitted particle is already expired");
        record();
        if(!freeIndices.value.p){freeIndices=storage(count_*4);freeCounter=storage(4);D3D12_RESOURCE_DESC d{};d.Dimension=D3D12_RESOURCE_DIMENSION_BUFFER;d.Width=4;d.Height=1;d.DepthOrArraySize=1;d.MipLevels=1;d.SampleDesc.Count=1;d.Layout=D3D12_TEXTURE_LAYOUT_ROW_MAJOR;freeCount.value=gpu.committed(D3D12_HEAP_TYPE_DEFAULT,d,readable,nullptr,"Direct3D12 particle free count");freeCount.state=readable;freeCount.size=4;}
        const auto births=std::min(values.size()/8,count_);
        if(requestCapacity<births){std::size_t capacity=std::max(std::size_t(1),requestCapacity);while(capacity<births)capacity=std::min(count_,capacity*2);gpu.retire(std::move(requests.value));requests=gpu.buffer(capacity*32,readable,D3D12_RESOURCE_FLAG_NONE);requestCapacity=capacity;++requestAllocations;}
        write(requests,values.data(),births*32);const std::uint32_t zero=0;write(freeCounter,&zero,4);
        gpu.transition(buffer_,readable);
        dispatch(kernels->freeScan.p,{},groups(),[&](const DescriptorTable& s,const DescriptorTable& u){const auto v=structured(UINT(count_),32);gpu.device->CreateShaderResourceView(buffer_.get(),&v,s.cpuAt(0));uav(u,0,freeIndices.get(),UINT(count_),4,freeCounter.get());});
        gpu.transition(freeCounter,D3D12_RESOURCE_STATE_COPY_SOURCE);gpu.transition(freeCount,D3D12_RESOURCE_STATE_COPY_DEST);gpu.list->CopyBufferRegion(freeCount.get(),0,freeCounter.get(),0,4);gpu.transition(freeCount,readable);gpu.transition(freeCounter,D3D12_RESOURCE_STATE_UNORDERED_ACCESS);
        gpu.transition(freeIndices,readable);gpu.transition(buffer_,D3D12_RESOURCE_STATE_UNORDERED_ACCESS);const auto requestCount=static_cast<std::uint32_t>(births);float packed;std::memcpy(&packed,&requestCount,4);
        dispatch(kernels->emit.p,{packed},static_cast<std::uint32_t>((births+63)/64),[&](const DescriptorTable& s,const DescriptorTable& u){
            auto v=structured(UINT(count_),4);gpu.device->CreateShaderResourceView(freeIndices.get(),&v,s.cpuAt(0));v=structured(UINT(requestCapacity),32);gpu.device->CreateShaderResourceView(requests.get(),&v,s.cpuAt(1));
            D3D12_SHADER_RESOURCE_VIEW_DESC typed{};typed.Shader4ComponentMapping=D3D12_DEFAULT_SHADER_4_COMPONENT_MAPPING;typed.ViewDimension=D3D12_SRV_DIMENSION_BUFFER;typed.Format=DXGI_FORMAT_R32_UINT;typed.Buffer.NumElements=1;gpu.device->CreateShaderResourceView(freeCount.get(),&typed,s.cpuAt(2));
            uav(u,0,buffer_.get(),UINT(count_),32);});
        gpu.transition(freeIndices,D3D12_RESOURCE_STATE_UNORDERED_ACCESS);++revision_;
    }
    void clear(){resetEvents();record();dispatch(kernels->clear.p,{},groups(),[&](const DescriptorTable&,const DescriptorTable& u){uav(u,0,buffer_.get(),UINT(count_),32);});frames.reset();++revision_;}
    void reset(const std::vector<float>& values){hb::gpu::Particles::valid(values);if(values.size()!=count_*8)throw std::runtime_error("Compute upload size mismatch");record();write(buffer_,values.data(),values.size()*4);frames.reset();resetEvents();++revision_;}
    // Blocking read: submits the current frame and waits (tests/tools only).
    std::vector<float> read(){Ring r=ring(count_*32);enqueue(r,buffer_);gpu.end();gpu.waitIdle();auto out=poll(r);for(auto& s:r.slots)gpu.retire(std::move(s.value));if(!out)throw std::runtime_error("Direct3D12 particle read incomplete");return out->values;}
    bool enqueueReadback(){if(!frames)frames.emplace(ring(count_*32));return enqueue(*frames,buffer_);}
    std::optional<FrameResult> pollReadback(){return frames?poll(*frames):std::nullopt;}
    std::size_t pendingReadbacks()const{return frames?frames->inFlight:0;}
    std::size_t emissionBufferAllocations()const{return requestAllocations;}
    std::uint64_t storageBytes()const{return buffer_.size+freeIndices.size+freeCount.size+requests.size+events.size*4;}
    std::uint64_t revision()const{return revision_;}std::uint64_t identityId()const{return identity_;}
    std::size_t count()const{return count_;}
    // Renderer access: the record buffer and its state (SceneMeshRenderer::drawParticles reads it as an SRV).
    Buffer& records(){return buffer_;}const Buffer& records()const{return buffer_;}
};
}
#endif
