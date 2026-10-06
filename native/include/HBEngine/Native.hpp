#pragma once
#include <HBEngine/Bridge.hpp>
#include <HBEngine/Spawn.hpp>
#include <HBEngine/NativeRouting.hpp>

namespace hb {
inline Json bridgeForeign=Json::array(),bridgeNativeBindings=Json::array();
inline std::function<Json(const Json&)> bridgeLocalNative;
inline Json bridgeNative(const Json& args){
    if(bridgeLocalNative){const auto context=Timers::GetContext();const auto overrides=bridgeOverrides;Json output;try{output=bridgeLocalNative(args);}catch(...){Timers::SetContext(context.first,context.second);bridgeOverrides=overrides;throw;}Timers::SetContext(context.first,context.second);bridgeOverrides=overrides;if(!output.is_null())return output;}
    if(bridgeForeign.size()>=128)throw std::runtime_error("native module call limit");
    auto receipt=engineQuery("nativeModule",args);
    std::function<void(const Json&)> apply=[&](const Json& result){
        for(const auto& foreign:result.value("foreign",Json::array()))apply(foreign.at("result"));
        for(const auto& state:result.at("objects")){
            const auto id=state.at("id").get<std::string>();auto index=bridgeStateIndices.find(id);
            if(index==bridgeStateIndices.end())throw std::runtime_error("unknown native module object");
            if(state.contains("position")){bridgeActor(id)->transform=state.get<Transform>();auto copy=state;copy.erase("nativeProperties");bridgeWorld.at(index->second).update(copy);}
        }
    };apply(receipt.at("result"));const auto& clock=receipt.at("result").at("clock");Clock::SetTimeScale(clock.at("scale").get<float>());Clock::SetPaused(clock.at("paused").get<bool>());receipt["operationIndex"]=bridgeOperations.size();bridgeForeign.push_back(receipt);return receipt.at("result").at("outputs");
}
namespace Native {
inline float GetFloat(Actor* actor,const std::string& name){return bridgeNative({{"target",bridgeId(actor)},{"member",name},{"operation","getFloat"}}).at("value").get<float>();}
inline void SetFloat(Actor* actor,const std::string& name,float value){bridgeNative({{"target",bridgeId(actor)},{"member",name},{"operation","setFloat"},{"value",value}});}
inline Json Call(Actor* actor,const std::string& name,const Json& args=Json::object()){return bridgeNative({{"target",bridgeId(actor)},{"member",name},{"operation","call"},{"arguments",args}});}
}
}
