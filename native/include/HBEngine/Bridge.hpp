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
inline std::vector<std::string> bridgeOverrides;
inline bool overridden(const std::string& id){return std::find(bridgeOverrides.begin(),bridgeOverrides.end(),id)!=bridgeOverrides.end();}
inline Actor* bridgeActor(const Json& id){if(id.is_null())return nullptr;const std::string name=id.get<std::string>();auto c=bridgeCells.find(name);if(c!=bridgeCells.end())return c->second->actor();auto& a=bridgeActors[name];if(!a)a=std::make_unique<Actor>();return a.get();}
inline Json bridgeId(const Actor* a){if(!a)return nullptr;for(const auto& c:bridgeCells)if(c.second->actor()==a)return c.first;for(const auto& c:bridgeActors)if(c.second.get()==a)return c.first;throw std::runtime_error("unregistered C++ object pointer");}
template<class T> inline Json bridgeValue(const T& v){if constexpr(std::is_pointer_v<T>){if constexpr(std::is_base_of_v<Actor,std::remove_pointer_t<T>>){return bridgeId(v);}else{if(!v)return nullptr;const auto* cell=dynamic_cast<const BridgeCell*>(v);for(const auto& c:bridgeCells)if(c.second.get()==cell)return c.first;throw std::runtime_error("unregistered C++ component pointer");}}else{return Json(v);}}
inline void bridgeSync(const Json& objects){std::unordered_set<std::string> ids;for(const auto& o:objects)ids.insert(o.at("id").get<std::string>());for(auto it=bridgeCells.begin();it!=bridgeCells.end();)if(!ids.count(it->first))it=bridgeCells.erase(it);else ++it;for(auto it=bridgeActors.begin();it!=bridgeActors.end();)if(!ids.count(it->first))it=bridgeActors.erase(it);else ++it;for(const auto& o:objects){Actor* a=bridgeActor(o.at("id"));if(a)a->transform=o.get<Transform>();auto c=bridgeCells.find(o.at("id").get<std::string>());if(c!=bridgeCells.end()&&o.contains("nativeProperties"))c->second->defaults(o.at("nativeProperties"));}}
inline Json bridgeSnapshot(){Json values=Json::array();for(const auto& c:bridgeCells){Json o={{"id",c.first},{"nativeProperties",c.second->properties()}};if(c.second->actor()){const auto& t=c.second->actor()->transform;o["position"]=t.position;o["rotation"]=t.rotation;o["scale"]=t.scale;}values.push_back(o);}for(const auto& c:bridgeActors){const auto& t=c.second->transform;values.push_back({{"id",c.first},{"position",t.position},{"rotation",t.rotation},{"scale",t.scale}});}return values;}
}
