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
inline void to_json(Json& j,const HitResult& v){j={{"hit",v.hit},{"position",v.position},{"normal",v.normal},{"actor",bridgeId(v.actor)}};}
inline void from_json(const Json& j,HitResult& v){v.hit=j.at("hit").get<bool>();j.at("position").get_to(v.position);j.at("normal").get_to(v.normal);v.actor=bridgeActor(j.at("actor"));}
template<class T> inline Json bridgeValue(const T& v){if constexpr(std::is_pointer_v<T>){if constexpr(std::is_base_of_v<Actor,std::remove_pointer_t<T>>){return bridgeId(v);}else{if(!v)return nullptr;const auto* cell=dynamic_cast<const BridgeCell*>(v);for(const auto& c:bridgeCells)if(c.second.get()==cell)return c.first;throw std::runtime_error("unregistered C++ component pointer");}}else{return Json(v);}}
template<class T> inline Json bridgeValue(const std::vector<T>& values){Json result=Json::array();for(const auto& value:values)result.push_back(bridgeValue(value));return result;}
template<class T> inline std::vector<T*> bridgeObjectArray(const Json& values){std::vector<T*> result;for(const auto& value:values){auto* actor=bridgeActor(value);auto* typed=dynamic_cast<T*>(actor);if(actor&&!typed)throw std::runtime_error("C++ object array class mismatch");result.push_back(typed);}return result;}
inline void bridgeSync(const Json& objects){bridgeWorld=objects;std::unordered_set<std::string> ids;for(const auto& o:objects)ids.insert(o.at("id").get<std::string>());for(auto it=bridgeCells.begin();it!=bridgeCells.end();)if(!ids.count(it->first))it=bridgeCells.erase(it);else ++it;for(auto it=bridgeActors.begin();it!=bridgeActors.end();)if(!ids.count(it->first))it=bridgeActors.erase(it);else ++it;for(const auto& o:objects){Actor* a=bridgeActor(o.at("id"));if(a)a->transform=o.get<Transform>();auto c=bridgeCells.find(o.at("id").get<std::string>());if(c!=bridgeCells.end()&&o.contains("nativeProperties"))c->second->defaults(o.at("nativeProperties"));}}
inline Json bridgeSnapshot(){Json values=Json::array();for(const auto& c:bridgeCells){Json o={{"id",c.first},{"nativeProperties",c.second->properties()}};if(c.second->actor()){const auto& t=c.second->actor()->transform;o["position"]=t.position;o["rotation"]=t.rotation;o["scale"]=t.scale;}values.push_back(o);}for(const auto& c:bridgeActors){const auto& t=c.second->transform;values.push_back({{"id",c.first},{"position",t.position},{"rotation",t.rotation},{"scale",t.scale}});}return values;}
inline Json* bridgeState(Actor* actor){const auto id=bridgeId(actor);for(auto& state:bridgeWorld)if(state.at("id")==id)return &state;return nullptr;}
inline Actor* frameworkActor(const std::string& role){for(const auto& state:bridgeWorld)if(state.value("frameworkRole",std::string{})==role)return bridgeActor(state.at("id"));return nullptr;}
inline void engineCommand(const char* key,const Json& args){if(bridgeOperations.size()>=1000)throw std::runtime_error("engine operation limit");bridgeOperations.push_back({{"key",key},{"args",args}});}
inline Json engineQuery(const char* key,const Json& args){
    Json world=bridgeWorld;for(const auto& updated:bridgeSnapshot())for(auto& object:world)if(object.at("id")==updated.at("id"))object.update(updated);
    std::cout<<"HB_QUERY\t"<<Json{{"key",key},{"args",args},{"objects",world}}.dump()<<std::endl;
    std::string line;if(!std::getline(std::cin,line))throw std::runtime_error("engine query disconnected");const auto response=Json::parse(line);if(!response.value("ok",false))throw std::runtime_error(response.value("error",std::string("engine query failed")));return response.at("value");
}
inline Json physicsQuery(const char* key,Json args,int dimension,int mask,bool includeTriggers,Actor* ignore){args["dimension"]=dimension;args["mask"]=mask;args["includeTriggers"]=includeTriggers;args["ignore"]=bridgeId(ignore);return engineQuery(key,args);}
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
inline void Physics::SetCollisionEnabled(Actor* target,bool enabled){engineCommand("collisionEnabled",{{"target",bridgeId(target)},{"enabled",enabled}});if(auto* state=bridgeState(target))(*state)["collisionEnabled"]=enabled;}
inline Vec3 Physics::GetAngularVelocity(Actor* target){auto* s=bridgeState(target);return s&&s->contains("angularVelocity")?s->at("angularVelocity").get<Vec3>():Vec3{};}
inline void Physics::SetAngularVelocity(Actor* target,const Vec3& velocity){engineCommand("setAngularVelocity",{{"target",bridgeId(target)},{"velocity",velocity}});if(auto* s=bridgeState(target))(*s)["angularVelocity"]=velocity;}
inline float Physics::GetMass(Actor* target){auto* s=bridgeState(target);if(!s)throw std::runtime_error("missing rigidbody");return s->at("gameplayDebug").at("physics").at("mass").get<float>();}
inline bool Physics::IsSleeping(Actor* target){auto* s=bridgeState(target);if(!s)throw std::runtime_error("missing rigidbody");return s->at("gameplayDebug").at("physics").at("sleeping").get<bool>();}
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
inline Actor* bridgeParent(Actor* actor){auto* state=bridgeState(actor);return state&&state->contains("parent")&&!state->at("parent").get<std::string>().empty()?bridgeActor(state->at("parent")):nullptr;}
inline Vec3 bridgeRotate(Vec3 v,Vec3 r,bool inverse){float p[]={v.x,v.y,v.z},angles[]={r.x,r.y,r.z};for(int n=0;n<3;n++){const int axis=inverse?n:2-n,i=(axis+1)%3,j=(axis+2)%3;const float a=angles[axis]*0.017453292519943295f*(inverse?-1:1),x=p[i],y=p[j];p[i]=x*std::cos(a)-y*std::sin(a);p[j]=x*std::sin(a)+y*std::cos(a);}return {p[0],p[1],p[2]};}
inline Vec3 bridgeToWorld(Actor* actor,Vec3 value,int depth=0){if(!actor)return value;if(depth>64)throw std::runtime_error("parent hierarchy limit");const auto& t=actor->transform;value=bridgeRotate({value.x*t.scale.x,value.y*t.scale.y,value.z*t.scale.z},t.rotation,false);value={value.x+t.position.x,value.y+t.position.y,value.z+t.position.z};return bridgeToWorld(bridgeParent(actor),value,depth+1);}
inline Vec3 bridgeFromWorld(Actor* actor,Vec3 value,int depth=0){if(!actor)return value;if(depth>64)throw std::runtime_error("parent hierarchy limit");value=bridgeFromWorld(bridgeParent(actor),value,depth+1);const auto& t=actor->transform;value=bridgeRotate({value.x-t.position.x,value.y-t.position.y,value.z-t.position.z},t.rotation,true);if(t.scale.x==0||t.scale.y==0||t.scale.z==0)throw std::runtime_error("zero parent scale");return {value.x/t.scale.x,value.y/t.scale.y,value.z/t.scale.z};}
inline void Scene::Open(const std::string& scene){engineCommand("openScene",{{"scene",scene}});}
inline Vec3 Scene::GetWorldPosition(Actor* target){if(!target)throw std::runtime_error("null actor");return bridgeToWorld(target,{});}
inline void Scene::SetWorldPosition(Actor* target,const Vec3& position){if(!target)throw std::runtime_error("null actor");target->transform.position=bridgeFromWorld(bridgeParent(target),position);engineCommand("setWorldPosition",{{"target",bridgeId(target)},{"position",position}});}
inline Vec3 Scene::GetLocalPosition(Actor* target){return GetPosition(target);}
inline void Scene::SetLocalPosition(Actor* target,const Vec3& position){SetPosition(target,position);engineCommand("setLocalPosition",{{"target",bridgeId(target)},{"position",position}});}

inline Json& gameplayField(Actor* target,const char* field){auto* state=bridgeState(target);if(!state)throw std::runtime_error("missing game object");return (*state)["gameplayDebug"][field];}
inline void UI::Show(Actor* target,const std::string& asset,const std::string& instance){engineCommand("uiShow",{{"target",bridgeId(target)},{"asset",asset},{"instance",instance}});}
inline void UI::Remove(Actor* target,const std::string& instance){engineCommand("uiRemove",{{"target",bridgeId(target)},{"instance",instance}});auto& ui=gameplayField(target,"ui");if(ui.is_object())ui.erase(instance);}
inline Json& bridgeWidget(Actor* target,const std::string& instance,const std::string& element){return gameplayField(target,"ui").at(instance).at(element);}
inline void UI::SetText(Actor* target,const std::string& instance,const std::string& element,const std::string& text){engineCommand("uiSetText",{{"target",bridgeId(target)},{"instance",instance},{"element",element},{"text",text}});auto& ui=gameplayField(target,"ui");if(ui.contains(instance)&&ui.at(instance).contains(element))ui[instance][element]["text"]=text;}
inline std::string UI::GetText(Actor* target,const std::string& instance,const std::string& element){return bridgeWidget(target,instance,element).at("text").get<std::string>();}
inline void UI::SetValue(Actor* target,const std::string& instance,const std::string& element,float value){if(!std::isfinite(value))throw std::invalid_argument("invalid UI value");engineCommand("uiSetValue",{{"target",bridgeId(target)},{"instance",instance},{"element",element},{"value",value}});auto& ui=gameplayField(target,"ui");if(ui.contains(instance)&&ui.at(instance).contains(element)){auto& p=ui[instance][element];p["value"]=p.value("type",std::string{})=="CheckBox"?float(bool(value)):std::clamp(value,p.at("min").get<float>(),p.at("max").get<float>());p["checked"]=bool(value);}}
inline float UI::GetValue(Actor* target,const std::string& instance,const std::string& element){return bridgeWidget(target,instance,element).at("value").get<float>();}
inline void UI::SetVisible(Actor* target,const std::string& instance,const std::string& element,bool visible){engineCommand("uiSetVisible",{{"target",bridgeId(target)},{"instance",instance},{"element",element},{"visible",visible}});}
inline void UI::SetEnabled(Actor* target,const std::string& instance,const std::string& element,bool enabled){engineCommand("uiSetEnabled",{{"target",bridgeId(target)},{"instance",instance},{"element",element},{"enabled",enabled}});}
inline void UI::Focus(Actor* target,const std::string& instance,const std::string& element){engineCommand("uiFocus",{{"target",bridgeId(target)},{"instance",instance},{"element",element}});}
inline void AudioMixer::SetFloat(Actor* target,const std::string& asset,const std::string& parameter,float value){engineCommand("mixerSet",{{"target",bridgeId(target)},{"asset",asset},{"parameter",parameter},{"value",value}});gameplayField(target,"audioMixers")[asset][parameter]=value;}
inline float AudioMixer::GetFloat(Actor* target,const std::string& asset,const std::string& parameter){return gameplayField(target,"audioMixers").at(asset).at(parameter).get<float>();}
inline void AudioMixer::ClearFloat(Actor* target,const std::string& asset,const std::string& parameter){engineCommand("mixerClear",{{"target",bridgeId(target)},{"asset",asset},{"parameter",parameter}});}
inline void AudioMixer::TransitionTo(Actor* target,const std::string& asset,const std::string& snapshot,float duration){engineCommand("mixerSnapshot",{{"target",bridgeId(target)},{"asset",asset},{"snapshot",snapshot},{"duration",duration}});}
inline void AI::RunBehaviorTree(Actor* target,const std::string& asset){engineCommand("runBehaviorTree",{{"target",bridgeId(target)},{"asset",asset}});}
inline void AI::StopBehaviorTree(Actor* target){engineCommand("stopBehaviorTree",{{"target",bridgeId(target)}});}
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
inline void States::SendEvent(Actor* target,const std::string& event){engineCommand("stateEvent",{{"target",bridgeId(target)},{"event",event}});}
inline void States::Jump(Actor* target,const std::string& state){engineCommand("stateJump",{{"target",bridgeId(target)},{"state",state}});}
inline void States::Stop(Actor* target){engineCommand("stateStop",{{"target",bridgeId(target)}});}
inline void States::SetFloat(Actor* target,const std::string& key,float value){engineCommand("stateSetFloat",{{"target",bridgeId(target)},{"key",key},{"value",value}});}
inline void States::SetBool(Actor* target,const std::string& key,bool value){engineCommand("stateSetBool",{{"target",bridgeId(target)},{"key",key},{"value",value}});}
inline void States::SetString(Actor* target,const std::string& key,const std::string& value){engineCommand("stateSetString",{{"target",bridgeId(target)},{"key",key},{"value",value}});}
inline void Montage::Play(Actor* target,const std::string& asset,const std::string& section){engineCommand("playMontage",{{"target",bridgeId(target)},{"asset",asset},{"section",section}});}
inline void Montage::Stop(Actor* target){engineCommand("montageStop",{{"target",bridgeId(target)}});}
inline void Montage::Pause(Actor* target,bool paused){engineCommand("montagePause",{{"target",bridgeId(target)},{"paused",paused}});}
inline void Montage::JumpToSection(Actor* target,const std::string& section){engineCommand("montageJump",{{"target",bridgeId(target)},{"section",section}});}
inline void Montage::SetNextSection(Actor* target,const std::string& section,const std::string& next){engineCommand("montageNext",{{"target",bridgeId(target)},{"section",section},{"next",next}});}
inline float Montage::GetPosition(Actor* target){auto& state=gameplayField(target,"montage");return state.is_null()?0.0f:state.at("time").get<float>();}
inline void Montage::Seek(Actor* target,float time){engineCommand("montageSeek",{{"target",bridgeId(target)},{"time",time}});}
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
inline void Particles::Play(Actor* target){engineCommand("particlePlay",{{"target",bridgeId(target)}});}
inline void Particles::Stop(Actor* target,bool clear){engineCommand("particleStop",{{"target",bridgeId(target)},{"clear",clear}});}
inline void Particles::Pause(Actor* target,bool paused){engineCommand("particlePause",{{"target",bridgeId(target)},{"paused",paused}});}
inline void Particles::Emit(Actor* target,int count){engineCommand("particleEmit",{{"target",bridgeId(target)},{"count",count}});}
inline int Particles::GetCount(Actor* target){auto& state=gameplayField(target,"particles");return state.is_null()?0:state.value("count",0);}
inline Json& bridgeTags(Actor* target){auto* state=bridgeState(target);if(!state)throw std::runtime_error("missing tag target");auto& tags=(*state)["tags"];if(tags.is_null())tags=Json::array();return tags;}
inline std::vector<std::string> Tags::Get(Actor* target){return bridgeTags(target).get<std::vector<std::string>>();}
inline void Tags::Add(Actor* target,const std::string& tag){engineCommand("tagAdd",{{"target",bridgeId(target)},{"tag",tag}});auto& tags=bridgeTags(target);if(std::find(tags.begin(),tags.end(),Json(tag))==tags.end())tags.push_back(tag);}
inline void Tags::Remove(Actor* target,const std::string& tag){engineCommand("tagRemove",{{"target",bridgeId(target)},{"tag",tag}});auto& tags=bridgeTags(target);tags.erase(std::remove(tags.begin(),tags.end(),Json(tag)),tags.end());}
inline bool Tags::Has(Actor* target,const std::string& tag,bool exact){for(const auto& value:Tags::Get(target))if(value==tag||(!exact&&value.rfind(tag+".",0)==0))return true;return false;}
inline bool Tags::HasAny(Actor* target,const std::vector<std::string>& tags,bool exact){for(const auto& tag:tags)if(Has(target,tag,exact))return true;return false;}
inline bool Tags::HasAll(Actor* target,const std::vector<std::string>& tags,bool exact){for(const auto& tag:tags)if(!Has(target,tag,exact))return false;return true;}
inline bool bridgeTagQuery(Actor* target,const Json& query,int depth,int& budget){if(--budget<0||depth>16||!query.is_object())throw std::runtime_error("tag query bounds");if(!query.value("tags",Json::array()).is_array()||!query.value("queries",Json::array()).is_array()||query.value("tags",Json::array()).size()>32||query.value("queries",Json::array()).size()>32)throw std::runtime_error("tag query shape");const auto op=query.at("op").get<std::string>();if(op!="any"&&op!="all"&&op!="none")throw std::runtime_error("tag query operator");std::vector<bool> results;for(const auto& tag:query.value("tags",Json::array()))results.push_back(Tags::Has(target,tag.get<std::string>(),query.value("exact",false)));for(const auto& child:query.value("queries",Json::array()))results.push_back(bridgeTagQuery(target,child,depth+1,budget));const bool any=std::any_of(results.begin(),results.end(),[](bool v){return v;}),all=std::all_of(results.begin(),results.end(),[](bool v){return v;});return op=="all"?all:op=="none"?!any:any;}
inline bool Tags::MatchesQuery(Actor* target,const std::string& query){int budget=256;return bridgeTagQuery(target,Json::parse(query),0,budget);}
}
