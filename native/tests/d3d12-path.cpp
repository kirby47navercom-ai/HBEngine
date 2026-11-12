// D3D12 path-traced screen variants vs D3D11: the rendering-118/120 JS packets (area, HDRI environment, mixed, direct,
// lens scenes with ray programs) rendered raw, spatially denoised, temporally filtered and with caustic photons on both
// renderers, compared pixel by pixel. argv[1] = packet JSON written by tools/check-native-d3d12-path.mjs.
// The exact reference is SceneRenderer on D3D11On12 (same D3D12 driver shader compiler). Native D3D11 is reported too:
// the a-trous denoiser amplifies driver-compiler float differences near one highlight, so it is informational.
#include <HBEngine/SceneRenderD3D12.hpp>
#include <nlohmann/json.hpp>
#include <fstream>
#include <iostream>

using namespace hb::gpu;
#define REQUIRE(x) do{if(!(x))throw std::runtime_error("check failed: " #x);}while(0)
constexpr std::uint32_t W=64,H=64;

static Matrix multiply(const Matrix& a,const Matrix& b){Matrix o{};for(int c=0;c<4;c++)for(int r=0;r<4;r++)for(int k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o;}
static Matrix inverse(const Matrix& m){double a[4][8]{};for(int r=0;r<4;r++){for(int c=0;c<4;c++)a[r][c]=m[c*4+r];a[r][4+r]=1;}
    for(int c=0;c<4;c++){int pivot=c;for(int r=c+1;r<4;r++)if(std::abs(a[r][c])>std::abs(a[pivot][c]))pivot=r;std::swap(a[c],a[pivot]);const double d=a[c][c];for(auto& v:a[c])v/=d;for(int r=0;r<4;r++)if(r!=c){const double f=a[r][c];for(int k=0;k<8;k++)a[r][k]-=f*a[c][k];}}
    Matrix out{};for(int r=0;r<4;r++)for(int c=0;c<4;c++)out[c*4+r]=float(a[r][4+c]);return out;}
static Matrix camera(){const float f=1/std::tan(.45f),n=.1f,fa=20;Matrix p{};p[0]=f;p[5]=f;p[10]=fa/(n-fa);p[11]=-1;p[14]=n*fa/(n-fa);Matrix v=identity;v[13]=-.2f;v[14]=-3.5f;return multiply(p,v);}
static std::vector<SceneVertex> box(){std::vector<SceneVertex> out;const int axes[6][3]={{0,1,2},{0,1,2},{1,2,0},{1,2,0},{2,0,1},{2,0,1}};
    for(int face=0;face<6;face++){const float sign=face%2?-1.f:1.f;const int u=axes[face][0],v=axes[face][1],w=axes[face][2];const float corners[4][2]={{-1,-1},{1,-1},{1,1},{-1,1}};
        for(int c=0;c<4;c++){SceneVertex vx;vx.position[w]=sign*.5f;vx.position[u]=corners[c][0]*.5f*sign;vx.position[v]=corners[c][1]*.5f;vx.normal={0,0,0};vx.normal[w]=sign;out.push_back(vx);}}return out;}
static std::vector<std::uint32_t> boxIndex(){std::vector<std::uint32_t> out;for(std::uint32_t f=0;f<6;f++)for(std::uint32_t i:{0u,1u,2u,0u,2u,3u})out.push_back(f*4+i);return out;}
// Distance-field AO: the JS MeshDistanceFieldScene atlas for a box at (.2,-.3,0) and a 4x.1x4 floor at y=-.9, drawn as meshes.
template<class R> static void distanceFieldAO(R& r,const nlohmann::json& field,std::map<std::string,std::vector<std::uint8_t>>& images){
    const auto data=field.at("data").template get<std::vector<float>>();std::vector<std::uint8_t> bytes(data.size()*4);std::memcpy(bytes.data(),data.data(),bytes.size());auto atlas=r.createDataTexture(field.at("width"),field.at("height"),bytes,4,true);
    auto mesh=r.createMesh(box(),boxIndex());Matrix cube=identity;cube[12]=.2f;cube[13]=-.3f;Matrix floor=identity;floor[0]=4;floor[5]=.1f;floor[10]=4;floor[13]=-.9f;
    SceneMaterial matte;matte.roughness=.8f;matte.color={.8f,.75f,.7f,1};
    for(int on=0;on<2;on++){SceneFrame f;f.viewProjection=camera();f.eye={0,.2f,3.5f,1};f.ambient={.9f,.9f,.9f,1};f.clear={.1f,.1f,.12f,1};SceneScreenEffects e;e.eye=f.eye;e.forward={0,0,-1,0};e.camera={.1f,20,0,1};e.currentVP=e.previousVP=camera();e.inverseVP=inverse(camera());
        e.ambientAO={.6f,.02f,2,on?field.at("encoded").template get<float>():0.f};f.screenEffects=e;r.setDistanceFieldScene(on?&atlas:nullptr);r.begin(f);r.draw(mesh,floor,floor,matte);r.draw(mesh,cube,cube,matte);images[on?"distanceField/on":"distanceField/off"]=r.readPixels();}
    r.setDistanceFieldScene(nullptr);
}
template<class R> static std::map<std::string,std::vector<std::uint8_t>> render(R& r,const nlohmann::json& sections){
    std::map<std::string,std::vector<std::uint8_t>> images;
    for(const auto& [section,useTargets]:{std::pair<const char*,bool>{"rendering118",false},{"rendering120",true}})for(const auto& item:sections.at(section).items()){
        const auto& p=item.value();SceneFrame f;f.clear={0,0,0,1};f.eye={0,0,1,1};f.screenEffects.emplace();auto& s=*f.screenEffects;
        const auto data=p.at("data").template get<std::vector<float>>();std::vector<std::uint8_t> bytes(data.size()*4);std::memcpy(bytes.data(),data.data(),bytes.size());auto world=r.createDataTexture(p.at("width"),p.at("height"),bytes,4,true);r.setGeometryScene(&world);
        const auto& settings=p.at("settings");s.rayPrograms=readRayPrograms(p.at("rayInfo").at("programs"));s.geometryInfo=settings.at("geometryInfo").template get<std::array<float,4>>();s.geometryLimits=settings.at("geometryLimits").template get<std::array<float,4>>();
        s.transport=settings.at("transport").template get<std::array<float,4>>();s.pathQuality=settings.at("pathQuality").template get<std::array<float,4>>();s.pathLens=settings.at("pathLens").template get<std::array<float,4>>();s.pathOptions=settings.at("pathOptions").template get<std::array<float,4>>();s.pathMap=settings.at("pathMap").template get<std::array<float,4>>();
        s.pathCausticTargets=useTargets?settings.value("pathCausticTargets",std::array<float,4>{}):std::array<float,4>{};s.pathCaustics=useTargets?settings.at("pathCaustics").template get<std::array<float,4>>():std::array<float,4>{0,64,.35f,1};s.pathCaustics[0]=0;
        s.pathDenoise={0,3,32,.02f};s.pathFilter={0,1,0,0};s.path={1,8,8,0};s.pathEnvironment={0,0,0,65000};s.eye=f.eye;s.forward={0,0,-1,0};s.inverseVP=identity;s.inverseVP[10]=-1;s.inverseVP[14]=1;s.currentVP=identity;s.previousVP=identity;
        if(settings.contains("currentVP")){s.eye=settings.at("eye").template get<std::array<float,4>>();s.forward=settings.at("forward").template get<std::array<float,4>>();s.inverseVP=settings.at("inverseVP").template get<std::array<float,16>>();s.currentVP=settings.at("currentVP").template get<std::array<float,16>>();s.previousVP=settings.at("previousVP").template get<std::array<float,16>>();s.coordinates=settings.at("coordinates").template get<std::array<float,4>>();s.camera=settings.at("camera").template get<std::array<float,4>>();}
        std::optional<typename R::Texture> environment;
        if(!p.at("environmentPacket").is_null()){const auto& e=p.at("environmentPacket");const auto values=e.at("data").template get<std::vector<float>>();std::vector<std::uint8_t> b(values.size()*4);std::memcpy(b.data(),values.data(),b.size());environment.emplace(r.createDataTexture(e.at("width"),e.at("height"),b,4,true));r.setPathEnvironment(&*environment);}
        else r.setPathEnvironment(nullptr);
        const auto lensScene=item.key()=="lens";if(lensScene){s.eye[3]=0;s.pathLens[0]=.05f;s.pathLens[1]=2;}
        // Progressive capture exactly like rendering118: four samples per frame, the last frame read back.
        const auto capture=[&](int samples){s.path[3]=0;s.path[2]=float(samples);for(int j=0;j<samples/4;j++){s.path[3]=float(j*4);r.begin(f);if(j<samples/4-1)r.finish();}return r.readPixels();};
        const std::string key=std::string(section)+"/"+item.key();
        images[key+"/raw"]=capture(8);
        s.pathDenoise[0]=1;images[key+"/denoised"]=capture(8);
        s.pathDenoise[0]=.25f;s.pathFilter[0]=.8f;s.path={1,8,8,0};r.begin(f);r.finish();s.path[3]=4;r.begin(f);images[key+"/temporal"]=r.readPixels();s.pathFilter[0]=0;s.pathDenoise[0]=0;
        s.pathCaustics[0]=1;images[key+"/caustics"]=capture(16);s.pathCaustics[0]=0;
        r.setGeometryScene(nullptr);r.setPathEnvironment(nullptr);
    }
    distanceFieldAO(r,sections.at("distanceField"),images);
    return images;
}

static std::size_t validationErrors(d3d12::Device& gpu){
    detail::Com<ID3D12InfoQueue> info;if(FAILED(gpu.device->QueryInterface(__uuidof(ID3D12InfoQueue),reinterpret_cast<void**>(&info.p))))return 0;
    std::size_t errors=0;for(UINT64 i=0;i<info->GetNumStoredMessages();i++){SIZE_T size=0;info->GetMessage(i,nullptr,&size);std::vector<char> raw(size);auto* m=reinterpret_cast<D3D12_MESSAGE*>(raw.data());info->GetMessage(i,m,&size);
        if(m->Severity<=D3D12_MESSAGE_SEVERITY_ERROR){errors++;std::cerr<<"D3D12 validation: "<<std::string(m->pDescription,m->DescriptionByteLength)<<"\n";}}
    return errors;
}

static nlohmann::json proof(DeviceDriver driver,const nlohmann::json& sections){
    nlohmann::json out;std::map<std::string,std::vector<std::uint8_t>> reference;
    std::map<std::string,std::vector<std::uint8_t>> native;
    {Device gpu11(driver,DeviceBackend::Direct3D12Interop);SceneRenderer r(gpu11,W,H);reference=render(r,sections);out["reference"]=gpu11.backend();}
    {Device gpu11(driver);SceneRenderer r(gpu11,W,H);native=render(r,sections);}
    d3d12::Device gpu(driver,true);out["software"]=gpu.software;
    {d3d12::SceneMeshRenderer r(gpu,W,H);const auto images=render(r,sections);int worst=0;std::size_t lit=0;
        for(const auto& [key,ref]:reference){const auto& mine=images.at(key);REQUIRE(mine.size()==ref.size());int diff=0;std::size_t over=0,nonzero=0;
            for(std::size_t i=0;i<ref.size();i++){const int d=std::abs(int(ref[i])-int(mine[i]));diff=std::max(diff,d);over+=d>2;if(i%4!=3&&ref[i]>8)++nonzero;}
            out["images"][key]={{"maxDiff",diff},{"channelsOver2",over}};worst=std::max(worst,diff);lit+=nonzero>0;}
        out["maxDiff"]=worst;{int nativeWorst=0;std::size_t nativeChannels=0;for(const auto& [key,ref]:native){const auto& mine=images.at(key);for(std::size_t i=0;i<ref.size();i++){const int d=std::abs(int(ref[i])-int(mine[i]));nativeWorst=std::max(nativeWorst,d);nativeChannels+=d>2;}}out["nativeD3D11"]={{"maxDiff",nativeWorst},{"channelsOver2",nativeChannels}};}{const auto& a=reference.at("distanceField/on");const auto& b=reference.at("distanceField/off");std::size_t changed=0;for(std::size_t i=0;i<a.size();i+=4)changed+=std::abs(int(a[i])-int(b[i]))>2;out["distanceFieldChangedPixels"]=changed;REQUIRE(changed>50);}out["imagesWithContent"]=lit;out["imageCount"]=reference.size();if(gpu.isRecording())gpu.end();gpu.waitIdle();}
    out["validationErrors"]=validationErrors(gpu);if(out["maxDiff"].get<int>()>2){std::string bad;for(const auto& [k,v]:out["images"].items())if(v["maxDiff"].get<int>()>2)bad+=k+"="+v.dump()+" ";throw std::runtime_error("image mismatch: "+bad);}REQUIRE(out["validationErrors"]==0);REQUIRE(out["imagesWithContent"].get<std::size_t>()*2>reference.size());return out;
}

int main(int argc,char** argv){
    try{SetErrorMode(SEM_FAILCRITICALERRORS|SEM_NOGPFAULTERRORBOX);if(argc<2)throw std::runtime_error("usage: d3d12-path packets.json");std::ifstream input(argv[1]);const auto sections=nlohmann::json::parse(input);nlohmann::json result;
        try{result["hardware"]=proof(DeviceDriver::Hardware,sections);}catch(const std::exception& e){result["hardware"]["error"]=e.what();}
        if(argc<3||std::string(argv[2])!="--hardware-only"){try{result["software"]=proof(DeviceDriver::Software,sections);}catch(const std::exception& e){result["software"]["error"]=e.what();}}
        result["passed"]=!result["hardware"].contains("error")&&!(result.contains("software")&&result["software"].contains("error"));std::cout<<result.dump()<<std::endl;return result["passed"]?0:1;
    }catch(const std::exception& e){nlohmann::json failed;failed["passed"]=false;failed["error"]=e.what();std::cout<<failed.dump()<<std::endl;return 1;}
}
