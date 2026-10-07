#pragma once
#include <HBEngine/Game.hpp>
#include <nlohmann/json.hpp>
#include <memory>
#include <iostream>
#include <type_traits>
#include <unordered_set>
#include <cctype>
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
struct BridgeCell {bool checkpointed=false;virtual ~BridgeCell()=default;virtual Actor* actor(){return nullptr;}virtual Json properties()=0;virtual void defaults(const Json&)=0;virtual void saveCheckpoint()=0;virtual void restoreCheckpoint()=0;};
inline std::unordered_map<std::string,std::unique_ptr<BridgeCell>> bridgeCells;
inline std::unordered_map<std::string,std::unique_ptr<Actor>> bridgeActors;
inline Json bridgeEvents=Json::array();
inline Json bridgeOperations=Json::array();
inline std::unordered_set<size_t> bridgeDirtyStates;
inline std::unordered_map<size_t,std::unordered_set<std::string>> bridgeDirtyFields;
// Internal APIs use the JSON base; direct mutable world access also participates
// in dirty-row restoration, including otherwise unacknowledged custom fields.
struct BridgeWorld:Json {
    BridgeWorld():Json(Json::array()){}
    using Json::at;using Json::operator[];
    Json& at(size_type index){bridgeDirtyStates.insert(index);return Json::at(index);}
    const Json& at(size_type index) const{return Json::at(index);}
    Json& operator[](size_type index){bridgeDirtyStates.insert(index);return Json::operator[](index);}
    const Json& operator[](size_type index) const{return Json::operator[](index);}
    void markAll(){for(size_type i=0;i<size();i++)bridgeDirtyStates.insert(i);}
    iterator begin(){markAll();return Json::begin();}
    iterator end(){markAll();return Json::end();}
    const_iterator begin() const{return Json::begin();}
    const_iterator end() const{return Json::end();}
    template<class ReferenceType> ReferenceType get_ref(){if constexpr(!std::is_const_v<std::remove_reference_t<ReferenceType>>)markAll();return Json::get_ref<ReferenceType>();}
    template<class ReferenceType> ReferenceType get_ref() const{return Json::get_ref<ReferenceType>();}
    BridgeWorld& operator=(Json value){Json::operator=(std::move(value));markAll();return *this;}
};
inline BridgeWorld bridgeWorld;
inline Json& bridgeWorldData=bridgeWorld;
inline std::function<void()> bridgePrepareQuery;
inline Json bridgeInput=Json::object();
inline bool bridgeOperationBoundary=false;
inline size_t bridgeOperationStart=0;
inline std::string bridgeInputKey(std::string key){for(auto& c:key)c=static_cast<char>(std::tolower(static_cast<unsigned char>(c)));if(key=="space"||key=="spacebar")return " ";if(key=="mouse0"||key=="mouseleft")return "leftmousebutton";if(key=="mouse1"||key=="mouseright")return "rightmousebutton";if(key=="mouse2"||key=="mousemiddle")return "middlemousebutton";return key;}
inline bool Input::IsKeyDown(const std::string& key){return GetAxis(key)!=0;}
inline float Input::GetAxis(const std::string& key){return bridgeInput.value("keys",Json::object()).value(bridgeInputKey(key),0.0f);}
inline bool Input::GetMousePosition(Vec2& position){const auto p=bridgeInput.value("pointer",Json::object());position=p.value("position",Vec2{});return p.value("valid",false)&&p.value("inside",false);}
inline Vec2 Input::GetMouseDelta(){return bridgeInput.value("pointer",Json::object()).value("delta",Vec2{});}
inline bool Input::DeprojectMousePositionToWorld(Vec3& origin,Vec3& direction){const auto p=bridgeInput.value("pointer",Json::object());origin=p.value("origin",Vec3{});direction=p.value("direction",Vec3{});return p.value("rayValid",false);}
inline bool Input::GetMouseWorldPosition(const Vec3& normal,const Vec3& point,Vec3& position){Vec3 origin,direction;const bool valid=DeprojectMousePositionToWorld(origin,direction);position={};const float denominator=VectorMath::DotProduct(normal,direction);if(!valid||VectorMath::VectorLengthSquared(normal)<=1e-12f||std::abs(denominator)<=1e-8f)return false;const float distance=VectorMath::DotProduct(normal,point-origin)/denominator;if(!std::isfinite(distance)||distance<0)return false;position=origin+direction*distance;return true;}
inline std::vector<std::string> bridgeOverrides;
inline bool overridden(const std::string& id){return std::find(bridgeOverrides.begin(),bridgeOverrides.end(),id)!=bridgeOverrides.end();}
inline std::unordered_map<std::string,size_t> bridgeStateIndices;
inline std::unordered_map<const Actor*,std::string> bridgeActorIds;
inline std::unordered_map<const Actor*,Transform> bridgeSyncedTransforms;
inline Actor* bridgeActor(const Json& id){if(id.is_null())return nullptr;const std::string name=id.get<std::string>();auto c=bridgeCells.find(name);if(c!=bridgeCells.end())return c->second->actor();auto& a=bridgeActors[name];if(!a){const auto state=bridgeStateIndices.find(name);if(state!=bridgeStateIndices.end()&&bridgeWorldData.at(state->second).value("frameworkRole",std::string{})=="gameInstance")a=std::make_unique<GameInstance>();else a=std::make_unique<Actor>();if(state!=bridgeStateIndices.end())a->transform=bridgeWorldData.at(state->second).get<Transform>();bridgeSyncedTransforms[a.get()]=a->transform;}bridgeActorIds[a.get()]=name;return a.get();}
inline Json bridgeId(const Actor* a){if(!a)return nullptr;const auto known=bridgeActorIds.find(a);if(known!=bridgeActorIds.end())return known->second;for(const auto& c:bridgeCells)if(c.second->actor()==a)return c.first;for(const auto& c:bridgeActors)if(c.second.get()==a)return c.first;throw std::runtime_error("unregistered C++ object pointer");}
inline void to_json(Json& j,const Actor* actor){j=bridgeId(actor);}
inline void to_json(Json& j,const HitResult& v){j={{"hit",v.hit},{"position",v.position},{"normal",v.normal},{"actor",bridgeId(v.actor)}};}
inline void from_json(const Json& j,HitResult& v){v.hit=j.at("hit").get<bool>();j.at("position").get_to(v.position);j.at("normal").get_to(v.normal);v.actor=bridgeActor(j.at("actor"));}
template<class T> inline Json bridgeValue(const T& v){if constexpr(std::is_pointer_v<T>){if constexpr(std::is_base_of_v<Actor,std::remove_pointer_t<T>>){return bridgeId(v);}else{if(!v)return nullptr;const auto* cell=dynamic_cast<const BridgeCell*>(v);for(const auto& c:bridgeCells)if(c.second.get()==cell)return c.first;throw std::runtime_error("unregistered C++ component pointer");}}else{return Json(v);}}
template<class T> inline Json bridgeValue(const std::vector<T>& values){Json result=Json::array();for(const auto& value:values)result.push_back(bridgeValue(value));return result;}
template<class T> inline std::vector<T*> bridgeObjectArray(const Json& values){std::vector<T*> result;for(const auto& value:values){auto* actor=bridgeActor(value);auto* typed=dynamic_cast<T*>(actor);if(actor&&!typed)throw std::runtime_error("C++ object array class mismatch");result.push_back(typed);}return result;}
// JSON numeric equality alone also treats integer 1 and float 1.0 as equal.
// Restore the authoritative input's types as well as its values after user code.
inline bool bridgeSameJson(const Json& a,const Json& b){
    if(a.type()!=b.type())return false;
    if(a.is_array()){const auto& left=a.get_ref<const Json::array_t&>();const auto& right=b.get_ref<const Json::array_t&>();if(left.size()!=right.size())return false;for(size_t i=0;i<left.size();i++)if(!bridgeSameJson(left[i],right[i]))return false;return true;}
    if(a.is_object()){const auto& left=a.get_ref<const Json::object_t&>();const auto& right=b.get_ref<const Json::object_t&>();if(left.size()!=right.size())return false;auto r=right.cbegin();for(const auto& l:left){if(l.first!=r->first||!bridgeSameJson(l.second,r->second))return false;++r;}return true;}
    return a==b;
}
inline size_t bridgeRestoreWorld(const Json& input){const auto visited=bridgeDirtyStates.size()+bridgeDirtyFields.size();if(!bridgeWorldData.is_array()||bridgeWorldData.size()!=input.size()){bridgeWorldData=input;bridgeDirtyStates.clear();bridgeDirtyFields.clear();return input.size();}for(const auto i:bridgeDirtyStates)if(i<input.size()&&!bridgeSameJson(bridgeWorldData.at(i),input.at(i)))bridgeWorldData.at(i)=input.at(i);for(const auto& row:bridgeDirtyFields)if(row.first<input.size()&&!bridgeDirtyStates.count(row.first))for(const auto& key:row.second){auto& state=bridgeWorldData.at(row.first);if(input.at(row.first).contains(key))state[key]=input.at(row.first).at(key);else state.erase(key);}bridgeDirtyStates.clear();bridgeDirtyFields.clear();return visited;}
inline void bridgeSync(const Json& objects,bool copyWorld=true,const std::unordered_set<size_t>* changed=nullptr){
    if(copyWorld){bridgeWorldData=objects;bridgeDirtyStates.clear();bridgeDirtyFields.clear();}
    bool stable=!copyWorld&&objects.size()==bridgeStateIndices.size();size_t index=0;
    // Generated patch callers separately force a full sync on row/ID edits.
    if(stable&&!changed)for(const auto& o:objects){const auto found=bridgeStateIndices.find(o.at("id").get<std::string>());if(found==bridgeStateIndices.end()||found->second!=index++){stable=false;break;}}
    if(!stable){bridgeStateIndices.clear();bridgeActorIds.clear();bridgeSyncedTransforms.clear();std::unordered_set<std::string> ids;index=0;for(const auto& o:objects){const auto id=o.at("id").get<std::string>();ids.insert(id);bridgeStateIndices[id]=index++;}for(auto it=bridgeCells.begin();it!=bridgeCells.end();)if(!ids.count(it->first))it=bridgeCells.erase(it);else ++it;for(auto it=bridgeActors.begin();it!=bridgeActors.end();)if(!ids.count(it->first))it=bridgeActors.erase(it);else ++it;}
    auto sync=[&](const Json& o){const auto id=o.at("id").get<std::string>();auto c=bridgeCells.find(id);auto plain=bridgeActors.find(id);Actor* a=c!=bridgeCells.end()?c->second->actor():plain!=bridgeActors.end()?plain->second.get():nullptr;if(a){a->transform=o.get<Transform>();bridgeActorIds[a]=id;bridgeSyncedTransforms[a]=a->transform;}if(c!=bridgeCells.end()&&o.contains("nativeProperties"))c->second->defaults(o.at("nativeProperties"));};
    if(stable&&changed){for(const auto i:*changed)if(i<objects.size())sync(objects.at(i));}else for(const auto& o:objects)sync(o);
}
inline Json bridgeSnapshot(){Json values=Json::array();for(const auto& c:bridgeCells){Json o={{"id",c.first},{"nativeProperties",c.second->properties()}};if(c.second->actor()){const auto& t=c.second->actor()->transform;o["position"]=t.position;o["rotation"]=t.rotation;o["scale"]=t.scale;}values.push_back(o);}for(const auto& c:bridgeActors){const auto& t=c.second->transform;values.push_back({{"id",c.first},{"position",t.position},{"rotation",t.rotation},{"scale",t.scale}});}for(const auto& state:bridgeWorldData){const auto id=state.at("id").get<std::string>();if(!bridgeCells.count(id)&&!bridgeActors.count(id))values.push_back({{"id",id},{"position",state.at("position")},{"rotation",state.at("rotation")},{"scale",state.at("scale")}});}return values;}
inline bool bridgeSameVector(const Vec3& a,const Vec3& b){return a.x==b.x&&a.y==b.y&&a.z==b.z;}
// Match JSON.stringify's numeric types when acknowledging C++ changes. Large
// integral floats with ambiguous decimal rounding keep the ordinary input path.
inline bool bridgeWireJson(Json& value){
    if(value.is_structured()){for(auto& child:value)if(!bridgeWireJson(child))return false;}
    else if(value.is_number_float()){const auto number=value.get<double>();if(!std::isfinite(number))return false;if(std::floor(number)==number){if(std::abs(number)<=9007199254740991.0)value=number>=0?Json(static_cast<uint64_t>(number)):Json(static_cast<int64_t>(number));else if(std::abs(number)<1e21)return false;}}
    else if(value.is_number_integer()&&!value.is_number_unsigned()&&value.get<int64_t>()>=0)value=static_cast<uint64_t>(value.get<int64_t>());
    return true;
}
inline Json bridgeChangedSnapshot(const Json& input){
    Json values=Json::array();
    for(const auto& state:input){
        const auto& id=state.at("id").get_ref<const std::string&>();const auto cell=bridgeCells.find(id);const auto plain=bridgeActors.find(id);Actor* actor=cell!=bridgeCells.end()?cell->second->actor():plain!=bridgeActors.end()?plain->second.get():nullptr;
        if(cell==bridgeCells.end()&&!actor)continue;
        Json props;bool propertiesChanged=false,transformChanged=false;
        if(cell!=bridgeCells.end()){props=cell->second->properties();propertiesChanged=!state.contains("nativeProperties")||props!=state.at("nativeProperties");}
        if(actor){const auto saved=bridgeSyncedTransforms.find(actor);const auto previous=saved==bridgeSyncedTransforms.end()?state.get<Transform>():saved->second;const auto& current=actor->transform;transformChanged=!bridgeSameVector(previous.position,current.position)||!bridgeSameVector(previous.rotation,current.rotation)||!bridgeSameVector(previous.scale,current.scale);}
        if(propertiesChanged||transformChanged){Json next={{"id",id}};if(propertiesChanged)next["nativeProperties"]=std::move(props);if(transformChanged){const auto& current=actor->transform;next["position"]=current.position;next["rotation"]=current.rotation;next["scale"]=current.scale;}values.push_back(std::move(next));}
    }
    return values;
}
inline Json* bridgeState(Actor* actor){const auto id=bridgeId(actor);if(id.is_null())return nullptr;const auto state=bridgeStateIndices.find(id.get<std::string>());if(state==bridgeStateIndices.end())return nullptr;bridgeDirtyStates.insert(state->second);return &bridgeWorldData.at(state->second);}
inline Json* bridgeStateFields(Actor* actor,std::initializer_list<const char*> keys){const auto id=bridgeId(actor);if(id.is_null())return nullptr;const auto found=bridgeStateIndices.find(id.get<std::string>());if(found==bridgeStateIndices.end())return nullptr;auto& fields=bridgeDirtyFields[found->second];for(const auto* key:keys)fields.insert(key);return &bridgeWorldData.at(found->second);}
inline const Json* bridgeReadState(Actor* actor){const auto id=bridgeId(actor);if(id.is_null())return nullptr;const auto state=bridgeStateIndices.find(id.get<std::string>());return state==bridgeStateIndices.end()?nullptr:&bridgeWorldData.at(state->second);}
inline Actor* frameworkActor(const std::string& role){for(const auto& state:bridgeWorldData)if(state.value("frameworkRole",std::string{})==role)return bridgeActor(state.at("id"));return nullptr;}
inline bool bridgeDisplayOperation(const std::string& key,const Json& args){
    if(key!="uiSetText"&&key!="uiSetValue"&&key!="uiSetVisible"&&key!="uiSetEnabled")return false;
    const auto actor=bridgeStateIndices.find(args.at("target").get<std::string>());if(actor==bridgeStateIndices.end())return false;
    const auto& state=bridgeWorldData.at(actor->second);if(!state.contains("gameplayDebug")||!state.at("gameplayDebug").contains("ui"))return false;
    const auto& ui=state.at("gameplayDebug").at("ui");const auto instance=args.at("instance").get<std::string>(),element=args.at("element").get<std::string>();if(!ui.contains(instance)||!ui.at(instance).contains(element))return false;
    const auto& widget=ui.at(instance).at(element);const auto type=widget.value("type",std::string{});
    if(key=="uiSetText")return args.at("text").get<std::string>().size()<=10000;
    if(key=="uiSetValue")return args.at("value").is_number()&&std::isfinite(args.at("value").get<double>());
    const auto property=key=="uiSetVisible"?"visible":"enabled";return (widget.contains(property)&&widget.at(property)==args.at(property))||type=="Text"||type=="Image"||type=="ProgressBar";
}
inline void engineCommand(const char* key,const Json& args){if(bridgeOperations.size()-bridgeOperationStart>=1000)throw std::runtime_error("engine operation limit");if(!bridgeDisplayOperation(key,args))bridgeOperationBoundary=true;bridgeOperations.push_back({{"key",key},{"args",args},{"self",Timers::GetContext().first}});}
inline const Json& bridgeAction(Actor* target,const std::string& path){const auto id=bridgeId(target);const auto actions=bridgeInput.find("actions");if(actions!=bridgeInput.end())for(const auto& a:*actions)if(a.at("owner")==id&&a.at("path")==path)return a;static const Json empty={{"value",false},{"state","none"},{"elapsed",0},{"events",Json::array()}};return empty;}
inline Vec3 Input::GetActionValue(Actor* target,const std::string& action){const auto value=bridgeAction(target,action).at("value");if(value.is_boolean())return {value.get<bool>()?1.0f:0.0f,0,0};if(value.is_number())return {value.get<float>(),0,0};return {value.at(0).get<float>(),value.at(1).get<float>(),value.size()>2?value.at(2).get<float>():0.0f};}
inline std::string Input::GetActionState(Actor* target,const std::string& action){return bridgeAction(target,action).at("state").get<std::string>();}
inline bool Input::HasActionEvent(Actor* target,const std::string& action,const std::string& event){const auto& data=bridgeAction(target,action);for(const auto& e:data.at("events"))if(e==event)return true;return false;}
inline float Input::GetActionElapsed(Actor* target,const std::string& action){return bridgeAction(target,action).at("elapsed").get<float>();}
inline void Input::AddMappingContext(Actor* target,const std::string& context,int priority){engineCommand("inputAddContext",{{"target",bridgeId(target)},{"context",context},{"priority",priority}});}
inline void Input::RemoveMappingContext(Actor* target,const std::string& context){engineCommand("inputRemoveContext",{{"target",bridgeId(target)},{"context",context}});}
inline std::function<Json(const Json&)> bridgeQuery;
inline Json engineQuery(const char* key,const Json& args){
    if(bridgePrepareQuery)bridgePrepareQuery();
    Json world=bridgeWorldData;
    for(const auto& updated:bridgeSnapshot()){
        const auto index=bridgeStateIndices.find(updated.at("id").get<std::string>());
        if(index!=bridgeStateIndices.end()&&index->second<world.size()&&world.at(index->second).at("id")==updated.at("id"))world.at(index->second).update(updated);
        // ponytail: stale index scans rows; rebuild it if unmanaged row edits become frequent.
        else for(auto& object:world)if(object.at("id")==updated.at("id"))object.update(updated);
    }
    Json packet={{"key",key},{"args",args},{"objects",world},{"scope",Timers::GetContext().second},{"clock",{{"scale",Clock::TimeScale()},{"paused",Clock::IsPaused()}}}};if(std::any_of(bridgeOperations.begin(),bridgeOperations.end(),[](const Json& o){return o.at("key")=="sceneSpawn";}))packet["operations"]=bridgeOperations;if(std::string(key)=="nativeModule"&&bridgeInput.contains("keys"))packet["input"]=bridgeInput;
    if(std::string(key)=="nativeModule"){packet["gameState"]=Json::parse(Game::GetStateText());}
    if(bridgeQuery){const auto response=bridgeQuery(packet);if(!response.value("ok",false))throw std::runtime_error(response.value("error",std::string("engine query failed")));return response.at("value");}
    std::cout<<"HB_QUERY\t"<<packet.dump()<<std::endl;
    std::string line;if(!std::getline(std::cin,line))throw std::runtime_error("engine query disconnected");const auto response=Json::parse(line);if(!response.value("ok",false))throw std::runtime_error(response.value("error",std::string("engine query failed")));return response.at("value");
}
inline Json physicsQuery(const char* key,Json args,int dimension,int mask,bool includeTriggers,Actor* ignore){args["dimension"]=dimension;args["mask"]=mask;args["includeTriggers"]=includeTriggers;args["ignore"]=bridgeId(ignore);return engineQuery(key,args);}
inline bool ActorPool::IsActive(Actor* target){auto* state=bridgeReadState(target);if(!state)throw std::runtime_error("missing pool target");return state->value("poolActive",true);}
inline Actor* ActorPool::Acquire(const std::vector<Actor*>& pool,const Transform& transform){std::vector<Actor*> candidates;Actor* selected=nullptr;for(auto* actor:pool){candidates.push_back(actor);if(actor&&!selected&&!IsActive(actor))selected=actor;}engineCommand("poolAcquire",{{"pool",bridgeValue(candidates)},{"transform",transform},{"selected",bridgeId(selected)}});if(selected){selected->transform=transform;auto& state=*bridgeStateFields(selected,{"poolActive","poolVisible","poolCollision","visible","collisionEnabled","velocity","angularVelocity"});state["poolActive"]=true;state["visible"]=state.value("poolVisible",true);state["collisionEnabled"]=state.value("poolCollision",true);state["velocity"]=Vec3{};state["angularVelocity"]=Vec3{};}return selected;}
inline void ActorPool::Release(Actor* target){auto* state=bridgeStateFields(target,{"poolActive","poolVisible","poolCollision","visible","collisionEnabled","velocity","angularVelocity"});if(!state)throw std::runtime_error("missing pool target");engineCommand("poolRelease",{{"target",bridgeId(target)}});if(state->value("poolActive",true)){(*state)["poolVisible"]=state->value("visible",true);(*state)["poolCollision"]=state->value("collisionEnabled",true);(*state)["poolActive"]=false;(*state)["visible"]=false;(*state)["collisionEnabled"]=false;(*state)["velocity"]=Vec3{};(*state)["angularVelocity"]=Vec3{};}}
inline const Json& bridgeReadRenderComponent(Actor* target,const std::string& type);
inline Json& bridgeSprite(Actor* target){auto* state=bridgeStateFields(target,{"components"});if(!state||!state->contains("components"))throw std::runtime_error("missing SpriteRenderer");for(auto& c:state->at("components"))if(c.value("type",std::string{})=="SpriteRenderer"){auto& p=c["properties"];if(p.is_null())p=Json::object();return p;}throw std::runtime_error("missing SpriteRenderer");}
inline void Sprites::SetLightingMode(Actor* target,const std::string& mode){if(mode!="unlit"&&mode!="lit"&&mode!="lit2d")throw std::runtime_error("invalid sprite lighting mode");auto& p=bridgeSprite(target);engineCommand("spriteSetLighting",{{"target",bridgeId(target)},{"mode",mode}});p["shading"]=mode;}
inline std::string Sprites::GetLightingMode(Actor* target){return bridgeReadRenderComponent(target,"SpriteRenderer").value("shading",std::string("unlit"));}
inline Json& bridgeRenderComponent(Actor* target,const std::string& type){auto* state=bridgeStateFields(target,{"components"});if(state&&state->contains("components"))for(auto& c:state->at("components"))if(c.value("type",std::string{})==type){auto& p=c["properties"];if(p.is_null())p=Json::object();return p;}throw std::runtime_error("missing "+type);}
inline const Json& bridgeReadRenderComponent(Actor* target,const std::string& type){auto* state=bridgeReadState(target);if(state&&state->contains("components"))for(const auto& c:state->at("components"))if(c.value("type",std::string{})==type){if(c.contains("properties")&&!c.at("properties").is_null())return c.at("properties");static const Json empty=Json::object();return empty;}throw std::runtime_error("missing "+type);}
inline Json& bridgeLight2D(Actor* target){return bridgeRenderComponent(target,"Light2D");}
inline void bridgeValidateRenderAssetPath(const std::string& path){for(const unsigned char c:path)if(c<32)throw std::runtime_error("invalid render asset path");if(path.size()>1000||path.find("..")!=std::string::npos||path.find(':')!=std::string::npos||(!path.empty()&&(path.front()=='/'||path.front()=='\\')))throw std::runtime_error("invalid render asset path");}
inline void Light2D::SetCookieSprite(Actor* target,const std::string& sprite){bridgeValidateRenderAssetPath(sprite);auto& p=bridgeLight2D(target);engineCommand("light2dSetCookieSprite",{{"target",bridgeId(target)},{"sprite",sprite}});p["cookieSprite"]=sprite;p["cookieTexture"]="";}
inline std::string Light2D::GetCookieSprite(Actor* target){return bridgeReadRenderComponent(target,"Light2D").value("cookieSprite",std::string{});}
inline void Light2D::SetCookieTexture(Actor* target,const std::string& texture,float width,float height){bridgeValidateRenderAssetPath(texture);if(!std::isfinite(width)||!std::isfinite(height)||width<.001f||height<.001f||width>100000||height>100000)throw std::runtime_error("invalid cookie size");auto& p=bridgeLight2D(target);const double w=std::max(.001,static_cast<double>(width)),h=std::max(.001,static_cast<double>(height));engineCommand("light2dSetCookieTexture",{{"target",bridgeId(target)},{"texture",texture},{"width",w},{"height",h}});p["cookieSprite"]="";p["cookieTexture"]=texture;p["cookieWidth"]=w;p["cookieHeight"]=h;}
inline std::string Light2D::GetCookieTexture(Actor* target){return bridgeReadRenderComponent(target,"Light2D").value("cookieTexture",std::string{});}
inline void Light2D::GetCookieSize(Actor* target,float& width,float& height){auto& p=bridgeReadRenderComponent(target,"Light2D");width=p.value("cookieWidth",1.f);height=p.value("cookieHeight",1.f);}
inline void Light2D::SetVolumetric(Actor* target,bool enabled,float intensity,float shadowStrength){if(!std::isfinite(intensity)||intensity<0||intensity>1||!std::isfinite(shadowStrength)||shadowStrength<0||shadowStrength>1)throw std::runtime_error("invalid volume light");auto& p=bridgeLight2D(target);engineCommand("light2dSetVolume",{{"target",bridgeId(target)},{"enabled",enabled},{"intensity",intensity},{"shadowStrength",shadowStrength}});p["volumetric"]=enabled;p["volumeIntensity"]=intensity;p["volumeShadowStrength"]=shadowStrength;}
inline void Light2D::GetVolumetric(Actor* target,bool& enabled,float& intensity,float& shadowStrength){auto& p=bridgeReadRenderComponent(target,"Light2D");enabled=p.value("volumetric",false);intensity=p.value("volumeIntensity",.1f);shadowStrength=p.value("volumeShadowStrength",1.f);}
inline void bridgeValidateBlendStyle(int index){if(index<0||index>3)throw std::runtime_error("invalid Light2D blend style");}
inline void Light2D::SetLightOrder(Actor* target,int order){if(order < -1048576||order > 1048576)throw std::runtime_error("invalid 2D light order");auto& p=bridgeLight2D(target);engineCommand("light2dSetOrder",{{"target",bridgeId(target)},{"order",order}});p["lightOrder"]=order;}
inline int Light2D::GetLightOrder(Actor* target){return bridgeReadRenderComponent(target,"Light2D").value("lightOrder",0);}
inline void Light2D::SetOverlapOperation(Actor* target,const std::string& mode){if(mode!="additive"&&mode!="alphaBlend")throw std::runtime_error("invalid 2D light overlap");auto& p=bridgeLight2D(target);engineCommand("light2dSetOverlap",{{"target",bridgeId(target)},{"mode",mode}});p["overlapOperation"]=mode;}
inline std::string Light2D::GetOverlapOperation(Actor* target){return bridgeReadRenderComponent(target,"Light2D").value("overlapOperation",std::string("additive"));}
inline void Light2D::SetBlendStyle(Actor* target,int index){bridgeValidateBlendStyle(index);auto& p=bridgeLight2D(target);engineCommand("light2dSetBlendStyle",{{"target",bridgeId(target)},{"index",index}});p["blendStyle"]=index;}
inline int Light2D::GetBlendStyle(Actor* target){return bridgeReadRenderComponent(target,"Light2D").value("blendStyle",0);}
inline void Light2D::SetRendererBlendStyle(Actor* target,int index,const std::string& mode,const std::string& mask){bridgeValidateBlendStyle(index);if(mode!="multiply"&&mode!="additive"&&mode!="subtractive")throw std::runtime_error("invalid 2D blend mode");if(mask!="none"&&mask!="r"&&mask!="g"&&mask!="b"&&mask!="a"&&mask!="oneMinusR"&&mask!="oneMinusG"&&mask!="oneMinusB"&&mask!="oneMinusA")throw std::runtime_error("invalid 2D light mask");auto& p=bridgeRenderComponent(target,"Renderer2D");engineCommand("light2dRendererSetStyle",{{"target",bridgeId(target)},{"index",index},{"mode",mode},{"mask",mask}});const auto key="style"+std::to_string(index);p[key+"Mode"]=mode;p[key+"Mask"]=mask;}
inline void Light2D::GetRendererBlendStyle(Actor* target,int index,std::string& mode,std::string& mask){bridgeValidateBlendStyle(index);auto& p=bridgeReadRenderComponent(target,"Renderer2D");const auto key="style"+std::to_string(index);mode=p.value(key+"Mode",std::string(index==1?"additive":index==2?"subtractive":"multiply"));mask=p.value(key+"Mask",std::string("none"));}
inline Json& bridgeShadow2D(Actor* target){return bridgeRenderComponent(target,"ShadowCaster2D");}
inline void bridgeValidateSortingLayers(const std::vector<std::string>& layers){if(layers.size()>64)throw std::runtime_error("sorting layer limit");std::unordered_set<std::string> seen;for(const auto& id:layers)if(id.empty()||id.size()>80||id.find_first_not_of("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-")!=std::string::npos||!seen.insert(id).second)throw std::runtime_error("invalid sorting layer");}
inline bool bridgeValidPath2D(const std::vector<Vec2>& path){
 if(path.size()<3||path.size()>64)return false;
 constexpr double eps=1e-8;double area=0;
 const auto cross=[](const Vec2& a,const Vec2& b,const Vec2& c){return (double(b.x)-a.x)*(double(c.y)-a.y)-(double(b.y)-a.y)*(double(c.x)-a.x);};
 const auto on=[&](const Vec2& a,const Vec2& b,const Vec2& p){return std::abs(cross(a,b,p))<eps&&p.x>=std::min(a.x,b.x)-eps&&p.x<=std::max(a.x,b.x)+eps&&p.y>=std::min(a.y,b.y)-eps&&p.y<=std::max(a.y,b.y)+eps;};
 for(size_t i=0;i<path.size();i++){const auto &a=path[i],&b=path[(i+1)%path.size()],&c=path[(i+2)%path.size()];if(!std::isfinite(a.x)||!std::isfinite(a.y)||std::abs(a.x)>10000||std::abs(a.y)>10000||std::hypot(double(b.x)-a.x,double(b.y)-a.y)<eps)return false;area+=double(a.x)*b.y-double(b.x)*a.y;if(std::abs(cross(a,b,c))<eps&&(double(b.x)-a.x)*(double(c.x)-b.x)+(double(b.y)-a.y)*(double(c.y)-b.y)<0)return false;
  for(size_t j=i+1;j<path.size();j++){if(j==i+1||(i==0&&j==path.size()-1))continue;const auto &d=path[j],&e=path[(j+1)%path.size()];if((cross(a,b,d)*cross(a,b,e)<0&&cross(d,e,a)*cross(d,e,b)<0)||on(a,b,d)||on(a,b,e)||on(d,e,a)||on(d,e,b))return false;}
 }return std::abs(area/2)>=eps;
}
inline void Light2D::SetShapePath(Actor* target,const std::vector<Vec2>& path,float falloffDistance){if(!bridgeValidPath2D(path)||!std::isfinite(falloffDistance)||falloffDistance<0||falloffDistance>100000)throw std::runtime_error("invalid Light2D shape");auto& p=bridgeLight2D(target);engineCommand("light2dSetShape",{{"target",bridgeId(target)},{"path",path},{"falloffDistance",falloffDistance}});p["shapePath"]=path;p["shapeFalloff"]=falloffDistance;}
inline std::vector<Vec2> Light2D::GetShapePath(Actor* target){return bridgeReadRenderComponent(target,"Light2D").value("shapePath",std::vector<Vec2>{{-1,-1},{1,-1},{1,1},{-1,1}});}
inline float Light2D::GetShapeFalloff(Actor* target){return bridgeReadRenderComponent(target,"Light2D").value("shapeFalloff",.5f);}
inline void Light2D::SetShadows(Actor* target,bool enabled,float strength,float softness,int resolution){if(!std::isfinite(strength)||strength<0||strength>1||!std::isfinite(softness)||softness<0||softness>1||(resolution!=64&&resolution!=128&&resolution!=256&&resolution!=512&&resolution!=1024))throw std::runtime_error("invalid Light2D shadows");auto& p=bridgeLight2D(target);engineCommand("light2dSetShadows",{{"target",bridgeId(target)},{"enabled",enabled},{"strength",strength},{"softness",softness},{"resolution",resolution}});p["shadows"]=enabled;p["shadowStrength"]=strength;p["shadowSoftness"]=softness;p["shadowResolution"]=resolution;}
inline void Light2D::GetShadows(Actor* target,bool& enabled,float& strength,float& softness,int& resolution){auto& p=bridgeReadRenderComponent(target,"Light2D");enabled=p.value("shadows",false);strength=p.value("shadowStrength",1.f);softness=p.value("shadowSoftness",0.f);resolution=p.value("shadowResolution",128);}
inline void Light2D::SetEnabled(Actor* target,bool enabled){auto& p=bridgeLight2D(target);engineCommand("light2dSetEnabled",{{"target",bridgeId(target)},{"enabled",enabled}});p["enabled"]=enabled;}
inline bool Light2D::IsEnabled(Actor* target){return bridgeLight2D(target).value("enabled",true);}
inline void Light2D::SetType(Actor* target,const std::string& type){if(type!="global"&&type!="point"&&type!="spot"&&type!="freeform"&&type!="sprite")throw std::runtime_error("invalid Light2D type");auto& p=bridgeLight2D(target);engineCommand("light2dSetType",{{"target",bridgeId(target)},{"type",type}});p["lightType"]=type;}
inline std::string Light2D::GetType(Actor* target){return bridgeReadRenderComponent(target,"Light2D").value("lightType",std::string("point"));}
inline void Light2D::SetColor(Actor* target,const Color& color){for(const float v:{color.r,color.g,color.b,color.a})if(!std::isfinite(v)||v<0||v>1)throw std::runtime_error("invalid Light2D color");auto& p=bridgeLight2D(target);engineCommand("light2dSetColor",{{"target",bridgeId(target)},{"color",color}});p["color"]=color;}
inline Color Light2D::GetColor(Actor* target){return bridgeReadRenderComponent(target,"Light2D").value("color",Color{1,1,1,1});}
inline void Light2D::SetIntensity(Actor* target,float value){if(!std::isfinite(value)||value<0||value>100000)throw std::runtime_error("invalid Light2D intensity");auto& p=bridgeLight2D(target);engineCommand("light2dSetIntensity",{{"target",bridgeId(target)},{"value",value}});p["intensity"]=value;}
inline float Light2D::GetIntensity(Actor* target){return bridgeReadRenderComponent(target,"Light2D").value("intensity",1.f);}
inline void Light2D::SetRange(Actor* target,float innerRadius,float outerRadius,float falloff){if(!std::isfinite(innerRadius)||!std::isfinite(outerRadius)||!std::isfinite(falloff)||innerRadius<0||innerRadius>outerRadius||outerRadius<.001f||outerRadius>100000||falloff<.01f||falloff>16)throw std::runtime_error("invalid Light2D range");const double canonicalFalloff=std::max(.01,static_cast<double>(falloff));auto& p=bridgeLight2D(target);engineCommand("light2dSetRange",{{"target",bridgeId(target)},{"innerRadius",innerRadius},{"outerRadius",outerRadius},{"falloff",canonicalFalloff}});p["innerRadius"]=innerRadius;p["outerRadius"]=outerRadius;p["falloff"]=canonicalFalloff;}
inline void Light2D::GetRange(Actor* target,float& innerRadius,float& outerRadius,float& falloff){auto& p=bridgeReadRenderComponent(target,"Light2D");innerRadius=p.value("innerRadius",0.f);outerRadius=p.value("outerRadius",5.f);falloff=p.value("falloff",1.f);}
inline void Light2D::SetAngles(Actor* target,float innerAngle,float outerAngle){if(!std::isfinite(innerAngle)||!std::isfinite(outerAngle)||innerAngle<0||innerAngle>outerAngle||outerAngle>360)throw std::runtime_error("invalid Light2D angles");auto& p=bridgeLight2D(target);engineCommand("light2dSetAngles",{{"target",bridgeId(target)},{"innerAngle",innerAngle},{"outerAngle",outerAngle}});p["innerAngle"]=innerAngle;p["outerAngle"]=outerAngle;}
inline void Light2D::GetAngles(Actor* target,float& innerAngle,float& outerAngle){auto& p=bridgeReadRenderComponent(target,"Light2D");innerAngle=p.value("innerAngle",45.f);outerAngle=p.value("outerAngle",90.f);}
inline void Light2D::SetNormal(Actor* target,const std::string& mode,float distance){if((mode!="disabled"&&mode!="fast"&&mode!="accurate")||!std::isfinite(distance)||distance<.00001f||distance>100000)throw std::runtime_error("invalid Light2D normal");const double canonicalDistance=std::max(.00001,static_cast<double>(distance));auto& p=bridgeLight2D(target);engineCommand("light2dSetNormal",{{"target",bridgeId(target)},{"mode",mode},{"distance",canonicalDistance}});p["normalMode"]=mode;p["normalDistance"]=canonicalDistance;}
inline void Light2D::GetNormal(Actor* target,std::string& mode,float& distance){auto& p=bridgeReadRenderComponent(target,"Light2D");mode=p.value("normalMode",std::string("accurate"));distance=p.value("normalDistance",1.f);}
inline void Light2D::SetTargetSortingLayers(Actor* target,const std::vector<std::string>& layers){bridgeValidateSortingLayers(layers);auto& p=bridgeLight2D(target);engineCommand("light2dSetLayers",{{"target",bridgeId(target)},{"layers",layers}});p["targetSortingLayers"]=layers;}
inline std::vector<std::string> Light2D::GetTargetSortingLayers(Actor* target){return bridgeReadRenderComponent(target,"Light2D").value("targetSortingLayers",std::vector<std::string>{"default"});}
inline void ShadowCaster2D::SetEnabled(Actor* target,bool enabled){auto& p=bridgeShadow2D(target);engineCommand("shadow2dSetEnabled",{{"target",bridgeId(target)},{"enabled",enabled}});p["enabled"]=enabled;}
inline bool ShadowCaster2D::IsEnabled(Actor* target){return bridgeShadow2D(target).value("enabled",true);}
inline void ShadowCaster2D::SetSource(Actor* target,const std::string& source){if(source!="sprite"&&source!="skin"&&source!="collider"&&source!="shape"&&source!="none")throw std::runtime_error("invalid shadow source");auto& p=bridgeShadow2D(target);engineCommand("shadow2dSetSource",{{"target",bridgeId(target)},{"source",source}});p["source"]=source;}
inline std::string ShadowCaster2D::GetSource(Actor* target){return bridgeShadow2D(target).value("source",std::string("sprite"));}
inline void ShadowCaster2D::SetCasting(Actor* target,const std::string& mode){if(mode!="cast"&&mode!="self"&&mode!="both"&&mode!="none")throw std::runtime_error("invalid shadow casting");auto& p=bridgeShadow2D(target);engineCommand("shadow2dSetCasting",{{"target",bridgeId(target)},{"mode",mode}});p["casting"]=mode;}
inline std::string ShadowCaster2D::GetCasting(Actor* target){return bridgeShadow2D(target).value("casting",std::string("cast"));}
inline void ShadowCaster2D::SetShapePath(Actor* target,const std::vector<Vec2>& path){if(!bridgeValidPath2D(path))throw std::runtime_error("invalid shadow path");auto& p=bridgeShadow2D(target);engineCommand("shadow2dSetShape",{{"target",bridgeId(target)},{"path",path}});p["shapePath"]=path;p["source"]="shape";}
inline std::vector<Vec2> ShadowCaster2D::GetShapePath(Actor* target){return bridgeShadow2D(target).value("shapePath",std::vector<Vec2>{{-.5f,-.5f},{.5f,-.5f},{.5f,.5f},{-.5f,.5f}});}
inline void ShadowCaster2D::SetTargetSortingLayers(Actor* target,const std::vector<std::string>& layers,bool allLayers){bridgeValidateSortingLayers(layers);auto& p=bridgeShadow2D(target);engineCommand("shadow2dSetLayers",{{"target",bridgeId(target)},{"layers",layers},{"allLayers",allLayers}});p["targetSortingLayers"]=layers;p["allSortingLayers"]=allLayers;}
inline std::vector<std::string> ShadowCaster2D::GetTargetSortingLayers(Actor* target){return bridgeShadow2D(target).value("targetSortingLayers",std::vector<std::string>{"default"});}
inline bool ShadowCaster2D::UsesAllSortingLayers(Actor* target){return bridgeShadow2D(target).value("allSortingLayers",true);}
inline void ShadowCaster2D::SetImageShapeOptions(Actor* target,float alphaCutoff,float trimEdge){if(!std::isfinite(alphaCutoff)||alphaCutoff<0||alphaCutoff>1||!std::isfinite(trimEdge)||trimEdge<0||trimEdge>10000)throw std::runtime_error("invalid shadow alpha/trim");auto& p=bridgeShadow2D(target);engineCommand("shadow2dSetImageShape",{{"target",bridgeId(target)},{"alphaCutoff",alphaCutoff},{"trimEdge",trimEdge}});p["alphaCutoff"]=alphaCutoff;p["trimEdge"]=trimEdge;}
inline void ShadowCaster2D::GetImageShapeOptions(Actor* target,float& alphaCutoff,float& trimEdge){auto& p=bridgeShadow2D(target);alphaCutoff=p.value("alphaCutoff",.1f);trimEdge=p.value("trimEdge",0.f);}
inline void Sprites::SetFlip(Actor* target,bool flipX,bool flipY){auto& p=bridgeSprite(target);if(p.value("flipX",false)==flipX&&p.value("flipY",false)==flipY)return;engineCommand("spriteFlip",{{"target",bridgeId(target)},{"flipX",flipX},{"flipY",flipY}});p["flipX"]=flipX;p["flipY"]=flipY;}
inline void Sprites::GetFlip(Actor* target,bool& flipX,bool& flipY){auto& p=bridgeReadRenderComponent(target,"SpriteRenderer");flipX=p.value("flipX",false);flipY=p.value("flipY",false);}
inline void Sprites::SetSprite(Actor* target,const std::string& sprite){auto& p=bridgeSprite(target);engineCommand("spriteSet",{{"target",bridgeId(target)},{"sprite",sprite}});p["sprite"]=sprite;(*bridgeState(target))["currentSprite"]=sprite;}
inline std::string Sprites::GetSprite(Actor* target){auto& p=bridgeReadRenderComponent(target,"SpriteRenderer");return bridgeState(target)->value("currentSprite",p.value("sprite",std::string{}));}
inline void Sprites::SetColor(Actor* target,const Color& color){for(const float v:{color.r,color.g,color.b,color.a})if(!std::isfinite(v)||v<0||v>1)throw std::runtime_error("invalid sprite color");auto& p=bridgeSprite(target);engineCommand("spriteSetColor",{{"target",bridgeId(target)},{"color",color}});p["color"]=color;}
inline Color Sprites::GetColor(Actor* target){return bridgeReadRenderComponent(target,"SpriteRenderer").value("color",Color{1,1,1,1});}
inline void Sprites::SetSize(Actor* target,const Vec2& size){if(!std::isfinite(size.x)||!std::isfinite(size.y)||size.x<.01f||size.y<.01f||size.x>10000||size.y>10000)throw std::runtime_error("invalid sprite size");auto& p=bridgeSprite(target);engineCommand("spriteSetSize",{{"target",bridgeId(target)},{"size",size}});p["width"]=size.x;p["height"]=size.y;p["useCustomSize"]=true;}
inline Vec2 Sprites::GetSize(Actor* target){auto& p=bridgeReadRenderComponent(target,"SpriteRenderer");return {p.value("width",1.f),p.value("height",1.f)};}
inline void Sprites::SetSorting(Actor* target,const std::string& layer,int order){if(layer.empty()||layer.size()>80||layer.find_first_not_of("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-")!=std::string::npos||order< -100000||order>100000)throw std::runtime_error("invalid sprite sorting");auto& p=bridgeSprite(target);engineCommand("spriteSetSorting",{{"target",bridgeId(target)},{"layer",layer},{"order",order}});p["sortingLayer"]=layer;p["sortingOrder"]=order;}
inline void Sprites::GetSorting(Actor* target,std::string& layer,int& order){auto& p=bridgeReadRenderComponent(target,"SpriteRenderer");layer=p.value("sortingLayer",std::string("default"));order=p.value("sortingOrder",0);}
inline void Sprites::SetMaskInteraction(Actor* target,const std::string& mode){if(mode!="none"&&mode!="inside"&&mode!="outside")throw std::runtime_error("invalid sprite mask mode");auto& p=bridgeSprite(target);engineCommand("spriteSetMask",{{"target",bridgeId(target)},{"mode",mode}});p["maskInteraction"]=mode;}
inline std::string Sprites::GetMaskInteraction(Actor* target){return bridgeReadRenderComponent(target,"SpriteRenderer").value("maskInteraction",std::string("none"));}
inline void Sprites::SetLit(Actor* target,bool lit){auto& p=bridgeSprite(target);engineCommand("spriteSetLit",{{"target",bridgeId(target)},{"lit",lit}});p["shading"]=lit?"lit":"unlit";}
inline bool Sprites::IsLit(Actor* target){const auto mode=GetLightingMode(target);return mode=="lit"||mode=="lit2d";}
inline void Sprites::SetBlendMode(Actor* target,const std::string& mode,float alphaCutoff){if((mode!="opaque"&&mode!="masked"&&mode!="translucent"&&mode!="additive")||!std::isfinite(alphaCutoff)||alphaCutoff<0||alphaCutoff>1)throw std::runtime_error("invalid sprite blend");auto& p=bridgeSprite(target);engineCommand("spriteSetBlend",{{"target",bridgeId(target)},{"mode",mode},{"alphaCutoff",alphaCutoff}});p["blendMode"]=mode;p["alphaCutoff"]=alphaCutoff;}
inline std::string Sprites::GetBlendMode(Actor* target){return bridgeReadRenderComponent(target,"SpriteRenderer").value("blendMode",std::string("translucent"));}
inline float Sprites::GetAlphaCutoff(Actor* target){return bridgeReadRenderComponent(target,"SpriteRenderer").value("alphaCutoff",.5f);}
inline void Sprites::SetLightMaskTexture(Actor* target,const std::string& texture){bridgeValidateRenderAssetPath(texture);auto& p=bridgeSprite(target);engineCommand("spriteSetLightMask",{{"target",bridgeId(target)},{"texture",texture}});p["lightMaskTexture"]=texture;}
inline std::string Sprites::GetLightMaskTexture(Actor* target){return bridgeReadRenderComponent(target,"SpriteRenderer").value("lightMaskTexture",std::string{});}
inline void Sprites::SetNormalMap(Actor* target,const std::string& texture,float strength,bool flipY){for(const unsigned char c:texture)if(c<32)throw std::runtime_error("invalid sprite normal map");if(texture.size()>1000||texture.find("..")!=std::string::npos||texture.find(':')!=std::string::npos||(!texture.empty()&&(texture.front()=='/'||texture.front()=='\\'))||!std::isfinite(strength)||strength<0||strength>16)throw std::runtime_error("invalid sprite normal map");auto& p=bridgeSprite(target);engineCommand("spriteSetNormal",{{"target",bridgeId(target)},{"texture",texture},{"strength",strength},{"flipY",flipY}});p["normalTexture"]=texture;p["normalStrength"]=strength;p["normalFlipY"]=flipY;}
inline void Sprites::GetNormalMap(Actor* target,std::string& texture,float& strength,bool& flipY){auto& p=bridgeReadRenderComponent(target,"SpriteRenderer");texture=p.value("normalTexture",std::string{});strength=p.value("normalStrength",1.f);flipY=p.value("normalFlipY",false);}
inline void Sprites::SetShadows(Actor* target,bool cast,bool receive){auto& p=bridgeSprite(target);engineCommand("spriteSetShadows",{{"target",bridgeId(target)},{"cast",cast},{"receive",receive}});p["castShadow"]=cast;p["receiveShadow"]=receive;}
inline void Sprites::GetShadows(Actor* target,bool& cast,bool& receive){auto& p=bridgeReadRenderComponent(target,"SpriteRenderer");cast=p.value("castShadow",false);receive=p.value("receiveShadow",false);}
inline Actor* Gameplay::GetGameMode(){return frameworkActor("gameMode");}
inline Actor* Gameplay::GetGameState(){return frameworkActor("gameState");}
inline Actor* Gameplay::GetPlayerController(){return frameworkActor("playerController");}
inline Actor* Gameplay::GetPlayerState(){return frameworkActor("playerState");}
inline Actor* Gameplay::GetPlayerPawn(){auto* state=bridgeReadState(GetPlayerController());return state&&state->contains("pawn")?bridgeActor(state->at("pawn")):frameworkActor("pawn");}
inline void Gameplay::Possess(Actor* controller,Actor* pawn){engineCommand("possess",{{"controller",bridgeId(controller)},{"pawn",bridgeId(pawn)}});if(auto* state=bridgeState(controller))(*state)["pawn"]=bridgeId(pawn);}
inline void Gameplay::UnPossess(Actor* controller){engineCommand("unPossess",{{"controller",bridgeId(controller)}});if(auto* state=bridgeState(controller))(*state)["pawn"]=nullptr;}
inline void Gameplay::AddMovementInput(Actor* target,const Vec3& direction,float scale){engineCommand("addMovementInput",{{"target",bridgeId(target)},{"direction",direction},{"scale",scale}});}
inline void Gameplay::Jump(Actor* target){engineCommand("jump",{{"target",bridgeId(target)}});}
inline Vec3 Physics::GetVelocity(Actor* target){auto* state=bridgeReadState(target);return state&&state->contains("velocity")?state->at("velocity").get<Vec3>():Vec3{};}
inline void Physics::SetVelocity(Actor* target,const Vec3& velocity){engineCommand("setVelocity",{{"target",bridgeId(target)},{"velocity",velocity}});if(auto* state=bridgeStateFields(target,{"velocity"}))(*state)["velocity"]=velocity;}
inline void Physics::AddForce(Actor* target,const Vec3& force){engineCommand("addForce",{{"target",bridgeId(target)},{"force",force}});}
inline void Physics::AddImpulse(Actor* target,const Vec3& impulse){engineCommand("impulse",{{"target",bridgeId(target)},{"impulse",impulse}});}
inline void Physics::SetCollisionEnabled(Actor* target,bool enabled){engineCommand("collisionEnabled",{{"target",bridgeId(target)},{"enabled",enabled}});if(auto* state=bridgeStateFields(target,{"collisionEnabled"}))(*state)["collisionEnabled"]=enabled;}
inline Vec3 Physics::GetAngularVelocity(Actor* target){auto* s=bridgeReadState(target);return s&&s->contains("angularVelocity")?s->at("angularVelocity").get<Vec3>():Vec3{};}
inline void Physics::SetAngularVelocity(Actor* target,const Vec3& velocity){engineCommand("setAngularVelocity",{{"target",bridgeId(target)},{"velocity",velocity}});if(auto* s=bridgeStateFields(target,{"angularVelocity"}))(*s)["angularVelocity"]=velocity;}
inline float Physics::GetMass(Actor* target){auto* s=bridgeReadState(target);if(!s)throw std::runtime_error("missing rigidbody");return s->at("gameplayDebug").at("physics").at("mass").get<float>();}
inline bool Physics::IsSleeping(Actor* target){auto* s=bridgeReadState(target);if(!s)throw std::runtime_error("missing rigidbody");return s->at("gameplayDebug").at("physics").at("sleeping").get<bool>();}
inline void Physics::SetSleeping(Actor* target,bool sleeping){engineCommand("physicsSleep",{{"target",bridgeId(target)},{"sleeping",sleeping}});if(auto* s=bridgeState(target))(*s)["gameplayDebug"]["physics"]["sleeping"]=sleeping;}
inline void Physics::ApplyForce(Actor* target,const Vec3& force,const std::string& mode){engineCommand("physicsForce",{{"target",bridgeId(target)},{"force",force},{"mode",mode}});}
inline void Physics::ApplyForceAtPosition(Actor* target,const Vec3& force,const Vec3& position,const std::string& mode){engineCommand("physicsForceAt",{{"target",bridgeId(target)},{"force",force},{"position",position},{"mode",mode}});}
inline void Physics::AddTorque(Actor* target,const Vec3& torque){engineCommand("physicsTorque",{{"target",bridgeId(target)},{"torque",torque}});}
inline void Physics::AddAngularImpulse(Actor* target,const Vec3& impulse){engineCommand("physicsAngularImpulse",{{"target",bridgeId(target)},{"impulse",impulse}});}
inline HitResult Physics::Raycast(const Vec3& start,const Vec3& end,int dimension,int mask,bool includeTriggers,Actor* ignore){return physicsQuery("physicsRaycast",{{"start",start},{"end",end}},dimension,mask,includeTriggers,ignore).get<HitResult>();}
inline std::vector<HitResult> Physics::RaycastAll(const Vec3& start,const Vec3& end,int dimension,int mask,bool includeTriggers,Actor* ignore){return physicsQuery("physicsRaycastAll",{{"start",start},{"end",end}},dimension,mask,includeTriggers,ignore).get<std::vector<HitResult>>();}
inline HitResult Physics::SphereCast(const Vec3& start,const Vec3& end,float radius,int dimension,int mask,bool includeTriggers,Actor* ignore){return physicsQuery("physicsSphereCast",{{"start",start},{"end",end},{"radius",radius}},dimension,mask,includeTriggers,ignore).get<HitResult>();}
inline HitResult Physics::BoxCast(const Vec3& start,const Vec3& end,const Vec3& extent,const Vec3& rotation,int dimension,int mask,bool includeTriggers,Actor* ignore){return physicsQuery("physicsBoxCast",{{"start",start},{"end",end},{"extent",extent},{"rotation",rotation}},dimension,mask,includeTriggers,ignore).get<HitResult>();}
inline std::vector<Actor*> physicsActors(const Json& values){std::vector<Actor*> actors;for(const auto& id:values)actors.push_back(bridgeActor(id));return actors;}
inline std::vector<Actor*> Physics::OverlapSphere(const Vec3& center,float radius,int dimension,int mask,bool includeTriggers,Actor* ignore){return physicsActors(physicsQuery("physicsOverlapSphere",{{"center",center},{"radius",radius}},dimension,mask,includeTriggers,ignore));}
inline std::vector<Actor*> Physics::OverlapBox(const Vec3& center,const Vec3& extent,const Vec3& rotation,int dimension,int mask,bool includeTriggers,Actor* ignore){return physicsActors(physicsQuery("physicsOverlapBox",{{"center",center},{"extent",extent},{"rotation",rotation}},dimension,mask,includeTriggers,ignore));}
inline HitResult Physics::ClosestPoint(const Vec3& point,int dimension,int mask,bool includeTriggers,Actor* ignore){return physicsQuery("physicsClosestPoint",{{"point",point}},dimension,mask,includeTriggers,ignore).get<HitResult>();}
inline Actor* bridgeParent(Actor* actor){auto* state=bridgeReadState(actor);return state&&state->contains("parent")&&!state->at("parent").get<std::string>().empty()?bridgeActor(state->at("parent")):nullptr;}
inline Vec3 bridgeRotate(Vec3 v,Vec3 r,bool inverse){float p[]={v.x,v.y,v.z},angles[]={r.x,r.y,r.z};for(int n=0;n<3;n++){const int axis=inverse?n:2-n,i=(axis+1)%3,j=(axis+2)%3;const float a=angles[axis]*0.017453292519943295f*(inverse?-1:1),x=p[i],y=p[j];p[i]=x*std::cos(a)-y*std::sin(a);p[j]=x*std::sin(a)+y*std::cos(a);}return {p[0],p[1],p[2]};}
inline Vec3 bridgeToWorld(Actor* actor,Vec3 value,int depth=0){if(!actor)return value;if(depth>64)throw std::runtime_error("parent hierarchy limit");const auto& t=actor->transform;value=bridgeRotate({value.x*t.scale.x,value.y*t.scale.y,value.z*t.scale.z},t.rotation,false);value={value.x+t.position.x,value.y+t.position.y,value.z+t.position.z};return bridgeToWorld(bridgeParent(actor),value,depth+1);}
inline Vec3 bridgeFromWorld(Actor* actor,Vec3 value,int depth=0){if(!actor)return value;if(depth>64)throw std::runtime_error("parent hierarchy limit");value=bridgeFromWorld(bridgeParent(actor),value,depth+1);const auto& t=actor->transform;value=bridgeRotate({value.x-t.position.x,value.y-t.position.y,value.z-t.position.z},t.rotation,true);if(t.scale.x==0||t.scale.y==0||t.scale.z==0)throw std::runtime_error("zero parent scale");return {value.x/t.scale.x,value.y/t.scale.y,value.z/t.scale.z};}
inline void Scene::Open(const std::string& scene){engineCommand("openScene",{{"scene",scene}});}
inline bool bridgeFindableActor(const Json& state,bool includeInactive){const auto kind=state.value("kind",std::string{});return kind!="widget"&&kind!="component"&&!state.value("destroying",false)&&(includeInactive||state.value("poolActive",true));}
inline std::vector<Actor*> Scene::GetAllActorsOfClass(const std::string& className,bool includeInactive){std::vector<Actor*> found;if(className.empty())return found;if(className.size()>1000)throw std::runtime_error("actor class name limit");for(const auto& state:bridgeWorldData){if(!bridgeFindableActor(state,includeInactive))continue;const auto classes=state.value("actorClasses",Json::array());const bool matches=std::find(classes.begin(),classes.end(),Json(className))!=classes.end()||state.value("nativeClass",std::string{})==className||(className=="Actor"&&classes.empty());if(matches)found.push_back(bridgeActor(state.at("id")));}return found;}
inline std::vector<Actor*> Scene::GetActorsWithTag(const std::string& tag,bool includeInactive){std::vector<Actor*> found;if(tag.empty())return found;if(tag.size()>1000)throw std::runtime_error("actor tag limit");for(const auto& state:bridgeWorldData)if(bridgeFindableActor(state,includeInactive)){const auto tags=state.value("tags",Json::array());if(std::find(tags.begin(),tags.end(),Json(tag))!=tags.end())found.push_back(bridgeActor(state.at("id")));}return found;}
inline Actor* Scene::FindActorById(const std::string& id,bool includeInactive){if(id.size()>1000)throw std::runtime_error("actor id limit");const auto found=bridgeStateIndices.find(id);if(found==bridgeStateIndices.end()||!bridgeFindableActor(bridgeWorldData.at(found->second),includeInactive))return nullptr;return bridgeActor(Json(id));}
inline Vec3 Scene::GetWorldPosition(Actor* target){if(!target)throw std::runtime_error("null actor");return bridgeToWorld(target,{});}
inline void Scene::SetWorldPosition(Actor* target,const Vec3& position){if(!target)throw std::runtime_error("null actor");target->transform.position=bridgeFromWorld(bridgeParent(target),position);engineCommand("setWorldPosition",{{"target",bridgeId(target)},{"position",position}});}
inline Vec3 Scene::GetLocalPosition(Actor* target){return GetPosition(target);}
inline void Scene::SetLocalPosition(Actor* target,const Vec3& position){SetPosition(target,position);engineCommand("setLocalPosition",{{"target",bridgeId(target)},{"position",position}});}

inline Json& bridgeTilemap(Actor* target){auto* state=bridgeState(target);if(!state||!state->contains("runtimeTilemap"))throw std::runtime_error("TilemapRenderer asset must be initialized");return state->at("runtimeTilemap");}
inline Json& bridgeTileLayer(Json& map,const std::string& layer){for(auto& value:map.at("layers"))if(value.at("id")==layer)return value;throw std::runtime_error("missing tile layer");}
inline bool bridgeTileCell(const Json& map,const Vec2& cell){return std::isfinite(cell.x)&&std::isfinite(cell.y)&&cell.x==std::floor(cell.x)&&cell.y==std::floor(cell.y)&&cell.x>=0&&cell.y>=0&&cell.x<map.at("width").get<int>()&&cell.y<map.at("height").get<int>();}
inline int Tilemaps::GetTile(Actor* target,const std::string& layer,const Vec2& cell){auto& map=bridgeTilemap(target);auto& values=bridgeTileLayer(map,layer).at("tiles");if(!bridgeTileCell(map,cell))return -1;for(const auto& t:values)if(t.at("x")==cell.x&&t.at("y")==cell.y)return t.at("index").get<int>();return -1;}
inline bool Tilemaps::HasTile(Actor* target,const std::string& layer,const Vec2& cell){return GetTile(target,layer,cell)>=0;}
inline void bridgeSetTile(Json& tiles,int x,int y,int index){for(auto it=tiles.begin();it!=tiles.end();++it)if(it->at("x")==x&&it->at("y")==y){if(index<0)tiles.erase(it);else (*it)["index"]=index;return;}if(index>=0)tiles.push_back({{"x",x},{"y",y},{"index",index}});}
inline void bridgeTileDirty(Actor* target){(*bridgeState(target))["tilemapDirty"]=true;}
inline void Tilemaps::SetTile(Actor* target,const std::string& layer,const Vec2& cell,int index){auto& map=bridgeTilemap(target);auto& tiles=bridgeTileLayer(map,layer).at("tiles");if(!bridgeTileCell(map,cell)||index< -1||index>1048575)throw std::runtime_error("invalid tile cell or index");engineCommand("tileSet",{{"target",bridgeId(target)},{"layer",layer},{"cell",cell},{"index",index}});if(GetTile(target,layer,cell)!=index){bridgeSetTile(tiles,static_cast<int>(cell.x),static_cast<int>(cell.y),index);bridgeTileDirty(target);}}
inline void Tilemaps::SetTiles(Actor* target,const std::string& layer,const std::vector<Vec2>& cells,const std::vector<int>& indices){
    auto& map=bridgeTilemap(target);auto& tiles=bridgeTileLayer(map,layer).at("tiles");
    if(cells.size()!=indices.size()||cells.size()>65536)throw std::runtime_error("tile batch size limit");
    for(size_t i=0;i<cells.size();i++)if(!bridgeTileCell(map,cells[i])||indices[i]<-1||indices[i]>1048575)throw std::runtime_error("invalid tile batch cell or index");
    if(cells.empty())return;
    const int width=map.at("width");std::unordered_map<int,size_t> positions;positions.reserve(tiles.size()+cells.size());
    for(size_t i=0;i<tiles.size();i++)positions[tiles.at(i).at("y").get<int>()*width+tiles.at(i).at("x").get<int>()]=i;
    auto next=tiles;for(size_t i=0;i<cells.size();i++){const int x=static_cast<int>(cells[i].x),y=static_cast<int>(cells[i].y),key=y*width+x;const auto found=positions.find(key);if(found!=positions.end())next.at(found->second)["index"]=indices[i];else{positions[key]=next.size();next.push_back({{"x",x},{"y",y},{"index",indices[i]}});}}
    Json compact=Json::array();for(auto& tile:next)if(tile.at("index").get<int>()>=0)compact.push_back(std::move(tile));
    engineCommand("tileSetMany",{{"target",bridgeId(target)},{"layer",layer},{"cells",cells},{"indices",indices}});
    if(compact!=tiles){tiles=std::move(compact);bridgeTileDirty(target);}
}
inline std::vector<int> bridgeTileGrid(const Json& map,const Json& tiles){const int width=map.at("width"),height=map.at("height");std::vector<int> grid(width*height,-1);for(const auto& t:tiles)grid.at(t.at("y").get<int>()*width+t.at("x").get<int>())=t.at("index");return grid;}
inline void bridgeTileGridApply(Json& tiles,const std::vector<int>& grid,int width){tiles=Json::array();for(size_t at=0;at<grid.size();at++)if(grid[at]>=0)tiles.push_back({{"x",at%width},{"y",at/width},{"index",grid[at]}});}
inline void Tilemaps::BoxFill(Actor* target,const std::string& layer,const Vec2& cell,const Vec2& end,int index){auto& map=bridgeTilemap(target);auto& tiles=bridgeTileLayer(map,layer).at("tiles");if(!bridgeTileCell(map,cell)||!bridgeTileCell(map,end)||index< -1||index>1048575)throw std::runtime_error("invalid tile bounds or index");engineCommand("tileBoxFill",{{"target",bridgeId(target)},{"layer",layer},{"cell",cell},{"end",end},{"index",index}});const int width=map.at("width");auto grid=bridgeTileGrid(map,tiles);bool changed=false;for(int y=static_cast<int>(std::min(cell.y,end.y));y<=std::max(cell.y,end.y);y++)for(int x=static_cast<int>(std::min(cell.x,end.x));x<=std::max(cell.x,end.x);x++){auto& tile=grid[y*width+x];if(tile!=index){tile=index;changed=true;}}if(changed){bridgeTileGridApply(tiles,grid,width);bridgeTileDirty(target);}}
inline void Tilemaps::FloodFill(Actor* target,const std::string& layer,const Vec2& cell,int index){auto& map=bridgeTilemap(target);auto& tiles=bridgeTileLayer(map,layer).at("tiles");if(!bridgeTileCell(map,cell)||index< -1||index>1048575)throw std::runtime_error("invalid flood fill");engineCommand("tileFloodFill",{{"target",bridgeId(target)},{"layer",layer},{"cell",cell},{"index",index}});const int width=map.at("width"),height=map.at("height"),source=GetTile(target,layer,cell);if(source==index)return;auto grid=bridgeTileGrid(map,tiles);std::vector<int> queue{static_cast<int>(cell.y)*width+static_cast<int>(cell.x)};std::vector<bool> visited(grid.size());visited[queue[0]]=true;for(size_t i=0;i<queue.size();i++){const int at=queue[i],x=at%width,y=at/width;if(grid[at]!=source)continue;grid[at]=index;for(int direction=0;direction<4;direction++){const int nx=x+(direction==0?-1:direction==1?1:0),ny=y+(direction==2?-1:direction==3?1:0);if(nx>=0&&ny>=0&&nx<width&&ny<height){const int n=ny*width+nx;if(!visited[n]){visited[n]=true;queue.push_back(n);}}}}bridgeTileGridApply(tiles,grid,width);bridgeTileDirty(target);}
inline void Tilemaps::ClearTiles(Actor* target,const std::string& layer){auto& tiles=bridgeTileLayer(bridgeTilemap(target),layer).at("tiles");engineCommand("tileClear",{{"target",bridgeId(target)},{"layer",layer}});if(!tiles.empty()){tiles=Json::array();bridgeTileDirty(target);}}
inline Vec2 Tilemaps::WorldToCell(Actor* target,const Vec3& position){const auto& map=bridgeTilemap(target);const auto& size=map.at("cellSize");const auto local=bridgeFromWorld(target,position);const float x=local.x/size.at(0).get<float>(),y=-local.y/size.at(1).get<float>();return map.value("layout",std::string("rectangular"))=="isometric"?Vec2{std::floor(x+y),std::floor(y-x)}:Vec2{std::floor(x),std::floor(y)};}
inline Vec3 Tilemaps::GetCellCenterWorld(Actor* target,const Vec2& cell){const auto& map=bridgeTilemap(target);const auto& size=map.at("cellSize");if(!std::isfinite(cell.x)||!std::isfinite(cell.y)||cell.x!=std::floor(cell.x)||cell.y!=std::floor(cell.y))throw std::runtime_error("invalid cell coordinate");const float x=cell.x+.5f,y=cell.y+.5f,w=size.at(0).get<float>(),h=size.at(1).get<float>();return bridgeToWorld(target,map.value("layout",std::string("rectangular"))=="isometric"?Vec3{(x-y)*w/2,-(x+y)*h/2,0}:Vec3{x*w,-y*h,0});}
inline void Tilemaps::RefreshTile(Actor* target,const std::string& layer,const Vec2& cell){auto& map=bridgeTilemap(target);bridgeTileLayer(map,layer);if(!bridgeTileCell(map,cell))throw std::runtime_error("invalid tile cell");engineCommand("tileRefresh",{{"target",bridgeId(target)},{"layer",layer},{"cell",cell}});bridgeTileDirty(target);}
inline void Tilemaps::ProcessTilemapChanges(Actor* target){bridgeTilemap(target);const auto args=Json{{"target",bridgeId(target)}};const auto colliders=engineQuery("tileProcessChanges",args);engineCommand("tileProcessChanges",args);auto* state=bridgeState(target);(*state)["tileColliders"]=colliders;(*state)["tilemapDirty"]=false;}
inline bool Tilemaps::HasTilemapChanges(Actor* target){bridgeTilemap(target);return bridgeState(target)->value("tilemapDirty",false);}
inline void Tilemaps::SetLayerVisible(Actor* target,const std::string& layer,bool visible){auto& value=bridgeTileLayer(bridgeTilemap(target),layer);engineCommand("tileLayerVisible",{{"target",bridgeId(target)},{"layer",layer},{"visible",visible}});if(value.at("visible")!=visible){value["visible"]=visible;bridgeTileDirty(target);}}

inline Json& gameplayField(Actor* target,const char* field){auto* state=bridgeState(target);if(!state)throw std::runtime_error("missing game object");return (*state)["gameplayDebug"][field];}
inline void UI::Show(Actor* target,const std::string& asset,const std::string& instance){engineCommand("uiShow",{{"target",bridgeId(target)},{"asset",asset},{"instance",instance}});}
inline void UI::Remove(Actor* target,const std::string& instance){engineCommand("uiRemove",{{"target",bridgeId(target)},{"instance",instance}});auto& ui=gameplayField(target,"ui");if(ui.is_object())ui.erase(instance);}
inline Json& bridgeWidget(Actor* target,const std::string& instance,const std::string& element){return gameplayField(target,"ui").at(instance).at(element);}
inline void UI::SetText(Actor* target,const std::string& instance,const std::string& element,const std::string& text){engineCommand("uiSetText",{{"target",bridgeId(target)},{"instance",instance},{"element",element},{"text",text}});auto& ui=gameplayField(target,"ui");if(ui.contains(instance)&&ui.at(instance).contains(element))ui[instance][element]["text"]=text;}
inline std::string UI::GetText(Actor* target,const std::string& instance,const std::string& element){return bridgeWidget(target,instance,element).at("text").get<std::string>();}
inline void UI::SetValue(Actor* target,const std::string& instance,const std::string& element,float value){if(!std::isfinite(value))throw std::invalid_argument("invalid UI value");engineCommand("uiSetValue",{{"target",bridgeId(target)},{"instance",instance},{"element",element},{"value",value}});auto& ui=gameplayField(target,"ui");if(ui.contains(instance)&&ui.at(instance).contains(element)){auto& p=ui[instance][element];p["value"]=p.value("type",std::string{})=="CheckBox"?float(bool(value)):std::clamp(value,p.at("min").get<float>(),p.at("max").get<float>());p["checked"]=bool(value);}}
inline float UI::GetValue(Actor* target,const std::string& instance,const std::string& element){return bridgeWidget(target,instance,element).at("value").get<float>();}
inline void UI::SetVisible(Actor* target,const std::string& instance,const std::string& element,bool visible){engineCommand("uiSetVisible",{{"target",bridgeId(target)},{"instance",instance},{"element",element},{"visible",visible}});auto& ui=gameplayField(target,"ui");if(ui.contains(instance)&&ui.at(instance).contains(element))ui[instance][element]["visible"]=visible;}
inline void UI::SetEnabled(Actor* target,const std::string& instance,const std::string& element,bool enabled){engineCommand("uiSetEnabled",{{"target",bridgeId(target)},{"instance",instance},{"element",element},{"enabled",enabled}});auto& ui=gameplayField(target,"ui");if(ui.contains(instance)&&ui.at(instance).contains(element))ui[instance][element]["enabled"]=enabled;}
inline void UI::Focus(Actor* target,const std::string& instance,const std::string& element){engineCommand("uiFocus",{{"target",bridgeId(target)},{"instance",instance},{"element",element}});}
inline void AudioMixer::SetFloat(Actor* target,const std::string& asset,const std::string& parameter,float value){engineCommand("mixerSet",{{"target",bridgeId(target)},{"asset",asset},{"parameter",parameter},{"value",value}});gameplayField(target,"audioMixers")[asset][parameter]=value;}
inline float AudioMixer::GetFloat(Actor* target,const std::string& asset,const std::string& parameter){return gameplayField(target,"audioMixers").at(asset).at(parameter).get<float>();}
inline void AudioMixer::ClearFloat(Actor* target,const std::string& asset,const std::string& parameter){engineCommand("mixerClear",{{"target",bridgeId(target)},{"asset",asset},{"parameter",parameter}});}
inline void AudioMixer::TransitionTo(Actor* target,const std::string& asset,const std::string& snapshot,float duration){engineCommand("mixerSnapshot",{{"target",bridgeId(target)},{"asset",asset},{"snapshot",snapshot},{"duration",duration}});}
inline void AI::RunBehaviorTree(Actor* target,const std::string& asset){engineCommand("runBehaviorTree",{{"target",bridgeId(target)},{"asset",asset}});}
inline void AI::StopBehaviorTree(Actor* target){engineCommand("stopBehaviorTree",{{"target",bridgeId(target)}});}
inline std::string AI::GetTaskHandle(Actor* target,const std::string& node){auto& behavior=gameplayField(target,"behavior");if(behavior.is_object()&&behavior.contains("tasks"))for(const auto& task:behavior["tasks"])if(task.value("id",std::string{})==node||task.value("sourceNode",std::string{})==node||task.value("name",std::string{})==node)return task.value("handle",std::string{});return {};}
inline void AI::FinishTask(Actor* target,const std::string& task,bool success){engineCommand("behaviorTaskFinish",{{"target",bridgeId(target)},{"task",task},{"success",success}});}
inline void Blackboard::SetBool(Actor* target,const std::string& key,bool value){engineCommand("blackboardSetBool",{{"target",bridgeId(target)},{"key",key},{"value",value}});gameplayField(target,"blackboard")[key]=Json(value);}
inline bool Blackboard::GetBool(Actor* target,const std::string& key){return gameplayField(target,"blackboard").at(key).get<bool>();}
inline void Blackboard::SetFloat(Actor* target,const std::string& key,float value){engineCommand("blackboardSetFloat",{{"target",bridgeId(target)},{"key",key},{"value",value}});gameplayField(target,"blackboard")[key]=Json(value);}
inline float Blackboard::GetFloat(Actor* target,const std::string& key){return gameplayField(target,"blackboard").at(key).get<float>();}
inline void Blackboard::SetInt(Actor* target,const std::string& key,int value){engineCommand("blackboardSetInt",{{"target",bridgeId(target)},{"key",key},{"value",value}});gameplayField(target,"blackboard")[key]=Json(value);}
inline int Blackboard::GetInt(Actor* target,const std::string& key){return gameplayField(target,"blackboard").at(key).get<int>();}
inline void Blackboard::SetString(Actor* target,const std::string& key,const std::string& value){engineCommand("blackboardSetString",{{"target",bridgeId(target)},{"key",key},{"value",value}});gameplayField(target,"blackboard")[key]=Json(value);}
inline std::string Blackboard::GetString(Actor* target,const std::string& key){return gameplayField(target,"blackboard").at(key).get<std::string>();}
inline void Blackboard::SetVector(Actor* target,const std::string& key,const Vec3& value){engineCommand("blackboardSetVector",{{"target",bridgeId(target)},{"key",key},{"value",value}});gameplayField(target,"blackboard")[key]=Json(value);}
inline Vec3 Blackboard::GetVector(Actor* target,const std::string& key){return gameplayField(target,"blackboard").at(key).get<Vec3>();}
inline void Blackboard::SetObject(Actor* target,const std::string& key,Actor* value){engineCommand("blackboardSetObject",{{"target",bridgeId(target)},{"key",key},{"value",bridgeId(value)}});gameplayField(target,"blackboard")[key]=bridgeId(value);}
inline Actor* Blackboard::GetObject(Actor* target,const std::string& key){return bridgeActor(gameplayField(target,"blackboard").at(key));}
inline void Blackboard::Clear(Actor* target,const std::string& key){engineCommand("blackboardClear",{{"target",bridgeId(target)},{"key",key}});}
inline void States::Start(Actor* target,const std::string& asset){engineCommand("startStateMachine",{{"target",bridgeId(target)},{"asset",asset}});}
inline std::string States::GetState(Actor* target){return gameplayField(target,"state").get<std::string>();}
inline bool States::IsInState(Actor* target,const std::string& name){auto& state=gameplayField(target,"stateMachine");if(!state.is_object()||!state.value("active",Json::array()).is_array())return false;for(const auto& s:state["active"])if(s.value("id",std::string{})==name||s.value("name",std::string{})==name)return true;return false;}
inline std::vector<std::string> States::GetPath(Actor* target){std::vector<std::string> result;auto& state=gameplayField(target,"stateMachine");if(state.is_object()&&state.contains("active"))for(const auto& s:state["active"])result.push_back(s.at("name").get<std::string>());return result;}
inline float States::GetElapsed(Actor* target){auto& state=gameplayField(target,"stateMachine");return state.is_object()?state.value("elapsed",0.0f):0.0f;}
inline void States::SendEvent(Actor* target,const std::string& event){engineCommand("stateEvent",{{"target",bridgeId(target)},{"event",event}});}
inline void States::Jump(Actor* target,const std::string& state){engineCommand("stateJump",{{"target",bridgeId(target)},{"state",state}});}
inline void States::Stop(Actor* target){engineCommand("stateStop",{{"target",bridgeId(target)}});}
inline void States::SetFloat(Actor* target,const std::string& key,float value){engineCommand("stateSetFloat",{{"target",bridgeId(target)},{"key",key},{"value",value}});}
inline void States::SetBool(Actor* target,const std::string& key,bool value){engineCommand("stateSetBool",{{"target",bridgeId(target)},{"key",key},{"value",value}});}
inline void States::SetString(Actor* target,const std::string& key,const std::string& value){engineCommand("stateSetString",{{"target",bridgeId(target)},{"key",key},{"value",value}});}
inline void Montage::Play(Actor* target,const std::string& asset,const std::string& section){engineCommand("playMontage",{{"target",bridgeId(target)},{"asset",asset},{"section",section}});}
inline void Montage::Stop(Actor* target,float blendTime){engineCommand("montageStop",{{"target",bridgeId(target)},{"blendTime",blendTime}});}
inline void AnimationGraph::Play(Actor* target,const std::string& asset){engineCommand("animGraphPlay",{{"target",bridgeId(target)},{"asset",asset}});}
inline void AnimationGraph::Stop(Actor* target){engineCommand("animGraphStop",{{"target",bridgeId(target)}});}
inline void AnimationGraph::Pause(Actor* target,bool paused){engineCommand("animGraphPause",{{"target",bridgeId(target)},{"paused",paused}});}
inline void AnimationGraph::SetFloat(Actor* target,const std::string& key,float value){engineCommand("animGraphSetFloat",{{"target",bridgeId(target)},{"key",key},{"value",value}});gameplayField(target,"animationGraph")["parameters"][key]=Json(value);}
inline void AnimationGraph::SetBool(Actor* target,const std::string& key,bool value){engineCommand("animGraphSetBool",{{"target",bridgeId(target)},{"key",key},{"value",value}});gameplayField(target,"animationGraph")["parameters"][key]=Json(value);}
inline float AnimationGraph::GetFloat(Actor* target,const std::string& key){return gameplayField(target,"animationGraph").at("parameters").at(key).get<float>();}
inline bool AnimationGraph::GetBool(Actor* target,const std::string& key){return gameplayField(target,"animationGraph").at("parameters").at(key).get<bool>();}
inline void AnimationGraph::SetInteger(Actor* target,const std::string& key,int value){engineCommand("animGraphSetInt",{{"target",bridgeId(target)},{"key",key},{"value",value}});gameplayField(target,"animationGraph")["parameters"][key]=Json(value);}
inline int AnimationGraph::GetInteger(Actor* target,const std::string& key){return gameplayField(target,"animationGraph").at("parameters").at(key).get<int>();}
inline void AnimationGraph::SetTrigger(Actor* target,const std::string& key){engineCommand("animGraphSetTrigger",{{"target",bridgeId(target)},{"key",key}});gameplayField(target,"animationGraph")["parameters"][key]=Json(true);}
inline void AnimationGraph::ResetTrigger(Actor* target,const std::string& key){engineCommand("animGraphResetTrigger",{{"target",bridgeId(target)},{"key",key}});gameplayField(target,"animationGraph")["parameters"][key]=Json(false);}
inline Json& bridgeAnimationMachine(Actor* target,const std::string& machine){auto& list=gameplayField(target,"animationGraph").at("machines");for(auto& m:list)if(m.at("key")==machine)return m;Json* found=nullptr;for(auto& m:list)if(m.at("id")==machine||m.at("name")==machine){if(found)throw std::runtime_error("ambiguous animation machine; use key");found=&m;}if(!found)throw std::runtime_error("missing animation machine");return *found;}
inline void AnimationGraph::CrossFade(Actor* target,const std::string& machine,const std::string& state,float duration,float offset){engineCommand("animGraphCrossFade",{{"target",bridgeId(target)},{"machine",machine},{"state",state},{"duration",duration},{"offset",offset}});}
inline std::string AnimationGraph::GetState(Actor* target,const std::string& machine){return bridgeAnimationMachine(target,machine).at("stateName").get<std::string>();}
inline std::string AnimationGraph::GetNextState(Actor* target,const std::string& machine){return bridgeAnimationMachine(target,machine).at("nextName").get<std::string>();}
inline float AnimationGraph::GetStateTime(Actor* target,const std::string& machine){return bridgeAnimationMachine(target,machine).at("time").get<float>();}
inline float AnimationGraph::GetNormalizedTime(Actor* target,const std::string& machine){return bridgeAnimationMachine(target,machine).at("normalized").get<float>();}
inline float AnimationGraph::GetStateWeight(Actor* target,const std::string& machine,const std::string& state){for(const auto& s:bridgeAnimationMachine(target,machine).at("states"))if(s.at("id")==state||s.at("name")==state)return s.at("weight").get<float>();throw std::runtime_error("missing animation state");}
inline bool AnimationGraph::IsTransitioning(Actor* target,const std::string& machine){return !bridgeAnimationMachine(target,machine).at("transition").is_null();}
inline float AnimationGraph::GetTransitionProgress(Actor* target,const std::string& machine){const auto& t=bridgeAnimationMachine(target,machine).at("transition");return t.is_null()?0:t.at("progress").get<float>();}
inline Json& bridgeAnimationSync(Actor* target,const std::string& group){for(auto& g:gameplayField(target,"animationGraph").at("syncGroups"))if(g.at("name")==group)return g;throw std::runtime_error("missing active animation sync group");}
inline std::string AnimationGraph::GetSyncLeader(Actor* target,const std::string& group){return bridgeAnimationSync(target,group).at("leader").at("id").get<std::string>();}
inline float AnimationGraph::GetSyncPhase(Actor* target,const std::string& group){return bridgeAnimationSync(target,group).at("phase").get<float>();}
inline std::string AnimationGraph::GetSyncMode(Actor* target,const std::string& group){return bridgeAnimationSync(target,group).at("method").get<std::string>();}
inline Json& bridgeSkinBone(Actor* target,const std::string& bone){for(auto& value:gameplayField(target,"spriteSkin").at("bones"))if(value.at("id")==bone||value.at("name")==bone)return value;throw std::runtime_error("missing sprite skin bone");}
inline void SpriteSkin::SetBonePosition(Actor* target,const std::string& bone,const Vec2& value){engineCommand("skinSetPosition",{{"target",bridgeId(target)},{"bone",bone},{"value",value}});bridgeSkinBone(target,bone)["position"]=Json(value);}
inline Vec2 SpriteSkin::GetBonePosition(Actor* target,const std::string& bone){return bridgeSkinBone(target,bone).at("position").get<Vec2>();}
inline void SpriteSkin::SetBoneRotation(Actor* target,const std::string& bone,float value){engineCommand("skinSetRotation",{{"target",bridgeId(target)},{"bone",bone},{"value",value}});bridgeSkinBone(target,bone)["rotation"]=Json(value);}
inline float SpriteSkin::GetBoneRotation(Actor* target,const std::string& bone){return bridgeSkinBone(target,bone).at("rotation").get<float>();}
inline void SpriteSkin::SetBoneScale(Actor* target,const std::string& bone,const Vec2& value){engineCommand("skinSetScale",{{"target",bridgeId(target)},{"bone",bone},{"value",value}});bridgeSkinBone(target,bone)["scale"]=Json(value);}
inline Vec2 SpriteSkin::GetBoneScale(Actor* target,const std::string& bone){return bridgeSkinBone(target,bone).at("scale").get<Vec2>();}
inline void SpriteSkin::ResetBindPose(Actor* target){engineCommand("skinReset",{{"target",bridgeId(target)}});}
inline Json& bridgeIKSolver(Actor* target,const std::string& solver){for(auto& value:gameplayField(target,"spriteSkin").at("ik").at("solvers"))if(value.at("id")==solver||value.at("name")==solver)return value;throw std::runtime_error("missing 2D IK solver");}
inline void IK2D::SetTarget(Actor* target,const std::string& solver,const Vec2& value){engineCommand("ik2dSetTarget",{{"target",bridgeId(target)},{"solver",solver},{"value",value}});auto& state=bridgeIKSolver(target,solver);state["target"]=Json(value);state["targetActor"]=Json("");}
inline Vec2 IK2D::GetTarget(Actor* target,const std::string& solver){return bridgeIKSolver(target,solver).at("target").get<Vec2>();}
inline void IK2D::SetTargetRotation(Actor* target,const std::string& solver,float value){engineCommand("ik2dSetRotation",{{"target",bridgeId(target)},{"solver",solver},{"value",value}});auto& state=bridgeIKSolver(target,solver);state["targetRotation"]=Json(value);state["targetActor"]=Json("");}
inline float IK2D::GetTargetRotation(Actor* target,const std::string& solver){return bridgeIKSolver(target,solver).at("targetRotation").get<float>();}
inline void IK2D::SetTargetActor(Actor* target,const std::string& solver,Actor* actor,const Vec2& offset){engineCommand("ik2dBindTarget",{{"target",bridgeId(target)},{"solver",solver},{"actor",bridgeId(actor)},{"offset",offset}});bridgeIKSolver(target,solver)["targetActor"]=Json(bridgeId(actor));}
inline void IK2D::ClearTargetActor(Actor* target,const std::string& solver){engineCommand("ik2dClearTarget",{{"target",bridgeId(target)},{"solver",solver}});bridgeIKSolver(target,solver)["targetActor"]=Json("");}
inline void IK2D::SetWeight(Actor* target,const std::string& solver,float value){engineCommand("ik2dSetWeight",{{"target",bridgeId(target)},{"solver",solver},{"value",value}});bridgeIKSolver(target,solver)["weight"]=Json(value);}
inline float IK2D::GetWeight(Actor* target,const std::string& solver){return bridgeIKSolver(target,solver).at("weight").get<float>();}
inline void IK2D::SetEnabled(Actor* target,const std::string& solver,bool value){engineCommand("ik2dSetEnabled",{{"target",bridgeId(target)},{"solver",solver},{"value",value}});bridgeIKSolver(target,solver)["enabled"]=Json(value);}
inline bool IK2D::IsEnabled(Actor* target,const std::string& solver){return bridgeIKSolver(target,solver).at("enabled").get<bool>();}
inline void IK2D::SetMasterWeight(Actor* target,float value){engineCommand("ik2dSetMasterWeight",{{"target",bridgeId(target)},{"value",value}});gameplayField(target,"spriteSkin")["ik"]["weight"]=Json(value);}
inline float IK2D::GetMasterWeight(Actor* target){return gameplayField(target,"spriteSkin").at("ik").at("weight").get<float>();}
inline void Montage::Pause(Actor* target,bool paused){engineCommand("montagePause",{{"target",bridgeId(target)},{"paused",paused}});}
inline void Montage::JumpToSection(Actor* target,const std::string& section){engineCommand("montageJump",{{"target",bridgeId(target)},{"section",section}});}
inline void Montage::SetNextSection(Actor* target,const std::string& section,const std::string& next){engineCommand("montageNext",{{"target",bridgeId(target)},{"section",section},{"next",next}});}
inline float Montage::GetPosition(Actor* target){auto& state=gameplayField(target,"montage");return state.is_null()?0.0f:state.at("time").get<float>();}
inline void Montage::Seek(Actor* target,float time){engineCommand("montageSeek",{{"target",bridgeId(target)},{"time",time}});}
inline void Montage::StopGroup(Actor* target,const std::string& group,float blendTime){engineCommand("montageStopGroup",{{"target",bridgeId(target)},{"group",group},{"blendTime",blendTime}});}
inline void Montage::PauseGroup(Actor* target,const std::string& group,bool paused){engineCommand("montagePauseGroup",{{"target",bridgeId(target)},{"group",group},{"paused",paused}});}
inline void Montage::SeekGroup(Actor* target,const std::string& group,float time){engineCommand("montageSeekGroup",{{"target",bridgeId(target)},{"group",group},{"time",time}});}
inline const Json* bridgeMontageGroup(Actor* target,const std::string& group){auto& states=gameplayField(target,"montageGroups");if(states.is_array())for(auto& s:states)if(s.at("group").get<std::string>()==group)return &s;return nullptr;}
inline float Montage::GetGroupPosition(Actor* target,const std::string& group){const auto* s=bridgeMontageGroup(target,group);return s?s->at("time").get<float>():0.0f;}
inline float Montage::GetGroupWeight(Actor* target,const std::string& group){const auto* s=bridgeMontageGroup(target,group);return s?s->at("weight").get<float>():0.0f;}
inline bool Montage::IsGroupPlaying(Actor* target,const std::string& group){return bridgeMontageGroup(target,group)!=nullptr;}
inline void LevelSequence::Play(Actor* target,const std::string& asset){engineCommand("playSequence",{{"target",bridgeId(target)},{"asset",asset}});}
inline void LevelSequence::Stop(Actor* target){engineCommand("sequenceStop",{{"target",bridgeId(target)}});}
inline void LevelSequence::Pause(Actor* target,bool paused){engineCommand("sequencePause",{{"target",bridgeId(target)},{"paused",paused}});}
inline void LevelSequence::Seek(Actor* target,float time){engineCommand("sequenceSeek",{{"target",bridgeId(target)},{"time",time}});}
inline float LevelSequence::GetPosition(Actor* target){auto& state=gameplayField(target,"sequence");return state.is_null()?0.0f:state.at("time").get<float>();}
inline void Navigation::MoveTo(Actor* target,const Vec3& destination){engineCommand("navigationMove",{{"target",bridgeId(target)},{"destination",destination}});}
inline void Navigation::Stop(Actor* target){engineCommand("navigationStop",{{"target",bridgeId(target)}});}
inline std::string Navigation::GetStatus(Actor* target){auto& state=gameplayField(target,"navigation");return state.is_null()?"idle":state.value("status",std::string{"idle"});}
inline std::vector<Vec3> Navigation::GetPath(Actor* target){auto& state=gameplayField(target,"navigation");return state.is_null()?std::vector<Vec3>{}:state.value("path",std::vector<Vec3>{});}
inline std::vector<Actor*> Perception::GetTargets(Actor* target){std::vector<Actor*> result;auto& states=gameplayField(target,"perception");if(states.is_array())for(const auto& state:states)if(state.value("sensed",false))result.push_back(bridgeActor(state.at("id")));return result;}
inline void Perception::Forget(Actor* target){engineCommand("perceptionForget",{{"target",bridgeId(target)}});gameplayField(target,"perception")=Json::array();}
inline void Perception::ReportNoise(Actor* target,const Vec3& position,float loudness,float radius,const std::string& tag){engineCommand("reportNoise",{{"target",bridgeId(target)},{"position",position},{"loudness",loudness},{"radius",radius},{"tag",tag}});}
inline void particleCommand(Actor* target,const char* key,const Json& args){auto& state=gameplayField(target,"particles");if(state.is_object()&&state.value("backend",std::string{}).find("WebGPU")==0)engineQuery(key,args);else engineCommand(key,args);}
inline void Particles::Play(Actor* target){particleCommand(target,"particlePlay",{{"target",bridgeId(target)}});}
inline void Particles::Stop(Actor* target,bool clear){particleCommand(target,"particleStop",{{"target",bridgeId(target)},{"clear",clear}});}
inline void Particles::Pause(Actor* target,bool paused){particleCommand(target,"particlePause",{{"target",bridgeId(target)},{"paused",paused}});}
inline void Particles::Emit(Actor* target,int count){particleCommand(target,"particleEmit",{{"target",bridgeId(target)},{"count",count}});}
inline int Particles::GetCount(Actor* target){auto& state=gameplayField(target,"particles");return state.is_null()?0:state.value("backend",std::string{}).find("WebGPU")==0?engineQuery("particleCount",{{"target",bridgeId(target)}}).get<int>():state.value("count",0);}
inline Json& bridgeTags(Actor* target){auto* state=bridgeStateFields(target,{"tags"});if(!state)throw std::runtime_error("missing tag target");auto& tags=(*state)["tags"];if(tags.is_null())tags=Json::array();return tags;}
inline std::vector<std::string> Tags::Get(Actor* target){return bridgeTags(target).get<std::vector<std::string>>();}
inline void Tags::Add(Actor* target,const std::string& tag){engineCommand("tagAdd",{{"target",bridgeId(target)},{"tag",tag}});auto& tags=bridgeTags(target);if(std::find(tags.begin(),tags.end(),Json(tag))==tags.end())tags.push_back(tag);}
inline void Tags::Remove(Actor* target,const std::string& tag){engineCommand("tagRemove",{{"target",bridgeId(target)},{"tag",tag}});auto& tags=bridgeTags(target);tags.erase(std::remove(tags.begin(),tags.end(),Json(tag)),tags.end());}
inline bool Tags::Has(Actor* target,const std::string& tag,bool exact){for(const auto& value:Tags::Get(target))if(value==tag||(!exact&&value.rfind(tag+".",0)==0))return true;return false;}
inline bool Tags::HasAny(Actor* target,const std::vector<std::string>& tags,bool exact){for(const auto& tag:tags)if(Has(target,tag,exact))return true;return false;}
inline bool Tags::HasAll(Actor* target,const std::vector<std::string>& tags,bool exact){for(const auto& tag:tags)if(!Has(target,tag,exact))return false;return true;}
inline bool bridgeTagQuery(Actor* target,const Json& query,int depth,int& budget){if(--budget<0||depth>16||!query.is_object())throw std::runtime_error("tag query bounds");if(!query.value("tags",Json::array()).is_array()||!query.value("queries",Json::array()).is_array()||query.value("tags",Json::array()).size()>32||query.value("queries",Json::array()).size()>32)throw std::runtime_error("tag query shape");const auto op=query.at("op").get<std::string>();if(op!="any"&&op!="all"&&op!="none")throw std::runtime_error("tag query operator");std::vector<bool> results;for(const auto& tag:query.value("tags",Json::array()))results.push_back(Tags::Has(target,tag.get<std::string>(),query.value("exact",false)));for(const auto& child:query.value("queries",Json::array()))results.push_back(bridgeTagQuery(target,child,depth+1,budget));const bool any=std::any_of(results.begin(),results.end(),[](bool v){return v;}),all=std::all_of(results.begin(),results.end(),[](bool v){return v;});return op=="all"?all:op=="none"?!any:any;}
inline bool Tags::MatchesQuery(Actor* target,const std::string& query){int budget=256;return bridgeTagQuery(target,Json::parse(query),0,budget);}
}
#include <HBEngine/Session.hpp>
