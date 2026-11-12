#pragma once
// Phase 2 of the D3D12 port: SceneRenderer's own scene VS/PS on real D3D12 command lists.
// Meshes, material constants, six material maps with sampler keys, lights, blend/depth/cull
// rules, viewport and scissor match the D3D11 path. Shadows, probes, instancing, deformation,
// material programs, 2D, transmission, light tiles and bloom/post are phase 3.
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
private:
    using Constants=SceneRenderer::Constants;
    struct Slot {D3D12_SRV_DIMENSION dimension=D3D12_SRV_DIMENSION_TEXTURE2D;UINT stride=0;bool raw=false;};
    Device& gpu;UINT width,height;
    std::vector<unsigned char> vs,ps;Com<ID3D12RootSignature> root;std::array<Com<ID3D12PipelineState>,72> pipelines;
    std::map<UINT,UINT> cbuffers;std::vector<Slot> slots;UINT samplerCount=0,srvRoot=0,samplerRoot=0;
    Com<ID3D12DescriptorHeap> nulls;DescriptorPool views;
    std::map<std::vector<std::uint32_t>,D3D12_GPU_DESCRIPTOR_HANDLE> samplerTables;UINT samplerUsed=0;
    d3d12::Texture color,depth;SceneFrame frame;bool begun=false;
    std::vector<SceneLight> lights;std::uint64_t uploaded=~std::uint64_t(0);std::map<UINT,D3D12_GPU_VIRTUAL_ADDRESS> frameBuffers;Upload lightData{};

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
    ID3D12PipelineState* pipeline(std::size_t raster,std::size_t blend,std::size_t depthMode){
        auto& p=pipelines[raster+6*(blend+3*depthMode)];if(p.p)return p.p;
        static const D3D12_INPUT_ELEMENT_DESC elements[]={{"POSITION",0,DXGI_FORMAT_R32G32B32_FLOAT,0,0,D3D12_INPUT_CLASSIFICATION_PER_VERTEX_DATA,0},{"NORMAL",0,DXGI_FORMAT_R32G32B32_FLOAT,0,12,D3D12_INPUT_CLASSIFICATION_PER_VERTEX_DATA,0},{"TEXCOORD",0,DXGI_FORMAT_R32G32_FLOAT,0,24,D3D12_INPUT_CLASSIFICATION_PER_VERTEX_DATA,0},{"COLOR",0,DXGI_FORMAT_R32G32B32A32_FLOAT,0,32,D3D12_INPUT_CLASSIFICATION_PER_VERTEX_DATA,0},{"TEXCOORD",1,DXGI_FORMAT_R32G32_FLOAT,1,0,D3D12_INPUT_CLASSIFICATION_PER_VERTEX_DATA,0}};
        auto d=Device::defaults(root.p,vs,ps,DXGI_FORMAT_R8G8B8A8_UNORM,DXGI_FORMAT_D32_FLOAT);d.InputLayout={elements,5};
        d.RasterizerState.CullMode=raster%3==0?D3D12_CULL_MODE_BACK:raster%3==1?D3D12_CULL_MODE_FRONT:D3D12_CULL_MODE_NONE;d.RasterizerState.FrontCounterClockwise=raster<3;
        auto& t=d.BlendState.RenderTarget[0];t.BlendEnable=blend!=2;t.SrcBlend=D3D12_BLEND_SRC_ALPHA;t.DestBlend=blend==1?D3D12_BLEND_ONE:D3D12_BLEND_INV_SRC_ALPHA;t.BlendOp=D3D12_BLEND_OP_ADD;t.SrcBlendAlpha=D3D12_BLEND_ONE;t.DestBlendAlpha=D3D12_BLEND_INV_SRC_ALPHA;t.BlendOpAlpha=D3D12_BLEND_OP_ADD;t.LogicOp=D3D12_LOGIC_OP_NOOP;
        d.DepthStencilState.DepthEnable=TRUE;d.DepthStencilState.DepthFunc=(depthMode&1)?D3D12_COMPARISON_FUNC_LESS_EQUAL:D3D12_COMPARISON_FUNC_ALWAYS;d.DepthStencilState.DepthWriteMask=(depthMode&2)?D3D12_DEPTH_WRITE_MASK_ALL:D3D12_DEPTH_WRITE_MASK_ZERO;
        p=gpu.pipeline(d);return p.p;
    }
    // Frame data lives in the upload ring; re-upload after any submit (read, sampler flush).
    void uploadFrame(){
        frameBuffers.clear();std::array<ProbeSettings,3> probeData{};for(auto& p:probeData)p.options[0]=0;const Scene2D settings{};
        for(const auto& [reg,size]:cbuffers){if(reg==0)continue;auto u=gpu.upload(size,256);std::memset(u.cpu,0,size);
            if(reg==1){std::memcpy(u.cpu,&settings,std::min<std::size_t>(size,sizeof(settings)));}
            if(reg==2){std::memcpy(u.cpu,probeData.data(),std::min<std::size_t>(size,sizeof(probeData)));}
            frameBuffers[reg]=u.gpu;}
        lightData={};if(!lights.empty()){lightData=gpu.upload(lights.size()*sizeof(SceneLight),sizeof(SceneLight));std::memcpy(lightData.cpu,lights.data(),lights.size()*sizeof(SceneLight));}
        uploaded=gpu.submitted();
    }
public:
    SceneMeshRenderer(Device& device,UINT targetWidth,UINT targetHeight):gpu(device),width(targetWidth),height(targetHeight){
        const auto source=SceneRenderer::shaderSource();vs=Device::shader(source,"HBSceneRender","VS","vs_5_0");ps=Device::shader(source,"HBSceneRender","PS","ps_5_0");
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
        color=gpu.renderTarget(width,height,DXGI_FORMAT_R8G8B8A8_UNORM);depth=gpu.depthTarget(width,height);
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
        for(const auto& l:values)if(!SceneRenderer::finite(l.position)||!SceneRenderer::finite(l.direction)||!SceneRenderer::finite(l.color)||!SceneRenderer::finite(l.cone)||l.position[3]<0||l.position[3]>3||l.cone[3]!=0)throw std::runtime_error("Direct3D12 scene light invalid (shadowed lights are phase 3)");
        lights=values;uploaded=~std::uint64_t(0);
    }
    void begin(const SceneFrame& value){
        if(value.bloom||value.postProcess||value.screenEffects||value.transmission||value.viewportClear)throw std::runtime_error("Direct3D12 scene frame feature not ported yet");
        if(!SceneRenderer::finite(value.viewProjection)||!SceneRenderer::finite(value.clear)||!SceneRenderer::finite(value.viewport)||!std::isfinite(value.exposure))throw std::runtime_error("Scene frame invalid");
        frame=value;begun=true;gpu.transition(color,D3D12_RESOURCE_STATE_RENDER_TARGET);
        gpu.list->ClearRenderTargetView(color.rtv,frame.clear.data(),0,nullptr);gpu.list->ClearDepthStencilView(depth.dsv,D3D12_CLEAR_FLAG_DEPTH,1,0,0,nullptr);uploadFrame();
    }
    void draw(const Mesh& mesh,const Matrix& world,const Matrix& normal,const SceneMaterial& material={},const std::array<const Texture*,6>& maps={},const std::array<std::uint32_t,6>& sampling={},std::uint32_t first=0,std::uint32_t count=0){
        const auto blend=static_cast<std::size_t>(material.blend);
        if(!begun||!mesh.count||blend>=3||first>mesh.count||!SceneRenderer::finite(world)||!SceneRenderer::finite(normal))throw std::runtime_error("Direct3D12 scene draw invalid");
        if(!count){count=mesh.count-first;}
        if(count>mesh.count-first||count%3||first%3)throw std::runtime_error("Scene draw range invalid");
        std::vector<std::uint32_t> keys(samplerCount,52);// 52 = linear clamp, D3D11's default for unbound samplers.
        for(std::size_t i=0;i<6&&i<samplerCount;i++)keys[i]=sampling[i];
        const auto samplerHandle=samplerCount?samplerTable(keys):D3D12_GPU_DESCRIPTOR_HANDLE{};
        if(uploaded!=gpu.submitted())uploadFrame();
        auto srvs=gpu.table(UINT(slots.size()));gpu.device->CopyDescriptorsSimple(UINT(slots.size()),srvs.cpu,nulls->GetCPUDescriptorHandleForHeapStart(),D3D12_DESCRIPTOR_HEAP_TYPE_CBV_SRV_UAV);
        std::uint32_t mask=0;for(std::size_t i=0;i<6;i++)if(maps[i]){gpu.device->CopyDescriptorsSimple(1,srvs.cpuAt(UINT(i)),maps[i]->srv,D3D12_DESCRIPTOR_HEAP_TYPE_CBV_SRV_UAV);mask|=1u<<i;}
        if(lightData.resource){D3D12_SHADER_RESOURCE_VIEW_DESC v{};v.Shader4ComponentMapping=D3D12_DEFAULT_SHADER_4_COMPONENT_MAPPING;v.ViewDimension=D3D12_SRV_DIMENSION_BUFFER;v.Buffer.FirstElement=lightData.offset/sizeof(SceneLight);v.Buffer.NumElements=UINT(lights.size());v.Buffer.StructureByteStride=sizeof(SceneLight);gpu.device->CreateShaderResourceView(lightData.resource,&v,srvs.cpuAt(6));}
        mask|=(mesh.uv1.value.p?16384u:0u)|(material.receiveShadow?64u:0u);
        const auto& rect=frame.viewport;const bool custom=rect[2]>0&&rect[3]>0;const std::array<float,4> area=custom?rect:std::array<float,4>{0,0,float(width),float(height)};
        Constants data{frame.viewProjection,world,normal,identity,{0,0,0,0},material.color,material.emissive,{material.roughness,material.metalness,material.alphaCutoff,material.unlit?1.f:0.f},frame.eye,frame.ambient,material.uvX,material.uvY,{float(mask),float(lights.size()),material.toneMapped?1.f:0.f,material.sky?2.f:material.vertexColors?1.f:0.f},{material.normalScale[0],material.normalScale[1],frame.exposure,frame.time},frame.fog,frame.fogRange,frame.heightFog,material.skyTop,material.skyHorizon,material.sunDirection,material.sunColor,material.shotShape,material.physical,{material.volume[0],material.volume[1],float(width),float(height)},area,material.absorption,material.sheenColor,material.lobes,material.film,material.specular,material.scatter,material.scatterColor,material.hairTangent,{0,0,0,0},material.moonDirection,material.moonColor,frame.viewDirection};
        data.shotShape[3]=material.lightmapIntensity;
        auto u=gpu.upload(std::max<std::size_t>(sizeof(data),cbuffers.at(0)),256);std::memset(u.cpu,0,std::max<std::size_t>(sizeof(data),cbuffers.at(0)));std::memcpy(u.cpu,&data,sizeof(data));
        const std::size_t raster=(SceneRenderer::orientation(world)<0?3:0)+(material.doubleSided?2:material.backSide?1:0);
        auto* list=gpu.list.p;list->SetGraphicsRootSignature(root.p);list->SetPipelineState(pipeline(raster,blend,(material.depthTest?1:0)|(material.depthWrite?2:0)));
        UINT index=0;for(const auto& c:cbuffers)list->SetGraphicsRootConstantBufferView(index++,c.first==0?u.gpu:frameBuffers.at(c.first));
        list->SetGraphicsRootDescriptorTable(srvRoot,srvs.gpu);if(samplerCount)list->SetGraphicsRootDescriptorTable(samplerRoot,samplerHandle);
        const D3D12_VIEWPORT viewport{area[0],area[1],area[2],area[3],0,1};const auto crop=frame.scissor.value_or(area);
        const D3D12_RECT scissor{static_cast<LONG>(std::floor(crop[0])),static_cast<LONG>(std::floor(crop[1])),static_cast<LONG>(std::ceil(crop[0]+crop[2])),static_cast<LONG>(std::ceil(crop[1]+crop[3]))};
        list->OMSetRenderTargets(1,&color.rtv,FALSE,&depth.dsv);list->RSSetViewports(1,&viewport);list->RSSetScissorRects(1,&scissor);
        const UINT64 bytes=UINT64(mesh.vertexCount)*sizeof(SceneVertex);
        const D3D12_VERTEX_BUFFER_VIEW buffers[2]={{mesh.vertices.address(),UINT(bytes),sizeof(SceneVertex)},mesh.uv1.value.p?D3D12_VERTEX_BUFFER_VIEW{mesh.uv1.address(),mesh.vertexCount*8,8}:D3D12_VERTEX_BUFFER_VIEW{mesh.vertices.address()+24,UINT(bytes-24),sizeof(SceneVertex)}};
        const D3D12_INDEX_BUFFER_VIEW indexView{mesh.indices.address(),mesh.count*4,DXGI_FORMAT_R32_UINT};
        list->IASetPrimitiveTopology(D3D_PRIMITIVE_TOPOLOGY_TRIANGLELIST);list->IASetVertexBuffers(0,2,buffers);list->IASetIndexBuffer(&indexView);list->DrawIndexedInstanced(count,1,first,0,0);
    }
    std::vector<std::uint8_t> readPixels(){return gpu.read(color);}
    d3d12::Texture& target(){return color;}
};
}
#endif
