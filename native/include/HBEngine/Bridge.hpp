#pragma once
#include <HBEngine/Game.hpp>
#include <nlohmann/json.hpp>
#include <memory>
#include <iostream>
#include <type_traits>
#include <unordered_set>
namespace hb {
using Json=nlohmann::json;
inline void to_json(Json& j,const Vec2& v){j=Json::array({v.x,v.y});}
inline void from_json(const Json& j,Vec2& v){v={j.at(0).get<float>(),j.at(1).get<float>()};}
inline void to_json(Json& j,const Vec3& v){j=Json::array({v.x,v.y,v.z});}
inline void from_json(const Json& j,Vec3& v){v={j.at(0).get<float>(),j.at(1).get<float>(),j.at(2).get<float>()};}
inline void to_json(Json& j,const Color& v){j=Json::array({v.r,v.g,v.b,v.a});}
inline void from_json(const Json& j,Color& v){v={j.at(0).get<float>(),j.at(1).get<float>(),j.at(2).get<float>(),j.at(3).get<float>()};}
inline void to_json(Json& j,const Transform& v){j={{"position",v.position},{"rotation",v.rotation},{"scale",v.scale}};}
inline void from_json(const Json& j,Transform& v){j.at("position").get_to(v.position);j.at("rotation").get_to(v.rotation);j.at("scale").get_to(v.scale);}
struct BridgeCell {virtual ~BridgeCell()=default;virtual Actor* actor(){return nullptr;}virtual Json properties()=0;virtual void defaults(const Json&)=0;};
inline std::unordered_map<std::string,std::unique_ptr<BridgeCell>> bridgeCells;
inline std::unordered_map<std::string,std::unique_ptr<Actor>> bridgeActors;
inline Json bridgeEvents=Json::array();
inline Json bridgeOperations=Json::array(),bridgeWorld=Json::array();
inline std::vector<std::string> bridgeOverrides;
inline bool overridden(const std::string& id){return std::find(bridgeOverrides.begin(),bridgeOverrides.end(),id)!=bridgeOverrides.end();}
inline Actor* bridgeActor(const Json& id){if(id.is_null())return nullptr;const std::string name=id.get<std::string>();auto c=bridgeCells.find(name);if(c!=bridgeCells.end())return c->second->actor();auto& a=bridgeActors[name];if(!a)a=std::make_unique<Actor>();return a.get();}
inline Json bridgeId(const Actor* a){if(!a)return nullptr;for(const auto& c:bridgeCells)if(c.second->actor()==a)return c.first;for(const auto& c:bridgeActors)if(c.second.get()==a)return c.first;throw std::runtime_error("unregistered C++ object pointer");}
template<class T> inline Json bridgeValue(const T& v){if constexpr(std::is_pointer_v<T>){if constexpr(std::is_base_of_v<Actor,std::remove_pointer_t<T>>){return bridgeId(v);}else{if(!v)return nullptr;const auto* cell=dynamic_cast<const BridgeCell*>(v);for(const auto& c:bridgeCells)if(c.second.get()==cell)return c.first;throw std::runtime_error("unregistered C++ component pointer");}}else{return Json(v);}}
inline void bridgeSync(const Json& objects){bridgeWorld=objects;std::unordered_set<std::string> ids;for(const auto& o:objects)ids.insert(o.at("id").get<std::string>());for(auto it=bridgeCells.begin();it!=bridgeCells.end();)if(!ids.count(it->first))it=bridgeCells.erase(it);else ++it;for(auto it=bridgeActors.begin();it!=bridgeActors.end();)if(!ids.count(it->first))it=bridgeActors.erase(it);else ++it;for(const auto& o:objects){Actor* a=bridgeActor(o.at("id"));if(a)a->transform=o.get<Transform>();auto c=bridgeCells.find(o.at("id").get<std::string>());if(c!=bridgeCells.end()&&o.contains("nativeProperties"))c->second->defaults(o.at("nativeProperties"));}}
inline Json bridgeSnapshot(){Json values=Json::array();for(const auto& c:bridgeCells){Json o={{"id",c.first},{"nativeProperties",c.second->properties()}};if(c.second->actor()){const auto& t=c.second->actor()->transform;o["position"]=t.position;o["rotation"]=t.rotation;o["scale"]=t.scale;}values.push_back(o);}for(const auto& c:bridgeActors){const auto& t=c.second->transform;values.push_back({{"id",c.first},{"position",t.position},{"rotation",t.rotation},{"scale",t.scale}});}return values;}
inline Json* bridgeState(Actor* actor){const auto id=bridgeId(actor);for(auto& state:bridgeWorld)if(state.at("id")==id)return &state;return nullptr;}
inline Actor* frameworkActor(const std::string& role){for(const auto& state:bridgeWorld)if(state.value("frameworkRole",std::string{})==role)return bridgeActor(state.at("id"));return nullptr;}
inline void engineCommand(const char* key,const Json& args){if(bridgeOperations.size()>=1000)throw std::runtime_error("engine operation limit");bridgeOperations.push_back({{"key",key},{"args",args}});}
inline Actor* Gameplay::GetGameMode(){return frameworkActor("gameMode");}
inline Actor* Gameplay::GetGameState(){return frameworkActor("gameState");}
inline Actor* Gameplay::GetPlayerController(){return frameworkActor("playerController");}
inline Actor* Gameplay::GetPlayerState(){return frameworkActor("playerState");}
inline Actor* Gameplay::GetPlayerPawn(){auto* state=bridgeState(GetPlayerController());return state&&state->contains("pawn")?bridgeActor(state->at("pawn")):frameworkActor("pawn");}
inline void Gameplay::Possess(Actor* controller,Actor* pawn){engineCommand("possess",{{"controller",bridgeId(controller)},{"pawn",bridgeId(pawn)}});if(auto* state=bridgeState(controller))(*state)["pawn"]=bridgeId(pawn);}
inline void Gameplay::UnPossess(Actor* controller){engineCommand("unPossess",{{"controller",bridgeId(controller)}});if(auto* state=bridgeState(controller))(*state)["pawn"]=nullptr;}
inline void Gameplay::AddMovementInput(Actor* target,const Vec3& direction,float scale){engineCommand("addMovementInput",{{"target",bridgeId(target)},{"direction",direction},{"scale",scale}});}
inline void Gameplay::Jump(Actor* target){engineCommand("jump",{{"target",bridgeId(target)}});}
inline Vec3 Physics::GetVelocity(Actor* target){auto* state=bridgeState(target);return state&&state->contains("velocity")?state->at("velocity").get<Vec3>():Vec3{};}
inline void Physics::SetVelocity(Actor* target,const Vec3& velocity){engineCommand("setVelocity",{{"target",bridgeId(target)},{"velocity",velocity}});if(auto* state=bridgeState(target))(*state)["velocity"]=velocity;}
inline void Physics::AddForce(Actor* target,const Vec3& force){engineCommand("addForce",{{"target",bridgeId(target)},{"force",force}});}
inline void Physics::AddImpulse(Actor* target,const Vec3& impulse){engineCommand("impulse",{{"target",bridgeId(target)},{"impulse",impulse}});}
inline void Physics::SetCollisionEnabled(Actor* target,bool enabled){engineCommand("collisionEnabled",{{"target",bridgeId(target)},{"enabled",enabled}});}
inline Actor* bridgeParent(Actor* actor){auto* state=bridgeState(actor);return state&&state->contains("parent")&&!state->at("parent").get<std::string>().empty()?bridgeActor(state->at("parent")):nullptr;}
inline Vec3 bridgeRotate(Vec3 v,Vec3 r,bool inverse){float p[]={v.x,v.y,v.z},angles[]={r.x,r.y,r.z};for(int n=0;n<3;n++){const int axis=inverse?n:2-n,i=(axis+1)%3,j=(axis+2)%3;const float a=angles[axis]*0.017453292519943295f*(inverse?-1:1),x=p[i],y=p[j];p[i]=x*std::cos(a)-y*std::sin(a);p[j]=x*std::sin(a)+y*std::cos(a);}return {p[0],p[1],p[2]};}
inline Vec3 bridgeToWorld(Actor* actor,Vec3 value,int depth=0){if(!actor)return value;if(depth>64)throw std::runtime_error("parent hierarchy limit");const auto& t=actor->transform;value=bridgeRotate({value.x*t.scale.x,value.y*t.scale.y,value.z*t.scale.z},t.rotation,false);value={value.x+t.position.x,value.y+t.position.y,value.z+t.position.z};return bridgeToWorld(bridgeParent(actor),value,depth+1);}
inline Vec3 bridgeFromWorld(Actor* actor,Vec3 value,int depth=0){if(!actor)return value;if(depth>64)throw std::runtime_error("parent hierarchy limit");value=bridgeFromWorld(bridgeParent(actor),value,depth+1);const auto& t=actor->transform;value=bridgeRotate({value.x-t.position.x,value.y-t.position.y,value.z-t.position.z},t.rotation,true);if(t.scale.x==0||t.scale.y==0||t.scale.z==0)throw std::runtime_error("zero parent scale");return {value.x/t.scale.x,value.y/t.scale.y,value.z/t.scale.z};}
inline void Scene::Open(const std::string& scene){engineCommand("openScene",{{"scene",scene}});}
inline Vec3 Scene::GetWorldPosition(Actor* target){if(!target)throw std::runtime_error("null actor");return bridgeToWorld(target,{});}
inline void Scene::SetWorldPosition(Actor* target,const Vec3& position){if(!target)throw std::runtime_error("null actor");target->transform.position=bridgeFromWorld(bridgeParent(target),position);engineCommand("setWorldPosition",{{"target",bridgeId(target)},{"position",position}});}
inline Vec3 Scene::GetLocalPosition(Actor* target){return GetPosition(target);}
inline void Scene::SetLocalPosition(Actor* target,const Vec3& position){SetPosition(target,position);engineCommand("setLocalPosition",{{"target",bridgeId(target)},{"position",position}});}
}
