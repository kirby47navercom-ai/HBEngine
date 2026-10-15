#include <HBEngine/ShaderBytecodeCache.hpp>
#include <cassert>
#include <iostream>
int main(){
    hb::gpu::ShaderBytecodeCache cache(1024);std::vector<unsigned char> code(300,7);
    assert(!cache.get("absent"));assert(cache.put("a",code));assert(cache.put("b",code));assert(cache.get("a")&&cache.get("a")->at(0)==7);
    assert(cache.put("c",code));assert(!cache.get("b"));assert(cache.get("a")&&cache.get("c"));assert(cache.evictions()==1);assert(cache.bytes()<=cache.budget());
    code[0]=9;assert(cache.put("a",code));assert(cache.get("a")->at(0)==9);const auto bytes=cache.bytes();assert(!cache.put("large",std::vector<unsigned char>(2048)));assert(cache.bytes()==bytes);assert(cache.get("c"));
    hb::gpu::ShaderBytecodeCache empty(0);assert(!empty.put("",{}));assert(empty.bytes()==0);assert(cache.entries()==2);
    std::cout<<"{\"passed\":true,\"payloadBudget\":true,\"LRU\":true,\"replace\":true,\"oversizedRejectedWithoutMutation\":true,\"zeroBudget\":true}";
}
