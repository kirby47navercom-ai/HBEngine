#pragma once
#include "ScreenEffectsPass.hpp"
#include <cstring>

namespace hb::gpu {
#if defined(_WIN32) && !defined(HB_COMPUTE_UNAVAILABLE)
// One bit per light per 16px tile. No per-tile list capacity or dropped lights.
class SceneLightTiles {
    Device& gpu;
    detail::Com<ID3D11ComputeShader> shader;
    detail::Com<ID3D11Buffer> bits,constants;
    detail::Com<ID3D11ShaderResourceView> view;
    detail::Com<ID3D11UnorderedAccessView> output;
    std::shared_ptr<detail::ShaderPreparationQueue::Job> preparing;
    bool asynchronous=false,requested=false,retried=false;std::string preparationError;
    struct Settings {Matrix vp;std::array<float,4> viewport;std::array<UINT,4> info;};
    Settings previous{};std::uint64_t revision=~std::uint64_t(0),dispatches_=0,bytes_=0;
    static constexpr const char* source=R"HLSL(
struct Light{float4 position,direction,color,cone;};StructuredBuffer<Light> lights:register(t0);
RWStructuredBuffer<uint> masks:register(u0);
cbuffer Tiles:register(b0){float4x4 vp;float4 viewport;uint4 info;};
bool inside(float4 p,float3 at,float radius){return dot(p,float4(at,1))>=-radius*length(p.xyz)-.0001;}
[numthreads(32,1,1)]void Cull(uint3 id:SV_DispatchThreadID){
 if(id.x>=info.z||id.y>=info.x||id.z>=info.y)return;
 float2 low=float2(id.y,id.z)*16/viewport.zw,high=min((float2(id.y,id.z)+1)*16/viewport.zw,1);
 float left=low.x*2-1,right=high.x*2-1,top=1-low.y*2,bottom=1-high.y*2;
 float4 px=vp[0],py=vp[1],pw=vp[3];uint mask=0;
 for(uint bit=0;bit<32;bit++){uint index=id.x*32+bit;if(index>=info.w)break;Light l=lights[index];bool include=true;
  if(l.position.w>.5&&l.position.w<2.5&&l.direction.w>0){float3 p=l.position.xyz;float r=l.direction.w;
   include=inside(px-left*pw,p,r)&&inside(right*pw-px,p,r)&&inside(py-bottom*pw,p,r)&&inside(top*pw-py,p,r);}
  if(include)mask|=1u<<bit;
 }masks[(id.z*info.x+id.y)*info.z+id.x]=mask;
}
)HLSL";
    bool prepareShader(){
        if(shader.p)return true;
        if(!asynchronous){detail::ShaderBytecodeCompiler::create(source,"HBLightTiles","Cull","cs_5_0",[&](const void* bytes,std::size_t size){std::lock_guard<std::mutex> lock(gpu.mutex);return gpu.device->CreateComputeShader(bytes,size,nullptr,&shader.p);});return true;}
        if(!preparationError.empty())return false;
        if(!preparing){const bool refresh=retried;const std::string key=std::string("HBLightTiles:Cull:")+(refresh?"refresh:":"cached:")+source;preparing=ScreenEffectsPass::sharedPreparationQueue().submit(key,256+key.size()*2+std::strlen(source),[refresh]{return detail::ShaderBytecodeCompiler::create(source,"HBLightTiles","Cull","cs_5_0",[](const void*,std::size_t){return S_OK;},refresh).code;});}
        if(!preparing)return false;
        const auto status=preparing->status.load(std::memory_order_acquire);
        if(status==detail::ShaderPreparationQueue::Status::failed){preparationError=preparing->error;preparing.reset();return false;}
        if(status!=detail::ShaderPreparationQueue::Status::ready)return false;
        detail::Com<ID3D11ComputeShader> next;HRESULT result;{std::lock_guard<std::mutex> lock(gpu.mutex);result=gpu.device->CreateComputeShader(preparing->code.data(),preparing->code.size(),nullptr,&next.p);}preparing.reset();
        if(FAILED(result)){if(!retried)retried=true;else preparationError="Prepared light tile shader creation failed (HRESULT "+std::to_string(static_cast<unsigned long>(result))+")";return false;}
        shader=std::move(next);
        return true;
    }
public:
    struct PreparationInfo {bool enabled=false,requested=false,pending=false,ready=false;unsigned stage=0;std::string error;};
    explicit SceneLightTiles(Device& device):gpu(device){}
    void setAsyncPreparation(bool value){asynchronous=value;if(!value){preparing.reset();retried=false;preparationError.clear();}}
    PreparationInfo preparationInfo()const{
        PreparationInfo info{asynchronous,requested,requested&&!shader.p&&preparationError.empty(),shader.p!=nullptr,0,preparationError};
        if(!requested)return info;
        info.stage=shader.p?3:!preparationError.empty()?4:1;
        if(preparing&&preparing->status.load(std::memory_order_acquire)==detail::ShaderPreparationQueue::Status::compiling)info.stage=2;
        return info;
    }
    void prepare(const Matrix& vp,const std::array<float,4>& rect,UINT count,ID3D11ShaderResourceView* lights,std::uint64_t generation,bool enabled){
        if(!enabled||count<16){release();return;}
        const UINT x=static_cast<UINT>(std::ceil(rect[2]/16)),y=static_cast<UINT>(std::ceil(rect[3]/16)),words=(count+31)/32;
        const std::uint64_t entries=std::uint64_t(x)*y*words;
        // Hardware resource limit: retain the exact all-light path rather than truncate.
        if(!x||!y||entries>UINT_MAX/4||((words+31)/32)>65535||x>65535||y>65535){release();return;}
        requested=true;
        // The untiled fragment loop evaluates every light while bytecode waits.
        if(!prepareShader())return;
        const Settings next{vp,rect,{x,y,words,count}};
        if(view.p&&revision==generation&&previous.vp==vp&&previous.viewport==rect&&previous.info==next.info)return;
        std::lock_guard<std::mutex> lock(gpu.mutex);
        if(!constants.p){D3D11_BUFFER_DESC c{};c.ByteWidth=sizeof(Settings);c.Usage=D3D11_USAGE_DEFAULT;c.BindFlags=D3D11_BIND_CONSTANT_BUFFER;detail::check(gpu.device->CreateBuffer(&c,nullptr,&constants.p),"Light tile constants");}
        ID3D11ShaderResourceView* empty=nullptr;gpu.context->PSSetShaderResources(48,1,&empty);
        if(bytes_!=entries*4){D3D11_BUFFER_DESC b{};b.ByteWidth=static_cast<UINT>(entries*4);b.Usage=D3D11_USAGE_DEFAULT;b.BindFlags=D3D11_BIND_SHADER_RESOURCE|D3D11_BIND_UNORDERED_ACCESS;b.MiscFlags=D3D11_RESOURCE_MISC_BUFFER_STRUCTURED;b.StructureByteStride=4;detail::Com<ID3D11Buffer> buffer;detail::Com<ID3D11ShaderResourceView> srv;detail::Com<ID3D11UnorderedAccessView> uav;detail::check(gpu.device->CreateBuffer(&b,nullptr,&buffer.p),"Light tile bits");detail::check(gpu.device->CreateShaderResourceView(buffer.p,nullptr,&srv.p),"Light tile view");detail::check(gpu.device->CreateUnorderedAccessView(buffer.p,nullptr,&uav.p),"Light tile output");bits=std::move(buffer);view=std::move(srv);output=std::move(uav);bytes_=entries*4;}
        gpu.context->UpdateSubresource(constants.p,0,nullptr,&next,0,0);auto* cb=constants.p;auto* u=output.p;gpu.context->CSSetConstantBuffers(0,1,&cb);gpu.context->CSSetShaderResources(0,1,&lights);gpu.context->CSSetUnorderedAccessViews(0,1,&u,nullptr);gpu.context->CSSetShader(shader.p,nullptr,0);gpu.context->Dispatch((words+31)/32,x,y);++dispatches_;u=nullptr;gpu.context->CSSetUnorderedAccessViews(0,1,&u,nullptr);gpu.context->CSSetShaderResources(0,1,&empty);gpu.context->CSSetShader(nullptr,nullptr,0);previous=next;revision=generation;
    }
    void bind(){auto* cb=constants.p;gpu.context->PSSetConstantBuffers(3,1,&cb);}
    ID3D11ShaderResourceView* resource() const{return view.p;}
    std::uint64_t bytes() const{return bytes_;}std::uint64_t dispatches() const{return dispatches_;}
    void release(){preparing.reset();requested=retried=false;preparationError.clear();if(!view.p&&!shader.p)return;std::lock_guard<std::mutex> lock(gpu.mutex);ID3D11ShaderResourceView* empty=nullptr;ID3D11Buffer* cb=nullptr;gpu.context->PSSetShaderResources(48,1,&empty);gpu.context->PSSetConstantBuffers(3,1,&cb);bits={};view={};output={};constants={};shader={};bytes_=0;revision=~std::uint64_t(0);}
};
inline constexpr const char* sceneLightTileDeclarations=R"HLSL(
cbuffer LightTiles:register(b3){float4x4 tileVP;float4 tileViewport;uint4 tileInfo;};StructuredBuffer<uint> lightTiles:register(t48);
)HLSL";
inline constexpr const char* sceneLightTileFunctions=R"HLSL(
uint lightNext(uint start,float2 pixel){if(!((uint)flags.x&8192))return start;uint2 tile=(uint2)clamp(floor((pixel-tileViewport.xy)/16),0,float2(tileInfo.xy)-1);uint word=start/32,shift=start%32;
 for(;word<tileInfo.z;word++){uint mask=lightTiles[(tile.y*tileInfo.x+tile.x)*tileInfo.z+word]&(0xffffffffu<<shift);if(mask)return word*32+(uint)firstbitlow(mask);shift=0;}return (uint)flags.y;}
)HLSL";
#endif
}
