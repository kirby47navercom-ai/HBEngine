#pragma once
// Native Direct3D12 core (phase 1 of the D3D12 port). Unlike D3D12Interop.hpp this
// records real ID3D12GraphicsCommandList work; nothing goes through D3D11On12.
#include "D3D12Interop.hpp"
#include "D3DDevice.hpp"
#include "ShaderBytecodeCompiler.hpp"
#if defined(_WIN32) && !defined(HB_COMPUTE_UNAVAILABLE)
#include <d3d12sdklayers.h>
#include <dxgi1_5.h>
#include <memory>
#include <unordered_map>

namespace hb::gpu::d3d12 {
using detail::Com;using detail::check;

inline constexpr UINT FrameCount=3,SamplerCapacity=2048;

// A GPU resource plus the state the next barrier must start from.
struct Resource {
    Com<ID3D12Resource> value;D3D12_RESOURCE_STATES state=D3D12_RESOURCE_STATE_COMMON;
    ID3D12Resource* get()const{return value.p;}
};
struct Texture : Resource {UINT width=0,height=0;DXGI_FORMAT format=DXGI_FORMAT_UNKNOWN;D3D12_CPU_DESCRIPTOR_HANDLE rtv{},dsv{};};
struct Buffer : Resource {std::uint64_t size=0;D3D12_GPU_VIRTUAL_ADDRESS address()const{return value->GetGPUVirtualAddress();}};
struct Upload {unsigned char* cpu=nullptr;D3D12_GPU_VIRTUAL_ADDRESS gpu=0;ID3D12Resource* resource=nullptr;std::uint64_t offset=0;};
struct DescriptorTable {D3D12_CPU_DESCRIPTOR_HANDLE cpu{};D3D12_GPU_DESCRIPTOR_HANDLE gpu{};UINT stride=0;
    D3D12_CPU_DESCRIPTOR_HANDLE cpuAt(UINT i)const{return {cpu.ptr+SIZE_T(i)*stride};}};

// CPU-only descriptors are copied into command lists or shader-visible tables at record time.
class DescriptorPool {
    struct Page {
        Com<ID3D12DescriptorHeap> heap;
        D3D12_CPU_DESCRIPTOR_HANDLE start{};
        UINT next=0,live=0;
        std::vector<UINT> free;
    };
    ID3D12Device* owner=nullptr;
    D3D12_DESCRIPTOR_HEAP_TYPE type=D3D12_DESCRIPTOR_HEAP_TYPE_RTV;
    UINT stride=0,capacity=0;
    std::vector<Page> pages;
    void append(){
        D3D12_DESCRIPTOR_HEAP_DESC desc{};desc.Type=type;desc.NumDescriptors=capacity;
        Page page;
        check(owner->CreateDescriptorHeap(&desc,__uuidof(ID3D12DescriptorHeap),reinterpret_cast<void**>(&page.heap.p)),"Direct3D12 CPU descriptor page");
        page.start=page.heap->GetCPUDescriptorHandleForHeapStart();
        page.free.reserve(capacity);
        pages.push_back(std::move(page));
    }
public:
    void create(ID3D12Device* device,D3D12_DESCRIPTOR_HEAP_TYPE kind,UINT count){
        owner=device;type=kind;capacity=count;stride=device->GetDescriptorHandleIncrementSize(type);
        append();
    }
    D3D12_CPU_DESCRIPTOR_HANDLE take(){
        auto found=std::find_if(pages.begin(),pages.end(),[this](const Page& page){return !page.free.empty()||page.next<capacity;});
        if(found==pages.end()){append();found=std::prev(pages.end());}
        auto& page=*found;
        UINT slot;
        if(page.free.empty())slot=page.next++;
        else{slot=page.free.back();page.free.pop_back();}
        ++page.live;
        return {page.start.ptr+SIZE_T(slot)*stride};
    }
    void give(D3D12_CPU_DESCRIPTOR_HANDLE handle){
        if(!handle.ptr)return;
        const auto found=std::find_if(pages.begin(),pages.end(),[&](const Page& page){
            return handle.ptr>=page.start.ptr&&handle.ptr-page.start.ptr<SIZE_T(page.next)*stride;
        });
        if(found==pages.end())return;
        if(--found->live==0){
            found->free.clear();found->next=0;
            if(found!=pages.begin())pages.erase(found);
        }else found->free.push_back(UINT((handle.ptr-found->start.ptr)/stride));
    }
    std::size_t pageCount()const{return pages.size();}
};

class Device {
    struct Frame {
        Com<ID3D12CommandAllocator> allocator;
        std::uint64_t fence=0;
        std::vector<Com<ID3D12Resource>> retired;
        std::vector<Com<IUnknown>> objects;
        std::unordered_map<IUnknown*,std::uint64_t> retained;
        std::vector<Com<ID3D12DescriptorHeap>> descriptorPages;
        Com<ID3D12DescriptorHeap> cachedPage;
        bool usedCachedPage=false;
        std::uint64_t retainedSweep=0;
    };
    HANDLE event=nullptr;std::array<Frame,FrameCount> frames;UINT frame=0;std::uint64_t serial=0;bool recording=false;
    // Frame tickets: begin() numbers each recording; end() remembers the fence value that completes it.
    std::uint64_t recordingId=0;
    std::array<std::pair<std::uint64_t,std::uint64_t>,64> submittedTickets{};
    std::size_t nextTicket=0;
    std::uint64_t latestSubmittedTicket=0;
    // Upload ring: one persistently mapped slice per frame in flight. Requests that do
    // not fit get their own buffer, released once that frame's fence passes.
    Com<ID3D12Resource> ring;unsigned char* ringCPU=nullptr;std::uint64_t slice=0,used=0;
    Com<ID3D12DescriptorHeap> shaderHeap;
    ID3D12DescriptorHeap* activeShaderHeap=nullptr;
    UINT shaderStride=0,shaderSlice=0,shaderUsed=0,shaderCapacity=0,shaderOffset=0;
    static constexpr UINT descriptorPageSize=65536;
    std::uint64_t overflowPages=0,reusedPages=0;
    Com<ID3D12DescriptorHeap> createShaderHeap(UINT count){
        D3D12_DESCRIPTOR_HEAP_DESC desc{};
        desc.Type=D3D12_DESCRIPTOR_HEAP_TYPE_CBV_SRV_UAV;
        desc.NumDescriptors=count;desc.Flags=D3D12_DESCRIPTOR_HEAP_FLAG_SHADER_VISIBLE;
        Com<ID3D12DescriptorHeap> heap;
        check(device->CreateDescriptorHeap(&desc,__uuidof(ID3D12DescriptorHeap),reinterpret_cast<void**>(&heap.p)),"Direct3D12 shader descriptor heap");
        return heap;
    }
    void bindShaderHeap(ID3D12DescriptorHeap* heap,UINT capacity,UINT offset){
        activeShaderHeap=heap;shaderCapacity=capacity;shaderOffset=offset;shaderUsed=0;
        ID3D12DescriptorHeap* heaps[]={heap,samplers.p};
        list->SetDescriptorHeaps(2,heaps);
    }
    void wait(std::uint64_t value){
        if(!value||fence->GetCompletedValue()>=value)return;
        check(fence->SetEventOnCompletion(value,event),"Direct3D12 frame fence event");
        // WARP JIT-compiles shaders on the GPU timeline at first draw; large scene shaders take seconds.
        if(WaitForSingleObject(event,software?120000:10000)!=WAIT_OBJECT_0)throw std::runtime_error("Direct3D12 frame fence timeout");
    }
    static D3D12_RESOURCE_DESC bufferDesc(std::uint64_t size){D3D12_RESOURCE_DESC d{};d.Dimension=D3D12_RESOURCE_DIMENSION_BUFFER;d.Width=size;d.Height=1;d.DepthOrArraySize=1;d.MipLevels=1;d.SampleDesc.Count=1;d.Layout=D3D12_TEXTURE_LAYOUT_ROW_MAJOR;return d;}
    void requireRecording()const{if(!recording)throw std::runtime_error("Direct3D12 work recorded outside begin/end");}
public:
    Com<ID3D12Resource> committed(D3D12_HEAP_TYPE heapType,const D3D12_RESOURCE_DESC& desc,D3D12_RESOURCE_STATES state,const D3D12_CLEAR_VALUE* clear,const char* action){
        D3D12_HEAP_PROPERTIES heap{};heap.Type=heapType;Com<ID3D12Resource> out;
        check(device->CreateCommittedResource(&heap,D3D12_HEAP_FLAG_NONE,&desc,state,clear,__uuidof(ID3D12Resource),reinterpret_cast<void**>(&out.p)),action);return out;
    }
    Com<IDXGIFactory4> factory;Com<ID3D12Device> device;Com<ID3D12CommandQueue> queue;Com<ID3D12Fence> fence;Com<ID3D12GraphicsCommandList> list;
    // Shader-visible sampler heap; callers own its slot allocation (SceneMeshRenderer caches tables).
    Com<ID3D12DescriptorHeap> samplers;UINT samplerStride=0;
    DescriptorPool rtvs,dsvs;bool software=false,debug=false;
    DXGI_ADAPTER_DESC1 adapter{};

    explicit Device(DeviceDriver driver=DeviceDriver::Automatic,bool validation=false,std::uint64_t uploadBytesPerFrame=8u<<20,UINT descriptorsPerFrame=16384){
        auto& dll=detail::libraries();auto& dll12=detail::libraries12();
        if(validation){
            Com<ID3D12Debug> layer;const auto getDebug=dll.symbol<decltype(&D3D12GetDebugInterface)>(dll12.d3d,"D3D12GetDebugInterface");
            if(SUCCEEDED(getDebug(__uuidof(ID3D12Debug),reinterpret_cast<void**>(&layer.p)))){layer->EnableDebugLayer();debug=true;}
        }
        const auto create=dll.symbol<decltype(&D3D12CreateDevice)>(dll12.d3d,"D3D12CreateDevice");const auto createFactory=dll.symbol<decltype(&CreateDXGIFactory2)>(dll12.dxgi,"CreateDXGIFactory2");
        check(createFactory(0,__uuidof(IDXGIFactory4),reinterpret_cast<void**>(&factory.p)),"Direct3D12 DXGI factory");
        HRESULT hardware=E_FAIL;
        if(driver!=DeviceDriver::Software){
            for(UINT index=0;;++index){
                Com<IDXGIAdapter1> candidate;
                if(FAILED(factory->EnumAdapters1(index,&candidate.p)))break;
                DXGI_ADAPTER_DESC1 info{};
                if(FAILED(candidate->GetDesc1(&info))||(info.Flags&DXGI_ADAPTER_FLAG_SOFTWARE))continue;
                hardware=create(candidate.p,D3D_FEATURE_LEVEL_11_0,__uuidof(ID3D12Device),reinterpret_cast<void**>(&device.p));
                if(SUCCEEDED(hardware)){adapter=info;break;}
            }
            if(!device.p&&driver==DeviceDriver::Hardware)check(hardware,"Direct3D12 hardware device");
        }
        if(!device.p){
            Com<IDXGIAdapter> warp;check(factory->EnumWarpAdapter(__uuidof(IDXGIAdapter),reinterpret_cast<void**>(&warp.p)),"Direct3D12 WARP adapter");
            const auto result=create(warp.p,D3D_FEATURE_LEVEL_11_0,__uuidof(ID3D12Device),reinterpret_cast<void**>(&device.p));
            if(FAILED(result))throw std::runtime_error("Direct3D12 device creation failed: hardware HRESULT "+std::to_string(static_cast<unsigned long>(hardware))+", WARP HRESULT "+std::to_string(static_cast<unsigned long>(result)));
            software=true;
            Com<IDXGIAdapter1> adapter1;
            if(SUCCEEDED(warp->QueryInterface(__uuidof(IDXGIAdapter1),reinterpret_cast<void**>(&adapter1.p))))adapter1->GetDesc1(&adapter);
        }
        D3D12_COMMAND_QUEUE_DESC q{};q.Type=D3D12_COMMAND_LIST_TYPE_DIRECT;
        check(device->CreateCommandQueue(&q,__uuidof(ID3D12CommandQueue),reinterpret_cast<void**>(&queue.p)),"Direct3D12 command queue");
        check(device->CreateFence(0,D3D12_FENCE_FLAG_NONE,__uuidof(ID3D12Fence),reinterpret_cast<void**>(&fence.p)),"Direct3D12 frame fence");
        for(auto& f:frames)check(device->CreateCommandAllocator(D3D12_COMMAND_LIST_TYPE_DIRECT,__uuidof(ID3D12CommandAllocator),reinterpret_cast<void**>(&f.allocator.p)),"Direct3D12 command allocator");
        check(device->CreateCommandList(0,D3D12_COMMAND_LIST_TYPE_DIRECT,frames[0].allocator.p,nullptr,__uuidof(ID3D12GraphicsCommandList),reinterpret_cast<void**>(&list.p)),"Direct3D12 command list");
        check(list->Close(),"Direct3D12 initial command list close");
        slice=(uploadBytesPerFrame+65535)&~std::uint64_t(65535);
        ring=committed(D3D12_HEAP_TYPE_UPLOAD,bufferDesc(slice*FrameCount),D3D12_RESOURCE_STATE_GENERIC_READ,nullptr,"Direct3D12 upload ring");
        D3D12_RANGE none{0,0};check(ring->Map(0,&none,reinterpret_cast<void**>(&ringCPU)),"Direct3D12 upload ring map");
        if(!descriptorsPerFrame||descriptorsPerFrame>D3D12_MAX_SHADER_VISIBLE_DESCRIPTOR_HEAP_SIZE_TIER_1/FrameCount)
            throw std::runtime_error("Direct3D12 frame descriptor slice size");
        shaderHeap=createShaderHeap(descriptorsPerFrame*FrameCount);
        D3D12_DESCRIPTOR_HEAP_DESC h{};h.Flags=D3D12_DESCRIPTOR_HEAP_FLAG_SHADER_VISIBLE;
        shaderStride=device->GetDescriptorHandleIncrementSize(D3D12_DESCRIPTOR_HEAP_TYPE_CBV_SRV_UAV);shaderSlice=descriptorsPerFrame;
        h.Type=D3D12_DESCRIPTOR_HEAP_TYPE_SAMPLER;h.NumDescriptors=SamplerCapacity;
        check(device->CreateDescriptorHeap(&h,__uuidof(ID3D12DescriptorHeap),reinterpret_cast<void**>(&samplers.p)),"Direct3D12 sampler heap");samplerStride=device->GetDescriptorHandleIncrementSize(D3D12_DESCRIPTOR_HEAP_TYPE_SAMPLER);
        rtvs.create(device.p,D3D12_DESCRIPTOR_HEAP_TYPE_RTV,256);dsvs.create(device.p,D3D12_DESCRIPTOR_HEAP_TYPE_DSV,64);
        event=CreateEventW(nullptr,FALSE,FALSE,nullptr);if(!event)throw std::runtime_error("Direct3D12 fence event creation failed");
    }
    ~Device(){try{waitIdle();}catch(...){}if(ring.p)ring->Unmap(0,nullptr);if(event)CloseHandle(event);}
    Device(const Device&)=delete;Device& operator=(const Device&)=delete;

    UINT frameIndex()const{return frame;}
    bool isRecording()const{return recording;}
    // Ticket of the frame being recorded; ticketDone() turns true once that frame was submitted and its fence passed.
    std::uint64_t ticket()const{requireRecording();return recordingId;}
    bool ticketDone(std::uint64_t id)const{
        if(!id||id>latestSubmittedTicket)return false;
        if(latestSubmittedTicket-id>=submittedTickets.size())return true;
        const auto index=(nextTicket+submittedTickets.size()-1-(latestSubmittedTicket-id))%submittedTickets.size();
        const auto& ticket=submittedTickets[index];
        return ticket.first==id&&fence->GetCompletedValue()>=ticket.second;
    }
    std::size_t retainedObjects()const{return recording?frames[frame].objects.size():0;}
    std::uint64_t submitted()const{return serial;}
    void begin(){
        if(recording)throw std::runtime_error("Direct3D12 frame already recording");
        auto& f=frames[frame];wait(f.fence);f.retired.clear();f.objects.clear();f.descriptorPages.clear();used=0;
        if(f.retained.size()>4096&&recordingId-f.retainedSweep>=64){
            f.retainedSweep=recordingId;
            for(auto i=f.retained.begin();i!=f.retained.end();){
                if(recordingId-i->second>FrameCount*4)i=f.retained.erase(i);else ++i;
            }
        }
        if(!f.usedCachedPage)f.cachedPage={};
        f.usedCachedPage=false;
        check(f.allocator->Reset(),"Direct3D12 command allocator reset");check(list->Reset(f.allocator.p,nullptr),"Direct3D12 command list reset");
        bindShaderHeap(shaderHeap.p,shaderSlice,frame*shaderSlice);recording=true;++recordingId;
    }
    void end(){
        requireRecording();check(list->Close(),"Direct3D12 command list close");recording=false;
        ID3D12CommandList* lists[]={list.p};queue->ExecuteCommandLists(1,lists);
        frames[frame].fence=++serial;check(queue->Signal(fence.p,serial),"Direct3D12 frame signal");frame=(frame+1)%FrameCount;
        submittedTickets[nextTicket]={recordingId,serial};nextTicket=(nextTicket+1)%submittedTickets.size();latestSubmittedTicket=recordingId;
    }
    void waitIdle(){
        if(!queue.p)return;
        check(queue->Signal(fence.p,++serial),"Direct3D12 idle signal");wait(serial);
        // ResizeBuffers requires every old back buffer reference to be released.
        // Submitted frames are complete here. Unsubmitted work still owns its resources.
        if(!recording)for(auto& submitted:frames){submitted.retired.clear();submitted.objects.clear();submitted.retained.clear();submitted.descriptorPages.clear();submitted.cachedPage={};submitted.usedCachedPage=false;}
    }

    Upload upload(std::uint64_t size,std::uint64_t alignment=256){
        requireRecording();if(!size)throw std::runtime_error("Direct3D12 empty upload");
        const auto at=(used+alignment-1)/alignment*alignment;
        if(at+size<=slice){used=at+size;const auto offset=slice*frame+at;return {ringCPU+offset,ring->GetGPUVirtualAddress()+offset,ring.p,offset};}
        auto own=committed(D3D12_HEAP_TYPE_UPLOAD,bufferDesc(size),D3D12_RESOURCE_STATE_GENERIC_READ,nullptr,"Direct3D12 large upload");
        unsigned char* cpu=nullptr;D3D12_RANGE none{0,0};check(own->Map(0,&none,reinterpret_cast<void**>(&cpu)),"Direct3D12 large upload map");
        Upload result{cpu,own->GetGPUVirtualAddress(),own.p,0};frames[frame].retired.push_back(std::move(own));return result;
    }
    D3D12_GPU_VIRTUAL_ADDRESS constants(const void* data,std::uint64_t size){auto u=upload(size,256);std::memcpy(u.cpu,data,size);return u.gpu;}
    // Reserve all tables for a draw or dispatch before binding any. A heap change invalidates root tables.
    void reserveTables(UINT count){
        requireRecording();
        if(!count||count>D3D12_MAX_SHADER_VISIBLE_DESCRIPTOR_HEAP_SIZE_TIER_1)throw std::runtime_error("Direct3D12 descriptor group size");
        if(count<=shaderCapacity-shaderUsed)return;
        auto& current=frames[frame];
        if(count<=descriptorPageSize&&!current.usedCachedPage){
            if(current.cachedPage.p)++reusedPages;
            else current.cachedPage=createShaderHeap(descriptorPageSize);
            current.usedCachedPage=true;
            bindShaderHeap(current.cachedPage.p,descriptorPageSize,0);
        }else{
            const auto capacity=std::max(count,descriptorPageSize);
            auto& pages=current.descriptorPages;
            pages.push_back(createShaderHeap(capacity));
            bindShaderHeap(pages.back().p,capacity,0);
        }
        ++overflowPages;
    }
    DescriptorTable table(UINT count){
        reserveTables(count);
        const UINT at=shaderOffset+shaderUsed;shaderUsed+=count;
        DescriptorTable t;
        t.cpu={activeShaderHeap->GetCPUDescriptorHandleForHeapStart().ptr+SIZE_T(at)*shaderStride};
        t.gpu={activeShaderHeap->GetGPUDescriptorHandleForHeapStart().ptr+UINT64(at)*shaderStride};
        t.stride=shaderStride;
        return t;
    }
    std::uint64_t descriptorOverflowPages()const{return overflowPages;}
    std::uint64_t descriptorReusedPages()const{return reusedPages;}
    void transition(Resource& r,D3D12_RESOURCE_STATES next){
        requireRecording();if(r.state==next)return;
        D3D12_RESOURCE_BARRIER b{};b.Type=D3D12_RESOURCE_BARRIER_TYPE_TRANSITION;b.Transition.pResource=r.get();b.Transition.Subresource=D3D12_RESOURCE_BARRIER_ALL_SUBRESOURCES;b.Transition.StateBefore=r.state;b.Transition.StateAfter=next;
        list->ResourceBarrier(1,&b);r.state=next;
    }
    // Holds an extra reference until the recording frame's fence passes, so callers may drop objects whose
    // resources are still referenced by submitted work (D3D11 deferred-destruction semantics).
    void keep(IUnknown* object){
        if(!object||!recording)return;
        auto& frameState=frames[frame];
        auto [entry,inserted]=frameState.retained.try_emplace(object,recordingId);
        if(!inserted&&entry->second==recordingId)return;
        entry->second=recordingId;
        object->AddRef();Com<IUnknown> held;held.p=object;frameState.objects.push_back(std::move(held));
    }
    // Keeps a resource alive until the GPU finishes the frame currently recording.
    void retire(Com<ID3D12Resource>&& r){if(r.p)frames[recording?frame:(frame+FrameCount-1)%FrameCount].retired.push_back(std::move(r));}

    Buffer buffer(const void* data,std::uint64_t size,D3D12_RESOURCE_STATES finalState=D3D12_RESOURCE_STATE_VERTEX_AND_CONSTANT_BUFFER|D3D12_RESOURCE_STATE_INDEX_BUFFER){
        requireRecording();Buffer b;b.size=size;b.value=committed(D3D12_HEAP_TYPE_DEFAULT,bufferDesc(size),D3D12_RESOURCE_STATE_COMMON,nullptr,"Direct3D12 buffer");b.state=D3D12_RESOURCE_STATE_COMMON;
        if(data){auto u=upload(size,4);std::memcpy(u.cpu,data,size);transition(b,D3D12_RESOURCE_STATE_COPY_DEST);list->CopyBufferRegion(b.get(),0,u.resource,u.offset,size);keep(b.get());}
        transition(b,finalState);return b;
    }
    // In-place buffer update ordered on the queue (like D3D11 UpdateSubresource): earlier draws read the old bytes.
    void update(Buffer& b,const void* data,std::uint64_t size,std::uint64_t offset=0){
        if(!size){return;}
        if(offset+size>b.size)throw std::runtime_error("Direct3D12 buffer update out of range");
        auto u=upload(size,4);std::memcpy(u.cpu,data,size);const auto restore=b.state;transition(b,D3D12_RESOURCE_STATE_COPY_DEST);list->CopyBufferRegion(b.get(),offset,u.resource,u.offset,size);keep(b.get());transition(b,restore);
    }
    Buffer buffer(std::uint64_t size,D3D12_RESOURCE_STATES state,D3D12_RESOURCE_FLAGS flags){
        auto d=bufferDesc(size);d.Flags=flags;Buffer b;b.size=size;b.value=committed(D3D12_HEAP_TYPE_DEFAULT,d,state,nullptr,"Direct3D12 buffer");b.state=state;return b;
    }
    // Writes one w x h box of a texture subresource (tightly packed rows), ordered on the queue like UpdateSubresource.
    void updateTexture(Texture& t,UINT subresource,UINT x,UINT y,UINT w,UINT h,const void* data,UINT rowBytes,UINT sourcePitch=0){
        requireRecording();if(!w||!h||!data)throw std::runtime_error("Direct3D12 texture update box empty");const auto desc=t.get()->GetDesc();
        const UINT pitch=(rowBytes+D3D12_TEXTURE_DATA_PITCH_ALIGNMENT-1)&~(D3D12_TEXTURE_DATA_PITCH_ALIGNMENT-1);auto u=upload(std::uint64_t(pitch)*h,D3D12_TEXTURE_DATA_PLACEMENT_ALIGNMENT);
        for(UINT row=0;row<h;row++)std::memcpy(u.cpu+std::size_t(row)*pitch,static_cast<const unsigned char*>(data)+std::size_t(row)*(sourcePitch?sourcePitch:rowBytes),rowBytes);
        D3D12_TEXTURE_COPY_LOCATION dst{},src{};dst.pResource=t.get();dst.Type=D3D12_TEXTURE_COPY_TYPE_SUBRESOURCE_INDEX;dst.SubresourceIndex=subresource;src.pResource=u.resource;src.Type=D3D12_TEXTURE_COPY_TYPE_PLACED_FOOTPRINT;src.PlacedFootprint.Offset=u.offset;src.PlacedFootprint.Footprint={desc.Format,w,h,1,pitch};
        const auto restore=t.state;transition(t,D3D12_RESOURCE_STATE_COPY_DEST);list->CopyTextureRegion(&dst,x,y,0,&src,nullptr);keep(dst.pResource);transition(t,restore);
    }
    Texture renderTarget(UINT width,UINT height,DXGI_FORMAT format,std::array<float,4> clear={0,0,0,1}){
        if(!width||!height)throw std::runtime_error("Direct3D12 render target size");
        D3D12_RESOURCE_DESC d{};d.Dimension=D3D12_RESOURCE_DIMENSION_TEXTURE2D;d.Width=width;d.Height=height;d.DepthOrArraySize=1;d.MipLevels=1;d.Format=format;d.SampleDesc.Count=1;d.Flags=D3D12_RESOURCE_FLAG_ALLOW_RENDER_TARGET;
        D3D12_CLEAR_VALUE c{};c.Format=format;std::memcpy(c.Color,clear.data(),sizeof(c.Color));
        Texture t;t.width=width;t.height=height;t.format=format;t.value=committed(D3D12_HEAP_TYPE_DEFAULT,d,D3D12_RESOURCE_STATE_RENDER_TARGET,&c,"Direct3D12 render target");t.state=D3D12_RESOURCE_STATE_RENDER_TARGET;
        t.rtv=rtvs.take();device->CreateRenderTargetView(t.get(),nullptr,t.rtv);return t;
    }
    Texture depthTarget(UINT width,UINT height){
        // Typeless storage so post effects can sample depth as R32_FLOAT.
        D3D12_RESOURCE_DESC d{};d.Dimension=D3D12_RESOURCE_DIMENSION_TEXTURE2D;d.Width=width;d.Height=height;d.DepthOrArraySize=1;d.MipLevels=1;d.Format=DXGI_FORMAT_R32_TYPELESS;d.SampleDesc.Count=1;d.Flags=D3D12_RESOURCE_FLAG_ALLOW_DEPTH_STENCIL;
        D3D12_CLEAR_VALUE c{};c.Format=DXGI_FORMAT_D32_FLOAT;c.DepthStencil.Depth=1;
        Texture t;t.width=width;t.height=height;t.format=d.Format;t.value=committed(D3D12_HEAP_TYPE_DEFAULT,d,D3D12_RESOURCE_STATE_DEPTH_WRITE,&c,"Direct3D12 depth target");t.state=D3D12_RESOURCE_STATE_DEPTH_WRITE;
        t.format=DXGI_FORMAT_D32_FLOAT;t.dsv=dsvs.take();D3D12_DEPTH_STENCIL_VIEW_DESC v{};v.Format=DXGI_FORMAT_D32_FLOAT;v.ViewDimension=D3D12_DSV_DIMENSION_TEXTURE2D;device->CreateDepthStencilView(t.get(),&v,t.dsv);return t;
    }
    // Sampled texture with level 0 uploaded; rowBytes is the tightly packed source pitch. storage overrides the
    // resource format (typeless for sRGB textures that also need a UNORM UAV for mip generation).
    Texture texture(UINT width,UINT height,DXGI_FORMAT format,const void* data,UINT rowBytes,UINT mips=1,D3D12_RESOURCE_FLAGS flags=D3D12_RESOURCE_FLAG_NONE,DXGI_FORMAT storage=DXGI_FORMAT_UNKNOWN){
        requireRecording();if(!width||!height||!data)throw std::runtime_error("Direct3D12 texture size or data");
        D3D12_RESOURCE_DESC d{};d.Dimension=D3D12_RESOURCE_DIMENSION_TEXTURE2D;d.Width=width;d.Height=height;d.DepthOrArraySize=1;d.MipLevels=UINT16(mips);d.Format=storage==DXGI_FORMAT_UNKNOWN?format:storage;d.SampleDesc.Count=1;d.Flags=flags;
        Texture t;t.width=width;t.height=height;t.format=format;t.value=committed(D3D12_HEAP_TYPE_DEFAULT,d,D3D12_RESOURCE_STATE_COPY_DEST,nullptr,"Direct3D12 texture");t.state=D3D12_RESOURCE_STATE_COPY_DEST;
        D3D12_PLACED_SUBRESOURCE_FOOTPRINT fp{};UINT64 total=0;UINT rows=0;UINT64 rowSize=0;device->GetCopyableFootprints(&d,0,1,0,&fp,&rows,&rowSize,&total);
        if(rowSize!=rowBytes)throw std::runtime_error("Direct3D12 texture row size mismatch");
        auto u=upload(total,D3D12_TEXTURE_DATA_PLACEMENT_ALIGNMENT);
        for(UINT y=0;y<rows;y++)std::memcpy(u.cpu+fp.Offset+std::size_t(y)*fp.Footprint.RowPitch,static_cast<const unsigned char*>(data)+std::size_t(y)*rowBytes,rowBytes);
        fp.Offset+=u.offset;D3D12_TEXTURE_COPY_LOCATION dst{},src{};dst.pResource=t.get();dst.Type=D3D12_TEXTURE_COPY_TYPE_SUBRESOURCE_INDEX;dst.SubresourceIndex=0;src.pResource=u.resource;src.Type=D3D12_TEXTURE_COPY_TYPE_PLACED_FOOTPRINT;src.PlacedFootprint=fp;
        list->CopyTextureRegion(&dst,0,0,0,&src,nullptr);keep(t.get());transition(t,D3D12_RESOURCE_STATE_PIXEL_SHADER_RESOURCE|D3D12_RESOURCE_STATE_NON_PIXEL_SHADER_RESOURCE);return t;
    }
    // Any 2D/array/cube/3D layout: data[i] is subresource i (mip + layer*mips), tightly packed rows (and slices for 3D).
    Texture texture(const D3D12_RESOURCE_DESC& d,const std::vector<const void*>& data){
        requireRecording();const UINT count=UINT(data.size());if(!count||count!=UINT(d.MipLevels)*(d.Dimension==D3D12_RESOURCE_DIMENSION_TEXTURE3D?1u:d.DepthOrArraySize))throw std::runtime_error("Direct3D12 texture subresource count");
        Texture t;t.width=UINT(d.Width);t.height=d.Height;t.format=d.Format;t.value=committed(D3D12_HEAP_TYPE_DEFAULT,d,D3D12_RESOURCE_STATE_COPY_DEST,nullptr,"Direct3D12 texture");t.state=D3D12_RESOURCE_STATE_COPY_DEST;
        std::vector<D3D12_PLACED_SUBRESOURCE_FOOTPRINT> fp(count);std::vector<UINT> rows(count);std::vector<UINT64> rowSize(count);UINT64 total=0;device->GetCopyableFootprints(&d,0,count,0,fp.data(),rows.data(),rowSize.data(),&total);
        auto u=upload(total,D3D12_TEXTURE_DATA_PLACEMENT_ALIGNMENT);
        for(UINT i=0;i<count;i++){if(!data[i])throw std::runtime_error("Direct3D12 texture data");const auto* source=static_cast<const unsigned char*>(data[i]);
            for(UINT z=0;z<fp[i].Footprint.Depth;z++)for(UINT y=0;y<rows[i];y++)std::memcpy(u.cpu+fp[i].Offset+(std::size_t(z)*rows[i]+y)*fp[i].Footprint.RowPitch,source+(std::size_t(z)*rows[i]+y)*rowSize[i],std::size_t(rowSize[i]));
            fp[i].Offset+=u.offset;D3D12_TEXTURE_COPY_LOCATION dst{},src{};dst.pResource=t.get();dst.Type=D3D12_TEXTURE_COPY_TYPE_SUBRESOURCE_INDEX;dst.SubresourceIndex=i;src.pResource=u.resource;src.Type=D3D12_TEXTURE_COPY_TYPE_PLACED_FOOTPRINT;src.PlacedFootprint=fp[i];list->CopyTextureRegion(&dst,0,0,0,&src,nullptr);}
        // Upload destinations stay alive until this frame retires, so callers may drop them at once (D3D11 semantics).
        keep(t.get());transition(t,D3D12_RESOURCE_STATE_PIXEL_SHADER_RESOURCE|D3D12_RESOURCE_STATE_NON_PIXEL_SHADER_RESOURCE);return t;
    }
    void release(Texture& t){rtvs.give(t.rtv);dsvs.give(t.dsv);t.rtv={};t.dsv={};retire(std::move(t.value));}

    Com<ID3D12RootSignature> rootSignature(const D3D12_ROOT_SIGNATURE_DESC& desc){
        const auto serialize=detail::libraries().symbol<decltype(&D3D12SerializeRootSignature)>(detail::libraries12().d3d,"D3D12SerializeRootSignature");
        Com<ID3DBlob> blob,error;const auto status=serialize(&desc,D3D_ROOT_SIGNATURE_VERSION_1,&blob.p,&error.p);
        if(FAILED(status))throw std::runtime_error(error.p?std::string(static_cast<const char*>(error->GetBufferPointer()),error->GetBufferSize()):"Direct3D12 root signature serialization failed");
        Com<ID3D12RootSignature> out;check(device->CreateRootSignature(0,blob->GetBufferPointer(),blob->GetBufferSize(),__uuidof(ID3D12RootSignature),reinterpret_cast<void**>(&out.p)),"Direct3D12 root signature");return out;
    }
    // Same HLSL compiler and disk cache as the D3D11 renderer (SM5 bytecode is valid on D3D12).
    static std::vector<unsigned char> shader(const std::string& source,const char* name,const char* entry,const char* target){
        return detail::ShaderBytecodeCompiler::create(source,name,entry,target,[](const void*,std::size_t){return S_OK;}).code;
    }
    Com<ID3D12PipelineState> pipeline(D3D12_GRAPHICS_PIPELINE_STATE_DESC desc){
        Com<ID3D12PipelineState> out;check(device->CreateGraphicsPipelineState(&desc,__uuidof(ID3D12PipelineState),reinterpret_cast<void**>(&out.p)),"Direct3D12 graphics pipeline");return out;
    }
    Com<ID3D12PipelineState> computePipeline(ID3D12RootSignature* root,const std::vector<unsigned char>& cs){
        D3D12_COMPUTE_PIPELINE_STATE_DESC d{};d.pRootSignature=root;d.CS={cs.data(),cs.size()};Com<ID3D12PipelineState> out;
        check(device->CreateComputePipelineState(&d,__uuidof(ID3D12PipelineState),reinterpret_cast<void**>(&out.p)),"Direct3D12 compute pipeline");return out;
    }
    static D3D12_GRAPHICS_PIPELINE_STATE_DESC defaults(ID3D12RootSignature* root,const std::vector<unsigned char>& vs,const std::vector<unsigned char>& ps,DXGI_FORMAT color,DXGI_FORMAT depth=DXGI_FORMAT_UNKNOWN){
        D3D12_GRAPHICS_PIPELINE_STATE_DESC d{};d.pRootSignature=root;d.VS={vs.data(),vs.size()};d.PS={ps.data(),ps.size()};
        for(auto& t:d.BlendState.RenderTarget)t.RenderTargetWriteMask=D3D12_COLOR_WRITE_ENABLE_ALL;
        d.SampleMask=UINT_MAX;d.RasterizerState.FillMode=D3D12_FILL_MODE_SOLID;d.RasterizerState.CullMode=D3D12_CULL_MODE_NONE;d.RasterizerState.DepthClipEnable=TRUE;
        d.DepthStencilState.DepthEnable=depth!=DXGI_FORMAT_UNKNOWN;d.DepthStencilState.DepthWriteMask=D3D12_DEPTH_WRITE_MASK_ALL;d.DepthStencilState.DepthFunc=D3D12_COMPARISON_FUNC_LESS_EQUAL;
        d.PrimitiveTopologyType=D3D12_PRIMITIVE_TOPOLOGY_TYPE_TRIANGLE;d.NumRenderTargets=1;d.RTVFormats[0]=color;d.DSVFormat=depth;d.SampleDesc.Count=1;return d;
    }

    // Copies an RGBA8 texture to the CPU. Submits the current frame and waits; for tests/captures.
    std::vector<std::uint8_t> read(Texture& t){
        requireRecording();if(t.format!=DXGI_FORMAT_R8G8B8A8_UNORM)throw std::runtime_error("Direct3D12 readback supports RGBA8 only");
        D3D12_RESOURCE_DESC desc=bufferDesc(1);desc.Dimension=D3D12_RESOURCE_DIMENSION_TEXTURE2D;desc.Width=t.width;desc.Height=t.height;desc.Format=t.format;desc.Layout=D3D12_TEXTURE_LAYOUT_UNKNOWN;
        D3D12_PLACED_SUBRESOURCE_FOOTPRINT footprint{};UINT64 total=0;device->GetCopyableFootprints(&desc,0,1,0,&footprint,nullptr,nullptr,&total);
        auto staging=committed(D3D12_HEAP_TYPE_READBACK,bufferDesc(total),D3D12_RESOURCE_STATE_COPY_DEST,nullptr,"Direct3D12 readback buffer");
        const auto restore=t.state;transition(t,D3D12_RESOURCE_STATE_COPY_SOURCE);
        D3D12_TEXTURE_COPY_LOCATION dst{},src{};dst.pResource=staging.p;dst.Type=D3D12_TEXTURE_COPY_TYPE_PLACED_FOOTPRINT;dst.PlacedFootprint=footprint;src.pResource=t.get();src.Type=D3D12_TEXTURE_COPY_TYPE_SUBRESOURCE_INDEX;src.SubresourceIndex=0;
        list->CopyTextureRegion(&dst,0,0,0,&src,nullptr);transition(t,restore);
        end();waitIdle();begin();
        std::vector<std::uint8_t> pixels(std::size_t(t.width)*t.height*4);unsigned char* mapped=nullptr;D3D12_RANGE range{0,SIZE_T(total)};
        check(staging->Map(0,&range,reinterpret_cast<void**>(&mapped)),"Direct3D12 readback map");
        for(UINT y=0;y<t.height;y++)std::memcpy(pixels.data()+std::size_t(y)*t.width*4,mapped+footprint.Offset+std::size_t(y)*footprint.Footprint.RowPitch,std::size_t(t.width)*4);
        D3D12_RANGE wrote{0,0};staging->Unmap(0,&wrote);return pixels;
    }
};

// Flip-model swapchain whose back buffers are plain D3D12 render targets.
class Swapchain {
    Device& gpu;Com<IDXGISwapChain3> swap;std::array<Texture,FrameCount> buffers;
    UINT flags=0,lastFlags=0;
    void wrap(){for(UINT i=0;i<FrameCount;i++){auto& b=buffers[i];check(swap->GetBuffer(i,__uuidof(ID3D12Resource),reinterpret_cast<void**>(&b.value.p)),"Direct3D12 swap buffer");b.state=D3D12_RESOURCE_STATE_PRESENT;if(!b.rtv.ptr)b.rtv=gpu.rtvs.take();gpu.device->CreateRenderTargetView(b.get(),nullptr,b.rtv);}}
public:
    Swapchain(Device& device,HWND window,UINT width,UINT height,DXGI_FORMAT format=DXGI_FORMAT_R8G8B8A8_UNORM):gpu(device){
        DXGI_SWAP_CHAIN_DESC1 d{};d.Width=width;d.Height=height;d.Format=format;d.SampleDesc.Count=1;d.BufferUsage=DXGI_USAGE_RENDER_TARGET_OUTPUT;d.BufferCount=FrameCount;d.SwapEffect=DXGI_SWAP_EFFECT_FLIP_DISCARD;
        Com<IDXGIFactory5> features;BOOL tearing=FALSE;
        if(SUCCEEDED(gpu.factory->QueryInterface(__uuidof(IDXGIFactory5),reinterpret_cast<void**>(&features.p)))&&
            SUCCEEDED(features->CheckFeatureSupport(DXGI_FEATURE_PRESENT_ALLOW_TEARING,&tearing,sizeof(tearing)))&&tearing)
            flags=DXGI_SWAP_CHAIN_FLAG_ALLOW_TEARING;
        d.Flags=flags;
        Com<IDXGISwapChain1> chain;check(gpu.factory->CreateSwapChainForHwnd(gpu.queue.p,window,&d,nullptr,nullptr,&chain.p),"Direct3D12 window swapchain");
        check(gpu.factory->MakeWindowAssociation(window,DXGI_MWA_NO_ALT_ENTER),"Direct3D12 window association");
        check(chain->QueryInterface(__uuidof(IDXGISwapChain3),reinterpret_cast<void**>(&swap.p)),"Direct3D12 indexed swapchain");
        for(auto& b:buffers){b.width=width;b.height=height;b.format=d.Format;}wrap();
    }
    ~Swapchain(){try{gpu.waitIdle();}catch(...){}for(auto& b:buffers)gpu.rtvs.give(b.rtv);}
    // Call between Device::begin and Device::end.
    Texture& acquire(){auto& b=buffers.at(swap->GetCurrentBackBufferIndex());gpu.transition(b,D3D12_RESOURCE_STATE_RENDER_TARGET);return b;}
    void finish(Texture& b){gpu.transition(b,D3D12_RESOURCE_STATE_PRESENT);}
    // Call after Device::end.
    bool tearingSupported()const{return flags!=0;}
    UINT presentFlags()const{return lastFlags;}
    void present(UINT sync,bool allowTearing=false){
        lastFlags=sync==0&&allowTearing&&tearingSupported()?DXGI_PRESENT_ALLOW_TEARING:0;
        check(swap->Present(sync,lastFlags),"Direct3D12 present");
    }
    void resize(UINT width,UINT height){
        gpu.waitIdle();for(auto& b:buffers)b.value={};
        check(swap->ResizeBuffers(FrameCount,width,height,DXGI_FORMAT_UNKNOWN,flags),"Direct3D12 swapchain resize");
        for(auto& b:buffers){b.width=width;b.height=height;}wrap();
    }
};
}
#endif
