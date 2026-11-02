#include <nlohmann/json.hpp>
#include "NativeGameInput.hpp"
#include <iostream>
#include <cassert>
using Json=nlohmann::json;
static std::array<XINPUT_STATE,4> states{};
static std::array<bool,4> connected{};
static std::array<unsigned,4> reads{};
static DWORD WINAPI readPad(DWORD i,XINPUT_STATE* out){++reads[i];if(!connected[i])return ERROR_DEVICE_NOT_CONNECTED;*out=states[i];return ERROR_SUCCESS;}
int main(){
 NativeGameInputQueue queue;for(int i=0;i<10000;i++)queue.push({{"event","input"},{"packet",{{"device","mouse"},{"pointer",{{"position",{i,0}},{"size",{20000,100}}}}}}});
 queue.push({{"event","input"},{"packet",{{"key","leftmousebutton"},{"value",1}}}});queue.push({{"event","text"},{"text","한"}});queue.push({{"event","releaseInput"}});const auto events=queue.take();assert(events.size()==4&&events[0]["packet"]["pointer"]["position"][0]==9999&&events[2]["text"]=="한");assert(queue.coalesced==9999&&queue.take().empty());
 NativeGamepadInput pads(readPad);Json changes=Json::array();auto emit=[&](const char* key,double value,const std::string& source){assert(std::isfinite(value)&&std::abs(value)<=1);changes.push_back({{"key",key},{"value",value},{"source",source}});};
 connected[0]=true;states[0].dwPacketNumber=1;states[0].Gamepad.wButtons=XINPUT_GAMEPAD_A;states[0].Gamepad.sThumbLX=-32768;states[0].Gamepad.sThumbLY=32767;states[0].Gamepad.bLeftTrigger=255;
 pads.poll(0,true,emit);const auto initial=changes;assert(changes.size()==5);double x=0,y=0;for(const auto& c:changes){if(c["key"]=="gamepad_leftx")x=c["value"];if(c["key"]=="gamepad_lefty")y=c["value"];}assert(std::abs(std::hypot(x,y)-1)<1e-9);
 changes.clear();pads.poll(1,true,emit);assert(changes.empty()&&reads[0]==2&&reads[1]==1);pads.poll(2,false,emit);assert(changes.size()==5);for(const auto& c:changes)assert(c["value"]==0);changes.clear();pads.poll(3,true,emit);assert(changes==initial);
 changes.clear();connected[0]=false;pads.poll(4,true,emit);assert(changes.size()==5);changes.clear();const auto before=reads[0];pads.poll(999,true,emit);assert(reads[0]==before&&changes.empty());connected[0]=connected[1]=true;states[1].dwPacketNumber=1;states[1].Gamepad.wButtons=XINPUT_GAMEPAD_A;pads.poll(1004,true,emit);assert(changes.size()==6);bool second=false;for(const auto& c:changes)if(c["source"]=="native:gamepad:1")second=true;assert(second);
 changes.clear();states[0].dwPacketNumber=2;states[0].Gamepad={};states[0].Gamepad.sThumbLX=100;states[0].Gamepad.bLeftTrigger=10;pads.poll(1005,true,emit);assert(changes.size()==5);for(const auto& c:changes)assert(c["value"]==0);
 std::cout<<Json{{"passed",true},{"motionEvents",10000},{"coalesced",queue.coalesced},{"gamepadChanges",initial},{"hardwareInjected",true},{"fourSlots",true},{"focusRestore",true},{"hotplugBackoff",true},{"deadZones",true}}.dump();
}
