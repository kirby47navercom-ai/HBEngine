#pragma once
#include "Bloom.hpp"
#include "SceneProgramPreparation.hpp"
#include "SceneRasterPreparation.hpp"
#include <map>
#include "Scene2D.hpp"
#include "SceneProbes.hpp"
#include "SceneLightTiles.hpp"
#include "SceneShading.hpp"

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
    float roughness=.7f,metalness=0,alphaCutoff=0,lightmapIntensity=1;
    std::array<float,4> physical{0,.1f,1.5f,0},volume{},absorption{1,1,1,0},sheenColor{1,1,1,.5f},lobes{0,0,0,0},film{1.3f,400,1,0},specular{1,1,1,0},scatter{0,0,0,1},scatterColor{1,.434f,.352f,0},hairTangent{0,1,0,.1f};
    bool transmission=false,unlit=false,toneMapped=true,depthTest=true,depthWrite=true,doubleSided=false,backSide=false,vertexColors=false,receiveShadow=true;
    ParticleBlend blend=ParticleBlend::Opaque;
    std::array<std::array<float,4>,6> uvX{{{1,0,0,0},{1,0,0,0},{1,0,0,0},{1,0,0,0},{1,0,0,0},{1,0,0,0}}},uvY{{{0,1,0,0},{0,1,0,0},{0,1,0,0},{0,1,0,0},{0,1,0,0},{0,1,0,0}}};
    std::array<float,2> normalScale{1,1};
    std::array<float,4> shotShape{1,1,0,0};
    bool sky=false;
    std::array<float,4> skyTop{},skyHorizon{},sunDirection{0,1,0,350},sunColor{},moonDirection{0,-1,0,0},moonColor{};
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
    std::optional<SceneBloom> bloom;std::optional<ScenePostProcess> postProcess;std::optional<SceneScreenEffects> screenEffects;
    bool transmission=false,rasterLightCulling=true;
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
        std::size_t slot=0,previousSlot=0;std::vector<float> current,previous;std::array<detail::Com<ID3D11Buffer>,3> previousPoses;std::array<detail::Com<ID3D11ShaderResourceView>,3> previousPoseViews;
    public:
        Deformation()=default;Deformation(Deformation&&)=default;Deformation& operator=(Deformation&&)=default;
        std::uint64_t bytes() const{return (boneCount?std::uint64_t(vertexCount)*sizeof(SceneSkin):0)+std::uint64_t(vertexCount)*morphCount*sizeof(SceneMorph)+std::uint64_t(poseBytes)*(poses.size()+(previousPoses[0].p?previousPoses.size():0));}
    };
    struct Instances {
        friend class SceneRenderer;
    private:
        std::array<detail::Com<ID3D11Buffer>,3> buffers;
        std::array<detail::Com<ID3D11ShaderResourceView>,3> views;
        ID3D11Device* owner=nullptr;std::uint32_t capacity=0,count=0,stride=sizeof(SceneInstance);std::size_t slot=0,previousSlot=0;std::array<detail::Com<ID3D11Buffer>,3> previousMatrices;std::array<detail::Com<ID3D11ShaderResourceView>,3> previousViews;std::vector<Matrix> previous;
    public:
        Instances()=default;Instances(Instances&&)=default;Instances& operator=(Instances&&)=default;
        std::uint64_t bytes() const{return std::uint64_t(capacity)*(stride*buffers.size()+(previousMatrices[0].p?64*previousMatrices.size():0));}
        bool positionsOnly() const{return stride==16;}std::uint32_t capacityCount()const{return capacity;}
    };
    struct Mesh {
        friend class SceneRenderer;
    private:
        detail::Com<ID3D11Buffer> vertices,indices,uv1;std::array<detail::Com<ID3D11Buffer>,3> streamBuffers;std::vector<SceneVertex> streamVertices;std::uint32_t streamSlot=0;ID3D11Device* owner=nullptr;
        std::uint32_t count=0,vertexCount=0;
    public:
        Mesh()=default;Mesh(Mesh&&)=default;Mesh& operator=(Mesh&&)=default;
        std::uint64_t bufferBytes()const{return std::uint64_t(vertexCount)*sizeof(SceneVertex)*(streamVertices.empty()?1:3)+std::uint64_t(count)*4+(uv1.p?std::uint64_t(vertexCount)*8:0);}
        std::uint64_t cpuBytes()const{return std::uint64_t(streamVertices.capacity())*sizeof(SceneVertex);}
    };
    struct TextureMipLevel {std::uint32_t width=0,height=0;std::vector<std::uint8_t> rgba;};
    struct Texture {
        friend class SceneRenderer;
    private:
        detail::Com<ID3D11ShaderResourceView> view;detail::Com<ID3D11RenderTargetView> target;detail::Com<ID3D11DepthStencilView> depth;ID3D11Device* owner=nullptr;std::uint32_t width=0,height=0,layers=1;std::uint64_t bytes=0;bool flatTexture=true;
    public:
        Texture()=default;Texture(Texture&&)=default;Texture& operator=(Texture&&)=default;
        std::uint64_t storageBytes() const{return bytes;}bool renderTarget() const{return target.p!=nullptr;}
    };
    struct Bindings2D {Scene2D settings;std::array<const Texture*,8> maps{};std::uint32_t maskSampling=16;};
    using Probe=SceneProbes::Probe;
    struct ProbeBinding {const Probe* resource=nullptr;ProbeSettings settings;};
    struct Program {
        friend class SceneRenderer;
    private:
        detail::Com<ID3D11PixelShader> shader,shadowShader;
        detail::Com<ID3D11Buffer> parameters;
        detail::Com<ID3D11ShaderResourceView> values;
        std::vector<float> current;ID3D11Device* owner=nullptr;
        std::unique_ptr<SceneProgramPreparation> preparation;
    public:
        Program()=default;Program(Program&&)=default;Program& operator=(Program&&)=default;
        bool ready()const{return shader.p&&shadowShader.p;}
        SceneProgramPreparation::Info preparationInfo()const{return preparation?preparation->info():ready()?SceneProgramPreparation::Info{{3,3},false,true,{}}:SceneProgramPreparation::Info{};}
    };
private:
    Device& gpu;detail::Com<ID3D11ShaderResourceView> postLookupView,geometrySceneView,pathEnvironmentView;std::uint32_t postLookupSize=0;
    ParticleRenderer surface;BloomPass bloom;SceneProbes probes;SceneLightTiles lightTiles;Probe skyProbe;detail::Com<ID3D11ShaderResourceView> skySource;std::uint32_t skySize=0;ProbeSettings skySettings{};std::uint64_t lightRevision=0;
    Probe* activeProbe=nullptr;bool probeIndirect=false;UINT probeFace=0;SceneFrame savedProbe;
    std::array<detail::Com<ID3D11Buffer>,3> probeConstants;
    std::unique_ptr<SceneRasterPreparation> rasterPreparation;
    detail::Com<ID3D11VertexShader> vertex;
    detail::Com<ID3D11PixelShader> pixel,shadowPixel;
    detail::Com<ID3D11InputLayout> layout;
    std::array<detail::Com<ID3D11Buffer>,3> constants;
    std::array<detail::Com<ID3D11RasterizerState>,3> rasters,shadowRasters;
    std::array<detail::Com<ID3D11SamplerState>,54> samplers;
    std::map<std::uint32_t,detail::Com<ID3D11SamplerState>> extendedSamplers;
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
    detail::Com<ID3D11Texture2D> transmissionImage,transmissionDepth;detail::Com<ID3D11ShaderResourceView> transmissionView,transmissionDepthView;
    std::uint32_t transmissionWidth=0,transmissionHeight=0,transmissionMips=0;bool transmissionReady=false;std::uint64_t transmissionCopies_=0,transmissionAllocations_=0;
    std::size_t slot=0;
    std::uint64_t meshUpdates_=0,meshUpdateBytes_=0;std::uint64_t draws_=0,uploads_=0,raySceneUpdates_=0,raySceneUpdateBytes_=0;
    struct Timing {detail::Com<ID3D11Query> begin,end,frequency;bool pending=false;std::uint64_t sequence=0;};
    std::array<Timing,3> timings;
    int activeTiming=-1;std::size_t timingSlot=0;std::uint64_t frameSequence=0,timingSequence=0;
    std::optional<double> gpuMilliseconds;
    void finishTiming(){if(activeTiming>=0){auto& t=timings[activeTiming];gpu.context->End(t.end.p);gpu.context->End(t.frequency.p);t.pending=true;activeTiming=-1;}}
    void startTiming(){
        finishTiming();for(auto& t:timings){if(!t.pending)continue;D3D11_QUERY_DATA_TIMESTAMP_DISJOINT frequency{};UINT64 begin=0,end=0;const auto status=gpu.context->GetData(t.frequency.p,&frequency,sizeof(frequency),D3D11_ASYNC_GETDATA_DONOTFLUSH);detail::check(status,"GPU timing frequency");if(status==S_FALSE)continue;const auto a=gpu.context->GetData(t.begin.p,&begin,sizeof(begin),D3D11_ASYNC_GETDATA_DONOTFLUSH),b=gpu.context->GetData(t.end.p,&end,sizeof(end),D3D11_ASYNC_GETDATA_DONOTFLUSH);detail::check(a,"GPU timing start");detail::check(b,"GPU timing end");if(a==S_FALSE||b==S_FALSE)continue;t.pending=false;if(!frequency.Disjoint&&frequency.Frequency&&end>=begin&&t.sequence>=timingSequence){gpuMilliseconds=double(end-begin)*1000/frequency.Frequency;timingSequence=t.sequence;}}
        auto& next=timings[timingSlot];const auto index=timingSlot;timingSlot=(timingSlot+1)%timings.size();++frameSequence;if(next.pending)return;next.sequence=frameSequence;gpu.context->Begin(next.frequency.p);gpu.context->End(next.begin.p);activeTiming=static_cast<int>(index);
    }
    SceneFrame frame,saved2D;Texture* active2D=nullptr;std::uint64_t passes2D_=0,draws2D_=0;
    std::array<detail::Com<ID3D11Buffer>,3> constants2D;
    std::array<detail::Com<ID3D11BlendState>,3> blends2D;std::array<detail::Com<ID3D11DepthStencilState>,4> stencils2D;
    Mesh background;
    struct Constants {
        Matrix viewProjection,world,normal,previousMVP;
        std::array<float,4> motionData,color,emissive,surface,eye,ambient;
        std::array<std::array<float,4>,6> uvX,uvY;
        std::array<float,4> flags,normalScale,fog,fogRange,heightFog,skyTop,skyHorizon,sunDirection,sunColor,shotShape,physical,volume,transmissionArea,absorption,sheenColor,lobes,film,specular,scatter,scatterColor,hairTangent;
        std::array<std::uint32_t,4> deformation;
        std::array<float,4> moonDirection,moonColor;
    };
    static Matrix multiplyMatrix(const Matrix& a,const Matrix& b){Matrix out{};for(int c=0;c<4;c++)for(int r=0;r<4;r++)for(int k=0;k<4;k++)out[c*4+r]+=a[k*4+r]*b[c*4+k];return out;}
    template<class T> static bool finite(const T& a){return std::all_of(a.begin(),a.end(),[](float v){return std::isfinite(v);});}
    void uploadInstances(Instances& target,const void* data,std::size_t count){
        if(target.owner!=gpu.device.p||count>target.capacity)throw std::runtime_error("Instance data or owner invalid");
        std::lock_guard<std::mutex> lock(gpu.mutex);if(count){const auto next=(target.slot+1)%target.buffers.size();D3D11_BOX box{0,0,0,static_cast<UINT>(count*target.stride),1,1};gpu.context->UpdateSubresource(target.buffers[next].p,0,&box,data,0,0);target.slot=next;}target.count=static_cast<UINT>(count);
    }
    static constexpr const char* shader=R"HLSL(
cbuffer Settings:register(b0){float4x4 vp,world,normalMatrix,previousMVP;float4 motionData,tint,emissive,surface,eye,ambient,uvX[6],uvY[6],flags,normalScale,fog,fogRange,heightFog,skyTop,skyHorizon,sunDirection,sunColor,shotShape,physical,volume,transmissionArea,absorption,sheenColor,lobes,film,specular,scatter,scatterColor,hairTangent;uint4 deformation;float4 moonDirection,moonColor;};
struct Light{float4 position,direction,color,cone;};StructuredBuffer<Light> lights:register(t6);
Texture2D baseMap:register(t0),normalMap:register(t1),roughMap:register(t2),metalMap:register(t3),emissiveMap:register(t4),aoMap:register(t5);
SamplerState baseSampler:register(s0),normalSampler:register(s1),roughSampler:register(s2),metalSampler:register(s3),emissiveSampler:register(s4),aoSampler:register(s5);
Texture2DArray<float> shadowMap:register(t24);
struct Shadow{float4x4 vp;float4 parameters,size;};StructuredBuffer<Shadow> shadows:register(t25);
struct Instance{float4x4 world,normal;float4 color;};StructuredBuffer<Instance> instances:register(t26);
StructuredBuffer<float4> shots:register(t27);
struct Skin{uint4 joints;float4 weights;};StructuredBuffer<Skin> skinVertices:register(t28);
struct Morph{float4 position,normal,color;};StructuredBuffer<Morph> morphVertices:register(t29);
StructuredBuffer<float4> pose:register(t30),previousPose:register(t31);StructuredBuffer<float4x4> previousInstances:register(t32);
Texture2D<float4> bakedLightmap:register(t49);
Texture2D<float4> transmissionScene:register(t44);Texture2D<float> transmissionSceneDepth:register(t45);
#define transmissionMipCount deformation.w
struct Input{float3 position:POSITION;float3 normal:NORMAL;float2 uv:TEXCOORD;float4 color:COLOR;float2 uv1:TEXCOORD1;};
struct Output{float4 position:SV_POSITION;float3 at:TEXCOORD0;float3 normal:TEXCOORD1;float2 uv:TEXCOORD2;float4 color:COLOR;float4 instanceColor:TEXCOORD3;float4 previousClip:TEXCOORD4;float2 uv1:TEXCOORD5;};
Output VS(Input i,uint id:SV_InstanceID,uint vertexId:SV_VertexID){Output o;float4 position=float4(i.position,1);float3 normal=i.normal;float4 color=i.color;o.instanceColor=1;o.previousClip=0;float4 previousPosition=position;
 if((uint)flags.x&1024){
  for(uint t=0;t<deformation.y;t++){Morph m=morphVertices[t*deformation.x+vertexId];if(motionData.x!=0)previousPosition.xyz+=m.position.xyz*previousPose[deformation.z*4+t/4][t%4];float weight=pose[deformation.z*4+t/4][t%4];if(weight!=0){position.xyz+=m.position.xyz*weight;normal+=m.normal.xyz*weight;color+=m.color*weight;}}
  if(deformation.z){Skin s=skinVertices[vertexId];float4x4 skin=0;[unroll]for(uint j=0;j<4;j++){uint b=s.joints[j]*4;skin+=transpose(float4x4(pose[b],pose[b+1],pose[b+2],pose[b+3]))*s.weights[j];}position=float4(mul(skin,position).xyz+pose[deformation.z*4+(deformation.y+3)/4].xyz*(1-dot(s.weights,float4(1,1,1,1))),1);normal=mul((float3x3)skin,normal);if(motionData.x!=0){float4x4 oldSkin=0;[unroll]for(uint j=0;j<4;j++){uint b=s.joints[j]*4;oldSkin+=transpose(float4x4(previousPose[b],previousPose[b+1],previousPose[b+2],previousPose[b+3]))*s.weights[j];}previousPosition=float4(mul(oldSkin,previousPosition).xyz+previousPose[deformation.z*4+(deformation.y+3)/4].xyz*(1-dot(s.weights,float4(1,1,1,1))),1);}}
 }
 if((uint)flags.x&256){Instance item=instances[id];if(motionData.x!=0)previousPosition=mul(motionData.w>.5?previousInstances[id]:item.world,previousPosition);position=mul(item.world,position);normal=mul((float3x3)item.normal,normal);o.instanceColor=item.color;}else if((uint)flags.x&512){float2 offset=i.position.xy*shotShape.xy;position=float4(shots[id].xyz+(shotShape.z>0?float3(offset.x,0,offset.y):float3(offset,0)),1);if(shotShape.z>0)normal=float3(0,-1,0);}if(motionData.x!=0)o.previousClip=mul(previousMVP,previousPosition);float4 at=mul(world,position);if(pass2d.x>=4&&pass2d.x<=5){float2 ray=at.xy-project2d.xy;ray*=rsqrt(max(dot(ray,ray),1e-12));if(length(ray)<.00001)ray=float2(0,1);float a=i.color.y*project2d.w*.261799388,c=cos(a),s=sin(a);ray=float2(c*ray.x+s*ray.y,-s*ray.x+c*ray.y);at=float4(at.xy+ray*i.color.x*project2d.z,0,1);color=float4(0,0,i.color.z,i.color.x);}else if(pass2d.x>=2)at.z=0;o.position=mul(vp,at);if(flags.w>1.5&&((uint)flags.x&2048))o.position.z=o.position.w*.999999;o.at=at.xyz;o.normal=mul((float3x3)normalMatrix,normal);o.uv=i.uv;o.uv1=((uint)flags.x&16384)?i.uv1:float2(0,0);o.color=pass2d.x>=4&&pass2d.x<=5?color:flags.w==1?color:float4(1,1,1,1);return o;}
float2 mapUv(float2 uv,uint slot){return float2(dot(uvX[slot].xyz,float3(uv,1)),dot(uvY[slot].xyz,float3(uv,1)));}
float3 sampleBakedLightmap(float2 uv){uint w,h;bakedLightmap.GetDimensions(w,h);float2 at=saturate(uv)*float2(w,h)-.5;int2 a=(int2)floor(at),last=int2(w,h)-1;float2 f=frac(at);return lerp(lerp(bakedLightmap.Load(int3(clamp(a,0,last),0)).rgb,bakedLightmap.Load(int3(clamp(a+int2(1,0),0,last),0)).rgb,f.x),lerp(bakedLightmap.Load(int3(clamp(a+int2(0,1),0,last),0)).rgb,bakedLightmap.Load(int3(clamp(a+1,0,last),0)).rgb,f.x),f.y);}
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
float coatBRDF(float3 n,float3 v,float3 l,float rough){float nl=saturate(dot(n,l)),nv=saturate(dot(n,v));float3 h=safeNormal(l+v);float nh=saturate(dot(n,h)),vh=saturate(dot(v,h)),a2=pow(rough,4),den=nh*nh*(a2-1)+1,d=a2/max(3.14159265*den*den,1e-12),vis=.5/max(nl*sqrt(a2+(1-a2)*nv*nv)+nv*sqrt(a2+(1-a2)*nl*nl),1e-5),f=.04+.96*pow(1-vh,5);return nl*d*vis*f;}
float3 refractedProbes(float3 at,float3 direction,float rough,out float coverage);
float3 refractedBackground(float3 at,float3 n,float3 v,float thickness,float ior,float rough,float2 original,float3 attenuationColor,float attenuationDistance){
 float3 scale=float3(length(float3(world[0][0],world[1][0],world[2][0])),length(float3(world[0][1],world[1][1],world[2][1])),length(float3(world[0][2],world[1][2],world[2][2])));float3 ray=safeNormal(refract(-v,n,1/ior))*thickness*scale;float4 exit=mul(vp,float4(at+ray,1));float2 projected=exit.xy/max(exit.w,1e-6)*float2(.5,-.5)+.5;float edge=saturate(min(min(projected.x,projected.y),min(1-projected.x,1-projected.y))/.02)*step(1e-6,exit.w);float2 uv=(transmissionArea.xy+saturate(projected)*transmissionArea.zw)/volume.zw;float lod=rough*saturate(ior*2-2)*(float)transmissionMipCount;float4 entry=mul(vp,float4(at,1));float backgroundDepth=transmissionSceneDepth.Load(int3(clamp(int2(uv*volume.zw),0,int2(volume.zw)-1),0));edge*=step(entry.z/max(entry.w,1e-6)-.0001,backgroundDepth);float3 fallback=transmissionScene.SampleLevel(linear2d,(transmissionArea.xy+original*transmissionArea.zw)/volume.zw,lod).rgb;float coverage=0;float3 probe=refractedProbes(at,safeNormal(refract(-v,n,1/ior)),rough,coverage);fallback=lerp(fallback,probe,coverage);float3 light=lerp(fallback,transmissionScene.SampleLevel(linear2d,uv,lod).rgb,edge);return attenuationDistance>0?light*exp(log(max(attenuationColor,1e-6))*length(ray)/attenuationDistance):light;
}
float4 PS(Output i,bool front:SV_IsFrontFace):SV_TARGET{
 if(flags.w>1.5){float3 d=safeNormal(i.at-eye.xyz);float3 sky=lerp(skyHorizon.rgb,skyTop.rgb,smoothstep(-.12,.85,d.y));sky+=sunColor.rgb*pow(max(dot(d,safeNormal(sunDirection.xyz)),0),sunDirection.w)*.55;sky+=moonColor.rgb*pow(max(dot(d,safeNormal(moonDirection.xyz)),0),sunDirection.w)*.55;return float4(((uint)flags.x&(128|2048))?sky:srgb(max(sky,0)),1);}
 clipMask2d(i.position.xy);uint maps=(uint)flags.x;float4 base=tint*(pass2d.x>0?1:i.color);if(maps&1)base*=baseMap.Sample(baseSampler,mapUv(i.uv,0));
 if(pass2d.x>0)return offscreen2d(base,i.color);
 float3 n=safeNormal(i.normal);if(!front)n=-n;float3 cn=n;
 if(maps&2){float2 uv=mapUv(i.uv,1);float3 q1=ddx(i.at),q2=ddy(i.at);float2 st1=ddx(uv),st2=ddy(uv);float3 a=cross(q2,n),b=cross(n,q1),t=a*st1.x+b*st2.x,bt=a*st1.y+b*st2.y;float scale=rsqrt(max(max(dot(t,t),dot(bt,bt)),1e-12));float3 nm=normalMap.Sample(normalSampler,uv).xyz*2-1;nm.xy*=normalScale.xy;n=safeNormal(t*scale*nm.x+bt*scale*nm.y+n*nm.z);}
 float rough=clamp(surface.x*((maps&4)?roughMap.Sample(roughSampler,mapUv(i.uv,2)).g:1),.04,1),metal=saturate(surface.y*((maps&8)?metalMap.Sample(metalSampler,mapUv(i.uv,3)).b:1));
 float3 emit=emissive.rgb*emissive.a*((maps&16)?emissiveMap.Sample(emissiveSampler,mapUv(i.uv,4)).rgb:1);
 float ao=(maps&32)?aoMap.Sample(aoSampler,mapUv(i.uv,5)).r:1;
 float coat=saturate(physical.x),coatRough=clamp(physical.y,.04,1),ior=clamp(physical.z,1,2.5),transmission=saturate(volume.x),thickness=max(volume.y,0),attenuationDistance=max(absorption.w,0),dispersion=clamp(physical.w,0,10);float3 attenuationColor=saturate(absorption.rgb);float sheen=saturate(lobes.x),sheenRough=clamp(sheenColor.w,.07,1),anisotropy=saturate(lobes.y),anisotropyRotation=lobes.z,filmWeight=saturate(lobes.w),filmIOR=film.x,filmThickness=film.y,specularIntensity=film.z;float3 sheenTint=saturate(sheenColor.rgb),specularTint=saturate(specular.rgb);
 float skin=saturate(scatter.x),foliage=saturate(scatter.y),hair=saturate(scatter.z),scatterThickness=max(scatter.w,0),hairShift=clamp(hairTangent.w,-1,1);float3 scatterTint=saturate(scatterColor.rgb),hairAxis=hairTangent.xyz;
 // HB_MATERIAL_EVAL
 if(!(maps&4096))transmission=0;
 base*=i.instanceColor;
 clip(base.a-surface.z);float3 outColor=base.rgb,ambientColor=0;
 if(surface.w<.5&&pass2d.z<.5){ambientColor=base.rgb*ambient.rgb*ao*(1-transmission);if(maps&32768)ambientColor+=base.rgb*max(sampleBakedLightmap(i.uv1),0)*shotShape.w*(1-metal)*(1-transmission)*ao/3.14159265;outColor=ambientColor+emit;float3 v=safeNormal(eye.xyz-i.at);float dielectricF0=pow((ior-1)/(ior+1),2);float3 dielectric=dielectricF0*specularTint*specularIntensity,f0=lerp(dielectric,base.rgb,metal),coatLight=0;float nv=max(dot(n,v),1e-4);float3 tangent,bitangent;tangent=float3(1,0,0);bitangent=float3(0,1,0);if(anisotropy>0)anisotropicFrame(i.at,i.uv,n,anisotropyRotation,tangent,bitangent);float3 filmF=filmWeight>0?thinFilmFresnel(nv,f0,filmIOR,filmThickness):f0;
  for(uint j=lightNext(0,i.position.xy);j<(uint)flags.y;j=lightNext(j+1,i.position.xy)){Light light=lights[j];if(light.position.w>2.5){float3 hemi=base.rgb*lerp(light.cone.rgb,light.color.rgb,dot(n,safeNormal(light.direction.xyz))*.5+.5)*light.color.a*ao*(1-transmission);ambientColor+=hemi;outColor+=hemi;continue;}float3 delta=light.position.xyz-i.at;float dist=length(delta);float3 l=light.position.w<.5?safeNormal(light.direction.xyz):safeNormal(delta);float attenuation=1;
   if(light.position.w>.5){attenuation=1/max(pow(dist,light.cone.z),.01);if(light.direction.w>0)attenuation*=pow(saturate(1-pow(dist/light.direction.w,4)),2);if(light.position.w>1.5){float angle=dot(-l,safeNormal(light.direction.xyz));attenuation*=light.cone.y>light.cone.x?smoothstep(light.cone.x,light.cone.y,angle):step(light.cone.x,angle);}}
   if(maps&64)attenuation*=shadowFactor(light,i.at,n);float nl=saturate(dot(n,l));float3 h=safeNormal(l+v);float nh=saturate(dot(n,h)),vh=saturate(dot(v,h));float a=rough*rough,a2=a*a,d=a2/max(3.14159265*pow(nh*nh*(a2-1)+1,2),1e-5),k=pow(rough+1,2)/8,g=(nv/(nv*(1-k)+k))*(nl/(nl*(1-k)+k));float3 f=f0+(1-f0)*pow(1-vh,5);if(filmWeight>0)f=lerp(f,thinFilmFresnel(vh,f0,filmIOR,filmThickness),filmWeight);float3 spec=(anisotropy>0?anisotropicSpecular(n,v,l,h,tangent,bitangent,rough,anisotropy):d*g/max(4*nv*nl,1e-4))*f;float energy=1-sheen*max(sheenTint.x,max(sheenTint.y,sheenTint.z))*.157;outColor+=(((1-f)*(1-metal)*base.rgb*(1-transmission)*(1-skin)/3.14159265+spec)*energy+(sheen>0?sheen*sheenTint*sheenBRDF(nh,nv,nl,sheenRough):float3(0,0,0)))*light.color.rgb*light.color.a*nl*attenuation;
   if(skin>0||foliage>0)outColor+=light.color.rgb*light.color.a*attenuation*base.rgb*(1-metal)*hbScatterDiffuse(dot(n,l),v,l,scatterTint,skin,foliage,scatterThickness);if(hair>0)outColor+=light.color.rgb*light.color.a*attenuation*hair*hbHairSpecular(n,v,l,hairAxis,base.rgb,rough,hairShift);
   if(coat>0)coatLight+=coatBRDF(cn,v,l,coatRough)*light.color.rgb*light.color.a*attenuation;
  }
  float3 probeLight=indirectProbes(i.at,n,v,base.rgb,rough,metal,ao,dielectric,1-transmission);if(sheen>0)probeLight+=indirectProbes(i.at,n,v,sheenTint,sheenRough,1,ao)*sheen*.157;if(filmWeight>0)probeLight+=indirectProbes(i.at,n,v,float3(1,1,1),rough,1,ao)*(filmF-f0)*filmWeight;ambientColor+=probeLight;outColor+=probeLight;
  // Back-to-front HDR layers include earlier glass; depth rejects foreground and probes fill offscreen rays.
  if(transmission>0){float2 original=(i.position.xy-transmissionArea.xy)/transmissionArea.zw;float3 background;if(dispersion>0){float spread=(ior-1)*.025*dispersion;float3 indices=float3(max(1,ior-spread),ior,ior+spread);[unroll]for(uint channel=0;channel<3;channel++)background[channel]=refractedBackground(i.at,n,v,thickness,indices[channel],rough,original,attenuationColor,attenuationDistance)[channel];}else background=refractedBackground(i.at,n,v,thickness,ior,rough,original,attenuationColor,attenuationDistance);float3 fresnel=lerp(f0+(1-f0)*pow(1-saturate(dot(n,v)),5),filmF,filmWeight);outColor+=transmission*(1-metal)*(1-fresnel)*base.rgb*background;}
  if(coat>0){float3 coatIndirect=indirectProbes(i.at,cn,v,float3(.04,.04,.04),coatRough,1,1);coatLight+=coatIndirect;float fc=.04+.96*pow(1-saturate(dot(cn,v)),5);ambientColor=ambientColor*(1-coat*fc)+coat*coatIndirect;outColor=outColor*(1-coat*fc)+coat*coatLight;}
 }else outColor+=emit;
 if(pass2d.z>.5)outColor=shade2d(i.at.xy,i.uv,n,base.rgb)+emit;
 if(fogRange.y>0){float distance=length(eye.xyz-i.at),amount=fog.w>0?1-exp(-fog.w*fog.w*distance*distance):smoothstep(fogRange.x,fogRange.y,distance);if(heightFog.x>0){amount=0;if(distance>fogRange.x&&distance<fogRange.y&&fog.w>0){float start=eye.y+(i.at.y-eye.y)*fogRange.x/max(distance,.0001),span=heightFog.y*(i.at.y-start),integral=abs(span)<.001?1:(1-exp(-clamp(span,-40,40)))/span;float optical=fog.w*exp(clamp(-heightFog.y*(start-heightFog.z),-40,40))*(distance-fogRange.x)*integral;amount=min(heightFog.w,1-exp(-max(optical,0)));}}ambientColor*=1-saturate(amount);outColor=lerp(outColor,fog.rgb,saturate(amount));}
 if(maps&(128|2048))return float4(clamp(outColor,0,65472),base.a);if(flags.z>0)outColor=aces(outColor*normalScale.z);return float4(srgb(max(outColor,0)),base.a);
}
void ShadowPS(Output i,bool front:SV_IsFrontFace){PS(i,front);}
)HLSL";
    static std::string surfaceShader(std::string source){
        source.insert(source.find("struct Input{"),"static float4 hbSurfaceNormalResult=float4(.5,.5,.5,1),hbSurfaceAlbedoResult=0,hbAmbientResult=0;static float hbMotionOpaque=0;\n");
        const auto entry=source.find("float4 PS(");source.replace(entry,10,"float4 Shade(");
        const auto shadow=source.find("PS(i,front);");source.replace(shadow,12,"Shade(i,front);");
        const auto marker=source.find("clip(base.a-surface.z);");source.insert(marker+std::strlen("clip(base.a-surface.z);"),"hbMotionOpaque=base.a>=.999&&transmission<=0?1:0;if(surface.w<.5&&base.a>=.999&&transmission<=0&&pass2d.z<.5){hbSurfaceNormalResult=float4(n*.5+.5,rough);hbSurfaceAlbedoResult=float4(base.rgb,metal);}\n");
        source.insert(source.find("if(maps&(128|2048))return"),"hbAmbientResult=float4(ambientColor,1);\n");
        source+="\nstruct SurfaceOutput{float4 color:SV_TARGET0;float4 normal:SV_TARGET1;float4 albedo:SV_TARGET2;float4 motion:SV_TARGET3;float4 ambient:SV_TARGET4;};SurfaceOutput PS(Output i,bool front:SV_IsFrontFace){SurfaceOutput o;o.color=Shade(i,front);o.normal=hbSurfaceNormalResult;o.albedo=hbSurfaceAlbedoResult;o.ambient=hbAmbientResult;o.motion=0;if(motionData.x!=0&&hbMotionOpaque>.5&&(motionData.x>1.5||i.previousClip.w>0)&&pass2d.z<.5){float3 old=i.previousClip.xyz/i.previousClip.w;old.xy=old.xy*float2(.5,-.5)+.5;float2 uv=(i.position.xy-transmissionArea.xy)/transmissionArea.zw;if(motionData.x>1.5)old=float3(uv-motionData.yz, i.position.z);o.motion=float4(old,motionData.x>1.5?2+i.position.z:sign(motionData.x)*max(.000001,i.position.z));}return o;}\n";
        return source;
    }
    static std::string shaderSource(){std::string source=shader;source.insert(source.find("struct Input{"),std::string(scene2DDeclarations)+sceneProbeDeclarations+sceneLightTileDeclarations);source.insert(source.find("float4 PS("),std::string(scene2DFunctions)+sceneProbeFunctions+sceneShadingFunctions+sceneLightTileFunctions);return source;}
    HRESULT adoptRasterShader(std::size_t stage,const void* bytes,std::size_t size){
        std::lock_guard<std::mutex> lock(gpu.mutex);
        if(stage==0){detail::Com<ID3D11VertexShader> next;detail::Com<ID3D11InputLayout> nextLayout;auto result=gpu.device->CreateVertexShader(bytes,size,nullptr,&next.p);if(FAILED(result))return result;
            const D3D11_INPUT_ELEMENT_DESC elements[]={{"POSITION",0,DXGI_FORMAT_R32G32B32_FLOAT,0,0,D3D11_INPUT_PER_VERTEX_DATA,0},{"NORMAL",0,DXGI_FORMAT_R32G32B32_FLOAT,0,12,D3D11_INPUT_PER_VERTEX_DATA,0},{"TEXCOORD",0,DXGI_FORMAT_R32G32_FLOAT,0,24,D3D11_INPUT_PER_VERTEX_DATA,0},{"COLOR",0,DXGI_FORMAT_R32G32B32A32_FLOAT,0,32,D3D11_INPUT_PER_VERTEX_DATA,0},{"TEXCOORD",1,DXGI_FORMAT_R32G32_FLOAT,1,0,D3D11_INPUT_PER_VERTEX_DATA,0}};result=gpu.device->CreateInputLayout(elements,5,bytes,size,&nextLayout.p);if(FAILED(result))return result;vertex=std::move(next);layout=std::move(nextLayout);return S_OK;}
        detail::Com<ID3D11PixelShader> next;const auto result=gpu.device->CreatePixelShader(bytes,size,nullptr,&next.p);if(SUCCEEDED(result)){if(stage==1)pixel=std::move(next);else shadowPixel=std::move(next);}return result;
    }
public:
    SceneRenderer(Device& device,std::uint32_t width,std::uint32_t height,void* hwnd=nullptr,bool asyncRaster=false):gpu(device),surface(device,width,height,hwnd),bloom(device),probes(device),lightTiles(device){
        const auto source=surfaceShader(shaderSource());
        if(asyncRaster){rasterPreparation=std::make_unique<SceneRasterPreparation>(source);rasterPreparation->poll();}
        else{std::size_t stage=0;for(const auto* entry:{"VS","PS","ShadowPS"}){detail::ShaderBytecodeCompiler::create(source,"HBSceneRender",entry,stage?"ps_5_0":"vs_5_0",[&](const void* bytes,std::size_t size){return adoptRasterShader(stage,bytes,size);});++stage;}}
        std::lock_guard<std::mutex> lock(gpu.mutex);
        D3D11_BUFFER_DESC cb{};cb.ByteWidth=sizeof(Constants);cb.Usage=D3D11_USAGE_DYNAMIC;cb.BindFlags=D3D11_BIND_CONSTANT_BUFFER;cb.CPUAccessFlags=D3D11_CPU_ACCESS_WRITE;for(auto& buffer:constants)detail::check(gpu.device->CreateBuffer(&cb,nullptr,&buffer.p),"Scene frame constants");
        cb.ByteWidth=sizeof(Scene2D);for(auto& buffer:constants2D)detail::check(gpu.device->CreateBuffer(&cb,nullptr,&buffer.p),"2D frame constants");
        cb.ByteWidth=sizeof(ProbeSettings)*3;for(auto& buffer:probeConstants)detail::check(gpu.device->CreateBuffer(&cb,nullptr,&buffer.p),"Probe frame constants");
        for(std::size_t i=0;i<blends2D.size();i++){D3D11_BLEND_DESC b{};auto& t=b.RenderTarget[0];t.BlendEnable=TRUE;t.SrcBlend=t.DestBlend=t.SrcBlendAlpha=t.DestBlendAlpha=D3D11_BLEND_ONE;t.BlendOp=t.BlendOpAlpha=i==1?D3D11_BLEND_OP_ADD:D3D11_BLEND_OP_MAX;t.RenderTargetWriteMask=i==2?0:D3D11_COLOR_WRITE_ENABLE_ALL;detail::check(gpu.device->CreateBlendState(&b,&blends2D[i].p),"2D blend state");}
        for(std::size_t i=0;i<stencils2D.size();i++){D3D11_DEPTH_STENCIL_DESC d{};d.DepthFunc=D3D11_COMPARISON_ALWAYS;d.StencilEnable=i!=0;d.StencilReadMask=d.StencilWriteMask=255;d.FrontFace.StencilFunc=i==2?D3D11_COMPARISON_NOT_EQUAL:i==3?D3D11_COMPARISON_EQUAL:D3D11_COMPARISON_ALWAYS;d.FrontFace.StencilFailOp=d.FrontFace.StencilDepthFailOp=D3D11_STENCIL_OP_KEEP;d.FrontFace.StencilPassOp=D3D11_STENCIL_OP_REPLACE;d.BackFace=d.FrontFace;detail::check(gpu.device->CreateDepthStencilState(&d,&stencils2D[i].p),"2D stencil state");}
        for(auto& timing:timings){D3D11_QUERY_DESC desc{D3D11_QUERY_TIMESTAMP,0};detail::check(gpu.device->CreateQuery(&desc,&timing.begin.p),"GPU start timestamp");detail::check(gpu.device->CreateQuery(&desc,&timing.end.p),"GPU end timestamp");desc.Query=D3D11_QUERY_TIMESTAMP_DISJOINT;detail::check(gpu.device->CreateQuery(&desc,&timing.frequency.p),"GPU timestamp frequency");}
        for(std::size_t i=0;i<rasters.size();i++){D3D11_RASTERIZER_DESC rs{};rs.FillMode=D3D11_FILL_SOLID;rs.CullMode=i==0?D3D11_CULL_BACK:i==1?D3D11_CULL_FRONT:D3D11_CULL_NONE;rs.FrontCounterClockwise=TRUE;rs.DepthClipEnable=TRUE;rs.ScissorEnable=TRUE;detail::check(gpu.device->CreateRasterizerState(&rs,&rasters[i].p),"Scene raster state");rs.SlopeScaledDepthBias=1;rs.DepthBiasClamp=.01f;detail::check(gpu.device->CreateRasterizerState(&rs,&shadowRasters[i].p),"Shadow slope bias state");}
        for(std::size_t i=0;i<samplers.size();i++){D3D11_SAMPLER_DESC s{};s.Filter=i%2?D3D11_FILTER_MIN_MAG_MIP_POINT:D3D11_FILTER_MIN_MAG_MIP_LINEAR;s.AddressU=static_cast<D3D11_TEXTURE_ADDRESS_MODE>(1+(i/2)%3);s.AddressV=static_cast<D3D11_TEXTURE_ADDRESS_MODE>(1+(i/6)%3);s.AddressW=static_cast<D3D11_TEXTURE_ADDRESS_MODE>(1+i/18);s.MaxLOD=D3D11_FLOAT32_MAX;detail::check(gpu.device->CreateSamplerState(&s,&samplers[i].p),"Scene sampler state");}
    }
    ID3D11SamplerState* samplerState(std::uint32_t key){
        if(key<samplers.size())return samplers[key].p;
        if(!(key&65536u)||(key&~81919u)||(key&127u)>=54u)throw std::runtime_error("Scene sampler ID invalid");
        auto found=extendedSamplers.find(key);if(found!=extendedSamplers.end()&&found->second.p)return found->second.p;
        const auto base=key&127u;const bool pointMin=(key&128u)!=0,pointMag=(base%2)!=0,linearMip=(key&512u)!=0;const UINT anisotropy=1u+((key>>10u)&15u);
        D3D11_SAMPLER_DESC s{};s.Filter=anisotropy>1?D3D11_FILTER_ANISOTROPIC:static_cast<D3D11_FILTER>(D3D11_ENCODE_BASIC_FILTER(pointMin?D3D11_FILTER_TYPE_POINT:D3D11_FILTER_TYPE_LINEAR,pointMag?D3D11_FILTER_TYPE_POINT:D3D11_FILTER_TYPE_LINEAR,linearMip?D3D11_FILTER_TYPE_LINEAR:D3D11_FILTER_TYPE_POINT,D3D11_FILTER_REDUCTION_TYPE_STANDARD));
        s.AddressU=static_cast<D3D11_TEXTURE_ADDRESS_MODE>(1+(base/2)%3);s.AddressV=static_cast<D3D11_TEXTURE_ADDRESS_MODE>(1+(base/6)%3);s.AddressW=static_cast<D3D11_TEXTURE_ADDRESS_MODE>(1+base/18);s.MaxAnisotropy=anisotropy;s.MaxLOD=(key&256u)?0:D3D11_FLOAT32_MAX;
        auto& state=extendedSamplers[key];detail::check(gpu.device->CreateSamplerState(&s,&state.p),"Extended scene sampler");return state.p;
    }
    Mesh createMesh(const std::vector<SceneVertex>& vertices,const std::vector<std::uint32_t>& indices,const std::vector<std::array<float,2>>& uv1={},bool dynamic=false){
        if(!uv1.empty()&&(uv1.size()!=vertices.size()||uv1.size()>UINT_MAX/8||std::any_of(uv1.begin(),uv1.end(),[](const auto& v){return !finite(v);})))throw std::runtime_error("Scene secondary UV invalid");
        if(vertices.empty()||indices.empty()||indices.size()%3||vertices.size()>UINT_MAX/sizeof(SceneVertex)||indices.size()>UINT_MAX/4)throw std::runtime_error("Scene mesh byte size invalid");
        for(const auto& v:vertices)if(!finite(v.position)||!finite(v.normal)||!finite(v.uv)||!finite(v.color))throw std::runtime_error("Scene vertex invalid");
        for(auto i:indices)if(i>=vertices.size())throw std::runtime_error("Scene index out of bounds");
        std::lock_guard<std::mutex> lock(gpu.mutex);Mesh result;result.owner=gpu.device.p;result.count=static_cast<std::uint32_t>(indices.size());result.vertexCount=static_cast<std::uint32_t>(vertices.size());D3D11_BUFFER_DESC desc{};desc.Usage=dynamic?D3D11_USAGE_DYNAMIC:D3D11_USAGE_IMMUTABLE;desc.CPUAccessFlags=dynamic?D3D11_CPU_ACCESS_WRITE:0;desc.ByteWidth=static_cast<UINT>(vertices.size()*sizeof(SceneVertex));desc.BindFlags=D3D11_BIND_VERTEX_BUFFER;D3D11_SUBRESOURCE_DATA data{vertices.data(),0,0};if(dynamic){result.streamVertices=vertices;for(auto& buffer:result.streamBuffers)detail::check(gpu.device->CreateBuffer(&desc,&data,&buffer.p),"Scene stream vertices");}else detail::check(gpu.device->CreateBuffer(&desc,&data,&result.vertices.p),"Scene vertices");desc.Usage=D3D11_USAGE_IMMUTABLE;desc.CPUAccessFlags=0;desc.ByteWidth=static_cast<UINT>(indices.size()*4);desc.BindFlags=D3D11_BIND_INDEX_BUFFER;data.pSysMem=indices.data();detail::check(gpu.device->CreateBuffer(&desc,&data,&result.indices.p),"Scene indices");if(!uv1.empty()){desc.ByteWidth=static_cast<UINT>(uv1.size()*8);desc.BindFlags=D3D11_BIND_VERTEX_BUFFER;data.pSysMem=uv1.data();detail::check(gpu.device->CreateBuffer(&desc,&data,&result.uv1.p),"Scene secondary UV");}++uploads_;return result;
    }
    void updateMeshVertices(Mesh& mesh,const std::vector<std::array<float,6>>& values){
        if(mesh.owner!=gpu.device.p||mesh.streamVertices.empty()||values.size()!=mesh.streamVertices.size()||std::any_of(values.begin(),values.end(),[](const auto& v){return !finite(v);}))throw std::runtime_error("Dynamic mesh vertex count/data invalid");
        std::lock_guard<std::mutex> lock(gpu.mutex);const auto slot=(mesh.streamSlot+1)%mesh.streamBuffers.size();D3D11_MAPPED_SUBRESOURCE mapped{};detail::check(gpu.context->Map(mesh.streamBuffers[slot].p,0,D3D11_MAP_WRITE_DISCARD,0,&mapped),"Scene stream vertices update");
        for(std::size_t i=0;i<values.size();i++){std::copy_n(values[i].begin(),3,mesh.streamVertices[i].position.begin());std::copy_n(values[i].begin()+3,3,mesh.streamVertices[i].normal.begin());}std::memcpy(mapped.pData,mesh.streamVertices.data(),mesh.streamVertices.size()*sizeof(SceneVertex));gpu.context->Unmap(mesh.streamBuffers[slot].p,0);mesh.streamSlot=slot;++meshUpdates_;meshUpdateBytes_+=mesh.streamVertices.size()*sizeof(SceneVertex);
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
    bool setPose(Deformation& target,const std::vector<Matrix>& bones,const std::vector<float>& weights,const std::array<float,3>& bindTranslation={},bool previous=false){
        if(target.owner!=gpu.device.p||bones.size()!=target.boneCount||weights.size()!=target.morphCount||!finite(weights)||!finite(bindTranslation))throw std::runtime_error("Deformation pose dimensions invalid");
        std::vector<float> values;values.reserve(target.poseBytes/4);for(const auto& matrix:bones){if(!finite(matrix))throw std::runtime_error("Bone matrix must be finite");values.insert(values.end(),matrix.begin(),matrix.end());}values.insert(values.end(),weights.begin(),weights.end());values.resize(target.poseBytes/4,0);
        // A folded bind inverse scales its translation by the weight sum; restore one affine translation.
        if(target.boneCount)std::copy(bindTranslation.begin(),bindTranslation.end(),values.end()-4);
        if(previous){if(values==target.previous)return false;std::lock_guard<std::mutex> lock(gpu.mutex);if(!target.previousPoses[0].p){D3D11_BUFFER_DESC d{};target.poses[0]->GetDesc(&d);for(std::size_t i=0;i<3;i++){detail::check(gpu.device->CreateBuffer(&d,nullptr,&target.previousPoses[i].p),"Previous pose buffer");detail::check(gpu.device->CreateShaderResourceView(target.previousPoses[i].p,nullptr,&target.previousPoseViews[i].p),"Previous pose view");}}target.previousSlot=(target.previousSlot+1)%3;gpu.context->UpdateSubresource(target.previousPoses[target.previousSlot].p,0,nullptr,values.data(),0,0);target.previous=std::move(values);return true;}
        if(values==target.current)return false;
        std::lock_guard<std::mutex> lock(gpu.mutex);const auto next=(target.slot+1)%target.poses.size();gpu.context->UpdateSubresource(target.poses[next].p,0,nullptr,values.data(),0,0);target.slot=next;target.current=std::move(values);return true;
    }
    void releaseMotion(Deformation& target){target.previousPoses={};target.previousPoseViews={};target.previous.clear();}
    void releaseMotion(Instances& target){target.previousMatrices={};target.previousViews={};target.previous.clear();}
    void setPreviousInstances(Instances& target,const std::vector<Matrix>& values){if(target.owner!=gpu.device.p||target.positionsOnly()||values.size()!=target.count)throw std::runtime_error("Previous instance dimensions invalid");for(const auto& m:values)if(!finite(m))throw std::runtime_error("Previous instance matrix invalid");if(values==target.previous)return;std::lock_guard<std::mutex> lock(gpu.mutex);if(!target.previousMatrices[0].p){D3D11_BUFFER_DESC d{};d.ByteWidth=target.capacity*64;d.Usage=D3D11_USAGE_DEFAULT;d.BindFlags=D3D11_BIND_SHADER_RESOURCE;d.MiscFlags=D3D11_RESOURCE_MISC_BUFFER_STRUCTURED;d.StructureByteStride=64;for(std::size_t i=0;i<3;i++){detail::check(gpu.device->CreateBuffer(&d,nullptr,&target.previousMatrices[i].p),"Previous instances");detail::check(gpu.device->CreateShaderResourceView(target.previousMatrices[i].p,nullptr,&target.previousViews[i].p),"Previous instance view");}}target.previousSlot=(target.previousSlot+1)%3;if(!values.empty()){D3D11_BOX box{0,0,0,UINT(values.size()*64),1,1};gpu.context->UpdateSubresource(target.previousMatrices[target.previousSlot].p,0,&box,values.data(),0,0);}target.previous=values;}
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
        return createDataTexture(width,height,rgba,4,false,1,srgb,false,"2d",mipmaps);
    }

    Texture createDataTexture(std::uint32_t width,std::uint32_t height,const std::vector<std::uint8_t>& bytes,std::uint32_t channels=4,bool floating=false,std::uint32_t layers=1,bool srgb=false,bool array=false,const std::string& dimension="2d",bool mipmaps=false,bool half=false,const std::vector<TextureMipLevel>& mipLevels={}){
        if(half&&!floating){throw std::runtime_error("Half texture must be floating");}const std::uint32_t componentBytes=half?2u:floating?4u:1u;const bool cube=dimension=="cube",volume=dimension=="volume";const UINT limit=volume?D3D11_REQ_TEXTURE3D_U_V_OR_W_DIMENSION:D3D11_REQ_TEXTURE2D_U_OR_V_DIMENSION;
        if((dimension!="2d"&&!cube&&!volume)||(array&&(cube||volume))||!width||!height||width>limit||height>limit||!layers||layers>D3D11_REQ_TEXTURE2D_ARRAY_AXIS_DIMENSION||(cube&&(layers!=6||width!=height))||(!array&&!cube&&!volume&&layers!=1)||(channels!=4&&!(floating&&channels==2))||(srgb&&(floating||channels!=4)))throw std::runtime_error("Material texture dimensions or bytes invalid");
        const std::uint64_t pitch=std::uint64_t(width)*channels*componentBytes,size=pitch*height*layers;if(size!=bytes.size())throw std::runtime_error("Material texture dimensions or bytes invalid");
        if(half){for(std::size_t i=0;i<bytes.size();i+=2){std::uint16_t v;std::memcpy(&v,bytes.data()+i,2);if((v&0x7c00u)==0x7c00u)throw std::runtime_error("Half texture must be finite");}}else if(floating)for(std::size_t i=0;i<bytes.size();i+=4){float v;std::memcpy(&v,bytes.data()+i,4);if(!std::isfinite(v))throw std::runtime_error("2D float texture must be finite");}
        if(!mipLevels.empty()){
            if(mipmaps||cube||volume||array||floating||channels!=4)throw std::runtime_error("Explicit mips require an RGBA8 2D texture without automatic generation");
            auto w=width,h=height;for(const auto& level:mipLevels){if(w==1&&h==1)throw std::runtime_error("Explicit mip count exceeds the texture dimensions");w=std::max(1u,w/2);h=std::max(1u,h/2);if(level.width!=w||level.height!=h||level.rgba.size()!=std::uint64_t(w)*h*4)throw std::runtime_error("Explicit mip dimensions or bytes invalid");}
        }
        std::lock_guard<std::mutex> lock(gpu.mutex);Texture out;out.owner=gpu.device.p;out.width=width;out.height=height;out.layers=layers;out.bytes=size;out.flatTexture=!array&&!cube&&!volume;
        const DXGI_FORMAT format=half?(channels==2?DXGI_FORMAT_R16G16_FLOAT:DXGI_FORMAT_R16G16B16A16_FLOAT):floating?(channels==2?DXGI_FORMAT_R32G32_FLOAT:DXGI_FORMAT_R32G32B32A32_FLOAT):(srgb?DXGI_FORMAT_R8G8B8A8_UNORM_SRGB:DXGI_FORMAT_R8G8B8A8_UNORM);UINT support=0;detail::check(gpu.device->CheckFormatSupport(format,&support),"Material texture support");if(mipmaps&&!(support&D3D11_FORMAT_SUPPORT_MIP_AUTOGEN))throw std::runtime_error("Material texture format cannot generate mips");
        UINT mips=static_cast<UINT>(mipLevels.size()+1);if(mipmaps)for(UINT extent=std::max(width,std::max(height,volume?layers:1u));extent>1;extent/=2)++mips;
        out.bytes=0;for(UINT level=0;level<mips;level++)out.bytes+=std::uint64_t(std::max(1u,width>>level))*std::max(1u,height>>level)*(volume?std::max(1u,layers>>level):layers)*channels*componentBytes;
        const UINT bind=D3D11_BIND_SHADER_RESOURCE|(mipmaps?D3D11_BIND_RENDER_TARGET:0),misc=mipmaps?D3D11_RESOURCE_MISC_GENERATE_MIPS:0;
        if(volume){D3D11_TEXTURE3D_DESC d{};d.Width=width;d.Height=height;d.Depth=layers;d.MipLevels=mips;d.Format=format;d.Usage=D3D11_USAGE_DEFAULT;d.BindFlags=bind;d.MiscFlags=misc;detail::Com<ID3D11Texture3D> image;detail::check(gpu.device->CreateTexture3D(&d,nullptr,&image.p),"Volume data texture");gpu.context->UpdateSubresource(image.p,0,nullptr,bytes.data(),static_cast<UINT>(pitch),static_cast<UINT>(pitch*height));detail::check(gpu.device->CreateShaderResourceView(image.p,nullptr,&out.view.p),"Volume data view");}
        else{D3D11_TEXTURE2D_DESC d{};d.Width=width;d.Height=height;d.MipLevels=mips;d.ArraySize=layers;d.Format=format;d.SampleDesc.Count=1;d.Usage=D3D11_USAGE_DEFAULT;d.BindFlags=bind;d.MiscFlags=misc|(cube?D3D11_RESOURCE_MISC_TEXTURECUBE:0);detail::Com<ID3D11Texture2D> image;detail::check(gpu.device->CreateTexture2D(&d,nullptr,&image.p),"Material data texture");for(UINT i=0;i<layers;i++)gpu.context->UpdateSubresource(image.p,i*mips,nullptr,bytes.data()+std::size_t(i)*pitch*height,static_cast<UINT>(pitch),0);
            for(std::size_t level=0;level<mipLevels.size();++level){const auto& data=mipLevels[level];gpu.context->UpdateSubresource(image.p,static_cast<UINT>(level+1),nullptr,data.rgba.data(),data.width*4,0);}
            // A one-layer cookie still binds to Texture2DArray in HLSL.
            D3D11_SHADER_RESOURCE_VIEW_DESC v{};v.Format=format;v.ViewDimension=cube?D3D11_SRV_DIMENSION_TEXTURECUBE:array?D3D11_SRV_DIMENSION_TEXTURE2DARRAY:D3D11_SRV_DIMENSION_TEXTURE2D;v.Texture2D.MipLevels=mips;if(array){v.Texture2DArray.MipLevels=mips;v.Texture2DArray.ArraySize=layers;}detail::check(gpu.device->CreateShaderResourceView(image.p,&v,&out.view.p),"Material data view");}
        if(mipmaps){gpu.context->GenerateMips(out.view.p);}++uploads_;return out;
    }
    Texture createTexture(std::uint32_t width,std::uint32_t height,const std::vector<std::uint8_t>& rgba,bool srgb,const std::vector<TextureMipLevel>& mipLevels){
        return createDataTexture(width,height,rgba,4,false,1,srgb,false,"2d",false,false,mipLevels);
    }
    struct RayScenePatch{std::uint32_t row,rows;std::vector<std::uint8_t> bytes;};
    void updateRayScenes(Texture& value,std::uint32_t width,std::uint32_t height,const std::vector<RayScenePatch>& patches){
        const auto pitch=std::uint64_t(width)*16;if(value.owner!=gpu.device.p||!value.view.p||value.width!=width||value.height!=height||value.layers!=1||!width||!height||patches.empty()||patches.size()>height)throw std::runtime_error("Ray scene update dimensions invalid");
        D3D11_SHADER_RESOURCE_VIEW_DESC view{};value.view->GetDesc(&view);if(view.ViewDimension!=D3D11_SRV_DIMENSION_TEXTURE2D||view.Format!=DXGI_FORMAT_R32G32B32A32_FLOAT||view.Texture2D.MipLevels!=1)throw std::runtime_error("Ray scene update format invalid");
        std::uint32_t end=0;for(const auto& p:patches){if(p.row<end||p.row>=height||!p.rows||p.rows>height-p.row||p.bytes.size()!=pitch*p.rows)throw std::runtime_error("Ray scene update rows or bytes invalid");end=p.row+p.rows;for(std::size_t i=0;i<p.bytes.size();i+=4){float v;std::memcpy(&v,p.bytes.data()+i,4);if(!std::isfinite(v))throw std::runtime_error("Ray scene update must be finite");}}
        std::lock_guard<std::mutex> lock(gpu.mutex);detail::Com<ID3D11Resource> resource;value.view->GetResource(&resource.p);for(const auto& p:patches){const D3D11_BOX box{0,p.row,0,width,p.row+p.rows,1};gpu.context->UpdateSubresource(resource.p,0,&box,p.bytes.data(),static_cast<UINT>(pitch),0);++raySceneUpdates_;raySceneUpdateBytes_+=p.bytes.size();}
    }
    void updateRayScene(Texture& value,std::uint32_t width,std::uint32_t height,std::uint32_t row,std::uint32_t rows,const std::vector<std::uint8_t>& bytes){updateRayScenes(value,width,height,{{row,rows,bytes}});}
    Texture createRenderTarget(std::uint32_t width,std::uint32_t height,bool stencil=false){
        if(!width||!height||width>D3D11_REQ_TEXTURE2D_U_OR_V_DIMENSION||height>D3D11_REQ_TEXTURE2D_U_OR_V_DIMENSION)throw std::runtime_error("2D target dimensions invalid");
        std::lock_guard<std::mutex> lock(gpu.mutex);Texture out;out.owner=gpu.device.p;out.width=width;out.height=height;out.bytes=std::uint64_t(width)*height*(stencil?8:4);
        D3D11_TEXTURE2D_DESC d{};d.Width=width;d.Height=height;d.MipLevels=d.ArraySize=d.SampleDesc.Count=1;d.Format=DXGI_FORMAT_R8G8B8A8_UNORM;d.BindFlags=D3D11_BIND_RENDER_TARGET|D3D11_BIND_SHADER_RESOURCE;detail::Com<ID3D11Texture2D> image;
        detail::check(gpu.device->CreateTexture2D(&d,nullptr,&image.p),"2D target");detail::check(gpu.device->CreateRenderTargetView(image.p,nullptr,&out.target.p),"2D target RTV");detail::check(gpu.device->CreateShaderResourceView(image.p,nullptr,&out.view.p),"2D target SRV");
        if(stencil){d.Format=DXGI_FORMAT_D24_UNORM_S8_UINT;d.BindFlags=D3D11_BIND_DEPTH_STENCIL;detail::Com<ID3D11Texture2D> depth;detail::check(gpu.device->CreateTexture2D(&d,nullptr,&depth.p),"2D stencil");detail::check(gpu.device->CreateDepthStencilView(depth.p,nullptr,&out.depth.p),"2D stencil view");}
        ++uploads_;return out;
    }
    void begin2D(Texture& target,const SceneFrame& value,bool clear=false){
        if(activeProbe||active2D||activeShadow>=0||target.owner!=gpu.device.p||!target.target.p||!finite(value.viewProjection)||!finite(value.viewport)||!finite(value.clear)||(value.scissor&&!finite(*value.scissor)))throw std::runtime_error("2D pass invalid");
        if(value.viewport[2]<=0||value.viewport[3]<=0||value.viewport[0]<0||value.viewport[1]<0||value.viewport[0]+value.viewport[2]>target.width||value.viewport[1]+value.viewport[3]>target.height)throw std::runtime_error("2D pass viewport invalid");
        saved2D=frame;frame=value;active2D=&target;std::lock_guard<std::mutex> lock(gpu.mutex);ID3D11ShaderResourceView* empty[8]{};gpu.context->PSSetShaderResources(31,8,empty);
        if(clear){gpu.context->ClearRenderTargetView(target.target.p,value.clear.data());if(target.depth.p)gpu.context->ClearDepthStencilView(target.depth.p,D3D11_CLEAR_DEPTH|D3D11_CLEAR_STENCIL,1,0);}++passes2D_;
    }
    void end2D(){if(!active2D)return;std::lock_guard<std::mutex> lock(gpu.mutex);gpu.context->OMSetRenderTargets(0,nullptr,nullptr);active2D=nullptr;frame=saved2D;}
    void setSkyEnvironment(const Texture* texture,std::uint32_t size=128,float rotation=0,float intensity=1){
        if(!std::isfinite(rotation)||!std::isfinite(intensity)||intensity<0)throw std::runtime_error("Sky HDRI settings invalid");
        if(!texture||intensity==0){std::lock_guard<std::mutex> lock(gpu.mutex);std::array<ID3D11ShaderResourceView*,2> empty{};gpu.context->PSSetShaderResources(46,2,empty.data());skyProbe={};skySource={};skySize=0;skySettings.options[0]=0;return;}
        if(texture->owner!=gpu.device.p||!texture->view.p)throw std::runtime_error("Sky HDRI texture owner invalid");
        D3D11_SHADER_RESOURCE_VIEW_DESC d{};texture->view->GetDesc(&d);if(d.ViewDimension!=D3D11_SRV_DIMENSION_TEXTURE2D)throw std::runtime_error("Sky HDRI requires a 2D panorama");
        if(size<16||size>2048||(size&(size-1)))throw std::runtime_error("Sky HDRI resolution invalid");
        if(skySource.p!=texture->view.p||skySize!=size){auto next=probes.create(size);probes.importEquirect(next,texture->view.p);probes.filter(next);skyProbe=std::move(next);skySource={};skySource.p=texture->view.p;skySource->AddRef();skySize=size;}
        const float radians=rotation*.01745329252f;skySettings.center={0,0,0,intensity};skySettings.minimum={std::sin(radians),std::cos(radians),0,0};skySettings.maximum={0,0,0,float(skyProbe.mips-1)};skySettings.options={1,1,1,0};
    }
    void setSkyProbe(Probe&& target,float intensity=1){if(target.owner!=gpu.device.p||!target.ready)throw std::runtime_error("Sky probe invalid");if(!std::isfinite(intensity)||intensity<0)throw std::runtime_error("Sky intensity invalid");skyProbe=std::move(target);skySource={};skySize=0;skySettings.center={0,0,0,intensity};skySettings.minimum={0,1,0,0};skySettings.maximum={0,0,0,float(skyProbe.mips-1)};skySettings.options={1,1,1,0};}
    void setSkyIntensity(float intensity){if(!std::isfinite(intensity)||intensity<0)throw std::runtime_error("Sky intensity invalid");skySettings.center[3]=intensity;}
    std::uint64_t skyEnvironmentBytes() const{return skyProbe.available()?skyProbe.storageBytes():0;}
    std::uint64_t lightTileBytes() const{return lightTiles.bytes();}std::uint64_t lightTileDispatches() const{return lightTiles.dispatches();}
    auto lightTilePreparationInfo()const{return lightTiles.preparationInfo();}
    Probe createProbe(std::uint32_t size){return probes.create(size);}
    void beginProbe(Probe& target,std::uint32_t faceIndex,const Matrix& projection,const std::array<float,4>& eye,const std::array<float,4>& clear,bool indirect=false,bool environment=false){
        if(activeProbe||activeShadow>=0||active2D||target.owner!=gpu.device.p||faceIndex>=6||!finite(projection)||!finite(eye)||!finite(clear))throw std::runtime_error("Probe capture binding invalid");
        std::lock_guard<std::mutex> lock(gpu.mutex);savedProbe=frame;frame.viewProjection=projection;frame.eye=eye;frame.viewport={0,0,float(target.size),float(target.size)};frame.scissor.reset();activeProbe=&target;probeIndirect=indirect;probeFace=faceIndex;if(environment){frame.fog={0,0,0,0};frame.fogRange={0,0,0,0};frame.heightFog={0,0,0,1};}
        std::array<ID3D11ShaderResourceView*,5> empty{};gpu.context->PSSetShaderResources(39,5,empty.data());gpu.context->ClearRenderTargetView(target.faces[faceIndex].p,clear.data());gpu.context->ClearDepthStencilView(target.depth.p,D3D11_CLEAR_DEPTH,1,0);
    }
    void endProbe(){if(!activeProbe)return;std::lock_guard<std::mutex> lock(gpu.mutex);gpu.context->OMSetRenderTargets(0,nullptr,nullptr);activeProbe=nullptr;frame=savedProbe;}
    bool filterProbeStep(Probe& target,std::uint32_t stage){if(activeProbe)throw std::runtime_error("End probe capture before filtering");return probes.filterStep(target,stage);}
    void filterProbe(Probe& target){if(activeProbe)throw std::runtime_error("End probe capture before filtering");probes.filter(target);}
    void releaseProbes(){endProbe();{std::lock_guard<std::mutex> lock(gpu.mutex);std::array<ID3D11ShaderResourceView*,9> empty{};gpu.context->PSSetShaderResources(39,9,empty.data());}setSkyEnvironment(nullptr);probes.release();}
    std::uint64_t probeDispatches() const{return probes.dispatches();}std::uint64_t probeCaptures() const{return probes.captures();}std::uint64_t probeSharedBytes() const{return probes.storageBytes();}
    std::uint64_t passes2D() const{return passes2D_;}std::uint64_t draws2D() const{return draws2D_;}

    static std::string materialProgramSource(const std::string& declarations,const std::string& evaluation){
        if(declarations.size()+evaluation.size()>1048576)throw std::runtime_error("Material HLSL source too large");
        std::string source=shaderSource();
        // Graph shaders never render the auxiliary mask/atlas pass; keep its base-map sampler dead.
        const auto erase=[&](const char* text){const auto at=source.find(text);if(at!=std::string::npos)source.erase(at,std::strlen(text));};
        erase("if(pass2d.x>0)return offscreen2d(base,i.color);");
        // A complete node surface owns its texture inputs. Default map reads must
        // not keep s0..s5 alive beside its independent graph sampler bindings.
        if(declarations.rfind("#define HB_NODE_SURFACE 1\n",0)==0){
            const auto replaceRequired=[&](const std::string& from,const std::string& to){const auto at=source.find(from);if(at==std::string::npos)throw std::runtime_error("Surface shader map marker missing");source.replace(at,from.size(),to);};
            replaceRequired("if(maps&1)base*=baseMap.Sample(baseSampler,mapUv(i.uv,0));","");
            const auto normalStart=source.find(" if(maps&2){"),normalEnd=source.find("\n",normalStart);
            if(normalStart==std::string::npos||normalEnd==std::string::npos)throw std::runtime_error("Surface shader normal marker missing");
            source.erase(normalStart,normalEnd-normalStart);
            replaceRequired("*((maps&4)?roughMap.Sample(roughSampler,mapUv(i.uv,2)).g:1)","");
            replaceRequired("*((maps&8)?metalMap.Sample(metalSampler,mapUv(i.uv,3)).b:1)","");
            replaceRequired("*((maps&16)?emissiveMap.Sample(emissiveSampler,mapUv(i.uv,4)).rgb:1)","");
            replaceRequired("(maps&32)?aoMap.Sample(aoSampler,mapUv(i.uv,5)).r:1","1");
        }
        if(declarations.find("register(s13)")!=std::string::npos){erase("clipMask2d(i.position.xy);");erase("if(pass2d.z>.5)outColor=shade2d(i.at.xy,i.uv,n,base.rgb)+emit;");}
        if(declarations.find("register(s14)")!=std::string::npos){const auto at=source.find("  if(transmission>0)");source.erase(at,source.find("\n",at)-at);erase("outColor+=indirectProbes(i.at,n,v,base.rgb,rough,metal,ao,dielectricF0,1-transmission);");erase("coatLight+=indirectProbes(i.at,cn,v,float3(.04,.04,.04),coatRough,1,1);");}
        const auto entry=source.find("float4 PS("),marker=source.find("// HB_MATERIAL_EVAL");source.replace(marker,std::strlen("// HB_MATERIAL_EVAL"),evaluation);source.insert(entry,declarations+"\n");
        return surfaceShader(source);
    }
    Program createProgram(const std::string& declarations,const std::string& evaluation,const std::vector<float>& parameters){
        if(!finite(parameters))throw std::runtime_error("Material parameters invalid");
        const auto source=materialProgramSource(declarations,evaluation);Program out;out.owner=gpu.device.p;
        // Compilation and disk I/O must not hold the immediate-context mutex.
        for(const auto* entry:{"PS","ShadowPS"})detail::ShaderBytecodeCompiler::create(source,"HBNodeMaterial",entry,"ps_5_0",[&](const void* bytes,std::size_t size){std::lock_guard<std::mutex> lock(gpu.mutex);return gpu.device->CreatePixelShader(bytes,size,nullptr,entry[0]=='S'?&out.shadowShader.p:&out.shader.p);});
        setProgramParameters(out,parameters);++uploads_;return out;
    }
    Program createProgramAsync(const std::string& declarations,const std::string& evaluation,const std::vector<float>& parameters){
        if(!finite(parameters))throw std::runtime_error("Material parameters invalid");
        Program out;out.owner=gpu.device.p;out.preparation=std::make_unique<SceneProgramPreparation>(materialProgramSource(declarations,evaluation));
        setProgramParameters(out,parameters);out.preparation->poll();++uploads_;return out;
    }
    bool pollProgramPreparation(Program& program){
        if(program.owner!=gpu.device.p)throw std::runtime_error("Material preparation owner invalid");
        if(!program.preparation)return program.ready();
        auto& pending=*program.preparation;pending.poll();
        for(std::size_t i=0;i<2;i++)if(auto* bytes=pending.bytecode(i)){
            detail::Com<ID3D11PixelShader> next;HRESULT result;
            {std::lock_guard<std::mutex> lock(gpu.mutex);result=gpu.device->CreatePixelShader(bytes->data(),bytes->size(),nullptr,&next.p);}
            if(FAILED(result)){pending.reject(i,result);continue;}
            (i?program.shadowShader:program.shader)=std::move(next);pending.accept(i);
        }
        const auto info=pending.info();if(!info.error.empty())throw std::runtime_error(info.error);
        if(program.ready())program.preparation.reset();
        return program.ready();
    }
    Program createSurfaceProgram(const std::string& declarations,const std::string& evaluation,const std::vector<float>& parameters){return createProgram("#define HB_NODE_SURFACE 1\n"+declarations,evaluation,parameters);}
    Program createSurfaceProgramAsync(const std::string& declarations,const std::string& evaluation,const std::vector<float>& parameters){return createProgramAsync("#define HB_NODE_SURFACE 1\n"+declarations,evaluation,parameters);}
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
        if(values.empty())lightTiles.release();
        std::lock_guard<std::mutex> lock(gpu.mutex);const auto count=static_cast<UINT>(values.size());if(count>lightCapacity){D3D11_BUFFER_DESC desc{};desc.ByteWidth=count*sizeof(SceneLight);desc.Usage=D3D11_USAGE_DEFAULT;desc.BindFlags=D3D11_BIND_SHADER_RESOURCE;desc.MiscFlags=D3D11_RESOURCE_MISC_BUFFER_STRUCTURED;desc.StructureByteStride=sizeof(SceneLight);detail::Com<ID3D11Buffer> buffer;detail::Com<ID3D11ShaderResourceView> view;detail::check(gpu.device->CreateBuffer(&desc,nullptr,&buffer.p),"Scene lights");detail::check(gpu.device->CreateShaderResourceView(buffer.p,nullptr,&view.p),"Scene lights view");lights=std::move(buffer);lightView=std::move(view);lightCapacity=count;}
        if(count){D3D11_BOX box{0,0,0,count*static_cast<UINT>(sizeof(SceneLight)),1,1};gpu.context->UpdateSubresource(lights.p,0,&box,values.data(),0,0);}lightCount=count;lightDefinitions=values;++lightRevision;
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
    bool pollRasterPreparation(){
        if(!rasterPreparation)return true;
        rasterPreparation->poll();for(std::size_t stage=0;stage<3;stage++)if(const auto* code=rasterPreparation->bytecode(stage)){const auto result=adoptRasterShader(stage,code->data(),code->size());if(SUCCEEDED(result))rasterPreparation->accept(stage);else rasterPreparation->reject(stage,result);}
        const auto info=rasterPreparation->info();if(!info.error.empty())throw std::runtime_error(info.error);if(info.ready)rasterPreparation.reset();return info.ready;
    }
    SceneRasterPreparation::Info rasterPreparationInfo()const{return rasterPreparation?rasterPreparation->info():SceneRasterPreparation::Info{{3,3,3},false,true,{}};}
    void begin(const SceneFrame& value){
        const bool rasterReady=pollRasterPreparation();
        endProbe();end2D();endShadow();for(const auto& light:lightDefinitions)if(light.position[3]<3&&light.cone[3]>0&&light.cone[3]+(light.position[3]==1?5:0)>shadows.size())throw std::runtime_error("Shadow light reference invalid");
        if(!finite(value.viewProjection)||!finite(value.clear)||!finite(value.eye)||!finite(value.ambient)||!finite(value.fog)||!finite(value.fogRange)||!finite(value.heightFog)||!finite(value.viewport)||(value.viewportClear&&!finite(*value.viewportClear))||!std::isfinite(value.exposure)||value.exposure<0||!std::isfinite(value.time))throw std::runtime_error("Scene frame invalid");
        const auto validate=[](const std::array<float,4>& rect){if(!finite(rect))throw std::runtime_error("Scene viewport invalid");for(std::size_t i=0;i<2;i++)if(rect[i]<D3D11_VIEWPORT_BOUNDS_MIN||rect[i]>D3D11_VIEWPORT_BOUNDS_MAX||rect[i+2]<0||rect[i]+rect[i+2]>D3D11_VIEWPORT_BOUNDS_MAX)throw std::runtime_error("Scene viewport bounds invalid");};validate(value.viewport);if(value.scissor)validate(*value.scissor);if((value.viewport[2]==0)!=(value.viewport[3]==0))throw std::runtime_error("Scene viewport size invalid");
        {std::lock_guard<std::mutex> lock(gpu.mutex);startTiming();}if(value.postProcess&&value.postProcess->lookup[1]>0&&value.postProcess->lookup[1]!=postLookupSize)throw std::runtime_error("Post lookup size mismatch");frame=value;const auto tileRect=value.viewport[2]>0?value.viewport:std::array<float,4>{0,0,float(surface.width()),float(surface.height())};lightTiles.prepare(value.viewProjection,tileRect,lightCount,lightView.p,lightRevision,value.rasterLightCulling);surface.clear(value.clear);bloom.begin(surface.width(),surface.height(),value.viewport,value.bloom,value.clear,value.transmission,value.postProcess,rasterReady?value.screenEffects:std::nullopt);transmissionReady=false;if(!value.transmission)releaseTransmission();draws_=shadowDraws_=0;
        if(value.viewportClear){if(!background.vertices.p)background=createMesh({{{-1,-1,0}},{{1,-1,0}},{{1,1,0}},{{-1,1,0}}},{0,1,2,0,2,3});SceneMaterial fill;fill.color=*value.viewportClear;fill.unlit=true;fill.toneMapped=false;fill.depthTest=fill.depthWrite=false;const auto vp=frame.viewProjection;frame.viewProjection=identity;draw(background,identity,identity,fill);frame.viewProjection=vp;}
    }
    void draw(const Mesh& mesh,const Matrix& world,const Matrix& normal,const SceneMaterial& material={},const std::array<const Texture*,6>& maps={},const std::array<std::uint32_t,6>& sampling={},std::uint32_t first=0,std::uint32_t count=0,const Program* program=nullptr,const std::vector<const Texture*>& programMaps={},const std::vector<std::uint32_t>& programSampling={},const Instances* instances=nullptr,const Deformation* deformation=nullptr,const Bindings2D* twoD=nullptr,const std::array<ProbeBinding,2>* probeBindings=nullptr,const Matrix* previousWorld=nullptr,float motionFlag=0,const Texture* lightmap=nullptr){
        if(lightmap&&(lightmap->owner!=gpu.device.p||!lightmap->flatTexture||!mesh.uv1.p))throw std::runtime_error("Baked lightmap texture or UV1 invalid");
        if(!std::isfinite(material.lightmapIntensity)||material.lightmapIntensity<0)throw std::runtime_error("Baked lightmap intensity invalid");
        if(deformation&&(deformation->owner!=gpu.device.p||deformation->vertexCount!=mesh.vertexCount||deformation->current.empty()||(instances&&instances->positionsOnly())))throw std::runtime_error("Deformation draw binding invalid");
        if(instances){if(instances->owner!=gpu.device.p)throw std::runtime_error("Instance draw owner invalid");if(!instances->count)return;}
        if((previousWorld&&!finite(*previousWorld))||!std::isfinite(motionFlag)||(motionFlag!=-1&&motionFlag!=0&&motionFlag!=1&&motionFlag!=2)){throw std::runtime_error("Object motion input invalid");}
        const auto blend=static_cast<std::size_t>(material.blend);if(mesh.owner!=gpu.device.p||!finite(world)||!finite(normal)||!finite(material.color)||!finite(material.emissive)||!finite(material.normalScale)||!finite(material.shotShape)||!finite(material.physical)||!finite(material.volume)||!finite(material.absorption)||!finite(material.sheenColor)||!finite(material.lobes)||!finite(material.film)||!finite(material.scatter)||!finite(material.scatterColor)||!finite(material.hairTangent)||material.scatter[0]<0||material.scatter[0]>1||material.scatter[1]<0||material.scatter[1]>1||material.scatter[2]<0||material.scatter[2]>1||material.scatter[3]<0||std::abs(material.hairTangent[3])>1||!finite(material.specular)||material.sheenColor[0]<0||material.sheenColor[0]>1||material.specular[0]<0||material.specular[0]>1||material.sheenColor[1]<0||material.sheenColor[1]>1||material.specular[1]<0||material.specular[1]>1||material.sheenColor[2]<0||material.sheenColor[2]>1||material.specular[2]<0||material.specular[2]>1||material.sheenColor[3]<0||material.sheenColor[3]>1||material.lobes[0]<0||material.lobes[0]>1||material.lobes[1]<0||material.lobes[1]>1||std::abs(material.lobes[2])>6.283186f||material.lobes[3]<0||material.lobes[3]>1||material.film[0]<1||material.film[0]>3||material.film[1]<0||material.film[1]>2000||material.film[2]<0||material.film[2]>1||material.absorption[0]<0||material.absorption[0]>1||material.absorption[1]<0||material.absorption[1]>1||material.absorption[2]<0||material.absorption[2]>1||material.absorption[3]<0||material.physical[3]<0||material.physical[3]>10||material.volume[0]<0||material.volume[0]>1||material.volume[1]<0||material.physical[0]<0||material.physical[0]>1||material.physical[1]<0||material.physical[1]>1||material.physical[2]<1||material.physical[2]>2.5||!finite(material.skyTop)||!finite(material.skyHorizon)||!finite(material.sunDirection)||!finite(material.sunColor)||!finite(material.moonDirection)||!finite(material.moonColor)||!std::isfinite(material.roughness)||!std::isfinite(material.metalness)||!std::isfinite(material.alphaCutoff)||blend>=3||first>mesh.count)throw std::runtime_error("Scene draw invalid");for(std::size_t i=0;i<6;i++)if(!finite(material.uvX[i])||!finite(material.uvY[i]))throw std::runtime_error("Scene texture transform invalid");if(!count)count=mesh.count-first;if(count>mesh.count-first||count%3||first%3)throw std::runtime_error("Scene draw range invalid");
        if(extendedSamplers.size()>512)extendedSamplers.clear();
        std::array<ID3D11ShaderResourceView*,128> views{};std::array<ID3D11SamplerState*,16> states{};std::uint32_t mask=0;for(std::size_t i=0;i<maps.size();i++){if(maps[i]&&maps[i]->owner!=gpu.device.p)throw std::runtime_error("Scene texture owner or sampler invalid");if(maps[i]){views[i]=maps[i]->view.p;mask|=1u<<i;}states[i]=samplerState(sampling[i]);}if(mesh.uv1.p)mask|=16384u;views[6]=lightView.p;const UINT viewCount=50,samplerCount=16;if(lightmap){views[49]=lightmap->view.p;mask|=32768u;}if(program){if(program->owner!=gpu.device.p||programMaps.size()>D3D11_COMMONSHADER_SAMPLER_SLOT_COUNT||programMaps.size()!=programSampling.size())throw std::runtime_error("Material program bindings invalid");views[7]=program->values.p;for(std::size_t i=0;i<programMaps.size();i++){if(!programMaps[i]||programMaps[i]->owner!=gpu.device.p)throw std::runtime_error("Material texture owner or sampler invalid");views[8+i]=programMaps[i]->view.p;states[i]=samplerState(programSampling[i]);}}
        if(program&&!program->ready()){const auto info=program->preparationInfo();if(!info.error.empty())throw std::runtime_error(info.error);return;}
        if(rasterPreparation)return;
        views[24]=activeShadow<0?shadowView.p:nullptr;views[25]=shadowDataView.p;if(material.receiveShadow)mask|=64u;if(activeProbe)mask|=2048u;if(!active2D&&!activeProbe&&activeShadow<0&&bloom.active()){mask|=128u;bloom.markDirty();}if(instances)mask|=instances->stride==16?512u:256u;if(deformation)mask|=1024u;
        if(transmissionReady&&(material.transmission||material.volume[0]>0)&&!activeProbe&&!active2D&&activeShadow<0){if(programMaps.size()>14)throw std::runtime_error("Transmission reserves one material sampler");views[44]=transmissionView.p;views[45]=transmissionDepthView.p;states[14]=samplers[16].p;mask|=4096u;}
        Scene2D settings=twoD?twoD->settings:Scene2D{};
        if(!finite(settings.pass)||!finite(settings.screen)||!finite(settings.origin)||!finite(settings.modes)||!finite(settings.channels)||!finite(settings.maskX)||!finite(settings.maskY)||!finite(settings.project)||settings.pass[0]<0||settings.pass[0]>6||settings.pass[1]<0||settings.pass[1]>2||settings.screen[2]<0||settings.screen[2]>=64||settings.screen[3]<0||settings.screen[3]>64||settings.screen[0]<=0||settings.screen[1]<=0||settings.pass[2]<0||settings.pass[2]>1||settings.pass[3]<0||settings.pass[3]>1||settings.origin[2]<-1||settings.origin[2]>=64)throw std::runtime_error("2D settings invalid");
        for(float value:{settings.pass[0],settings.pass[1],settings.pass[2],settings.screen[2],settings.screen[3],settings.origin[2]})if(std::floor(value)!=value)throw std::runtime_error("2D index must be integral");
        for(std::size_t i=0;i<4;i++)if(settings.modes[i]<0||settings.modes[i]>2||std::floor(settings.modes[i])!=settings.modes[i]||settings.channels[i]<-1||settings.channels[i]>7||std::floor(settings.channels[i])!=settings.channels[i])throw std::runtime_error("2D blend style invalid");
        if(twoD){if(program&&programMaps.size()>13)throw std::runtime_error("2D effects reserve three material samplers");for(std::size_t i=0;i<8;i++){const auto* t=twoD->maps[i];if(t&&(t->owner!=gpu.device.p||t==active2D))throw std::runtime_error("2D texture binding invalid");views[31+i]=t?t->view.p:nullptr;}if(twoD->maskSampling>=samplers.size())throw std::runtime_error("2D mask sampler invalid");states[13]=samplers[twoD->maskSampling].p;states[14]=samplers[16].p;states[15]=samplers[17].p;}
        std::array<ProbeSettings,3> probeData{};for(auto& p:probeData)p.options[0]=0;
        if(probeBindings&&(!activeProbe||probeIndirect)&&activeShadow<0&&!active2D){for(std::size_t i=0;i<2;i++){const auto& b=(*probeBindings)[i];if(!b.resource)continue;const auto& p=*b.resource;if(activeProbe&&!p.ready)continue;if(p.owner!=gpu.device.p||!p.ready||!finite(b.settings.center)||!finite(b.settings.minimum)||!finite(b.settings.maximum)||!finite(b.settings.options)||b.settings.center[3]<0||b.settings.minimum[3]<0||b.settings.options[1]<0||b.settings.options[2]<0)throw std::runtime_error("Probe draw binding invalid");for(std::size_t j=0;j<3;j++)if(b.settings.minimum[j]>=b.settings.maximum[j])throw std::runtime_error("Probe bounds invalid");if(programMaps.size()>14)throw std::runtime_error("Reflection probes reserve one material sampler");probeData[i]=b.settings;probeData[i].maximum[3]=float(p.mips-1);views[39+i]=p.view.p;views[41+i]=p.irradiance.p;views[43]=probes.brdfView();states[14]=samplers[16].p;}}
        if(skyProbe.available()&&activeShadow<0&&!active2D){if(programMaps.size()>14)throw std::runtime_error("Sky HDRI reserves one material sampler");probeData[2]=skySettings;views[46]=skyProbe.view.p;views[47]=skyProbe.irradiance.p;views[43]=probes.brdfView();states[14]=samplers[16].p;}
        if(lightTiles.resource()&&!activeProbe&&!active2D&&activeShadow<0){mask|=8192u;views[48]=lightTiles.resource();}
        std::lock_guard<std::mutex> lock(gpu.mutex);lightTiles.bind();auto* pcb=probeConstants[slot].p;D3D11_MAPPED_SUBRESOURCE pm{};detail::check(gpu.context->Map(pcb,0,D3D11_MAP_WRITE_DISCARD,0,&pm),"Probe draw constants");std::memcpy(pm.pData,probeData.data(),sizeof(probeData));gpu.context->Unmap(pcb,0);gpu.context->PSSetConstantBuffers(2,1,&pcb);auto* cb2=constants2D[slot].p;D3D11_MAPPED_SUBRESOURCE mapped2{};detail::check(gpu.context->Map(cb2,0,D3D11_MAP_WRITE_DISCARD,0,&mapped2),"2D draw constants");std::memcpy(mapped2.pData,&settings,sizeof(settings));gpu.context->Unmap(cb2,0);gpu.context->VSSetConstantBuffers(1,1,&cb2);gpu.context->PSSetConstantBuffers(1,1,&cb2);Matrix prior=identity;const auto* screen=frame.screenEffects?&*frame.screenEffects:nullptr;if(screen&&motionFlag!=0){prior=multiplyMatrix(screen->previousVP,previousWorld?*previousWorld:world);}Constants data{frame.viewProjection,world,normal,prior,{screen?motionFlag:0,screen?screen->jitter[0]-screen->jitter[2]:0,screen?screen->jitter[1]-screen->jitter[3]:0,instances&&instances->previousViews[instances->previousSlot].p?1.f:0.f},material.color,material.emissive,{material.roughness,material.metalness,material.alphaCutoff,material.unlit?1.f:0.f},frame.eye,frame.ambient,material.uvX,material.uvY,{float(mask),float(lightCount),material.toneMapped?1.f:0.f,material.sky?2.f:material.vertexColors?1.f:0.f},{material.normalScale[0],material.normalScale[1],frame.exposure,frame.time},frame.fog,frame.fogRange,frame.heightFog,material.skyTop,material.skyHorizon,material.sunDirection,material.sunColor,material.shotShape,material.physical,{material.volume[0],material.volume[1],float(surface.width()),float(surface.height())},frame.viewport[2]>0?frame.viewport:std::array<float,4>{0,0,float(surface.width()),float(surface.height())},material.absorption,material.sheenColor,material.lobes,material.film,material.specular,material.scatter,material.scatterColor,material.hairTangent,{deformation?deformation->vertexCount:0,deformation?deformation->morphCount:0,deformation?deformation->boneCount:0,transmissionReady?transmissionMips-1:0},material.moonDirection,material.moonColor};data.shotShape[3]=material.lightmapIntensity;auto* cb=constants[slot].p;slot=(slot+1)%constants.size();D3D11_MAPPED_SUBRESOURCE mapped{};detail::check(gpu.context->Map(cb,0,D3D11_MAP_WRITE_DISCARD,0,&mapped),"Scene draw constants");std::memcpy(mapped.pData,&data,sizeof(data));gpu.context->Unmap(cb,0);
        const auto& rect=frame.viewport;const bool custom=rect[2]>0&&rect[3]>0;D3D11_VIEWPORT viewport{custom?rect[0]:0,custom?rect[1]:0,custom?rect[2]:float(surface.width()),custom?rect[3]:float(surface.height()),0,1};const auto crop=frame.scissor.value_or(std::array<float,4>{viewport.TopLeftX,viewport.TopLeftY,viewport.Width,viewport.Height});D3D11_RECT scissor{static_cast<LONG>(std::floor(crop[0])),static_cast<LONG>(std::floor(crop[1])),static_cast<LONG>(std::ceil(crop[0]+crop[2])),static_cast<LONG>(std::ceil(crop[1]+crop[3]))};auto* target=activeProbe?activeProbe->faces[probeFace].p:active2D?active2D->target.p:bloom.active()?bloom.target():surface.target.p;std::array<ID3D11RenderTargetView*,5> targets{target,bloom.normalTarget(),bloom.albedoTarget(),bloom.motionTarget(),bloom.ambientTarget()};const bool mrt=activeShadow<0&&!activeProbe&&!active2D&&(targets[1]||targets[3]);gpu.context->OMSetRenderTargets(activeShadow<0?(mrt?5:1):0,activeShadow<0?targets.data():nullptr,activeShadow<0?(activeProbe?activeProbe->depth.p:active2D?active2D->depth.p:surface.depthTarget.p):shadowTargets[activeShadow].p);gpu.context->OMSetBlendState(surface.blends[activeShadow<0?blend:2].p,nullptr,UINT_MAX);gpu.context->OMSetDepthStencilState(surface.depths[activeShadow<0?((material.depthTest?1:0)|(material.depthWrite?2:0)):3].p,0);if(active2D){const int mode=static_cast<int>(settings.pass[0]);if(mode<1||mode>6)throw std::runtime_error("2D offscreen mode invalid");const int blend2=mode==6?2:mode==3?1:0,stencil=mode==1||mode==2?0:mode==4?2:mode==5?3:1;if(stencil&&!active2D->depth.p)throw std::runtime_error("2D stencil target required");gpu.context->OMSetBlendState(blends2D[blend2].p,nullptr,UINT_MAX);gpu.context->OMSetDepthStencilState(stencils2D[stencil].p,mode==6?0:1);}gpu.context->RSSetState((activeShadow<0?rasters:shadowRasters)[material.doubleSided?2:material.backSide?1:0].p);gpu.context->RSSetViewports(1,&viewport);gpu.context->RSSetScissorRects(1,&scissor);
        const UINT strides[2]={sizeof(SceneVertex),mesh.uv1.p?8u:static_cast<UINT>(sizeof(SceneVertex))},offsets[2]={0,mesh.uv1.p?0u:24u};auto* vertexBuffer=mesh.streamVertices.empty()?mesh.vertices.p:mesh.streamBuffers[mesh.streamSlot].p;ID3D11Buffer* vertexBuffers[2]={vertexBuffer,mesh.uv1.p?mesh.uv1.p:vertexBuffer};std::array<ID3D11ShaderResourceView*,7> instanceViews{};if(instances)instanceViews[instances->stride==16?1:0]=instances->views[instances->slot].p;if(deformation){instanceViews[2]=deformation->skinView.p;instanceViews[3]=deformation->morphView.p;instanceViews[4]=deformation->poseViews[deformation->slot].p;instanceViews[5]=deformation->previousPoseViews[deformation->previousSlot].p?deformation->previousPoseViews[deformation->previousSlot].p:instanceViews[4];}if(instances&&!instances->positionsOnly())instanceViews[6]=instances->previousViews[instances->previousSlot].p;gpu.context->IASetInputLayout(layout.p);gpu.context->IASetVertexBuffers(0,2,vertexBuffers,strides,offsets);gpu.context->IASetIndexBuffer(mesh.indices.p,DXGI_FORMAT_R32_UINT,0);gpu.context->IASetPrimitiveTopology(D3D11_PRIMITIVE_TOPOLOGY_TRIANGLELIST);gpu.context->VSSetShader(vertex.p,nullptr,0);gpu.context->VSSetShaderResources(26,7,instanceViews.data());gpu.context->PSSetShader(activeShadow<0?(program?program->shader.p:pixel.p):(program?program->shadowShader.p:shadowPixel.p),nullptr,0);gpu.context->VSSetConstantBuffers(0,1,&cb);gpu.context->PSSetConstantBuffers(0,1,&cb);gpu.context->PSSetShaderResources(0,viewCount,views.data());gpu.context->PSSetSamplers(0,samplerCount,states.data());if(instances)gpu.context->DrawIndexedInstanced(count,instances->count,first,0,0);else gpu.context->DrawIndexed(count,first,0);instanceViews.fill(nullptr);gpu.context->VSSetShaderResources(26,7,instanceViews.data());views.fill(nullptr);gpu.context->PSSetShaderResources(0,viewCount,views.data());gpu.context->OMSetRenderTargets(0,nullptr,nullptr);if(active2D)++draws2D_;else if(activeShadow<0)++draws_;else ++shadowDraws_;detail::check(gpu.device->GetDeviceRemovedReason(),"Scene device lost");
    }
    void drawParticles(const Particles& particles,ParticleStyle style={},const Texture* texture=nullptr,std::uint32_t sampling=0,const Bindings2D* twoD=nullptr){
        if(activeShadow>=0||sampling>=samplers.size()||(texture&&texture->owner!=gpu.device.p))throw std::runtime_error("Particle scene pass or texture invalid");
        if(active2D)throw std::runtime_error("Particle offscreen pass invalid");
        style.maskMode=twoD?static_cast<std::uint32_t>(twoD->settings.pass[1]):0;const auto* mask=twoD?twoD->maps[0]:nullptr;if(mask&&mask->owner!=gpu.device.p)throw std::runtime_error("Particle mask owner invalid");style.viewProjection=frame.viewProjection;style.exposure=frame.exposure;style.hdr=bloom.active();const auto& r=frame.viewport;const bool custom=r[2]>0&&r[3]>0;D3D11_VIEWPORT viewport{custom?r[0]:0,custom?r[1]:0,custom?r[2]:float(surface.width()),custom?r[3]:float(surface.height()),0,1};const auto crop=frame.scissor.value_or(std::array<float,4>{viewport.TopLeftX,viewport.TopLeftY,viewport.Width,viewport.Height});D3D11_RECT scissor{LONG(std::floor(crop[0])),LONG(std::floor(crop[1])),LONG(std::ceil(crop[0]+crop[2])),LONG(std::ceil(crop[1]+crop[3]))};
        surface.drawInto(particles,style,bloom.active()?bloom.target():surface.target.p,surface.depthTarget.p,viewport,scissor,texture?texture->view.p:nullptr,samplers[sampling].p,mask?mask->view.p:nullptr);if(bloom.active())bloom.markDirty();++draws_;
    }
    std::uint32_t particleCount(const Particles& particles){return surface.livingCount(particles);}
    void releaseParticles(){surface.releaseParticles();}
    std::uint64_t particleStorageBytes() const{return surface.particleStorageBytes();}
    std::uint64_t particleIndexAllocations() const{return surface.particleIndexAllocations();}std::uint64_t particleSortPasses() const{return surface.particleSortPasses();}std::uint64_t particleCountReadbacks() const{return surface.particleCountReadbacks();}
    void resize(std::uint32_t width,std::uint32_t height){if(width!=surface.width()||height!=surface.height())releasePostProcess();surface.resize(width,height);}
    void finish(){endProbe();end2D();endShadow();bloom.complete(surface.target.p,frame.exposure,frame.scissor,surface.depth.p,postLookupView.p,geometrySceneView.p,pathEnvironmentView.p);std::lock_guard<std::mutex> lock(gpu.mutex);finishTiming();gpu.context->PSSetShader(nullptr,nullptr,0);gpu.context->VSSetShader(nullptr,nullptr,0);ID3D11Buffer* buffer=nullptr;UINT stride=0,offset=0;gpu.context->IASetVertexBuffers(0,1,&buffer,&stride,&offset);gpu.context->IASetIndexBuffer(nullptr,DXGI_FORMAT_R32_UINT,0);}
    bool present(std::uint32_t interval=0){finish();return surface.present(interval);}
    std::vector<std::uint8_t> readPixels(){finish();return surface.readPixels();}
    std::uint32_t width() const{return surface.width();}std::uint32_t height() const{return surface.height();}
    std::uint64_t draws() const{return draws_;}std::uint64_t uploads() const{return uploads_;}std::uint64_t meshUpdates() const{return meshUpdates_;}std::uint64_t meshUpdateBytes() const{return meshUpdateBytes_;}std::uint64_t raySceneUpdates() const{return raySceneUpdates_;}std::uint64_t raySceneUpdateBytes() const{return raySceneUpdateBytes_;}std::uint64_t presents() const{return surface.presents();}std::uint64_t captures() const{return surface.captures();}
    std::optional<double> gpuTimeMs() const{return gpuMilliseconds;}
    std::uint64_t gpuTimingFrame() const{return timingSequence;}
    void releaseTransmission(){std::lock_guard<std::mutex> lock(gpu.mutex);std::array<ID3D11ShaderResourceView*,2> emptyViews{};gpu.context->PSSetShaderResources(44,2,emptyViews.data());transmissionView={};transmissionDepthView={};transmissionImage={};transmissionDepth={};transmissionWidth=transmissionHeight=transmissionMips=0;transmissionReady=false;}
    void captureTransmission(){
        if(!frame.transmission||!bloom.active()||activeProbe||active2D||activeShadow>=0)throw std::runtime_error("Transmission opaque pass required");
        std::lock_guard<std::mutex> lock(gpu.mutex);gpu.context->OMSetRenderTargets(0,nullptr,nullptr);ID3D11ShaderResourceView* empty=nullptr;gpu.context->PSSetShaderResources(44,1,&empty);
        if(transmissionWidth!=surface.width()||transmissionHeight!=surface.height()){D3D11_TEXTURE2D_DESC d{};d.Width=surface.width();d.Height=surface.height();d.MipLevels=0;d.ArraySize=d.SampleDesc.Count=1;d.Format=DXGI_FORMAT_R16G16B16A16_FLOAT;d.BindFlags=D3D11_BIND_SHADER_RESOURCE|D3D11_BIND_RENDER_TARGET;d.MiscFlags=D3D11_RESOURCE_MISC_GENERATE_MIPS;detail::Com<ID3D11Texture2D> image;detail::Com<ID3D11ShaderResourceView> view;detail::check(gpu.device->CreateTexture2D(&d,nullptr,&image.p),"Transmission HDR texture");detail::check(gpu.device->CreateShaderResourceView(image.p,nullptr,&view.p),"Transmission HDR view");image->GetDesc(&d);transmissionImage=std::move(image);transmissionView=std::move(view);transmissionWidth=d.Width;transmissionHeight=d.Height;transmissionMips=d.MipLevels;D3D11_TEXTURE2D_DESC depthDesc=d;depthDesc.MipLevels=1;depthDesc.Format=DXGI_FORMAT_R32_TYPELESS;depthDesc.BindFlags=D3D11_BIND_SHADER_RESOURCE;depthDesc.MiscFlags=0;detail::Com<ID3D11Texture2D> depthImage;detail::Com<ID3D11ShaderResourceView> depthView;detail::check(gpu.device->CreateTexture2D(&depthDesc,nullptr,&depthImage.p),"Transmission depth copy");D3D11_SHADER_RESOURCE_VIEW_DESC depthSrv{};depthSrv.Format=DXGI_FORMAT_R32_FLOAT;depthSrv.ViewDimension=D3D11_SRV_DIMENSION_TEXTURE2D;depthSrv.Texture2D.MipLevels=1;detail::check(gpu.device->CreateShaderResourceView(depthImage.p,&depthSrv,&depthView.p),"Transmission depth view");transmissionDepth=std::move(depthImage);transmissionDepthView=std::move(depthView);++transmissionAllocations_;}
        gpu.context->CopySubresourceRegion(transmissionImage.p,0,0,0,0,bloom.colorTexture(),0,nullptr);gpu.context->CopyResource(transmissionDepth.p,surface.depth.p);gpu.context->GenerateMips(transmissionView.p);transmissionReady=true;++transmissionCopies_;
    }
    std::uint64_t transmissionTextureBytes() const{std::uint64_t bytes=0;for(auto w=transmissionWidth,h=transmissionHeight;w&&h;w=std::max(1u,w/2),h=std::max(1u,h/2)){bytes+=std::uint64_t(w)*h*8;if(w==1&&h==1)break;}return bytes+std::uint64_t(transmissionWidth)*transmissionHeight*4;}
    std::uint64_t transmissionCopies() const{return transmissionCopies_;}std::uint64_t transmissionAllocations() const{return transmissionAllocations_;}
    void setPathEnvironment(const Texture* value){if(value&&(value->owner!=gpu.device.p||value->layers!=1||!value->width||!value->height))throw std::runtime_error("HDRI texture invalid");if(value){D3D11_SHADER_RESOURCE_VIEW_DESC d{};value->view->GetDesc(&d);if(d.ViewDimension!=D3D11_SRV_DIMENSION_TEXTURE2D||d.Format!=DXGI_FORMAT_R32G32B32A32_FLOAT)throw std::runtime_error("HDRI format invalid");}if(pathEnvironmentView.p==(value?value->view.p:nullptr))return;detail::Com<ID3D11ShaderResourceView> next;if(value){next.p=value->view.p;next.p->AddRef();}pathEnvironmentView=std::move(next);}
    void setGeometryScene(const Texture* value){if(value&&(value->owner!=gpu.device.p||value->layers!=1||!value->width||!value->height))throw std::runtime_error("Geometry GI texture invalid");if(value){D3D11_SHADER_RESOURCE_VIEW_DESC d{};value->view->GetDesc(&d);if(d.ViewDimension!=D3D11_SRV_DIMENSION_TEXTURE2D||d.Format!=DXGI_FORMAT_R32G32B32A32_FLOAT)throw std::runtime_error("Geometry GI format invalid");}if(geometrySceneView.p==(value?value->view.p:nullptr))return;detail::Com<ID3D11ShaderResourceView> next;if(value){next.p=value->view.p;next.p->AddRef();}geometrySceneView=std::move(next);}
    void setPostLookup(const Texture* value){if(value&&(value->owner!=gpu.device.p||value->layers!=1||value->height<2||value->height>64||value->width!=value->height*value->height))throw std::runtime_error("Post lookup texture owner/dimensions invalid");postLookupSize=value?value->height:0;if(postLookupView.p==(value?value->view.p:nullptr))return;detail::Com<ID3D11ShaderResourceView> next;if(value){next.p=value->view.p;next.p->AddRef();}postLookupView=std::move(next);}
    void releasePostProcess(){pathEnvironmentView={};geometrySceneView={};postLookupView={};postLookupSize=0;releaseTransmission();bloom.release();}
    std::array<std::uint64_t,9> shaderCompilationInfo()const{return bloom.compilationInfo();}
    void setAsyncShaderPreparation(bool value){bloom.setAsyncShaderPreparation(value);lightTiles.setAsyncPreparation(value);}
    auto shaderPreparationInfo()const{return bloom.shaderPreparationInfo();}
    void pollShaderPreparation(){pollRasterPreparation();bloom.pollShaderPreparation();}
    static void configureShaderCache(const std::filesystem::path& directory){detail::ShaderBytecodeCompiler::configure(directory);}
    std::array<std::uint64_t,10> shaderDiskCacheInfo()const{return detail::ShaderBytecodeCompiler::info();}
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
