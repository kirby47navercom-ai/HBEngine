#include <HBEngine/SceneRender.hpp>
#include <nlohmann/json.hpp>
#include <iostream>

using namespace hb::gpu;
static int display(float v){v=std::clamp(v,0.f,1.f);return int(std::round(255*(v<=.0031308f?v*12.92f:1.055f*std::pow(v,1/2.4f)-.055f)));}
int main(){try{
    Device gpu;SceneRenderer renderer(gpu,32,16);SceneFrame frame;frame.ambient={0,0,0,1};frame.eye={0,0,2,1};frame.viewDirection={0,0,1,1};SceneMaterial material;material.unlit=true;material.doubleSided=true;material.toneMapped=false;
    auto debug=renderer.createProgram("","base.rgb=n*.5+.5;",{});
    const std::vector<SceneVertex> base={{{-1,-1,.5f},{0,0,1},{0,0}},{{1,-1,.5f},{0,0,1},{1,0}},{{1,1,.5f},{0,0,1},{1,1}},{{-1,1,.5f},{0,0,1},{0,1}}};
    const std::array<std::array<float,3>,7> normals{{{0,0,1},{0,0,0},{0,0,-1},{1,.4f,1},{-1,.2f,.1f},{1e28f,-2e28f,3e28f},{1e-28f,2e-28f,3e-28f}}};
    const std::array<std::array<float,2>,6> uvScales{{{1,1},{-1,1},{2,.5f},{0,0},{1e28f,2e28f},{1e-28f,2e-28f}}};
    const std::array<std::array<float,2>,4> strengths{{{1,1},{-1,2},{0,0},{1e28f,1e28f}}};const std::array<std::array<float,4>,4> uvMatrices{{{1,0,0,1},{0,-1,1,0},{1,.4f,.2f,1},{1,0,1,0}}};int cases=0,geometryCases=0;
    for(bool reverse:{false,true})for(const auto& matrix:uvMatrices)for(const auto& uv:uvScales)for(const auto& strength:strengths)for(const auto& desired:normals){
        auto vertices=base;for(auto& v:vertices){v.uv[0]*=uv[0];v.uv[1]*=uv[1];}auto mesh=renderer.createMesh(vertices,reverse?std::vector<std::uint32_t>{0,2,1,0,3,2}:std::vector<std::uint32_t>{0,1,2,0,2,3});
        std::array<float,4> encoded{desired[0]*.5f+.5f,desired[1]*.5f+.5f,desired[2]*.5f+.5f,1};std::vector<std::uint8_t> bytes(sizeof(encoded));std::memcpy(bytes.data(),encoded.data(),bytes.size());auto texture=renderer.createDataTexture(1,1,bytes,4,true);material.normalScale=strength;material.uvX[1]={matrix[0],matrix[1],uv[0]!=0&&std::abs(uv[0])<1e-6f?0:.37f,0};material.uvY[1]={matrix[2],matrix[3],uv[1]!=0&&std::abs(uv[1])<1e-6f?0:-.2f,0};
        std::array<const SceneRenderer::Texture*,6> maps{};maps[1]=&texture;renderer.begin(frame);renderer.draw(mesh,identity,identity,material,maps,{},0,0,&debug);renderer.finish();const auto pixels=renderer.readPixels();
        // Expected input starts from the actual Float32 texture bytes: tiny
        // signed values around RGB .5 may have rounded to the neutral value.
        std::array<double,3> mapped{double((encoded[0]*2-1)*strength[0]),double((encoded[1]*2-1)*strength[1]),double(encoded[2]*2-1)},expected{0,0,reverse?-1.:1.};
        if(mapped[0]==0&&mapped[1]==0){if(mapped[2]<0)expected[2]*=-1;}else if(uv[0]!=0&&uv[1]!=0&&double(matrix[0])*matrix[3]-double(matrix[1])*matrix[2]!=0){const double length=std::hypot(mapped[0],mapped[1],mapped[2]),tx=double(matrix[0])*uv[0],ty=double(matrix[1])*uv[1],bx=double(matrix[2])*uv[0],by=double(matrix[3])*uv[1],largest=std::max(std::hypot(tx,ty),std::hypot(bx,by));if(std::isfinite(length)&&length>0){expected={(tx*mapped[0]/length+bx*mapped[1]/length)/largest,(ty*mapped[0]/length+by*mapped[1]/length)/largest,mapped[2]/length*(reverse?-1:1)};const double worldLength=std::hypot(expected[0],expected[1],expected[2]);for(auto& v:expected)v/=worldLength;}}
        for(unsigned c=0;c<3;c++){const int reference=display(float(expected[c]*.5+.5)),actual=pixels[(8*32+16)*4+c];if(std::abs(actual-reference)>2)throw std::runtime_error(nlohmann::json({{"reverse",reverse},{"uv",uv},{"matrix",matrix},{"strength",strength},{"input",desired},{"encoded",encoded},{"expected",expected},{"channel",c},{"actual",actual},{"reference",reference}}).dump());}cases++;
    }
    for(bool reverse:{false,true})for(const auto& normal:std::array<std::array<float,3>,4>{{{0,0,0},{0,0,-1},{1e28f,2e28f,3e28f},{1e-28f,2e-28f,3e-28f}}}){
        auto vertices=base;for(auto& v:vertices)v.normal=normal;auto mesh=renderer.createMesh(vertices,reverse?std::vector<std::uint32_t>{0,2,1,0,3,2}:std::vector<std::uint32_t>{0,1,2,0,2,3});renderer.begin(frame);renderer.draw(mesh,identity,identity,material,{},{},0,0,&debug);renderer.finish();const auto pixels=renderer.readPixels();const double length=std::hypot(double(normal[0]),double(normal[1]),double(normal[2]));for(unsigned c=0;c<3;c++){const double unit=(length?normal[c]/length:c==2?1:0)*(reverse?-1:1);if(std::abs(int(pixels[(8*32+16)*4+c])-display(float(unit*.5+.5)))>2)throw std::runtime_error("geometric normal magnitude/zero/backface");}geometryCases++;
    }
    std::cout<<nlohmann::json({{"passed",true},{"cases",cases},{"geometryCases",geometryCases},{"toleranceBytes",2},{"scope","Actual D3D11 built-in normal texture sampler, Float32 decode/anisotropic XY strength, common cotangent scaling, mirrored/degenerate/huge/tiny UV, front/back, zero/negative-Z/large/tiny inputs and geometry normals. Independent analytic plane basis; huge strength overflow uses the geometric fallback."}}).dump();
}catch(const std::exception& error){std::cerr<<error.what();return 1;}}
