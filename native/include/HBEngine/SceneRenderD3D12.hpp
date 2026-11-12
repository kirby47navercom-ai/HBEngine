#pragma once
// D3D12 port: SceneRenderer's own scene VS/PS on real D3D12 command lists.
// Phase 2: meshes, material constants, six material maps with sampler keys, lights, blend/depth/cull,
// viewport and scissor. Phase 3-1: shadow maps, instancing/shot positions, skinning/morphs, light tiles.
// Phase 3-2: reflection probe capture/filter (SceneProbes kernels), local probe bindings, sky HDRI,
// global probe atlas (SceneProbeAtlas packing/padding), baked lightmaps.
// Phase 3-3a: HDR scene target, bloom, post composite (grade/vignette/lens/bokeh/occlusion/exposure/LUT/FXAA),
// transmission capture, GPU mip generation. Phase 3-3b: screen effects (ScreenEffectsPass Resolve kernels: path/GI/SSR/
// SSGI/AO/TAA/motion blur/denoise/caustics), Hi-Z, MRT surface targets, motion vectors.
// Still D3D11-only: material programs, 2D, particles, dynamic mesh streams.
#include "SceneRender.hpp"
#include "D3D12Direct.hpp"
#if defined(_WIN32) && !defined(HB_COMPUTE_UNAVAILABLE)
#include <d3d11shader.h>
#include <map>

namespace hb::gpu::d3d12 {
// Root signature and null-filled descriptor tables built from shader reflection:
// one root CBV per cbuffer, one SRV table (t0..), one UAV table (u0..), static samplers.
class ReflectedLayout {
public:
    struct Srv {D3D12_SRV_DIMENSION dimension=D3D12_SRV_DIMENSION_TEXTURE2D;UINT stride=0;bool raw=false;};
    struct Uav {D3D12_UAV_DIMENSION dimension=D3D12_UAV_DIMENSION_TEXTURE2D;UINT stride=0;bool raw=false;};
    std::map<UINT,UINT> cbuffers;std::vector<Srv> srvs;std::vector<Uav> uavs;UINT samplers=0;Com<ID3D12RootSignature> root;UINT srvRoot=0,uavRoot=0;
    void reflect(const std::vector<unsigned char>& code){
        static const GUID id{0x8d536ca1,0x0cca,0x4956,{0xa8,0x37,0x78,0x69,0x63,0x75,0x55,0x84}};// d3dcompiler_47 IID_ID3D11ShaderReflection
        const auto reflectShader=detail::libraries().symbol<decltype(&D3DReflect)>(detail::libraries().compiler,"D3DReflect");
        Com<ID3D11ShaderReflection> r;check(reflectShader(code.data(),code.size(),id,reinterpret_cast<void**>(&r.p)),"Direct3D12 shader reflection");
        D3D11_SHADER_DESC desc{};check(r->GetDesc(&desc),"Direct3D12 shader description");
        for(UINT i=0;i<desc.BoundResources;i++){D3D11_SHADER_INPUT_BIND_DESC b{};check(r->GetResourceBindingDesc(i,&b),"Direct3D12 shader binding");const UINT end=b.BindPoint+b.BindCount;
            switch(b.Type){
            case D3D_SIT_CBUFFER:{D3D11_SHADER_BUFFER_DESC c{};check(r->GetConstantBufferByName(b.Name)->GetDesc(&c),"Direct3D12 constant buffer");auto& size=cbuffers[b.BindPoint];size=std::max(size,c.Size);break;}
            case D3D_SIT_SAMPLER:samplers=std::max(samplers,end);break;
            case D3D_SIT_TEXTURE:case D3D_SIT_STRUCTURED:case D3D_SIT_BYTEADDRESS:if(srvs.size()<end)srvs.resize(end);for(UINT k=b.BindPoint;k<end;k++){auto& v=srvs[k];v.raw=b.Type==D3D_SIT_BYTEADDRESS;v.stride=b.Type==D3D_SIT_STRUCTURED?b.NumSamples:0;v.dimension=b.Type==D3D_SIT_TEXTURE&&b.Dimension!=D3D_SRV_DIMENSION_BUFFER?static_cast<D3D12_SRV_DIMENSION>(b.Dimension):D3D12_SRV_DIMENSION_BUFFER;}break;
            case D3D_SIT_UAV_RWTYPED:case D3D_SIT_UAV_RWSTRUCTURED:case D3D_SIT_UAV_RWBYTEADDRESS:if(uavs.size()<end)uavs.resize(end);for(UINT k=b.BindPoint;k<end;k++){auto& v=uavs[k];v.raw=b.Type==D3D_SIT_UAV_RWBYTEADDRESS;v.stride=b.Type==D3D_SIT_UAV_RWSTRUCTURED?b.NumSamples:0;v.dimension=b.Type==D3D_SIT_UAV_RWTYPED&&b.Dimension!=D3D_SRV_DIMENSION_BUFFER?static_cast<D3D12_UAV_DIMENSION>(b.Dimension):D3D12_UAV_DIMENSION_BUFFER;}break;
            default:throw std::runtime_error("Direct3D12 shader uses an unsupported binding");}
        }
    }
    // Every reflected sampler register must be covered by staticSamplers (register = index).
    void build(Device& gpu,std::vector<D3D12_STATIC_SAMPLER_DESC> staticSamplers,bool inputLayout=false){
        if(staticSamplers.size()<samplers){throw std::runtime_error("Direct3D12 reflected sampler without a static sampler");}
        staticSamplers.resize(samplers);
        for(UINT i=0;i<samplers;i++){staticSamplers[i].ShaderRegister=i;staticSamplers[i].ShaderVisibility=D3D12_SHADER_VISIBILITY_ALL;}
        std::vector<D3D12_ROOT_PARAMETER> params;for(const auto& c:cbuffers){D3D12_ROOT_PARAMETER p{};p.ParameterType=D3D12_ROOT_PARAMETER_TYPE_CBV;p.Descriptor={c.first,0};p.ShaderVisibility=D3D12_SHADER_VISIBILITY_ALL;params.push_back(p);}
        const D3D12_DESCRIPTOR_RANGE srv{D3D12_DESCRIPTOR_RANGE_TYPE_SRV,UINT(srvs.size()),0,0,0},uav{D3D12_DESCRIPTOR_RANGE_TYPE_UAV,UINT(uavs.size()),0,0,0};
        D3D12_ROOT_PARAMETER table{};table.ParameterType=D3D12_ROOT_PARAMETER_TYPE_DESCRIPTOR_TABLE;table.ShaderVisibility=D3D12_SHADER_VISIBILITY_ALL;
        if(!srvs.empty()){table.DescriptorTable={1,&srv};srvRoot=UINT(params.size());params.push_back(table);}
        if(!uavs.empty()){table.DescriptorTable={1,&uav};uavRoot=UINT(params.size());params.push_back(table);}
        D3D12_ROOT_SIGNATURE_DESC rd{};rd.NumParameters=UINT(params.size());rd.pParameters=params.data();rd.NumStaticSamplers=samplers;rd.pStaticSamplers=staticSamplers.data();rd.Flags=inputLayout?D3D12_ROOT_SIGNATURE_FLAG_ALLOW_INPUT_ASSEMBLER_INPUT_LAYOUT:D3D12_ROOT_SIGNATURE_FLAG_NONE;root=gpu.rootSignature(rd);
    }
    static D3D12_SHADER_RESOURCE_VIEW_DESC nullSrv(const Srv& s){
        D3D12_SHADER_RESOURCE_VIEW_DESC v{};v.Shader4ComponentMapping=D3D12_DEFAULT_SHADER_4_COMPONENT_MAPPING;v.ViewDimension=s.dimension;v.Format=DXGI_FORMAT_R8G8B8A8_UNORM;
        switch(s.dimension){
        case D3D12_SRV_DIMENSION_BUFFER:v.Format=s.raw?DXGI_FORMAT_R32_TYPELESS:s.stride?DXGI_FORMAT_UNKNOWN:DXGI_FORMAT_R32G32B32A32_FLOAT;v.Buffer.NumElements=1;v.Buffer.StructureByteStride=s.stride;v.Buffer.Flags=s.raw?D3D12_BUFFER_SRV_FLAG_RAW:D3D12_BUFFER_SRV_FLAG_NONE;break;
        case D3D12_SRV_DIMENSION_TEXTURE2D:v.Texture2D.MipLevels=1;break;
        case D3D12_SRV_DIMENSION_TEXTURE2DARRAY:v.Texture2DArray.MipLevels=1;v.Texture2DArray.ArraySize=1;break;
        case D3D12_SRV_DIMENSION_TEXTURE3D:v.Texture3D.MipLevels=1;break;
        case D3D12_SRV_DIMENSION_TEXTURECUBE:v.TextureCube.MipLevels=1;break;
        case D3D12_SRV_DIMENSION_TEXTURECUBEARRAY:v.TextureCubeArray.MipLevels=1;v.TextureCubeArray.NumCubes=1;break;
        default:throw std::runtime_error("Direct3D12 shader resource dimension unsupported");}
        return v;
    }
    static D3D12_UNORDERED_ACCESS_VIEW_DESC nullUav(const Uav& u){
        D3D12_UNORDERED_ACCESS_VIEW_DESC v{};v.ViewDimension=u.dimension;v.Format=DXGI_FORMAT_R32G32B32A32_FLOAT;
        switch(u.dimension){
        case D3D12_UAV_DIMENSION_BUFFER:v.Format=u.raw?DXGI_FORMAT_R32_TYPELESS:u.stride?DXGI_FORMAT_UNKNOWN:DXGI_FORMAT_R32_FLOAT;v.Buffer.NumElements=1;v.Buffer.StructureByteStride=u.stride;v.Buffer.Flags=u.raw?D3D12_BUFFER_UAV_FLAG_RAW:D3D12_BUFFER_UAV_FLAG_NONE;break;
        case D3D12_UAV_DIMENSION_TEXTURE2DARRAY:v.Texture2DArray.ArraySize=1;break;
        case D3D12_UAV_DIMENSION_TEXTURE3D:v.Texture3D.WSize=1;break;
        case D3D12_UAV_DIMENSION_TEXTURE2D:break;
        default:throw std::runtime_error("Direct3D12 unordered access dimension unsupported");}
        return v;
    }
    DescriptorTable srvTable(Device& gpu)const{auto t=gpu.table(UINT(srvs.size()));for(UINT i=0;i<srvs.size();i++){const auto v=nullSrv(srvs[i]);gpu.device->CreateShaderResourceView(nullptr,&v,t.cpuAt(i));}return t;}
    DescriptorTable uavTable(Device& gpu)const{auto t=gpu.table(UINT(uavs.size()));for(UINT i=0;i<uavs.size();i++){const auto v=nullUav(uavs[i]);gpu.device->CreateUnorderedAccessView(nullptr,nullptr,&v,t.cpuAt(i));}return t;}
    // cbvs: register -> address; missing registers get a zero-filled upload.
    void apply(Device& gpu,bool compute,const std::map<UINT,D3D12_GPU_VIRTUAL_ADDRESS>& cbvs,const DescriptorTable* srvTableValue,const DescriptorTable* uavTableValue)const{
        auto* list=gpu.list.p;if(compute)list->SetComputeRootSignature(root.p);else list->SetGraphicsRootSignature(root.p);UINT index=0;
        for(const auto& c:cbuffers){auto found=cbvs.find(c.first);D3D12_GPU_VIRTUAL_ADDRESS at;if(found!=cbvs.end())at=found->second;else{auto u=gpu.upload(c.second,256);std::memset(u.cpu,0,c.second);at=u.gpu;}if(compute)list->SetComputeRootConstantBufferView(index++,at);else list->SetGraphicsRootConstantBufferView(index++,at);}
        if(srvTableValue){if(compute)list->SetComputeRootDescriptorTable(srvRoot,srvTableValue->gpu);else list->SetGraphicsRootDescriptorTable(srvRoot,srvTableValue->gpu);}
        if(uavTableValue){if(compute)list->SetComputeRootDescriptorTable(uavRoot,uavTableValue->gpu);else list->SetGraphicsRootDescriptorTable(uavRoot,uavTableValue->gpu);}
    }
    static D3D12_STATIC_SAMPLER_DESC linearClamp(){D3D12_STATIC_SAMPLER_DESC s{};s.Filter=D3D12_FILTER_MIN_MAG_MIP_LINEAR;s.AddressU=s.AddressV=s.AddressW=D3D12_TEXTURE_ADDRESS_MODE_CLAMP;s.MaxLOD=D3D12_FLOAT32_MAX;s.ComparisonFunc=D3D12_COMPARISON_FUNC_NEVER;return s;}
};

// Same 2x2 linear downsample as D3D11 GenerateMips; sRGB levels are written through a UNORM view.
inline constexpr const char* mipShader=R"HLSL(
cbuffer Mip:register(b0){uint4 info;};Texture2D<float4> source:register(t0);RWTexture2D<float4> destination:register(u0);SamplerState linearClamp:register(s0);
float3 toSrgb(float3 v){return lerp(12.92*v,1.055*pow(max(v,0),1.0/2.4)-.055,step(.0031308,v));}
[numthreads(8,8,1)]void Down(uint3 id:SV_DispatchThreadID){if(any(id.xy>=info.xy))return;float4 c=source.SampleLevel(linearClamp,(id.xy+.5)/float2(info.xy),0);destination[id.xy]=info.z?float4(toSrgb(c.rgb),c.a):c;}
)HLSL";

class SceneMeshRenderer {
public:
    struct Mesh {Buffer vertices,indices,uv1;UINT count=0,vertexCount=0;};
    struct Texture : d3d12::Texture {D3D12_CPU_DESCRIPTOR_HANDLE srv{};UINT mips=1;};
    struct Instances {Buffer data,previous;std::vector<Matrix> previousValues;UINT capacity=0,count=0,stride=sizeof(SceneInstance);bool mirrored=false;
        bool positionsOnly()const{return stride==16;}std::uint32_t capacityCount()const{return capacity;}};
    struct Deformation {Buffer skin,morph,pose,previousPose;std::uint32_t vertexCount=0,boneCount=0,morphCount=0,poseBytes=0;std::vector<float> current,previous;};
    // HDR cube capture (R16G16B16A16F), prefiltered mip chain, 9 SH irradiance coefficients.
    struct Probe {d3d12::Texture capture,filtered,depth;Buffer coefficients;std::array<D3D12_CPU_DESCRIPTOR_HANDLE,6> faces{};D3D12_CPU_DESCRIPTOR_HANDLE source{},view{},irradiance{};UINT size=0,mips=0;bool ready=false;std::uint64_t identity=0,revision=0;
        bool available()const{return ready;}};
    struct ProbeBinding {const Probe* resource=nullptr;ProbeSettings settings;};
private:
    static constexpr D3D12_RESOURCE_STATES readable=D3D12_RESOURCE_STATE_NON_PIXEL_SHADER_RESOURCE|D3D12_RESOURCE_STATE_PIXEL_SHADER_RESOURCE;
    using Constants=SceneRenderer::Constants;
    struct Slot {D3D12_SRV_DIMENSION dimension=D3D12_SRV_DIMENSION_TEXTURE2D;UINT stride=0;bool raw=false;};
    Device& gpu;UINT width,height;
    std::vector<unsigned char> vs,ps,shadowPs,surfacePs;Com<ID3D12RootSignature> root;std::array<Com<ID3D12PipelineState>,144> pipelines;std::map<UINT,Com<ID3D12PipelineState>> surfacePipelines;std::array<Com<ID3D12PipelineState>,6> shadowPipelines;
    std::map<UINT,UINT> cbuffers;std::vector<Slot> slots;UINT samplerCount=0,srvRoot=0,samplerRoot=0;
    Com<ID3D12DescriptorHeap> nulls;DescriptorPool views;
    std::map<std::vector<std::uint32_t>,D3D12_GPU_DESCRIPTOR_HANDLE> samplerTables;UINT samplerUsed=0;
    d3d12::Texture color,depth;SceneFrame frame;bool begun=false;
    std::vector<SceneLight> lights;std::uint64_t uploaded=~std::uint64_t(0);std::map<UINT,D3D12_GPU_VIRTUAL_ADDRESS> frameBuffers;Upload lightData{};
    // Shadow array: one DSV per layer, sampled as t24 with matrices in t25.
    d3d12::Texture shadowImage;Com<ID3D12DescriptorHeap> shadowTargets;UINT dsvStride=0;D3D12_CPU_DESCRIPTOR_HANDLE shadowView{},shadowDataView{};Buffer shadowBuffer;
    std::vector<SceneShadow> shadows;UINT shadowWidth=0,shadowHeight=0;int activeShadow=-1;SceneFrame shadowFrame;
    // Light tiles: SceneLightTiles' compute shader, bits in t48, settings in b3.
    Com<ID3D12RootSignature> tileRoot;Com<ID3D12PipelineState> tilePipeline;Buffer tileBits;bool tilesActive=false;SceneLightTiles::Settings tileSettings{};
    // Probe filtering: SceneProbes' Prefilter/Integrate/Diffuse/Equirect kernels, BRDF LUT in t43.
    Com<ID3D12RootSignature> probeRoot;std::array<Com<ID3D12PipelineState>,4> probeKernels;d3d12::Texture brdf;D3D12_CPU_DESCRIPTOR_HANDLE brdfView{};
    Probe* activeProbe=nullptr;bool probeIndirect=false;UINT probeFace=0;SceneFrame savedProbe;
    Probe skyProbe;const Texture* skySource=nullptr;std::uint32_t skySize=0;ProbeSettings skySettings{};std::uint64_t probeIdentities=0;
    // HDR scene + BloomPass port (same shaderCode, constants and level chain).
    struct Image {d3d12::Texture texture;D3D12_CPU_DESCRIPTOR_HANDLE rtv{};};
    ReflectedLayout bloomCompute,bloomGraphics,mipLayout;Com<ID3D12PipelineState> extractKernel,blurKernel,meterKernel,compositePipeline,fxaaPipeline,mipKernel;
    Image hdr,aaImage;std::vector<std::array<Image,2>> levels;std::array<Image,2> exposureImages;std::size_t exposureIndex=0;bool exposureValid=false,hdrPending=false;
    SceneBloom bloomSettings;ScenePostProcess post;std::array<float,4> postArea{};const Texture* postLookup=nullptr;
    // Transmission: HDR opaque copy with mips (t44) and depth copy (t45).
    d3d12::Texture transmissionImage,transmissionDepth;D3D12_CPU_DESCRIPTOR_HANDLE transmissionView{},transmissionDepthView{};UINT transmissionMips=0;bool transmissionReady=false;
    // Screen effects: ScreenEffectsPass sources/validation, same image set, Resolve stages 0..5, Hi-Z atlas.
    std::optional<SceneScreenEffects> screen;std::vector<RayProgram> rayPrograms;std::string raySource,rayDefines;bool raySourceReady=false;
    ReflectedLayout screenLayout,hizLayout;std::map<std::string,Com<ID3D12PipelineState>> screenKernels;Com<ID3D12PipelineState> hizKernel;
    Image surfaceNormal,surfaceAlbedo,surfaceMotion,surfaceAmbient,denoiseGuide,denoiseAux,photons,denoisePreviousGuide;std::array<Image,2> history,filtered,denoiseHistory;
    std::size_t historyIndex=0,filterIndex=0;bool historyValid=false,filterValid=false;std::array<float,4> lastFilter{},lastDenoise{},lastLens{},lastGeometryRecords{},lastEye{};std::array<float,16> lastVP{};
    std::vector<Image> hizLevels;Image hizAtlas;std::array<UINT,2> hizSize{};std::array<D3D12_CPU_DESCRIPTOR_HANDLE,4> nullTargets{};
    const Texture *geometryScene=nullptr,*pathEnvironment=nullptr,*distanceField=nullptr;
    // Global probe atlas: t50 image, t51 records + spatial index, t52 SH. ponytail: any change rebuilds the whole atlas; port DX11's incremental paths if profiling asks.
    d3d12::Texture atlasImage;Buffer atlasTable,atlasSH;D3D12_CPU_DESCRIPTOR_HANDLE atlasView{},atlasTableView{},atlasSHView{};UINT atlasCount=0;bool atlasInfluence=false;
    std::vector<std::array<std::uint64_t,2>> atlasStamps;std::vector<ProbeSettings> atlasSettings;ProbeSpatialIndex atlasSpatial;Com<ID3D12RootSignature> paddingRoot;Com<ID3D12PipelineState> paddingKernel;

    void reflect(const std::vector<unsigned char>& code){
        // d3dcompiler_47's IID_ID3D11ShaderReflection.
        static const GUID id{0x8d536ca1,0x0cca,0x4956,{0xa8,0x37,0x78,0x69,0x63,0x75,0x55,0x84}};
        const auto reflectShader=detail::libraries().symbol<decltype(&D3DReflect)>(detail::libraries().compiler,"D3DReflect");
        Com<ID3D11ShaderReflection> r;check(reflectShader(code.data(),code.size(),id,reinterpret_cast<void**>(&r.p)),"Direct3D12 scene shader reflection");
        D3D11_SHADER_DESC desc{};check(r->GetDesc(&desc),"Direct3D12 scene shader description");
        for(UINT i=0;i<desc.BoundResources;i++){
            D3D11_SHADER_INPUT_BIND_DESC b{};check(r->GetResourceBindingDesc(i,&b),"Direct3D12 scene shader binding");
            if(b.Type==D3D_SIT_CBUFFER){D3D11_SHADER_BUFFER_DESC c{};check(r->GetConstantBufferByName(b.Name)->GetDesc(&c),"Direct3D12 scene constant buffer");auto& size=cbuffers[b.BindPoint];size=std::max(size,c.Size);}
            else if(b.Type==D3D_SIT_SAMPLER)samplerCount=std::max(samplerCount,b.BindPoint+b.BindCount);
            else if(b.Type==D3D_SIT_TEXTURE||b.Type==D3D_SIT_STRUCTURED||b.Type==D3D_SIT_BYTEADDRESS){
                if(slots.size()<b.BindPoint+b.BindCount)slots.resize(b.BindPoint+b.BindCount);
                for(UINT k=0;k<b.BindCount;k++){auto& s=slots[b.BindPoint+k];s.raw=b.Type==D3D_SIT_BYTEADDRESS;s.stride=b.Type==D3D_SIT_STRUCTURED?b.NumSamples:0;s.dimension=b.Type==D3D_SIT_TEXTURE&&b.Dimension!=D3D_SRV_DIMENSION_BUFFER?static_cast<D3D12_SRV_DIMENSION>(b.Dimension):D3D12_SRV_DIMENSION_BUFFER;}
            }else throw std::runtime_error("Direct3D12 scene shader uses an unsupported binding");
        }
    }
    static D3D12_SHADER_RESOURCE_VIEW_DESC nullView(const Slot& s){
        D3D12_SHADER_RESOURCE_VIEW_DESC v{};v.Shader4ComponentMapping=D3D12_DEFAULT_SHADER_4_COMPONENT_MAPPING;v.ViewDimension=s.dimension;v.Format=DXGI_FORMAT_R8G8B8A8_UNORM;
        switch(s.dimension){
        case D3D12_SRV_DIMENSION_BUFFER:v.Format=s.raw?DXGI_FORMAT_R32_TYPELESS:s.stride?DXGI_FORMAT_UNKNOWN:DXGI_FORMAT_R32G32B32A32_FLOAT;v.Buffer.NumElements=1;v.Buffer.StructureByteStride=s.stride;v.Buffer.Flags=s.raw?D3D12_BUFFER_SRV_FLAG_RAW:D3D12_BUFFER_SRV_FLAG_NONE;break;
        case D3D12_SRV_DIMENSION_TEXTURE2D:v.Texture2D.MipLevels=1;break;
        case D3D12_SRV_DIMENSION_TEXTURE2DARRAY:v.Texture2DArray.MipLevels=1;v.Texture2DArray.ArraySize=1;break;
        case D3D12_SRV_DIMENSION_TEXTURE3D:v.Texture3D.MipLevels=1;break;
        case D3D12_SRV_DIMENSION_TEXTURECUBE:v.TextureCube.MipLevels=1;break;
        case D3D12_SRV_DIMENSION_TEXTURECUBEARRAY:v.TextureCubeArray.MipLevels=1;v.TextureCubeArray.NumCubes=1;break;
        default:throw std::runtime_error("Direct3D12 scene shader resource dimension unsupported");
        }
        return v;
    }
    // Same sampler key encoding as SceneRenderer::samplerState.
    static D3D12_SAMPLER_DESC samplerDesc(std::uint32_t key){
        D3D12_SAMPLER_DESC s{};s.MaxLOD=D3D12_FLOAT32_MAX;s.MaxAnisotropy=1;s.ComparisonFunc=D3D12_COMPARISON_FUNC_NEVER;
        if(key>=54&&(!(key&65536u)||(key&~81919u)||(key&127u)>=54u))throw std::runtime_error("Scene sampler ID invalid");
        const auto base=key&127u;const bool pointMin=key<54?base%2!=0:(key&128u)!=0,pointMag=base%2!=0,linearMip=key<54?base%2==0:(key&512u)!=0;const UINT anisotropy=key<54?1u:1u+((key>>10u)&15u);
        s.Filter=anisotropy>1?D3D12_FILTER_ANISOTROPIC:D3D12_ENCODE_BASIC_FILTER(pointMin?D3D12_FILTER_TYPE_POINT:D3D12_FILTER_TYPE_LINEAR,pointMag?D3D12_FILTER_TYPE_POINT:D3D12_FILTER_TYPE_LINEAR,linearMip?D3D12_FILTER_TYPE_LINEAR:D3D12_FILTER_TYPE_POINT,D3D12_FILTER_REDUCTION_TYPE_STANDARD);
        s.AddressU=static_cast<D3D12_TEXTURE_ADDRESS_MODE>(1+(base/2)%3);s.AddressV=static_cast<D3D12_TEXTURE_ADDRESS_MODE>(1+(base/6)%3);s.AddressW=static_cast<D3D12_TEXTURE_ADDRESS_MODE>(1+base/18);s.MaxAnisotropy=anisotropy;if(key>=54&&(key&256u))s.MaxLOD=0;
        return s;
    }
    D3D12_GPU_DESCRIPTOR_HANDLE samplerTable(const std::vector<std::uint32_t>& keys){
        const auto found=samplerTables.find(keys);if(found!=samplerTables.end())return found->second;
        // ponytail: tables are immutable; a full heap waits for the GPU once and starts over.
        if(samplerUsed+samplerCount>SamplerCapacity){gpu.end();gpu.waitIdle();gpu.begin();samplerTables.clear();samplerUsed=0;}
        const auto cpu=gpu.samplers->GetCPUDescriptorHandleForHeapStart();auto at=gpu.samplers->GetGPUDescriptorHandleForHeapStart();
        for(UINT i=0;i<samplerCount;i++){const auto d=samplerDesc(keys[i]);gpu.device->CreateSampler(&d,{cpu.ptr+SIZE_T(samplerUsed+i)*gpu.samplerStride});}
        at.ptr+=UINT64(samplerUsed)*gpu.samplerStride;samplerUsed+=samplerCount;return samplerTables[keys]=at;
    }
    // Screen-effect MRT: color, normal, albedo, motion, ambient (SceneRenderer::surfaceShader outputs).
    // targets: bit i set when surface target i+1 exists; absent targets are UNKNOWN slots bound to null RTVs.
    ID3D12PipelineState* surfacePipeline(std::size_t raster,std::size_t blend,std::size_t depthMode,UINT targets){
        auto& p=surfacePipelines[UINT(raster+6*(blend+3*depthMode))+72u*targets];if(p.p)return p.p;
        static const D3D12_INPUT_ELEMENT_DESC elements[]={{"POSITION",0,DXGI_FORMAT_R32G32B32_FLOAT,0,0,D3D12_INPUT_CLASSIFICATION_PER_VERTEX_DATA,0},{"NORMAL",0,DXGI_FORMAT_R32G32B32_FLOAT,0,12,D3D12_INPUT_CLASSIFICATION_PER_VERTEX_DATA,0},{"TEXCOORD",0,DXGI_FORMAT_R32G32_FLOAT,0,24,D3D12_INPUT_CLASSIFICATION_PER_VERTEX_DATA,0},{"COLOR",0,DXGI_FORMAT_R32G32B32A32_FLOAT,0,32,D3D12_INPUT_CLASSIFICATION_PER_VERTEX_DATA,0},{"TEXCOORD",1,DXGI_FORMAT_R32G32_FLOAT,1,0,D3D12_INPUT_CLASSIFICATION_PER_VERTEX_DATA,0}};
        auto d=Device::defaults(root.p,vs,surfacePs,DXGI_FORMAT_R16G16B16A16_FLOAT,DXGI_FORMAT_D32_FLOAT);d.InputLayout={elements,5};d.NumRenderTargets=5;for(UINT i=1;i<5;i++)d.RTVFormats[i]=(targets>>(i-1))&1?DXGI_FORMAT_R16G16B16A16_FLOAT:DXGI_FORMAT_UNKNOWN;
        d.RasterizerState.CullMode=raster%3==0?D3D12_CULL_MODE_BACK:raster%3==1?D3D12_CULL_MODE_FRONT:D3D12_CULL_MODE_NONE;d.RasterizerState.FrontCounterClockwise=raster<3;
        // IndependentBlendEnable stays FALSE: RT0's blend applies to every target, as with the D3D11 blend state.
        auto& t=d.BlendState.RenderTarget[0];t.BlendEnable=blend!=2;t.SrcBlend=D3D12_BLEND_SRC_ALPHA;t.DestBlend=blend==1?D3D12_BLEND_ONE:D3D12_BLEND_INV_SRC_ALPHA;t.BlendOp=D3D12_BLEND_OP_ADD;t.SrcBlendAlpha=D3D12_BLEND_ONE;t.DestBlendAlpha=D3D12_BLEND_INV_SRC_ALPHA;t.BlendOpAlpha=D3D12_BLEND_OP_ADD;t.LogicOp=D3D12_LOGIC_OP_NOOP;
        d.DepthStencilState.DepthEnable=TRUE;d.DepthStencilState.DepthFunc=(depthMode&1)?D3D12_COMPARISON_FUNC_LESS_EQUAL:D3D12_COMPARISON_FUNC_ALWAYS;d.DepthStencilState.DepthWriteMask=(depthMode&2)?D3D12_DEPTH_WRITE_MASK_ALL:D3D12_DEPTH_WRITE_MASK_ZERO;
        p=gpu.pipeline(d);return p.p;
    }
    ID3D12PipelineState* pipeline(std::size_t raster,std::size_t blend,std::size_t depthMode,bool hdr=false){
        auto& p=pipelines[raster+6*(blend+3*depthMode)+(hdr?72:0)];if(p.p)return p.p;
        static const D3D12_INPUT_ELEMENT_DESC elements[]={{"POSITION",0,DXGI_FORMAT_R32G32B32_FLOAT,0,0,D3D12_INPUT_CLASSIFICATION_PER_VERTEX_DATA,0},{"NORMAL",0,DXGI_FORMAT_R32G32B32_FLOAT,0,12,D3D12_INPUT_CLASSIFICATION_PER_VERTEX_DATA,0},{"TEXCOORD",0,DXGI_FORMAT_R32G32_FLOAT,0,24,D3D12_INPUT_CLASSIFICATION_PER_VERTEX_DATA,0},{"COLOR",0,DXGI_FORMAT_R32G32B32A32_FLOAT,0,32,D3D12_INPUT_CLASSIFICATION_PER_VERTEX_DATA,0},{"TEXCOORD",1,DXGI_FORMAT_R32G32_FLOAT,1,0,D3D12_INPUT_CLASSIFICATION_PER_VERTEX_DATA,0}};
        auto d=Device::defaults(root.p,vs,ps,hdr?DXGI_FORMAT_R16G16B16A16_FLOAT:DXGI_FORMAT_R8G8B8A8_UNORM,DXGI_FORMAT_D32_FLOAT);d.InputLayout={elements,5};
        d.RasterizerState.CullMode=raster%3==0?D3D12_CULL_MODE_BACK:raster%3==1?D3D12_CULL_MODE_FRONT:D3D12_CULL_MODE_NONE;d.RasterizerState.FrontCounterClockwise=raster<3;
        auto& t=d.BlendState.RenderTarget[0];t.BlendEnable=blend!=2;t.SrcBlend=D3D12_BLEND_SRC_ALPHA;t.DestBlend=blend==1?D3D12_BLEND_ONE:D3D12_BLEND_INV_SRC_ALPHA;t.BlendOp=D3D12_BLEND_OP_ADD;t.SrcBlendAlpha=D3D12_BLEND_ONE;t.DestBlendAlpha=D3D12_BLEND_INV_SRC_ALPHA;t.BlendOpAlpha=D3D12_BLEND_OP_ADD;t.LogicOp=D3D12_LOGIC_OP_NOOP;
        d.DepthStencilState.DepthEnable=TRUE;d.DepthStencilState.DepthFunc=(depthMode&1)?D3D12_COMPARISON_FUNC_LESS_EQUAL:D3D12_COMPARISON_FUNC_ALWAYS;d.DepthStencilState.DepthWriteMask=(depthMode&2)?D3D12_DEPTH_WRITE_MASK_ALL:D3D12_DEPTH_WRITE_MASK_ZERO;
        p=gpu.pipeline(d);return p.p;
    }
    ID3D12PipelineState* shadowPipeline(std::size_t raster){
        auto& p=shadowPipelines[raster];if(p.p)return p.p;
        auto d=Device::defaults(root.p,vs,shadowPs,DXGI_FORMAT_UNKNOWN,DXGI_FORMAT_D32_FLOAT);d.NumRenderTargets=0;
        static const D3D12_INPUT_ELEMENT_DESC elements[]={{"POSITION",0,DXGI_FORMAT_R32G32B32_FLOAT,0,0,D3D12_INPUT_CLASSIFICATION_PER_VERTEX_DATA,0},{"NORMAL",0,DXGI_FORMAT_R32G32B32_FLOAT,0,12,D3D12_INPUT_CLASSIFICATION_PER_VERTEX_DATA,0},{"TEXCOORD",0,DXGI_FORMAT_R32G32_FLOAT,0,24,D3D12_INPUT_CLASSIFICATION_PER_VERTEX_DATA,0},{"COLOR",0,DXGI_FORMAT_R32G32B32A32_FLOAT,0,32,D3D12_INPUT_CLASSIFICATION_PER_VERTEX_DATA,0},{"TEXCOORD",1,DXGI_FORMAT_R32G32_FLOAT,1,0,D3D12_INPUT_CLASSIFICATION_PER_VERTEX_DATA,0}};d.InputLayout={elements,5};
        auto& rs=d.RasterizerState;rs.CullMode=raster%3==0?D3D12_CULL_MODE_BACK:raster%3==1?D3D12_CULL_MODE_FRONT:D3D12_CULL_MODE_NONE;rs.FrontCounterClockwise=raster<3;rs.SlopeScaledDepthBias=1;rs.DepthBiasClamp=.01f;
        p=gpu.pipeline(d);return p.p;
    }
    void structured(const DescriptorTable& t,UINT slot,const Buffer& b,UINT stride,UINT count){
        D3D12_SHADER_RESOURCE_VIEW_DESC v{};v.Shader4ComponentMapping=D3D12_DEFAULT_SHADER_4_COMPONENT_MAPPING;v.ViewDimension=D3D12_SRV_DIMENSION_BUFFER;v.Buffer.NumElements=count;v.Buffer.StructureByteStride=stride;gpu.device->CreateShaderResourceView(b.get(),&v,t.cpuAt(slot));
    }
    // Same dispatch as SceneLightTiles::prepare, recomputed every begin().
    void cullLights(const std::array<float,4>& rect){
        tilesActive=false;const UINT count=UINT(lights.size());if(!frame.rasterLightCulling||count<16)return;
        const UINT x=static_cast<UINT>(std::ceil(rect[2]/16)),y=static_cast<UINT>(std::ceil(rect[3]/16)),words=(count+31)/32;const std::uint64_t entries=std::uint64_t(x)*y*words;
        if(!x||!y||entries>UINT_MAX/4||((words+31)/32)>65535||x>65535||y>65535)return;
        if(!tilePipeline.p){
            D3D12_ROOT_PARAMETER params[3]{};params[0].ParameterType=D3D12_ROOT_PARAMETER_TYPE_CBV;params[1].ParameterType=D3D12_ROOT_PARAMETER_TYPE_SRV;params[2].ParameterType=D3D12_ROOT_PARAMETER_TYPE_UAV;for(auto& p:params)p.ShaderVisibility=D3D12_SHADER_VISIBILITY_ALL;
            D3D12_ROOT_SIGNATURE_DESC rd{};rd.NumParameters=3;rd.pParameters=params;tileRoot=gpu.rootSignature(rd);tilePipeline=gpu.computePipeline(tileRoot.p,Device::shader(SceneLightTiles::source,"HBLightTiles","Cull","cs_5_0"));
        }
        if(tileBits.size!=entries*4){if(tileBits.value.p)gpu.retire(std::move(tileBits.value));tileBits=gpu.buffer(entries*4,D3D12_RESOURCE_STATE_UNORDERED_ACCESS,D3D12_RESOURCE_FLAG_ALLOW_UNORDERED_ACCESS);}
        tileSettings={frame.viewProjection,rect,{x,y,words,count}};tilesActive=true;uploadFrame();
        gpu.transition(tileBits,D3D12_RESOURCE_STATE_UNORDERED_ACCESS);auto* list=gpu.list.p;list->SetComputeRootSignature(tileRoot.p);list->SetPipelineState(tilePipeline.p);
        list->SetComputeRootConstantBufferView(0,frameBuffers.at(3));list->SetComputeRootShaderResourceView(1,lightData.gpu);list->SetComputeRootUnorderedAccessView(2,tileBits.address());list->Dispatch((words+31)/32,x,y);
        gpu.transition(tileBits,readable);
    }
    // Kernel order: Prefilter, Integrate, Diffuse, Equirect. Root: b0 CBV, t0..t1 table, u0..u2 table, static s0 (clamp) and s1 (wrap U).
    void prepareProbes(){
        if(brdfView.ptr)return;
        const D3D12_DESCRIPTOR_RANGE srv{D3D12_DESCRIPTOR_RANGE_TYPE_SRV,2,0,0,0},uav{D3D12_DESCRIPTOR_RANGE_TYPE_UAV,3,0,0,0};
        D3D12_ROOT_PARAMETER params[3]{};params[0].ParameterType=D3D12_ROOT_PARAMETER_TYPE_CBV;params[1].ParameterType=params[2].ParameterType=D3D12_ROOT_PARAMETER_TYPE_DESCRIPTOR_TABLE;params[1].DescriptorTable={1,&srv};params[2].DescriptorTable={1,&uav};
        D3D12_STATIC_SAMPLER_DESC samplers[2]{};for(UINT i=0;i<2;i++){auto& t=samplers[i];t.Filter=D3D12_FILTER_MIN_MAG_MIP_LINEAR;t.AddressU=i?D3D12_TEXTURE_ADDRESS_MODE_WRAP:D3D12_TEXTURE_ADDRESS_MODE_CLAMP;t.AddressV=t.AddressW=D3D12_TEXTURE_ADDRESS_MODE_CLAMP;t.MaxLOD=D3D12_FLOAT32_MAX;t.ShaderRegister=i;t.ShaderVisibility=D3D12_SHADER_VISIBILITY_ALL;t.ComparisonFunc=D3D12_COMPARISON_FUNC_NEVER;}
        D3D12_ROOT_SIGNATURE_DESC rd{};rd.NumParameters=3;rd.pParameters=params;rd.NumStaticSamplers=2;rd.pStaticSamplers=samplers;probeRoot=gpu.rootSignature(rd);
        const char* names[]={"Prefilter","Integrate","Diffuse","Equirect"};for(std::size_t i=0;i<4;i++)probeKernels[i]=gpu.computePipeline(probeRoot.p,Device::shader(SceneProbes::shader,"HBProbeFilter",names[i],"cs_5_0"));
        D3D12_RESOURCE_DESC d{};d.Dimension=D3D12_RESOURCE_DIMENSION_TEXTURE2D;d.Width=d.Height=128;d.DepthOrArraySize=1;d.MipLevels=1;d.Format=DXGI_FORMAT_R32G32_FLOAT;d.SampleDesc.Count=1;d.Flags=D3D12_RESOURCE_FLAG_ALLOW_UNORDERED_ACCESS;
        brdf.value=gpu.committed(D3D12_HEAP_TYPE_DEFAULT,d,D3D12_RESOURCE_STATE_UNORDERED_ACCESS,nullptr,"Direct3D12 probe BRDF");brdf.state=D3D12_RESOURCE_STATE_UNORDERED_ACCESS;brdf.width=brdf.height=128;brdf.format=d.Format;
        D3D12_UNORDERED_ACCESS_VIEW_DESC u{};u.Format=d.Format;u.ViewDimension=D3D12_UAV_DIMENSION_TEXTURE2D;
        probeDispatch(1,{0,0,0,0},nullptr,nullptr,nullptr,nullptr,brdf.get(),&u,16,16,1);
        gpu.transition(brdf,readable);brdfView=views.take();gpu.device->CreateShaderResourceView(brdf.get(),nullptr,brdfView);
    }
    // Null descriptors fill every unbound kernel slot.
    void probeDispatch(std::size_t kernel,const std::array<float,4>& settings,const D3D12_CPU_DESCRIPTOR_HANDLE* cube,const D3D12_CPU_DESCRIPTOR_HANDLE* panorama,ID3D12Resource* u0,const D3D12_UNORDERED_ACCESS_VIEW_DESC* u0Desc,ID3D12Resource* u2,const D3D12_UNORDERED_ACCESS_VIEW_DESC* u2Desc,UINT x,UINT y,UINT z,ID3D12Resource* u1=nullptr){
        auto srvs=gpu.table(2),uavs=gpu.table(3);
        D3D12_SHADER_RESOURCE_VIEW_DESC s{};s.Shader4ComponentMapping=D3D12_DEFAULT_SHADER_4_COMPONENT_MAPPING;s.Format=DXGI_FORMAT_R16G16B16A16_FLOAT;s.ViewDimension=D3D12_SRV_DIMENSION_TEXTURECUBE;s.TextureCube.MipLevels=1;
        if(cube)gpu.device->CopyDescriptorsSimple(1,srvs.cpuAt(0),*cube,D3D12_DESCRIPTOR_HEAP_TYPE_CBV_SRV_UAV);else gpu.device->CreateShaderResourceView(nullptr,&s,srvs.cpuAt(0));
        s.ViewDimension=D3D12_SRV_DIMENSION_TEXTURE2D;s.Texture2D.MipLevels=1;
        if(panorama)gpu.device->CopyDescriptorsSimple(1,srvs.cpuAt(1),*panorama,D3D12_DESCRIPTOR_HEAP_TYPE_CBV_SRV_UAV);else gpu.device->CreateShaderResourceView(nullptr,&s,srvs.cpuAt(1));
        D3D12_UNORDERED_ACCESS_VIEW_DESC n0{};n0.Format=DXGI_FORMAT_R16G16B16A16_FLOAT;n0.ViewDimension=D3D12_UAV_DIMENSION_TEXTURE2DARRAY;n0.Texture2DArray.ArraySize=1;
        D3D12_UNORDERED_ACCESS_VIEW_DESC n1{};n1.ViewDimension=D3D12_UAV_DIMENSION_BUFFER;n1.Buffer.NumElements=9;n1.Buffer.StructureByteStride=16;
        D3D12_UNORDERED_ACCESS_VIEW_DESC n2{};n2.Format=DXGI_FORMAT_R32G32_FLOAT;n2.ViewDimension=D3D12_UAV_DIMENSION_TEXTURE2D;
        gpu.device->CreateUnorderedAccessView(u0,nullptr,u0?u0Desc:&n0,uavs.cpuAt(0));gpu.device->CreateUnorderedAccessView(u1,nullptr,&n1,uavs.cpuAt(1));gpu.device->CreateUnorderedAccessView(u2,nullptr,u2?u2Desc:&n2,uavs.cpuAt(2));
        auto* list=gpu.list.p;list->SetComputeRootSignature(probeRoot.p);list->SetPipelineState(probeKernels[kernel].p);list->SetComputeRootConstantBufferView(0,gpu.constants(settings.data(),16));
        list->SetComputeRootDescriptorTable(1,srvs.gpu);list->SetComputeRootDescriptorTable(2,uavs.gpu);list->Dispatch(x,y,z);
    }
    void filterStepInternal(Probe& target,std::uint32_t stage){
        if(stage==0){target.ready=false;gpu.transition(target.capture,D3D12_RESOURCE_STATE_COPY_SOURCE);gpu.transition(target.filtered,D3D12_RESOURCE_STATE_COPY_DEST);
            for(UINT f=0;f<6;f++){D3D12_TEXTURE_COPY_LOCATION dst{},src{};dst.pResource=target.filtered.get();dst.Type=src.Type=D3D12_TEXTURE_COPY_TYPE_SUBRESOURCE_INDEX;dst.SubresourceIndex=f*target.mips;src.pResource=target.capture.get();src.SubresourceIndex=f;gpu.list->CopyTextureRegion(&dst,0,0,0,&src,nullptr);}
            gpu.transition(target.filtered,readable);return;}
        gpu.transition(target.capture,readable);
        if(stage<target.mips){
            gpu.transition(target.filtered,D3D12_RESOURCE_STATE_UNORDERED_ACCESS);D3D12_UNORDERED_ACCESS_VIEW_DESC u{};u.Format=DXGI_FORMAT_R16G16B16A16_FLOAT;u.ViewDimension=D3D12_UAV_DIMENSION_TEXTURE2DARRAY;u.Texture2DArray.MipSlice=stage;u.Texture2DArray.ArraySize=6;
            const UINT edge=target.size>>stage;probeDispatch(0,{float(edge),float(stage)/float(target.mips-1),0,0},&target.source,nullptr,target.filtered.get(),&u,nullptr,nullptr,(edge+7)/8,(edge+7)/8,6);gpu.transition(target.filtered,readable);
        }else{gpu.transition(target.coefficients,D3D12_RESOURCE_STATE_UNORDERED_ACCESS);probeDispatch(2,{0,0,0,0},&target.source,nullptr,nullptr,nullptr,nullptr,nullptr,1,1,1,target.coefficients.get());gpu.transition(target.coefficients,readable);target.ready=true;++target.revision;}
    }
    Image image(UINT w,UINT h,bool renderTarget,DXGI_FORMAT format=DXGI_FORMAT_R16G16B16A16_FLOAT,UINT mips=1){
        D3D12_RESOURCE_DESC d{};d.Dimension=D3D12_RESOURCE_DIMENSION_TEXTURE2D;d.Width=w;d.Height=h;d.DepthOrArraySize=1;d.MipLevels=UINT16(mips);d.Format=format;d.SampleDesc.Count=1;d.Flags=renderTarget?D3D12_RESOURCE_FLAG_ALLOW_RENDER_TARGET:D3D12_RESOURCE_FLAG_ALLOW_UNORDERED_ACCESS;
        Image out;out.texture.value=gpu.committed(D3D12_HEAP_TYPE_DEFAULT,d,readable,nullptr,"Direct3D12 post image");out.texture.state=readable;out.texture.width=w;out.texture.height=h;out.texture.format=format;
        if(renderTarget){out.rtv=gpu.rtvs.take();gpu.device->CreateRenderTargetView(out.texture.get(),nullptr,out.rtv);}return out;
    }
    void release(Image& i){if(i.rtv.ptr){gpu.rtvs.give(i.rtv);i.rtv={};}gpu.retire(std::move(i.texture.value));i.texture.width=i.texture.height=0;}
    void releaseHDR(){release(hdr);release(aaImage);for(auto& l:levels){release(l[0]);release(l[1]);}levels.clear();for(auto& e:exposureImages)release(e);exposureValid=false;hdrPending=false;}
    void prepareBloom(){
        if(compositePipeline.p){return;}
        const auto& code=BloomPass::shaderCode();
        const auto extract=Device::shader(code,"HBBloom","Extract","cs_5_0"),blur=Device::shader(code,"HBBloom","Blur","cs_5_0"),meter=Device::shader(code,"HBBloom","Meter","cs_5_0"),vsCode=Device::shader(code,"HBBloom","VS","vs_5_0"),psCode=Device::shader(code,"HBBloom","PS","ps_5_0"),fxaa=Device::shader(code,"HBBloom","PFxaa","ps_5_0");
        for(const auto* c:{&extract,&blur,&meter}){bloomCompute.reflect(*c);}
        bloomCompute.build(gpu,{ReflectedLayout::linearClamp()});
        for(const auto* c:{&vsCode,&psCode,&fxaa}){bloomGraphics.reflect(*c);}
        bloomGraphics.build(gpu,{ReflectedLayout::linearClamp()});
        extractKernel=gpu.computePipeline(bloomCompute.root.p,extract);blurKernel=gpu.computePipeline(bloomCompute.root.p,blur);meterKernel=gpu.computePipeline(bloomCompute.root.p,meter);
        auto d=Device::defaults(bloomGraphics.root.p,vsCode,psCode,DXGI_FORMAT_R8G8B8A8_UNORM);d.DepthStencilState.DepthEnable=FALSE;compositePipeline=gpu.pipeline(d);d.PS={fxaa.data(),fxaa.size()};fxaaPipeline=gpu.pipeline(d);
    }
    void srvAt(const DescriptorTable& t,UINT slot,ID3D12Resource* r,const D3D12_SHADER_RESOURCE_VIEW_DESC* desc=nullptr){gpu.device->CreateShaderResourceView(r,desc,t.cpuAt(slot));}
    void bloomDispatch(ID3D12PipelineState* kernel,ID3D12Resource* input,Image& output,const BloomPass::Constants& values){
        gpu.transition(output.texture,D3D12_RESOURCE_STATE_UNORDERED_ACCESS);auto s=bloomCompute.srvTable(gpu),u=bloomCompute.uavTable(gpu);srvAt(s,0,input);gpu.device->CreateUnorderedAccessView(output.texture.get(),nullptr,nullptr,u.cpuAt(0));
        bloomCompute.apply(gpu,true,{{0,gpu.constants(&values,sizeof(values))}},&s,&u);gpu.list->SetPipelineState(kernel);gpu.list->Dispatch((output.texture.width+7)/8,(output.texture.height+7)/8,1);gpu.transition(output.texture,readable);
    }
    static ScreenEffectsPass::DataInfo dataInfo(const Texture* t){ScreenEffectsPass::DataInfo info;if(!t)return info;info.present=true;info.width=t->width;info.height=t->height;info.rgba32f=t->format==DXGI_FORMAT_R32G32B32A32_FLOAT;return info;}
    void releaseScreen(){for(auto* i:{&surfaceNormal,&surfaceAlbedo,&surfaceMotion,&surfaceAmbient,&denoiseGuide,&denoiseAux,&photons,&denoisePreviousGuide,&hizAtlas})release(*i);for(auto* a:{&history,&filtered,&denoiseHistory})for(auto& i:*a)release(i);for(auto& l:hizLevels)release(l);hizLevels.clear();hizSize={};historyValid=filterValid=false;historyIndex=filterIndex=0;screen.reset();}
    ID3D12PipelineState* screenKernel(int stage){
        auto& settings=*screen;if(!raySourceReady||rayPrograms.size()!=settings.rayPrograms.size()||!std::equal(rayPrograms.begin(),rayPrograms.end(),settings.rayPrograms.begin(),[](const auto&a,const auto&b){return a.key==b.key&&a.fieldMask==b.fieldMask&&a.instructions==b.instructions;})){raySource=rayProgramShader(settings.rayPrograms,&rayDefines);rayPrograms=settings.rayPrograms;raySourceReady=true;}
        const auto key=ScreenEffectsPass::programVariant(settings,stage)+raySource;auto& kernel=screenKernels[key];if(kernel.p)return kernel.p;
        if(!screenLayout.root.p){screenLayout.cbuffers[0]=sizeof(ScreenEffectsPass::Constants);screenLayout.srvs.resize(16);screenLayout.uavs.resize(1);screenLayout.samplers=1;screenLayout.build(gpu,{ReflectedLayout::linearClamp()});}
        // ponytail: every variant stays cached for the renderer's lifetime; evict like the D3D11 bytecode cache if editors churn variants.
        const auto code=ScreenEffectsPass::compileSource({key,ScreenEffectsPass::programSource(settings,raySource,rayDefines,stage)});kernel=gpu.computePipeline(screenLayout.root.p,code);return kernel.p;
    }
    // HierarchicalDepth::build: min/max pyramid of the viewport depth, stacked into one atlas.
    ID3D12Resource* buildHierarchy(const std::array<float,4>& area){
        const UINT w=UINT(area[2]),h=UINT(area[3]);if(!w||!h)throw std::runtime_error("Hi-Z depth/area invalid");
        if(!hizKernel.p){const auto code=Device::shader(HierarchicalDepth::source,"HBHiZ","Downsample","cs_5_0");hizLayout.reflect(code);hizLayout.build(gpu,{});hizKernel=gpu.computePipeline(hizLayout.root.p,code);}
        if(hizSize[0]!=w||hizSize[1]!=h){for(auto& l:hizLevels)release(l);hizLevels.clear();release(hizAtlas);hizSize={w,h};UINT a=w,b=h,offset=0;std::vector<UINT> offsets;do{a=(a+1)/2;b=(b+1)/2;hizLevels.push_back(image(a,b,false,DXGI_FORMAT_R32G32_FLOAT));offsets.push_back(offset);offset+=b;}while(a>1||b>1);
            D3D12_RESOURCE_DESC d{};d.Dimension=D3D12_RESOURCE_DIMENSION_TEXTURE2D;d.Width=hizLevels.front().texture.width;d.Height=offset;d.DepthOrArraySize=1;d.MipLevels=1;d.Format=DXGI_FORMAT_R32G32_FLOAT;d.SampleDesc.Count=1;hizAtlas.texture.value=gpu.committed(D3D12_HEAP_TYPE_DEFAULT,d,readable,nullptr,"Direct3D12 Hi-Z atlas");hizAtlas.texture.state=readable;hizAtlas.texture.width=UINT(d.Width);hizAtlas.texture.height=offset;hizAtlas.texture.format=d.Format;}
        gpu.transition(depth,readable);ID3D12Resource* source=depth.get();UINT sw=w,sh=h,offset=0;bool first=true;
        for(auto& l:hizLevels){const std::array<UINT,8> c{sw,sh,first?UINT(area[0]):0,first?UINT(area[1]):0,l.texture.width,l.texture.height,first?1u:0u,0};
            gpu.transition(l.texture,D3D12_RESOURCE_STATE_UNORDERED_ACCESS);auto srvs=hizLayout.srvTable(gpu),uavs=hizLayout.uavTable(gpu);
            if(first){D3D12_SHADER_RESOURCE_VIEW_DESC v{};v.Shader4ComponentMapping=D3D12_DEFAULT_SHADER_4_COMPONENT_MAPPING;v.Format=DXGI_FORMAT_R32_FLOAT;v.ViewDimension=D3D12_SRV_DIMENSION_TEXTURE2D;v.Texture2D.MipLevels=1;srvAt(srvs,0,source,&v);}else srvAt(srvs,0,source);
            gpu.device->CreateUnorderedAccessView(l.texture.get(),nullptr,nullptr,uavs.cpuAt(0));hizLayout.apply(gpu,true,{{0,gpu.constants(c.data(),sizeof(c))}},&srvs,&uavs);gpu.list->SetPipelineState(hizKernel.p);gpu.list->Dispatch((l.texture.width+7)/8,(l.texture.height+7)/8,1);
            gpu.transition(l.texture,D3D12_RESOURCE_STATE_COPY_SOURCE);gpu.transition(hizAtlas.texture,D3D12_RESOURCE_STATE_COPY_DEST);D3D12_TEXTURE_COPY_LOCATION dst{},src{};dst.pResource=hizAtlas.texture.get();src.pResource=l.texture.get();dst.Type=src.Type=D3D12_TEXTURE_COPY_TYPE_SUBRESOURCE_INDEX;const D3D12_BOX box{0,0,0,l.texture.width,l.texture.height,1};gpu.list->CopyTextureRegion(&dst,0,offset,0,&src,&box);
            gpu.transition(l.texture,readable);offset+=l.texture.height;source=l.texture.get();sw=l.texture.width;sh=l.texture.height;first=false;}
        gpu.transition(hizAtlas.texture,readable);gpu.transition(depth,D3D12_RESOURCE_STATE_DEPTH_WRITE);return hizAtlas.texture.get();
    }
    // ScreenEffectsPass::resolve: same constants, stage order, history/denoise ping-pong and validity rules.
    ID3D12Resource* resolveScreen(const std::array<float,4>& area){
        if(!screen){return hdr.texture.get();}
        auto& settings=*screen;
        ScreenEffectsPass::validateScene(settings,dataInfo(geometryScene),dataInfo(pathEnvironment),dataInfo(distanceField));
        ID3D12Resource* hierarchy=nullptr;if(settings.hierarchy[3]>0&&(settings.reflection[0]>0||settings.indirect[0]>0)){hierarchy=buildHierarchy(area);settings.hierarchy={float(hizAtlas.texture.width),float(hizAtlas.texture.height),float(hizLevels.size()),1};}else{for(auto& l:hizLevels)release(l);hizLevels.clear();release(hizAtlas);hizSize={};settings.hierarchy={};}
        ScreenEffectsPass::Constants c{settings.path,settings.pathQuality,settings.pathEnvironment,settings.pathLens,settings.pathMap,settings.pathOptions,settings.pathDenoise,settings.pathCaustics,settings.pathCausticTargets,settings.pathFilter,settings.transport,settings.ambientAO,settings.geometry,settings.geometryInfo,settings.geometryRecords,settings.geometryLimits,settings.hierarchy,settings.temporal,settings.motion,settings.reflection,settings.indirect,settings.coordinates,settings.jitter,settings.eye,settings.forward,settings.camera,{float(width),float(height),0,0},area,settings.inverseVP,settings.currentVP,settings.previousVP};
        if(!historyValid){c.temporal[3]=0;c.path[3]=0;}
        if((settings.pathFilter[3]>0?settings.pathFilter[2]==0:settings.path[3]==0||settings.eye!=lastEye||settings.currentVP!=lastVP)||settings.pathFilter[0]!=lastFilter[0]||settings.pathFilter[1]!=lastFilter[1]||settings.pathDenoise!=lastDenoise||settings.pathLens!=lastLens||settings.geometryRecords[3]!=lastGeometryRecords[3])filterValid=false;
        c.pathFilter[2]=filterValid?1.f:0.f;gpu.transition(hdr.texture,readable);
        for(auto* i:{&surfaceNormal,&surfaceAlbedo,&surfaceMotion,&surfaceAmbient})if(i->texture.value.p)gpu.transition(i->texture,readable);
        const auto run=[&](int stage,ID3D12Resource* input,Image& destination,float stride=0){
            c.pathOptions[3]=stage==2?stride:settings.pathOptions[3];auto* kernel=screenKernel(stage);auto srvs=screenLayout.srvTable(gpu),uavs=screenLayout.uavTable(gpu);
            const auto put=[&](UINT slot,const Image& i){if(i.texture.value.p)srvAt(srvs,slot,i.texture.get());};
            if(input){srvAt(srvs,0,input);}
            D3D12_SHADER_RESOURCE_VIEW_DESC dv{};dv.Shader4ComponentMapping=D3D12_DEFAULT_SHADER_4_COMPONENT_MAPPING;dv.Format=DXGI_FORMAT_R32_FLOAT;dv.ViewDimension=D3D12_SRV_DIMENSION_TEXTURE2D;dv.Texture2D.MipLevels=1;gpu.transition(depth,readable);srvAt(srvs,1,depth.get(),&dv);
            put(2,history[historyIndex]);put(3,surfaceNormal);put(4,surfaceAlbedo);put(5,surfaceMotion);if(hierarchy)srvAt(srvs,6,hierarchy);if(geometryScene)gpu.device->CopyDescriptorsSimple(1,srvs.cpuAt(7),geometryScene->srv,D3D12_DESCRIPTOR_HEAP_TYPE_CBV_SRV_UAV);put(8,surfaceAmbient);
            if(stage==2||stage==4){put(9,denoiseGuide);}
            if(pathEnvironment){gpu.device->CopyDescriptorsSimple(1,srvs.cpuAt(10),pathEnvironment->srv,D3D12_DESCRIPTOR_HEAP_TYPE_CBV_SRV_UAV);}
            if(stage!=3){put(11,photons);}
            if(stage==4){put(12,denoiseHistory[filterIndex]);put(13,denoisePreviousGuide);}if(stage==2||stage==4)put(14,denoiseAux);if(distanceField)gpu.device->CopyDescriptorsSimple(1,srvs.cpuAt(15),distanceField->srv,D3D12_DESCRIPTOR_HEAP_TYPE_CBV_SRV_UAV);
            gpu.transition(destination.texture,D3D12_RESOURCE_STATE_UNORDERED_ACCESS);gpu.device->CreateUnorderedAccessView(destination.texture.get(),nullptr,nullptr,uavs.cpuAt(0));
            screenLayout.apply(gpu,true,{{0,gpu.constants(&c,sizeof(c))}},&srvs,&uavs);gpu.list->SetPipelineState(kernel);gpu.list->Dispatch(stage==3?16:(UINT(area[2])+7)/8,stage==3?2:(UINT(area[3])+7)/8,1);gpu.transition(destination.texture,readable);
        };
        if(photons.texture.value.p&&c.path[3]<c.path[2])run(3,hdr.texture.get(),photons);
        run(0,hdr.texture.get(),history[1-historyIndex]);historyIndex=1-historyIndex;historyValid=true;
        if(denoiseGuide.texture.value.p){run(1,hdr.texture.get(),denoiseGuide);if(settings.pathLens[0]>0||settings.pathFilter[0]>0)run(5,hdr.texture.get(),denoiseAux);
            ID3D12Resource* current=history[historyIndex].texture.get();int last=0;for(int step=0;step<int(settings.pathDenoise[1]);step++){last=step%2;run(2,current,filtered[last],float(1<<step));current=filtered[last].texture.get();}
            if(denoisePreviousGuide.texture.value.p){run(4,current,denoiseHistory[1-filterIndex]);filterIndex=1-filterIndex;gpu.transition(denoiseGuide.texture,D3D12_RESOURCE_STATE_COPY_SOURCE);gpu.transition(denoisePreviousGuide.texture,D3D12_RESOURCE_STATE_COPY_DEST);gpu.list->CopyResource(denoisePreviousGuide.texture.get(),denoiseGuide.texture.get());gpu.transition(denoiseGuide.texture,readable);gpu.transition(denoisePreviousGuide.texture,readable);
                filterValid=true;lastFilter=settings.pathFilter;lastDenoise=settings.pathDenoise;lastLens=settings.pathLens;lastGeometryRecords=settings.geometryRecords;lastEye=settings.eye;lastVP=settings.currentVP;current=denoiseHistory[filterIndex].texture.get();}
            gpu.transition(depth,D3D12_RESOURCE_STATE_DEPTH_WRITE);return current;}
        gpu.transition(depth,D3D12_RESOURCE_STATE_DEPTH_WRITE);return history[historyIndex].texture.get();
    }
    // ScreenEffectsPass::begin image allocation and per-frame surface clears.
    void beginScreen(const SceneFrame& value){
        if(!value.screenEffects){releaseScreen();return;}auto settings=*value.screenEffects;ScreenEffectsPass::validateSettings(settings);screen=settings;
        const auto keep=[&](Image& i,bool want,bool target,DXGI_FORMAT format=DXGI_FORMAT_R16G16B16A16_FLOAT,UINT w=0,UINT h=0){if(!want){release(i);return false;}if(!i.texture.value.p){i=image(w?w:width,h?h:height,target,format);return true;}return false;};
        keep(photons,settings.path[0]>0&&settings.pathCaustics[0]>0&&settings.pathCaustics[3]>0,false,DXGI_FORMAT_R32G32B32A32_FLOAT,128,16);
        const bool denoise=settings.path[0]>0&&settings.pathDenoise[0]>0;keep(denoiseAux,denoise&&(settings.pathLens[0]>0||settings.pathFilter[0]>0),false);
        if(keep(denoiseGuide,denoise,false)){release(filtered[0]);release(filtered[1]);filtered[0]=image(width,height,false);filtered[1]=image(width,height,false);}if(!denoise){release(filtered[0]);release(filtered[1]);}
        if(denoiseGuide.texture.value.p&&settings.pathFilter[0]>0){if(keep(denoisePreviousGuide,true,false)){denoiseHistory[0]=image(width,height,false);denoiseHistory[1]=image(width,height,false);filterValid=false;}}else{release(denoisePreviousGuide);release(denoiseHistory[0]);release(denoiseHistory[1]);filterValid=false;}
        if(!history[0].texture.value.p){history[0]=image(width,height,false);history[1]=image(width,height,false);historyValid=false;}
        const bool surfaces=settings.reflection[0]>0||settings.indirect[0]>0||settings.geometry[0]>0||settings.ambientAO[2]>0;keep(surfaceNormal,surfaces,true);keep(surfaceAlbedo,surfaces,true);keep(surfaceMotion,settings.motion[3]>0,true);keep(surfaceAmbient,settings.ambientAO[2]>0,true);
        const float neutral[4]={.5f,.5f,.5f,1},zero[4]={};
        for(auto [i,clear]:{std::pair<Image*,const float*>{&surfaceNormal,neutral},{&surfaceAlbedo,zero},{&surfaceMotion,zero},{&surfaceAmbient,zero}})if(i->texture.value.p){gpu.transition(i->texture,D3D12_RESOURCE_STATE_RENDER_TARGET);gpu.list->ClearRenderTargetView(i->rtv,clear,0,nullptr);}
        if(!nullTargets[0].ptr)for(auto& t:nullTargets){t=gpu.rtvs.take();D3D12_RENDER_TARGET_VIEW_DESC v{};v.Format=DXGI_FORMAT_R16G16B16A16_FLOAT;v.ViewDimension=D3D12_RTV_DIMENSION_TEXTURE2D;gpu.device->CreateRenderTargetView(nullptr,&v,t);}
    }
    // Same sequence as BloomPass::complete; the extract/composite source is the screen-effect resolve.
    void completeHDR(){
        if(!hdrPending){return;}
        ID3D12Resource* screenSource=resolveScreen(postArea);
        BloomPass::Constants values;values.effect={bloomSettings.threshold,bloomSettings.strength,bloomSettings.radius,frame.exposure};gpu.transition(hdr.texture,readable);
        for(std::size_t index=0;index<levels.size();index++){auto& layer=levels[index];auto* input=index?levels[index-1][0].texture.get():screenSource;const auto inputWidth=index?levels[index-1][0].texture.width:hdr.texture.width,inputHeight=index?levels[index-1][0].texture.height:hdr.texture.height;
            values.dimensions={float(inputWidth),float(inputHeight),float(layer[0].texture.width),float(layer[0].texture.height)};values.area=index?std::array<float,4>{0,0,float(inputWidth),float(inputHeight)}:postArea;values.options={0,0,index==0?1.f:0.f,0};bloomDispatch(extractKernel.p,input,layer[0],values);
            values.dimensions={float(layer[0].texture.width),float(layer[0].texture.height),float(layer[0].texture.width),float(layer[0].texture.height)};values.options={1,0,0,0};bloomDispatch(blurKernel.p,layer[0].texture.get(),layer[1],values);values.options={0,1,0,0};bloomDispatch(blurKernel.p,layer[1].texture.get(),layer[0],values);}
        values.grade=post.grade;values.filter=post.filter;values.effects=post.effects;values.vignette=post.vignette;values.vignetteColor=post.vignetteColor;values.balance=post.balance;values.lift=post.lift;values.gamma=post.gamma;values.gain=post.gain;values.lens=post.lens;values.bokeh=post.bokeh;values.focus=post.focus;values.occlusion=post.occlusion;values.lookup=post.lookup;values.camera=post.camera;values.exposure=post.exposure;values.adapt=post.adapt;
        values.dimensions={float(hdr.texture.width),float(hdr.texture.height),0,0};values.area=postArea;values.options={0,0,float(levels.size()),0};
        const bool needsDepth=post.focus[3]>0||post.occlusion[2]>0;
        if(post.exposure[0]>0){
            if(!exposureImages[0].texture.value.p){exposureImages[0]=image(1,1,false);exposureImages[1]=image(1,1,false);exposureValid=false;}
            values.adapt[3]=exposureValid&&post.adapt[3]>.5f?1.f:0.f;auto& result=exposureImages[1-exposureIndex];gpu.transition(result.texture,D3D12_RESOURCE_STATE_UNORDERED_ACCESS);
            auto s=bloomCompute.srvTable(gpu),u=bloomCompute.uavTable(gpu);srvAt(s,0,hdr.texture.get());srvAt(s,8,exposureImages[exposureIndex].texture.get());gpu.device->CreateUnorderedAccessView(result.texture.get(),nullptr,nullptr,u.cpuAt(0));
            bloomCompute.apply(gpu,true,{{0,gpu.constants(&values,sizeof(values))}},&s,&u);gpu.list->SetPipelineState(meterKernel.p);gpu.list->Dispatch(1,1,1);gpu.transition(result.texture,readable);exposureIndex=1-exposureIndex;exposureValid=true;
        }else{for(auto& e:exposureImages)release(e);exposureValid=false;}
        if(post.occlusion[3]>0){if(aaImage.texture.width!=hdr.texture.width||aaImage.texture.height!=hdr.texture.height){release(aaImage);aaImage=image(hdr.texture.width,hdr.texture.height,true,DXGI_FORMAT_R8G8B8A8_UNORM);}}else release(aaImage);
        auto s=bloomGraphics.srvTable(gpu);srvAt(s,0,screenSource);srvAt(s,9,hdr.texture.get());for(std::size_t i=0;i<levels.size();i++)srvAt(s,UINT(i+1),levels[i][0].texture.get());
        if(needsDepth){gpu.transition(depth,readable);D3D12_SHADER_RESOURCE_VIEW_DESC v{};v.Shader4ComponentMapping=D3D12_DEFAULT_SHADER_4_COMPONENT_MAPPING;v.Format=DXGI_FORMAT_R32_FLOAT;v.ViewDimension=D3D12_SRV_DIMENSION_TEXTURE2D;v.Texture2D.MipLevels=1;srvAt(s,6,depth.get(),&v);}
        if(postLookup)gpu.device->CopyDescriptorsSimple(1,s.cpuAt(7),postLookup->srv,D3D12_DESCRIPTOR_HEAP_TYPE_CBV_SRV_UAV);
        if(post.exposure[0]>0)srvAt(s,8,exposureImages[exposureIndex].texture.get());
        const D3D12_VIEWPORT viewport{postArea[0],postArea[1],postArea[2],postArea[3],0,1};const auto crop=frame.scissor.value_or(postArea);const D3D12_RECT rect{LONG(std::floor(crop[0])),LONG(std::floor(crop[1])),LONG(std::ceil(crop[0]+crop[2])),LONG(std::ceil(crop[1]+crop[3]))};
        const auto address=gpu.constants(&values,sizeof(values));auto* list=gpu.list.p;
        const auto drawPass=[&](ID3D12PipelineState* pso,D3D12_CPU_DESCRIPTOR_HANDLE target,const DescriptorTable& table){bloomGraphics.apply(gpu,false,{{0,address}},&table,nullptr);list->SetPipelineState(pso);list->OMSetRenderTargets(1,&target,FALSE,nullptr);list->RSSetViewports(1,&viewport);list->RSSetScissorRects(1,&rect);list->IASetPrimitiveTopology(D3D_PRIMITIVE_TOPOLOGY_TRIANGLELIST);list->DrawInstanced(3,1,0,0);};
        if(post.occlusion[3]>0){gpu.transition(aaImage.texture,D3D12_RESOURCE_STATE_RENDER_TARGET);drawPass(compositePipeline.p,aaImage.rtv,s);gpu.transition(aaImage.texture,readable);auto a=bloomGraphics.srvTable(gpu);srvAt(a,0,aaImage.texture.get());gpu.transition(color,D3D12_RESOURCE_STATE_RENDER_TARGET);drawPass(fxaaPipeline.p,color.rtv,a);}
        else{gpu.transition(color,D3D12_RESOURCE_STATE_RENDER_TARGET);drawPass(compositePipeline.p,color.rtv,s);}
        if(needsDepth){gpu.transition(depth,D3D12_RESOURCE_STATE_DEPTH_WRITE);}
        hdrPending=false;
    }
    void prepareMips(){if(mipKernel.p)return;const auto code=Device::shader(mipShader,"HBMipDown","Down","cs_5_0");mipLayout.reflect(code);mipLayout.build(gpu,{ReflectedLayout::linearClamp()});mipKernel=gpu.computePipeline(mipLayout.root.p,code);}
    // Levels 1.. from level 0. view: format to sample (sRGB decodes), write: UAV format (UNORM for sRGB data).
    void generateMips(d3d12::Texture& t,UINT mips,DXGI_FORMAT view,DXGI_FORMAT write,bool srgb){
        prepareMips();for(UINT level=1;level<mips;level++){const UINT w=std::max(1u,t.width>>level),h=std::max(1u,t.height>>level);
            D3D12_RESOURCE_BARRIER b[2]{};for(UINT i=0;i<2;i++){b[i].Type=D3D12_RESOURCE_BARRIER_TYPE_TRANSITION;b[i].Transition.pResource=t.get();}
            // Per-subresource: source level readable, target level writable; the whole resource returns to t.state afterwards.
            b[0].Transition.Subresource=level-1;b[0].Transition.StateBefore=level==1?t.state:D3D12_RESOURCE_STATE_UNORDERED_ACCESS;b[0].Transition.StateAfter=readable;
            b[1].Transition.Subresource=level;b[1].Transition.StateBefore=t.state;b[1].Transition.StateAfter=D3D12_RESOURCE_STATE_UNORDERED_ACCESS;
            UINT count=0;D3D12_RESOURCE_BARRIER use[2];if(b[0].Transition.StateBefore!=b[0].Transition.StateAfter)use[count++]=b[0];if(b[1].Transition.StateBefore!=b[1].Transition.StateAfter)use[count++]=b[1];if(count)gpu.list->ResourceBarrier(count,use);
            auto s=mipLayout.srvTable(gpu),u=mipLayout.uavTable(gpu);D3D12_SHADER_RESOURCE_VIEW_DESC sv{};sv.Shader4ComponentMapping=D3D12_DEFAULT_SHADER_4_COMPONENT_MAPPING;sv.Format=view;sv.ViewDimension=D3D12_SRV_DIMENSION_TEXTURE2D;sv.Texture2D.MostDetailedMip=level-1;sv.Texture2D.MipLevels=1;srvAt(s,0,t.get(),&sv);
            D3D12_UNORDERED_ACCESS_VIEW_DESC uv{};uv.Format=write;uv.ViewDimension=D3D12_UAV_DIMENSION_TEXTURE2D;uv.Texture2D.MipSlice=level;gpu.device->CreateUnorderedAccessView(t.get(),nullptr,&uv,u.cpuAt(0));
            const std::array<UINT,4> info{w,h,srgb?1u:0u,0};mipLayout.apply(gpu,true,{{0,gpu.constants(info.data(),16)}},&s,&u);gpu.list->SetPipelineState(mipKernel.p);gpu.list->Dispatch((w+7)/8,(h+7)/8,1);}
        // Return every level to t.state: levels 0..mips-2 are readable, the last level is UAV.
        std::vector<D3D12_RESOURCE_BARRIER> back;for(UINT level=0;level<mips;level++){const auto from=level+1<mips?readable:D3D12_RESOURCE_STATE_UNORDERED_ACCESS;if(mips==1||from==t.state)continue;D3D12_RESOURCE_BARRIER b{};b.Type=D3D12_RESOURCE_BARRIER_TYPE_TRANSITION;b.Transition.pResource=t.get();b.Transition.Subresource=level;b.Transition.StateBefore=from;b.Transition.StateAfter=t.state;back.push_back(b);}
        if(!back.empty())gpu.list->ResourceBarrier(UINT(back.size()),back.data());
    }
    // Frame data lives in the upload ring; re-upload after any submit (read, sampler flush).
    void uploadFrame(){
        frameBuffers.clear();std::array<ProbeSettings,3> probeData{};for(auto& p:probeData)p.options[0]=0;const Scene2D settings{};
        for(const auto& [reg,size]:cbuffers){if(reg==0)continue;auto u=gpu.upload(size,256);std::memset(u.cpu,0,size);
            if(reg==1){std::memcpy(u.cpu,&settings,std::min<std::size_t>(size,sizeof(settings)));}
            if(reg==2){std::memcpy(u.cpu,probeData.data(),std::min<std::size_t>(size,sizeof(probeData)));}
            if(reg==3&&tilesActive){std::memcpy(u.cpu,&tileSettings,std::min<std::size_t>(size,sizeof(tileSettings)));}
            frameBuffers[reg]=u.gpu;}
        lightData={};if(!lights.empty()){lightData=gpu.upload(lights.size()*sizeof(SceneLight),sizeof(SceneLight));std::memcpy(lightData.cpu,lights.data(),lights.size()*sizeof(SceneLight));}
        uploaded=gpu.submitted();
    }
public:
    SceneMeshRenderer(Device& device,UINT targetWidth,UINT targetHeight):gpu(device),width(targetWidth),height(targetHeight){
        const auto source=SceneRenderer::shaderSource();vs=Device::shader(source,"HBSceneRender","VS","vs_5_0");ps=Device::shader(source,"HBSceneRender","PS","ps_5_0");shadowPs=Device::shader(source,"HBSceneRender","ShadowPS","ps_5_0");surfacePs=Device::shader(SceneRenderer::surfaceShader(source),"HBSceneRender","PS","ps_5_0");
        reflect(vs);reflect(ps);reflect(surfacePs);if(slots.empty()||samplerCount>16||!cbuffers.count(0))throw std::runtime_error("Direct3D12 scene shader layout unexpected");
        std::vector<D3D12_ROOT_PARAMETER> params;for(const auto& c:cbuffers){D3D12_ROOT_PARAMETER p{};p.ParameterType=D3D12_ROOT_PARAMETER_TYPE_CBV;p.Descriptor={c.first,0};p.ShaderVisibility=D3D12_SHADER_VISIBILITY_ALL;params.push_back(p);}
        const D3D12_DESCRIPTOR_RANGE srvRange{D3D12_DESCRIPTOR_RANGE_TYPE_SRV,UINT(slots.size()),0,0,0},samplerRange{D3D12_DESCRIPTOR_RANGE_TYPE_SAMPLER,samplerCount,0,0,0};
        D3D12_ROOT_PARAMETER table{};table.ParameterType=D3D12_ROOT_PARAMETER_TYPE_DESCRIPTOR_TABLE;table.ShaderVisibility=D3D12_SHADER_VISIBILITY_ALL;table.DescriptorTable={1,&srvRange};srvRoot=UINT(params.size());params.push_back(table);
        if(samplerCount){table.DescriptorTable={1,&samplerRange};samplerRoot=UINT(params.size());params.push_back(table);}
        D3D12_ROOT_SIGNATURE_DESC rd{};rd.NumParameters=UINT(params.size());rd.pParameters=params.data();rd.Flags=D3D12_ROOT_SIGNATURE_FLAG_ALLOW_INPUT_ASSEMBLER_INPUT_LAYOUT;root=gpu.rootSignature(rd);
        D3D12_DESCRIPTOR_HEAP_DESC h{};h.Type=D3D12_DESCRIPTOR_HEAP_TYPE_CBV_SRV_UAV;h.NumDescriptors=UINT(slots.size());
        check(gpu.device->CreateDescriptorHeap(&h,__uuidof(ID3D12DescriptorHeap),reinterpret_cast<void**>(&nulls.p)),"Direct3D12 null view template");
        const auto stride=gpu.device->GetDescriptorHandleIncrementSize(D3D12_DESCRIPTOR_HEAP_TYPE_CBV_SRV_UAV);
        for(std::size_t i=0;i<slots.size();i++){const auto v=nullView(slots[i]);gpu.device->CreateShaderResourceView(nullptr,&v,{nulls->GetCPUDescriptorHandleForHeapStart().ptr+i*stride});}
        views.create(gpu.device.p,D3D12_DESCRIPTOR_HEAP_TYPE_CBV_SRV_UAV,4096);
        color=gpu.renderTarget(width,height,DXGI_FORMAT_R8G8B8A8_UNORM);depth=gpu.depthTarget(width,height);dsvStride=gpu.device->GetDescriptorHandleIncrementSize(D3D12_DESCRIPTOR_HEAP_TYPE_DSV);
    }
    ~SceneMeshRenderer(){try{gpu.waitIdle();}catch(...){}}
    SceneMeshRenderer(const SceneMeshRenderer&)=delete;SceneMeshRenderer& operator=(const SceneMeshRenderer&)=delete;

    // Creation and drawing must happen between Device::begin and Device::end.
    Mesh createMesh(const std::vector<SceneVertex>& vertices,const std::vector<std::uint32_t>& indices,const std::vector<std::array<float,2>>& uv1={}){
        if(vertices.empty()||indices.empty()||indices.size()%3||(!uv1.empty()&&uv1.size()!=vertices.size())||std::any_of(indices.begin(),indices.end(),[&](std::uint32_t i){return i>=vertices.size();}))throw std::runtime_error("Direct3D12 scene mesh invalid");
        Mesh m;m.count=UINT(indices.size());m.vertexCount=UINT(vertices.size());
        m.vertices=gpu.buffer(vertices.data(),vertices.size()*sizeof(SceneVertex),D3D12_RESOURCE_STATE_VERTEX_AND_CONSTANT_BUFFER);m.indices=gpu.buffer(indices.data(),indices.size()*4,D3D12_RESOURCE_STATE_INDEX_BUFFER);
        if(!uv1.empty()){m.uv1=gpu.buffer(uv1.data(),uv1.size()*8,D3D12_RESOURCE_STATE_VERTEX_AND_CONSTANT_BUFFER);}
        return m;
    }
    // ponytail: one mip level; SceneRenderer's GPU mip generation lands with phase 3 compute.
    Texture createTexture(UINT w,UINT h,const std::vector<std::uint8_t>& rgba,bool srgb=true,bool mipmaps=true){
        if(!w||!h||rgba.size()!=std::size_t(w)*h*4)throw std::runtime_error("Direct3D12 scene texture bytes invalid");
        UINT mips=1;if(mipmaps)for(UINT extent=std::max(w,h);extent>1;extent/=2)++mips;
        const auto format=srgb?DXGI_FORMAT_R8G8B8A8_UNORM_SRGB:DXGI_FORMAT_R8G8B8A8_UNORM;
        Texture t;static_cast<d3d12::Texture&>(t)=gpu.texture(w,h,format,rgba.data(),w*4,mips,mips>1?D3D12_RESOURCE_FLAG_ALLOW_UNORDERED_ACCESS:D3D12_RESOURCE_FLAG_NONE,mips>1?DXGI_FORMAT_R8G8B8A8_TYPELESS:DXGI_FORMAT_UNKNOWN);t.mips=mips;
        if(mips>1)generateMips(t,mips,format,DXGI_FORMAT_R8G8B8A8_UNORM,srgb);
        D3D12_SHADER_RESOURCE_VIEW_DESC v{};v.Shader4ComponentMapping=D3D12_DEFAULT_SHADER_4_COMPONENT_MAPPING;v.Format=format;v.ViewDimension=D3D12_SRV_DIMENSION_TEXTURE2D;v.Texture2D.MipLevels=mips;
        t.srv=views.take();gpu.device->CreateShaderResourceView(t.get(),&v,t.srv);return t;
    }
    void release(Texture& t){views.give(t.srv);t.srv={};gpu.retire(std::move(t.value));}
    void release(Mesh& m){gpu.retire(std::move(m.vertices.value));gpu.retire(std::move(m.indices.value));gpu.retire(std::move(m.uv1.value));m.count=0;}
    void setLights(const std::vector<SceneLight>& values){
        for(const auto& l:values)if(!SceneRenderer::finite(l.position)||!SceneRenderer::finite(l.direction)||!SceneRenderer::finite(l.color)||!SceneRenderer::finite(l.cone)||l.position[3]<0||l.position[3]>3||l.cone[3]<0)throw std::runtime_error("Direct3D12 scene light invalid");
        lights=values;uploaded=~std::uint64_t(0);
    }
    Instances createInstances(std::size_t capacity,bool positionsOnly=false){
        const UINT stride=positionsOnly?16:sizeof(SceneInstance);if(!capacity||capacity>UINT_MAX/stride)throw std::runtime_error("Instance buffer capacity invalid");
        Instances out;out.capacity=UINT(capacity);out.stride=stride;out.data=gpu.buffer(std::uint64_t(capacity)*stride,readable,D3D12_RESOURCE_FLAG_NONE);return out;
    }
    void setInstances(Instances& target,const std::vector<SceneInstance>& values){
        if(target.stride!=sizeof(SceneInstance)||values.size()>target.capacity)throw std::runtime_error("Instance data format invalid");
        for(const auto& item:values)if(!SceneRenderer::finite(item.world)||!SceneRenderer::finite(item.normal)||!SceneRenderer::finite(item.color))throw std::runtime_error("Instance values must be finite");
        gpu.update(target.data,values.data(),values.size()*sizeof(SceneInstance));target.count=UINT(values.size());target.mirrored=std::any_of(values.begin(),values.end(),[](const SceneInstance& i){return SceneRenderer::orientation(i.world)<0;});
    }
    void setShotPositions(Instances& target,const std::vector<std::array<float,4>>& values){
        if(target.stride!=16||values.size()>target.capacity)throw std::runtime_error("Shot position format invalid");
        for(const auto& item:values)if(!SceneRenderer::finite(item))throw std::runtime_error("Shot positions must be finite");
        gpu.update(target.data,values.data(),values.size()*16);target.count=UINT(values.size());target.mirrored=false;
    }
    Deformation createDeformation(std::uint32_t vertexCount,std::uint32_t boneCount,std::uint32_t morphCount,const std::vector<SceneSkin>& skin,const std::vector<SceneMorph>& morph){
        const auto poseSize=(std::uint64_t(boneCount)*4+(std::uint64_t(morphCount)+3)/4+(boneCount?1:0))*16;
        if(!vertexCount||(!boneCount&&!morphCount)||skin.size()!=(boneCount?vertexCount:0)||std::uint64_t(vertexCount)*morphCount!=morph.size()||poseSize>UINT_MAX)throw std::runtime_error("Deformation dimensions invalid");
        for(const auto& v:skin){if(!SceneRenderer::finite(v.weights)||std::any_of(v.weights.begin(),v.weights.end(),[](float w){return w<0;})||std::none_of(v.weights.begin(),v.weights.end(),[](float w){return w>0;}))throw std::runtime_error("Skin weights invalid");for(auto j:v.joints)if(j>=boneCount)throw std::runtime_error("Skin joint out of bounds");}
        for(const auto& v:morph)if(!SceneRenderer::finite(v.position)||!SceneRenderer::finite(v.normal)||!SceneRenderer::finite(v.color))throw std::runtime_error("Morph values must be finite");
        Deformation out;out.vertexCount=vertexCount;out.boneCount=boneCount;out.morphCount=morphCount;out.poseBytes=UINT(poseSize);
        if(boneCount)out.skin=gpu.buffer(skin.data(),skin.size()*sizeof(SceneSkin),readable);
        if(morphCount)out.morph=gpu.buffer(morph.data(),morph.size()*sizeof(SceneMorph),readable);
        out.pose=gpu.buffer(poseSize,readable,D3D12_RESOURCE_FLAG_NONE);return out;
    }
    // Same packing as SceneRenderer::setPose; previous=true fills the motion-vector pose.
    bool setPose(Deformation& target,const std::vector<Matrix>& bones,const std::vector<float>& weights,const std::array<float,3>& bindTranslation={},bool previous=false){
        if(bones.size()!=target.boneCount||weights.size()!=target.morphCount||!SceneRenderer::finite(weights)||!SceneRenderer::finite(bindTranslation))throw std::runtime_error("Deformation pose dimensions invalid");
        std::vector<float> values;values.reserve(target.poseBytes/4);for(const auto& m:bones){if(!SceneRenderer::finite(m))throw std::runtime_error("Bone matrix must be finite");values.insert(values.end(),m.begin(),m.end());}
        values.insert(values.end(),weights.begin(),weights.end());values.resize(target.poseBytes/4,0);if(target.boneCount)std::copy(bindTranslation.begin(),bindTranslation.end(),values.end()-4);
        if(previous){if(values==target.previous)return false;if(!target.previousPose.value.p)target.previousPose=gpu.buffer(target.poseBytes,readable,D3D12_RESOURCE_FLAG_NONE);gpu.update(target.previousPose,values.data(),values.size()*4);target.previous=std::move(values);return true;}
        if(values==target.current)return false;
        gpu.update(target.pose,values.data(),values.size()*4);target.current=std::move(values);return true;
    }
    void release(Instances& t){gpu.retire(std::move(t.data.value));t.count=t.capacity=0;}
    void release(Deformation& t){gpu.retire(std::move(t.skin.value));gpu.retire(std::move(t.morph.value));gpu.retire(std::move(t.pose.value));t.current.clear();}
    void setShadows(const std::vector<SceneShadow>& values){
        if(activeShadow>=0)throw std::runtime_error("Shadow pass is active");
        if(values.size()>D3D12_REQ_TEXTURE2D_ARRAY_AXIS_DIMENSION)throw std::runtime_error("Shadow array exceeds D3D12 resource limits");
        UINT w=0,h=0;
        for(const auto& s:values){if(!SceneRenderer::finite(s.viewProjection)||!SceneRenderer::finite(s.parameters)||!SceneRenderer::finite(s.size)||s.parameters[2]<0||s.parameters[2]>16||s.parameters[3]<0||s.parameters[3]>1)throw std::runtime_error("Shadow settings invalid");for(std::size_t i=0;i<2;i++)if(s.size[i]<1||s.size[i]>D3D12_REQ_TEXTURE2D_U_OR_V_DIMENSION||std::floor(s.size[i])!=s.size[i])throw std::runtime_error("Shadow dimensions invalid");w=std::max(w,UINT(s.size[0]));h=std::max(h,UINT(s.size[1]));}
        if(values==shadows)return;
        if(values.empty()||w!=shadowWidth||h!=shadowHeight||values.size()!=shadows.size()){
            gpu.retire(std::move(shadowImage.value));gpu.retire(std::move(shadowBuffer.value));shadowTargets={};views.give(shadowView);views.give(shadowDataView);shadowView=shadowDataView={};shadowWidth=shadowHeight=0;
            if(values.empty()){shadows.clear();return;}
            D3D12_RESOURCE_DESC d{};d.Dimension=D3D12_RESOURCE_DIMENSION_TEXTURE2D;d.Width=w;d.Height=h;d.DepthOrArraySize=UINT16(values.size());d.MipLevels=1;d.Format=DXGI_FORMAT_R32_TYPELESS;d.SampleDesc.Count=1;d.Flags=D3D12_RESOURCE_FLAG_ALLOW_DEPTH_STENCIL;
            D3D12_CLEAR_VALUE c{};c.Format=DXGI_FORMAT_D32_FLOAT;c.DepthStencil.Depth=1;
            shadowImage.value=gpu.committed(D3D12_HEAP_TYPE_DEFAULT,d,readable,&c,"Direct3D12 shadow array");shadowImage.state=readable;shadowImage.width=w;shadowImage.height=h;shadowImage.format=d.Format;
            D3D12_DESCRIPTOR_HEAP_DESC hd{};hd.Type=D3D12_DESCRIPTOR_HEAP_TYPE_DSV;hd.NumDescriptors=UINT(values.size());check(gpu.device->CreateDescriptorHeap(&hd,__uuidof(ID3D12DescriptorHeap),reinterpret_cast<void**>(&shadowTargets.p)),"Direct3D12 shadow layers");
            for(UINT i=0;i<values.size();i++){D3D12_DEPTH_STENCIL_VIEW_DESC v{};v.Format=DXGI_FORMAT_D32_FLOAT;v.ViewDimension=D3D12_DSV_DIMENSION_TEXTURE2DARRAY;v.Texture2DArray.FirstArraySlice=i;v.Texture2DArray.ArraySize=1;gpu.device->CreateDepthStencilView(shadowImage.get(),&v,{shadowTargets->GetCPUDescriptorHandleForHeapStart().ptr+SIZE_T(i)*dsvStride});}
            D3D12_SHADER_RESOURCE_VIEW_DESC v{};v.Shader4ComponentMapping=D3D12_DEFAULT_SHADER_4_COMPONENT_MAPPING;v.Format=DXGI_FORMAT_R32_FLOAT;v.ViewDimension=D3D12_SRV_DIMENSION_TEXTURE2DARRAY;v.Texture2DArray.MipLevels=1;v.Texture2DArray.ArraySize=UINT(values.size());shadowView=views.take();gpu.device->CreateShaderResourceView(shadowImage.get(),&v,shadowView);
            shadowBuffer=gpu.buffer(values.size()*sizeof(SceneShadow),readable,D3D12_RESOURCE_FLAG_NONE);
            D3D12_SHADER_RESOURCE_VIEW_DESC b{};b.Shader4ComponentMapping=D3D12_DEFAULT_SHADER_4_COMPONENT_MAPPING;b.ViewDimension=D3D12_SRV_DIMENSION_BUFFER;b.Buffer.NumElements=UINT(values.size());b.Buffer.StructureByteStride=sizeof(SceneShadow);shadowDataView=views.take();gpu.device->CreateShaderResourceView(shadowBuffer.get(),&b,shadowDataView);
            shadowWidth=w;shadowHeight=h;
        }
        gpu.update(shadowBuffer,values.data(),values.size()*sizeof(SceneShadow));shadows=values;
    }
    void beginShadow(std::size_t index){
        if(!begun||activeShadow>=0||index>=shadows.size())throw std::runtime_error("Shadow pass index invalid");
        shadowFrame=frame;frame.viewProjection=shadows[index].viewProjection;frame.viewport={0,0,shadows[index].size[0],shadows[index].size[1]};frame.scissor.reset();activeShadow=int(index);
        gpu.transition(shadowImage,D3D12_RESOURCE_STATE_DEPTH_WRITE);gpu.list->ClearDepthStencilView({shadowTargets->GetCPUDescriptorHandleForHeapStart().ptr+index*dsvStride},D3D12_CLEAR_FLAG_DEPTH,1,0,0,nullptr);
    }
    void endShadow(){if(activeShadow<0)return;frame=shadowFrame;activeShadow=-1;}
    std::size_t shadowLayers()const{return shadows.size();}
    bool pollProbePreparation(bool request=false){if(request)prepareProbes();return true;}
    Probe createProbe(std::uint32_t size){
        if(size<16||size>2048||(size&(size-1)))throw std::runtime_error("Probe resolution must be a power of two (16..2048)");
        prepareProbes();Probe out;out.size=size;out.identity=++probeIdentities;for(UINT n=size;n;n/=2)++out.mips;
        D3D12_RESOURCE_DESC d{};d.Dimension=D3D12_RESOURCE_DIMENSION_TEXTURE2D;d.Width=d.Height=size;d.DepthOrArraySize=6;d.MipLevels=1;d.Format=DXGI_FORMAT_R16G16B16A16_FLOAT;d.SampleDesc.Count=1;d.Flags=D3D12_RESOURCE_FLAG_ALLOW_RENDER_TARGET|D3D12_RESOURCE_FLAG_ALLOW_UNORDERED_ACCESS;
        out.capture.value=gpu.committed(D3D12_HEAP_TYPE_DEFAULT,d,readable,nullptr,"Direct3D12 probe capture");out.capture.state=readable;out.capture.width=out.capture.height=size;out.capture.format=d.Format;
        for(UINT f=0;f<6;f++){D3D12_RENDER_TARGET_VIEW_DESC v{};v.Format=d.Format;v.ViewDimension=D3D12_RTV_DIMENSION_TEXTURE2DARRAY;v.Texture2DArray.FirstArraySlice=f;v.Texture2DArray.ArraySize=1;out.faces[f]=gpu.rtvs.take();gpu.device->CreateRenderTargetView(out.capture.get(),&v,out.faces[f]);}
        D3D12_SHADER_RESOURCE_VIEW_DESC cube{};cube.Shader4ComponentMapping=D3D12_DEFAULT_SHADER_4_COMPONENT_MAPPING;cube.Format=d.Format;cube.ViewDimension=D3D12_SRV_DIMENSION_TEXTURECUBE;cube.TextureCube.MipLevels=1;out.source=views.take();gpu.device->CreateShaderResourceView(out.capture.get(),&cube,out.source);
        d.MipLevels=UINT16(out.mips);d.Flags=D3D12_RESOURCE_FLAG_ALLOW_UNORDERED_ACCESS;out.filtered.value=gpu.committed(D3D12_HEAP_TYPE_DEFAULT,d,readable,nullptr,"Direct3D12 probe filtered cube");out.filtered.state=readable;out.filtered.width=out.filtered.height=size;out.filtered.format=d.Format;
        cube.TextureCube.MipLevels=out.mips;out.view=views.take();gpu.device->CreateShaderResourceView(out.filtered.get(),&cube,out.view);
        out.depth=gpu.depthTarget(size,size);
        out.coefficients=gpu.buffer(9*16,readable,D3D12_RESOURCE_FLAG_ALLOW_UNORDERED_ACCESS);D3D12_SHADER_RESOURCE_VIEW_DESC b{};b.Shader4ComponentMapping=D3D12_DEFAULT_SHADER_4_COMPONENT_MAPPING;b.ViewDimension=D3D12_SRV_DIMENSION_BUFFER;b.Buffer.NumElements=9;b.Buffer.StructureByteStride=16;out.irradiance=views.take();gpu.device->CreateShaderResourceView(out.coefficients.get(),&b,out.irradiance);
        return out;
    }
    void release(Probe& t){for(auto& f:t.faces){gpu.rtvs.give(f);f={};}views.give(t.source);views.give(t.view);views.give(t.irradiance);t.source=t.view=t.irradiance={};gpu.release(t.depth);gpu.retire(std::move(t.capture.value));gpu.retire(std::move(t.filtered.value));gpu.retire(std::move(t.coefficients.value));t.ready=false;}
    void beginProbe(Probe& target,std::uint32_t faceIndex,const Matrix& projection,const std::array<float,4>& eye,const std::array<float,4>& clear,bool indirect=false,bool environment=false){
        if(!begun||activeProbe||activeShadow>=0||faceIndex>=6||!target.capture.value.p||!SceneRenderer::finite(projection)||!SceneRenderer::finite(eye)||!SceneRenderer::finite(clear))throw std::runtime_error("Probe capture binding invalid");
        savedProbe=frame;frame.viewProjection=projection;frame.eye=eye;frame.viewDirection[3]=0;frame.viewport={0,0,float(target.size),float(target.size)};frame.scissor.reset();activeProbe=&target;probeIndirect=indirect;probeFace=faceIndex;
        if(environment){frame.fog={0,0,0,0};frame.fogRange={0,0,0,0};frame.heightFog={0,0,0,1};}
        gpu.transition(target.capture,D3D12_RESOURCE_STATE_RENDER_TARGET);gpu.list->ClearRenderTargetView(target.faces[faceIndex],clear.data(),0,nullptr);gpu.list->ClearDepthStencilView(target.depth.dsv,D3D12_CLEAR_FLAG_DEPTH,1,0,0,nullptr);
    }
    void endProbe(){if(!activeProbe)return;activeProbe=nullptr;frame=savedProbe;}
    bool filterProbeStep(Probe& target,std::uint32_t stage){if(activeProbe)throw std::runtime_error("End probe capture before filtering");if(stage>target.mips)throw std::runtime_error("Probe filter stage invalid");prepareProbes();filterStepInternal(target,stage);return target.ready;}
    void filterProbe(Probe& target){for(std::uint32_t stage=0;stage<=target.mips;stage++)filterProbeStep(target,stage);}
    // Same settings packing as SceneRenderer::setSkyEnvironment / setSkyProbe.
    void setSkyEnvironment(const Texture* texture,std::uint32_t size=128,float rotation=0,float intensity=1){
        if(!std::isfinite(rotation)||!std::isfinite(intensity)||intensity<0)throw std::runtime_error("Sky HDRI settings invalid");
        if(!texture||intensity==0){if(skyProbe.capture.value.p)release(skyProbe);skyProbe=Probe{};skySource=nullptr;skySize=0;skySettings.options[0]=0;return;}
        if(size<16||size>2048||(size&(size-1)))throw std::runtime_error("Sky HDRI resolution invalid");
        if(skySource!=texture||skySize!=size){auto next=createProbe(size);gpu.transition(next.capture,D3D12_RESOURCE_STATE_UNORDERED_ACCESS);D3D12_UNORDERED_ACCESS_VIEW_DESC u{};u.Format=DXGI_FORMAT_R16G16B16A16_FLOAT;u.ViewDimension=D3D12_UAV_DIMENSION_TEXTURE2DARRAY;u.Texture2DArray.ArraySize=6;
            probeDispatch(3,{float(size),0,0,0},nullptr,&texture->srv,next.capture.get(),&u,nullptr,nullptr,(size+7)/8,(size+7)/8,6);filterProbe(next);if(skyProbe.capture.value.p)release(skyProbe);skyProbe=std::move(next);skySource=texture;skySize=size;}
        const float radians=rotation*.01745329252f;skySettings.center={0,0,0,intensity};skySettings.minimum={std::sin(radians),std::cos(radians),0,0};skySettings.maximum={0,0,0,float(skyProbe.mips-1)};skySettings.options={1,1,1,0};
    }
    void setSkyProbe(Probe&& target,float intensity=1){if(!target.ready)throw std::runtime_error("Sky probe invalid");if(!std::isfinite(intensity)||intensity<0)throw std::runtime_error("Sky intensity invalid");if(skyProbe.capture.value.p)release(skyProbe);skyProbe=std::move(target);skySource=nullptr;skySize=0;skySettings.center={0,0,0,intensity};skySettings.minimum={0,1,0,0};skySettings.maximum={0,0,0,float(skyProbe.mips-1)};skySettings.options={1,1,1,0};}
    void releaseAtlas(){views.give(atlasView);views.give(atlasTableView);views.give(atlasSHView);atlasView=atlasTableView=atlasSHView={};gpu.retire(std::move(atlasImage.value));gpu.retire(std::move(atlasTable.value));gpu.retire(std::move(atlasSH.value));atlasCount=0;atlasInfluence=false;atlasStamps.clear();atlasSettings.clear();atlasSpatial.clear();}
    // Same record/region/spatial layout as SceneProbeAtlas::update.
    void setGlobalProbes(const std::vector<ProbeBinding>& bindings){
        if(bindings.empty()){releaseAtlas();return;}
        std::vector<std::array<std::uint64_t,2>> stamps;std::vector<ProbeSettings> settings;
        for(const auto& b:bindings){
            if(!b.resource||!b.resource->ready||!probeVolumeBasisUsable(b.settings)||!probeProjectionUsable(b.settings)||!probeInfluenceUsable(b.settings))throw std::runtime_error("Probe atlas resource owner/pose invalid");
            for(const auto* row:{&b.settings.center,&b.settings.minimum,&b.settings.maximum,&b.settings.options,&b.settings.localX,&b.settings.localY,&b.settings.localZ,&b.settings.faceScale})if(!SceneRenderer::finite(*row))throw std::runtime_error("Probe atlas settings nonfinite");
            for(std::size_t j=0;j<3;j++)if(b.settings.minimum[j]>=b.settings.maximum[j]||b.settings.faceScale[j]<=0)throw std::runtime_error("Probe atlas bounds invalid");
            if(b.settings.center[3]<0||b.settings.minimum[3]<0||b.settings.options[1]<0)throw std::runtime_error("Probe atlas light invalid");
            stamps.push_back({b.resource->identity,b.resource->revision});settings.push_back(b.settings);}
        if(stamps==atlasStamps&&settings.size()==atlasSettings.size()&&!std::memcmp(settings.data(),atlasSettings.data(),settings.size()*sizeof(ProbeSettings)))return;
        const auto tableCount=bindings.size()+((bindings.size()*2-1)*3+19)/20;
        std::vector<const Probe*> unique;std::vector<UINT> indices;
        for(const auto& b:bindings){const auto found=std::find(unique.begin(),unique.end(),b.resource);indices.push_back(UINT(found-unique.begin()));if(found==unique.end())unique.push_back(b.resource);}
        struct Packed {const Probe* resource;};std::vector<Packed> packing;for(auto* p:unique)packing.push_back({p});
        UINT w=0,h=0;const auto regions=SceneProbeAtlas::layout(packing,w,h);
        std::vector<ProbeSpatialShape> shapes;for(const auto& b:bindings){const auto& p=b.settings;shapes.push_back({p.minimum[0],p.minimum[1],p.minimum[2],p.maximum[0],p.maximum[1],p.maximum[2],p.localX[0],p.localX[1],p.localX[2],p.localX[3],p.localY[0],p.localY[1],p.localY[2],p.localY[3],p.localZ[0],p.localZ[1],p.localZ[2],p.localZ[3]});}
        releaseAtlas();atlasSpatial.update(shapes);
        if(!paddingKernel.p){const D3D12_DESCRIPTOR_RANGE srv{D3D12_DESCRIPTOR_RANGE_TYPE_SRV,1,0,0,0},uav{D3D12_DESCRIPTOR_RANGE_TYPE_UAV,1,0,0,0};D3D12_ROOT_PARAMETER params[3]{};params[0].ParameterType=D3D12_ROOT_PARAMETER_TYPE_CBV;params[1].ParameterType=params[2].ParameterType=D3D12_ROOT_PARAMETER_TYPE_DESCRIPTOR_TABLE;params[1].DescriptorTable={1,&srv};params[2].DescriptorTable={1,&uav};
            D3D12_ROOT_SIGNATURE_DESC rd{};rd.NumParameters=3;rd.pParameters=params;paddingRoot=gpu.rootSignature(rd);paddingKernel=gpu.computePipeline(paddingRoot.p,Device::shader(probeAtlasPaddingSource,"HBProbeAtlasPadding","Fill","cs_5_0"));}
        D3D12_RESOURCE_DESC d{};d.Dimension=D3D12_RESOURCE_DIMENSION_TEXTURE2D;d.Width=w;d.Height=h;d.DepthOrArraySize=1;d.MipLevels=1;d.Format=DXGI_FORMAT_R16G16B16A16_FLOAT;d.SampleDesc.Count=1;d.Flags=D3D12_RESOURCE_FLAG_ALLOW_UNORDERED_ACCESS;
        atlasImage.value=gpu.committed(D3D12_HEAP_TYPE_DEFAULT,d,D3D12_RESOURCE_STATE_COPY_DEST,nullptr,"Direct3D12 probe atlas");atlasImage.state=D3D12_RESOURCE_STATE_COPY_DEST;atlasImage.width=w;atlasImage.height=h;atlasImage.format=d.Format;
        atlasSH=gpu.buffer(unique.size()*9*16,D3D12_RESOURCE_STATE_COPY_DEST,D3D12_RESOURCE_FLAG_NONE);
        for(std::size_t i=0;i<unique.size();i++){const auto& p=*unique[i];const auto& rect=regions[i];auto& filtered=const_cast<d3d12::Texture&>(p.filtered);auto& coefficients=const_cast<Buffer&>(p.coefficients);
            gpu.transition(filtered,D3D12_RESOURCE_STATE_COPY_SOURCE);gpu.transition(atlasImage,D3D12_RESOURCE_STATE_COPY_DEST);
            for(UINT level=0;level<p.mips;level++){const UINT size=p.size>>level;for(UINT face=0;face<6;face++){D3D12_TEXTURE_COPY_LOCATION dst{},src{};dst.pResource=atlasImage.get();src.pResource=filtered.get();dst.Type=src.Type=D3D12_TEXTURE_COPY_TYPE_SUBRESOURCE_INDEX;src.SubresourceIndex=level+face*p.mips;gpu.list->CopyTextureRegion(&dst,rect.x+face*(size+2)+1,rect.y+2*p.size-2*size+2*level+1,0,&src,nullptr);}}
            gpu.transition(filtered,readable);gpu.transition(atlasImage,D3D12_RESOURCE_STATE_UNORDERED_ACCESS);
            for(UINT level=0;level<p.mips;level++){const UINT size=p.size>>level;const std::array<UINT,8> values{rect.x,rect.y,p.size,p.mips,level,size,0,0};auto srvs=gpu.table(1),uavs=gpu.table(1);
                D3D12_SHADER_RESOURCE_VIEW_DESC v{};v.Shader4ComponentMapping=D3D12_DEFAULT_SHADER_4_COMPONENT_MAPPING;v.Format=DXGI_FORMAT_R16G16B16A16_FLOAT;v.ViewDimension=D3D12_SRV_DIMENSION_TEXTURE2DARRAY;v.Texture2DArray.MipLevels=p.mips;v.Texture2DArray.ArraySize=6;gpu.device->CreateShaderResourceView(filtered.get(),&v,srvs.cpu);
                D3D12_UNORDERED_ACCESS_VIEW_DESC u{};u.Format=d.Format;u.ViewDimension=D3D12_UAV_DIMENSION_TEXTURE2D;gpu.device->CreateUnorderedAccessView(atlasImage.get(),nullptr,&u,uavs.cpu);
                auto* list=gpu.list.p;list->SetComputeRootSignature(paddingRoot.p);list->SetPipelineState(paddingKernel.p);list->SetComputeRootConstantBufferView(0,gpu.constants(values.data(),sizeof(values)));list->SetComputeRootDescriptorTable(1,srvs.gpu);list->SetComputeRootDescriptorTable(2,uavs.gpu);list->Dispatch((4*size+4+63)/64,6,1);}
            gpu.transition(coefficients,D3D12_RESOURCE_STATE_COPY_SOURCE);gpu.list->CopyBufferRegion(atlasSH.get(),i*9*16,coefficients.get(),0,9*16);gpu.transition(coefficients,readable);}
        gpu.transition(atlasImage,readable);gpu.transition(atlasSH,readable);
        std::vector<SceneProbeAtlas::Record> packet;for(std::size_t i=0;i<bindings.size();i++){const auto& p=*bindings[i].resource;auto set=bindings[i].settings;set.maximum[3]=float(p.mips-1);const auto& rect=regions[indices[i]];packet.push_back({set,{float(rect.x),float(rect.y),float(p.size),float(indices[i])}});}
        packet.resize(tableCount);std::memcpy(reinterpret_cast<char*>(packet.data())+bindings.size()*sizeof(SceneProbeAtlas::Record),atlasSpatial.data().data(),atlasSpatial.data().size()*16);
        atlasTable=gpu.buffer(packet.data(),packet.size()*sizeof(SceneProbeAtlas::Record),readable);
        atlasView=views.take();gpu.device->CreateShaderResourceView(atlasImage.get(),nullptr,atlasView);
        D3D12_SHADER_RESOURCE_VIEW_DESC b{};b.Shader4ComponentMapping=D3D12_DEFAULT_SHADER_4_COMPONENT_MAPPING;b.ViewDimension=D3D12_SRV_DIMENSION_BUFFER;b.Buffer.StructureByteStride=16;
        b.Buffer.NumElements=UINT(packet.size()*sizeof(SceneProbeAtlas::Record)/16);atlasTableView=views.take();gpu.device->CreateShaderResourceView(atlasTable.get(),&b,atlasTableView);
        b.Buffer.NumElements=UINT(unique.size()*9);atlasSHView=views.take();gpu.device->CreateShaderResourceView(atlasSH.get(),&b,atlasSHView);
        atlasCount=UINT(bindings.size());atlasInfluence=std::any_of(bindings.begin(),bindings.end(),[](const ProbeBinding& b){return b.settings.blendPositive[3]>0;});atlasStamps=std::move(stamps);atlasSettings=std::move(settings);
    }
    void setSkyIntensity(float intensity){if(!std::isfinite(intensity)||intensity<0)throw std::runtime_error("Sky intensity invalid");skySettings.center[3]=intensity;}
    // createDataTexture subset: 2D, one layer, RGBA8 (unorm/sRGB) or RGBA32F, optional mips for RGBA8.
    Texture createDataTexture(std::uint32_t w,std::uint32_t h,const std::vector<std::uint8_t>& bytes,std::uint32_t channels=4,bool floating=false,std::uint32_t layers=1,bool srgb=false,bool array=false,const std::string& dimension="2d",bool mipmaps=false){
        if(channels!=4||layers!=1||array||dimension!="2d"||(floating&&(srgb||mipmaps)))throw std::runtime_error("Direct3D12 data texture layout not ported yet");
        if(!floating)return createTexture(w,h,bytes,srgb,mipmaps);
        if(!w||!h||bytes.size()!=std::size_t(w)*h*16)throw std::runtime_error("Material texture dimensions or bytes invalid");
        for(std::size_t i=0;i<bytes.size();i+=4){float v;std::memcpy(&v,bytes.data()+i,4);if(!std::isfinite(v))throw std::runtime_error("2D float texture must be finite");}
        Texture t;static_cast<d3d12::Texture&>(t)=gpu.texture(w,h,DXGI_FORMAT_R32G32B32A32_FLOAT,bytes.data(),w*16);t.srv=views.take();gpu.device->CreateShaderResourceView(t.get(),nullptr,t.srv);return t;
    }
    void setGeometryScene(const Texture* value){geometryScene=value;}
    void setPathEnvironment(const Texture* value){pathEnvironment=value;}
    void setDistanceFieldScene(const Texture* value){distanceField=value;}
    void setPreviousInstances(Instances& target,const std::vector<Matrix>& values){
        if(target.positionsOnly()||values.size()!=target.count){throw std::runtime_error("Previous instance dimensions invalid");}
        for(const auto& m:values){if(!SceneRenderer::finite(m))throw std::runtime_error("Previous instance matrix invalid");}
        if(values==target.previousValues){return;}
        if(!target.previous.value.p){target.previous=gpu.buffer(std::uint64_t(target.capacity)*64,readable,D3D12_RESOURCE_FLAG_NONE);}
        gpu.update(target.previous,values.data(),values.size()*64);target.previousValues=values;
    }
    void releaseMotion(Instances& t){gpu.retire(std::move(t.previous.value));t.previous.size=0;t.previousValues.clear();}
    void releaseMotion(Deformation& t){gpu.retire(std::move(t.previousPose.value));t.previousPose.size=0;t.previous.clear();}
    void setPostLookup(const Texture* value){if(value&&(value->height<2||value->height>64||value->width!=value->height*value->height))throw std::runtime_error("Post lookup texture owner/dimensions invalid");postLookup=value;}
    void releaseTransmission(){views.give(transmissionView);views.give(transmissionDepthView);transmissionView=transmissionDepthView={};gpu.retire(std::move(transmissionImage.value));gpu.retire(std::move(transmissionDepth.value));transmissionImage.width=transmissionImage.height=0;transmissionMips=0;transmissionReady=false;}
    // Same as SceneRenderer::captureTransmission: copy the HDR opaque pass and depth, then build the mip chain.
    void captureTransmission(){
        if(!frame.transmission||!hdr.texture.value.p||activeProbe||activeShadow>=0)throw std::runtime_error("Transmission opaque pass required");
        if(transmissionImage.width!=width||transmissionImage.height!=height){
            releaseTransmission();UINT mips=1;for(UINT extent=std::max(width,height);extent>1;extent/=2)++mips;
            D3D12_RESOURCE_DESC d{};d.Dimension=D3D12_RESOURCE_DIMENSION_TEXTURE2D;d.Width=width;d.Height=height;d.DepthOrArraySize=1;d.MipLevels=UINT16(mips);d.Format=DXGI_FORMAT_R16G16B16A16_FLOAT;d.SampleDesc.Count=1;d.Flags=D3D12_RESOURCE_FLAG_ALLOW_UNORDERED_ACCESS;
            transmissionImage.value=gpu.committed(D3D12_HEAP_TYPE_DEFAULT,d,readable,nullptr,"Direct3D12 transmission HDR");transmissionImage.state=readable;transmissionImage.width=width;transmissionImage.height=height;transmissionImage.format=d.Format;transmissionMips=mips;
            transmissionView=views.take();gpu.device->CreateShaderResourceView(transmissionImage.get(),nullptr,transmissionView);
            d.MipLevels=1;d.Format=DXGI_FORMAT_R32_TYPELESS;d.Flags=D3D12_RESOURCE_FLAG_NONE;transmissionDepth.value=gpu.committed(D3D12_HEAP_TYPE_DEFAULT,d,readable,nullptr,"Direct3D12 transmission depth");transmissionDepth.state=readable;transmissionDepth.width=width;transmissionDepth.height=height;
            D3D12_SHADER_RESOURCE_VIEW_DESC v{};v.Shader4ComponentMapping=D3D12_DEFAULT_SHADER_4_COMPONENT_MAPPING;v.Format=DXGI_FORMAT_R32_FLOAT;v.ViewDimension=D3D12_SRV_DIMENSION_TEXTURE2D;v.Texture2D.MipLevels=1;transmissionDepthView=views.take();gpu.device->CreateShaderResourceView(transmissionDepth.get(),&v,transmissionDepthView);
        }
        gpu.transition(hdr.texture,D3D12_RESOURCE_STATE_COPY_SOURCE);gpu.transition(transmissionImage,D3D12_RESOURCE_STATE_COPY_DEST);
        D3D12_TEXTURE_COPY_LOCATION dst{},src{};dst.pResource=transmissionImage.get();src.pResource=hdr.texture.get();dst.Type=src.Type=D3D12_TEXTURE_COPY_TYPE_SUBRESOURCE_INDEX;gpu.list->CopyTextureRegion(&dst,0,0,0,&src,nullptr);
        gpu.transition(depth,D3D12_RESOURCE_STATE_COPY_SOURCE);gpu.transition(transmissionDepth,D3D12_RESOURCE_STATE_COPY_DEST);gpu.list->CopyResource(transmissionDepth.get(),depth.get());
        gpu.transition(depth,D3D12_RESOURCE_STATE_DEPTH_WRITE);gpu.transition(transmissionDepth,readable);gpu.transition(hdr.texture,D3D12_RESOURCE_STATE_RENDER_TARGET);gpu.transition(transmissionImage,readable);
        generateMips(transmissionImage,transmissionMips,DXGI_FORMAT_R16G16B16A16_FLOAT,DXGI_FORMAT_R16G16B16A16_FLOAT,false);transmissionReady=true;
    }
    void begin(const SceneFrame& value){
        endProbe();endShadow();for(const auto& light:lights)if(light.position[3]<3&&light.cone[3]>0&&light.cone[3]+(light.position[3]==1?5:0)>shadows.size())throw std::runtime_error("Shadow light reference invalid");
        if(value.viewportClear)throw std::runtime_error("Direct3D12 scene frame feature not ported yet");
        // ponytail: post settings are range-checked by BloomPass::begin on the D3D11 path; here only finiteness is enforced.
        if(value.postProcess)for(const auto* row:{&value.postProcess->grade,&value.postProcess->filter,&value.postProcess->effects,&value.postProcess->vignette,&value.postProcess->vignetteColor,&value.postProcess->balance,&value.postProcess->lift,&value.postProcess->gamma,&value.postProcess->gain,&value.postProcess->lens,&value.postProcess->bokeh,&value.postProcess->focus,&value.postProcess->occlusion,&value.postProcess->lookup,&value.postProcess->camera,&value.postProcess->exposure,&value.postProcess->adapt})if(!SceneRenderer::finite(*row))throw std::runtime_error("Post-process non-finite value");
        if(value.postProcess&&value.postProcess->lookup[1]>0&&(!postLookup||value.postProcess->lookup[1]!=float(postLookup->height)))throw std::runtime_error("Post lookup size mismatch");
        if(!SceneRenderer::finite(value.viewProjection)||!SceneRenderer::finite(value.clear)||!SceneRenderer::finite(value.viewport)||!std::isfinite(value.exposure))throw std::runtime_error("Scene frame invalid");
        frame=value;begun=true;gpu.transition(color,D3D12_RESOURCE_STATE_RENDER_TARGET);gpu.transition(depth,D3D12_RESOURCE_STATE_DEPTH_WRITE);
        gpu.list->ClearRenderTargetView(color.rtv,frame.clear.data(),0,nullptr);gpu.list->ClearDepthStencilView(depth.dsv,D3D12_CLEAR_FLAG_DEPTH,1,0,0,nullptr);tilesActive=false;uploadFrame();
        transmissionReady=false;if(!value.transmission)releaseTransmission();hdrPending=false;
        // BloomPass::begin: HDR target when bloom, transmission or post processing is requested.
        post=value.postProcess.value_or(ScenePostProcess{});
        if((!value.bloom||value.bloom->strength==0)&&!value.transmission&&!value.postProcess&&!value.screenEffects){releaseHDR();releaseScreen();}
        else{
            bloomSettings=value.bloom.value_or(SceneBloom{});if(!value.bloom)bloomSettings.strength=0;postArea=value.viewport;if(postArea[2]==0||postArea[3]==0)postArea={0,0,float(width),float(height)};
            const float right=std::min(float(width),postArea[0]+postArea[2]),bottom=std::min(float(height),postArea[1]+postArea[3]);postArea[0]=std::max(0.f,postArea[0]);postArea[1]=std::max(0.f,postArea[1]);postArea[2]=std::max(0.f,right-postArea[0]);postArea[3]=std::max(0.f,bottom-postArea[1]);
            if(postArea[2]==0||postArea[3]==0)releaseHDR();
            else{prepareBloom();const auto bw=std::max(1u,static_cast<UINT>(std::round(postArea[2]*bloomSettings.resolutionScale))),bh=std::max(1u,static_cast<UINT>(std::round(postArea[3]*bloomSettings.resolutionScale)));
                if(hdr.texture.width!=width||hdr.texture.height!=height||((bloomSettings.strength>0)&&(levels.empty()||levels.front()[0].texture.width!=bw||levels.front()[0].texture.height!=bh))||((bloomSettings.strength==0)&&!levels.empty())){
                    releaseHDR();hdr=image(width,height,true);for(UINT x=bw,y=bh;bloomSettings.strength>0&&levels.size()<5;){levels.push_back({image(x,y,false),image(x,y,false)});if(x==1&&y==1)break;x=std::max(1u,x/2);y=std::max(1u,y/2);}}
                std::array<float,4> linear=value.clear;for(std::size_t i=0;i<3;i++)linear[i]=linear[i]<=.04045f?linear[i]/12.92f:std::pow((linear[i]+.055f)/1.055f,2.4f);
                gpu.transition(hdr.texture,D3D12_RESOURCE_STATE_RENDER_TARGET);gpu.list->ClearRenderTargetView(hdr.rtv,linear.data(),0,nullptr);hdrPending=true;beginScreen(value);}
        }
        cullLights(frame.viewport[2]>0?frame.viewport:std::array<float,4>{0,0,float(width),float(height)});
    }
    void draw(const Mesh& mesh,const Matrix& world,const Matrix& normal,const SceneMaterial& material={},const std::array<const Texture*,6>& maps={},const std::array<std::uint32_t,6>& sampling={},std::uint32_t first=0,std::uint32_t count=0,const void* program=nullptr,const std::vector<const Texture*>& programMaps={},const std::vector<std::uint32_t>& programSampling={},const Instances* instances=nullptr,const Deformation* deformation=nullptr,const void* twoD=nullptr,const std::array<ProbeBinding,2>* probeBindings=nullptr,const Matrix* previousWorld=nullptr,float motionFlag=0,const Texture* lightmap=nullptr,bool globalProbes=false){
        if((previousWorld&&!SceneRenderer::finite(*previousWorld))||!std::isfinite(motionFlag)||(motionFlag!=-1&&motionFlag!=0&&motionFlag!=1&&motionFlag!=2))throw std::runtime_error("Object motion input invalid");
        if(lightmap&&!mesh.uv1.value.p)throw std::runtime_error("Baked lightmap texture or UV1 invalid");
        if(!std::isfinite(material.lightmapIntensity)||material.lightmapIntensity<0)throw std::runtime_error("Baked lightmap intensity invalid");
        if(twoD)throw std::runtime_error("Direct3D12 2D bindings are not ported yet");
        if(program||!programMaps.empty()||!programSampling.empty())throw std::runtime_error("Direct3D12 material programs are not ported yet");
        if(deformation&&(deformation->vertexCount!=mesh.vertexCount||deformation->current.empty()||(instances&&instances->positionsOnly())))throw std::runtime_error("Deformation draw binding invalid");
        if(instances&&!instances->count)return;
        const auto blend=static_cast<std::size_t>(material.blend);
        if(!begun||!mesh.count||blend>=3||first>mesh.count||!SceneRenderer::finite(world)||!SceneRenderer::finite(normal))throw std::runtime_error("Direct3D12 scene draw invalid");
        if(!count){count=mesh.count-first;}
        if(count>mesh.count-first||count%3||first%3)throw std::runtime_error("Scene draw range invalid");
        std::vector<std::uint32_t> keys(samplerCount,52);// 52 = linear clamp, D3D11's default for unbound samplers.
        for(std::size_t i=0;i<6&&i<samplerCount;i++)keys[i]=sampling[i];
        // Probe/sky selection mirrors SceneRenderer::draw; t39..t43, t46/t47, b2, sampler s14 = key 16.
        std::array<ProbeSettings,3> probeData{};for(auto& p:probeData)p.options[0]=0;std::array<const Probe*,2> bound{};bool probeSampler=false;
        if(probeBindings&&(!activeProbe||probeIndirect)&&activeShadow<0){for(std::size_t i=0;i<2;i++){const auto& b=(*probeBindings)[i];if(!b.resource)continue;const auto& p=*b.resource;if(activeProbe&&!p.ready)continue;
            if(!p.ready||!SceneRenderer::finite(b.settings.center)||!SceneRenderer::finite(b.settings.minimum)||!SceneRenderer::finite(b.settings.maximum)||!SceneRenderer::finite(b.settings.options)||!SceneRenderer::finite(b.settings.localX)||!SceneRenderer::finite(b.settings.localY)||!SceneRenderer::finite(b.settings.localZ)||!SceneRenderer::finite(b.settings.faceScale)||!probeVolumeBasisUsable(b.settings)||!probeProjectionUsable(b.settings)||!probeInfluenceUsable(b.settings)||b.settings.faceScale[0]<=0||b.settings.faceScale[1]<=0||b.settings.faceScale[2]<=0||b.settings.center[3]<0||b.settings.minimum[3]<0||b.settings.options[1]<0||b.settings.options[2]<0)throw std::runtime_error("Probe draw binding invalid");
            for(std::size_t j=0;j<3;j++)if(b.settings.minimum[j]>=b.settings.maximum[j])throw std::runtime_error("Probe bounds invalid");
            probeData[i]=b.settings;probeData[i].maximum[3]=float(p.mips-1);bound[i]=&p;probeSampler=true;}}
        const bool sky=skyProbe.ready&&activeShadow<0;if(sky){probeData[2]=skySettings;probeSampler=true;}
        const bool atlas=globalProbes&&atlasCount&&(!activeProbe||probeIndirect)&&activeShadow<0;
        if(atlas){probeData[0].blendNegative[3]=atlasInfluence?1.f:0.f;probeData[0].faceScale[3]=float(atlasCount%65536);probeData[1].faceScale[3]=float(atlasCount/65536);probeSampler=true;}
        const bool transmissive=transmissionReady&&(material.transmission||material.volume[0]>0)&&!activeProbe&&activeShadow<0;
        if((probeSampler||transmissive)&&samplerCount>14)keys[14]=16;
        const auto samplerHandle=samplerCount?samplerTable(keys):D3D12_GPU_DESCRIPTOR_HANDLE{};
        if(uploaded!=gpu.submitted())uploadFrame();
        auto srvs=gpu.table(UINT(slots.size()));gpu.device->CopyDescriptorsSimple(UINT(slots.size()),srvs.cpu,nulls->GetCPUDescriptorHandleForHeapStart(),D3D12_DESCRIPTOR_HEAP_TYPE_CBV_SRV_UAV);
        std::uint32_t mask=0;for(std::size_t i=0;i<6;i++)if(maps[i]){gpu.device->CopyDescriptorsSimple(1,srvs.cpuAt(UINT(i)),maps[i]->srv,D3D12_DESCRIPTOR_HEAP_TYPE_CBV_SRV_UAV);mask|=1u<<i;}
        if(lightData.resource){D3D12_SHADER_RESOURCE_VIEW_DESC v{};v.Shader4ComponentMapping=D3D12_DEFAULT_SHADER_4_COMPONENT_MAPPING;v.ViewDimension=D3D12_SRV_DIMENSION_BUFFER;v.Buffer.FirstElement=lightData.offset/sizeof(SceneLight);v.Buffer.NumElements=UINT(lights.size());v.Buffer.StructureByteStride=sizeof(SceneLight);gpu.device->CreateShaderResourceView(lightData.resource,&v,srvs.cpuAt(6));}
        mask|=(mesh.uv1.value.p?16384u:0u)|(material.receiveShadow?64u:0u);
        if(activeShadow<0&&shadowView.ptr){gpu.transition(shadowImage,readable);gpu.device->CopyDescriptorsSimple(1,srvs.cpuAt(24),shadowView,D3D12_DESCRIPTOR_HEAP_TYPE_CBV_SRV_UAV);}
        if(shadowDataView.ptr)gpu.device->CopyDescriptorsSimple(1,srvs.cpuAt(25),shadowDataView,D3D12_DESCRIPTOR_HEAP_TYPE_CBV_SRV_UAV);
        if(instances){mask|=instances->positionsOnly()?512u:256u;structured(srvs,instances->positionsOnly()?27:26,instances->data,instances->stride,instances->capacity);if(!instances->positionsOnly()&&!material.doubleSided)mask|=material.backSide?131072u:65536u;}
        if(deformation){mask|=1024u;if(deformation->boneCount)structured(srvs,28,deformation->skin,sizeof(SceneSkin),deformation->vertexCount);if(deformation->morphCount)structured(srvs,29,deformation->morph,sizeof(SceneMorph),deformation->vertexCount*deformation->morphCount);structured(srvs,30,deformation->pose,16,deformation->poseBytes/16);structured(srvs,31,deformation->previousPose.value.p?deformation->previousPose:deformation->pose,16,deformation->poseBytes/16);}
        if(instances&&!instances->positionsOnly()&&instances->previous.value.p)structured(srvs,32,instances->previous,64,instances->capacity);
        if(tilesActive&&activeShadow<0&&!activeProbe){mask|=8192u;structured(srvs,48,tileBits,4,UINT(tileBits.size/4));}
        if(activeProbe)mask|=2048u;
        const auto copy=[&](UINT slot,D3D12_CPU_DESCRIPTOR_HANDLE h){gpu.device->CopyDescriptorsSimple(1,srvs.cpuAt(slot),h,D3D12_DESCRIPTOR_HEAP_TYPE_CBV_SRV_UAV);};
        for(UINT i=0;i<2;i++)if(bound[i]){copy(39+i,bound[i]->view);copy(41+i,bound[i]->irradiance);copy(43,brdfView);}
        if(sky){copy(46,skyProbe.view);copy(47,skyProbe.irradiance);copy(43,brdfView);}
        if(atlas){copy(50,atlasView);copy(51,atlasTableView);copy(52,atlasSHView);copy(43,brdfView);}
        if(transmissive){copy(44,transmissionView);copy(45,transmissionDepthView);mask|=4096u;}
        const bool toHDR=hdr.texture.value.p&&!activeProbe&&activeShadow<0;if(toHDR){mask|=128u;hdrPending=true;gpu.transition(hdr.texture,D3D12_RESOURCE_STATE_RENDER_TARGET);}
        if(lightmap){copy(49,lightmap->srv);mask|=32768u|(material.lightmapReflectionMix?262144u:0u);}
        const auto& rect=frame.viewport;const bool custom=rect[2]>0&&rect[3]>0;const std::array<float,4> area=custom?rect:std::array<float,4>{0,0,float(width),float(height)};
        const auto* screenSettings=frame.screenEffects?&*frame.screenEffects:nullptr;Matrix prior=identity;if(screenSettings&&motionFlag!=0)prior=SceneRenderer::multiplyMatrix(screenSettings->previousVP,previousWorld?*previousWorld:world);
        Constants data{frame.viewProjection,world,normal,prior,{screenSettings?motionFlag:0,screenSettings?screenSettings->jitter[0]-screenSettings->jitter[2]:0,screenSettings?screenSettings->jitter[1]-screenSettings->jitter[3]:0,instances&&instances->previous.value.p?1.f:0.f},material.color,material.emissive,{material.roughness,material.metalness,material.alphaCutoff,material.unlit?1.f:0.f},frame.eye,frame.ambient,material.uvX,material.uvY,{float(mask),float(lights.size()),material.toneMapped?1.f:0.f,material.sky?2.f:material.vertexColors?1.f:0.f},{material.normalScale[0],material.normalScale[1],frame.exposure,frame.time},frame.fog,frame.fogRange,frame.heightFog,material.skyTop,material.skyHorizon,material.sunDirection,material.sunColor,material.shotShape,material.physical,{material.volume[0],material.volume[1],float(width),float(height)},area,material.absorption,material.sheenColor,material.lobes,material.film,material.specular,material.scatter,material.scatterColor,material.hairTangent,{deformation?deformation->vertexCount:0,deformation?deformation->morphCount:0,deformation?deformation->boneCount:0,transmissionReady?transmissionMips-1:0},material.moonDirection,material.moonColor,frame.viewDirection};
        data.shotShape[3]=material.lightmapIntensity;
        auto u=gpu.upload(std::max<std::size_t>(sizeof(data),cbuffers.at(0)),256);std::memset(u.cpu,0,std::max<std::size_t>(sizeof(data),cbuffers.at(0)));std::memcpy(u.cpu,&data,sizeof(data));
        const std::size_t raster=(SceneRenderer::orientation(world)<0?3:0)+(material.doubleSided||(instances&&instances->mirrored)?2:material.backSide?1:0);
        auto* list=gpu.list.p;list->SetGraphicsRootSignature(root.p);const bool mrt=toHDR&&screen&&(surfaceNormal.texture.value.p||surfaceMotion.texture.value.p);UINT surfaceTargets=0;{UINT bit=1;for(auto* i:{&surfaceNormal,&surfaceAlbedo,&surfaceMotion,&surfaceAmbient}){if(i->texture.value.p)surfaceTargets|=bit;bit<<=1;}}
        list->SetPipelineState(activeShadow>=0?shadowPipeline(raster):mrt?surfacePipeline(raster,blend,(material.depthTest?1:0)|(material.depthWrite?2:0),surfaceTargets):pipeline(raster,blend,(material.depthTest?1:0)|(material.depthWrite?2:0),activeProbe!=nullptr||toHDR));
        const auto probeAddress=gpu.constants(probeData.data(),sizeof(probeData));
        UINT index=0;for(const auto& c:cbuffers)list->SetGraphicsRootConstantBufferView(index++,c.first==0?u.gpu:c.first==2?probeAddress:frameBuffers.at(c.first));
        list->SetGraphicsRootDescriptorTable(srvRoot,srvs.gpu);if(samplerCount)list->SetGraphicsRootDescriptorTable(samplerRoot,samplerHandle);
        const D3D12_VIEWPORT viewport{area[0],area[1],area[2],area[3],0,1};const auto crop=frame.scissor.value_or(area);
        const D3D12_RECT scissor{static_cast<LONG>(std::floor(crop[0])),static_cast<LONG>(std::floor(crop[1])),static_cast<LONG>(std::ceil(crop[0]+crop[2])),static_cast<LONG>(std::ceil(crop[1]+crop[3]))};
        if(activeProbe){list->OMSetRenderTargets(1,&activeProbe->faces[probeFace],FALSE,&activeProbe->depth.dsv);}
        else if(mrt){std::array<D3D12_CPU_DESCRIPTOR_HANDLE,5> targets{hdr.rtv,nullTargets[0],nullTargets[1],nullTargets[2],nullTargets[3]};std::size_t k=1;for(auto* i:{&surfaceNormal,&surfaceAlbedo,&surfaceMotion,&surfaceAmbient}){if(i->texture.value.p){gpu.transition(i->texture,D3D12_RESOURCE_STATE_RENDER_TARGET);targets[k]=i->rtv;}++k;}list->OMSetRenderTargets(5,targets.data(),FALSE,&depth.dsv);}
        else if(activeShadow<0){list->OMSetRenderTargets(1,toHDR?&hdr.rtv:&color.rtv,FALSE,&depth.dsv);}
        else{const D3D12_CPU_DESCRIPTOR_HANDLE layer{shadowTargets->GetCPUDescriptorHandleForHeapStart().ptr+SIZE_T(activeShadow)*dsvStride};list->OMSetRenderTargets(0,nullptr,FALSE,&layer);}
        list->RSSetViewports(1,&viewport);list->RSSetScissorRects(1,&scissor);
        const UINT64 bytes=UINT64(mesh.vertexCount)*sizeof(SceneVertex);
        const D3D12_VERTEX_BUFFER_VIEW buffers[2]={{mesh.vertices.address(),UINT(bytes),sizeof(SceneVertex)},mesh.uv1.value.p?D3D12_VERTEX_BUFFER_VIEW{mesh.uv1.address(),mesh.vertexCount*8,8}:D3D12_VERTEX_BUFFER_VIEW{mesh.vertices.address()+24,UINT(bytes-24),sizeof(SceneVertex)}};
        const D3D12_INDEX_BUFFER_VIEW indexView{mesh.indices.address(),mesh.count*4,DXGI_FORMAT_R32_UINT};
        list->IASetPrimitiveTopology(D3D_PRIMITIVE_TOPOLOGY_TRIANGLELIST);list->IASetVertexBuffers(0,2,buffers);list->IASetIndexBuffer(&indexView);list->DrawIndexedInstanced(count,instances?instances->count:1,first,0,0);
    }
    std::vector<std::uint8_t> readPixels(){endProbe();endShadow();completeHDR();return gpu.read(color);}
    d3d12::Texture& target(){return color;}
};
}
#endif
