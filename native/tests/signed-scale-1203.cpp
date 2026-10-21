#include <HBEngine/Game.hpp>
#include <HBEngine/SceneRender.hpp>
#include <nlohmann/json.hpp>
#include <iostream>
using namespace hb::gpu;
static void check(bool v,const char* why){if(!v)throw std::runtime_error(why);}
int main(){try{
 hb::Actor actor;actor.transform.position={3,2,1};hb::Scene::SetScale(&actor,{-2,.5f,-1});check(actor.transform.scale.x==-2&&actor.transform.position.x==3,"C++ signed scale preserves position");
 for(float invalid:{0.f,.001f,-.001f,10001.f}){bool caught=false;try{hb::Scene::SetScale(&actor,{invalid,1,1});}catch(const std::invalid_argument&){caught=true;}check(caught&&actor.transform.scale.x==-2,"invalid scale atomic rejection");}
 Device gpu;SceneRenderer r(gpu,64,64);SceneFrame frame;frame.eye={0,0,10,1};frame.ambient={0,0,0,1};
 auto mesh=r.createMesh({{{-.8f,-.8f,0}},{{.8f,-.8f,0}},{{.8f,.8f,0}},{{-.8f,.8f,0}}},{0,1,2,0,2,3});
 auto program=r.createProgram("","base.rgb=n*.5+.5;",{0,0,0,0,0,1});SceneMaterial material;material.unlit=true;material.toneMapped=false;int samples=0;
 for(int sx:{-1,1})for(int sy:{-1,1})for(int sz:{-1,1})for(int side=0;side<3;side++){
  Matrix world=identity,normal=identity;world[0]=normal[0]=float(sx);world[5]=normal[5]=float(sy);world[10]=normal[10]=float(sz);world[14]=.5f;material.doubleSided=side==2;material.backSide=side==1;
  r.begin(frame);r.draw(mesh,world,normal,material,{},{},0,0,&program);const auto p=r.readPixels();const bool visible=side==2||(side==0?sz>0:sz<0);const auto at=(32*64+32)*4;
  check(visible?p[at]>180&&p[at+1]>180&&p[at+2]>250:p[at+2]<2,"world winding/normal/side");samples++;
 }
 // One draw contains both winding directions, with no extra instance payload.
 auto instances=r.createInstances(4);std::vector<SceneInstance> values;
 for(int i=0;i<4;i++){SceneInstance item;item.world[0]=(i&1)?-.45f:.45f;item.world[5]=.45f;item.world[10]=(i&2)?-1.f:1.f;item.world[12]=(i&1)?.5f:-.5f;item.world[13]=(i&2)?.5f:-.5f;item.world[14]=.5f;item.normal[0]=1/item.world[0];item.normal[5]=1/item.world[5];item.normal[10]=item.world[10];values.push_back(item);}r.setInstances(instances,values);
 for(int ownerSign:{-1,1})for(int side=0;side<3;side++){
  Matrix world=identity,normal=identity;world[0]=normal[0]=float(ownerSign);material.doubleSided=side==2;material.backSide=side==1;r.begin(frame);r.draw(mesh,world,normal,material,{},{},0,0,&program,{},{},&instances);const auto p=r.readPixels();
  for(int i=0;i<4;i++){const int x=((i&1)?48:16)*ownerSign+(ownerSign<0?64:0),y=(i&2)?16:48;const auto at=(y*64+x)*4;const bool visible=side==2||(side==0?!(i&2):bool(i&2));check(visible?p[at]>180&&p[at+1]>180&&p[at+2]>250:p[at+2]<2,"mixed instance winding/normal/side");samples++;}
 }
 check(instances.bytes()==4*144*3,"instance stride grew");std::cout<<nlohmann::json({{"passed",true},{"samples",samples},{"instanceStride",144},{"worldAndInstanceMirror",true},{"frontBackDoubleSide",true},{"cppScaleAtomic",true}}).dump();
}catch(const std::exception& e){std::cerr<<e.what();return 1;}}
