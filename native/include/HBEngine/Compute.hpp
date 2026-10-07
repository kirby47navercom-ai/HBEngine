#pragma once
#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>
#include <cstring>
#include <limits>
#include <mutex>
#include <stdexcept>
#include <string>
#include <utility>
#include <vector>
#if defined(_WIN32) && !defined(HB_COMPUTE_UNAVAILABLE)
#ifndef NOMINMAX
#define NOMINMAX
#endif
#pragma push_macro("GetObject")
#include <windows.h>
#include <d3d11.h>
#include <d3dcompiler.h>
#pragma pop_macro("GetObject")
#endif

namespace hb::gpu {
#if defined(_WIN32) && !defined(HB_COMPUTE_UNAVAILABLE)
namespace detail {
template<class T> struct Com {
    T* p=nullptr; Com()=default; ~Com(){if(p)p->Release();}
    Com(const Com&)=delete;Com& operator=(const Com&)=delete;
    Com(Com&& o) noexcept:p(std::exchange(o.p,nullptr)){}
    Com& operator=(Com&& o) noexcept{if(this!=&o){if(p)p->Release();p=std::exchange(o.p,nullptr);}return *this;}
    T* operator->() const{return p;}
};
inline void check(HRESULT result,const char* action){if(FAILED(result))throw std::runtime_error(std::string(action)+" (HRESULT "+std::to_string(static_cast<unsigned long>(result))+")");}
struct Libraries {
    HMODULE d3d=LoadLibraryExW(L"d3d11.dll",nullptr,LOAD_LIBRARY_SEARCH_SYSTEM32),compiler=LoadLibraryExW(L"d3dcompiler_47.dll",nullptr,LOAD_LIBRARY_SEARCH_SYSTEM32);
    ~Libraries(){if(compiler)FreeLibrary(compiler);if(d3d)FreeLibrary(d3d);}
    template<class T> T symbol(HMODULE library,const char* name){const auto raw=library?GetProcAddress(library,name):nullptr;T result=nullptr;static_assert(sizeof(raw)==sizeof(result));std::memcpy(&result,&raw,sizeof(result));if(!result)throw std::runtime_error("DirectCompute system entry unavailable");return result;}
};
inline Libraries& libraries(){static Libraries value;return value;}
inline UINT bytes(std::size_t floats){if(!floats||floats>std::numeric_limits<UINT>::max()/sizeof(float))throw std::runtime_error("Compute buffer byte size overflows D3D11 ByteWidth");return static_cast<UINT>(floats*sizeof(float));}
}
class Device;
class Buffer {
    friend class Device;
    detail::Com<ID3D11Buffer> resource,staging;
    detail::Com<ID3D11UnorderedAccessView> uav;
    detail::Com<ID3D11ShaderResourceView> srv;
    ID3D11Device* owner=nullptr;UINT byteSize=0;
public:
    Buffer()=default;Buffer(Buffer&&)=default;Buffer& operator=(Buffer&&)=default;
    std::size_t size() const{return byteSize/sizeof(float);}
};
class Kernel {
    friend class Device;
    detail::Com<ID3D11ComputeShader> shader;
    detail::Com<ID3D11Buffer> constants;
    ID3D11Device* owner=nullptr;UINT constantBytes=0;
    std::vector<float> padded;
public:
    Kernel()=default;Kernel(Kernel&&)=default;Kernel& operator=(Kernel&&)=default;
};
class Device {
    detail::Com<ID3D11Device> device;
    detail::Com<ID3D11DeviceContext> context;
    std::mutex mutex;
    void owns(const Buffer& b) const{if(!b.resource.p||b.owner!=device.p)throw std::runtime_error("Compute buffer belongs to another device or was moved");}
public:
    Device(){auto& dll=detail::libraries();dll.symbol<decltype(&D3DCompile)>(dll.compiler,"D3DCompile");const auto create=dll.symbol<decltype(&D3D11CreateDevice)>(dll.d3d,"D3D11CreateDevice");const D3D_FEATURE_LEVEL requested=D3D_FEATURE_LEVEL_11_0;D3D_FEATURE_LEVEL actual{};detail::check(create(nullptr,D3D_DRIVER_TYPE_HARDWARE,nullptr,0,&requested,1,D3D11_SDK_VERSION,&device.p,&actual,&context.p),"DirectCompute hardware device");}
    Device(const Device&)=delete;Device& operator=(const Device&)=delete;
    static bool available() noexcept{try{Device device;return true;}catch(...){return false;}}
    std::string backend() const{return "Direct3D11 hardware cs_5_0";}
    Buffer create(const std::vector<float>& values,std::uint32_t stride=sizeof(float)){
        std::lock_guard<std::mutex> lock(mutex);Buffer b;const UINT size=detail::bytes(values.size());if(stride<4||stride>2048||stride%4||size%stride)throw std::runtime_error("Compute structured buffer stride invalid");
        D3D11_BUFFER_DESC desc{};desc.ByteWidth=size;desc.Usage=D3D11_USAGE_DEFAULT;desc.BindFlags=D3D11_BIND_UNORDERED_ACCESS|D3D11_BIND_SHADER_RESOURCE;desc.MiscFlags=D3D11_RESOURCE_MISC_BUFFER_STRUCTURED;desc.StructureByteStride=stride;D3D11_SUBRESOURCE_DATA data{};data.pSysMem=values.data();detail::check(device->CreateBuffer(&desc,&data,&b.resource.p),"Compute buffer");
        D3D11_UNORDERED_ACCESS_VIEW_DESC uav{};uav.ViewDimension=D3D11_UAV_DIMENSION_BUFFER;uav.Buffer.NumElements=size/stride;detail::check(device->CreateUnorderedAccessView(b.resource.p,&uav,&b.uav.p),"Compute UAV");
        D3D11_SHADER_RESOURCE_VIEW_DESC srv{};srv.ViewDimension=D3D11_SRV_DIMENSION_BUFFER;srv.Buffer.NumElements=size/stride;detail::check(device->CreateShaderResourceView(b.resource.p,&srv,&b.srv.p),"Compute SRV");b.owner=device.p;b.byteSize=size;return b;
    }
    void upload(Buffer& b,const std::vector<float>& values){std::lock_guard<std::mutex> lock(mutex);owns(b);if(values.size()!=b.size())throw std::runtime_error("Compute upload size mismatch");context->UpdateSubresource(b.resource.p,0,nullptr,values.data(),0,0);}
    Kernel compile(const std::string& source,const std::string& entry="Main"){
        if(source.empty()||source.size()>1024*1024||entry.empty()||entry.size()>128||entry.find('\0')!=std::string::npos)throw std::runtime_error("Compute shader source/entry invalid");
        std::lock_guard<std::mutex> lock(mutex);Kernel k;detail::Com<ID3DBlob> code,error;auto& dll=detail::libraries();const auto compile=dll.symbol<decltype(&D3DCompile)>(dll.compiler,"D3DCompile");const auto result=compile(source.data(),source.size(),"HBCompute",nullptr,nullptr,entry.c_str(),"cs_5_0",D3DCOMPILE_ENABLE_STRICTNESS|D3DCOMPILE_OPTIMIZATION_LEVEL3,0,&code.p,&error.p);if(FAILED(result))throw std::runtime_error(error.p?std::string(static_cast<const char*>(error->GetBufferPointer()),error->GetBufferSize()):"Compute shader compile failed");detail::check(device->CreateComputeShader(code->GetBufferPointer(),code->GetBufferSize(),nullptr,&k.shader.p),"Compute shader");k.owner=device.p;return k;
    }
    void dispatch(Kernel& k,const std::vector<Buffer*>& outputs,std::uint32_t x,std::uint32_t y=1,std::uint32_t z=1,const std::vector<Buffer*>& inputs={},const std::vector<float>& constants={}){
        if(!x||!y||!z||x>D3D11_CS_DISPATCH_MAX_THREAD_GROUPS_PER_DIMENSION||y>D3D11_CS_DISPATCH_MAX_THREAD_GROUPS_PER_DIMENSION||z>D3D11_CS_DISPATCH_MAX_THREAD_GROUPS_PER_DIMENSION||outputs.empty()||outputs.size()>D3D11_PS_CS_UAV_REGISTER_COUNT||inputs.size()>D3D11_COMMONSHADER_INPUT_RESOURCE_SLOT_COUNT||constants.size()>D3D11_REQ_CONSTANT_BUFFER_ELEMENT_COUNT*4)throw std::runtime_error("Compute dispatch groups/bindings/constants invalid");
        std::lock_guard<std::mutex> lock(mutex);if(!k.shader.p||k.owner!=device.p)throw std::runtime_error("Compute kernel belongs to another device or was moved");std::vector<ID3D11UnorderedAccessView*> uavs;std::vector<ID3D11ShaderResourceView*> srvs;
        for(auto* b:outputs){if(!b)throw std::runtime_error("Compute output is null");owns(*b);for(auto* old:uavs)if(old==b->uav.p)throw std::runtime_error("Compute output is bound twice");uavs.push_back(b->uav.p);}
        for(auto* b:inputs){if(!b)throw std::runtime_error("Compute input is null");owns(*b);for(auto* out:outputs)if(out==b)throw std::runtime_error("Compute buffer cannot be read/write in separate bindings");srvs.push_back(b->srv.p);}
        if(!constants.empty()){const UINT padded=static_cast<UINT>((constants.size()+3)/4*16);if(k.constantBytes!=padded){D3D11_BUFFER_DESC desc{};desc.ByteWidth=padded;desc.Usage=D3D11_USAGE_DEFAULT;desc.BindFlags=D3D11_BIND_CONSTANT_BUFFER;detail::Com<ID3D11Buffer> buffer;detail::check(device->CreateBuffer(&desc,nullptr,&buffer.p),"Compute constants");k.constants=std::move(buffer);k.constantBytes=padded;k.padded.resize(padded/sizeof(float));}std::fill(k.padded.begin(),k.padded.end(),0.f);std::copy(constants.begin(),constants.end(),k.padded.begin());context->UpdateSubresource(k.constants.p,0,nullptr,k.padded.data(),0,0);}
        auto* cb=constants.empty()?nullptr:k.constants.p;context->CSSetConstantBuffers(0,1,&cb);context->CSSetShader(k.shader.p,nullptr,0);context->CSSetUnorderedAccessViews(0,static_cast<UINT>(uavs.size()),uavs.data(),nullptr);if(!srvs.empty())context->CSSetShaderResources(0,static_cast<UINT>(srvs.size()),srvs.data());context->Dispatch(x,y,z);
        std::fill(uavs.begin(),uavs.end(),nullptr);std::fill(srvs.begin(),srvs.end(),nullptr);context->CSSetUnorderedAccessViews(0,static_cast<UINT>(uavs.size()),uavs.data(),nullptr);if(!srvs.empty())context->CSSetShaderResources(0,static_cast<UINT>(srvs.size()),srvs.data());cb=nullptr;context->CSSetConstantBuffers(0,1,&cb);context->CSSetShader(nullptr,nullptr,0);detail::check(device->GetDeviceRemovedReason(),"Compute device lost");
    }
    std::vector<float> read(Buffer& b){std::lock_guard<std::mutex> lock(mutex);owns(b);if(!b.staging.p){D3D11_BUFFER_DESC desc{};desc.ByteWidth=b.byteSize;desc.Usage=D3D11_USAGE_STAGING;desc.CPUAccessFlags=D3D11_CPU_ACCESS_READ;detail::check(device->CreateBuffer(&desc,nullptr,&b.staging.p),"Compute readback buffer");}std::vector<float> values(b.size());context->CopyResource(b.staging.p,b.resource.p);D3D11_MAPPED_SUBRESOURCE mapped{};detail::check(context->Map(b.staging.p,0,D3D11_MAP_READ,0,&mapped),"Compute readback");std::memcpy(values.data(),mapped.pData,b.byteSize);context->Unmap(b.staging.p,0);return values;}
};
#else
class Buffer {public: std::size_t size() const{return 0;}};
class Kernel {};
class Device {
public:
    static bool available() noexcept{return false;}
    Device(){throw std::runtime_error("DirectCompute requires Windows hardware; this platform has no backend");}
    std::string backend() const{return "unavailable";}
    Buffer create(const std::vector<float>&,std::uint32_t=sizeof(float)){throw std::runtime_error("Compute unavailable");}
    void upload(Buffer&,const std::vector<float>&){throw std::runtime_error("Compute unavailable");}
    Kernel compile(const std::string&,const std::string& = "Main"){throw std::runtime_error("Compute unavailable");}
    void dispatch(Kernel&,const std::vector<Buffer*>&,std::uint32_t,std::uint32_t=1,std::uint32_t=1,const std::vector<Buffer*>& = {},const std::vector<float>& = {}){throw std::runtime_error("Compute unavailable");}
    std::vector<float> read(Buffer&){throw std::runtime_error("Compute unavailable");}
};
#endif

// Persistent GPU state. step() dispatches without reading particle positions back.
// read() is explicit because CPU readback waits for the GPU and copies the buffer.
class Particles {
    Device& device;Kernel kernel;Buffer buffer;
    static constexpr const char* source=R"(
struct Particle { float4 positionAge; float4 velocityLife; };
RWStructuredBuffer<Particle> particles : register(u0);
cbuffer Step : register(b0) { float delta; float3 force; float gravity; float drag; float2 padding; };
[numthreads(64,1,1)] void Main(uint3 id : SV_DispatchThreadID) {
  uint count,stride; particles.GetDimensions(count,stride); if(id.x>=count)return;
  Particle p=particles[id.x]; if(p.positionAge.w>=p.velocityLife.w)return;
  float dt=min(delta,p.velocityLife.w-p.positionAge.w);
  float3 f=force+float3(0,-9.81*gravity,0);
  p.positionAge.xyz+=p.velocityLife.xyz*dt+f*(dt*dt*.5);
  p.velocityLife.xyz=(p.velocityLife.xyz+f*dt)*exp(-drag*dt);
  p.positionAge.w+=delta; particles[id.x]=p;
})";
    static const std::vector<float>& valid(const std::vector<float>& values){if(values.empty()||values.size()%8)throw std::runtime_error("GPU particles require position/age/velocity/lifetime records");for(std::size_t i=0;i<values.size();i++)if(!std::isfinite(values[i])||(i%8==3&&values[i]<0)||(i%8==7&&values[i]<=0))throw std::runtime_error("GPU particle value invalid");return values;}
public:
    Particles(Device& device,const std::vector<float>& values):device(device),kernel(device.compile(source)),buffer(device.create(valid(values),8*sizeof(float))){}
    void step(float delta,const std::array<float,3>& force={0,0,0},float gravity=0,float drag=0){if(!std::isfinite(delta)||delta<0||delta>120||!std::isfinite(gravity)||!std::isfinite(drag)||drag<0||!std::all_of(force.begin(),force.end(),[](float v){return std::isfinite(v);}))throw std::runtime_error("GPU particle step invalid");if(delta)device.dispatch(kernel,{&buffer},static_cast<std::uint32_t>((count()+63)/64),1,1,{}, {delta,force[0],force[1],force[2],gravity,drag,0,0});}
    std::vector<float> read(){return device.read(buffer);}
    void reset(const std::vector<float>& values){device.upload(buffer,valid(values));}
    std::size_t count() const{return buffer.size()/8;}
};
}
