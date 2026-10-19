#pragma once
#include "Render.hpp"
#include "ScreenPost.hpp"
#include "ScreenEffectsPass.hpp"

namespace hb::gpu {
struct ScenePostProcess {std::array<float,4> grade{0,1,1,0},filter{1,1,1,1},effects{0,.2f,0,0},vignette{.5f,.5f,0,0},vignetteColor{0,0,0,1},balance{},lift{},gamma{1,1,1,0},gain{1,1,1,0},lens{.05f,2.8f,.024f,0},bokeh{0,0,1,12},focus{10,5,4,0},occlusion{1,.02f,0,0},lookup{},camera{.1f,1000,0,1},exposure{0,-8,8,.18f},adapt{3,1,0,0};};
struct SceneBloom {float threshold=1,strength=.6f,radius=.4f,resolutionScale=.5f;};
#if defined(_WIN32) && !defined(HB_COMPUTE_UNAVAILABLE)
class BloomPass {
    // Five lazy bloom levels; depth effects and exposure allocate resources only when enabled.
    Device& gpu;ScreenEffectsPass screen;
    struct Image {detail::Com<ID3D11Texture2D> texture;detail::Com<ID3D11ShaderResourceView> view;detail::Com<ID3D11UnorderedAccessView> output;detail::Com<ID3D11RenderTargetView> target;UINT width=0,height=0;};
    Image scene,aaImage;std::array<Image,2> exposureImages;std::size_t exposureIndex=0;bool exposureValid=false;detail::Com<ID3D11ShaderResourceView> depthView;detail::Com<ID3D11Texture2D> depthImage;std::vector<std::array<Image,2>> levels;
    detail::Com<ID3D11VertexShader> vertex;detail::Com<ID3D11PixelShader> pixel,aaPixel;detail::Com<ID3D11ComputeShader> extract,blur,meter;
    detail::Com<ID3D11SamplerState> sampler;detail::Com<ID3D11RasterizerState> raster;detail::Com<ID3D11DepthStencilState> depth;detail::Com<ID3D11BlendState> blend;
    struct Constants {std::array<float,4> dimensions{},area{},effect{},options{},grade{0,1,1,0},filter{1,1,1,1},effects{0,.2f,0,0},vignette{.5f,.5f,0,0},vignetteColor{},balance{},lift{},gamma{1,1,1,0},gain{1,1,1,0},lens{.05f,2.8f,.024f,0},bokeh{0,0,1,12},focus{10,5,4,0},occlusion{1,.02f,0,0},lookup{},camera{.1f,1000,0,0},exposure{0,-8,8,.18f},adapt{3,1,0,0};};
    std::array<detail::Com<ID3D11Buffer>,3> constants;std::size_t slot=0;
    std::array<float,4> area{};SceneBloom settings;ScenePostProcess post;bool pending=false;
    std::uint64_t dispatches_=0,allocations_=0,composites_=0;
    static const std::string& shaderCode(){static const std::string code=R"HLSL(
cbuffer BloomSettings:register(b0){float4 dimensions,area,effect,options,hbGrade,hbFilter,hbPostEffects,hbVignette,hbVignetteColor,hbBalance,hbLift,hbGamma,hbGain,hbLens,hbBokeh,hbFocus,hbOcclusion,hbLookup,hbCamera,hbExposure,hbAdapt;};
Texture2D<float4> source:register(t0),level0:register(t1),level1:register(t2),level2:register(t3),level3:register(t4),level4:register(t5);
Texture2D<float4> hbDepth:register(t6),hbLookupMap:register(t7),hbExposureMap:register(t8),hbRawSource:register(t9);
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
)HLSL"+std::string(screenPostShader)+R"HLSL(
[numthreads(1,1,1)]void Meter(uint3 id:SV_DispatchThreadID){float sum=0;for(int y=0;y<8;y++)for(int x=0;x<8;x++){float2 uv=(area.xy+((float2(x,y)+.5)/8)*area.zw)/dimensions.xy;sum+=log2(max(.00001,dot(source.SampleLevel(linearClamp,uv,0).rgb,float3(.2126,.7152,.0722))));}float target=clamp(log2(hbExposure.w)-sum/64,hbExposure.y,hbExposure.z),old=hbExposureMap.SampleLevel(linearClamp,float2(.5,.5),0).r,speed=target>old?hbAdapt.x:hbAdapt.y;destination[id.xy]=float4(hbAdapt.w<.5?target:lerp(old,target,1-exp(-speed*hbAdapt.z)),0,0,1);}
float4 hbDisplay(float2 at){
 float3 glow=0;float weight=0;const float factors[5]={1,.8,.6,.4,.2};
 float w=lerp(factors[0],1.2-factors[0],effect.z);if(options.z>0){glow+=level0.SampleLevel(linearClamp,at,0).rgb*w;weight+=w;}
 w=lerp(factors[1],1.2-factors[1],effect.z);if(options.z>1){glow+=level1.SampleLevel(linearClamp,at,0).rgb*w;weight+=w;}
 w=lerp(factors[2],1.2-factors[2],effect.z);if(options.z>2){glow+=level2.SampleLevel(linearClamp,at,0).rgb*w;weight+=w;}
 w=lerp(factors[3],1.2-factors[3],effect.z);if(options.z>3){glow+=level3.SampleLevel(linearClamp,at,0).rgb*w;weight+=w;}
 w=lerp(factors[4],1.2-factors[4],effect.z);if(options.z>4){glow+=level4.SampleLevel(linearClamp,at,0).rgb*w;weight+=w;}
 float2 uv=(area.xy+at*area.zw)/dimensions.xy;float4 original=source.SampleLevel(linearClamp,uv,0);
 float3 c=max(0,hbScreenColor(source,uv)+glow*effect.y/max(weight,.0001));
 if(hbPostEffects.z>0){float2 delta=(at-.5)*hbPostEffects.z*.015*area.zw/dimensions.xy;c.r+=source.SampleLevel(linearClamp,saturate(uv+delta),0).r-original.r;c.b+=source.SampleLevel(linearClamp,saturate(uv-delta),0).b-original.b;}
 if(hbExposure.x>0)c*=exp2(hbExposureMap.SampleLevel(linearClamp,float2(.5,.5),0).r*hbExposure.x);c=hbGradeColor(c);if(hbPostEffects.x>0){float2 d=(at-hbVignette.xy)*2;d.x*=hbVignette.z>.5?area.z/area.w:1;float f=smoothstep(1-max(hbPostEffects.y,.001),1,length(d))*hbPostEffects.x;c=lerp(c,hbVignetteColor.rgb,f);}
 if(hbPostEffects.w>0){float noise=frac(sin(dot(floor(at*area.zw)+floor(hbVignette.w*60),float2(12.9898,78.233)))*43758.5453)-.5;c=max(0,c+noise*hbPostEffects.w*.08);}
 return float4(linearToSrgb(hbLookupColor(aces(c*effect.w))),hbRawSource.SampleLevel(linearClamp,uv,0).a);
}
float4 PS(Vertex v):SV_TARGET{return hbDisplay(v.uv);}
float4 hbAAColor(float2 uv){return source.SampleLevel(linearClamp,(area.xy+saturate(uv)*area.zw)/dimensions.xy,0);}
float4 PFxaa(Vertex v):SV_TARGET{float2 uv=v.uv;float4 c=hbAAColor(uv);if(hbOcclusion.w<=0)return c;
 float2 d=1/area.zw;float3 nw=hbAAColor(saturate(uv+d*float2(-1,-1))).rgb,ne=hbAAColor(saturate(uv+d*float2(1,-1))).rgb,sw=hbAAColor(saturate(uv+d*float2(-1,1))).rgb,se=hbAAColor(saturate(uv+d)).rgb;float3 luma=float3(.299,.587,.114);float lnw=dot(nw,luma),lne=dot(ne,luma),lsw=dot(sw,luma),lse=dot(se,luma),lc=dot(c.rgb,luma),lo=min(lc,min(min(lnw,lne),min(lsw,lse))),hi=max(lc,max(max(lnw,lne),max(lsw,lse)));if(hi-lo<max(.0312,hi*.125))return c;
 float2 direction=float2(-(lnw+lne-lsw-lse),lnw+lsw-lne-lse);float reduce=max((lnw+lne+lsw+lse)*.03125,.0078125);direction=clamp(direction/(min(abs(direction.x),abs(direction.y))+reduce),-8,8)*d;float3 a=.5*(hbAAColor(saturate(uv+direction*(-.1666667))).rgb+hbAAColor(saturate(uv+direction*.1666667)).rgb),b=a*.5+.25*(hbAAColor(saturate(uv-direction*.5)).rgb+hbAAColor(saturate(uv+direction*.5)).rgb);float lb=dot(b,luma);return float4(lerp(c.rgb,lb<lo||lb>hi?a:b,hbOcclusion.w),c.a);
}
)HLSL";return code;}
    void programs(){
        if(vertex.p)return;

        for(const auto* entry:{"VS","PS","PFxaa","Extract","Blur","Meter"})detail::ShaderBytecodeCompiler::create(shaderCode(),"HBBloom",entry,entry[0]=='V'?"vs_5_0":entry[0]=='P'?"ps_5_0":"cs_5_0",[&](const void* bytes,std::size_t size){if(entry[0]=='V')return gpu.device->CreateVertexShader(bytes,size,nullptr,&vertex.p);if(entry[0]=='P')return gpu.device->CreatePixelShader(bytes,size,nullptr,entry[1]=='F'?&aaPixel.p:&pixel.p);return gpu.device->CreateComputeShader(bytes,size,nullptr,entry[0]=='E'?&extract.p:entry[0]=='M'?&meter.p:&blur.p);});
        D3D11_BUFFER_DESC cb{};cb.ByteWidth=sizeof(Constants);cb.Usage=D3D11_USAGE_DYNAMIC;cb.BindFlags=D3D11_BIND_CONSTANT_BUFFER;cb.CPUAccessFlags=D3D11_CPU_ACCESS_WRITE;for(auto& buffer:constants)detail::check(gpu.device->CreateBuffer(&cb,nullptr,&buffer.p),"Bloom frame constants");
        D3D11_SAMPLER_DESC s{};s.Filter=D3D11_FILTER_MIN_MAG_MIP_LINEAR;s.AddressU=s.AddressV=s.AddressW=D3D11_TEXTURE_ADDRESS_CLAMP;s.MaxLOD=D3D11_FLOAT32_MAX;detail::check(gpu.device->CreateSamplerState(&s,&sampler.p),"Bloom sampler");
        D3D11_RASTERIZER_DESC r{};r.FillMode=D3D11_FILL_SOLID;r.CullMode=D3D11_CULL_NONE;r.DepthClipEnable=TRUE;r.ScissorEnable=TRUE;detail::check(gpu.device->CreateRasterizerState(&r,&raster.p),"Bloom raster state");
        D3D11_DEPTH_STENCIL_DESC d{};detail::check(gpu.device->CreateDepthStencilState(&d,&depth.p),"Bloom depth state");D3D11_BLEND_DESC b{};b.RenderTarget[0].RenderTargetWriteMask=D3D11_COLOR_WRITE_ENABLE_ALL;detail::check(gpu.device->CreateBlendState(&b,&blend.p),"Bloom blend state");
    }
    Image image(UINT w,UINT h,bool renderTarget,DXGI_FORMAT format=DXGI_FORMAT_R16G16B16A16_FLOAT){
        Image out;out.width=w;out.height=h;D3D11_TEXTURE2D_DESC d{};d.Width=w;d.Height=h;d.MipLevels=d.ArraySize=d.SampleDesc.Count=1;d.Format=format;d.BindFlags=D3D11_BIND_SHADER_RESOURCE|(renderTarget?D3D11_BIND_RENDER_TARGET:D3D11_BIND_UNORDERED_ACCESS);detail::check(gpu.device->CreateTexture2D(&d,nullptr,&out.texture.p),"Bloom HDR texture");detail::check(gpu.device->CreateShaderResourceView(out.texture.p,nullptr,&out.view.p),"Bloom HDR view");if(renderTarget)detail::check(gpu.device->CreateRenderTargetView(out.texture.p,nullptr,&out.target.p),"Bloom HDR target");else detail::check(gpu.device->CreateUnorderedAccessView(out.texture.p,nullptr,&out.output.p),"Bloom compute output");return out;
    }
    ID3D11Buffer* upload(const Constants& value){auto* buffer=constants[slot].p;slot=(slot+1)%constants.size();D3D11_MAPPED_SUBRESOURCE mapped{};detail::check(gpu.context->Map(buffer,0,D3D11_MAP_WRITE_DISCARD,0,&mapped),"Bloom constants");std::memcpy(mapped.pData,&value,sizeof(value));gpu.context->Unmap(buffer,0);return buffer;}
    void dispatch(ID3D11ComputeShader* shader,const Image& input,const Image& output,const Constants& values,ID3D11ShaderResourceView* overrideSource=nullptr){
        auto* cb=upload(values);auto* srv=overrideSource?overrideSource:input.view.p;auto* uav=output.output.p;auto* state=sampler.p;gpu.context->CSSetShader(shader,nullptr,0);gpu.context->CSSetConstantBuffers(0,1,&cb);gpu.context->CSSetShaderResources(0,1,&srv);gpu.context->CSSetSamplers(0,1,&state);gpu.context->CSSetUnorderedAccessViews(0,1,&uav,nullptr);gpu.context->Dispatch((output.width+7)/8,(output.height+7)/8,1);srv=nullptr;uav=nullptr;gpu.context->CSSetShaderResources(0,1,&srv);gpu.context->CSSetUnorderedAccessViews(0,1,&uav,nullptr);++dispatches_;
    }
public:
    explicit BloomPass(Device& device):gpu(device),screen(device){}
    void begin(UINT w,UINT h,const std::array<float,4>& viewport,const std::optional<SceneBloom>& value,const std::array<float,4>& clear,bool forceHDR=false,const std::optional<ScenePostProcess>& postValue=std::nullopt,const std::optional<SceneScreenEffects>& screenValue=std::nullopt){
        dispatches_=0;pending=false;post=postValue.value_or(ScenePostProcess{});for(const auto* row:{&post.grade,&post.filter,&post.effects,&post.vignette,&post.vignetteColor,&post.balance,&post.lift,&post.gamma,&post.gain,&post.lens,&post.bokeh,&post.focus,&post.occlusion,&post.lookup,&post.camera,&post.exposure,&post.adapt})for(float x:*row)if(!std::isfinite(x))throw std::runtime_error("Post-process non-finite value");if(std::abs(post.grade[0])>16||post.grade[1]<0||post.grade[1]>2||post.grade[2]<0||post.grade[2]>2||std::abs(post.grade[3])>3.141593f||post.effects[0]<0||post.effects[0]>1||post.effects[1]<.01f||post.effects[1]>1||post.effects[2]<0||post.effects[2]>1||post.effects[3]<0||post.effects[3]>1||post.vignette[0]<0||post.vignette[0]>1||post.vignette[1]<0||post.vignette[1]>1||post.vignette[2]<0||post.vignette[2]>1)throw std::runtime_error("Post-process settings invalid");for(float x:post.filter)if(x<0||x>1)throw std::runtime_error("Post-process filter invalid");for(float x:post.vignetteColor)if(x<0||x>1)throw std::runtime_error("Vignette color invalid");for(std::size_t i=0;i<3;i++){if(std::abs(post.balance[i])>1||std::abs(post.lift[i])>1||post.gamma[i]<.1f||post.gamma[i]>4||post.gain[i]<0||post.gain[i]>4)throw std::runtime_error("Color balance invalid");}if(post.lens[3]>0&&post.camera[2]>.5f)throw std::runtime_error("Physical lens requires perspective");if(post.lens[0]<.001f||post.lens[0]>.5f||post.lens[1]<.7f||post.lens[1]>128||post.lens[2]<.001f||post.lens[2]>.1f||post.lens[3]<0||post.lens[3]>1||std::floor(post.lens[3])!=post.lens[3]||post.bokeh[0]<0||post.bokeh[0]>11||(post.bokeh[0]>0&&post.bokeh[0]<3)||std::floor(post.bokeh[0])!=post.bokeh[0]||std::abs(post.bokeh[1])>3.141593f||post.bokeh[2]<0||post.bokeh[2]>1||post.bokeh[3]<4||post.bokeh[3]>32||std::floor(post.bokeh[3])!=post.bokeh[3])throw std::runtime_error("Lens/bokeh settings invalid");if(post.focus[0]<=0||post.focus[1]<=0||post.focus[2]<0||post.focus[2]>16||post.focus[3]<0||post.focus[3]>1||post.occlusion[0]<=0||post.occlusion[1]<0||post.occlusion[2]<0||post.occlusion[2]>4||post.occlusion[3]<0||post.occlusion[3]>1||post.lookup[0]<0||post.lookup[0]>1||post.lookup[1]<0||(post.lookup[1]>0&&post.lookup[1]<2)||post.lookup[1]>64||std::floor(post.lookup[1])!=post.lookup[1]||post.camera[3]<=0||post.camera[0]<=0||post.camera[1]<=post.camera[0]||post.camera[2]<0||post.camera[2]>1||std::floor(post.camera[2])!=post.camera[2]||post.exposure[0]<0||post.exposure[0]>1||post.exposure[1]<-16||post.exposure[2]>16||post.exposure[1]>post.exposure[2]||post.exposure[3]<.001f||post.exposure[3]>1||post.adapt[0]<0||post.adapt[0]>32||post.adapt[1]<0||post.adapt[1]>32||post.adapt[2]<0||post.adapt[2]>.1f)throw std::runtime_error("Depth/exposure settings invalid");if(value&&(!std::isfinite(value->threshold)||value->threshold<0||value->threshold>64||!std::isfinite(value->strength)||value->strength<0||value->strength>10||!std::isfinite(value->radius)||value->radius<0||value->radius>1||!std::isfinite(value->resolutionScale)||value->resolutionScale<.25f||value->resolutionScale>1))throw std::runtime_error("Bloom settings invalid");
        if((!value||value->strength==0)&&!forceHDR&&!postValue&&!screenValue){release();return;}settings=value.value_or(SceneBloom{});if(!value)settings.strength=0;area=viewport;if(area[2]==0||area[3]==0)area={0,0,float(w),float(h)};
        const float right=std::min(float(w),area[0]+area[2]),bottom=std::min(float(h),area[1]+area[3]);area[0]=std::max(0.f,area[0]);area[1]=std::max(0.f,area[1]);area[2]=std::max(0.f,right-area[0]);area[3]=std::max(0.f,bottom-area[1]);if(area[2]==0||area[3]==0){release();return;}
        const auto bw=std::max(1u,static_cast<UINT>(std::round(area[2]*settings.resolutionScale))),bh=std::max(1u,static_cast<UINT>(std::round(area[3]*settings.resolutionScale)));std::lock_guard<std::mutex> lock(gpu.mutex);programs();screen.begin(w,h,screenValue);
        if(scene.width!=w||scene.height!=h||((settings.strength>0)&&(levels.empty()||levels.front()[0].width!=bw||levels.front()[0].height!=bh))||((settings.strength==0)&&!levels.empty())){auto next=image(w,h,true);std::vector<std::array<Image,2>> chain;for(UINT x=bw,y=bh;settings.strength>0&&chain.size()<5;){chain.push_back({image(x,y,false),image(x,y,false)});if(x==1&&y==1)break;x=std::max(1u,x/2);y=std::max(1u,y/2);}exposureValid=false;scene=std::move(next);levels=std::move(chain);++allocations_;}
        std::array<float,4> linear=clear;for(std::size_t i=0;i<3;i++)linear[i]=linear[i]<=.04045f?linear[i]/12.92f:std::pow((linear[i]+.055f)/1.055f,2.4f);gpu.context->ClearRenderTargetView(scene.target.p,linear.data());pending=true;
    }
    void complete(ID3D11RenderTargetView* output,float exposure,const std::optional<std::array<float,4>>& scissor,ID3D11Texture2D* depthTexture=nullptr,ID3D11ShaderResourceView* lookupTexture=nullptr,ID3D11ShaderResourceView* geometryScene=nullptr,ID3D11ShaderResourceView* pathEnvironmentScene=nullptr,ID3D11ShaderResourceView* distanceFieldScene=nullptr){
        if(!pending)return;
        std::lock_guard<std::mutex> lock(gpu.mutex);gpu.context->OMSetRenderTargets(0,nullptr,nullptr);auto* screenSource=screen.resolve(scene.view.p,depthTexture,area,geometryScene,pathEnvironmentScene,distanceFieldScene);Constants values;values.effect={settings.threshold,settings.strength,settings.radius,exposure};
        for(std::size_t index=0;index<levels.size();index++){auto& layer=levels[index];const auto& input=index?levels[index-1][0]:scene;values.dimensions={float(input.width),float(input.height),float(layer[0].width),float(layer[0].height)};values.area=index?std::array<float,4>{0,0,float(input.width),float(input.height)}:area;values.options={0,0,index==0?1.f:0.f,0};dispatch(extract.p,input,layer[0],values,index==0?screenSource:nullptr);values.dimensions={float(layer[0].width),float(layer[0].height),float(layer[0].width),float(layer[0].height)};values.options={1,0,0,0};dispatch(blur.p,layer[0],layer[1],values);values.options={0,1,0,0};dispatch(blur.p,layer[1],layer[0],values);}
        values.grade=post.grade;values.filter=post.filter;values.effects=post.effects;values.vignette=post.vignette;values.vignetteColor=post.vignetteColor;values.balance=post.balance;values.lift=post.lift;values.gamma=post.gamma;values.gain=post.gain;values.lens=post.lens;values.bokeh=post.bokeh;values.focus=post.focus;values.occlusion=post.occlusion;values.lookup=post.lookup;values.camera=post.camera;values.exposure=post.exposure;values.adapt=post.adapt;values.dimensions={float(scene.width),float(scene.height),0,0};values.area=area;values.options={0,0,float(levels.size()),0};if(post.focus[3]>0||post.occlusion[2]>0){if(!depthTexture)throw std::runtime_error("Post depth texture required");if(depthImage.p!=depthTexture){detail::Com<ID3D11ShaderResourceView> next;D3D11_SHADER_RESOURCE_VIEW_DESC desc{};desc.Format=DXGI_FORMAT_R32_FLOAT;desc.ViewDimension=D3D11_SRV_DIMENSION_TEXTURE2D;desc.Texture2D.MipLevels=1;detail::check(gpu.device->CreateShaderResourceView(depthTexture,&desc,&next.p),"Post depth view");depthView=std::move(next);depthImage={};depthImage.p=depthTexture;depthTexture->AddRef();}}else{depthView={};depthImage={};}
        if(post.exposure[0]>0){if(!exposureImages[0].view.p){exposureImages[0]=image(1,1,false);exposureImages[1]=image(1,1,false);exposureValid=false;++allocations_;}values.adapt[3]=exposureValid&&post.adapt[3]>.5f?1.f:0.f;auto* cbMeter=upload(values);ID3D11ShaderResourceView* sourceView=scene.view.p;auto* previous=exposureImages[exposureIndex].view.p;auto* result=exposureImages[1-exposureIndex].output.p;auto* linear=sampler.p;gpu.context->CSSetShader(meter.p,nullptr,0);gpu.context->CSSetConstantBuffers(0,1,&cbMeter);gpu.context->CSSetShaderResources(0,1,&sourceView);gpu.context->CSSetShaderResources(8,1,&previous);gpu.context->CSSetSamplers(0,1,&linear);gpu.context->CSSetUnorderedAccessViews(0,1,&result,nullptr);gpu.context->Dispatch(1,1,1);result=nullptr;gpu.context->CSSetUnorderedAccessViews(0,1,&result,nullptr);sourceView=nullptr;gpu.context->CSSetShaderResources(0,1,&sourceView);gpu.context->CSSetShaderResources(8,1,&sourceView);exposureIndex=1-exposureIndex;exposureValid=true;++dispatches_;}else{exposureImages={};exposureValid=false;}
        if(post.occlusion[3]>0){if(aaImage.width!=scene.width||aaImage.height!=scene.height){aaImage=image(scene.width,scene.height,true,DXGI_FORMAT_R8G8B8A8_UNORM);++allocations_;}}else aaImage=Image{};auto* compositeTarget=post.occlusion[3]>0?aaImage.target.p:output;auto* cb=upload(values);std::array<ID3D11ShaderResourceView*,10> views{};views[6]=depthView.p;views[7]=lookupTexture;views[8]=post.exposure[0]>0?exposureImages[exposureIndex].view.p:nullptr;views[0]=screenSource;views[9]=scene.view.p;for(std::size_t i=0;i<levels.size();i++)views[i+1]=levels[i][0].view.p;auto* state=sampler.p;D3D11_VIEWPORT viewport{area[0],area[1],area[2],area[3],0,1};const auto crop=scissor.value_or(area);D3D11_RECT rect{LONG(std::floor(crop[0])),LONG(std::floor(crop[1])),LONG(std::ceil(crop[0]+crop[2])),LONG(std::ceil(crop[1]+crop[3]))};
        gpu.context->CSSetShader(nullptr,nullptr,0);gpu.context->OMSetRenderTargets(1,&compositeTarget,nullptr);gpu.context->OMSetDepthStencilState(depth.p,0);gpu.context->OMSetBlendState(blend.p,nullptr,UINT_MAX);gpu.context->RSSetState(raster.p);gpu.context->RSSetViewports(1,&viewport);gpu.context->RSSetScissorRects(1,&rect);gpu.context->IASetInputLayout(nullptr);gpu.context->IASetPrimitiveTopology(D3D11_PRIMITIVE_TOPOLOGY_TRIANGLELIST);gpu.context->VSSetShader(vertex.p,nullptr,0);gpu.context->PSSetShader(pixel.p,nullptr,0);gpu.context->PSSetConstantBuffers(0,1,&cb);gpu.context->PSSetShaderResources(0,10,views.data());gpu.context->PSSetSamplers(0,1,&state);gpu.context->Draw(3,0);views.fill(nullptr);gpu.context->PSSetShaderResources(0,10,views.data());gpu.context->OMSetRenderTargets(0,nullptr,nullptr);if(post.occlusion[3]>0){auto* aaView=aaImage.view.p;gpu.context->OMSetRenderTargets(1,&output,nullptr);gpu.context->PSSetShader(aaPixel.p,nullptr,0);gpu.context->PSSetShaderResources(0,1,&aaView);gpu.context->Draw(3,0);aaView=nullptr;gpu.context->PSSetShaderResources(0,1,&aaView);gpu.context->OMSetRenderTargets(0,nullptr,nullptr);}detail::check(gpu.device->GetDeviceRemovedReason(),"Bloom device lost");pending=false;++composites_;
    }
    ID3D11RenderTargetView* normalTarget()const{return screen.normalTarget();}ID3D11RenderTargetView* albedoTarget()const{return screen.albedoTarget();}ID3D11RenderTargetView* ambientTarget()const{return screen.ambientTarget();}ID3D11RenderTargetView* motionTarget()const{return screen.motionTarget();}
    void markDirty(){pending=true;}
    bool active() const{return scene.target.p!=nullptr;}ID3D11RenderTargetView* target() const{return scene.target.p;}
    ID3D11Texture2D* colorTexture() const{return scene.texture.p;}
    void release(){screen.release();levels.clear();scene=Image{};aaImage=Image{};exposureImages={};exposureValid=false;depthView={};depthImage={};pending=false;}
    std::array<std::uint64_t,9> compilationInfo()const{return screen.compilationInfo();}
    void setAsyncShaderPreparation(bool value){screen.setAsyncPreparation(value);}
    auto shaderPreparationInfo()const{return screen.preparationInfo();}
    void pollShaderPreparation(){screen.pollPreparation();}
    std::uint64_t textureBytes() const{std::uint64_t bytes=std::uint64_t(scene.width)*scene.height*8;for(const auto& layer:levels)bytes+=std::uint64_t(layer[0].width)*layer[0].height*16;for(const auto& image:exposureImages)bytes+=std::uint64_t(image.width)*image.height*8;bytes+=std::uint64_t(aaImage.width)*aaImage.height*4;return bytes+screen.bytes();}
    std::uint64_t dispatches() const{return dispatches_;}std::uint64_t allocations() const{return allocations_;}std::uint64_t composites() const{return composites_;}
    std::size_t levelCount() const{return levels.size();}
};
#endif
}
