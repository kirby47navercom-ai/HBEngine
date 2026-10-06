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
inline std::string Game::GetStateText(){auto* instance=GetInstance();return (instance?instance->state:bridgeGameState).dump();}
inline std::string Game::GetArgumentsText(){return bridgeGameArguments.dump();}
inline void Game::SetStateText(const std::string& text){if(text.size()>262144)throw std::runtime_error("game JSON size limit");auto value=Json::parse(text);if(!value.is_object())throw std::runtime_error("game state must be an object");bridgeGameState=value;if(auto* instance=GetInstance())instance->state=std::move(value);}
inline void Game::Reset(){engineCommand("gameReset",Json::object());}
inline void Scene::OpenWithArguments(const std::string& scene,const std::string& json){engineCommand("openSceneArgs",{{"scene",scene},{"json",json}});}
inline void Save::WriteText(const std::string& slot,const std::string& json){engineQuery("saveJsonWrite",{{"slot",slot},{"json",json}});}
inline std::string Save::ReadText(const std::string& slot){return engineQuery("saveJsonRead",{{"slot",slot}}).get<std::string>();}
inline void Save::Delete(const std::string& slot){engineQuery("saveJsonDelete",{{"slot",slot}});}
}
