#pragma once
#include <nlohmann/json.hpp>
#include <algorithm>
#include <cmath>
#include <cstdint>
#include <stdexcept>
#include <string>
#include <unordered_set>
namespace hb {
inline std::size_t componentSparseParticleCount(const std::string& type,const std::string& key,const nlohmann::json& properties){
    if((type!="Cloth"&&type!="Rope2D")||(key!="massWeights"&&key!="pinWeights"&&key!="pinOverrides"&&key!="motionLimits"&&key!="distanceTethers"))return 0;
    const double count=type=="Rope2D"||properties.value("topology",std::string("grid"))=="rope"?properties.value("particles",0.0):properties.value("columns",0.0)*properties.value("rows",0.0);
    return std::isfinite(count)&&count>=2&&count<=(type=="Rope2D"?4096:65536)&&std::floor(count)==count?static_cast<std::size_t>(count):0;
}
inline std::size_t componentJsonTextLimit(std::size_t particles){return std::max<std::size_t>(262144,particles*128);}
inline void validateSparseComponentJson(const nlohmann::json& value,const std::string& key,std::size_t count){
    const bool tether=key=="distanceTethers";if(!value.is_array()||(!tether&&value.size()>count))throw std::runtime_error("invalid sparse component array");std::unordered_set<std::uint64_t> seen;
    const auto index=[count](const nlohmann::json& row,const char* field){if(!row.contains(field)||!row.at(field).is_number())throw std::runtime_error("invalid particle index");const double n=row.at(field).get<double>();if(!std::isfinite(n)||n<0||n>=count||std::floor(n)!=n)throw std::runtime_error("particle index range");return static_cast<std::uint64_t>(n);};
    for(const auto& row:value){if(!row.is_object()||row.size()!=(tether?3u:2u))throw std::runtime_error("invalid sparse row fields");const auto i=index(row,"index");std::uint64_t identity=i;
        if(tether){const auto a=index(row,"anchor");if(a==i)throw std::runtime_error("self tether");identity=std::min(i,a)*65536+std::max(i,a);if(!row.contains("distance")||!row.at("distance").is_number())throw std::runtime_error("invalid tether distance");const double d=row.at("distance").get<double>();if(!std::isfinite(d)||d<0||d>100000)throw std::runtime_error("tether distance range");}
        else if(key=="pinOverrides"){if(!row.contains("pinned")||!row.at("pinned").is_boolean())throw std::runtime_error("invalid pin state");}
        else{const char* field=key=="motionLimits"?"radius":"weight";if(!row.contains(field)||!row.at(field).is_number())throw std::runtime_error("invalid particle value");const double n=row.at(field).get<double>(),minimum=key=="massWeights"?.001:0,maximum=key=="massWeights"?1000:key=="pinWeights"?1:100000;if(!std::isfinite(n)||n<minimum||n>maximum)throw std::runtime_error("particle value range");}
        if(!seen.insert(identity).second)throw std::runtime_error("duplicate sparse particle/pair");
    }
}
}
