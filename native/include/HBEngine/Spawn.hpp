#pragma once
// Included after Bridge.hpp's state helpers. No platform or renderer dependency.
namespace hb {
inline Json bridgeSpawnTemplates=Json::object(),bridgeSpawnAliases=Json::object();
inline std::string bridgeSpawnPrefix;
inline uint64_t bridgeSpawnSerial=0;
inline std::function<bool(const std::string&,const std::string&)> bridgeCreateActor;
inline std::unordered_map<std::string,size_t> bridgePendingSpawns;
inline void bridgeCaptureSpawnStates(const std::unordered_set<std::string>* selected=nullptr){
    for(auto it=bridgePendingSpawns.begin();it!=bridgePendingSpawns.end();){
        if(selected&&!selected->count(it->first)){++it;continue;}
        auto& states=bridgeOperations.at(it->second).at("args").at("spawnStates");
        for(auto& state:states)if(state.at("id")==it->first){const auto cell=bridgeCells.find(it->first);auto* actor=bridgeActor(state.at("id"));if(actor){state["position"]=actor->transform.position;state["rotation"]=actor->transform.rotation;state["scale"]=actor->transform.scale;}if(cell!=bridgeCells.end())state["nativeProperties"]=cell->second->properties();break;}
        if(selected)it=bridgePendingSpawns.erase(it);else ++it;
    }
}
inline bool bridgeValidSpawnTransform(const Transform& t){for(const auto& pair:std::vector<std::pair<Vec3,float>>{{t.position,1000000},{t.rotation,10000},{t.scale,10000}})for(const float v:{pair.first.x,pair.first.y,pair.first.z})if(!std::isfinite(v)||std::abs(v)>pair.second)return false;return t.scale.x>=.01f&&t.scale.y>=.01f&&t.scale.z>=.01f;}
inline Actor* Scene::Spawn(const std::string& blueprintOrPrefab,const Transform& transform,const std::string& actorId){
    if(actorId.size()>160)throw std::runtime_error("spawn actor id limit");
    if(!bridgeValidSpawnTransform(transform))throw std::runtime_error("invalid spawn transform");
    const auto key=bridgeSpawnAliases.value(blueprintOrPrefab,blueprintOrPrefab);
    if(!bridgeSpawnTemplates.contains(key))throw std::runtime_error("unregistered spawn asset/class: "+blueprintOrPrefab);
    const auto& spec=bridgeSpawnTemplates.at(key);std::string rootId;
    if(!actorId.empty()){const auto existing=bridgeStateIndices.find(actorId);if(existing!=bridgeStateIndices.end()){const auto& s=bridgeWorldData.at(existing->second);if(!spec.at("pool").at("enabled").get<bool>()||s.value("spawnAsset",std::string{})!=key||s.value("poolActive",true)||s.value("destroying",false))throw std::runtime_error("spawn actor id already exists");rootId=actorId;}}
    if(actorId.empty()&&spec.at("pool").at("enabled").get<bool>())for(const auto& state:bridgeWorldData)if(state.value("spawnAsset",std::string{})==key&&state.value("spawnRoot",std::string{})==state.at("id")&&!state.value("poolActive",true)&&!state.value("destroying",false)){rootId=state.at("id").get<std::string>();break;}
    const bool reused=!rootId.empty();if(!reused){if(bridgeSpawnPrefix.empty())throw std::runtime_error("missing spawn world identity");rootId=actorId.empty()?"spawn_"+bridgeSpawnPrefix+"_"+std::to_string(++bridgeSpawnSerial):actorId;}
    const auto& sources=spec.at("objects");
    std::unordered_map<std::string,std::string> ids;size_t index=0;for(const auto& source:sources){const auto id=source.at("id").get<std::string>();ids[id]=source.at("id")==spec.at("root")?rootId:rootId+"_"+std::to_string(index);index++;}
    Json states=Json::array();for(const auto& source:sources){auto state=source;const auto old=source.at("id").get<std::string>();state["id"]=ids.at(old);state["spawnAsset"]=key;state["spawnRoot"]=rootId;state["spawnLocalId"]=old;state["spawnPool"]=spec.at("pool");state["poolActive"]=true;state.erase("destroying");for(const auto* field:{"parent","parentId","owner","pawn","controller"})if(state.contains(field)&&state.at(field).is_string()){const auto parent=state.at(field).get<std::string>();if(ids.count(parent))state[field]=ids.at(parent);}if(source.at("id")==spec.at("root")){state["position"]=transform.position;state["rotation"]=transform.rotation;state["scale"]=transform.scale;}if(state.contains("nativeProperties")&&spec.contains("references")&&spec.at("references").contains(old)){std::function<void(Json&)> remap=[&](Json& v){if(v.is_array())for(auto& x:v)remap(x);else if(v.is_string()){const auto id=v.get<std::string>();if(ids.count(id))v=ids.at(id);}};for(const auto& name:spec.at("references").at(old))if(state.at("nativeProperties").contains(name.get<std::string>()))remap(state["nativeProperties"][name.get<std::string>()]);}if(state.contains("components")&&spec.contains("componentReferences")&&spec.at("componentReferences").contains(old)){for(auto& c:state["components"]){const auto componentId=c.at("id").get<std::string>();const auto& fields=spec.at("componentReferences").at(old);if(!fields.contains(componentId))continue;for(const auto& field:fields.at(componentId)){auto& value=c["properties"][field.get<std::string>()];if(value.is_string()&&ids.count(value.get<std::string>()))value=ids.at(value.get<std::string>());}}}states.push_back(std::move(state));}
    engineCommand("sceneSpawn",{{"blueprintOrPrefab",blueprintOrPrefab},{"transform",transform},{"actorId",actorId},{"spawnId",rootId},{"spawnStates",states}});
    const size_t operation=bridgeOperations.size()-1;
    for(const auto& state:states){const auto id=state.at("id").get<std::string>();const auto found=bridgeStateIndices.find(id);if(found==bridgeStateIndices.end()){bridgeStateIndices[id]=bridgeWorldData.size();bridgeWorldData.push_back(state);}else {bridgeWorldData.at(found->second)=state;bridgeDirtyStates.insert(found->second);}}
    for(const auto& state:states){const auto className=state.value("nativeClass",std::string{});if(!className.empty()&&bridgeCreateActor)bridgeCreateActor(state.at("id").get<std::string>(),className);}
    for(const auto& state:states){const auto id=state.at("id").get<std::string>();auto* actor=bridgeActor(Json(id));if(actor)actor->transform=state.get<Transform>();const auto cell=bridgeCells.find(id);if(cell!=bridgeCells.end()&&state.contains("nativeProperties"))cell->second->defaults(state.at("nativeProperties"));bridgePendingSpawns[id]=operation;}
    return bridgeActor(Json(rootId));
}
inline void Scene::Destroy(Actor* target){
    auto* state=bridgeState(target);if(!state||state->value("destroying",false)||!state->value("poolActive",true))return;
    const auto targetId=state->at("id").get<std::string>(),root=state->value("spawnRoot",targetId);std::unordered_set<std::string> owned{root};bool changed=true;
    while(changed){changed=false;for(const auto& o:bridgeWorldData)if(o.value("spawnRoot",std::string{})==root||owned.count(o.value("parent",std::string{}))||owned.count(o.value("owner",std::string{}))){const auto id=o.at("id").get<std::string>();if(owned.insert(id).second)changed=true;}}
    bridgeCaptureSpawnStates(&owned);for(const auto& id:owned)Timers::ClearOwner(id);engineCommand("sceneDestroy",{{"target",targetId}});
    bool pooled=false;const auto rootIndex=bridgeStateIndices.find(root);if(rootIndex!=bridgeStateIndices.end()){const auto& r=bridgeWorldData.at(rootIndex->second);const auto pool=r.value("spawnPool",Json::object());if(pool.value("enabled",false)){int inactive=0;for(const auto& o:bridgeWorldData)if(o.value("spawnAsset",std::string{})==r.value("spawnAsset",std::string{})&&o.value("spawnRoot",std::string{})==o.at("id")&&!o.value("poolActive",true))inactive++;pooled=inactive<pool.value("maxInactive",0);}}
    for(auto& o:bridgeWorldData)if(owned.count(o.at("id").get<std::string>())){bridgeDirtyStates.insert(bridgeStateIndices.at(o.at("id").get<std::string>()));o["poolActive"]=false;o["visible"]=false;o["collisionEnabled"]=false;o["destroying"]=!pooled;}
}
}
