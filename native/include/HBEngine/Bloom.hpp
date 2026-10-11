#pragma once
#include "Render.hpp"

namespace hb::gpu {
struct SceneBloom {float threshold=1,strength=.6f,radius=.4f,resolutionScale=.5f;};
#if defined(_WIN32) && !defined(HB_COMPUTE_UNAVAILABLE)
class BloomPass {
    // shortcut: one selected global volume and five Gaussian levels; add local blending and convolution with their authoring contracts.
    Device& gpu;
    struct Image {detail::Com<ID3D11Texture2D> texture;detail::Com<ID3D11ShaderResourceView> view;detail::Com<ID3D11UnorderedAccessView> output;detail::Com<ID3D11RenderTargetView> target;UINT width=0,height=0;};
    Image scene;std::vector<std::array<Image,2>> levels;
    detail::Com<ID3D11VertexShader> vertex;detail::Com<ID3D11PixelShader> pixel;detail::Com<ID3D11ComputeShader> extract,blur;
    detail::Com<ID3D11SamplerState> sampler;detail::Com<ID3D11RasterizerState> raster;detail::Com<ID3D11DepthStencilState> depth;detail::Com<ID3D11BlendState> blend;
    struct Constants {std::array<float,4> dimensions{},area{},effect{},options{};};
    std::array<detail::Com<ID3D11Buffer>,3> constants;std::size_t slot=0;
    std::array<float,4> area{};SceneBloom settings;bool pending=false;
    std::uint64_t dispatches_=0,allocations_=0,composites_=0;
    static constexpr const char* shader=R"HLSL(
cbuffer BloomSettings:register(b0){float4 dimensions,area,effect,options;};
Texture2D<float4> source:register(t0),level0:register(t1),level1:register(t2),level2:register(t3),level3:register(t4),level4:register(t5);
RWTexture2D<float4> destination:register(u0);SamplerState linearClamp:register(s0);
float3 linearToSrgb(float3 v){return lerp(12.92*v,1.055*pow(max(v,0),1.0/2.4)-.055,step(.0031308,v));}
float3 aces(float3 v){v=min(v,1e8);return saturate((v*(2.51*v+.03))/(v*(2.43*v+.59)+.14));}
[numthreads(8,8,1)]void Extract(uint3 id:SV_DispatchThreadID){
 if(any(id.xy>=(uint2)dimensions.zw))return;float2 uv=(id.xy+.5)/dimensions.zw;
 float2 at=(area.xy+uv*area.zw)/dimensions.xy,stepSize=area.zw/(dimensions.xy*dimensions.zw)*.25;
 float2 lo=(area.xy+.5)/dimensions.xy,hi=(area.xy+area.zw-.5)/dimensions.xy;
 float3 c=source.SampleLevel(linearClamp,clamp(at+float2(-stepSize.x,-stepSize.y),lo,hi),0).rgb;
 c+=source.SampleLevel(linearClamp,clamp(at+float2(stepSize.x,-stepSize.y),lo,hi),0).rgb;
 c+=source.SampleLevel(linearClamp,clamp(at+float2(-stepSize.x,stepSize.y),lo,hi),0).rgb;
 c+=source.SampleLevel(linearClamp,clamp(at+stepSize,lo,hi),0).rgb;c=clamp(c*.25,0,65472);
 if(options.z>0)c*=smoothstep(effect.x,effect.x+.01,dot(c,float3(.2126,.7152,.0722)));
 destination[id.xy]=float4(c,1);
}
[numthreads(8,8,1)]void Blur(uint3 id:SV_DispatchThreadID){
 if(any(id.xy>=(uint2)dimensions.zw))return;float2 uv=(id.xy+.5)/dimensions.zw,stepSize=options.xy/dimensions.xy*(1+effect.z*2);
 float3 c=source.SampleLevel(linearClamp,uv,0).rgb*.227027;
 c+=(source.SampleLevel(linearClamp,uv+stepSize*1.384615,0).rgb+source.SampleLevel(linearClamp,uv-stepSize*1.384615,0).rgb)*.316216;
 c+=(source.SampleLevel(linearClamp,uv+stepSize*3.230769,0).rgb+source.SampleLevel(linearClamp,uv-stepSize*3.230769,0).rgb)*.070270;
 destination[id.xy]=float4(c,1);
}
struct Vertex{float4 position:SV_POSITION;float2 uv:TEXCOORD;};
Vertex VS(uint id:SV_VertexID){Vertex v;v.uv=float2((id<<1)&2,id&2);v.position=float4(v.uv*float2(2,-2)+float2(-1,1),0,1);return v;}
float4 PS(Vertex v):SV_TARGET{
 float3 glow=0;float weight=0;const float factors[5]={1,.8,.6,.4,.2};
 float w=lerp(factors[0],1.2-factors[0],effect.z);if(options.z>0){glow+=level0.SampleLevel(linearClamp,v.uv,0).rgb*w;weight+=w;}
 w=lerp(factors[1],1.2-factors[1],effect.z);if(options.z>1){glow+=level1.SampleLevel(linearClamp,v.uv,0).rgb*w;weight+=w;}
 w=lerp(factors[2],1.2-factors[2],effect.z);if(options.z>2){glow+=level2.SampleLevel(linearClamp,v.uv,0).rgb*w;weight+=w;}
 w=lerp(factors[3],1.2-factors[3],effect.z);if(options.z>3){glow+=level3.SampleLevel(linearClamp,v.uv,0).rgb*w;weight+=w;}
 w=lerp(factors[4],1.2-factors[4],effect.z);if(options.z>4){glow+=level4.SampleLevel(linearClamp,v.uv,0).rgb*w;weight+=w;}
 float2 uv=(area.xy+v.uv*area.zw)/dimensions.xy;float4 original=source.SampleLevel(linearClamp,uv,0);
 return float4(linearToSrgb(aces(max(0,original.rgb+glow*effect.y/max(weight,.0001))*effect.w)),original.a);
}
)HLSL";
    void programs(){
        if(vertex.p)return;
        auto compile=detail::libraries().symbol<decltype(&D3DCompile)>(detail::libraries().compiler,"D3DCompile");
        for(const auto* entry:{"VS","PS","Extract","Blur"}){detail::Com<ID3DBlob> code,error;const auto result=compile(shader,std::strlen(shader),"HBBloom",nullptr,nullptr,entry,entry[0]=='V'?"vs_5_0":entry[0]=='P'?"ps_5_0":"cs_5_0",D3DCOMPILE_ENABLE_STRICTNESS|D3DCOMPILE_OPTIMIZATION_LEVEL3,0,&code.p,&error.p);if(FAILED(result))throw std::runtime_error(error.p?std::string(static_cast<const char*>(error->GetBufferPointer()),error->GetBufferSize()):"Bloom shader compile failed");if(entry[0]=='V')detail::check(gpu.device->CreateVertexShader(code->GetBufferPointer(),code->GetBufferSize(),nullptr,&vertex.p),"Bloom vertex shader");else if(entry[0]=='P')detail::check(gpu.device->CreatePixelShader(code->GetBufferPointer(),code->GetBufferSize(),nullptr,&pixel.p),"Bloom composite shader");else detail::check(gpu.device->CreateComputeShader(code->GetBufferPointer(),code->GetBufferSize(),nullptr,entry[0]=='E'?&extract.p:&blur.p),"Bloom compute shader");}
        D3D11_BUFFER_DESC cb{};cb.ByteWidth=sizeof(Constants);cb.Usage=D3D11_USAGE_DYNAMIC;cb.BindFlags=D3D11_BIND_CONSTANT_BUFFER;cb.CPUAccessFlags=D3D11_CPU_ACCESS_WRITE;for(auto& buffer:constants)detail::check(gpu.device->CreateBuffer(&cb,nullptr,&buffer.p),"Bloom frame constants");
        D3D11_SAMPLER_DESC s{};s.Filter=D3D11_FILTER_MIN_MAG_MIP_LINEAR;s.AddressU=s.AddressV=s.AddressW=D3D11_TEXTURE_ADDRESS_CLAMP;s.MaxLOD=D3D11_FLOAT32_MAX;detail::check(gpu.device->CreateSamplerState(&s,&sampler.p),"Bloom sampler");
        D3D11_RASTERIZER_DESC r{};r.FillMode=D3D11_FILL_SOLID;r.CullMode=D3D11_CULL_NONE;r.DepthClipEnable=TRUE;r.ScissorEnable=TRUE;detail::check(gpu.device->CreateRasterizerState(&r,&raster.p),"Bloom raster state");
        D3D11_DEPTH_STENCIL_DESC d{};detail::check(gpu.device->CreateDepthStencilState(&d,&depth.p),"Bloom depth state");D3D11_BLEND_DESC b{};b.RenderTarget[0].RenderTargetWriteMask=D3D11_COLOR_WRITE_ENABLE_ALL;detail::check(gpu.device->CreateBlendState(&b,&blend.p),"Bloom blend state");
    }
    Image image(UINT w,UINT h,bool renderTarget){
        Image out;out.width=w;out.height=h;D3D11_TEXTURE2D_DESC d{};d.Width=w;d.Height=h;d.MipLevels=d.ArraySize=d.SampleDesc.Count=1;d.Format=DXGI_FORMAT_R16G16B16A16_FLOAT;d.BindFlags=D3D11_BIND_SHADER_RESOURCE|(renderTarget?D3D11_BIND_RENDER_TARGET:D3D11_BIND_UNORDERED_ACCESS);detail::check(gpu.device->CreateTexture2D(&d,nullptr,&out.texture.p),"Bloom HDR texture");detail::check(gpu.device->CreateShaderResourceView(out.texture.p,nullptr,&out.view.p),"Bloom HDR view");if(renderTarget)detail::check(gpu.device->CreateRenderTargetView(out.texture.p,nullptr,&out.target.p),"Bloom HDR target");else detail::check(gpu.device->CreateUnorderedAccessView(out.texture.p,nullptr,&out.output.p),"Bloom compute output");return out;
    }
    ID3D11Buffer* upload(const Constants& value){auto* buffer=constants[slot].p;slot=(slot+1)%constants.size();D3D11_MAPPED_SUBRESOURCE mapped{};detail::check(gpu.context->Map(buffer,0,D3D11_MAP_WRITE_DISCARD,0,&mapped),"Bloom constants");std::memcpy(mapped.pData,&value,sizeof(value));gpu.context->Unmap(buffer,0);return buffer;}
    void dispatch(ID3D11ComputeShader* shader,const Image& input,const Image& output,const Constants& values){
        auto* cb=upload(values);auto* srv=input.view.p;auto* uav=output.output.p;auto* state=sampler.p;gpu.context->CSSetShader(shader,nullptr,0);gpu.context->CSSetConstantBuffers(0,1,&cb);gpu.context->CSSetShaderResources(0,1,&srv);gpu.context->CSSetSamplers(0,1,&state);gpu.context->CSSetUnorderedAccessViews(0,1,&uav,nullptr);gpu.context->Dispatch((output.width+7)/8,(output.height+7)/8,1);srv=nullptr;uav=nullptr;gpu.context->CSSetShaderResources(0,1,&srv);gpu.context->CSSetUnorderedAccessViews(0,1,&uav,nullptr);++dispatches_;
    }
public:
    explicit BloomPass(Device& device):gpu(device){}
    void begin(UINT w,UINT h,const std::array<float,4>& viewport,const std::optional<SceneBloom>& value,const std::array<float,4>& clear,bool forceHDR=false){
        dispatches_=0;pending=false;if(value&&(!std::isfinite(value->threshold)||value->threshold<0||value->threshold>64||!std::isfinite(value->strength)||value->strength<0||value->strength>10||!std::isfinite(value->radius)||value->radius<0||value->radius>1||!std::isfinite(value->resolutionScale)||value->resolutionScale<.25f||value->resolutionScale>1))throw std::runtime_error("Bloom settings invalid");
        if((!value||value->strength==0)&&!forceHDR){release();return;}settings=value.value_or(SceneBloom{});if(!value)settings.strength=0;area=viewport;if(area[2]==0||area[3]==0)area={0,0,float(w),float(h)};
        const float right=std::min(float(w),area[0]+area[2]),bottom=std::min(float(h),area[1]+area[3]);area[0]=std::max(0.f,area[0]);area[1]=std::max(0.f,area[1]);area[2]=std::max(0.f,right-area[0]);area[3]=std::max(0.f,bottom-area[1]);if(area[2]==0||area[3]==0){release();return;}
        const auto bw=std::max(1u,static_cast<UINT>(std::round(area[2]*settings.resolutionScale))),bh=std::max(1u,static_cast<UINT>(std::round(area[3]*settings.resolutionScale)));std::lock_guard<std::mutex> lock(gpu.mutex);programs();
        if(scene.width!=w||scene.height!=h||((settings.strength>0)&&(levels.empty()||levels.front()[0].width!=bw||levels.front()[0].height!=bh))||((settings.strength==0)&&!levels.empty())){auto next=image(w,h,true);std::vector<std::array<Image,2>> chain;for(UINT x=bw,y=bh;settings.strength>0&&chain.size()<5;){chain.push_back({image(x,y,false),image(x,y,false)});if(x==1&&y==1)break;x=std::max(1u,x/2);y=std::max(1u,y/2);}scene=std::move(next);levels=std::move(chain);++allocations_;}
        std::array<float,4> linear=clear;for(std::size_t i=0;i<3;i++)linear[i]=linear[i]<=.04045f?linear[i]/12.92f:std::pow((linear[i]+.055f)/1.055f,2.4f);gpu.context->ClearRenderTargetView(scene.target.p,linear.data());pending=true;
    }
    void complete(ID3D11RenderTargetView* output,float exposure,const std::optional<std::array<float,4>>& scissor){
        if(!pending)return;
        std::lock_guard<std::mutex> lock(gpu.mutex);gpu.context->OMSetRenderTargets(0,nullptr,nullptr);Constants values;values.effect={settings.threshold,settings.strength,settings.radius,exposure};
        for(std::size_t index=0;index<levels.size();index++){auto& layer=levels[index];const auto& input=index?levels[index-1][0]:scene;values.dimensions={float(input.width),float(input.height),float(layer[0].width),float(layer[0].height)};values.area=index?std::array<float,4>{0,0,float(input.width),float(input.height)}:area;values.options={0,0,index==0?1.f:0.f,0};dispatch(extract.p,input,layer[0],values);values.dimensions={float(layer[0].width),float(layer[0].height),float(layer[0].width),float(layer[0].height)};values.options={1,0,0,0};dispatch(blur.p,layer[0],layer[1],values);values.options={0,1,0,0};dispatch(blur.p,layer[1],layer[0],values);}
        values.dimensions={float(scene.width),float(scene.height),0,0};values.area=area;values.options={0,0,float(levels.size()),0};auto* cb=upload(values);std::array<ID3D11ShaderResourceView*,6> views{};views[0]=scene.view.p;for(std::size_t i=0;i<levels.size();i++)views[i+1]=levels[i][0].view.p;auto* state=sampler.p;D3D11_VIEWPORT viewport{area[0],area[1],area[2],area[3],0,1};const auto crop=scissor.value_or(area);D3D11_RECT rect{LONG(std::floor(crop[0])),LONG(std::floor(crop[1])),LONG(std::ceil(crop[0]+crop[2])),LONG(std::ceil(crop[1]+crop[3]))};
        gpu.context->CSSetShader(nullptr,nullptr,0);gpu.context->OMSetRenderTargets(1,&output,nullptr);gpu.context->OMSetDepthStencilState(depth.p,0);gpu.context->OMSetBlendState(blend.p,nullptr,UINT_MAX);gpu.context->RSSetState(raster.p);gpu.context->RSSetViewports(1,&viewport);gpu.context->RSSetScissorRects(1,&rect);gpu.context->IASetInputLayout(nullptr);gpu.context->IASetPrimitiveTopology(D3D11_PRIMITIVE_TOPOLOGY_TRIANGLELIST);gpu.context->VSSetShader(vertex.p,nullptr,0);gpu.context->PSSetShader(pixel.p,nullptr,0);gpu.context->PSSetConstantBuffers(0,1,&cb);gpu.context->PSSetShaderResources(0,6,views.data());gpu.context->PSSetSamplers(0,1,&state);gpu.context->Draw(3,0);views.fill(nullptr);gpu.context->PSSetShaderResources(0,6,views.data());gpu.context->OMSetRenderTargets(0,nullptr,nullptr);detail::check(gpu.device->GetDeviceRemovedReason(),"Bloom device lost");pending=false;++composites_;
    }
    void markDirty(){pending=true;}
    bool active() const{return scene.target.p!=nullptr;}ID3D11RenderTargetView* target() const{return scene.target.p;}
    ID3D11Texture2D* colorTexture() const{return scene.texture.p;}
    void release(){levels.clear();scene=Image{};pending=false;}
    std::uint64_t textureBytes() const{std::uint64_t bytes=std::uint64_t(scene.width)*scene.height*8;for(const auto& layer:levels)bytes+=std::uint64_t(layer[0].width)*layer[0].height*16;return bytes;}
    std::uint64_t dispatches() const{return dispatches_;}std::uint64_t allocations() const{return allocations_;}std::uint64_t composites() const{return composites_;}
    std::size_t levelCount() const{return levels.size();}
};
#endif
}
