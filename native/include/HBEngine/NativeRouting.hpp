#pragma once
#include <nlohmann/json.hpp>
#include <functional>
#include <algorithm>
#include <cmath>
#include <string>
#include <vector>
#include <stdexcept>
#include <unordered_map>

// AOT modules share one native thread. Route nested native calls here instead of
// waiting for another Java/Objective-C job on that same blocked thread.
namespace hb_native {
using Json=nlohmann::json;
using Query=std::function<std::string(const std::string&)>;
using Dispatch=std::function<std::string(int,const std::string&,const Query&)>;
inline std::unordered_map<int,Json> SpawnContexts;
inline size_t StringUnits(const std::string& value){size_t units=0;for(unsigned char c:value)if((c&0xc0)!=0x80)units+=c>=0xf0?2:1;return units;}
inline bool ValidValue(const std::string& type,const Json& value,const Json& world){
    const auto vector=[&](size_t size){return value.is_array()&&value.size()==size&&std::all_of(value.begin(),value.end(),[](const Json& v){return v.is_number()&&std::isfinite(v.get<double>());});};
    if(type=="bool")return value.is_boolean();if(type=="int")return value.is_number()&&std::isfinite(value.get<double>())&&value.get<double>()>=-2147483648.0&&value.get<double>()<=2147483647.0&&std::floor(value.get<double>())==value.get<double>();
    if(type=="float")return value.is_number()&&std::isfinite(value.get<double>());if(type=="string")return value.is_string()&&value.get<std::string>().size()<=16384&&StringUnits(value.get<std::string>())<=4096;
    if(type=="vec2")return vector(2);if(type=="vec3")return vector(3);if(type=="color")return vector(4)&&std::all_of(value.begin(),value.end(),[](const Json& v){return v.get<double>()>=0&&v.get<double>()<=1;});
    if(type=="object")return value.is_null()||value.is_string()&&std::any_of(world.begin(),world.end(),[&](const Json& o){return o.at("id")==value;});
    if(type=="transform")return value.is_object()&&value.contains("position")&&value.contains("rotation")&&value.contains("scale")&&ValidValue("vec3",value.at("position"),world)&&ValidValue("vec3",value.at("rotation"),world)&&ValidValue("vec3",value.at("scale"),world);
    if(type=="hit")return value.is_object()&&value.contains("hit")&&value.contains("position")&&value.contains("normal")&&value.contains("actor")&&ValidValue("bool",value.at("hit"),world)&&ValidValue("vec3",value.at("position"),world)&&ValidValue("vec3",value.at("normal"),world)&&ValidValue("object",value.at("actor"),world);return false;
}
inline void CheckInputs(const Json& pins,const Json& args,const Json& world){
    for(const auto& pin:pins){const auto id=pin.at("id").get<std::string>(),type=pin.at("type").get<std::string>();if(!args.contains(id))throw std::runtime_error("missing native module argument: "+id);const auto& value=args.at(id);bool valid;if(pin.at("array").get<bool>())valid=value.is_array()&&value.size()<=100000&&std::all_of(value.begin(),value.end(),[&](const Json& v){return ValidValue(type,v,world);});else valid=ValidValue(type,value,world);if(!valid)throw std::runtime_error("invalid native module argument: "+id);}
}
inline void UpdateBindings(Json& rows,const Json& result){
    for(const auto& foreign:result.value("foreign",Json::array()))UpdateBindings(rows,foreign.at("result"));
    for(const auto& state:result.at("objects"))if(state.contains("nativeProperties"))for(auto& row:rows)if(row.at("id")==state.at("id"))row["properties"]=state.at("nativeProperties");
}
inline std::string Invoke(int module,const std::string& packet,const Query& query,const Json& modules,const Dispatch& dispatch,std::vector<int>& active,int& count){
    if(active.size()>=8||std::find(active.begin(),active.end(),module)!=active.end())throw std::runtime_error("cyclic native module call");
    // The owning worker parses and validates the packet. Decode its routing
    // context only if user code actually calls another native module.
    Json request;bool requestLoaded=false;size_t spawnOperations=0;active.push_back(module);
    if(packet.find("\"spawnTemplates\"")!=std::string::npos){request=Json::parse(packet);requestLoaded=true;if(request.contains("spawnTemplates"))SpawnContexts[module]={{"prefix",request.value("spawnPrefix",std::string{})},{"context",request.at("spawnTemplates")}};}
    const Query route=[&](const std::string& line){auto q=Json::parse(line);if(q.value("key",std::string{})!="nativeModule")return query(line);
        try{
            if(!requestLoaded){request=Json::parse(packet);requestLoaded=true;}
            if(!request.contains("spawnTemplates")&&SpawnContexts.count(module)&&request.value("spawnPrefix",std::string{})==SpawnContexts.at(module).at("prefix"))request["spawnTemplates"]=SpawnContexts.at(module).at("context");
            if(++count>128)throw std::runtime_error("native module call limit");
            // Spawned module ownership is copied only from the caller's already
            // validated catalog, never from an arbitrary query-supplied token.
            auto rows=request.value("nativeBindings",Json::array());
            const auto queryOperations=q.value("operations",Json::array());for(size_t oi=spawnOperations;oi<queryOperations.size();oi++){const auto& op=queryOperations.at(oi);if(op.at("key")=="sceneSpawn"){
                if(!request.contains("spawnTemplates"))throw std::runtime_error("missing spawn query catalog");const auto& context=request.at("spawnTemplates");const auto name=op.at("args").at("blueprintOrPrefab").get<std::string>(),key=context.at("aliases").value(name,name);const auto& spec=context.at("templates").at(key);std::unordered_map<std::string,std::string> ids;size_t index=0;for(const auto& o:spec.at("objects")){ids[o.at("id").get<std::string>()]=o.at("id")==spec.at("root")?op.at("args").at("spawnId").get<std::string>():op.at("args").at("spawnId").get<std::string>()+"_"+std::to_string(index);index++;}
                for(const auto& source:spec.value("nativeBindings",Json::array())){auto row=source;const auto localId=source.at("id").get<std::string>();row["id"]=ids.at(localId);if(spec.contains("references")&&spec.at("references").contains(localId)){std::function<void(Json&)> remap=[&](Json& v){if(v.is_array())for(auto& item:v)remap(item);else if(v.is_string()&&ids.count(v.get<std::string>()))v=ids.at(v.get<std::string>());};for(const auto& name:spec.at("references").at(localId))if(row.at("properties").contains(name.get<std::string>()))remap(row["properties"][name.get<std::string>()]);}auto existing=std::find_if(rows.begin(),rows.end(),[&](const Json& r){return r.at("id")==row.at("id");});if(existing==rows.end())rows.push_back(row);else *existing=row;}
            }}spawnOperations=queryOperations.size();
            request["nativeBindings"]=rows;
            const auto& args=q.at("args");const auto id=args.at("target").get<std::string>();Json* binding=nullptr;
            for(auto& row:request.at("nativeBindings"))if(row.at("id")==id)binding=&row;
            if(!binding)throw std::runtime_error("missing native module target");
            int target=-1;for(size_t i=0;i<modules.size();i++)if(modules.at(i).at("signature")==binding->at("token"))target=static_cast<int>(i);
            if(target<0)throw std::runtime_error("unregistered native module");
            const auto name=args.at("member").get<std::string>(),operation=args.at("operation").get<std::string>();const Json* definition=nullptr;
            for(const auto& c:modules.at(target).at("metadata").at("classes"))if(c.at("name")==binding->at("className"))definition=&c;
            if(!definition)throw std::runtime_error("missing native module class");
            Json call={{"nativeId",binding->at("className").get<std::string>()+"."+name},{"self",id},{"scope",q.value("scope",std::string{})},{"overrides",binding->at("overrides")}};
            if(operation=="call"){
                const Json* function=nullptr;for(const auto& f:definition->at("functions"))if(f.at("name")==name)function=&f;
                if(!function||!args.at("arguments").is_object())throw std::runtime_error("invalid native module function");
                auto values=args.at("arguments");CheckInputs(function->at("inputs"),values,q.at("objects"));if(!function->at("static").get<bool>()){std::string pin="target";int suffix=0;auto used=[&](const std::string& key){for(const auto& p:function->at("inputs"))if(p.at("id")==key)return true;return false;};while(used(pin)){pin="nativeTarget"+(suffix?std::to_string(suffix):std::string{});suffix++;}values[pin]=id;}call["key"]="nativeCall";call["args"]=values;
            }else{
                const Json* property=nullptr;for(const auto& p:definition->at("properties"))if(p.at("name")==name)property=&p;
                if(!property||property->at("array").get<bool>()||(property->at("type")!="float"&&property->at("type")!="int")||(operation!="getFloat"&&operation!="setFloat")||(operation=="setFloat"&&property->at("readOnly").get<bool>()))throw std::runtime_error("invalid native module property");
                call["key"]=operation=="getFloat"?"nativeGet":"nativeSet";call["args"]={{"target",id}};if(operation=="setFloat"){if(!ValidValue(property->at("type").get<std::string>(),args.at("value"),q.at("objects")))throw std::runtime_error("invalid native module number");call["args"]["value"]=args.at("value");}
            }
            for(auto& row:rows)for(const auto& object:q.at("objects"))if(object.at("id")==row.at("id")&&object.value("nativeClass",std::string{})==row.at("className"))row["properties"]=object.value("nativeProperties",row.value("properties",Json::object()));
            auto world=q.at("objects");for(auto& object:world){object.erase("nativeClass");object.erase("nativeProperties");for(const auto& row:rows)if(row.at("id")==object.at("id")&&row.at("token")==binding->at("token")){object["nativeClass"]=row.at("className");object["nativeProperties"]=row.at("properties");}}
            auto nested=call;if(request.contains("gameSession")){nested["gameSession"]=request.at("gameSession");if(q.contains("gameState"))nested["gameSession"]["state"]=q.at("gameState");}nested["objects"]=world;nested["nativeBindings"]=rows;if(q.contains("clock"))nested["clock"]=q.at("clock");if(q.contains("input"))nested["input"]=q.at("input");else if(request.contains("input"))nested["input"]=request.at("input");if(request.contains("scopes"))nested["scopes"]=request.at("scopes");
            auto result=Json::parse(Invoke(target,nested.dump(),query,modules,dispatch,active,count));if(!result.value("ok",false))throw std::runtime_error(result.value("error",std::string("native module failure")));
            UpdateBindings(request.at("nativeBindings"),result);return Json{{"ok",true},{"value",{{"token",binding->at("token")},{"call",call},{"result",result}}}}.dump();
        }catch(const std::exception& e){return Json{{"ok",false},{"error",e.what()}}.dump();}
    };
    try{auto result=dispatch(module,packet,route);active.pop_back();return result;}catch(...){active.pop_back();throw;}
}
}
