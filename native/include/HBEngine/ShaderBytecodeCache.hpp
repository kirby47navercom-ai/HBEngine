#pragma once
#include <cstdint>
#include <list>
#include <iterator>
#include <string>
#include <unordered_map>
#include <vector>

namespace hb::gpu {
// The owning compiler serializes access. Bound retained bytecode and duplicated key payloads.
class ShaderBytecodeCache {
    struct Entry {std::string key;std::vector<unsigned char> code;std::size_t cost;};
    std::list<Entry> recent;
    std::unordered_map<std::string,std::list<Entry>::iterator> index;
    std::size_t limit,bytes_=0;std::uint64_t hits_=0,misses_=0,evictions_=0;
public:
    ShaderBytecodeCache(const ShaderBytecodeCache&)=delete;ShaderBytecodeCache& operator=(const ShaderBytecodeCache&)=delete;
    explicit ShaderBytecodeCache(std::size_t budget=8*1024*1024):limit(budget){}
    const std::vector<unsigned char>* get(const std::string& key){auto found=index.find(key);if(found==index.end()){++misses_;return nullptr;}++hits_;recent.splice(recent.end(),recent,found->second);return &found->second->code;}
    bool put(const std::string& key,const std::vector<unsigned char>& code){
        if(key.size()>limit/2||code.size()>limit-key.size()*2||limit-key.size()*2-code.size()<128)return false;
        const auto cost=key.size()*2+code.size()+128;auto old=index.find(key);if(old!=index.end()){bytes_-=old->second->cost;recent.erase(old->second);index.erase(old);}
        while(bytes_>limit-cost){bytes_-=recent.front().cost;index.erase(recent.front().key);recent.pop_front();++evictions_;}
        recent.push_back({key,code,cost});index.emplace(recent.back().key,std::prev(recent.end()));bytes_+=cost;return true;
    }
    std::size_t bytes()const{return bytes_;}std::size_t budget()const{return limit;}std::size_t entries()const{return recent.size();}
    std::uint64_t hits()const{return hits_;}std::uint64_t misses()const{return misses_;}std::uint64_t evictions()const{return evictions_;}
};
}
