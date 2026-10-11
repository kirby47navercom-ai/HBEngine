#pragma once
#include "Bloom.hpp"

namespace hb::gpu {
struct SceneVertex {
    std::array<float,3> position{},normal{0,0,1};
    std::array<float,2> uv{};
    std::array<float,4> color{1,1,1,1};
};
struct SceneInstance {
    Matrix world=identity,normal=identity;
    std::array<float,4> color{1,1,1,1};
};
static_assert(sizeof(SceneInstance)==144,"HLSL instance buffer layout");
struct SceneSkin {
    std::array<std::uint32_t,4> joints{};
    std::array<float,4> weights{1,0,0,0};
};
struct SceneMorph {
    std::array<float,4> position{},normal{},color{};
};
static_assert(sizeof(SceneSkin)==32&&sizeof(SceneMorph)==48,"HLSL deformation buffer layout");
struct SceneLight {
    // position.w: directional=0, point=1, spot=2, hemisphere=3; direction.w: range (0=infinite).
    std::array<float,4> position{},direction{0,0,1,0},color{1,1,1,1},cone{1,0,2,0};
};
struct SceneShadow {
    Matrix viewProjection=identity;
    std::array<float,4> parameters{-.0001f,0,1,1},size{512,512,0,0};
    bool operator==(const SceneShadow& other) const{return viewProjection==other.viewProjection&&parameters==other.parameters&&size==other.size;}
};
static_assert(sizeof(SceneShadow)==96,"HLSL shadow buffer layout");
struct SceneMaterial {
    std::array<float,4> color{1,1,1,1},emissive{0,0,0,1};
    float roughness=.7f,metalness=0,alphaCutoff=0;
    bool unlit=false,toneMapped=true,depthTest=true,depthWrite=true,doubleSided=false,backSide=false,vertexColors=false,receiveShadow=true;
    ParticleBlend blend=ParticleBlend::Opaque;
    std::array<std::array<float,4>,6> uvX{{{1,0,0,0},{1,0,0,0},{1,0,0,0},{1,0,0,0},{1,0,0,0},{1,0,0,0}}},uvY{{{0,1,0,0},{0,1,0,0},{0,1,0,0},{0,1,0,0},{0,1,0,0},{0,1,0,0}}};
    std::array<float,2> normalScale{1,1};
    std::array<float,4> shotShape{1,1,0,0};
    bool sky=false;
    std::array<float,4> skyTop{},skyHorizon{},sunDirection{0,1,0,350},sunColor{};
};
struct SceneFrame {
    Matrix viewProjection=identity;
    std::array<float,4> clear{0,0,0,1},eye{0,0,10,1},ambient{.2f,.2f,.2f,1};
    // fog.w: exponential density; fogRange: near,far,height falloff,height.
    std::array<float,4> fog{},fogRange{0,0,0,0};
    std::array<float,4> heightFog{0,0,0,1};
    float exposure=1;
    float time=0;
    std::array<float,4> viewport{};
    std::optional<std::array<float,4>> viewportClear;
    std::optional<std::array<float,4>> scissor;
    std::optional<SceneBloom> bloom;
};
#if defined(_WIN32) && !defined(HB_COMPUTE_UNAVAILABLE)
class SceneRenderer {
public:
    struct Deformation {
        friend class SceneRenderer;
    private:
        detail::Com<ID3D11Buffer> skin,morph;
        detail::Com<ID3D11ShaderResourceView> skinView,morphView;
        std::array<detail::Com<ID3D11Buffer>,3> poses;
        std::array<detail::Com<ID3D11ShaderResourceView>,3> poseViews;
        ID3D11Device* owner=nullptr;std::uint32_t vertexCount=0,boneCount=0,morphCount=0,poseBytes=0;
        std::size_t slot=0;std::vector<float> current;
    public:
        Deformation()=default;Deformation(Deformation&&)=default;Deformation& operator=(Deformation&&)=default;
        std::uint64_t bytes() const{return (boneCount?std::uint64_t(vertexCount)*sizeof(SceneSkin):0)+std::uint64_t(vertexCount)*morphCount*sizeof(SceneMorph)+std::uint64_t(poseBytes)*poses.size();}
    };
    struct Instances {
        friend class SceneRenderer;
    private:
        std::array<detail::Com<ID3D11Buffer>,3> buffers;
        std::array<detail::Com<ID3D11ShaderResourceView>,3> views;
        ID3D11Device* owner=nullptr;std::uint32_t capacity=0,count=0,stride=sizeof(SceneInstance);std::size_t slot=0;
    public:
        Instances()=default;Instances(Instances&&)=default;Instances& operator=(Instances&&)=default;
        std::uint64_t bytes() const{return std::uint64_t(capacity)*stride*buffers.size();}
        bool positionsOnly() const{return stride==16;}
    };
    struct Mesh {
        friend class SceneRenderer;
    private:
        detail::Com<ID3D11Buffer> vertices,indices;ID3D11Device* owner=nullptr;
        std::uint32_t count=0,vertexCount=0;
    public:
        Mesh()=default;Mesh(Mesh&&)=default;Mesh& operator=(Mesh&&)=default;
    };
    struct Texture {
        friend class SceneRenderer;
    private:
        detail::Com<ID3D11ShaderResourceView> view;ID3D11Device* owner=nullptr;
    public:
        Texture()=default;Texture(Texture&&)=default;Texture& operator=(Texture&&)=default;
    };
    struct Program {
        friend class SceneRenderer;
    private:
        detail::Com<ID3D11PixelShader> shader,shadowShader;
        detail::Com<ID3D11Buffer> parameters;
        detail::Com<ID3D11ShaderResourceView> values;
        std::vector<float> current;ID3D11Device* owner=nullptr;
    public:
        Program()=default;Program(Program&&)=default;Program& operator=(Program&&)=default;
    };
private:
    Device& gpu;
    ParticleRenderer surface;BloomPass bloom;
    detail::Com<ID3D11VertexShader> vertex;
    detail::Com<ID3D11PixelShader> pixel,shadowPixel;
    detail::Com<ID3D11InputLayout> layout;
    std::array<detail::Com<ID3D11Buffer>,3> constants;
    std::array<detail::Com<ID3D11RasterizerState>,3> rasters,shadowRasters;
    std::array<detail::Com<ID3D11SamplerState>,18> samplers;
    detail::Com<ID3D11Buffer> lights;
    detail::Com<ID3D11ShaderResourceView> lightView;
    std::uint32_t lightCount=0,lightCapacity=0;
    std::vector<SceneLight> lightDefinitions;
    detail::Com<ID3D11Texture2D> shadowImage;
    detail::Com<ID3D11ShaderResourceView> shadowView,shadowDataView;
    detail::Com<ID3D11Buffer> shadowBuffer;
    std::vector<detail::Com<ID3D11DepthStencilView>> shadowTargets;
    std::vector<SceneShadow> shadows;
    std::uint32_t shadowWidth=0,shadowHeight=0;
    // shortcut: mixed map sizes share the largest layer size; split arrays if measured VRAM requires it.
    int activeShadow=-1;SceneFrame shadowFrame;
    std::uint64_t shadowDraws_=0,shadowPasses_=0;
    std::size_t slot=0;
    std::uint64_t draws_=0,uploads_=0;
    struct Timing {detail::Com<ID3D11Query> begin,end,frequency;bool pending=false;std::uint64_t sequence=0;};
    std::array<Timing,3> timings;
    int activeTiming=-1;std::size_t timingSlot=0;std::uint64_t frameSequence=0,timingSequence=0;
    std::optional<double> gpuMilliseconds;
    void finishTiming(){if(activeTiming>=0){auto& t=timings[activeTiming];gpu.context->End(t.end.p);gpu.context->End(t.frequency.p);t.pending=true;activeTiming=-1;}}
    void startTiming(){
        finishTiming();for(auto& t:timings){if(!t.pending)continue;D3D11_QUERY_DATA_TIMESTAMP_DISJOINT frequency{};UINT64 begin=0,end=0;const auto status=gpu.context->GetData(t.frequency.p,&frequency,sizeof(frequency),D3D11_ASYNC_GETDATA_DONOTFLUSH);detail::check(status,"GPU timing frequency");if(status==S_FALSE)continue;const auto a=gpu.context->GetData(t.begin.p,&begin,sizeof(begin),D3D11_ASYNC_GETDATA_DONOTFLUSH),b=gpu.context->GetData(t.end.p,&end,sizeof(end),D3D11_ASYNC_GETDATA_DONOTFLUSH);detail::check(a,"GPU timing start");detail::check(b,"GPU timing end");if(a==S_FALSE||b==S_FALSE)continue;t.pending=false;if(!frequency.Disjoint&&frequency.Frequency&&end>=begin&&t.sequence>=timingSequence){gpuMilliseconds=double(end-begin)*1000/frequency.Frequency;timingSequence=t.sequence;}}
        auto& next=timings[timingSlot];const auto index=timingSlot;timingSlot=(timingSlot+1)%timings.size();++frameSequence;if(next.pending)return;next.sequence=frameSequence;gpu.context->Begin(next.frequency.p);gpu.context->End(next.begin.p);activeTiming=static_cast<int>(index);
    }
    SceneFrame frame;
    Mesh background;
    struct Constants {
        Matrix viewProjection,world,normal;
        std::array<float,4> color,emissive,surface,eye,ambient;
        std::array<std::array<float,4>,6> uvX,uvY;
        std::array<float,4> flags,normalScale,fog,fogRange,heightFog,skyTop,skyHorizon,sunDirection,sunColor,shotShape;
        std::array<std::uint32_t,4> deformation;
    };
    template<class T> static bool finite(const T& a){return std::all_of(a.begin(),a.end(),[](float v){return std::isfinite(v);});}
    void uploadInstances(Instances& target,const void* data,std::size_t count){
        if(target.owner!=gpu.device.p||count>target.capacity)throw std::runtime_error("Instance data or owner invalid");
        std::lock_guard<std::mutex> lock(gpu.mutex);if(count){const auto next=(target.slot+1)%target.buffers.size();D3D11_BOX box{0,0,0,static_cast<UINT>(count*target.stride),1,1};gpu.context->UpdateSubresource(target.buffers[next].p,0,&box,data,0,0);target.slot=next;}target.count=static_cast<UINT>(count);
    }
    static constexpr const char* shader=R"HLSL(
cbuffer Settings:register(b0){float4x4 vp,world,normalMatrix;float4 tint,emissive,surface,eye,ambient,uvX[6],uvY[6],flags,normalScale,fog,fogRange,heightFog,skyTop,skyHorizon,sunDirection,sunColor,shotShape;uint4 deformation;};
struct Light{float4 position,direction,color,cone;};StructuredBuffer<Light> lights:register(t6);
Texture2D baseMap:register(t0),normalMap:register(t1),roughMap:register(t2),metalMap:register(t3),emissiveMap:register(t4),aoMap:register(t5);
SamplerState baseSampler:register(s0),normalSampler:register(s1),roughSampler:register(s2),metalSampler:register(s3),emissiveSampler:register(s4),aoSampler:register(s5);
Texture2DArray<float> shadowMap:register(t24);
struct Shadow{float4x4 vp;float4 parameters,size;};StructuredBuffer<Shadow> shadows:register(t25);
struct Instance{float4x4 world,normal;float4 color;};StructuredBuffer<Instance> instances:register(t26);
StructuredBuffer<float4> shots:register(t27);
struct Skin{uint4 joints;float4 weights;};StructuredBuffer<Skin> skinVertices:register(t28);
struct Morph{float4 position,normal,color;};StructuredBuffer<Morph> morphVertices:register(t29);
StructuredBuffer<float4> pose:register(t30);
struct Input{float3 position:POSITION;float3 normal:NORMAL;float2 uv:TEXCOORD;float4 color:COLOR;};
struct Output{float4 position:SV_POSITION;float3 at:TEXCOORD0;float3 normal:TEXCOORD1;float2 uv:TEXCOORD2;float4 color:COLOR;float4 instanceColor:TEXCOORD3;};
Output VS(Input i,uint id:SV_InstanceID,uint vertexId:SV_VertexID){Output o;float4 position=float4(i.position,1);float3 normal=i.normal;float4 color=i.color;o.instanceColor=1;
 if((uint)flags.x&1024){
  for(uint t=0;t<deformation.y;t++){float weight=pose[deformation.z*4+t/4][t%4];if(weight!=0){Morph m=morphVertices[t*deformation.x+vertexId];position.xyz+=m.position.xyz*weight;normal+=m.normal.xyz*weight;color+=m.color*weight;}}
  if(deformation.z){Skin s=skinVertices[vertexId];float4x4 skin=0;[unroll]for(uint j=0;j<4;j++){uint b=s.joints[j]*4;skin+=transpose(float4x4(pose[b],pose[b+1],pose[b+2],pose[b+3]))*s.weights[j];}position=float4(mul(skin,position).xyz+pose[deformation.z*4+(deformation.y+3)/4].xyz*(1-dot(s.weights,float4(1,1,1,1))),1);normal=mul((float3x3)skin,normal);}
 }
 if((uint)flags.x&256){Instance item=instances[id];position=mul(item.world,position);normal=mul((float3x3)item.normal,normal);o.instanceColor=item.color;}else if((uint)flags.x&512){float2 offset=i.position.xy*shotShape.xy;position=float4(shots[id].xyz+(shotShape.z>0?float3(offset.x,0,offset.y):float3(offset,0)),1);if(shotShape.z>0)normal=float3(0,-1,0);}float4 at=mul(world,position);o.position=mul(vp,at);o.at=at.xyz;o.normal=mul((float3x3)normalMatrix,normal);o.uv=i.uv;o.color=flags.w==1?color:float4(1,1,1,1);return o;}
float2 mapUv(float2 uv,uint slot){return float2(dot(uvX[slot].xyz,float3(uv,1)),dot(uvY[slot].xyz,float3(uv,1)));}
float3 safeNormal(float3 v){return v*rsqrt(max(dot(v,v),1e-12));}
float shadowFactor(Light light,float3 position,float3 normal){
 if(light.cone.w<=0)return 1;uint index=(uint)light.cone.w-1;
 if(light.position.w>.5&&light.position.w<1.5){float3 d=position-light.position.xyz,a=abs(d);index+=a.x>=a.y&&a.x>=a.z?(d.x>0?0:1):a.z>=a.y?(d.z>0?2:3):(d.y>0?4:5);}
 Shadow s=shadows[index];float4 at=mul(s.vp,float4(position+normal*s.parameters.y,1));if(at.w<=0)return 1;float3 clipPosition=at.xyz/at.w;float2 uv=clipPosition.xy*float2(.5,-.5)+.5;if(any(uv<0)||any(uv>1)||clipPosition.z<0||clipPosition.z>1)return 1;
 float z=clipPosition.z+s.parameters.x,result=0;int2 size=(int2)s.size.xy,center=(int2)(uv*size);int radius=(int)ceil(s.parameters.z);
 if(radius==0)result=z<=shadowMap.Load(int4(clamp(center,0,size-1),index,0));else{[unroll]for(int y=-1;y<=1;y++){[unroll]for(int x=-1;x<=1;x++){int2 pixel=clamp(center+(int2)round(float2(x,y)*s.parameters.z),0,size-1);result+=(z<=shadowMap.Load(int4(pixel,index,0)))?1:0;}}result/=9;}
 return lerp(1,result,s.parameters.w);
}
float3 srgb(float3 v){return lerp(12.92*v,1.055*pow(max(v,0),1.0/2.4)-.055,step(.0031308,v));}
float3 aces(float3 v){return saturate((v*(2.51*v+.03))/(v*(2.43*v+.59)+.14));}
float4 PS(Output i,bool front:SV_IsFrontFace):SV_TARGET{
 if(flags.w>1.5){float3 d=safeNormal(i.at-eye.xyz);float3 sky=lerp(skyHorizon.rgb,skyTop.rgb,smoothstep(-.12,.85,d.y));sky+=sunColor.rgb*pow(max(dot(d,safeNormal(sunDirection.xyz)),0),sunDirection.w)*.55;return float4(((uint)flags.x&128)?sky:srgb(max(sky,0)),1);}
 uint maps=(uint)flags.x;float4 base=tint*i.color;if(maps&1)base*=baseMap.Sample(baseSampler,mapUv(i.uv,0));
 float3 n=safeNormal(i.normal);if(!front)n=-n;
 if(maps&2){float2 uv=mapUv(i.uv,1);float3 q1=ddx(i.at),q2=ddy(i.at);float2 st1=ddx(uv),st2=ddy(uv);float3 a=cross(q2,n),b=cross(n,q1),t=a*st1.x+b*st2.x,bt=a*st1.y+b*st2.y;float scale=rsqrt(max(max(dot(t,t),dot(bt,bt)),1e-12));float3 nm=normalMap.Sample(normalSampler,uv).xyz*2-1;nm.xy*=normalScale.xy;n=safeNormal(t*scale*nm.x+bt*scale*nm.y+n*nm.z);}
 float rough=clamp(surface.x*((maps&4)?roughMap.Sample(roughSampler,mapUv(i.uv,2)).g:1),.04,1),metal=saturate(surface.y*((maps&8)?metalMap.Sample(metalSampler,mapUv(i.uv,3)).b:1));
 float3 emit=emissive.rgb*emissive.a*((maps&16)?emissiveMap.Sample(emissiveSampler,mapUv(i.uv,4)).rgb:1);
 float ao=(maps&32)?aoMap.Sample(aoSampler,mapUv(i.uv,5)).r:1;
 // HB_MATERIAL_EVAL
 base*=i.instanceColor;
 clip(base.a-surface.z);float3 outColor=base.rgb;
 if(surface.w<.5){outColor=base.rgb*ambient.rgb*ao+emit;float3 v=safeNormal(eye.xyz-i.at),f0=lerp(.04,base.rgb,metal);float nv=max(dot(n,v),1e-4);
  for(uint j=0;j<(uint)flags.y;j++){Light light=lights[j];if(light.position.w>2.5){outColor+=base.rgb*lerp(light.cone.rgb,light.color.rgb,dot(n,safeNormal(light.direction.xyz))*.5+.5)*light.color.a*ao;continue;}float3 delta=light.position.xyz-i.at;float dist=length(delta);float3 l=light.position.w<.5?safeNormal(light.direction.xyz):safeNormal(delta);float attenuation=1;
   if(light.position.w>.5){attenuation=1/max(pow(dist,light.cone.z),.01);if(light.direction.w>0)attenuation*=pow(saturate(1-pow(dist/light.direction.w,4)),2);if(light.position.w>1.5){float angle=dot(-l,safeNormal(light.direction.xyz));attenuation*=light.cone.y>light.cone.x?smoothstep(light.cone.x,light.cone.y,angle):step(light.cone.x,angle);}}
   if(maps&64)attenuation*=shadowFactor(light,i.at,n);float nl=saturate(dot(n,l));float3 h=safeNormal(l+v);float nh=saturate(dot(n,h)),vh=saturate(dot(v,h));float a=rough*rough,a2=a*a,d=a2/max(3.14159265*pow(nh*nh*(a2-1)+1,2),1e-5),k=pow(rough+1,2)/8,g=(nv/(nv*(1-k)+k))*(nl/(nl*(1-k)+k));float3 f=f0+(1-f0)*pow(1-vh,5);float3 spec=d*g*f/max(4*nv*nl,1e-4);outColor+=((1-f)*(1-metal)*base.rgb/3.14159265+spec)*light.color.rgb*light.color.a*nl*attenuation;
  }
 }else outColor+=emit;
 if(fogRange.y>0){float distance=length(eye.xyz-i.at),amount=fog.w>0?1-exp(-fog.w*fog.w*distance*distance):smoothstep(fogRange.x,fogRange.y,distance);if(heightFog.x>0){amount=0;if(distance>fogRange.x&&distance<fogRange.y&&fog.w>0){float start=eye.y+(i.at.y-eye.y)*fogRange.x/max(distance,.0001),span=heightFog.y*(i.at.y-start),integral=abs(span)<.001?1:(1-exp(-clamp(span,-40,40)))/span;float optical=fog.w*exp(clamp(-heightFog.y*(start-heightFog.z),-40,40))*(distance-fogRange.x)*integral;amount=min(heightFog.w,1-exp(-max(optical,0)));}}outColor=lerp(outColor,fog.rgb,saturate(amount));}
 if(maps&128)return float4(clamp(outColor,0,65472),base.a);if(flags.z>0)outColor=aces(outColor*normalScale.z);return float4(srgb(max(outColor,0)),base.a);
}
void ShadowPS(Output i,bool front:SV_IsFrontFace){PS(i,front);}
)HLSL";
public:
    SceneRenderer(Device& device,std::uint32_t width,std::uint32_t height,void* hwnd=nullptr):gpu(device),surface(device,width,height,hwnd),bloom(device){
        std::lock_guard<std::mutex> lock(gpu.mutex);auto compile=detail::libraries().symbol<decltype(&D3DCompile)>(detail::libraries().compiler,"D3DCompile");
        for(const auto* entry:{"VS","PS","ShadowPS"}){detail::Com<ID3DBlob> code,error;const auto result=compile(shader,std::strlen(shader),"HBSceneRender",nullptr,nullptr,entry,entry[0]=='V'?"vs_5_0":"ps_5_0",D3DCOMPILE_ENABLE_STRICTNESS|D3DCOMPILE_OPTIMIZATION_LEVEL3,0,&code.p,&error.p);if(FAILED(result))throw std::runtime_error(error.p?std::string(static_cast<const char*>(error->GetBufferPointer()),error->GetBufferSize()):"Scene shader compile failed");
            if(entry[0]=='V'){detail::check(gpu.device->CreateVertexShader(code->GetBufferPointer(),code->GetBufferSize(),nullptr,&vertex.p),"Scene vertex shader");const D3D11_INPUT_ELEMENT_DESC elements[]={{"POSITION",0,DXGI_FORMAT_R32G32B32_FLOAT,0,0,D3D11_INPUT_PER_VERTEX_DATA,0},{"NORMAL",0,DXGI_FORMAT_R32G32B32_FLOAT,0,12,D3D11_INPUT_PER_VERTEX_DATA,0},{"TEXCOORD",0,DXGI_FORMAT_R32G32_FLOAT,0,24,D3D11_INPUT_PER_VERTEX_DATA,0},{"COLOR",0,DXGI_FORMAT_R32G32B32A32_FLOAT,0,32,D3D11_INPUT_PER_VERTEX_DATA,0}};detail::check(gpu.device->CreateInputLayout(elements,4,code->GetBufferPointer(),code->GetBufferSize(),&layout.p),"Scene vertex layout");}
            else detail::check(gpu.device->CreatePixelShader(code->GetBufferPointer(),code->GetBufferSize(),nullptr,entry[0]=='S'?&shadowPixel.p:&pixel.p),"Scene pixel shader");
        }
        D3D11_BUFFER_DESC cb{};cb.ByteWidth=sizeof(Constants);cb.Usage=D3D11_USAGE_DYNAMIC;cb.BindFlags=D3D11_BIND_CONSTANT_BUFFER;cb.CPUAccessFlags=D3D11_CPU_ACCESS_WRITE;for(auto& buffer:constants)detail::check(gpu.device->CreateBuffer(&cb,nullptr,&buffer.p),"Scene frame constants");
        for(auto& timing:timings){D3D11_QUERY_DESC desc{D3D11_QUERY_TIMESTAMP,0};detail::check(gpu.device->CreateQuery(&desc,&timing.begin.p),"GPU start timestamp");detail::check(gpu.device->CreateQuery(&desc,&timing.end.p),"GPU end timestamp");desc.Query=D3D11_QUERY_TIMESTAMP_DISJOINT;detail::check(gpu.device->CreateQuery(&desc,&timing.frequency.p),"GPU timestamp frequency");}
        for(std::size_t i=0;i<rasters.size();i++){D3D11_RASTERIZER_DESC rs{};rs.FillMode=D3D11_FILL_SOLID;rs.CullMode=i==0?D3D11_CULL_BACK:i==1?D3D11_CULL_FRONT:D3D11_CULL_NONE;rs.FrontCounterClockwise=TRUE;rs.DepthClipEnable=TRUE;rs.ScissorEnable=TRUE;detail::check(gpu.device->CreateRasterizerState(&rs,&rasters[i].p),"Scene raster state");rs.SlopeScaledDepthBias=1;rs.DepthBiasClamp=.01f;detail::check(gpu.device->CreateRasterizerState(&rs,&shadowRasters[i].p),"Shadow slope bias state");}
        for(std::size_t i=0;i<samplers.size();i++){D3D11_SAMPLER_DESC s{};s.Filter=i%2?D3D11_FILTER_MIN_MAG_MIP_POINT:D3D11_FILTER_MIN_MAG_MIP_LINEAR;s.AddressU=static_cast<D3D11_TEXTURE_ADDRESS_MODE>(1+(i/2)%3);s.AddressV=static_cast<D3D11_TEXTURE_ADDRESS_MODE>(1+i/6);s.AddressW=s.AddressV;s.MaxLOD=D3D11_FLOAT32_MAX;detail::check(gpu.device->CreateSamplerState(&s,&samplers[i].p),"Scene sampler state");}
    }
    Mesh createMesh(const std::vector<SceneVertex>& vertices,const std::vector<std::uint32_t>& indices){
        if(vertices.empty()||indices.empty()||indices.size()%3||vertices.size()>UINT_MAX/sizeof(SceneVertex)||indices.size()>UINT_MAX/4)throw std::runtime_error("Scene mesh byte size invalid");
        for(const auto& v:vertices)if(!finite(v.position)||!finite(v.normal)||!finite(v.uv)||!finite(v.color))throw std::runtime_error("Scene vertex invalid");
        for(auto i:indices)if(i>=vertices.size())throw std::runtime_error("Scene index out of bounds");
        std::lock_guard<std::mutex> lock(gpu.mutex);Mesh result;result.owner=gpu.device.p;result.count=static_cast<std::uint32_t>(indices.size());result.vertexCount=static_cast<std::uint32_t>(vertices.size());D3D11_BUFFER_DESC desc{};desc.Usage=D3D11_USAGE_IMMUTABLE;desc.ByteWidth=static_cast<UINT>(vertices.size()*sizeof(SceneVertex));desc.BindFlags=D3D11_BIND_VERTEX_BUFFER;D3D11_SUBRESOURCE_DATA data{vertices.data(),0,0};detail::check(gpu.device->CreateBuffer(&desc,&data,&result.vertices.p),"Scene vertices");desc.ByteWidth=static_cast<UINT>(indices.size()*4);desc.BindFlags=D3D11_BIND_INDEX_BUFFER;data.pSysMem=indices.data();detail::check(gpu.device->CreateBuffer(&desc,&data,&result.indices.p),"Scene indices");++uploads_;return result;
    }
    Instances createInstances(std::size_t capacity,bool positionsOnly=false){
        const UINT stride=positionsOnly?16:sizeof(SceneInstance);if(!capacity||capacity>UINT_MAX/stride)throw std::runtime_error("Instance buffer capacity invalid");
        std::lock_guard<std::mutex> lock(gpu.mutex);Instances out;out.owner=gpu.device.p;out.capacity=static_cast<UINT>(capacity);out.stride=stride;D3D11_BUFFER_DESC desc{};desc.ByteWidth=out.capacity*stride;desc.Usage=D3D11_USAGE_DEFAULT;desc.BindFlags=D3D11_BIND_SHADER_RESOURCE;desc.MiscFlags=D3D11_RESOURCE_MISC_BUFFER_STRUCTURED;desc.StructureByteStride=stride;for(std::size_t i=0;i<out.buffers.size();i++){detail::check(gpu.device->CreateBuffer(&desc,nullptr,&out.buffers[i].p),"Instance frame buffer");detail::check(gpu.device->CreateShaderResourceView(out.buffers[i].p,nullptr,&out.views[i].p),"Instance frame view");}++uploads_;return out;
    }
    Deformation createDeformation(std::uint32_t vertexCount,std::uint32_t boneCount,std::uint32_t morphCount,const std::vector<SceneSkin>& skin,const std::vector<SceneMorph>& morph){
        const auto poseSize=(std::uint64_t(boneCount)*4+(std::uint64_t(morphCount)+3)/4+(boneCount?1:0))*16;
        if(!vertexCount||(!boneCount&&!morphCount)||skin.size()!=(boneCount?vertexCount:0)||std::uint64_t(vertexCount)*morphCount>UINT_MAX/sizeof(SceneMorph)||std::uint64_t(vertexCount)*morphCount!=morph.size()||std::uint64_t(skin.size())*sizeof(SceneSkin)>UINT_MAX||std::uint64_t(morph.size())*sizeof(SceneMorph)>UINT_MAX||poseSize>UINT_MAX)throw std::runtime_error("Deformation dimensions invalid");
        for(const auto& v:skin){if(!finite(v.weights)||std::any_of(v.weights.begin(),v.weights.end(),[](float w){return w<0;})||std::none_of(v.weights.begin(),v.weights.end(),[](float w){return w>0;}))throw std::runtime_error("Skin weights invalid");for(auto j:v.joints)if(j>=boneCount)throw std::runtime_error("Skin joint out of bounds");}
        for(const auto& v:morph)if(!finite(v.position)||!finite(v.normal)||!finite(v.color))throw std::runtime_error("Morph values must be finite");
        std::lock_guard<std::mutex> lock(gpu.mutex);Deformation out;out.owner=gpu.device.p;out.vertexCount=vertexCount;out.boneCount=boneCount;out.morphCount=morphCount;out.poseBytes=static_cast<UINT>(poseSize);
        const auto buffer=[&](const void* data,UINT bytes,UINT stride,detail::Com<ID3D11Buffer>& target,detail::Com<ID3D11ShaderResourceView>& view){D3D11_BUFFER_DESC d{};d.ByteWidth=bytes;d.Usage=data?D3D11_USAGE_IMMUTABLE:D3D11_USAGE_DEFAULT;d.BindFlags=D3D11_BIND_SHADER_RESOURCE;d.MiscFlags=D3D11_RESOURCE_MISC_BUFFER_STRUCTURED;d.StructureByteStride=stride;D3D11_SUBRESOURCE_DATA initial{data,0,0};detail::check(gpu.device->CreateBuffer(&d,data?&initial:nullptr,&target.p),"Deformation buffer");detail::check(gpu.device->CreateShaderResourceView(target.p,nullptr,&view.p),"Deformation view");};
        if(boneCount)buffer(skin.data(),static_cast<UINT>(skin.size()*sizeof(SceneSkin)),sizeof(SceneSkin),out.skin,out.skinView);
        if(morphCount)buffer(morph.data(),static_cast<UINT>(morph.size()*sizeof(SceneMorph)),sizeof(SceneMorph),out.morph,out.morphView);
        for(std::size_t i=0;i<out.poses.size();i++)buffer(nullptr,out.poseBytes,16,out.poses[i],out.poseViews[i]);
        ++uploads_;return out;
    }
    bool setPose(Deformation& target,const std::vector<Matrix>& bones,const std::vector<float>& weights,const std::array<float,3>& bindTranslation={}){
        if(target.owner!=gpu.device.p||bones.size()!=target.boneCount||weights.size()!=target.morphCount||!finite(weights)||!finite(bindTranslation))throw std::runtime_error("Deformation pose dimensions invalid");
        std::vector<float> values;values.reserve(target.poseBytes/4);for(const auto& matrix:bones){if(!finite(matrix))throw std::runtime_error("Bone matrix must be finite");values.insert(values.end(),matrix.begin(),matrix.end());}values.insert(values.end(),weights.begin(),weights.end());values.resize(target.poseBytes/4,0);
        // A folded bind inverse scales its translation by the weight sum; restore one affine translation.
        if(target.boneCount)std::copy(bindTranslation.begin(),bindTranslation.end(),values.end()-4);
        if(values==target.current)return false;
        std::lock_guard<std::mutex> lock(gpu.mutex);const auto next=(target.slot+1)%target.poses.size();gpu.context->UpdateSubresource(target.poses[next].p,0,nullptr,values.data(),0,0);target.slot=next;target.current=std::move(values);return true;
    }
    void setInstances(Instances& target,const std::vector<SceneInstance>& values){
        if(target.stride!=sizeof(SceneInstance))throw std::runtime_error("Instance data format invalid");
        for(const auto& item:values)if(!finite(item.world)||!finite(item.normal)||!finite(item.color))throw std::runtime_error("Instance values must be finite");
        uploadInstances(target,values.data(),values.size());
    }
    void setShotPositions(Instances& target,const std::vector<std::array<float,4>>& values){
        if(target.stride!=16)throw std::runtime_error("Shot position format invalid");
        for(const auto& item:values)if(!finite(item))throw std::runtime_error("Shot positions must be finite");
        uploadInstances(target,values.data(),values.size());
    }
    Texture createTexture(std::uint32_t width,std::uint32_t height,const std::vector<std::uint8_t>& rgba,bool srgb=true,bool mipmaps=true){
        if(!width||!height||width>D3D11_REQ_TEXTURE2D_U_OR_V_DIMENSION||height>D3D11_REQ_TEXTURE2D_U_OR_V_DIMENSION||rgba.size()!=std::size_t(width)*height*4)throw std::runtime_error("Scene texture dimensions or bytes invalid");
        std::lock_guard<std::mutex> lock(gpu.mutex);Texture out;out.owner=gpu.device.p;detail::Com<ID3D11Texture2D> image;D3D11_TEXTURE2D_DESC desc{};desc.Width=width;desc.Height=height;desc.MipLevels=mipmaps?0:1;desc.ArraySize=1;desc.Format=srgb?DXGI_FORMAT_R8G8B8A8_UNORM_SRGB:DXGI_FORMAT_R8G8B8A8_UNORM;desc.SampleDesc.Count=1;desc.Usage=D3D11_USAGE_DEFAULT;desc.BindFlags=D3D11_BIND_SHADER_RESOURCE|(mipmaps?D3D11_BIND_RENDER_TARGET:0);desc.MiscFlags=mipmaps?D3D11_RESOURCE_MISC_GENERATE_MIPS:0;detail::check(gpu.device->CreateTexture2D(&desc,nullptr,&image.p),"Scene texture");gpu.context->UpdateSubresource(image.p,0,nullptr,rgba.data(),width*4,0);detail::check(gpu.device->CreateShaderResourceView(image.p,nullptr,&out.view.p),"Scene texture view");if(mipmaps)gpu.context->GenerateMips(out.view.p);++uploads_;return out;
    }
    Program createProgram(const std::string& declarations,const std::string& evaluation,const std::vector<float>& parameters){
        if(declarations.size()+evaluation.size()>1048576)throw std::runtime_error("Material HLSL source too large");
        std::string source=shader;const auto entry=source.find("float4 PS("),marker=source.find("// HB_MATERIAL_EVAL");source.replace(marker,std::strlen("// HB_MATERIAL_EVAL"),evaluation);source.insert(entry,declarations+"\n");
        Program out;out.owner=gpu.device.p;{std::lock_guard<std::mutex> lock(gpu.mutex);auto compile=detail::libraries().symbol<decltype(&D3DCompile)>(detail::libraries().compiler,"D3DCompile");for(const auto* entry:{"PS","ShadowPS"}){detail::Com<ID3DBlob> code,error;const auto result=compile(source.data(),source.size(),"HBNodeMaterial",nullptr,nullptr,entry,"ps_5_0",D3DCOMPILE_ENABLE_STRICTNESS|D3DCOMPILE_OPTIMIZATION_LEVEL3,0,&code.p,&error.p);if(FAILED(result))throw std::runtime_error(error.p?std::string(static_cast<const char*>(error->GetBufferPointer()),error->GetBufferSize()):"Node material compile failed");detail::check(gpu.device->CreatePixelShader(code->GetBufferPointer(),code->GetBufferSize(),nullptr,entry[0]=='S'?&out.shadowShader.p:&out.shader.p),"Node material shader");}}
        setProgramParameters(out,parameters);++uploads_;return out;
    }
    void setProgramParameters(Program& program,const std::vector<float>& values){
        if(program.owner!=gpu.device.p||!finite(values))throw std::runtime_error("Material parameters invalid");
        if(program.current==values&&program.parameters.p)return;
        std::lock_guard<std::mutex> lock(gpu.mutex);const std::vector<float> defaults{0};const auto& data=values.empty()?defaults:values;const auto bytes=detail::bytes(data.size());
        if(program.current.size()!=values.size()||!program.parameters.p){D3D11_BUFFER_DESC desc{};desc.ByteWidth=bytes;desc.Usage=D3D11_USAGE_DEFAULT;desc.BindFlags=D3D11_BIND_SHADER_RESOURCE;desc.MiscFlags=D3D11_RESOURCE_MISC_BUFFER_STRUCTURED;desc.StructureByteStride=sizeof(float);detail::Com<ID3D11Buffer> buffer;detail::Com<ID3D11ShaderResourceView> view;detail::check(gpu.device->CreateBuffer(&desc,nullptr,&buffer.p),"Material parameters");detail::check(gpu.device->CreateShaderResourceView(buffer.p,nullptr,&view.p),"Material parameter view");program.parameters=std::move(buffer);program.values=std::move(view);}
        gpu.context->UpdateSubresource(program.parameters.p,0,nullptr,data.data(),0,0);program.current=values;
    }
    void setLights(const std::vector<SceneLight>& values){
        if(values.size()>UINT_MAX/sizeof(SceneLight))throw std::runtime_error("Scene light byte size invalid");
        for(const auto& l:values)if(!finite(l.position)||!finite(l.direction)||!finite(l.color)||!finite(l.cone)||l.position[3]<0||l.position[3]>3||std::floor(l.position[3])!=l.position[3]||(l.position[3]<3&&(l.cone[3]<0||std::floor(l.cone[3])!=l.cone[3])))throw std::runtime_error("Scene light invalid");
        std::lock_guard<std::mutex> lock(gpu.mutex);const auto count=static_cast<UINT>(values.size());if(count>lightCapacity){D3D11_BUFFER_DESC desc{};desc.ByteWidth=count*sizeof(SceneLight);desc.Usage=D3D11_USAGE_DEFAULT;desc.BindFlags=D3D11_BIND_SHADER_RESOURCE;desc.MiscFlags=D3D11_RESOURCE_MISC_BUFFER_STRUCTURED;desc.StructureByteStride=sizeof(SceneLight);detail::Com<ID3D11Buffer> buffer;detail::Com<ID3D11ShaderResourceView> view;detail::check(gpu.device->CreateBuffer(&desc,nullptr,&buffer.p),"Scene lights");detail::check(gpu.device->CreateShaderResourceView(buffer.p,nullptr,&view.p),"Scene lights view");lights=std::move(buffer);lightView=std::move(view);lightCapacity=count;}
        if(count){D3D11_BOX box{0,0,0,count*static_cast<UINT>(sizeof(SceneLight)),1,1};gpu.context->UpdateSubresource(lights.p,0,&box,values.data(),0,0);}lightCount=count;lightDefinitions=values;
    }
    void setShadows(const std::vector<SceneShadow>& values){
        if(activeShadow>=0)throw std::runtime_error("Shadow pass is active");
        if(values.size()>D3D11_REQ_TEXTURE2D_ARRAY_AXIS_DIMENSION)throw std::runtime_error("Shadow array exceeds D3D11 resource limits");
        std::uint32_t width=0,height=0;
        for(const auto& s:values){if(!finite(s.viewProjection)||!finite(s.parameters)||!finite(s.size)||s.parameters[2]<0||s.parameters[2]>16||s.parameters[3]<0||s.parameters[3]>1)throw std::runtime_error("Shadow settings invalid");for(std::size_t i=0;i<2;i++)if(s.size[i]<1||s.size[i]>D3D11_REQ_TEXTURE2D_U_OR_V_DIMENSION||std::floor(s.size[i])!=s.size[i])throw std::runtime_error("Shadow dimensions invalid");width=std::max(width,static_cast<std::uint32_t>(s.size[0]));height=std::max(height,static_cast<std::uint32_t>(s.size[1]));}
        if(values==shadows)return;
        std::lock_guard<std::mutex> lock(gpu.mutex);
        if(values.empty()){shadowTargets.clear();shadowImage={};shadowView={};shadowBuffer={};shadowDataView={};shadows.clear();shadowWidth=shadowHeight=0;return;}
        if(width!=shadowWidth||height!=shadowHeight||values.size()!=shadows.size()){
            detail::Com<ID3D11Texture2D> image;detail::Com<ID3D11ShaderResourceView> view,bufferView;detail::Com<ID3D11Buffer> buffer;std::vector<detail::Com<ID3D11DepthStencilView>> targets(values.size());D3D11_TEXTURE2D_DESC desc{};desc.Width=width;desc.Height=height;desc.MipLevels=1;desc.ArraySize=static_cast<UINT>(values.size());desc.Format=DXGI_FORMAT_R32_TYPELESS;desc.SampleDesc.Count=1;desc.BindFlags=D3D11_BIND_DEPTH_STENCIL|D3D11_BIND_SHADER_RESOURCE;detail::check(gpu.device->CreateTexture2D(&desc,nullptr,&image.p),"Shadow array");
            D3D11_SHADER_RESOURCE_VIEW_DESC srv{};srv.Format=DXGI_FORMAT_R32_FLOAT;srv.ViewDimension=D3D11_SRV_DIMENSION_TEXTURE2DARRAY;srv.Texture2DArray.MipLevels=1;srv.Texture2DArray.ArraySize=desc.ArraySize;detail::check(gpu.device->CreateShaderResourceView(image.p,&srv,&view.p),"Shadow array view");for(UINT i=0;i<desc.ArraySize;i++){D3D11_DEPTH_STENCIL_VIEW_DESC dsv{};dsv.Format=DXGI_FORMAT_D32_FLOAT;dsv.ViewDimension=D3D11_DSV_DIMENSION_TEXTURE2DARRAY;dsv.Texture2DArray.FirstArraySlice=i;dsv.Texture2DArray.ArraySize=1;detail::check(gpu.device->CreateDepthStencilView(image.p,&dsv,&targets[i].p),"Shadow layer");}
            D3D11_BUFFER_DESC data{};data.ByteWidth=static_cast<UINT>(values.size()*sizeof(SceneShadow));data.Usage=D3D11_USAGE_DEFAULT;data.BindFlags=D3D11_BIND_SHADER_RESOURCE;data.MiscFlags=D3D11_RESOURCE_MISC_BUFFER_STRUCTURED;data.StructureByteStride=sizeof(SceneShadow);detail::check(gpu.device->CreateBuffer(&data,nullptr,&buffer.p),"Shadow matrices");detail::check(gpu.device->CreateShaderResourceView(buffer.p,nullptr,&bufferView.p),"Shadow matrix view");shadowImage=std::move(image);shadowView=std::move(view);shadowTargets=std::move(targets);shadowBuffer=std::move(buffer);shadowDataView=std::move(bufferView);shadowWidth=width;shadowHeight=height;++uploads_;
        }gpu.context->UpdateSubresource(shadowBuffer.p,0,nullptr,values.data(),0,0);shadows=values;
    }
    void beginShadow(std::size_t index){if(activeShadow>=0||index>=shadows.size())throw std::runtime_error("Shadow pass index invalid");shadowFrame=frame;frame.viewProjection=shadows[index].viewProjection;frame.viewport={0,0,shadows[index].size[0],shadows[index].size[1]};frame.scissor.reset();activeShadow=static_cast<int>(index);std::lock_guard<std::mutex> lock(gpu.mutex);ID3D11ShaderResourceView* empty=nullptr;gpu.context->PSSetShaderResources(24,1,&empty);gpu.context->ClearDepthStencilView(shadowTargets[index].p,D3D11_CLEAR_DEPTH,1,0);++shadowPasses_;}
    void endShadow(){if(activeShadow<0)return;std::lock_guard<std::mutex> lock(gpu.mutex);gpu.context->OMSetRenderTargets(0,nullptr,nullptr);frame=shadowFrame;activeShadow=-1;}
    void begin(const SceneFrame& value){
        endShadow();for(const auto& light:lightDefinitions)if(light.position[3]<3&&light.cone[3]>0&&light.cone[3]+(light.position[3]==1?5:0)>shadows.size())throw std::runtime_error("Shadow light reference invalid");
        if(!finite(value.viewProjection)||!finite(value.clear)||!finite(value.eye)||!finite(value.ambient)||!finite(value.fog)||!finite(value.fogRange)||!finite(value.heightFog)||!finite(value.viewport)||(value.viewportClear&&!finite(*value.viewportClear))||!std::isfinite(value.exposure)||value.exposure<0||!std::isfinite(value.time))throw std::runtime_error("Scene frame invalid");
        const auto validate=[](const std::array<float,4>& rect){if(!finite(rect))throw std::runtime_error("Scene viewport invalid");for(std::size_t i=0;i<2;i++)if(rect[i]<D3D11_VIEWPORT_BOUNDS_MIN||rect[i]>D3D11_VIEWPORT_BOUNDS_MAX||rect[i+2]<0||rect[i]+rect[i+2]>D3D11_VIEWPORT_BOUNDS_MAX)throw std::runtime_error("Scene viewport bounds invalid");};validate(value.viewport);if(value.scissor)validate(*value.scissor);if((value.viewport[2]==0)!=(value.viewport[3]==0))throw std::runtime_error("Scene viewport size invalid");
        {std::lock_guard<std::mutex> lock(gpu.mutex);startTiming();}frame=value;surface.clear(value.clear);bloom.begin(surface.width(),surface.height(),value.viewport,value.bloom,value.clear);draws_=shadowDraws_=0;
        if(value.viewportClear){if(!background.vertices.p)background=createMesh({{{-1,-1,0}},{{1,-1,0}},{{1,1,0}},{{-1,1,0}}},{0,1,2,0,2,3});SceneMaterial fill;fill.color=*value.viewportClear;fill.unlit=true;fill.toneMapped=false;fill.depthTest=fill.depthWrite=false;const auto vp=frame.viewProjection;frame.viewProjection=identity;draw(background,identity,identity,fill);frame.viewProjection=vp;}
    }
    void draw(const Mesh& mesh,const Matrix& world,const Matrix& normal,const SceneMaterial& material={},const std::array<const Texture*,6>& maps={},const std::array<std::uint32_t,6>& sampling={},std::uint32_t first=0,std::uint32_t count=0,const Program* program=nullptr,const std::vector<const Texture*>& programMaps={},const std::vector<std::uint32_t>& programSampling={},const Instances* instances=nullptr,const Deformation* deformation=nullptr){
        if(deformation&&(deformation->owner!=gpu.device.p||deformation->vertexCount!=mesh.vertexCount||deformation->current.empty()||(instances&&instances->positionsOnly())))throw std::runtime_error("Deformation draw binding invalid");
        if(instances){if(instances->owner!=gpu.device.p)throw std::runtime_error("Instance draw owner invalid");if(!instances->count)return;}
        const auto blend=static_cast<std::size_t>(material.blend);if(mesh.owner!=gpu.device.p||!finite(world)||!finite(normal)||!finite(material.color)||!finite(material.emissive)||!finite(material.normalScale)||!finite(material.shotShape)||!finite(material.skyTop)||!finite(material.skyHorizon)||!finite(material.sunDirection)||!finite(material.sunColor)||!std::isfinite(material.roughness)||!std::isfinite(material.metalness)||!std::isfinite(material.alphaCutoff)||blend>=3||first>mesh.count)throw std::runtime_error("Scene draw invalid");for(std::size_t i=0;i<6;i++)if(!finite(material.uvX[i])||!finite(material.uvY[i]))throw std::runtime_error("Scene texture transform invalid");if(!count)count=mesh.count-first;if(count>mesh.count-first||count%3||first%3)throw std::runtime_error("Scene draw range invalid");
        std::array<ID3D11ShaderResourceView*,128> views{};std::array<ID3D11SamplerState*,16> states{};std::uint32_t mask=0;for(std::size_t i=0;i<maps.size();i++){if(sampling[i]>=samplers.size()||(maps[i]&&maps[i]->owner!=gpu.device.p))throw std::runtime_error("Scene texture owner or sampler invalid");if(maps[i]){views[i]=maps[i]->view.p;mask|=1u<<i;}states[i]=samplers[sampling[i]].p;}views[6]=lightView.p;const UINT viewCount=26,samplerCount=program?static_cast<UINT>(programMaps.size()):6;if(program){if(program->owner!=gpu.device.p||programMaps.size()>D3D11_COMMONSHADER_SAMPLER_SLOT_COUNT||programMaps.size()!=programSampling.size())throw std::runtime_error("Material program bindings invalid");views[7]=program->values.p;for(std::size_t i=0;i<programMaps.size();i++){if(!programMaps[i]||programMaps[i]->owner!=gpu.device.p||programSampling[i]>=samplers.size())throw std::runtime_error("Material texture owner or sampler invalid");views[8+i]=programMaps[i]->view.p;states[i]=samplers[programSampling[i]].p;}}
        views[24]=activeShadow<0?shadowView.p:nullptr;views[25]=shadowDataView.p;if(material.receiveShadow)mask|=64u;if(activeShadow<0&&bloom.active()){mask|=128u;bloom.markDirty();}if(instances)mask|=instances->stride==16?512u:256u;if(deformation)mask|=1024u;
        std::lock_guard<std::mutex> lock(gpu.mutex);Constants data{frame.viewProjection,world,normal,material.color,material.emissive,{material.roughness,material.metalness,material.alphaCutoff,material.unlit?1.f:0.f},frame.eye,frame.ambient,material.uvX,material.uvY,{float(mask),float(lightCount),material.toneMapped?1.f:0.f,material.sky?2.f:material.vertexColors?1.f:0.f},{material.normalScale[0],material.normalScale[1],frame.exposure,frame.time},frame.fog,frame.fogRange,frame.heightFog,material.skyTop,material.skyHorizon,material.sunDirection,material.sunColor,material.shotShape,{deformation?deformation->vertexCount:0,deformation?deformation->morphCount:0,deformation?deformation->boneCount:0,0}};auto* cb=constants[slot].p;slot=(slot+1)%constants.size();D3D11_MAPPED_SUBRESOURCE mapped{};detail::check(gpu.context->Map(cb,0,D3D11_MAP_WRITE_DISCARD,0,&mapped),"Scene draw constants");std::memcpy(mapped.pData,&data,sizeof(data));gpu.context->Unmap(cb,0);
        const auto& rect=frame.viewport;const bool custom=rect[2]>0&&rect[3]>0;D3D11_VIEWPORT viewport{custom?rect[0]:0,custom?rect[1]:0,custom?rect[2]:float(surface.width()),custom?rect[3]:float(surface.height()),0,1};const auto crop=frame.scissor.value_or(std::array<float,4>{viewport.TopLeftX,viewport.TopLeftY,viewport.Width,viewport.Height});D3D11_RECT scissor{static_cast<LONG>(std::floor(crop[0])),static_cast<LONG>(std::floor(crop[1])),static_cast<LONG>(std::ceil(crop[0]+crop[2])),static_cast<LONG>(std::ceil(crop[1]+crop[3]))};auto* target=bloom.active()?bloom.target():surface.target.p;gpu.context->OMSetRenderTargets(activeShadow<0?1:0,activeShadow<0?&target:nullptr,activeShadow<0?surface.depthTarget.p:shadowTargets[activeShadow].p);gpu.context->OMSetBlendState(surface.blends[activeShadow<0?blend:2].p,nullptr,UINT_MAX);gpu.context->OMSetDepthStencilState(surface.depths[activeShadow<0?((material.depthTest?1:0)|(material.depthWrite?2:0)):3].p,0);gpu.context->RSSetState((activeShadow<0?rasters:shadowRasters)[material.doubleSided?2:material.backSide?1:0].p);gpu.context->RSSetViewports(1,&viewport);gpu.context->RSSetScissorRects(1,&scissor);
        UINT stride=sizeof(SceneVertex),offset=0;auto* vb=mesh.vertices.p;std::array<ID3D11ShaderResourceView*,5> instanceViews{};if(instances)instanceViews[instances->stride==16?1:0]=instances->views[instances->slot].p;if(deformation){instanceViews[2]=deformation->skinView.p;instanceViews[3]=deformation->morphView.p;instanceViews[4]=deformation->poseViews[deformation->slot].p;}gpu.context->IASetInputLayout(layout.p);gpu.context->IASetVertexBuffers(0,1,&vb,&stride,&offset);gpu.context->IASetIndexBuffer(mesh.indices.p,DXGI_FORMAT_R32_UINT,0);gpu.context->IASetPrimitiveTopology(D3D11_PRIMITIVE_TOPOLOGY_TRIANGLELIST);gpu.context->VSSetShader(vertex.p,nullptr,0);gpu.context->VSSetShaderResources(26,5,instanceViews.data());gpu.context->PSSetShader(activeShadow<0?(program?program->shader.p:pixel.p):(program?program->shadowShader.p:shadowPixel.p),nullptr,0);gpu.context->VSSetConstantBuffers(0,1,&cb);gpu.context->PSSetConstantBuffers(0,1,&cb);gpu.context->PSSetShaderResources(0,viewCount,views.data());gpu.context->PSSetSamplers(0,samplerCount,states.data());if(instances)gpu.context->DrawIndexedInstanced(count,instances->count,first,0,0);else gpu.context->DrawIndexed(count,first,0);instanceViews.fill(nullptr);gpu.context->VSSetShaderResources(26,5,instanceViews.data());views.fill(nullptr);gpu.context->PSSetShaderResources(0,viewCount,views.data());gpu.context->OMSetRenderTargets(0,nullptr,nullptr);if(activeShadow<0)++draws_;else ++shadowDraws_;detail::check(gpu.device->GetDeviceRemovedReason(),"Scene device lost");
    }
    void drawParticles(const Particles& particles,const ParticleStyle& style={}){if(activeShadow>=0||bloom.active())throw std::runtime_error("Particles require a native HDR/shadow scene adapter");surface.draw(particles,style);}
    void resize(std::uint32_t width,std::uint32_t height){surface.resize(width,height);}
    void finish(){endShadow();bloom.complete(surface.target.p,frame.exposure,frame.scissor);std::lock_guard<std::mutex> lock(gpu.mutex);finishTiming();gpu.context->PSSetShader(nullptr,nullptr,0);gpu.context->VSSetShader(nullptr,nullptr,0);ID3D11Buffer* buffer=nullptr;UINT stride=0,offset=0;gpu.context->IASetVertexBuffers(0,1,&buffer,&stride,&offset);gpu.context->IASetIndexBuffer(nullptr,DXGI_FORMAT_R32_UINT,0);}
    bool present(std::uint32_t interval=0){finish();return surface.present(interval);}
    std::vector<std::uint8_t> readPixels(){finish();return surface.readPixels();}
    std::uint32_t width() const{return surface.width();}std::uint32_t height() const{return surface.height();}
    std::uint64_t draws() const{return draws_;}std::uint64_t uploads() const{return uploads_;}std::uint64_t presents() const{return surface.presents();}std::uint64_t captures() const{return surface.captures();}
    std::optional<double> gpuTimeMs() const{return gpuMilliseconds;}
    std::uint64_t gpuTimingFrame() const{return timingSequence;}
    void releasePostProcess(){bloom.release();}
    std::uint64_t bloomTextureBytes() const{return bloom.textureBytes();}
    std::uint64_t bloomDispatches() const{return bloom.dispatches();}
    std::uint64_t bloomAllocations() const{return bloom.allocations();}
    std::uint64_t bloomComposites() const{return bloom.composites();}
    std::size_t bloomLevels() const{return bloom.levelCount();}
    std::size_t shadowLayers() const{return shadows.size();}
    std::uint64_t shadowTextureBytes() const{return std::uint64_t(shadowWidth)*shadowHeight*shadows.size()*4;}
    std::uint64_t shadowDraws() const{return shadowDraws_;}std::uint64_t shadowPasses() const{return shadowPasses_;}
};
#else
class SceneRenderer {public:SceneRenderer(Device&,std::uint32_t,std::uint32_t,void* =nullptr){throw std::runtime_error("Scene renderer requires Windows D3D11 hardware");}};
#endif
}
