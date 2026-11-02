#pragma once
#include <windows.h>
#include <Xinput.h>
#include <nlohmann/json.hpp>
#include <array>
#include <algorithm>
#include <cstdint>
#include <cmath>
#include <deque>
#include <string>

// Coalesce motion only between input edges. Clicks, text and focus releases keep
// their order even when the script/render worker is busy for several frames.
class NativeGameInputQueue {
    using Json=nlohmann::json;
    std::deque<Json> events;
public:
    std::uint64_t coalesced=0;
    void push(Json event){
        const auto motion=[](const Json& e){return e.value("event",std::string())=="input"&&e.at("packet").contains("pointer")&&!e.at("packet").contains("key");};
        if(!events.empty()&&motion(event)&&motion(events.back())){events.back()=std::move(event);++coalesced;return;}
        if(events.size()>=4096)throw std::runtime_error("Native ordered input queue budget exceeded");
        events.push_back(std::move(event));
    }
    Json take(){Json result=Json::array();for(auto& event:events)result.push_back(std::move(event));events.clear();return result;}
};

class NativeGamepadInput {
public:
    using Read=DWORD (WINAPI *)(DWORD,XINPUT_STATE*);
private:
    HMODULE module=nullptr;Read read=nullptr;bool attempted=false;
    struct Slot {bool connected=false,valid=false;DWORD packet=0;std::uint64_t retry=0;std::array<double,22> values{};};
    std::array<Slot,4> slots{};
    static constexpr std::array<const char*,22> names={"gamepad_dpad_up","gamepad_dpad_down","gamepad_dpad_left","gamepad_dpad_right","gamepad_special_right","gamepad_special_left","gamepad_leftthumbstick","gamepad_rightthumbstick","gamepad_leftshoulder","gamepad_rightshoulder","gamepad_facebutton_bottom","gamepad_facebutton_right","gamepad_facebutton_left","gamepad_facebutton_top","gamepad_leftx","gamepad_lefty","gamepad_rightx","gamepad_righty","gamepad_lefttriggeraxis","gamepad_righttriggeraxis","gamepad_lefttrigger","gamepad_righttrigger"};
    static void stick(SHORT x,SHORT y,double dead,double& a,double& b){const double length=std::hypot(double(x),double(y));if(length<=dead){a=b=0;return;}const double scaled=std::min(1.0,(length-dead)/(32767.0-dead));a=x/length*scaled;b=y/length*scaled;}
public:
    explicit NativeGamepadInput(Read provider=nullptr):read(provider),attempted(provider!=nullptr){}
    NativeGamepadInput(const NativeGamepadInput&)=delete;
    ~NativeGamepadInput(){if(module)FreeLibrary(module);}
    template<class Emit> void poll(std::uint64_t now,bool focused,Emit emit){
        // Stamp/build/headless operations must never initialize controller drivers.
        if(focused&&!attempted){attempted=true;for(const auto name:{L"xinput1_4.dll",L"xinput9_1_0.dll"}){module=LoadLibraryExW(name,nullptr,LOAD_LIBRARY_SEARCH_SYSTEM32);if(!module)continue;read=reinterpret_cast<Read>(GetProcAddress(module,"XInputGetState"));if(read)break;FreeLibrary(module);module=nullptr;}}
        constexpr WORD masks[]={XINPUT_GAMEPAD_DPAD_UP,XINPUT_GAMEPAD_DPAD_DOWN,XINPUT_GAMEPAD_DPAD_LEFT,XINPUT_GAMEPAD_DPAD_RIGHT,XINPUT_GAMEPAD_START,XINPUT_GAMEPAD_BACK,XINPUT_GAMEPAD_LEFT_THUMB,XINPUT_GAMEPAD_RIGHT_THUMB,XINPUT_GAMEPAD_LEFT_SHOULDER,XINPUT_GAMEPAD_RIGHT_SHOULDER,XINPUT_GAMEPAD_A,XINPUT_GAMEPAD_B,XINPUT_GAMEPAD_X,XINPUT_GAMEPAD_Y};
        for(DWORD index=0;index<slots.size();index++){
            auto& slot=slots[index];auto publish=[&](const std::array<double,22>& next){for(std::size_t k=0;k<next.size();k++)if(next[k]!=slot.values[k])emit(names[k],next[k],"native:gamepad:"+std::to_string(index));slot.values=next;};
            if(!focused){publish({});slot.valid=false;continue;}
            if(!read||!slot.connected&&now<slot.retry)continue;
            XINPUT_STATE state{};if(read(index,&state)!=ERROR_SUCCESS){publish({});slot.connected=slot.valid=false;slot.retry=now+1000;continue;}
            slot.connected=true;if(slot.valid&&state.dwPacketNumber==slot.packet)continue;
            slot.valid=true;slot.packet=state.dwPacketNumber;std::array<double,22> next{};
            for(std::size_t k=0;k<14;k++)next[k]=(state.Gamepad.wButtons&masks[k])?1:0;
            stick(state.Gamepad.sThumbLX,state.Gamepad.sThumbLY,XINPUT_GAMEPAD_LEFT_THUMB_DEADZONE,next[14],next[15]);
            stick(state.Gamepad.sThumbRX,state.Gamepad.sThumbRY,XINPUT_GAMEPAD_RIGHT_THUMB_DEADZONE,next[16],next[17]);
            next[18]=std::max(0.0,(double(state.Gamepad.bLeftTrigger)-XINPUT_GAMEPAD_TRIGGER_THRESHOLD)/(255-XINPUT_GAMEPAD_TRIGGER_THRESHOLD));
            next[19]=std::max(0.0,(double(state.Gamepad.bRightTrigger)-XINPUT_GAMEPAD_TRIGGER_THRESHOLD)/(255-XINPUT_GAMEPAD_TRIGGER_THRESHOLD));
            next[20]=next[18]>0?1:0;next[21]=next[19]>0?1:0;publish(next);
        }
    }
};
