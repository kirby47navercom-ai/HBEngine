#pragma once
// D3D12 port: SceneRenderer's own scene VS/PS on real D3D12 command lists.
// Phase 2: meshes, material constants, six material maps with sampler keys, lights, blend/depth/cull,
// viewport and scissor. Phase 3-1: shadow maps, instancing/shot positions, skinning/morphs, light tiles.
// Phase 3-2a: reflection probe capture/filter (SceneProbes kernels), local probe bindings, sky HDRI.
// Still D3D11-only: probe atlas, material programs, 2D, transmission, bloom/post, motion vectors.
#include "SceneRender.hpp"
#include "D3D12Direct.hpp"
#if defined(_WIN32) && !defined(HB_COMPUTE_UNAVAILABLE)
#include <d3d11shader.h>
#include <map>

namespace hb::gpu::d3d12 {
class SceneMeshRenderer {
public:
    struct Mesh {Buffer vertices,indices,uv1;UINT count=0,vertexCount=0;};
    struct Texture : d3d12::Texture {D3D12_CPU_DESCRIPTOR_HANDLE srv{};};
    struct Instances {Buffer data;UINT capacity=0,count=0,stride=sizeof(SceneInstance);bool mirrored=false;
        bool positionsOnly()const{return stride==16;}std::uint32_t capacityCount()const{return capacity;}};
    struct Deformation {Buffer skin,morph,pose;std::uint32_t vertexCount=0,boneCount=0,morphCount=0,poseBytes=0;std::vector<float> current;};
    // HDR cube capture (R16G16B16A16F), prefiltered mip chain, 9 SH irradiance coefficients.
    struct Probe {d3d12::Texture capture,filtered,depth;Buffer coefficients;std::array<D3D12_CPU_DESCRIPTOR_HANDLE,6> faces{};D3D12_CPU_DESCRIPTOR_HANDLE source{},view{},irradiance{};UINT size=0,mips=0;bool ready=false;
        bool available()const{return ready;}};
    struct ProbeBinding {const Probe* resource=nullptr;ProbeSettings settings;};
private:
    static constexpr D3D12_RESOURCE_STATES readable=D3D12_RESOURCE_STATE_NON_PIXEL_SHADER_RESOURCE|D3D12_RESOURCE_STATE_PIXEL_SHADER_RESOURCE;
    using Constants=SceneRenderer::Constants;
    struct Slot {D3D12_SRV_DIMENSION dimension=D3D12_SRV_DIMENSION_TEXTURE2D;UINT stride=0;bool raw=false;};
    Device& gpu;UINT width,height;
    std::vector<unsigned char> vs,ps,shadowPs;Com<ID3D12RootSignature> root;std::array<Com<ID3D12PipelineState>,144> pipelines;std::array<Com<ID3D12PipelineState>,6> shadowPipelines;
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
    Probe skyProbe;const Texture* skySource=nullptr;std::uint32_t skySize=0;ProbeSettings skySettings{};

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
        }else{gpu.transition(target.coefficients,D3D12_RESOURCE_STATE_UNORDERED_ACCESS);probeDispatch(2,{0,0,0,0},&target.source,nullptr,nullptr,nullptr,nullptr,nullptr,1,1,1,target.coefficients.get());gpu.transition(target.coefficients,readable);target.ready=true;}
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
        const auto source=SceneRenderer::shaderSource();vs=Device::shader(source,"HBSceneRender","VS","vs_5_0");ps=Device::shader(source,"HBSceneRender","PS","ps_5_0");shadowPs=Device::shader(source,"HBSceneRender","ShadowPS","ps_5_0");
        reflect(vs);reflect(ps);if(slots.empty()||samplerCount>16||!cbuffers.count(0))throw std::runtime_error("Direct3D12 scene shader layout unexpected");
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
    Texture createTexture(UINT w,UINT h,const std::vector<std::uint8_t>& rgba,bool srgb=true){
        if(rgba.size()!=std::size_t(w)*h*4)throw std::runtime_error("Direct3D12 scene texture bytes invalid");
        Texture t;static_cast<d3d12::Texture&>(t)=gpu.texture(w,h,srgb?DXGI_FORMAT_R8G8B8A8_UNORM_SRGB:DXGI_FORMAT_R8G8B8A8_UNORM,rgba.data(),w*4);
        t.srv=views.take();gpu.device->CreateShaderResourceView(t.get(),nullptr,t.srv);return t;
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
    // Same packing as SceneRenderer::setPose. ponytail: no previous pose (motion vectors are phase 3-3).
    bool setPose(Deformation& target,const std::vector<Matrix>& bones,const std::vector<float>& weights,const std::array<float,3>& bindTranslation={}){
        if(bones.size()!=target.boneCount||weights.size()!=target.morphCount||!SceneRenderer::finite(weights)||!SceneRenderer::finite(bindTranslation))throw std::runtime_error("Deformation pose dimensions invalid");
        std::vector<float> values;values.reserve(target.poseBytes/4);for(const auto& m:bones){if(!SceneRenderer::finite(m))throw std::runtime_error("Bone matrix must be finite");values.insert(values.end(),m.begin(),m.end());}
        values.insert(values.end(),weights.begin(),weights.end());values.resize(target.poseBytes/4,0);if(target.boneCount)std::copy(bindTranslation.begin(),bindTranslation.end(),values.end()-4);
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
        prepareProbes();Probe out;out.size=size;for(UINT n=size;n;n/=2)++out.mips;
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
    void setSkyIntensity(float intensity){if(!std::isfinite(intensity)||intensity<0)throw std::runtime_error("Sky intensity invalid");skySettings.center[3]=intensity;}
    void begin(const SceneFrame& value){
        endProbe();endShadow();for(const auto& light:lights)if(light.position[3]<3&&light.cone[3]>0&&light.cone[3]+(light.position[3]==1?5:0)>shadows.size())throw std::runtime_error("Shadow light reference invalid");
        if(value.bloom||value.postProcess||value.screenEffects||value.transmission||value.viewportClear)throw std::runtime_error("Direct3D12 scene frame feature not ported yet");
        if(!SceneRenderer::finite(value.viewProjection)||!SceneRenderer::finite(value.clear)||!SceneRenderer::finite(value.viewport)||!std::isfinite(value.exposure))throw std::runtime_error("Scene frame invalid");
        frame=value;begun=true;gpu.transition(color,D3D12_RESOURCE_STATE_RENDER_TARGET);
        gpu.list->ClearRenderTargetView(color.rtv,frame.clear.data(),0,nullptr);gpu.list->ClearDepthStencilView(depth.dsv,D3D12_CLEAR_FLAG_DEPTH,1,0,0,nullptr);tilesActive=false;uploadFrame();
        cullLights(frame.viewport[2]>0?frame.viewport:std::array<float,4>{0,0,float(width),float(height)});
    }
    void draw(const Mesh& mesh,const Matrix& world,const Matrix& normal,const SceneMaterial& material={},const std::array<const Texture*,6>& maps={},const std::array<std::uint32_t,6>& sampling={},std::uint32_t first=0,std::uint32_t count=0,const void* program=nullptr,const std::vector<const Texture*>& programMaps={},const std::vector<std::uint32_t>& programSampling={},const Instances* instances=nullptr,const Deformation* deformation=nullptr,const void* twoD=nullptr,const std::array<ProbeBinding,2>* probeBindings=nullptr){
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
        if(probeSampler&&samplerCount>14)keys[14]=16;
        const auto samplerHandle=samplerCount?samplerTable(keys):D3D12_GPU_DESCRIPTOR_HANDLE{};
        if(uploaded!=gpu.submitted())uploadFrame();
        auto srvs=gpu.table(UINT(slots.size()));gpu.device->CopyDescriptorsSimple(UINT(slots.size()),srvs.cpu,nulls->GetCPUDescriptorHandleForHeapStart(),D3D12_DESCRIPTOR_HEAP_TYPE_CBV_SRV_UAV);
        std::uint32_t mask=0;for(std::size_t i=0;i<6;i++)if(maps[i]){gpu.device->CopyDescriptorsSimple(1,srvs.cpuAt(UINT(i)),maps[i]->srv,D3D12_DESCRIPTOR_HEAP_TYPE_CBV_SRV_UAV);mask|=1u<<i;}
        if(lightData.resource){D3D12_SHADER_RESOURCE_VIEW_DESC v{};v.Shader4ComponentMapping=D3D12_DEFAULT_SHADER_4_COMPONENT_MAPPING;v.ViewDimension=D3D12_SRV_DIMENSION_BUFFER;v.Buffer.FirstElement=lightData.offset/sizeof(SceneLight);v.Buffer.NumElements=UINT(lights.size());v.Buffer.StructureByteStride=sizeof(SceneLight);gpu.device->CreateShaderResourceView(lightData.resource,&v,srvs.cpuAt(6));}
        mask|=(mesh.uv1.value.p?16384u:0u)|(material.receiveShadow?64u:0u);
        if(activeShadow<0&&shadowView.ptr){gpu.transition(shadowImage,readable);gpu.device->CopyDescriptorsSimple(1,srvs.cpuAt(24),shadowView,D3D12_DESCRIPTOR_HEAP_TYPE_CBV_SRV_UAV);}
        if(shadowDataView.ptr)gpu.device->CopyDescriptorsSimple(1,srvs.cpuAt(25),shadowDataView,D3D12_DESCRIPTOR_HEAP_TYPE_CBV_SRV_UAV);
        if(instances){mask|=instances->positionsOnly()?512u:256u;structured(srvs,instances->positionsOnly()?27:26,instances->data,instances->stride,instances->capacity);if(!instances->positionsOnly()&&!material.doubleSided)mask|=material.backSide?131072u:65536u;}
        if(deformation){mask|=1024u;if(deformation->boneCount)structured(srvs,28,deformation->skin,sizeof(SceneSkin),deformation->vertexCount);if(deformation->morphCount)structured(srvs,29,deformation->morph,sizeof(SceneMorph),deformation->vertexCount*deformation->morphCount);structured(srvs,30,deformation->pose,16,deformation->poseBytes/16);structured(srvs,31,deformation->pose,16,deformation->poseBytes/16);}
        if(tilesActive&&activeShadow<0&&!activeProbe){mask|=8192u;structured(srvs,48,tileBits,4,UINT(tileBits.size/4));}
        if(activeProbe)mask|=2048u;
        const auto copy=[&](UINT slot,D3D12_CPU_DESCRIPTOR_HANDLE h){gpu.device->CopyDescriptorsSimple(1,srvs.cpuAt(slot),h,D3D12_DESCRIPTOR_HEAP_TYPE_CBV_SRV_UAV);};
        for(UINT i=0;i<2;i++)if(bound[i]){copy(39+i,bound[i]->view);copy(41+i,bound[i]->irradiance);copy(43,brdfView);}
        if(sky){copy(46,skyProbe.view);copy(47,skyProbe.irradiance);copy(43,brdfView);}
        const auto& rect=frame.viewport;const bool custom=rect[2]>0&&rect[3]>0;const std::array<float,4> area=custom?rect:std::array<float,4>{0,0,float(width),float(height)};
        Constants data{frame.viewProjection,world,normal,identity,{0,0,0,0},material.color,material.emissive,{material.roughness,material.metalness,material.alphaCutoff,material.unlit?1.f:0.f},frame.eye,frame.ambient,material.uvX,material.uvY,{float(mask),float(lights.size()),material.toneMapped?1.f:0.f,material.sky?2.f:material.vertexColors?1.f:0.f},{material.normalScale[0],material.normalScale[1],frame.exposure,frame.time},frame.fog,frame.fogRange,frame.heightFog,material.skyTop,material.skyHorizon,material.sunDirection,material.sunColor,material.shotShape,material.physical,{material.volume[0],material.volume[1],float(width),float(height)},area,material.absorption,material.sheenColor,material.lobes,material.film,material.specular,material.scatter,material.scatterColor,material.hairTangent,{deformation?deformation->vertexCount:0,deformation?deformation->morphCount:0,deformation?deformation->boneCount:0,0},material.moonDirection,material.moonColor,frame.viewDirection};
        data.shotShape[3]=material.lightmapIntensity;
        auto u=gpu.upload(std::max<std::size_t>(sizeof(data),cbuffers.at(0)),256);std::memset(u.cpu,0,std::max<std::size_t>(sizeof(data),cbuffers.at(0)));std::memcpy(u.cpu,&data,sizeof(data));
        const std::size_t raster=(SceneRenderer::orientation(world)<0?3:0)+(material.doubleSided||(instances&&instances->mirrored)?2:material.backSide?1:0);
        auto* list=gpu.list.p;list->SetGraphicsRootSignature(root.p);list->SetPipelineState(activeShadow<0?pipeline(raster,blend,(material.depthTest?1:0)|(material.depthWrite?2:0),activeProbe!=nullptr):shadowPipeline(raster));
        const auto probeAddress=gpu.constants(probeData.data(),sizeof(probeData));
        UINT index=0;for(const auto& c:cbuffers)list->SetGraphicsRootConstantBufferView(index++,c.first==0?u.gpu:c.first==2?probeAddress:frameBuffers.at(c.first));
        list->SetGraphicsRootDescriptorTable(srvRoot,srvs.gpu);if(samplerCount)list->SetGraphicsRootDescriptorTable(samplerRoot,samplerHandle);
        const D3D12_VIEWPORT viewport{area[0],area[1],area[2],area[3],0,1};const auto crop=frame.scissor.value_or(area);
        const D3D12_RECT scissor{static_cast<LONG>(std::floor(crop[0])),static_cast<LONG>(std::floor(crop[1])),static_cast<LONG>(std::ceil(crop[0]+crop[2])),static_cast<LONG>(std::ceil(crop[1]+crop[3]))};
        if(activeProbe){list->OMSetRenderTargets(1,&activeProbe->faces[probeFace],FALSE,&activeProbe->depth.dsv);}
        else if(activeShadow<0){list->OMSetRenderTargets(1,&color.rtv,FALSE,&depth.dsv);}
        else{const D3D12_CPU_DESCRIPTOR_HANDLE layer{shadowTargets->GetCPUDescriptorHandleForHeapStart().ptr+SIZE_T(activeShadow)*dsvStride};list->OMSetRenderTargets(0,nullptr,FALSE,&layer);}
        list->RSSetViewports(1,&viewport);list->RSSetScissorRects(1,&scissor);
        const UINT64 bytes=UINT64(mesh.vertexCount)*sizeof(SceneVertex);
        const D3D12_VERTEX_BUFFER_VIEW buffers[2]={{mesh.vertices.address(),UINT(bytes),sizeof(SceneVertex)},mesh.uv1.value.p?D3D12_VERTEX_BUFFER_VIEW{mesh.uv1.address(),mesh.vertexCount*8,8}:D3D12_VERTEX_BUFFER_VIEW{mesh.vertices.address()+24,UINT(bytes-24),sizeof(SceneVertex)}};
        const D3D12_INDEX_BUFFER_VIEW indexView{mesh.indices.address(),mesh.count*4,DXGI_FORMAT_R32_UINT};
        list->IASetPrimitiveTopology(D3D_PRIMITIVE_TOPOLOGY_TRIANGLELIST);list->IASetVertexBuffers(0,2,buffers);list->IASetIndexBuffer(&indexView);list->DrawIndexedInstanced(count,instances?instances->count:1,first,0,0);
    }
    std::vector<std::uint8_t> readPixels(){return gpu.read(color);}
    d3d12::Texture& target(){return color;}
};
}
#endif
