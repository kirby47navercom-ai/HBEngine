#pragma once
#include <mmdeviceapi.h>
#include <audiopolicy.h>
#include <chrono>
#include <string>

// Audio belongs to the bundled script process. Give only that child's sessions
// the game's identity without modifying the signed vendor executable.
class NativeGameAudioIdentity {
    GUID id{};std::wstring name,icon;std::chrono::steady_clock::time_point next{};
    template<class T>struct Ref{T* p=nullptr;~Ref(){if(p)p->Release();}T** out(){return &p;}};
public:
    void configure(GUID value,std::wstring title,std::wstring executable){id=value;name=std::move(title);icon=std::move(executable);}
    void update(DWORD pid){
        const auto now=std::chrono::steady_clock::now();if(!pid||name.empty()||now<next)return;next=now+std::chrono::seconds(1);
        Ref<IMMDeviceEnumerator> devices;if(FAILED(CoCreateInstance(__uuidof(MMDeviceEnumerator),nullptr,CLSCTX_ALL,__uuidof(IMMDeviceEnumerator),reinterpret_cast<void**>(devices.out()))))return;
        Ref<IMMDeviceCollection> endpoints;if(FAILED(devices.p->EnumAudioEndpoints(eRender,DEVICE_STATE_ACTIVE,endpoints.out())))return;UINT total=0;endpoints.p->GetCount(&total);
        for(UINT deviceIndex=0;deviceIndex<total;deviceIndex++){
            Ref<IMMDevice> device;if(FAILED(endpoints.p->Item(deviceIndex,device.out())))continue;Ref<IAudioSessionManager2> manager;if(FAILED(device.p->Activate(__uuidof(IAudioSessionManager2),CLSCTX_ALL,nullptr,reinterpret_cast<void**>(manager.out()))))continue;
            Ref<IAudioSessionEnumerator> sessions;if(FAILED(manager.p->GetSessionEnumerator(sessions.out())))continue;int count=0;sessions.p->GetCount(&count);
            for(int index=0;index<count;index++){Ref<IAudioSessionControl> control;if(FAILED(sessions.p->GetSession(index,control.out())))continue;Ref<IAudioSessionControl2> owned;if(FAILED(control.p->QueryInterface(__uuidof(IAudioSessionControl2),reinterpret_cast<void**>(owned.out()))))continue;DWORD owner=0;if(FAILED(owned.p->GetProcessId(&owner))||owner!=pid)continue;control.p->SetDisplayName(name.c_str(),nullptr);control.p->SetIconPath(icon.c_str(),nullptr);control.p->SetGroupingParam(&id,nullptr);}
        }
    }
};
