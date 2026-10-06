#pragma once
#include <HBEngine/Bridge.hpp>
namespace hb {
inline std::string bridgeGameSession,bridgeGameActor;
inline Json bridgeGameState=Json::object();
inline uint64_t bridgeAudioSerial=0;
inline bool bridgeGameInitialized=false;
inline Json bridgeGameArguments=Json::object();
inline void bridgeResetGame(const Json& request){
    const auto game=request.value("gameSession",Json::object());
    const auto id=game.value("id",std::string{}),actor=game.contains("actor")&&game.at("actor").is_string()?game.at("actor").get<std::string>():std::string{};
    const bool keep=!id.empty()&&id==bridgeGameSession&&actor==bridgeGameActor;
    for(auto it=bridgeCells.begin();it!=bridgeCells.end();)if(keep&&it->first==actor)++it;else{if(auto* instance=dynamic_cast<GameInstance*>(it->second->actor()))instance->Shutdown();it=bridgeCells.erase(it);}
    for(auto it=bridgeActors.begin();it!=bridgeActors.end();)if(keep&&it->first==actor)++it;else{if(auto* instance=dynamic_cast<GameInstance*>(it->second.get()))instance->Shutdown();it=bridgeActors.erase(it);}
    bridgeGameInitialized=keep&&bridgeGameInitialized;bridgeGameSession=id;bridgeGameActor=actor;bridgeGameState=game.value("state",Json::object());
    bridgeGameArguments=game.value("arguments",Json::object());if(auto* instance=Game::GetInstance())instance->state=bridgeGameState;
}
inline GameInstance* Game::GetInstance(){if(bridgeGameActor.empty())return nullptr;if(!bridgeCells.count(bridgeGameActor)&&!bridgeActors.count(bridgeGameActor))bridgeActors[bridgeGameActor]=std::make_unique<GameInstance>();auto* instance=dynamic_cast<GameInstance*>(bridgeActor(bridgeGameActor));if(!instance)throw std::runtime_error("GameInstance class mismatch");return instance;}
inline std::string Game::GetSessionId(){return bridgeGameSession;}
inline std::string Game::GetStateText(){auto* instance=GetInstance();return (instance?instance->state:bridgeGameState).dump();}
inline std::string Game::GetArgumentsText(){return bridgeGameArguments.dump();}
inline void Game::SetStateText(const std::string& text){if(text.size()>262144)throw std::runtime_error("game JSON size limit");auto value=Json::parse(text);if(!value.is_object())throw std::runtime_error("game state must be an object");bridgeGameState=value;if(auto* instance=GetInstance())instance->state=std::move(value);}
inline void Game::Reset(){engineCommand("gameReset",Json::object());}
inline void Scene::OpenWithArguments(const std::string& scene,const std::string& json){engineCommand("openSceneArgs",{{"scene",scene},{"json",json}});}
inline void Save::WriteText(const std::string& slot,const std::string& json){engineQuery("saveJsonWrite",{{"slot",slot},{"json",json}});}
inline std::string Save::ReadText(const std::string& slot){return engineQuery("saveJsonRead",{{"slot",slot}}).get<std::string>();}
inline void Save::Delete(const std::string& slot){engineQuery("saveJsonDelete",{{"slot",slot}});}
inline std::string Data::GetText(const std::string& path){return engineQuery("dataJsonRead",{{"path",path}}).get<std::string>();}
inline std::string Data::GetTableText(const std::string& path,const std::string& rowId){return engineQuery("dataTableRead",{{"path",path},{"rowId",rowId}}).get<std::string>();}
inline std::string Input::GetLastDevice(){return bridgeInput.value("lastDevice",std::string("keyboard"));}
inline bool Input::AnyKeyPressed(){return !bridgeInput.value("pressed",Json::array()).empty();}
inline bool bridgeInputEdge(const char* kind,const std::string& key){const auto values=bridgeInput.value(kind,Json::array());return std::find(values.begin(),values.end(),Json(bridgeInputKey(key)))!=values.end();}
inline bool Input::WasPressedThisFrame(const std::string& key){return bridgeInputEdge("pressed",key);}
inline bool Input::WasReleasedThisFrame(const std::string& key){return bridgeInputEdge("released",key);}
inline std::string Audio::Play(const std::string& asset,float volume,float pitch,const std::string& bus){const auto handle="audio_"+bridgeGameSession+"_"+std::to_string(++bridgeAudioSerial);engineCommand("audioPlay",{{"asset",asset},{"volume",volume},{"pitch",pitch},{"bus",bus},{"handle",handle}});return handle;}
inline std::string Audio::PlayAt(const std::string& asset,const Vec3& position,float volume,float pitch,const std::string& bus){const auto handle="audio_"+bridgeGameSession+"_"+std::to_string(++bridgeAudioSerial);engineCommand("audioPlayAt",{{"asset",asset},{"position",position},{"volume",volume},{"pitch",pitch},{"bus",bus},{"handle",handle}});return handle;}
inline void Audio::Stop(const std::string& handle){engineCommand("audioStop",{{"handle",handle}});}
inline void Audio::PlayMusic(const std::string& asset,float fadeSeconds){engineCommand("audioMusic",{{"asset",asset},{"fadeSeconds",fadeSeconds}});}
inline void Audio::StopMusic(float fadeSeconds){engineCommand("audioStopMusic",{{"fadeSeconds",fadeSeconds}});}
inline Json& bridgeComponent(Actor* actor,const std::string& name){auto* state=bridgeState(actor);if(!state)throw std::runtime_error("component actor missing");for(auto& c:state->at("components"))if(c.value("type",std::string{})==name||c.value("name",std::string{})==name||c.value("id",std::string{})==name){auto& properties=c["properties"];if(c.value("type",std::string{})=="Transform"){properties["position"]=actor->transform.position;properties["rotation"]=actor->transform.rotation;properties["scale"]=actor->transform.scale;}return properties;}throw std::runtime_error("component missing: "+name);}
inline float Components::GetFloat(Actor* t,const std::string& c,const std::string& p){return bridgeComponent(t,c).at(p).get<float>();}
inline bool Components::GetBool(Actor* t,const std::string& c,const std::string& p){return bridgeComponent(t,c).at(p).get<bool>();}
inline std::string Components::GetString(Actor* t,const std::string& c,const std::string& p){return bridgeComponent(t,c).at(p).get<std::string>();}
inline void Components::SetFloat(Actor* t,const std::string& c,const std::string& p,float v){engineCommand("componentSetFloat",{{"target",bridgeId(t)},{"component",c},{"property",p},{"value",v}});bridgeComponent(t,c)[p]=v;}
inline void Components::SetBool(Actor* t,const std::string& c,const std::string& p,bool v){engineCommand("componentSetBool",{{"target",bridgeId(t)},{"component",c},{"property",p},{"value",v}});bridgeComponent(t,c)[p]=v;}
inline void Components::SetString(Actor* t,const std::string& c,const std::string& p,const std::string& v){engineCommand("componentSetString",{{"target",bridgeId(t)},{"component",c},{"property",p},{"value",v}});bridgeComponent(t,c)[p]=v;}
inline std::string Components::GetText(Actor* t,const std::string& c,const std::string& p){return bridgeComponent(t,c).at(p).dump();}
inline void Components::SetText(Actor* t,const std::string& c,const std::string& p,const std::string& text){if(text.size()>262144)throw std::runtime_error("component JSON limit");const auto value=Json::parse(text);auto& properties=bridgeComponent(t,c);if(!properties.contains(p))throw std::runtime_error("component property missing");for(const auto& component:bridgeState(t)->at("components"))if((component.value("type",std::string{})==c||component.value("name",std::string{})==c||component.value("id",std::string{})==c)&&component.value("type",std::string{})=="Transform"){if(p=="position")t->transform.position=value.get<Vec3>();else if(p=="rotation")t->transform.rotation=value.get<Vec3>();else if(p=="scale")t->transform.scale=value.get<Vec3>();}engineCommand("componentSetJson",{{"target",bridgeId(t)},{"component",c},{"property",p},{"json",text}});properties[p]=value;}
inline Vec3 Components::GetVector(Actor* t,const std::string& c,const std::string& p){return Get(t,c,p).get<Vec3>();}
inline Color Components::GetColor(Actor* t,const std::string& c,const std::string& p){return Get(t,c,p).get<Color>();}
inline void Components::SetVector(Actor* t,const std::string& c,const std::string& p,const Vec3& value){Set(t,c,p,value);}
inline void Components::SetColor(Actor* t,const std::string& c,const std::string& p,const Color& value){Set(t,c,p,value);}
inline void Movement2D::SetSpeed(Actor* t,float v){engineCommand("movement2dSpeed",{{"target",bridgeId(t)},{"speed",v}});}
inline void Camera::SetOrthoSize(Actor* t,float v){engineCommand("cameraOrthoSize",{{"target",bridgeId(t)},{"size",v}});bridgeComponent(t,"Camera")["orthographicSize"]=v;}
inline void Camera::Follow(Actor* t,Actor* v){engineCommand("cameraFollow",{{"target",bridgeId(t)},{"subject",bridgeId(v)}});}
inline std::string Projectiles::FireText(const std::string& json){if(json.size()>262144)throw std::runtime_error("projectile JSON limit");auto pattern=Json::parse(json);const auto handle="projectiles_"+bridgeGameSession+"_"+std::to_string(++bridgeAudioSerial);pattern["handle"]=handle;engineCommand("projectileFire",{{"json",pattern.dump()}});return handle;}
inline std::string Projectiles::TakeHitsText(){const auto owner=Timers::GetContext().first;auto* state=bridgeState(bridgeActor(owner));auto result=state?state->value("gameplayDebug",Json::object()).value("projectileHits",Json::array()):Json::array();if(state)(*state)["gameplayDebug"]["projectileHits"]=Json::array();engineCommand("projectileHits",Json::object());return result.dump();}
inline void Projectiles::OnHit(const std::string& eventName){engineCommand("projectileOnHit",{{"eventName",eventName}});}
inline void Projectiles::Clear(){engineCommand("projectileClear",Json::object());}
inline void Camera::Flash(const Color& color,float duration){engineCommand("screenFlash",{{"color",color},{"duration",duration}});}
inline void Sprites::Flash(Actor* target,float duration,float strength){engineCommand("spriteFlash",{{"target",bridgeId(target)},{"duration",duration},{"strength",strength}});}
inline void Sprites::PlayAnimation(Actor* target,const std::string& asset,bool loop){engineCommand("spritePlayAnimation",{{"target",bridgeId(target)},{"asset",asset},{"loop",loop}});}
inline void Camera::Shake(Actor* t,float intensity,float duration){engineCommand("cameraShake",{{"target",bridgeId(t)},{"intensity",intensity},{"duration",duration}});}
inline void bridgeWidgetWrite(const char* key,Actor* t,const std::string& i,const std::string& e,const char* p,const Json& v){engineCommand(key,{{"target",bridgeId(t)},{"instance",i},{"element",e},{p,v}});}
inline void UI::SetTexture(Actor* t,const std::string& i,const std::string& e,const std::string& v){bridgeWidgetWrite("uiSetTexture",t,i,e,"texture",v);}
inline void UI::SetPosition(Actor* t,const std::string& i,const std::string& e,const Vec2& v){bridgeWidgetWrite("uiSetPosition",t,i,e,"position",v);}
inline void UI::SetSize(Actor* t,const std::string& i,const std::string& e,const Vec2& v){bridgeWidgetWrite("uiSetSize",t,i,e,"size",v);}
inline void UI::SetRotation(Actor* t,const std::string& i,const std::string& e,float v){bridgeWidgetWrite("uiSetRotation",t,i,e,"rotation",v);}
inline void UI::SetScale(Actor* t,const std::string& i,const std::string& e,const Vec2& v){bridgeWidgetWrite("uiSetScale",t,i,e,"scale",v);}
inline void UI::SetColor(Actor* t,const std::string& i,const std::string& e,const Color& v){bridgeWidgetWrite("uiSetColor",t,i,e,"color",v);}
inline void UI::SetOpacity(Actor* t,const std::string& i,const std::string& e,float v){bridgeWidgetWrite("uiSetOpacity",t,i,e,"opacity",v);}
inline void UI::SetFont(Actor* t,const std::string& i,const std::string& e,const std::string& v){bridgeWidgetWrite("uiSetFont",t,i,e,"font",v);}
inline void UI::SetFontSize(Actor* t,const std::string& i,const std::string& e,float v){bridgeWidgetWrite("uiSetFontSize",t,i,e,"fontSize",v);}
inline void UI::SetFillDirection(Actor* t,const std::string& i,const std::string& e,const std::string& v){bridgeWidgetWrite("uiSetFillDirection",t,i,e,"direction",v);}
inline void UI::Animate(Actor* t,const std::string& i,const std::string& e,const std::string& property,float to,float duration){engineCommand("uiAnimate",{{"target",bridgeId(t)},{"instance",i},{"element",e},{"property",property},{"to",to},{"duration",duration}});}
}
