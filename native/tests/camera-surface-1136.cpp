#include <HBEngine/SceneRender.hpp>
#include <nlohmann/json.hpp>
#include <fstream>
#include <iostream>
#include <limits>

using namespace hb::gpu;
using Json=nlohmann::json;
static int srgb(float x){x=std::max(0.f,std::min(1.f,x));return int(std::round(255*(x<=.0031308f?12.92f*x:1.055f*std::pow(x,1/2.4f)-.055f)));}
template<class F>void rejects(F&& f){bool rejected=false;try{f();}catch(const std::exception&){rejected=true;}if(!rejected)throw std::runtime_error("Expected frame rejection");}
int main(int argc,char** argv){try{
 if(argc!=2){throw std::runtime_error("Missing material plans");}
 Json plans;std::ifstream(argv[1])>>plans;
 Device gpu;SceneRenderer renderer(gpu,64,16);SceneFrame frame;frame.eye={0,0,2,1};frame.ambient={0,0,0,1};
 const std::vector<SceneVertex> vertices={{{-1,-1,.5f},{0,0,1},{0,0}},{{1,-1,.5f},{0,0,1},{1,0}},{{1,1,.5f},{0,0,1},{1,1}},{{-1,1,.5f},{0,0,1},{0,1}}};
 auto mesh=renderer.createMesh(vertices,{0,1,2,0,2,3});SceneMaterial material;material.doubleSided=true;material.toneMapped=false;
 auto program=[&](const Json& p,bool showNormal=false){return renderer.createSurfaceProgram(p.at("declarations"),p.at("evaluation").get<std::string>()+(showNormal?"\nbase.rgb=n*.5+.5;":""),p.at("uniformValues").get<std::vector<float>>());};
 auto view=program(plans.at("view")),fresnel=program(plans.at("fresnel"));
 auto draw=[&](auto& geometry,const SceneRenderer::Program* p=nullptr){renderer.begin(frame);renderer.draw(geometry,identity,identity,material,{},{},0,0,p);renderer.finish();return renderer.readPixels();};
 int assertions=0;auto expect=[&](const auto& pixels,int x,const std::array<float,3>& expected,const char* label){const std::size_t at=(8*64+x)*4;for(std::size_t c=0;c<3;c++)if(std::abs(int(pixels[at+c])-srgb(expected[c]))>2)throw std::runtime_error(std::string(label)+" actual="+Json({pixels[at],pixels[at+1],pixels[at+2]}).dump()+" expected="+Json(expected).dump());++assertions;};
 material.unlit=true;

 for(bool edge:{false,true})for(const auto direction:std::array<std::array<float,4>,3>{{{0,0,1,1},{.6f,0,.8f,1},{0,0,1,0}}}){
  frame.viewDirection=direction;const auto pixels=draw(mesh,edge?&fresnel:&view);
  for(int x:{8,24,40,56}){std::array<float,3> v{direction[0],direction[1],direction[2]};
   if(direction[3]==0){v={-(2*(x+.5f)/64-1),-(1-2*8.5f/16),1.5f};const auto length=std::hypot(v[0],v[1],v[2]);for(auto& a:v)a/=length;}
   if(edge){const float value=.04f+.96f*std::pow(1-v[2],5);v={value,value,value};}else for(auto& a:v)a=a*.5f+.5f;
   expect(pixels,x,v,edge?"Fresnel view":"material view");
  }
 }
 material.unlit=false;material.color={.8f,.4f,.2f,1};frame.viewDirection={0,0,1,1};int ambientCases=0;
 for(bool hemisphere:{false,true})for(float metal:{0.f,.5f,1.f}){material.metalness=metal;frame.ambient=hemisphere?std::array<float,4>{0,0,0,1}:std::array<float,4>{.3f,.6f,.9f,1};std::array<float,3> light{.3f,.6f,.9f};if(hemisphere){SceneLight h;h.position[3]=3;h.direction={0,0,1,0};h.color={.3f,.6f,.9f,1};h.cone={.1f,.2f,.3f,0};renderer.setLights({h});}else renderer.setLights({});const auto pixels=draw(mesh);std::array<float,3> expected{};for(std::size_t c=0;c<3;c++)expected[c]=material.color[c]*light[c]*(1-metal)/3.14159265359f;expect(pixels,32,expected,"Lambert ambient/hemisphere");++ambientCases;}
 renderer.setLights({});frame.ambient={0,0,0,1};material.unlit=true;
 int normalCases=0;for(const auto& p:plans.at("normals")){auto normal=program(p,true);const auto value=p.at("input").get<std::array<float,3>>();for(int mode=0;mode<4;mode++){auto shape=vertices;if(mode==1||mode==3)for(auto& v:shape)v.uv={0,0};if(mode==2)for(auto& v:shape)v.uv[1]=v.uv[0];auto geometry=renderer.createMesh(shape,{0,1,2,0,2,3});std::array<float,3> expected{0,0,1};if(value[0]==0&&value[1]==0)expected[2]=value[2]<0?-1:1;else if(mode==0){const auto length=std::hypot(double(value[0]),double(value[1]),double(value[2]));for(std::size_t c=0;c<3;c++)expected[c]=float(value[c]/length);}for(auto& a:expected)a=a*.5f+.5f;expect(draw(geometry,&normal),32,expected,"normal frame");++normalCases;}}
 auto invalid=frame;invalid.viewDirection={0,0,0,1};rejects([&]{renderer.begin(invalid);});invalid.viewDirection={0,0,1,2};rejects([&]{renderer.begin(invalid);});invalid.viewDirection={std::numeric_limits<float>::infinity(),0,1,1};rejects([&]{renderer.begin(invalid);});
 std::cout<<Json({{"passed",true},{"viewCases",12},{"fresnelCases",12},{"ambientCases",ambientCases},{"normalCases",normalCases},{"assertions",assertions},{"toleranceBytes",2},{"scope","Actual D3D11 production graph plans: perspective and constant rotated orthographic view; independent Lambert ambient/hemisphere metal0/.5/1; normal24 UV/value cases versus analytic geometry; invalid frame rejection"}}).dump();return 0;
}catch(const std::exception& e){std::cerr<<e.what();return 1;}}
