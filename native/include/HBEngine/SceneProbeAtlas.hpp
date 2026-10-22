#pragma once
#include "SceneProbes.hpp"
#include "ProbeAtlasPadding.hpp"
#include "ProbeSpatialIndex.hpp"
#include <unordered_map>

namespace hb::gpu {
#if defined(_WIN32) && !defined(HB_COMPUTE_UNAVAILABLE)
class SceneProbeAtlas {
    struct Rect {UINT x=0,y=0,width=0,height=0;};
    struct Record {ProbeSettings settings;std::array<float,4> region;};
    static_assert(sizeof(Record)==320,"Probe atlas record layout");
    struct Stamp {std::uint64_t identity=0,revision=0;bool operator==(const Stamp& b)const{return identity==b.identity&&revision==b.revision;}};
    Device& gpu;detail::Com<ID3D11ComputeShader> padding;detail::Com<ID3D11UnorderedAccessView> paddingOutput;detail::Com<ID3D11Buffer> paddingConstants;std::uint64_t paddingDispatches_=0;
    void preparePadding(){if(padding.p)return;detail::ShaderBytecodeCompiler::create(probeAtlasPaddingSource,"HBProbeAtlasPadding","Fill","cs_5_0",[&](const void* bytes,std::size_t size){std::lock_guard<std::mutex> lock(gpu.mutex);return gpu.device->CreateComputeShader(bytes,size,nullptr,&padding.p);});std::lock_guard<std::mutex> lock(gpu.mutex);D3D11_BUFFER_DESC d{};d.ByteWidth=32;d.Usage=D3D11_USAGE_DEFAULT;d.BindFlags=D3D11_BIND_CONSTANT_BUFFER;detail::check(gpu.device->CreateBuffer(&d,nullptr,&paddingConstants.p),"Probe atlas padding constants");}
    detail::Com<ID3D11Texture2D> image;detail::Com<ID3D11ShaderResourceView> view,metadata,irradiance;detail::Com<ID3D11Buffer> recordsBuffer,shBuffer;
    std::vector<Rect> regions;std::vector<UINT> sourceIndices;std::vector<Stamp> captureStamps;std::vector<Record> records;ProbeSpatialIndex spatial;std::size_t tableRecords=0,shCount=0,influenceCount=0;UINT width=0,height=0;std::uint64_t copies_=0,uploads_=0,metadataBytes_=0,metadataCalls_=0,metadataFastUpdates_=0,layoutBuilds_=0;
    static std::vector<Rect> layout(const std::vector<SceneProbeBinding>& bindings,UINT& width,UINT& height){
        constexpr UINT maximum=D3D11_REQ_TEXTURE2D_U_OR_V_DIMENSION;std::vector<std::size_t> order;UINT minimum=0;std::uint64_t sum=0;for(std::size_t i=0;i<bindings.size();i++){order.push_back(i);minimum=std::max(minimum,(bindings[i].resource->size+2)*6);sum+=(bindings[i].resource->size+2)*6;}
        std::stable_sort(order.begin(),order.end(),[&](auto a,auto b){return bindings[a].resource->size>bindings[b].resource->size;});std::vector<UINT> widths{minimum,maximum,UINT(std::min<std::uint64_t>(sum,maximum))};for(UINT n=1;n<maximum;n*=2)if(n>=minimum)widths.push_back(n);std::vector<Rect> best;
        for(const auto candidate:widths){UINT x=0,y=0,row=0;bool fits=true;std::vector<Rect> packed(bindings.size());for(auto i:order){const auto size=bindings[i].resource->size,w=(size+2)*6,h=size*2-1+2*bindings[i].resource->mips;if(w>candidate){fits=false;break;}if(x+w>candidate){x=0;y+=row;row=0;}if(y+h>maximum){fits=false;break;}packed[i]={x,y,w,h};x+=w;row=std::max(row,h);}const auto used=y+row;if(!fits||used>maximum)continue;if(best.empty()||std::uint64_t(candidate)*used<std::uint64_t(width)*height){best=std::move(packed);width=candidate;height=used;}}
        if(best.empty()){throw std::runtime_error("Reflection atlas exceeds hardware dimensions; lower capture resolution");}return best;
    }
    void validateBinding(const SceneProbeBinding& b)const{
        if(!b.resource||b.resource->owner!=gpu.device.p||!b.resource->ready||!b.resource->filtered.p||!b.resource->coefficients.p||!probeVolumeBasisUsable(b.settings)||(!probeProjectionUsable(b.settings)||!probeInfluenceUsable(b.settings)))throw std::runtime_error("Probe atlas resource owner/pose invalid");
        for(const auto* row:{&b.settings.center,&b.settings.minimum,&b.settings.maximum,&b.settings.options,&b.settings.localX,&b.settings.localY,&b.settings.localZ,&b.settings.faceScale})if(!std::all_of(row->begin(),row->end(),[](float v){return std::isfinite(v);}))throw std::runtime_error("Probe atlas settings nonfinite");
        for(std::size_t j=0;j<3;j++)if(b.settings.minimum[j]>=b.settings.maximum[j]||b.settings.faceScale[j]<=0)throw std::runtime_error("Probe atlas bounds invalid");
        if(b.settings.center[3]<0||b.settings.minimum[3]<0||b.settings.options[1]<0)throw std::runtime_error("Probe atlas light invalid");
    }
    static bool sameSpatialSettings(const ProbeSettings& a,const ProbeSettings& b){
        return std::equal(a.minimum.begin(),a.minimum.begin()+3,b.minimum.begin())&&std::equal(a.maximum.begin(),a.maximum.begin()+3,b.maximum.begin())&&a.localX==b.localX&&a.localY==b.localY&&a.localZ==b.localZ;
    }
public:
    explicit SceneProbeAtlas(Device& device):gpu(device){}
    void release(){
        const auto clearCPU=[&]{std::vector<Rect>().swap(regions);std::vector<UINT>().swap(sourceIndices);std::vector<Stamp>().swap(captureStamps);std::vector<Record>().swap(records);spatial.clear();tableRecords=shCount=influenceCount=0;width=height=0;};
        if(!image.p&&!recordsBuffer.p&&!padding.p){clearCPU();return;}
        std::lock_guard<std::mutex> lock(gpu.mutex);std::array<ID3D11ShaderResourceView*,3> empty{};gpu.context->PSSetShaderResources(50,3,empty.data());paddingOutput={};padding={};paddingConstants={};image={};view={};metadata={};irradiance={};recordsBuffer={};shBuffer={};clearCPU();
    }
    void update(const std::vector<SceneProbeBinding>& bindings){
        if(bindings.empty()){release();return;}
        bool compatible=bindings.size()==records.size()&&bindings.size()==sourceIndices.size(),sameGeometry=true;
        std::vector<std::pair<std::size_t,ProbeSettings>> edits;
        if(compatible)for(std::size_t i=0;i<bindings.size();i++){
            const auto& b=bindings[i];const auto source=sourceIndices[i];
            if(!b.resource||b.resource->owner!=gpu.device.p||!b.resource->ready||!b.resource->filtered.p||!b.resource->coefficients.p||source>=captureStamps.size()||!(captureStamps[source]==Stamp{b.resource->identity,b.resource->revision})||!std::isfinite(b.settings.maximum[3])){compatible=false;break;}
            auto settings=b.settings;settings.maximum[3]=float(b.resource->mips-1);const auto& prior=records[i].settings;if(!std::memcmp(&settings,&prior,sizeof(settings)))continue;
            validateBinding(b);sameGeometry=sameGeometry&&sameSpatialSettings(settings,prior);edits.emplace_back(i,settings);
        }
        if(compatible&&sameGeometry){
            if(edits.empty())return;
            // Validate all changed settings before changing CPU or GPU state.
            std::vector<std::pair<std::size_t,std::size_t>> ranges;
            for(const auto& edit:edits){if(!ranges.empty()&&ranges.back().second==edit.first)ranges.back().second=edit.first+1;else ranges.emplace_back(edit.first,edit.first+1);}
            if(ranges.size()>8){const auto first=ranges.front().first,last=ranges.back().second;ranges={{first,last}};}
            std::lock_guard<std::mutex> lock(gpu.mutex);std::array<ID3D11ShaderResourceView*,3> empty{};gpu.context->PSSetShaderResources(50,3,empty.data());
            for(const auto& edit:edits){influenceCount-=records[edit.first].settings.blendPositive[3]>0;influenceCount+=edit.second.blendPositive[3]>0;records[edit.first].settings=edit.second;}
            for(const auto& range:ranges){D3D11_BOX box{UINT(range.first*sizeof(Record)),0,0,UINT(range.second*sizeof(Record)),1,1};gpu.context->UpdateSubresource(recordsBuffer.p,0,&box,records.data()+range.first,0,0);metadataBytes_+=(range.second-range.first)*sizeof(Record);++metadataCalls_;}
            ++metadataFastUpdates_;++uploads_;return;
        }
        for(const auto& b:bindings)validateBinding(b);
        const auto tableCount=bindings.size()+((bindings.size()*2-1)*3+19)/20,recordBytes=bindings.size()*sizeof(Record),bytes=tableCount*sizeof(Record);
        if(bytes>UINT_MAX)throw std::runtime_error("Probe atlas metadata exceeds hardware buffer size");
        std::unordered_map<std::uint64_t,std::size_t> identities;std::vector<SceneProbeBinding> unique;std::vector<UINT> indices;indices.reserve(bindings.size());
        for(const auto& b:bindings){const auto found=identities.find(b.resource->identity);if(found!=identities.end())indices.push_back(UINT(found->second));else{const auto index=unique.size();identities.emplace(b.resource->identity,index);unique.push_back(b);indices.push_back(UINT(index));}}
        // Keep active source slots stable when influence volume ranks change.
        std::vector<SceneProbeBinding> ordered;ordered.reserve(unique.size());std::unordered_map<std::uint64_t,UINT> slots;
        for(const auto& stamp:captureStamps){const auto found=identities.find(stamp.identity);if(found!=identities.end()){slots.emplace(stamp.identity,UINT(ordered.size()));ordered.push_back(unique[found->second]);}}
        for(const auto& b:unique)if(!slots.count(b.resource->identity)){slots.emplace(b.resource->identity,UINT(ordered.size()));ordered.push_back(b);}
        unique.swap(ordered);for(std::size_t i=0;i<bindings.size();i++)indices[i]=slots.at(bindings[i].resource->identity);
        const auto shBytes=unique.size()*9*16;if(shBytes>UINT_MAX)throw std::runtime_error("Probe atlas irradiance exceeds hardware buffer size");
        std::vector<ProbeSpatialShape> shapes;shapes.reserve(bindings.size());for(const auto& b:bindings){const auto& p=b.settings;shapes.push_back({p.minimum[0],p.minimum[1],p.minimum[2],p.maximum[0],p.maximum[1],p.maximum[2],p.localX[0],p.localX[1],p.localX[2],p.localX[3],p.localY[0],p.localY[1],p.localY[2],p.localY[3],p.localZ[0],p.localZ[1],p.localZ[2],p.localZ[3]});}
        const bool spatialChanged=spatial.update(shapes);UINT w=0,h=0;++layoutBuilds_;auto packed=layout(unique,w,h);
        const bool resized=!image.p||w!=width||h!=height||packed.size()!=regions.size()||!std::equal(packed.begin(),packed.end(),regions.begin(),[](auto a,auto b){return a.x==b.x&&a.y==b.y&&a.width==b.width&&a.height==b.height;});
        preparePadding();std::lock_guard<std::mutex> lock(gpu.mutex);std::array<ID3D11ShaderResourceView*,3> empty{};gpu.context->PSSetShaderResources(50,3,empty.data());
        if(resized){D3D11_TEXTURE2D_DESC d{};d.Width=w;d.Height=h;d.MipLevels=d.ArraySize=d.SampleDesc.Count=1;d.Format=DXGI_FORMAT_R16G16B16A16_FLOAT;d.Usage=D3D11_USAGE_DEFAULT;d.BindFlags=D3D11_BIND_SHADER_RESOURCE|D3D11_BIND_UNORDERED_ACCESS;detail::Com<ID3D11Texture2D> next;detail::Com<ID3D11ShaderResourceView> nextView;detail::check(gpu.device->CreateTexture2D(&d,nullptr,&next.p),"Probe atlas image");detail::check(gpu.device->CreateShaderResourceView(next.p,nullptr,&nextView.p),"Probe atlas view");detail::Com<ID3D11UnorderedAccessView> nextOutput;detail::check(gpu.device->CreateUnorderedAccessView(next.p,nullptr,&nextOutput.p),"Probe atlas padding output");image=std::move(next);view=std::move(nextView);paddingOutput=std::move(nextOutput);width=w;height=h;regions=std::move(packed);captureStamps.clear();}
        const bool tableRecreated=records.size()!=bindings.size()||!recordsBuffer.p;
        if(tableRecreated){D3D11_BUFFER_DESC d{};d.ByteWidth=UINT(bytes);d.Usage=D3D11_USAGE_DEFAULT;d.BindFlags=D3D11_BIND_SHADER_RESOURCE;d.MiscFlags=D3D11_RESOURCE_MISC_BUFFER_STRUCTURED;d.StructureByteStride=16;detail::Com<ID3D11Buffer> next;detail::Com<ID3D11ShaderResourceView> nextView;detail::check(gpu.device->CreateBuffer(&d,nullptr,&next.p),"Probe atlas metadata");detail::check(gpu.device->CreateShaderResourceView(next.p,nullptr,&nextView.p),"Probe atlas metadata view");recordsBuffer=std::move(next);metadata=std::move(nextView);}
        const bool shRecreated=shCount!=unique.size()||!shBuffer.p;
        if(shRecreated){D3D11_BUFFER_DESC d{};d.ByteWidth=UINT(shBytes);d.Usage=D3D11_USAGE_DEFAULT;d.BindFlags=D3D11_BIND_SHADER_RESOURCE;d.MiscFlags=D3D11_RESOURCE_MISC_BUFFER_STRUCTURED;d.StructureByteStride=16;detail::Com<ID3D11Buffer> next;detail::Com<ID3D11ShaderResourceView> nextView;detail::check(gpu.device->CreateBuffer(&d,nullptr,&next.p),"Probe atlas irradiance");detail::check(gpu.device->CreateShaderResourceView(next.p,nullptr,&nextView.p),"Probe atlas irradiance view");shBuffer=std::move(next);irradiance=std::move(nextView);}
        for(std::size_t i=0;i<unique.size();i++){
            const auto& p=*unique[i].resource;const auto& rect=regions[i];const Stamp stamp{p.identity,p.revision};const bool changed=i>=captureStamps.size()||!(captureStamps[i]==stamp);
            if(changed){for(UINT level=0;level<p.mips;level++){const auto size=p.size>>level;for(UINT face=0;face<6;face++){gpu.context->CopySubresourceRegion(image.p,0,rect.x+face*(size+2)+1,rect.y+2*p.size-2*size+2*level+1,0,p.filtered.p,D3D11CalcSubresource(level,face,p.mips),nullptr);++copies_;}}D3D11_SHADER_RESOURCE_VIEW_DESC sourceDesc{};sourceDesc.Format=DXGI_FORMAT_R16G16B16A16_FLOAT;sourceDesc.ViewDimension=D3D11_SRV_DIMENSION_TEXTURE2DARRAY;sourceDesc.Texture2DArray.MipLevels=p.mips;sourceDesc.Texture2DArray.ArraySize=6;detail::Com<ID3D11ShaderResourceView> faces;detail::check(gpu.device->CreateShaderResourceView(p.filtered.p,&sourceDesc,&faces.p),"Probe atlas padding input");auto* input=faces.p;auto* output=paddingOutput.p;auto* constants=paddingConstants.p;gpu.context->CSSetShader(padding.p,nullptr,0);gpu.context->CSSetShaderResources(0,1,&input);gpu.context->CSSetUnorderedAccessViews(0,1,&output,nullptr);gpu.context->CSSetConstantBuffers(0,1,&constants);for(UINT level=0;level<p.mips;level++){const UINT size=p.size>>level;const std::array<UINT,8> values{rect.x,rect.y,p.size,p.mips,level,size,0,0};gpu.context->UpdateSubresource(constants,0,nullptr,values.data(),0,0);gpu.context->Dispatch((4*size+4+63)/64,6,1);++paddingDispatches_;}input=nullptr;output=nullptr;gpu.context->CSSetShaderResources(0,1,&input);gpu.context->CSSetUnorderedAccessViews(0,1,&output,nullptr);constants=nullptr;gpu.context->CSSetConstantBuffers(0,1,&constants);gpu.context->CSSetShader(nullptr,nullptr,0);}
            if(changed||shRecreated)gpu.context->CopySubresourceRegion(shBuffer.p,0,UINT(i*9*16),0,0,p.coefficients.p,0,nullptr);
            if(i>=captureStamps.size())captureStamps.resize(i+1);
            captureStamps[i]=stamp;
        }
        captureStamps.resize(unique.size());std::vector<Record> next;next.reserve(bindings.size());
        for(std::size_t i=0;i<bindings.size();i++){const auto& b=bindings[i];const auto& p=*b.resource;auto settings=b.settings;settings.maximum[3]=float(p.mips-1);const auto& rect=regions[indices[i]];next.push_back({settings,{float(rect.x),float(rect.y),float(p.size),float(indices[i])}});}
        bool uploaded=false;
        if(tableRecreated||spatialChanged){auto packet=next;packet.resize(tableCount);std::memcpy(reinterpret_cast<char*>(packet.data())+recordBytes,spatial.data().data(),spatial.data().size()*16);gpu.context->UpdateSubresource(recordsBuffer.p,0,nullptr,packet.data(),0,0);metadataBytes_+=bytes;++metadataCalls_;uploaded=true;}
        else{
            std::vector<std::pair<std::size_t,std::size_t>> ranges;
            for(std::size_t i=0;i<next.size();i++)if(std::memcmp(&records[i],&next[i],sizeof(Record))){if(!ranges.empty()&&ranges.back().second==i)ranges.back().second=i+1;else ranges.emplace_back(i,i+1);}
            if(ranges.size()>8){const auto first=ranges.front().first,last=ranges.back().second;ranges={{first,last}};}
            for(const auto& range:ranges){D3D11_BOX box{UINT(range.first*sizeof(Record)),0,0,UINT(range.second*sizeof(Record)),1,1};gpu.context->UpdateSubresource(recordsBuffer.p,0,&box,next.data()+range.first,0,0);metadataBytes_+=(range.second-range.first)*sizeof(Record);++metadataCalls_;uploaded=true;}
        }
        sourceIndices=std::move(indices);records=std::move(next);influenceCount=std::count_if(records.begin(),records.end(),[](const Record& r){return r.settings.blendPositive[3]>0;});tableRecords=tableCount;shCount=unique.size();if(uploaded)++uploads_;
    }
    UINT count()const{return UINT(records.size());}ID3D11ShaderResourceView* texture()const{return view.p;}ID3D11ShaderResourceView* table()const{return metadata.p;}ID3D11ShaderResourceView* sh()const{return irradiance.p;}
    std::uint64_t bytes()const{return std::uint64_t(width)*height*8+tableRecords*sizeof(Record)+shCount*9*16+(paddingConstants.p?32:0);}bool hasInfluence()const{return influenceCount>0;}std::size_t mapCount()const{return captureStamps.size();}std::uint64_t metadataFastUpdates()const{return metadataFastUpdates_;}std::uint64_t layoutBuilds()const{return layoutBuilds_;}std::uint64_t metadataBytes()const{return metadataBytes_;}std::uint64_t metadataCalls()const{return metadataCalls_;}std::size_t cpuBytes()const{return spatial.cpuBytes()+records.capacity()*sizeof(Record)+sourceIndices.capacity()*sizeof(UINT)+captureStamps.capacity()*sizeof(Stamp)+regions.capacity()*sizeof(Rect);}std::size_t spatialNodes()const{return spatial.nodes();}std::uint64_t spatialBuilds()const{return spatial.builds();}std::size_t spatialCPUBytes()const{return spatial.cpuBytes();}std::uint64_t copies()const{return copies_;}std::uint64_t uploads()const{return uploads_;}std::uint64_t dispatches()const{return paddingDispatches_;}
};
inline constexpr const char* sceneProbeAtlasDeclarations=R"HLSL(
struct AtlasProbe{ProbeSettings settings;float4 region;};Texture2D<float4> probeAtlas:register(t50);StructuredBuffer<float4> probeTableRows:register(t51);StructuredBuffer<float4> probeAtlasSH:register(t52);
float3 indirectAtlasProbes(float3 at,float3 n,float3 v,float3 base,float rough,float metal,float ao,float3 dielectric,float diffuseWeight);
float3 refractedAtlasProbes(float3 at,float3 direction,float rough,out float coverage);
)HLSL";
inline const std::string sceneProbeAtlasFunctions=std::string(probeAtlasCubeDirections)+R"HLSL(
AtlasProbe hbAtlasProbe(uint index){uint at=index*20;AtlasProbe p;p.settings.center=probeTableRows[at];p.settings.minimum=probeTableRows[at+1];p.settings.maximum=probeTableRows[at+2];p.settings.options=probeTableRows[at+3];p.settings.localX=probeTableRows[at+4];p.settings.localY=probeTableRows[at+5];p.settings.localZ=probeTableRows[at+6];p.settings.faceScale=probeTableRows[at+7];p.settings.projectionMinimum=probeTableRows[at+8];p.settings.projectionMaximum=probeTableRows[at+9];p.settings.projectionX=probeTableRows[at+10];p.settings.projectionY=probeTableRows[at+11];p.settings.projectionZ=probeTableRows[at+12];p.settings.blendPositive=probeTableRows[at+13];p.settings.blendNegative=probeTableRows[at+14];p.settings.fadePositive=probeTableRows[at+15];p.settings.fadeNegative=probeTableRows[at+16];p.settings.normalPositive=probeTableRows[at+17];p.settings.normalNegative=probeTableRows[at+18];p.region=probeTableRows[at+19];return p;}
static int2 hbAtlasIndices=int2(-1,-1);static float2 hbAtlasWeights=0;static float3 hbAtlasAt=0;
uint hbAtlasWord(float lo,float hi){return (uint)lo+(uint)hi*65536u;}
void hbAtlasPick(float3 at,float3 normal,float3 ray,out int2 indices,out float2 weights){indices=int2(-1,-1);weights=0;float firstFlags=0;uint count=(uint)probeSettings[0].faceScale.w+(uint)probeSettings[1].faceScale.w*65536u,cursor=0,total=count*2-1;if(count==0)return;[loop]while(cursor<total){uint offset=count*20+cursor*3;float4 lower=probeTableRows[offset],upper=probeTableRows[offset+1],meta=probeTableRows[offset+2];uint rank=hbAtlasWord(meta.z,meta.w);if(any(at<lower.xyz)||any(at>upper.xyz)||(indices.y>=0&&rank>=(uint)indices.y)){cursor=hbAtlasWord(lower.w,upper.w);continue;}uint leaf=hbAtlasWord(meta.x,meta.y);if(leaf){int i=(int)leaf-1;AtlasProbe p=hbAtlasProbe((uint)i);float weight=probeShadingWeight(p.settings,at,normal,ray);if(weight>0){if(indices.x<0||i<indices.x){indices.y=indices.x;weights.y=weights.x;indices.x=i;weights.x=weight;firstFlags=p.settings.options.w;}else if(indices.y<0||i<indices.y){indices.y=i;weights.y=weight;}}}++cursor;}probeBlendPriority(weights.x,weights.y,firstFlags);}
void hbAtlasChoose(float3 at){hbAtlasAt=at;if(probeSettings[0].blendNegative.w<.5)hbAtlasPick(at,float3(0,0,0),float3(0,0,0),hbAtlasIndices,hbAtlasWeights);}
void hbAtlasChoice(float3 at,float3 normal,float3 ray,out int2 indices,out float2 weights){indices=hbAtlasIndices;weights=hbAtlasWeights;if(probeSettings[0].blendNegative.w>.5||any(at!=hbAtlasAt))hbAtlasPick(at,normal,ray,indices,weights);}
void hbAtlasChoice(float3 at,out int2 indices,out float2 weights){hbAtlasChoice(at,float3(0,0,0),float3(0,0,0),indices,weights);}
float3 hbAtlasLevel(AtlasProbe p,float3 direction,uint level){uint face;float2 uv;hbAtlasFaceUV(direction,face,uv);uint size=max(1u,(uint)p.region.z>>level),width,height;probeAtlas.GetDimensions(width,height);float2 origin=p.region.xy+float2(face*(size+2)+1,2*(uint)p.region.z-2*size+2*level+1);return probeAtlas.SampleLevel(linear2d,(origin+uv*size)/float2(width,height),0).rgb;}
float3 hbAtlasSample(AtlasProbe p,float3 direction,float rough){float level=clamp(rough*p.settings.maximum.w,0,p.settings.maximum.w);uint lower=(uint)floor(level),upper=min(lower+1,(uint)p.settings.maximum.w);float3 first=hbAtlasLevel(p,direction,lower);float part=frac(level);if(upper==lower||part==0)return first;return lerp(first,hbAtlasLevel(p,direction,upper),part);}
float3 hbAtlasLight(uint index,float3 at,float3 n,float3 v,float3 base,float rough,float metal,float ao,float3 dielectric,float diffuseWeight){AtlasProbe p=hbAtlasProbe(index);float nv=saturate(dot(n,v));float3 f0=lerp(dielectric,base,metal),f=f0+(max(1-rough,f0)-f0)*pow(1-nv,5),irradiance=0;[unroll]for(uint i=0;i<9;i++)irradiance+=probeAtlasSH[(uint)p.region.w*9+i].rgb*probeBasis(i,n);float2 brdf=probeBrdf.SampleLevel(linear2d,float2(nv,rough),0);float3 reflected=hbAtlasSample(p,probeDirection(p.settings,at,reflect(-v,n)),rough);return (max(irradiance,0)*base*(1-f)*(1-metal)*diffuseWeight*(p.settings.options.y/3.141592654)+reflected*(f0*brdf.x+brdf.y))*p.settings.center.w*ao;}
float3 indirectAtlasProbes(float3 at,float3 n,float3 v,float3 base,float rough,float metal,float ao,float3 dielectric,float diffuseWeight){int2 indices;float2 weights;hbAtlasChoice(at,n,reflect(-v,n),indices,weights);float total=weights.x+weights.y;float3 light=0;[loop]for(uint slot=0;slot<2;slot++){int index=indices[slot];if(index>=0)light+=hbAtlasLight((uint)index,at,n,v,base,rough,metal,ao,dielectric,diffuseWeight)*weights[slot];}light/=max(1,total);float sky=probeSettings[2].options.x*(1-saturate(total));if(sky>0)light+=skyLight(n,v,base,rough,metal,ao,dielectric,diffuseWeight)*sky;return light;}
float3 refractedAtlasProbes(float3 at,float3 direction,float rough,out float coverage){int2 indices;float2 weights;hbAtlasChoice(at,float3(0,0,0),direction,indices,weights);float total=weights.x+weights.y;float3 light=0;[loop]for(uint slot=0;slot<2;slot++){int index=indices[slot];if(index>=0){AtlasProbe p=hbAtlasProbe(index);light+=hbAtlasSample(p,probeDirection(p.settings,at,direction),rough)*p.settings.center.w*weights[slot];}}coverage=saturate(total);light=light/max(total,1e-6)*coverage;float sky=probeSettings[2].options.x*(1-coverage);if(sky>0)light+=skyProbe.SampleLevel(linear2d,skyDirection(direction),rough*probeSettings[2].maximum.w).rgb*probeSettings[2].center.w*sky;coverage=saturate(coverage+sky);return light/max(coverage,1e-6);}
)HLSL";
#endif
}
