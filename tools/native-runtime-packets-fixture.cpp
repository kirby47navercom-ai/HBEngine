#include "../native/desktop/NativeRuntimePackets.hpp"
#include <cassert>
#include <iostream>

int main(){
 using Packet=NativeRuntimePackets::Packet;
 const std::string json="{\"op\":\"upload\"}",raw("\0\n\xffhello",8);
 std::string wire(16,0);const auto put=[&](unsigned at,std::uint32_t n){for(unsigned i=0;i<4;i++)wire[at+i]=char(n>>(i*8));};
 put(0,0x52424800);put(4,json.size());put(8,raw.size());put(12,1);wire+=json+raw;
 const auto mixed=std::string("first\n")+wire+wire+"last\n";
 for(unsigned step=1;step<65;step++){NativeRuntimePackets parser;std::vector<Packet> packets;
  for(std::size_t at=0;at<mixed.size();at+=step)parser.append(mixed.data()+at,std::min<std::size_t>(step,mixed.size()-at),[&](Packet p){packets.push_back(std::move(p));});
  parser.finish();assert(packets.size()==4&&packets[0].text=="first"&&packets[3].text=="last");
  for(unsigned i=1;i<3;i++)assert(packets[i].text==json&&std::string(packets[i].binary.begin(),packets[i].binary.end())==raw);
 }
 unsigned rejected=0;for(std::size_t end=1;end<wire.size();end++){try{NativeRuntimePackets parser;parser.append(wire.data(),end,[](Packet){});parser.finish();assert(false);}catch(const std::runtime_error&){++rejected;}}
 for(unsigned field:{0u,4u,8u,12u}){auto bad=wire;for(unsigned i=0;i<4;i++)bad[field+i]=char(field==0&&i==0?0:0xff);try{NativeRuntimePackets parser;parser.append(bad.data(),bad.size(),[](Packet){});assert(false);}catch(const std::runtime_error&){++rejected;}}
 std::cout<<"{\"passed\":true,\"chunkSizes\":64,\"malformedAndTruncated\":"<<rejected<<"}\n";
}
