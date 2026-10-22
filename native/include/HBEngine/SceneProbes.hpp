#pragma once
#include "Render.hpp"
#include "ScreenEffectsPass.hpp"

namespace hb::gpu {
struct ProbeSettings {
    std::array<float,4> center{0,0,0,1},minimum{-5,-5,-5,1},maximum{5,5,5,0},options{1,0,1,1};
    std::array<float,4> localX{1,0,0,0},localY{0,1,0,0},localZ{0,0,1,0},faceScale{1,1,1,0};
    std::array<float,4> projectionMinimum{-1,-1,-1,0},projectionMaximum{1,1,1,0},projectionX{1,0,0,0},projectionY{0,1,0,0},projectionZ{0,0,1,0};
    std::array<float,4> blendPositive{},blendNegative{},fadePositive{1,1,1,0},fadeNegative{1,1,1,0},normalPositive{},normalNegative{};
};
static_assert(sizeof(ProbeSettings)==304,"HLSL probe settings layout");
inline bool probeVolumeBasisUsable(const ProbeSettings& p){
    const double a=p.localX[0],b=p.localX[1],c=p.localX[2],d=p.localY[0],e=p.localY[1],f=p.localY[2],g=p.localZ[0],h=p.localZ[1],i=p.localZ[2],determinant=a*(e*i-f*h)-b*(d*i-f*g)+c*(d*h-e*g);
    if(!std::isfinite(determinant)||determinant==0||!std::isfinite(p.options[3])||p.options[3]<0||p.options[3]>7||std::floor(p.options[3])!=p.options[3])return false;
    if((static_cast<unsigned>(p.options[3])&2u)!=0){const auto radius=p.maximum[0];if(radius<.001f||radius>1000000.f)return false;for(unsigned j=0;j<3;j++)if(p.minimum[j]!=-radius||p.maximum[j]!=radius)return false;const std::array<std::array<float,4>,3> rows{p.localX,p.localY,p.localZ};for(unsigned j=0;j<3;j++)for(unsigned k=0;k<3;k++){double dot=0;for(unsigned q=0;q<3;q++)dot+=double(rows[j][q])*rows[k][q];if(std::abs(dot-(j==k?1.:0.))>2e-5)return false;}}
    return true;
}
inline bool probeInfluenceUsable(const ProbeSettings& p){
    for(const auto* row:{&p.blendPositive,&p.blendNegative,&p.fadePositive,&p.fadeNegative,&p.normalPositive,&p.normalNegative})if(!std::all_of(row->begin(),row->end(),[](float v){return std::isfinite(v);}))return false;
    const auto mode=p.blendPositive[3];if(!std::isfinite(p.options[3])||(std::fmod(p.options[3],4.f)>1.5f&&std::fmod(mode,2.f)>0))return false;if(mode<0||mode>3||std::floor(mode)!=mode)return false;
    for(unsigned i=0;i<3;i++){if(p.blendPositive[i]<0||p.blendNegative[i]<0||p.normalPositive[i]<0||p.normalNegative[i]<0||p.blendPositive[i]>100000||p.blendNegative[i]>100000||p.normalPositive[i]>100000||p.normalNegative[i]>100000||p.fadePositive[i]<0||p.fadePositive[i]>1||p.fadeNegative[i]<0||p.fadeNegative[i]>1)return false;}
    return true;
}
inline void setProbeInfluence(ProbeSettings& settings,const std::array<float,3>& positive,const std::array<float,3>& negative,const std::array<float,3>& fadePositive={1,1,1},const std::array<float,3>& fadeNegative={1,1,1},const std::array<float,3>& normalPositive={0,0,0},const std::array<float,3>& normalNegative={0,0,0},bool advanced=true){
    auto next=settings;bool normal=false;for(unsigned i=0;i<3;i++){next.blendPositive[i]=positive[i];next.blendNegative[i]=negative[i];next.fadePositive[i]=fadePositive[i];next.fadeNegative[i]=fadeNegative[i];next.normalPositive[i]=normalPositive[i];next.normalNegative[i]=normalNegative[i];normal=normal||normalPositive[i]>0||normalNegative[i]>0;}next.blendPositive[3]=(advanced?1.f:0.f)+(normal?2.f:0.f);if(!probeInfluenceUsable(next))throw std::runtime_error("Probe influence values invalid");settings=next;
}
inline bool probeProjectionUsable(const ProbeSettings& p){
    for(const auto* row:{&p.projectionMinimum,&p.projectionMaximum,&p.projectionX,&p.projectionY,&p.projectionZ})if(!std::all_of(row->begin(),row->end(),[](float v){return std::isfinite(v);}))return false;
    const auto mode=p.projectionMinimum[3];if(mode<0||mode>3||std::floor(mode)!=mode)return false;if(mode==0||mode==3)return true;
    ProbeSettings proxy;proxy.minimum=p.projectionMinimum;proxy.maximum=p.projectionMaximum;proxy.localX=p.projectionX;proxy.localY=p.projectionY;proxy.localZ=p.projectionZ;proxy.options[3]=mode==2?3:1;for(unsigned i=0;i<3;i++)if(proxy.minimum[i]>=proxy.maximum[i])return false;return probeVolumeBasisUsable(proxy);
}
inline void setProbeWorldToLocal(ProbeSettings& settings,const Matrix& matrix){
    if(!std::all_of(matrix.begin(),matrix.end(),[](float v){return std::isfinite(v);})||matrix[3]!=0||matrix[7]!=0||matrix[11]!=0||matrix[15]!=1)throw std::runtime_error("Probe affine transform invalid");
    const double a=matrix[0],b=matrix[4],c=matrix[8],d=matrix[1],e=matrix[5],f=matrix[9],g=matrix[2],h=matrix[6],i=matrix[10],determinant=a*(e*i-f*h)-b*(d*i-f*g)+c*(d*h-e*g);
    if(!std::isfinite(determinant)||determinant==0)throw std::runtime_error("Probe singular transform");
    auto next=settings;next.localX={matrix[0],matrix[4],matrix[8],matrix[12]};next.localY={matrix[1],matrix[5],matrix[9],matrix[13]};next.localZ={matrix[2],matrix[6],matrix[10],matrix[14]};
    next.faceScale={float(1/std::hypot(a,b,c)),float(1/std::hypot(d,e,f)),float(1/std::hypot(g,h,i)),0};
    if(!std::all_of(next.faceScale.begin(),next.faceScale.end(),[](float v){return std::isfinite(v);})||next.faceScale[0]<=0||next.faceScale[1]<=0||next.faceScale[2]<=0)throw std::runtime_error("Probe face scale invalid");
    settings=next;
}
inline void setProbeSphereVolume(ProbeSettings& settings,const std::array<float,3>& worldCenter,float radius,bool projection=true){
 if(!std::all_of(worldCenter.begin(),worldCenter.end(),[](float v){return std::isfinite(v);})||!std::isfinite(radius)||radius<.001f||radius>1000000.f)throw std::runtime_error("Probe sphere center/radius invalid");
 auto p=settings;p.localX={1,0,0,-worldCenter[0]};p.localY={0,1,0,-worldCenter[1]};p.localZ={0,0,1,-worldCenter[2]};p.minimum={-radius,-radius,-radius,settings.minimum[3]};p.maximum={radius,radius,radius,settings.maximum[3]};p.faceScale={1,1,1,0};p.options[3]=(std::isfinite(settings.options[3])&&settings.options[3]>=4&&settings.options[3]<=7?4.f:0.f)+(projection?3.f:2.f);settings=p;
}

inline void setProbeInfluenceProjection(ProbeSettings& settings){settings.projectionMinimum[3]=0;}
inline void setProbeInfiniteProjection(ProbeSettings& settings){settings.projectionMinimum[3]=3;}
inline void setProbeProjectionBox(ProbeSettings& settings,const Matrix& worldToLocal,const std::array<float,3>& minimum,const std::array<float,3>& maximum){
    ProbeSettings box;setProbeWorldToLocal(box,worldToLocal);auto next=settings;for(unsigned i=0;i<3;i++){next.projectionMinimum[i]=minimum[i];next.projectionMaximum[i]=maximum[i];}next.projectionMinimum[3]=1;next.projectionX=box.localX;next.projectionY=box.localY;next.projectionZ=box.localZ;if(!probeProjectionUsable(next))throw std::runtime_error("Probe projection box invalid");settings=next;
}
inline void setProbeProjectionSphere(ProbeSettings& settings,const std::array<float,3>& worldCenter,float radius){
    ProbeSettings sphere;setProbeSphereVolume(sphere,worldCenter,radius);auto next=settings;next.projectionMinimum=sphere.minimum;next.projectionMinimum[3]=2;next.projectionMaximum=sphere.maximum;next.projectionX=sphere.localX;next.projectionY=sphere.localY;next.projectionZ=sphere.localZ;if(!probeProjectionUsable(next))throw std::runtime_error("Probe projection sphere invalid");settings=next;
}
inline void setProbePriorityBlend(ProbeSettings& settings,bool enabled){const float flags=settings.options[3];if(!std::isfinite(flags)||flags<0||flags>7||std::floor(flags)!=flags)throw std::runtime_error("Probe flags invalid");settings.options[3]=std::fmod(flags,4.f)+(enabled?4.f:0.f);}

#if defined(_WIN32) && !defined(HB_COMPUTE_UNAVAILABLE)
class SceneProbes {
public:
    struct Probe {
        friend class SceneProbes;friend class SceneRenderer;friend class SceneProbeAtlas;
    private:
        detail::Com<ID3D11Texture2D> capture,filtered;
        detail::Com<ID3D11ShaderResourceView> source,view,irradiance;
        detail::Com<ID3D11Buffer> coefficients;
        detail::Com<ID3D11UnorderedAccessView> coefficientOutput;
        std::array<detail::Com<ID3D11RenderTargetView>,6> faces;
        detail::Com<ID3D11DepthStencilView> depth;
        std::vector<detail::Com<ID3D11UnorderedAccessView>> levels;
        ID3D11Device* owner=nullptr;UINT size=0,mips=0;bool ready=false;std::uint64_t identity=0,revision=0;
    public:
        Probe()=default;Probe(Probe&&)=default;Probe& operator=(Probe&&)=default;
        std::uint64_t storageBytes() const{std::uint64_t pixels=0;for(UINT s=size;s;s/=2)pixels+=std::uint64_t(s)*s;return std::uint64_t(size)*size*52+pixels*48+9*16;}
        bool available() const{return ready;}
    };
private:
    Device& gpu;
    detail::Com<ID3D11ComputeShader> prefilter,integrate,diffuse,equirect;
    std::array<std::shared_ptr<detail::ShaderPreparationQueue::Job>,4> preparing;
    std::array<bool,4> retried{};bool asynchronous=false,requested=false;std::string preparationError;
    detail::Com<ID3D11SamplerState> sampler;
    std::array<detail::Com<ID3D11Buffer>,3> constants;std::size_t slot=0;
    detail::Com<ID3D11ShaderResourceView> brdf;
    std::uint64_t dispatches_=0,captures_=0;inline static std::atomic<std::uint64_t> identities_{0};
    static constexpr const char* shader=R"HLSL(
cbuffer FilterSettings:register(b0){float4 settings;};
TextureCube<float4> source:register(t0);Texture2D<float4> panorama:register(t1);SamplerState linearClamp:register(s0);SamplerState panoramaSampler:register(s1);
RWTexture2DArray<float4> filtered:register(u0);RWStructuredBuffer<float4> coefficients:register(u1);RWTexture2D<float2> brdf:register(u2);
float3 faceDirection(uint f,float2 uv){float2 p=uv*2-1;float3 d=f==0?float3(1,-p.y,-p.x):f==1?float3(-1,-p.y,p.x):f==2?float3(p.x,1,p.y):f==3?float3(p.x,-1,-p.y):f==4?float3(p.x,-p.y,1):float3(-p.x,-p.y,-1);return normalize(d);}
[numthreads(8,8,1)]void Equirect(uint3 id:SV_DispatchThreadID){if(any(id.xy>=(uint2)settings.xx)||id.z>=6)return;float3 d=faceDirection(id.z,(id.xy+.5)/settings.x);float2 uv=float2(atan2(d.z,d.x)/6.283185307+.5,asin(clamp(d.y,-1,1))/3.141592654+.5);filtered[id]=float4(panorama.SampleLevel(panoramaSampler,uv,0).rgb,1);}
float radical(uint n){n=(n<<16)|(n>>16);n=((n&0x55555555)<<1)|((n&0xAAAAAAAA)>>1);n=((n&0x33333333)<<2)|((n&0xCCCCCCCC)>>2);n=((n&0x0F0F0F0F)<<4)|((n&0xF0F0F0F0)>>4);n=((n&0x00FF00FF)<<8)|((n&0xFF00FF00)>>8);return n*2.3283064365386963e-10;}
float3 sampleGGX(float2 xi,float rough,float3 n){float a=rough*rough,phi=6.283185307*xi.x,c=sqrt((1-xi.y)/max(1+(a*a-1)*xi.y,1e-6)),s=sqrt(max(0,1-c*c));float3 h=float3(cos(phi)*s,sin(phi)*s,c),up=abs(n.z)<.999?float3(0,0,1):float3(1,0,0),t=normalize(cross(up,n));return t*h.x+cross(n,t)*h.y+n*h.z;}
[numthreads(8,8,1)]void Prefilter(uint3 id:SV_DispatchThreadID){if(any(id.xy>=(uint2)settings.xx)||id.z>=6)return;float3 n=faceDirection(id.z,(id.xy+.5)/settings.x),sum=0;float weight=0;
 for(uint j=0;j<64;j++){float3 h=sampleGGX(float2(j/64.0,radical(j)),settings.y,n),l=normalize(2*dot(n,h)*h-n);float nl=saturate(dot(n,l));if(nl>0){sum+=source.SampleLevel(linearClamp,l,0).rgb*nl;weight+=nl;}}filtered[id]=float4(sum/max(weight,1e-5),1);}
float basis(uint i,float3 d){return i==0?.282094792:i==1?.488602512*d.y:i==2?.488602512*d.z:i==3?.488602512*d.x:i==4?1.092548431*d.x*d.y:i==5?1.092548431*d.y*d.z:i==6?.315391565*(3*d.z*d.z-1):i==7?1.092548431*d.x*d.z:.546274215*(d.x*d.x-d.y*d.y);}
[numthreads(9,1,1)]void Diffuse(uint3 id:SV_DispatchThreadID){float3 c=0;float total=0;
 for(uint f=0;f<6;f++)for(uint y=0;y<16;y++)for(uint x=0;x<16;x++){float2 uv=(float2(x,y)+.5)/16,p=uv*2-1;float w=4/(256*pow(1+dot(p,p),1.5));float3 d=faceDirection(f,uv);c+=source.SampleLevel(linearClamp,d,0).rgb*basis(id.x,d)*w;total+=w;}
 float convolution=id.x==0?3.141592654:id.x<4?2.094395102:.785398163;coefficients[id.x]=float4(c*(12.566370614/total)*convolution,0);}
[numthreads(8,8,1)]void Integrate(uint3 id:SV_DispatchThreadID){if(any(id.xy>=128))return;float nv=(id.x+.5)/128,rough=(id.y+.5)/128;float3 v=float3(sqrt(1-nv*nv),0,nv);float2 sum=0;
 for(uint j=0;j<128;j++){float3 h=sampleGGX(float2(j/128.0,radical(j)),rough,float3(0,0,1)),l=normalize(2*dot(v,h)*h-v);float nl=saturate(l.z),nh=saturate(h.z),vh=saturate(dot(v,h));if(nl>0){float k=rough*rough*.5,g=(nv/(nv*(1-k)+k))*(nl/(nl*(1-k)+k)),visibility=g*vh/max(nh*nv,1e-5),f=pow(1-vh,5);sum+=float2(1-f,f)*visibility;}}brdf[id.xy]=sum/128;}
)HLSL";
    bool prepare(){
        requested=true;if(brdf.p)return true;if(!preparationError.empty())throw std::runtime_error(preparationError);
        std::size_t index=0;for(const auto& entry:std::array<std::pair<const char*,detail::Com<ID3D11ComputeShader>*>,4>{{{"Prefilter",&prefilter},{"Integrate",&integrate},{"Diffuse",&diffuse},{"Equirect",&equirect}}}){
            if(!entry.second->p){
                if(!asynchronous)detail::ShaderBytecodeCompiler::create(shader,"HBProbeFilter",entry.first,"cs_5_0",[&](const void* bytes,std::size_t size){std::lock_guard<std::mutex> lock(gpu.mutex);return gpu.device->CreateComputeShader(bytes,size,nullptr,&entry.second->p);});
                else{
                    auto& job=preparing[index];if(!job){const bool refresh=retried[index];const std::string name=entry.first,key="HBProbeFilter:"+name+(refresh?":refresh:":":cached:")+shader;job=ScreenEffectsPass::sharedPreparationQueue().submit(key,256+key.size()*2+std::strlen(shader),[name,refresh]{return detail::ShaderBytecodeCompiler::create(shader,"HBProbeFilter",name.c_str(),"cs_5_0",[](const void*,std::size_t){return S_OK;},refresh).code;});}
                    if(job){const auto status=job->status.load(std::memory_order_acquire);if(status==detail::ShaderPreparationQueue::Status::failed){preparationError=job->error;preparing={};throw std::runtime_error(preparationError);}
                        if(status==detail::ShaderPreparationQueue::Status::ready){detail::Com<ID3D11ComputeShader> next;HRESULT result;{std::lock_guard<std::mutex> lock(gpu.mutex);result=gpu.device->CreateComputeShader(job->code.data(),job->code.size(),nullptr,&next.p);}job.reset();if(SUCCEEDED(result))*entry.second=std::move(next);else if(!retried[index])retried[index]=true;else{preparationError="Prepared probe shader creation failed (HRESULT "+std::to_string(static_cast<unsigned long>(result))+")";preparing={};throw std::runtime_error(preparationError);}}
                    }
                }
            }++index;
        }
        if(!prefilter.p||!integrate.p||!diffuse.p||!equirect.p)return false;
        std::lock_guard<std::mutex> lock(gpu.mutex);
        D3D11_BUFFER_DESC cb{};cb.ByteWidth=16;cb.Usage=D3D11_USAGE_DYNAMIC;cb.BindFlags=D3D11_BIND_CONSTANT_BUFFER;cb.CPUAccessFlags=D3D11_CPU_ACCESS_WRITE;for(auto& b:constants)detail::check(gpu.device->CreateBuffer(&cb,nullptr,&b.p),"Probe filter constants");
        D3D11_SAMPLER_DESC s{};s.Filter=D3D11_FILTER_MIN_MAG_MIP_LINEAR;s.AddressU=s.AddressV=s.AddressW=D3D11_TEXTURE_ADDRESS_CLAMP;s.MaxLOD=D3D11_FLOAT32_MAX;detail::check(gpu.device->CreateSamplerState(&s,&sampler.p),"Probe filter sampler");
        D3D11_TEXTURE2D_DESC d{};d.Width=d.Height=128;d.MipLevels=d.ArraySize=d.SampleDesc.Count=1;d.Format=DXGI_FORMAT_R32G32_FLOAT;d.BindFlags=D3D11_BIND_UNORDERED_ACCESS|D3D11_BIND_SHADER_RESOURCE;detail::Com<ID3D11Texture2D> image;detail::Com<ID3D11ShaderResourceView> view;detail::Com<ID3D11UnorderedAccessView> output;detail::check(gpu.device->CreateTexture2D(&d,nullptr,&image.p),"Probe BRDF image");detail::check(gpu.device->CreateShaderResourceView(image.p,nullptr,&view.p),"Probe BRDF view");detail::check(gpu.device->CreateUnorderedAccessView(image.p,nullptr,&output.p),"Probe BRDF output");
        gpu.context->CSSetShader(integrate.p,nullptr,0);auto* target=output.p;gpu.context->CSSetUnorderedAccessViews(2,1,&target,nullptr);gpu.context->Dispatch(16,16,1);++dispatches_;target=nullptr;gpu.context->CSSetUnorderedAccessViews(2,1,&target,nullptr);gpu.context->CSSetShader(nullptr,nullptr,0);brdf=std::move(view);return true;
    }
public:
    struct PreparationInfo {bool enabled=false,requested=false,pending=false,ready=false;std::array<unsigned,4> stages{};std::string error;};
    explicit SceneProbes(Device& device):gpu(device){}
    void setAsyncPreparation(bool value){asynchronous=value;if(!value){preparing={};retried={};preparationError.clear();}}
    bool pollPreparation(bool request=false){requested=requested||request;return !requested||prepare();}
    PreparationInfo preparationInfo()const{
        PreparationInfo info{asynchronous,requested,requested&&!brdf.p&&preparationError.empty(),brdf.p!=nullptr,{},preparationError};if(!requested)return info;
        const std::array<bool,4> ready{prefilter.p!=nullptr,integrate.p!=nullptr,diffuse.p!=nullptr,equirect.p!=nullptr};
        for(std::size_t i=0;i<4;i++){info.stages[i]=ready[i]?3:!preparationError.empty()?4:1;if(!ready[i]&&preparing[i]){const auto status=preparing[i]->status.load(std::memory_order_acquire);if(status==detail::ShaderPreparationQueue::Status::compiling)info.stages[i]=2;else if(status==detail::ShaderPreparationQueue::Status::ready)info.stages[i]=3;else if(status==detail::ShaderPreparationQueue::Status::failed)info.stages[i]=4;}}
        return info;
    }
    Probe create(UINT size){
        if(size<16||size>2048||(size&(size-1)))throw std::runtime_error("Probe resolution must be a power of two (16..2048)");
        prepare();
        std::lock_guard<std::mutex> lock(gpu.mutex);Probe out;out.owner=gpu.device.p;out.size=size;out.identity=++identities_;for(UINT n=size;n;n/=2)++out.mips;
        D3D11_TEXTURE2D_DESC d{};d.Width=d.Height=size;d.MipLevels=1;d.ArraySize=6;d.SampleDesc.Count=1;d.Format=DXGI_FORMAT_R16G16B16A16_FLOAT;d.BindFlags=D3D11_BIND_RENDER_TARGET|D3D11_BIND_SHADER_RESOURCE|D3D11_BIND_UNORDERED_ACCESS;d.MiscFlags=D3D11_RESOURCE_MISC_TEXTURECUBE;
        detail::check(gpu.device->CreateTexture2D(&d,nullptr,&out.capture.p),"Probe HDR capture");detail::check(gpu.device->CreateShaderResourceView(out.capture.p,nullptr,&out.source.p),"Probe capture view");for(UINT f=0;f<6;f++){D3D11_RENDER_TARGET_VIEW_DESC v{};v.Format=d.Format;v.ViewDimension=D3D11_RTV_DIMENSION_TEXTURE2DARRAY;v.Texture2DArray.FirstArraySlice=f;v.Texture2DArray.ArraySize=1;detail::check(gpu.device->CreateRenderTargetView(out.capture.p,&v,&out.faces[f].p),"Probe face target");}
        d.MipLevels=out.mips;d.BindFlags=D3D11_BIND_SHADER_RESOURCE|D3D11_BIND_UNORDERED_ACCESS;detail::check(gpu.device->CreateTexture2D(&d,nullptr,&out.filtered.p),"Probe filtered cube");detail::check(gpu.device->CreateShaderResourceView(out.filtered.p,nullptr,&out.view.p),"Probe filtered view");out.levels.resize(out.mips);for(UINT m=1;m<out.mips;m++){D3D11_UNORDERED_ACCESS_VIEW_DESC u{};u.Format=d.Format;u.ViewDimension=D3D11_UAV_DIMENSION_TEXTURE2DARRAY;u.Texture2DArray.MipSlice=m;u.Texture2DArray.ArraySize=6;detail::check(gpu.device->CreateUnorderedAccessView(out.filtered.p,&u,&out.levels[m].p),"Probe mip output");}
        d.MipLevels=d.ArraySize=1;d.Format=DXGI_FORMAT_D32_FLOAT;d.BindFlags=D3D11_BIND_DEPTH_STENCIL;d.MiscFlags=0;detail::Com<ID3D11Texture2D> depth;detail::check(gpu.device->CreateTexture2D(&d,nullptr,&depth.p),"Probe capture depth");detail::check(gpu.device->CreateDepthStencilView(depth.p,nullptr,&out.depth.p),"Probe depth view");
        D3D11_BUFFER_DESC b{};b.ByteWidth=9*16;b.Usage=D3D11_USAGE_DEFAULT;b.BindFlags=D3D11_BIND_SHADER_RESOURCE|D3D11_BIND_UNORDERED_ACCESS;b.MiscFlags=D3D11_RESOURCE_MISC_BUFFER_STRUCTURED;b.StructureByteStride=16;detail::check(gpu.device->CreateBuffer(&b,nullptr,&out.coefficients.p),"Probe SH coefficients");detail::check(gpu.device->CreateShaderResourceView(out.coefficients.p,nullptr,&out.irradiance.p),"Probe SH view");detail::check(gpu.device->CreateUnorderedAccessView(out.coefficients.p,nullptr,&out.coefficientOutput.p),"Probe SH output");return out;
    }
    void importEquirect(Probe& target,ID3D11ShaderResourceView* panorama){
        if(target.owner!=gpu.device.p||!panorama)throw std::runtime_error("Sky HDRI owner invalid");
        if(!prepare())throw std::runtime_error("Probe shaders are still preparing");
        std::lock_guard<std::mutex> lock(gpu.mutex);gpu.context->OMSetRenderTargets(0,nullptr,nullptr);
        std::array<ID3D11ShaderResourceView*,128> empty{};gpu.context->PSSetShaderResources(0,128,empty.data());
        D3D11_UNORDERED_ACCESS_VIEW_DESC desc{};desc.Format=DXGI_FORMAT_R16G16B16A16_FLOAT;desc.ViewDimension=D3D11_UAV_DIMENSION_TEXTURE2DARRAY;desc.Texture2DArray.ArraySize=6;detail::Com<ID3D11UnorderedAccessView> out;detail::check(gpu.device->CreateUnorderedAccessView(target.capture.p,&desc,&out.p),"Sky HDRI cube output");
        D3D11_SAMPLER_DESC sd{};sd.Filter=D3D11_FILTER_MIN_MAG_MIP_LINEAR;sd.AddressU=D3D11_TEXTURE_ADDRESS_WRAP;sd.AddressV=sd.AddressW=D3D11_TEXTURE_ADDRESS_CLAMP;sd.MaxLOD=D3D11_FLOAT32_MAX;detail::Com<ID3D11SamplerState> wrap;detail::check(gpu.device->CreateSamplerState(&sd,&wrap.p),"Sky HDRI sampler");
        auto* cb=constants[slot].p;slot=(slot+1)%constants.size();D3D11_MAPPED_SUBRESOURCE mapped{};detail::check(gpu.context->Map(cb,0,D3D11_MAP_WRITE_DISCARD,0,&mapped),"Sky HDRI constants");const std::array<float,4> v{float(target.size),0,0,0};std::memcpy(mapped.pData,v.data(),16);gpu.context->Unmap(cb,0);auto* u=out.p;auto* s=wrap.p;gpu.context->CSSetConstantBuffers(0,1,&cb);gpu.context->CSSetShaderResources(1,1,&panorama);gpu.context->CSSetSamplers(1,1,&s);gpu.context->CSSetUnorderedAccessViews(0,1,&u,nullptr);gpu.context->CSSetShader(equirect.p,nullptr,0);gpu.context->Dispatch((target.size+7)/8,(target.size+7)/8,6);++dispatches_;u=nullptr;panorama=nullptr;gpu.context->CSSetUnorderedAccessViews(0,1,&u,nullptr);gpu.context->CSSetShaderResources(1,1,&panorama);gpu.context->CSSetShader(nullptr,nullptr,0);
    }
    // One bounded filter stage per submitted frame; publish only after diffuse SH completes.
    bool filterStep(Probe& target,std::uint32_t stage){
        if(target.owner!=gpu.device.p||stage>target.mips)throw std::runtime_error("Probe filter stage invalid");
        if(!prepare())throw std::runtime_error("Probe shaders are still preparing");
        std::lock_guard<std::mutex> lock(gpu.mutex);gpu.context->OMSetRenderTargets(0,nullptr,nullptr);std::array<ID3D11ShaderResourceView*,128> empty{};gpu.context->PSSetShaderResources(0,128,empty.data());
        if(stage==0){target.ready=false;for(UINT f=0;f<6;f++)gpu.context->CopySubresourceRegion(target.filtered.p,D3D11CalcSubresource(0,f,target.mips),0,0,0,target.capture.p,f,nullptr);return false;}
        auto* source=target.source.p;auto* sample=sampler.p;gpu.context->CSSetShaderResources(0,1,&source);gpu.context->CSSetSamplers(0,1,&sample);
        if(stage<target.mips){auto* b=constants[slot].p;slot=(slot+1)%constants.size();D3D11_MAPPED_SUBRESOURCE map{};detail::check(gpu.context->Map(b,0,D3D11_MAP_WRITE_DISCARD,0,&map),"Probe filter map");const std::array<float,4> values{float(target.size>>stage),float(stage)/float(target.mips-1),0,0};std::memcpy(map.pData,values.data(),16);gpu.context->Unmap(b,0);gpu.context->CSSetConstantBuffers(0,1,&b);gpu.context->CSSetShader(prefilter.p,nullptr,0);auto* u=target.levels[stage].p;gpu.context->CSSetUnorderedAccessViews(0,1,&u,nullptr);gpu.context->Dispatch((UINT(values[0])+7)/8,(UINT(values[0])+7)/8,6);++dispatches_;u=nullptr;gpu.context->CSSetUnorderedAccessViews(0,1,&u,nullptr);}
        else{gpu.context->CSSetShader(diffuse.p,nullptr,0);auto* u=target.coefficientOutput.p;gpu.context->CSSetUnorderedAccessViews(1,1,&u,nullptr);gpu.context->CSSetShader(diffuse.p,nullptr,0);gpu.context->Dispatch(1,1,1);++dispatches_;u=nullptr;gpu.context->CSSetUnorderedAccessViews(1,1,&u,nullptr);target.ready=true;++target.revision;++captures_;}
        source=nullptr;gpu.context->CSSetShaderResources(0,1,&source);gpu.context->CSSetShader(nullptr,nullptr,0);return target.ready;
    }
    void filter(Probe& target){for(std::uint32_t stage=0;stage<=target.mips;stage++)filterStep(target,stage);}
    ID3D11ShaderResourceView* brdfView() const{return brdf.p;}
    std::uint64_t dispatches() const{return dispatches_;}std::uint64_t captures() const{return captures_;}
    std::uint64_t storageBytes() const{return brdf.p?128*128*8:0;}
    void release(){preparing={};retried={};requested=false;preparationError.clear();brdf={};prefilter={};integrate={};diffuse={};equirect={};sampler={};for(auto& c:constants)c={};}
};

struct SceneProbeBinding {const SceneProbes::Probe* resource=nullptr;ProbeSettings settings;};
inline constexpr const char* sceneProbeDeclarations=R"HLSL(
struct ProbeSettings{float4 center,minimum,maximum,options,localX,localY,localZ,faceScale,projectionMinimum,projectionMaximum,projectionX,projectionY,projectionZ;float4 blendPositive,blendNegative,fadePositive,fadeNegative,normalPositive,normalNegative;};cbuffer ProbeBindings:register(b2){ProbeSettings probeSettings[3];};
TextureCube<float4> probe0:register(t39),probe1:register(t40);StructuredBuffer<float4> probeSH0:register(t41),probeSH1:register(t42);Texture2D<float2> probeBrdf:register(t43);TextureCube<float4> skyProbe:register(t46);StructuredBuffer<float4> skySH:register(t47);
)HLSL";
inline constexpr const char* sceneProbeFunctions=R"HLSL(
float probeBasis(uint i,float3 d){return i==0?.282094792:i==1?.488602512*d.y:i==2?.488602512*d.z:i==3?.488602512*d.x:i==4?1.092548431*d.x*d.y:i==5?1.092548431*d.y*d.z:i==6?.315391565*(3*d.z*d.z-1):i==7?1.092548431*d.x*d.z:.546274215*(d.x*d.x-d.y*d.y);}
float3 probeLocal(ProbeSettings p,float3 at){float4 v=float4(at,1);return float3(dot(p.localX,v),dot(p.localY,v),dot(p.localZ,v));}
float3 probeLocalRay(ProbeSettings p,float3 r){return float3(dot(p.localX.xyz,r),dot(p.localY.xyz,r),dot(p.localZ.xyz,r));}
float3 probeSphereProject(float3 at,float3 ray,float3 center,float3 p,float3 r,float radius){
 if(length(p)>radius)return ray;float scale=max(abs(r.x),max(abs(r.y),abs(r.z)));if(!(scale>0))return ray;float3 q=r/scale;float size=length(q);q/=size;float3 scaled=p/radius;float b=dot(scaled,q),c=min(0,dot(scaled,scaled)-1),root=sqrt(max(0,b*b-c)),distance=b>0?(b+root>0?-c/(b+root):0):root-b;float3 result=(at-center)+(ray/scale)*(distance*radius/size);return dot(result,result)>1e-20?result:ray;
}
float hbProbeSphereFade(float3 p,float radius,float blend){float d=radius-length(p);return d<0?0:blend>0?saturate(d/blend):1;}
float hbProbeVolumeFade(float3 p,float3 lo,float3 hi,float3 scale,float blend){float3 edges=min(p-lo,hi-p)*scale;float d=min(edges.x,min(edges.y,edges.z));return d<0?0:blend>0?saturate(d/blend):1;}

float hbProbeInfluenceFade(float3 local,float3 lo,float3 hi,float3 scale,float blend,bool sphere,float3 worldPoint,float3 center,float3 normal,float3 ray,float4 bp,float4 bn,float4 fp,float4 fn,float4 np,float4 nn,float4 x,float4 y,float4 z){
 float weight=sphere?hbProbeSphereFade(local,hi.x,blend):hbProbeVolumeFade(local,lo,hi,scale,blend);if(bp.w<0.5)return weight;
 float3 negative=(local-lo)*scale,positive=(hi-local)*scale;if(sphere?length(local)>hi.x:min(min(negative.x,min(negative.y,negative.z)),min(positive.x,min(positive.y,positive.z)))<0.0)return 0.0;
 if(fmod(bp.w,2.0)>0.5){
  float3 a=positive/max(bp.xyz,float3(1e-30,1e-30,1e-30)),b=negative/max(bn.xyz,float3(1e-30,1e-30,1e-30));
  a=float3(bp.x>0.0?a.x:1.0,bp.y>0.0?a.y:1.0,bp.z>0.0?a.z:1.0);b=float3(bn.x>0.0?b.x:1.0,bn.y>0.0?b.y:1.0,bn.z>0.0?b.z:1.0);
  weight=clamp(min(min(a.x,min(a.y,a.z)),min(b.x,min(b.y,b.z))),0.0,1.0);
  float3 d=float3(dot(x.xyz,ray),dot(y.xyz,ray),dot(z.xyz,ray))*scale;float size=length(d);if(size>0.0){d/=size;float3 mask=clamp((4.0*d-1.0)*fp.xyz,0.0,1.0)+clamp((-4.0*d-1.0)*fn.xyz,0.0,1.0);weight*=clamp(mask.x+mask.y+mask.z,0.0,1.0);}
 }
 if(bp.w>1.5){
  bool inner=sphere?hi.x-length(local)>=np.x:positive.x>=np.x&&positive.y>=np.y&&positive.z>=np.z&&negative.x>=nn.x&&negative.y>=nn.y&&negative.z>=nn.z;
  if(!inner){float3 direction=worldPoint-center;float d=length(direction),n=length(normal);if(d>0.0&&n>0.0)weight*=clamp((0.6-dot(normal/n,direction/d))/0.4,0.0,1.0);}
 }
 return weight;
}

float probeShadingWeight(ProbeSettings p,float3 at,float3 normal,float3 ray){if(p.options.x<.5)return 0;return p.options.z*hbProbeInfluenceFade(probeLocal(p,at),p.minimum.xyz,p.maximum.xyz,p.faceScale.xyz,p.minimum.w,fmod(p.options.w,4)>1.5,at,p.center.xyz,normal,ray,p.blendPositive,p.blendNegative,p.fadePositive,p.fadeNegative,p.normalPositive,p.normalNegative,p.localX,p.localY,p.localZ);}
float probeWeight(ProbeSettings p,float3 at){return probeShadingWeight(p,at,float3(0,0,0),float3(0,0,0));}
float probeAxisExit(float p,float r,float lo,float hi){return r==0?3.402823466e38:((r>0?hi:lo)-p)/r;}
float3 probeProjectionLocal(float3 p,float4 x,float4 y,float4 z){float4 at=float4(p,1);return float3(dot(x,at),dot(y,at),dot(z,at));}
float3 probeProjectionRay(float3 r,float4 x,float4 y,float4 z){return float3(dot(x.xyz,r),dot(y.xyz,r),dot(z.xyz,r));}

float3 probeProxyDirection(float3 worldPoint,float3 ray,float3 center,float4 lo,float4 hi,float4 x,float4 y,float4 z){
 [branch] if(lo.w>2.5)return ray;float3 local=probeProjectionLocal(worldPoint,x,y,z),r=probeProjectionRay(ray,x,y,z);float scale=max(abs(r.x),max(abs(r.y),abs(r.z)));if(!(scale>0.0))return ray;r/=scale;float distance;
 [branch] if(lo.w>1.5){float size=length(r);float3 unit=r/size,scaled=local/hi.x;float b=dot(scaled,unit),c=dot(scaled,scaled)-1.0,discriminant=1.0-dot(cross(scaled,unit),cross(scaled,unit));if(discriminant<0.0)return ray;float root=sqrt(discriminant),a=b>=0.0?-b-root:-b+root,other=a!=0.0?c/a:-b,near=min(a,other),far=max(a,other);distance=(near>=0.0?near:far)*hi.x/size;if(distance<0.0)return ray;}
 else{if((r.x==0.0&&(local.x<lo.x||local.x>hi.x))||(r.y==0.0&&(local.y<lo.y||local.y>hi.y))||(r.z==0.0&&(local.z<lo.z||local.z>hi.z)))return ray;float3 safe=float3(r.x==0.0?1.0:r.x,r.y==0.0?1.0:r.y,r.z==0.0?1.0:r.z),a=(lo.xyz-local)/safe,b=(hi.xyz-local)/safe,lower=min(a,b),upper=max(a,b);float near=max(r.x==0.0?-3.402823466e38:lower.x,max(r.y==0.0?-3.402823466e38:lower.y,r.z==0.0?-3.402823466e38:lower.z)),far=min(r.x==0.0?3.402823466e38:upper.x,min(r.y==0.0?3.402823466e38:upper.y,r.z==0.0?3.402823466e38:upper.z));if(far<max(near,0.0))return ray;distance=near>=0.0?near:far;}
 float3 hit=(worldPoint-center)+(ray/scale)*distance;return dot(hit,hit)>1e-20?hit:ray;
}

float3 probeDirection(ProbeSettings p,float3 at,float3 r){if(fmod(p.options.w,2)<.5||all(r==0))return r;[branch] if(p.projectionMinimum.w>.5)return probeProxyDirection(at,r,p.center.xyz,p.projectionMinimum,p.projectionMaximum,p.projectionX,p.projectionY,p.projectionZ);float3 local=probeLocal(p,at),ray=probeLocalRay(p,r);if(fmod(p.options.w,4)>1.5)return probeSphereProject(at,r,p.center.xyz,local,ray,p.maximum.x);if(any(local<p.minimum.xyz)||any(local>p.maximum.xyz))return r;float distance=min(probeAxisExit(local.x,ray.x,p.minimum.x,p.maximum.x),min(probeAxisExit(local.y,ray.y,p.minimum.y,p.maximum.y),probeAxisExit(local.z,ray.z,p.minimum.z,p.maximum.z)));float3 result=at+r*distance-p.center.xyz;return dot(result,result)>1e-20?result:r;}
float3 probeLight(TextureCube<float4> cube,StructuredBuffer<float4> sh,ProbeSettings p,float3 at,float3 n,float3 v,float3 base,float rough,float metal,float ao,float3 dielectricF0,float diffuseWeight,bool mixLightmap){
 float nv=saturate(dot(n,v));float3 f0=lerp(dielectricF0,base,metal),f=f0+(max(1-rough,f0)-f0)*pow(1-nv,5),irradiance=0;[unroll]for(uint i=0;i<9;i++)irradiance+=sh[i].rgb*probeBasis(i,n);
 float2 brdf=probeBrdf.SampleLevel(linear2d,float2(nv,rough),0);float3 reflected=cube.SampleLevel(linear2d,probeDirection(p,at,reflect(-v,n)),rough*p.maximum.w).rgb;
 return (max(irradiance,0)*base*(1-f)*(1-metal)*diffuseWeight*(p.options.y/3.141592654)+reflected*(f0*brdf.x+brdf.y)*(mixLightmap?hbProbeLightmapScale(max(irradiance,0)*p.center.w,rough):1))*p.center.w*ao;
}
float3 skyDirection(float3 d){ProbeSettings p=probeSettings[2];return float3(p.minimum.y*d.x-p.minimum.x*d.z,d.y,p.minimum.x*d.x+p.minimum.y*d.z);}
float3 skyLight(float3 n,float3 v,float3 base,float rough,float metal,float ao,float3 dielectric,float diffuseWeight){return probeLight(skyProbe,skySH,probeSettings[2],float3(0,0,0),skyDirection(n),skyDirection(v),base,rough,metal,ao,dielectric,diffuseWeight,false);}
void probeBlendPriority(inout float a,inout float b,float flags){if(flags>=4){a=saturate(a);b=saturate(b)*(1-a);}}
float3 refractedProbes(float3 at,float3 direction,float rough,out float coverage){if(probeSettings[0].faceScale.w>0||probeSettings[1].faceScale.w>0)return refractedAtlasProbes(at,direction,rough,coverage);float a=probeShadingWeight(probeSettings[0],at,float3(0,0,0),direction),b=probeShadingWeight(probeSettings[1],at,float3(0,0,0),direction);probeBlendPriority(a,b,probeSettings[0].options.w);coverage=saturate(a+b);float3 c=0;if(a>0)c+=probe0.SampleLevel(linear2d,probeDirection(probeSettings[0],at,direction),rough*probeSettings[0].maximum.w).rgb*probeSettings[0].center.w*a;if(b>0)c+=probe1.SampleLevel(linear2d,probeDirection(probeSettings[1],at,direction),rough*probeSettings[1].maximum.w).rgb*probeSettings[1].center.w*b;float sky=probeSettings[2].options.x*(1-coverage);c=c/max(a+b,1e-6)*coverage;if(sky>0)c+=skyProbe.SampleLevel(linear2d,skyDirection(direction),rough*probeSettings[2].maximum.w).rgb*probeSettings[2].center.w*sky;coverage=saturate(coverage+sky);return c/max(coverage,1e-6);}
float3 indirectProbes(float3 at,float3 n,float3 v,float3 base,float rough,float metal,float ao,float3 dielectricF0,float diffuseWeight){if(probeSettings[0].faceScale.w>0||probeSettings[1].faceScale.w>0)return indirectAtlasProbes(at,n,v,base,rough,metal,ao,dielectricF0,diffuseWeight);float a=probeShadingWeight(probeSettings[0],at,n,reflect(-v,n)),b=probeShadingWeight(probeSettings[1],at,n,reflect(-v,n));probeBlendPriority(a,b,probeSettings[0].options.w);float total=a+b;float3 c=0;if(a>0)c+=probeLight(probe0,probeSH0,probeSettings[0],at,n,v,base,rough,metal,ao,dielectricF0,diffuseWeight,true)*a;if(b>0)c+=probeLight(probe1,probeSH1,probeSettings[1],at,n,v,base,rough,metal,ao,dielectricF0,diffuseWeight,true)*b;c=c/max(1,total);float sky=probeSettings[2].options.x*(1-saturate(total));if(sky>0)c+=skyLight(n,v,base,rough,metal,ao,dielectricF0,diffuseWeight)*sky;return c;}
float3 indirectProbes(float3 at,float3 n,float3 v,float3 base,float rough,float metal,float ao,float dielectricF0){return indirectProbes(at,n,v,base,rough,metal,ao,dielectricF0,1);}
float3 indirectProbes(float3 at,float3 n,float3 v,float3 base,float rough,float metal,float ao){return indirectProbes(at,n,v,base,rough,metal,ao,.04);}
)HLSL";
#endif
}
