#pragma once
#include <array>
#include <cstdint>
#include <cstring>
#include <string>
#include <vector>
#include <stdexcept>
#include <utility>
#include <algorithm>

// The legacy JSON line stream and binary uploads share one ordered pipe.
class NativeRuntimePackets {
public:
 struct Packet {std::string text;std::vector<unsigned char> binary;};
 static constexpr std::size_t limit=128*1024*1024;
private:
 Packet packet;std::array<unsigned char,16> header{};std::size_t headerSize=0,jsonSize=0,binarySize=0,cursor=0;
 enum class State {text,header,json,binary};State state=State::text;
 static std::uint32_t u32(const unsigned char* p){return std::uint32_t(p[0])|(std::uint32_t(p[1])<<8)|(std::uint32_t(p[2])<<16)|(std::uint32_t(p[3])<<24);}
 template<class F> void emit(F& consume){consume(std::move(packet));packet=Packet{};state=State::text;cursor=headerSize=0;}
public:
 template<class F> void append(const char* data,std::size_t size,F consume){
  while(size){
   if(state==State::text){
    if(packet.text.empty()&&*data==0){state=State::header;continue;}
    const auto* end=static_cast<const char*>(std::memchr(data,'\n',size));const auto count=end?std::size_t(end-data):size;
    if(count>limit-packet.text.size())throw std::runtime_error("Native runtime packet budget exceeded");
    packet.text.append(data,count);data+=count;size-=count;
    if(end){++data;--size;emit(consume);}continue;
   }
   if(state==State::header){
    const auto count=std::min(size,header.size()-headerSize);std::memcpy(header.data()+headerSize,data,count);headerSize+=count;data+=count;size-=count;
    if(headerSize<header.size())continue;
    jsonSize=u32(header.data()+4);binarySize=u32(header.data()+8);
    if(u32(header.data())!=0x52424800||u32(header.data()+12)!=1||!jsonSize||!binarySize||jsonSize>limit||binarySize>limit-jsonSize)throw std::runtime_error("Native binary upload header invalid");
    packet.text.resize(jsonSize);packet.binary.resize(binarySize);cursor=0;state=State::json;continue;
   }
   const auto wanted=state==State::json?jsonSize:binarySize,count=std::min(size,wanted-cursor);
   if(state==State::json)std::memcpy(packet.text.data()+cursor,data,count);else std::memcpy(packet.binary.data()+cursor,data,count);
   cursor+=count;data+=count;size-=count;
   if(cursor==wanted){if(state==State::json){state=State::binary;cursor=0;}else emit(consume);}
  }
 }
 void finish()const{if(state!=State::text||!packet.text.empty())throw std::runtime_error("Native runtime packet truncated");}
};
