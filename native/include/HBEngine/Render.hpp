#pragma once
#include <HBEngine/Compute.hpp>
#if defined(_WIN32) && !defined(HB_COMPUTE_UNAVAILABLE)
#include <dxgi1_2.h>
#endif

namespace hb::gpu {
using Matrix=std::array<float,16>;
inline constexpr Matrix identity{1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1};
enum class ParticleBlend {Alpha,Additive,Opaque};
struct ParticleStyle {
    // Column-major matrices, D3D clip depth [0,1]. Billboard axes are world-space.
    Matrix viewProjection=identity,world=identity;
    std::array<float,3> right{1,0,0},up{0,1,0};
    std::array<float,4> color{1,1,1,1},endColor{1,1,1,0};
    float size=.1f,endScale=1;
    ParticleBlend blend=ParticleBlend::Alpha;
    bool depthTest=true,depthWrite=false;
};
inline Matrix orthographic(float width,float height,float nearPlane=0,float farPlane=1000){
    if(!std::isfinite(width)||!std::isfinite(height)||width<=0||height<=0||!std::isfinite(nearPlane)||!std::isfinite(farPlane)||farPlane<=nearPlane)throw std::runtime_error("GPU orthographic camera invalid");
    Matrix result=identity;result[0]=2/width;result[5]=2/height;result[10]=1/(farPlane-nearPlane);result[14]=-nearPlane/(farPlane-nearPlane);return result;
}
inline Matrix perspective(float fovDegrees,float aspect,float nearPlane=.1f,float farPlane=1000){
    if(!std::isfinite(fovDegrees)||fovDegrees<=0||fovDegrees>=180||!std::isfinite(aspect)||aspect<=0||!std::isfinite(nearPlane)||!std::isfinite(farPlane)||nearPlane<=0||farPlane<=nearPlane)throw std::runtime_error("GPU perspective camera invalid");
    const float scale=1/std::tan(fovDegrees*3.14159265358979323846f/360);return {scale/aspect,0,0,0,0,scale,0,0,0,0,farPlane/(farPlane-nearPlane),1,0,0,-nearPlane*farPlane/(farPlane-nearPlane),0};
}

#if defined(_WIN32) && !defined(HB_COMPUTE_UNAVAILABLE)
// The same structured buffer is a compute UAV and then a vertex-stage SRV.
// No positions are copied to the CPU or uploaded again for rendering.
class ParticleRenderer {
    Device& gpu;
    detail::Com<ID3D11Texture2D> color,depth,staging;
    detail::Com<ID3D11RenderTargetView> target;
    detail::Com<ID3D11DepthStencilView> depthTarget;
    detail::Com<ID3D11VertexShader> vertex;
    detail::Com<ID3D11PixelShader> pixel;
    detail::Com<ID3D11ComputeShader> compact;
    detail::Com<ID3D11Buffer> alive,arguments;
    detail::Com<ID3D11ShaderResourceView> aliveView;
    detail::Com<ID3D11UnorderedAccessView> aliveAppend;
    std::size_t aliveCapacity=0;
    detail::Com<ID3D11RasterizerState> raster;
    detail::Com<ID3D11ShaderResourceView> texture;
    std::array<detail::Com<ID3D11SamplerState>,2> samplers;
    bool nearest_=false;
    std::array<detail::Com<ID3D11Buffer>,3> constants;
    std::array<detail::Com<ID3D11BlendState>,3> blends;
    std::array<detail::Com<ID3D11DepthStencilState>,4> depths;
    detail::Com<IDXGISwapChain1> swap;
    detail::Com<ID3D11Texture2D> back;
    std::uint32_t width_=0,height_=0;
    std::size_t slot=0;
    std::uint64_t draws_=0,presents_=0,captures_=0;
    struct Constants {Matrix viewProjection,world;std::array<float,4> rightSize,upEndScale,startColor,endColor,options;};
    static constexpr const char* shader=R"(
struct Particle {float4 positionAge;float4 velocityLife;};
StructuredBuffer<Particle> particles:register(t0);
StructuredBuffer<uint> visible:register(t1);
AppendStructuredBuffer<uint> living:register(u0);
Texture2D sprite:register(t0);SamplerState spriteSampler:register(s0);
cbuffer View:register(b0){float4x4 viewProjection;float4x4 world;float4 rightSize;float4 upEndScale;float4 startColor;float4 endColor;float4 options;};
struct Vertex {float4 position:SV_Position;float2 uv:TEXCOORD0;float4 tint:COLOR0;};
Vertex VS(uint id:SV_VertexID,uint instance:SV_InstanceID){
  const float2 corners[6]={float2(-.5,-.5),float2(-.5,.5),float2(.5,.5),float2(-.5,-.5),float2(.5,.5),float2(.5,-.5)};
  Particle p=particles[visible[instance]];float age=saturate(p.positionAge.w/p.velocityLife.w);
  float2 corner=corners[id];float size=rightSize.w*lerp(1,upEndScale.w,age);
  float3 center=mul(world,float4(p.positionAge.xyz,1)).xyz;
  Vertex v;v.position=mul(viewProjection,float4(center+(rightSize.xyz*corner.x+upEndScale.xyz*corner.y)*size,1));
  v.uv=float2(corner.x+.5,.5-corner.y);v.tint=lerp(startColor,endColor,age);
  if(p.positionAge.w>=p.velocityLife.w){v.position=float4(2,2,2,1);v.tint=0;}
  return v;
}
float4 PS(Vertex v):SV_Target{float4 tex=options.x>0?sprite.Sample(spriteSampler,v.uv):float4(1,1,1,1-smoothstep(.35,.5,length(v.uv-.5)));float4 c=v.tint*tex;clip(c.a-.001);return c;}
[numthreads(64,1,1)]void Compact(uint3 id:SV_DispatchThreadID){uint index=id.x+id.y*(64*65535);uint count,stride;particles.GetDimensions(count,stride);if(index<count){Particle p=particles[index];if(p.positionAge.w<p.velocityLife.w)living.Append(index);}}
)";
    static void dimensions(std::uint32_t w,std::uint32_t h){if(!w||!h||w>D3D11_REQ_TEXTURE2D_U_OR_V_DIMENSION||h>D3D11_REQ_TEXTURE2D_U_OR_V_DIMENSION)throw std::runtime_error("GPU render dimensions exceed D3D11 texture limits");}
    template<std::size_t N> static bool finite(const std::array<float,N>& v){return std::all_of(v.begin(),v.end(),[](float f){return std::isfinite(f);});}
    void valid() const{if(!target.p)throw std::runtime_error("GPU render target unavailable");}
    void compactAlive(const Particles& particles){
        if(aliveCapacity!=particles.count()){
            D3D11_BUFFER_DESC desc{};desc.ByteWidth=detail::bytes(particles.count());desc.Usage=D3D11_USAGE_DEFAULT;desc.BindFlags=D3D11_BIND_UNORDERED_ACCESS|D3D11_BIND_SHADER_RESOURCE;desc.MiscFlags=D3D11_RESOURCE_MISC_BUFFER_STRUCTURED;desc.StructureByteStride=sizeof(UINT);
            detail::Com<ID3D11Buffer> next;detail::Com<ID3D11ShaderResourceView> view;detail::Com<ID3D11UnorderedAccessView> append;detail::check(gpu.device->CreateBuffer(&desc,nullptr,&next.p),"GPU living indices");detail::check(gpu.device->CreateShaderResourceView(next.p,nullptr,&view.p),"GPU living indices view");D3D11_UNORDERED_ACCESS_VIEW_DESC uav{};uav.ViewDimension=D3D11_UAV_DIMENSION_BUFFER;uav.Buffer.NumElements=static_cast<UINT>(particles.count());uav.Buffer.Flags=D3D11_BUFFER_UAV_FLAG_APPEND;detail::check(gpu.device->CreateUnorderedAccessView(next.p,&uav,&append.p),"GPU living append view");alive=std::move(next);aliveView=std::move(view);aliveAppend=std::move(append);aliveCapacity=particles.count();
        }
        auto* input=particles.buffer.srv.p;auto* output=aliveAppend.p;UINT counter=0;gpu.context->CSSetShader(compact.p,nullptr,0);gpu.context->CSSetShaderResources(0,1,&input);gpu.context->CSSetUnorderedAccessViews(0,1,&output,&counter);const auto groups=static_cast<UINT>((particles.count()+63)/64);gpu.context->Dispatch(std::min(groups,65535u),(groups+65534)/65535,1);
        input=nullptr;output=nullptr;gpu.context->CSSetShaderResources(0,1,&input);gpu.context->CSSetUnorderedAccessViews(0,1,&output,nullptr);gpu.context->CSSetShader(nullptr,nullptr,0);gpu.context->CopyStructureCount(arguments.p,sizeof(UINT),aliveAppend.p);
    }
    void allocate(std::uint32_t w,std::uint32_t h){
        D3D11_TEXTURE2D_DESC desc{};desc.Width=w;desc.Height=h;desc.MipLevels=1;desc.ArraySize=1;desc.Format=DXGI_FORMAT_R8G8B8A8_UNORM;desc.SampleDesc.Count=1;desc.Usage=D3D11_USAGE_DEFAULT;desc.BindFlags=D3D11_BIND_RENDER_TARGET;
        detail::Com<ID3D11Texture2D> nextColor,nextDepth;detail::Com<ID3D11RenderTargetView> nextTarget;detail::Com<ID3D11DepthStencilView> nextDepthTarget;
        detail::check(gpu.device->CreateTexture2D(&desc,nullptr,&nextColor.p),"GPU color target");detail::check(gpu.device->CreateRenderTargetView(nextColor.p,nullptr,&nextTarget.p),"GPU render view");
        desc.Format=DXGI_FORMAT_D32_FLOAT;desc.BindFlags=D3D11_BIND_DEPTH_STENCIL;detail::check(gpu.device->CreateTexture2D(&desc,nullptr,&nextDepth.p),"GPU depth target");detail::check(gpu.device->CreateDepthStencilView(nextDepth.p,nullptr,&nextDepthTarget.p),"GPU depth view");
        if(swap.p){gpu.context->OMSetRenderTargets(0,nullptr,nullptr);back={};const auto resized=swap->ResizeBuffers(0,w,h,DXGI_FORMAT_UNKNOWN,0);detail::check(swap->GetBuffer(0,__uuidof(ID3D11Texture2D),reinterpret_cast<void**>(&back.p)),"GPU swap buffer");detail::check(resized,"GPU swap resize");}
        gpu.context->OMSetRenderTargets(0,nullptr,nullptr);color=std::move(nextColor);target=std::move(nextTarget);depth=std::move(nextDepth);depthTarget=std::move(nextDepthTarget);staging={};width_=w;height_=h;
    }
public:
    // hwnd is optional and borrowed. This renderer never opens or closes windows.
    ParticleRenderer(Device& device,std::uint32_t width,std::uint32_t height,void* hwnd=nullptr):gpu(device){
        dimensions(width,height);std::lock_guard<std::mutex> lock(gpu.mutex);
        auto compile=detail::libraries().symbol<decltype(&D3DCompile)>(detail::libraries().compiler,"D3DCompile");
        for(const auto* entry:{"VS","PS","Compact"}){detail::Com<ID3DBlob> code,error;const auto result=compile(shader,std::strlen(shader),"HBParticleRender",nullptr,nullptr,entry,entry[0]=='V'?"vs_5_0":entry[0]=='P'?"ps_5_0":"cs_5_0",D3DCOMPILE_ENABLE_STRICTNESS|D3DCOMPILE_OPTIMIZATION_LEVEL3,0,&code.p,&error.p);if(FAILED(result))throw std::runtime_error(error.p?std::string(static_cast<const char*>(error->GetBufferPointer()),error->GetBufferSize()):"GPU render shader compile failed");if(entry[0]=='V')detail::check(gpu.device->CreateVertexShader(code->GetBufferPointer(),code->GetBufferSize(),nullptr,&vertex.p),"GPU vertex shader");else if(entry[0]=='P')detail::check(gpu.device->CreatePixelShader(code->GetBufferPointer(),code->GetBufferSize(),nullptr,&pixel.p),"GPU pixel shader");else detail::check(gpu.device->CreateComputeShader(code->GetBufferPointer(),code->GetBufferSize(),nullptr,&compact.p),"GPU living indices shader");}
        const UINT args[4]={6,0,0,0};D3D11_BUFFER_DESC indirect{};indirect.ByteWidth=sizeof(args);indirect.Usage=D3D11_USAGE_DEFAULT;indirect.MiscFlags=D3D11_RESOURCE_MISC_DRAWINDIRECT_ARGS;D3D11_SUBRESOURCE_DATA initial{};initial.pSysMem=args;detail::check(gpu.device->CreateBuffer(&indirect,&initial,&arguments.p),"GPU indirect draw arguments");
        D3D11_BUFFER_DESC cb{};cb.ByteWidth=sizeof(Constants);cb.Usage=D3D11_USAGE_DYNAMIC;cb.BindFlags=D3D11_BIND_CONSTANT_BUFFER;cb.CPUAccessFlags=D3D11_CPU_ACCESS_WRITE;for(auto& buffer:constants)detail::check(gpu.device->CreateBuffer(&cb,nullptr,&buffer.p),"GPU render frame constants");
        D3D11_RASTERIZER_DESC rs{};rs.FillMode=D3D11_FILL_SOLID;rs.CullMode=D3D11_CULL_NONE;rs.DepthClipEnable=TRUE;detail::check(gpu.device->CreateRasterizerState(&rs,&raster.p),"GPU raster state");
        for(std::size_t i=0;i<samplers.size();i++){D3D11_SAMPLER_DESC s{};s.Filter=i?D3D11_FILTER_MIN_MAG_MIP_POINT:D3D11_FILTER_MIN_MAG_MIP_LINEAR;s.AddressU=s.AddressV=s.AddressW=D3D11_TEXTURE_ADDRESS_CLAMP;s.MaxLOD=D3D11_FLOAT32_MAX;detail::check(gpu.device->CreateSamplerState(&s,&samplers[i].p),"GPU sprite sampler");}
        for(std::size_t i=0;i<blends.size();i++){D3D11_BLEND_DESC b{};auto& rt=b.RenderTarget[0];rt.BlendEnable=i!=2;rt.SrcBlend=D3D11_BLEND_SRC_ALPHA;rt.DestBlend=i==1?D3D11_BLEND_ONE:D3D11_BLEND_INV_SRC_ALPHA;rt.BlendOp=D3D11_BLEND_OP_ADD;rt.SrcBlendAlpha=D3D11_BLEND_ONE;rt.DestBlendAlpha=D3D11_BLEND_INV_SRC_ALPHA;rt.BlendOpAlpha=D3D11_BLEND_OP_ADD;rt.RenderTargetWriteMask=D3D11_COLOR_WRITE_ENABLE_ALL;detail::check(gpu.device->CreateBlendState(&b,&blends[i].p),"GPU blend state");}
        for(std::size_t i=0;i<depths.size();i++){D3D11_DEPTH_STENCIL_DESC d{};d.DepthEnable=TRUE;d.DepthFunc=(i&1)?D3D11_COMPARISON_LESS_EQUAL:D3D11_COMPARISON_ALWAYS;d.DepthWriteMask=(i&2)?D3D11_DEPTH_WRITE_MASK_ALL:D3D11_DEPTH_WRITE_MASK_ZERO;detail::check(gpu.device->CreateDepthStencilState(&d,&depths[i].p),"GPU depth state");}
        allocate(width,height);
        if(hwnd){detail::Com<IDXGIDevice> dx;detail::Com<IDXGIAdapter> adapter;detail::Com<IDXGIFactory2> factory;detail::check(gpu.device->QueryInterface(__uuidof(IDXGIDevice),reinterpret_cast<void**>(&dx.p)),"GPU DXGI device");detail::check(dx->GetAdapter(&adapter.p),"GPU DXGI adapter");detail::check(adapter->GetParent(__uuidof(IDXGIFactory2),reinterpret_cast<void**>(&factory.p)),"GPU DXGI factory");DXGI_SWAP_CHAIN_DESC1 desc{};desc.Width=width;desc.Height=height;desc.Format=DXGI_FORMAT_R8G8B8A8_UNORM;desc.SampleDesc.Count=1;desc.BufferUsage=DXGI_USAGE_RENDER_TARGET_OUTPUT;desc.BufferCount=2;desc.SwapEffect=DXGI_SWAP_EFFECT_FLIP_DISCARD;detail::check(factory->CreateSwapChainForHwnd(gpu.device.p,static_cast<HWND>(hwnd),&desc,nullptr,nullptr,&swap.p),"GPU window swap chain");detail::check(factory->MakeWindowAssociation(static_cast<HWND>(hwnd),DXGI_MWA_NO_ALT_ENTER),"GPU window association");detail::check(swap->GetBuffer(0,__uuidof(ID3D11Texture2D),reinterpret_cast<void**>(&back.p)),"GPU swap buffer");}
    }
    ParticleRenderer(const ParticleRenderer&)=delete;ParticleRenderer& operator=(const ParticleRenderer&)=delete;
    ~ParticleRenderer(){std::lock_guard<std::mutex> lock(gpu.mutex);gpu.context->OMSetRenderTargets(0,nullptr,nullptr);if(swap.p){back={};swap={};gpu.context->Flush();}}
    std::uint32_t width() const{return width_;}std::uint32_t height() const{return height_;}
    std::uint64_t draws() const{return draws_;}std::uint64_t presents() const{return presents_;}std::uint64_t captures() const{return captures_;}
    static constexpr std::size_t constantBufferAllocations(){return 3;}
    void resize(std::uint32_t width,std::uint32_t height){dimensions(width,height);std::lock_guard<std::mutex> lock(gpu.mutex);if(width!=width_||height!=height_)allocate(width,height);}
    // Already-decoded top-to-bottom RGBA8 pixels; upload once when the asset changes.
    void setTexture(std::uint32_t width,std::uint32_t height,const std::vector<std::uint8_t>& rgba,bool nearest=false){dimensions(width,height);if(rgba.size()!=std::size_t(width)*height*4)throw std::runtime_error("GPU sprite RGBA byte size mismatch");std::lock_guard<std::mutex> lock(gpu.mutex);D3D11_TEXTURE2D_DESC desc{};desc.Width=width;desc.Height=height;desc.MipLevels=1;desc.ArraySize=1;desc.Format=DXGI_FORMAT_R8G8B8A8_UNORM;desc.SampleDesc.Count=1;desc.Usage=D3D11_USAGE_IMMUTABLE;desc.BindFlags=D3D11_BIND_SHADER_RESOURCE;D3D11_SUBRESOURCE_DATA data{rgba.data(),width*4,0};detail::Com<ID3D11Texture2D> image;detail::Com<ID3D11ShaderResourceView> view;detail::check(gpu.device->CreateTexture2D(&desc,&data,&image.p),"GPU sprite texture");detail::check(gpu.device->CreateShaderResourceView(image.p,nullptr,&view.p),"GPU sprite texture view");texture=std::move(view);nearest_=nearest;}
    void clearTexture(){std::lock_guard<std::mutex> lock(gpu.mutex);texture={};}
    void clear(const std::array<float,4>& rgba={0,0,0,1}){if(!finite(rgba))throw std::runtime_error("GPU clear color invalid");std::lock_guard<std::mutex> lock(gpu.mutex);valid();gpu.context->ClearRenderTargetView(target.p,rgba.data());gpu.context->ClearDepthStencilView(depthTarget.p,D3D11_CLEAR_DEPTH,1,0);}
    void draw(const Particles& particles,const ParticleStyle& style={}){
        const auto blend=static_cast<std::size_t>(style.blend);if(!finite(style.viewProjection)||!finite(style.world)||!finite(style.right)||!finite(style.up)||!finite(style.color)||!finite(style.endColor)||!std::isfinite(style.size)||style.size<0||!std::isfinite(style.endScale)||style.endScale<0||blend>=blends.size())throw std::runtime_error("GPU particle render style invalid");
        std::lock_guard<std::mutex> lock(gpu.mutex);valid();gpu.owns(particles.buffer);
        compactAlive(particles);
        Constants data{style.viewProjection,style.world,{style.right[0],style.right[1],style.right[2],style.size},{style.up[0],style.up[1],style.up[2],style.endScale},style.color,style.endColor,{texture.p?1.f:0.f,0,0,0}};auto* cb=constants[slot].p;D3D11_MAPPED_SUBRESOURCE mapped{};detail::check(gpu.context->Map(cb,0,D3D11_MAP_WRITE_DISCARD,0,&mapped),"GPU render constants upload");std::memcpy(mapped.pData,&data,sizeof(data));gpu.context->Unmap(cb,0);slot=(slot+1)%constants.size();
        D3D11_VIEWPORT viewport{0,0,float(width_),float(height_),0,1};auto* view=target.p;gpu.context->OMSetRenderTargets(1,&view,depthTarget.p);gpu.context->OMSetBlendState(blends[blend].p,nullptr,0xffffffff);gpu.context->OMSetDepthStencilState(depths[(style.depthTest?1:0)|(style.depthWrite?2:0)].p,0);gpu.context->RSSetState(raster.p);gpu.context->RSSetViewports(1,&viewport);gpu.context->IASetInputLayout(nullptr);gpu.context->IASetPrimitiveTopology(D3D11_PRIMITIVE_TOPOLOGY_TRIANGLELIST);gpu.context->VSSetShader(vertex.p,nullptr,0);gpu.context->PSSetShader(pixel.p,nullptr,0);gpu.context->VSSetConstantBuffers(0,1,&cb);gpu.context->PSSetConstantBuffers(0,1,&cb);auto* tex=texture.p;auto* sampler=samplers[nearest_?1:0].p;gpu.context->PSSetShaderResources(0,1,&tex);gpu.context->PSSetSamplers(0,1,&sampler);ID3D11ShaderResourceView* srvs[]={particles.buffer.srv.p,aliveView.p};gpu.context->VSSetShaderResources(0,2,srvs);gpu.context->DrawInstancedIndirect(arguments.p,0);
        // Clear the SRV before the next compute UAV binding of this same buffer.
        srvs[0]=srvs[1]=nullptr;cb=nullptr;tex=nullptr;sampler=nullptr;gpu.context->VSSetShaderResources(0,2,srvs);gpu.context->PSSetShaderResources(0,1,&tex);gpu.context->VSSetConstantBuffers(0,1,&cb);gpu.context->PSSetConstantBuffers(0,1,&cb);gpu.context->PSSetSamplers(0,1,&sampler);gpu.context->VSSetShader(nullptr,nullptr,0);gpu.context->PSSetShader(nullptr,nullptr,0);gpu.context->OMSetRenderTargets(0,nullptr,nullptr);detail::check(gpu.device->GetDeviceRemovedReason(),"GPU render device lost");++draws_;
    }
    // Explicit capture is the only CPU texture transfer; keep it out of frame loops.
    std::vector<std::uint8_t> readPixels(){
        std::lock_guard<std::mutex> lock(gpu.mutex);valid();if(!staging.p){D3D11_TEXTURE2D_DESC desc{};color->GetDesc(&desc);desc.Usage=D3D11_USAGE_STAGING;desc.BindFlags=0;desc.CPUAccessFlags=D3D11_CPU_ACCESS_READ;detail::check(gpu.device->CreateTexture2D(&desc,nullptr,&staging.p),"GPU capture staging");}std::vector<std::uint8_t> bytes(std::size_t(width_)*height_*4);gpu.context->CopyResource(staging.p,color.p);D3D11_MAPPED_SUBRESOURCE mapped{};detail::check(gpu.context->Map(staging.p,0,D3D11_MAP_READ,0,&mapped),"GPU capture readback");for(std::uint32_t y=0;y<height_;y++)std::memcpy(bytes.data()+std::size_t(y)*width_*4,static_cast<const std::uint8_t*>(mapped.pData)+std::size_t(y)*mapped.RowPitch,std::size_t(width_)*4);gpu.context->Unmap(staging.p,0);++captures_;return bytes;
    }
    bool present(std::uint32_t syncInterval=0){if(syncInterval>4)throw std::runtime_error("GPU present interval invalid");std::lock_guard<std::mutex> lock(gpu.mutex);valid();if(!swap.p)throw std::runtime_error("GPU present requires an HWND");gpu.context->CopyResource(back.p,color.p);const auto result=swap->Present(syncInterval,0);detail::check(result,"GPU present");++presents_;return result!=DXGI_STATUS_OCCLUDED;}
};
#else
class ParticleRenderer {
public:
    ParticleRenderer(Device&,std::uint32_t,std::uint32_t,void* =nullptr){throw std::runtime_error("GPU render requires Windows hardware");}
    std::uint32_t width() const{return 0;}std::uint32_t height() const{return 0;}
    std::uint64_t draws() const{return 0;}std::uint64_t presents() const{return 0;}std::uint64_t captures() const{return 0;}
    static constexpr std::size_t constantBufferAllocations(){return 3;}
    void resize(std::uint32_t,std::uint32_t){throw std::runtime_error("GPU render unavailable");}
    void setTexture(std::uint32_t,std::uint32_t,const std::vector<std::uint8_t>&,bool=false){throw std::runtime_error("GPU render unavailable");}
    void clearTexture(){throw std::runtime_error("GPU render unavailable");}
    void clear(const std::array<float,4>& ={0,0,0,1}){throw std::runtime_error("GPU render unavailable");}
    void draw(const Particles&,const ParticleStyle& ={}){throw std::runtime_error("GPU render unavailable");}
    std::vector<std::uint8_t> readPixels(){throw std::runtime_error("GPU render unavailable");}
    bool present(std::uint32_t=0){throw std::runtime_error("GPU render unavailable");}
};
#endif

struct Particle {
    std::array<float,3> position{0,0,0},velocity{0,0,0};
    float lifetime=5,age=0;
};
struct ParticleEmitter {float rate=0;Particle birth;};
// Owns GPU resources in dependency order. Ordinary game code needs no D3D calls,
// HLSL, raw structured-record layout or explicit device/context lifetime handling.
class ParticleEffect {
    static std::vector<float> records(const std::vector<Particle>& values){
        if(values.empty()||values.size()>std::numeric_limits<std::uint32_t>::max()/32)throw std::runtime_error("GPU effect particle byte size invalid");
        std::vector<float> out;out.reserve(values.size()*8);for(const auto& p:values){out.insert(out.end(),p.position.begin(),p.position.end());out.push_back(p.age);out.insert(out.end(),p.velocity.begin(),p.velocity.end());out.push_back(p.lifetime);}return out;
    }
    Device device;
    Particles particles;
    ParticleRenderer renderer;
    bool window;
    bool playing=true,paused=false;
    double carry=0;
    std::vector<float> births;
    static void validBirth(const Particle& p){
        if(!std::isfinite(p.lifetime)||!std::isfinite(p.age)||p.lifetime<=0||p.age<0||p.age>=p.lifetime||!std::all_of(p.position.begin(),p.position.end(),[](float v){return std::isfinite(v);})||!std::all_of(p.velocity.begin(),p.velocity.end(),[](float v){return std::isfinite(v);}))throw std::runtime_error("GPU emitter birth invalid");
    }
    void emitUniform(std::size_t count,const Particle& p){
        if(!count)return;
        validBirth(p);
        count=std::min(count,particles.count());births.resize(count*8);for(std::size_t i=0;i<count;i++){auto* data=births.data()+i*8;std::copy(p.position.begin(),p.position.end(),data);data[3]=p.age;std::copy(p.velocity.begin(),p.velocity.end(),data+4);data[7]=p.lifetime;}particles.emit(births);
    }
public:
    ParticleStyle style;
    ParticleEmitter emitter;
    ParticleEffect(const std::vector<Particle>& values,std::uint32_t width,std::uint32_t height,void* hwnd=nullptr):device(),particles(device,records(values)),renderer(device,width,height,hwnd),window(hwnd!=nullptr){}
    ParticleEffect(std::size_t capacity,std::uint32_t width,std::uint32_t height,void* hwnd=nullptr):device(),particles(device,capacity),renderer(device,width,height,hwnd),window(hwnd!=nullptr){}
    void update(float delta,const std::array<float,3>& force={0,0,0},float gravity=0,float drag=0){
        Particles::validStep(delta,force,gravity,drag);if(!std::isfinite(emitter.rate)||emitter.rate<0)throw std::runtime_error("GPU emitter rate invalid");if(paused)return;
        if(playing&&delta&&emitter.rate)validBirth(emitter.birth);
        particles.step(delta,force,gravity,drag);if(playing&&delta&&emitter.rate){const double next=carry+double(emitter.rate)*delta,whole=std::floor(next);if(whole>=1)emitUniform(static_cast<std::size_t>(std::min(whole,double(particles.count()))),emitter.birth);carry=next-whole;}
    }
    void emit(const std::vector<Particle>& values){if(!values.empty())particles.emit(records(values));}
    void emit(std::size_t count,const Particle& birth={}){emitUniform(count,birth);}
    void play(){playing=true;paused=false;}
    void pause(bool value=true){paused=value;}
    void stop(bool clearParticles=false){playing=false;paused=false;carry=0;if(clearParticles)particles.clear();}
    void clear(){particles.clear();carry=0;}
    bool isPlaying() const{return playing&&!paused;}
    bool isPaused() const{return paused;}
    bool draw(const std::array<float,4>& clearColor={0,0,0,1},std::uint32_t syncInterval=0){if(syncInterval>4)throw std::runtime_error("GPU effect present interval invalid");renderer.clear(clearColor);renderer.draw(particles,style);return window?renderer.present(syncInterval):true;}
    void resize(std::uint32_t width,std::uint32_t height){renderer.resize(width,height);}
    void setTexture(std::uint32_t width,std::uint32_t height,const std::vector<std::uint8_t>& rgba,bool nearest=false){renderer.setTexture(width,height,rgba,nearest);}
    void clearTexture(){renderer.clearTexture();}
    void reset(const std::vector<Particle>& values){particles.reset(records(values));carry=0;}
    std::vector<std::uint8_t> capture(){return renderer.readPixels();}
    std::size_t count() const{return particles.count();}
    std::uint64_t draws() const{return renderer.draws();}
    std::size_t emissionBufferAllocations() const{return particles.emissionBufferAllocations();}
};
}
