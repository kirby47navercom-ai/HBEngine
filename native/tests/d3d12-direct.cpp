// Real Direct3D12 command-list proof: no D3D11On12. Prints one JSON line.
#include <HBEngine/D3D12Direct.hpp>
#include <nlohmann/json.hpp>
#include <chrono>
#include <iostream>

namespace detail=hb::gpu::detail;using hb::gpu::DeviceDriver;using hb::gpu::d3d12::Device;namespace d3d12=hb::gpu::d3d12;
#define REQUIRE(x) do{if(!(x))throw std::runtime_error("check failed: " #x);}while(0)

static const char* source=R"HLSL(
cbuffer Tint:register(b0){float4 color;};
cbuffer Move:register(b1){float4 offset;};
struct V{float4 at:SV_POSITION;};
V VS(float3 p:POSITION){V v;v.at=float4(p.xy+offset.xy,p.z,1);return v;}
float4 PS(V v):SV_TARGET{return color;}
)HLSL";

struct Window {HWND value=nullptr;
    Window(){WNDCLASSW wc{};wc.lpfnWndProc=DefWindowProcW;wc.hInstance=GetModuleHandleW(nullptr);wc.lpszClassName=L"HBEngineD3D12DirectProof";if(!RegisterClassW(&wc)&&GetLastError()!=ERROR_CLASS_ALREADY_EXISTS)throw std::runtime_error("window class");
        value=CreateWindowExW(0,wc.lpszClassName,L"Owned hidden D3D12 proof",WS_OVERLAPPEDWINDOW,0,0,160,96,nullptr,nullptr,wc.hInstance,nullptr);if(!value)throw std::runtime_error("window");}
    ~Window(){if(value)DestroyWindow(value);}};

static std::size_t validationErrors(Device& gpu){
    detail::Com<ID3D12InfoQueue> info;if(FAILED(gpu.device->QueryInterface(__uuidof(ID3D12InfoQueue),reinterpret_cast<void**>(&info.p))))return 0;
    std::size_t errors=0;for(UINT64 i=0;i<info->GetNumStoredMessages();i++){SIZE_T size=0;info->GetMessage(i,nullptr,&size);std::vector<char> raw(size);auto* m=reinterpret_cast<D3D12_MESSAGE*>(raw.data());info->GetMessage(i,m,&size);
        if(m->Severity<=D3D12_MESSAGE_SEVERITY_ERROR){errors++;std::cerr<<"D3D12 validation: "<<std::string(m->pDescription,m->DescriptionByteLength)<<"\n";}}
    return errors;
}

static nlohmann::json proof(DeviceDriver driver,HWND window){
    // Tiny upload slice forces the oversized-upload fallback path.
    Device gpu(driver,true,64*1024,64);nlohmann::json out;out["software"]=gpu.software;out["debugLayer"]=gpu.debug;
    d3d12::DescriptorPool cpuViews;
    cpuViews.create(gpu.device.p,D3D12_DESCRIPTOR_HEAP_TYPE_CBV_SRV_UAV,4);
    std::array<D3D12_CPU_DESCRIPTOR_HANDLE,13> cpuHandles{};
    for(auto& handle:cpuHandles)handle=cpuViews.take();
    REQUIRE(cpuViews.pageCount()==4);
    for(std::size_t i=cpuHandles.size();i>4;--i)cpuViews.give(cpuHandles[i-1]);
    REQUIRE(cpuViews.pageCount()==1);
    cpuViews.give(cpuHandles[1]);REQUIRE(cpuViews.take().ptr==cpuHandles[1].ptr);
    out["cpuDescriptorPaging"]=true;
    D3D12_ROOT_PARAMETER params[2]{};
    params[0].ParameterType=D3D12_ROOT_PARAMETER_TYPE_32BIT_CONSTANTS;params[0].Constants={0,0,4};params[0].ShaderVisibility=D3D12_SHADER_VISIBILITY_PIXEL;
    params[1].ParameterType=D3D12_ROOT_PARAMETER_TYPE_CBV;params[1].Descriptor={1,0};params[1].ShaderVisibility=D3D12_SHADER_VISIBILITY_VERTEX;
    D3D12_ROOT_SIGNATURE_DESC rd{};rd.NumParameters=2;rd.pParameters=params;rd.Flags=D3D12_ROOT_SIGNATURE_FLAG_ALLOW_INPUT_ASSEMBLER_INPUT_LAYOUT;
    auto root=gpu.rootSignature(rd);
    const auto vs=Device::shader(source,"HBD3D12Proof","VS","vs_5_0"),ps=Device::shader(source,"HBD3D12Proof","PS","ps_5_0");
    D3D12_INPUT_ELEMENT_DESC layout{"POSITION",0,DXGI_FORMAT_R32G32B32_FLOAT,0,0,D3D12_INPUT_CLASSIFICATION_PER_VERTEX_DATA,0};
    auto desc=Device::defaults(root.p,vs,ps,DXGI_FORMAT_R8G8B8A8_UNORM,DXGI_FORMAT_D32_FLOAT);desc.InputLayout={&layout,1};auto pso=gpu.pipeline(desc);
    // Near red triangle first, then a far green one over the same pixels: depth must keep red.
    const float vertices[]={-.6f,-.6f,.2f, 0,.6f,.2f, .6f,-.6f,.2f, -.8f,-.8f,.8f, 0,.8f,.8f, .8f,-.8f,.8f};
    gpu.begin();
    auto target=gpu.renderTarget(64,64,DXGI_FORMAT_R8G8B8A8_UNORM,{0,0,1,1});auto depth=gpu.depthTarget(64,64);
    auto mesh=gpu.buffer(vertices,sizeof(vertices),D3D12_RESOURCE_STATE_VERTEX_AND_CONSTANT_BUFFER);
    const D3D12_VERTEX_BUFFER_VIEW view{mesh.address(),UINT(sizeof(vertices)),12};
    const auto draw=[&](std::array<float,4> color,std::array<float,4> offset,UINT first){
        gpu.list->SetGraphicsRoot32BitConstants(0,4,color.data(),0);gpu.list->SetGraphicsRootConstantBufferView(1,gpu.constants(offset.data(),sizeof(offset)));gpu.list->DrawInstanced(3,1,first,0);
    };
    const auto pass=[&](){
        const float clear[4]={0,0,1,1};gpu.list->ClearRenderTargetView(target.rtv,clear,0,nullptr);gpu.list->ClearDepthStencilView(depth.dsv,D3D12_CLEAR_FLAG_DEPTH,1,0,0,nullptr);
        gpu.list->OMSetRenderTargets(1,&target.rtv,FALSE,&depth.dsv);const D3D12_VIEWPORT vp{0,0,64,64,0,1};const D3D12_RECT sc{0,0,64,64};gpu.list->RSSetViewports(1,&vp);gpu.list->RSSetScissorRects(1,&sc);
        gpu.list->SetGraphicsRootSignature(root.p);gpu.list->SetPipelineState(pso.p);gpu.list->IASetPrimitiveTopology(D3D_PRIMITIVE_TOPOLOGY_TRIANGLELIST);gpu.list->IASetVertexBuffers(0,1,&view);
    };
    pass();draw({1,0,0,1},{0,0,0,0},0);draw({0,1,0,1},{0,0,0,0},3);
    auto pixels=gpu.read(target);const auto at=[&](int x,int y){return std::size_t(y*64+x)*4;};
    REQUIRE(pixels[at(32,32)]>250&&pixels[at(32,32)+1]<3&&pixels[at(32,32)+2]<3);
    REQUIRE(pixels[at(1,1)]<3&&pixels[at(1,1)+2]>250);
    REQUIRE(pixels[at(32,54)]<3&&pixels[at(32,54)+1]>250);// only the larger far triangle covers this row
    // Frames in flight: allocator/fence/ring reuse, oversized uploads, moving triangle.
    const auto started=std::chrono::steady_clock::now();std::vector<float> big(64*1024,1.f);int frames=0;
    gpu.end();
    for(int i=0;i<30;i++,frames++){
        gpu.begin();auto large=gpu.upload(big.size()*sizeof(float),4);std::memcpy(large.cpu,big.data(),big.size()*sizeof(float));
        pass();draw({float(i%2),0,1-float(i%2),1},{-.5f+i/60.f,0,0,0},0);gpu.end();
    }
    out["frameMs"]=std::chrono::duration<double,std::milli>(std::chrono::steady_clock::now()-started).count()/frames;
    gpu.begin();pixels=gpu.read(target);// last frame i=29: odd, red, shifted left by .0167
    REQUIRE(pixels[at(32,32)]>250&&pixels[at(32,32)+2]<3);
    bool threw=false;
    try{gpu.table(D3D12_MAX_SHADER_VISIBLE_DESCRIPTOR_HEAP_SIZE_TIER_1+1);}catch(const std::runtime_error&){threw=true;}
    REQUIRE(threw);
    auto base=gpu.table(62);
    gpu.reserveTables(5);
    const auto srvs=gpu.table(2),uavs=gpu.table(3);
    REQUIRE(base.gpu.ptr&&srvs.gpu.ptr&&srvs.stride);
    REQUIRE(uavs.gpu.ptr==srvs.gpu.ptr+2*srvs.stride);
    REQUIRE(gpu.descriptorOverflowPages()==1);
    out["descriptorOverflowPages"]=gpu.descriptorOverflowPages();
    out["adapterVendor"]=gpu.adapter.VendorId;
    REQUIRE(gpu.adapter.VendorId>0);
    gpu.release(target);gpu.release(depth);gpu.retire(std::move(mesh.value));gpu.end();
    for(int i=0;i<8;++i){gpu.begin();gpu.table(62);gpu.reserveTables(5);gpu.table(2);gpu.table(3);gpu.end();}
    REQUIRE(gpu.descriptorReusedPages()>=5);
    out["descriptorReusedPages"]=gpu.descriptorReusedPages();
    gpu.begin();
    const auto oldTicket=gpu.ticket();
    REQUIRE(!gpu.ticketDone(oldTicket));
    for(int i=0;i<1024;++i)gpu.keep(pso.p);
    REQUIRE(gpu.retainedObjects()==1);
    gpu.end();
    for(int i=0;i<72;++i){gpu.begin();gpu.keep(pso.p);REQUIRE(gpu.retainedObjects()==1);gpu.end();}
    gpu.waitIdle();
    REQUIRE(gpu.ticketDone(oldTicket));
    gpu.begin();const auto pending=gpu.ticket();REQUIRE(!gpu.ticketDone(pending));gpu.end();gpu.waitIdle();REQUIRE(gpu.ticketDone(pending));
    out["deduplicatedFrameObjects"]=true;out["wrappedFenceTickets"]=true;
    // Present through a hidden window, including a resize.
    {d3d12::Swapchain chain(gpu,window,160,96);
        for(int i=0;i<6;i++){if(i==3)chain.resize(200,120);gpu.begin();auto& back=chain.acquire();const float c[4]={0,float(i)/6,0,1};gpu.list->ClearRenderTargetView(back.rtv,c,0,nullptr);chain.finish(back);gpu.end();chain.present(i==4?1:0,true);
            REQUIRE(chain.presentFlags()==(i!=4&&chain.tearingSupported()?DXGI_PRESENT_ALLOW_TEARING:0));}
        out["tearingSupported"]=chain.tearingSupported();out["finalPresentFlags"]=chain.presentFlags();
        gpu.waitIdle();}
    out["validationErrors"]=validationErrors(gpu);REQUIRE(out["validationErrors"]==0);out["frames"]=frames;out["submitted"]=gpu.submitted();return out;
}

int main(){
    try{SetErrorMode(SEM_FAILCRITICALERRORS|SEM_NOGPFAULTERRORBOX);Window window;nlohmann::json result;
        try{result["hardware"]=proof(DeviceDriver::Hardware,window.value);}catch(const std::exception& e){result["hardware"]["error"]=e.what();}
        result["software"]=proof(DeviceDriver::Software,window.value);
        result["passed"]=!result["hardware"].contains("error");std::cout<<result.dump()<<std::endl;return result["passed"]?0:1;
    }catch(const std::exception& e){nlohmann::json failed;failed["passed"]=false;failed["error"]=e.what();std::cout<<failed.dump()<<std::endl;return 1;}
}
