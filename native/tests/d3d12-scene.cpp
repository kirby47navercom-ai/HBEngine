// D3D12 port phase 2: the same scene drawn by SceneRenderer (D3D11) and SceneMeshRenderer (D3D12),
// compared pixel by pixel on the same driver. Prints one JSON line.
#include <HBEngine/SceneRenderD3D12.hpp>
#include <nlohmann/json.hpp>
#include <cmath>
#include <iostream>

using namespace hb::gpu;
#define REQUIRE(x) do{if(!(x))throw std::runtime_error("check failed: " #x);}while(0)
constexpr std::uint32_t W=96,H=96;

static Matrix multiply(const Matrix& a,const Matrix& b){Matrix o{};for(int c=0;c<4;c++)for(int r=0;r<4;r++)for(int k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o;}
static Matrix rotation(float yaw,float pitch){const float cy=std::cos(yaw),sy=std::sin(yaw),cp=std::cos(pitch),sp=std::sin(pitch);
    Matrix y=identity,x=identity;y[0]=cy;y[2]=-sy;y[8]=sy;y[10]=cy;x[5]=cp;x[6]=sp;x[9]=-sp;x[10]=cp;return multiply(y,x);}
static Matrix translate(Matrix m,float x,float y,float z){m[12]=x;m[13]=y;m[14]=z;return m;}
static Matrix camera(){// right-handed perspective looking down -z from (0,0,4), clip z in [0,1]
    const float f=1/std::tan(.45f),n=.1f,fa=20;Matrix p{};p[0]=f;p[5]=f;p[10]=fa/(n-fa);p[11]=-1;p[14]=n*fa/(n-fa);return multiply(p,translate(identity,0,0,-4));}

struct Scene {
    std::vector<SceneVertex> cube;std::vector<std::uint32_t> cubeIndex;std::vector<SceneVertex> quad;std::vector<std::uint32_t> quadIndex{0,1,2,0,2,3};std::vector<std::array<float,2>> quadUV1{{0,0},{1,0},{1,1},{0,1}};
    std::vector<std::uint8_t> checker,rough;std::vector<SceneLight> lights;
    Scene(){
        const float s=.8f;const int axes[6][3]={{0,1,2},{0,1,2},{1,2,0},{1,2,0},{2,0,1},{2,0,1}};
        for(int face=0;face<6;face++){const float sign=face%2?-1.f:1.f;const int u=axes[face][0],v=axes[face][1],w=axes[face][2];
            const float corners[4][2]={{-1,-1},{1,-1},{1,1},{-1,1}};const auto base=std::uint32_t(cube.size());
            for(int c=0;c<4;c++){SceneVertex vx;vx.position[w]=sign*s;vx.position[u]=corners[c][0]*s*sign;vx.position[v]=corners[c][1]*s;vx.normal={0,0,0};vx.normal[w]=sign;vx.uv={corners[c][0]*.5f+.5f,corners[c][1]*.5f+.5f};vx.color={.5f+.5f*corners[c][0],.6f,.5f+.5f*corners[c][1],1};cube.push_back(vx);}
            for(std::uint32_t i:{0u,1u,2u,0u,2u,3u})cubeIndex.push_back(base+i);}
        for(auto [x,y]:{std::pair{-1.f,-1.f},{1.f,-1.f},{1.f,1.f},{-1.f,1.f}}){SceneVertex vx;vx.position={x*.6f,y*.6f,0};vx.normal={0,0,1};vx.uv={x*.5f+.5f,y*.5f+.5f};vx.color={x*.5f+.5f,.3f,y*.5f+.5f,1};quad.push_back(vx);}
        for(int y=0;y<8;y++)for(int x=0;x<8;x++){const bool on=(x+y)%2;checker.insert(checker.end(),{std::uint8_t(on?230:40),std::uint8_t(on?180:90),std::uint8_t(on?60:200),255});rough.insert(rough.end(),{std::uint8_t(x*32),std::uint8_t(y*32),std::uint8_t(255-x*32),255});}
        SceneLight sun;sun.position={0,0,0,0};sun.direction={-.4f,-.7f,-.6f,0};sun.color={1,.95f,.9f,2.5f};
        SceneLight point;point.position={1.2f,.8f,1.6f,1};point.direction={0,0,0,6};point.color={.3f,.6f,1,8};
        SceneLight spot;spot.position={-1.5f,1.5f,2,2};spot.direction={.5f,-.5f,-.7f,9};spot.color={1,.3f,.2f,10};spot.cone={.85f,.95f,2,0};
        SceneLight sky;sky.position={0,1,0,3};sky.color={.2f,.3f,.5f,1};sky.direction={.1f,.08f,.05f,0};
        lights={sun,point,spot,sky};
    }
};
struct Draws {Matrix cube,glass,mirrored;SceneMaterial lit,alpha,additive;};
static Draws draws(){
    Draws d;d.cube=rotation(.7f,.5f);d.glass=translate(rotation(.2f,0),-.3f,-.2f,1.2f);d.mirrored=translate(identity,.5f,.4f,1.6f);d.mirrored[0]=-1;// negative determinant
    d.lit.roughness=.45f;d.lit.metalness=.3f;d.lit.color={1,1,1,1};d.lit.emissive={.05f,0,.02f,1};d.lit.vertexColors=true;
    d.alpha.blend=ParticleBlend::Alpha;d.alpha.color={.2f,.9f,.4f,.5f};d.alpha.depthWrite=false;d.alpha.roughness=.2f;
    d.additive.blend=ParticleBlend::Additive;d.additive.unlit=true;d.additive.doubleSided=true;d.additive.color={.5f,.1f,.6f,1};return d;
}
static SceneFrame frame(bool cropped){
    SceneFrame f;f.viewProjection=camera();f.clear={.05f,.07f,.1f,1};f.eye={0,0,4,1};f.ambient={.15f,.12f,.1f,1};f.fog={.4f,.45f,.5f,.04f};f.exposure=1.2f;f.time=1.5f;
    if(cropped){f.viewport={8,4,80,80};f.scissor=std::array<float,4>{12,10,60,70};}return f;
}

static nlohmann::json compare(const std::vector<std::uint8_t>& a,const std::vector<std::uint8_t>& b,const std::array<float,4>& clear){
    REQUIRE(a.size()==b.size()&&a.size()==std::size_t(W)*H*4);int maxDiff=0;std::size_t over=0,covered=0;
    const std::array<int,3> background{int(std::lround(clear[0]*255)),int(std::lround(clear[1]*255)),int(std::lround(clear[2]*255))};
    for(std::size_t i=0;i<a.size();i+=4){int pixel=0;for(int c=0;c<4;c++)pixel=std::max(pixel,std::abs(int(a[i+c])-int(b[i+c])));maxDiff=std::max(maxDiff,pixel);if(pixel>2)over++;
        if(std::abs(int(a[i])-background[0])+std::abs(int(a[i+1])-background[1])+std::abs(int(a[i+2])-background[2])>12)covered++;}
    return {{"maxDiff",maxDiff},{"pixelsOver2",over},{"covered",covered}};
}

static std::size_t validationErrors(d3d12::Device& gpu){
    detail::Com<ID3D12InfoQueue> info;if(FAILED(gpu.device->QueryInterface(__uuidof(ID3D12InfoQueue),reinterpret_cast<void**>(&info.p))))return 0;
    std::size_t errors=0;for(UINT64 i=0;i<info->GetNumStoredMessages();i++){SIZE_T size=0;info->GetMessage(i,nullptr,&size);std::vector<char> raw(size);auto* m=reinterpret_cast<D3D12_MESSAGE*>(raw.data());info->GetMessage(i,m,&size);
        if(m->Severity<=D3D12_MESSAGE_SEVERITY_ERROR){errors++;std::cerr<<"D3D12 validation: "<<std::string(m->pDescription,m->DescriptionByteLength)<<"\n";}}
    return errors;
}

static nlohmann::json proof(DeviceDriver driver){
    const Scene scene;const auto d=draws();nlohmann::json out;
    // D3D11 reference.
    std::array<std::vector<std::uint8_t>,2> reference;
    {Device gpu11(driver);SceneRenderer r(gpu11,W,H);out["software11"]=gpu11.software();
        auto cube=r.createMesh(scene.cube,scene.cubeIndex);auto quad=r.createMesh(scene.quad,scene.quadIndex,scene.quadUV1);
        auto checker=r.createTexture(8,8,scene.checker,true,false);auto rough=r.createTexture(8,8,scene.rough,false,false);r.setLights(scene.lights);
        for(int pass=0;pass<2;pass++){r.begin(frame(pass==1));
            r.draw(cube,d.cube,d.cube,d.lit,{&checker,nullptr,&rough,nullptr,nullptr,nullptr},{0,0,1,0,0,0});
            r.draw(quad,d.glass,d.glass,d.alpha,{&checker,nullptr,nullptr,nullptr,nullptr,nullptr},{4,0,0,0,0,0});
            r.draw(quad,d.mirrored,d.mirrored,d.additive);reference[pass]=r.readPixels();}}
    // D3D12.
    d3d12::Device gpu(driver,true);out["software"]=gpu.software;out["debugLayer"]=gpu.debug;
    {d3d12::SceneMeshRenderer r(gpu,W,H);gpu.begin();
        auto cube=r.createMesh(scene.cube,scene.cubeIndex);auto quad=r.createMesh(scene.quad,scene.quadIndex,scene.quadUV1);
        auto checker=r.createTexture(8,8,scene.checker,true);auto rough=r.createTexture(8,8,scene.rough,false);r.setLights(scene.lights);
        for(int pass=0;pass<2;pass++){r.begin(frame(pass==1));
            r.draw(cube,d.cube,d.cube,d.lit,{&checker,nullptr,&rough,nullptr,nullptr,nullptr},{0,0,1,0,0,0});
            r.draw(quad,d.glass,d.glass,d.alpha,{&checker,nullptr,nullptr,nullptr,nullptr,nullptr},{4,0,0,0,0,0});
            r.draw(quad,d.mirrored,d.mirrored,d.additive);
            const auto result=compare(r.readPixels(),reference[pass],frame(pass==1).clear);out[pass?"cropped":"full"]=result;}
        r.release(checker);r.release(rough);r.release(cube);r.release(quad);gpu.end();gpu.waitIdle();}
    out["validationErrors"]=validationErrors(gpu);
    for(const char* pass:{"full","cropped"}){REQUIRE(out[pass]["covered"].get<std::size_t>()>400);REQUIRE(out[pass]["maxDiff"].get<int>()<=2);}
    REQUIRE(out["validationErrors"]==0);return out;
}

int main(){
    try{SetErrorMode(SEM_FAILCRITICALERRORS|SEM_NOGPFAULTERRORBOX);nlohmann::json result;
        try{result["hardware"]=proof(DeviceDriver::Hardware);}catch(const std::exception& e){result["hardware"]["error"]=e.what();}
        try{result["software"]=proof(DeviceDriver::Software);}catch(const std::exception& e){result["software"]["error"]=e.what();}
        result["passed"]=!result["hardware"].contains("error")&&!result["software"].contains("error");std::cout<<result.dump()<<std::endl;return result["passed"]?0:1;
    }catch(const std::exception& e){nlohmann::json failed;failed["passed"]=false;failed["error"]=e.what();std::cout<<failed.dump()<<std::endl;return 1;}
}
