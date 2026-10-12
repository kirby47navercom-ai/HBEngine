#define UNICODE
#include <windows.h>
#include <mmdeviceapi.h>
#include <audiopolicy.h>
#include <tlhelp32.h>
#include <nlohmann/json.hpp>
#include <iostream>
#include <map>
#include <set>
#include <vector>
using nlohmann::json;
std::string u8(const wchar_t* s){if(!s)return {};int n=WideCharToMultiByte(CP_UTF8,0,s,-1,0,0,0,0);std::string v(n,'\0');WideCharToMultiByte(CP_UTF8,0,s,-1,v.data(),n,0,0);v.pop_back();return v;}
std::wstring wide(const std::string& s){int n=MultiByteToWideChar(CP_UTF8,MB_ERR_INVALID_CHARS,s.data(),int(s.size()),nullptr,0);std::wstring v(n,L'\0');MultiByteToWideChar(CP_UTF8,MB_ERR_INVALID_CHARS,s.data(),int(s.size()),v.data(),n);return v;}
std::string guid(GUID g){wchar_t s[40];StringFromGUID2(g,s,40);return u8(s);}
void check(HRESULT hr){if(FAILED(hr))throw std::runtime_error("CoreAudio "+std::to_string(unsigned(hr)));}
int wmain(int argc,wchar_t** raw){std::vector<std::string> argv;for(int i=0;i<argc;i++)argv.push_back(u8(raw[i]));try{
    if(argc==3&&std::string(argv[1])=="--metadata"){
        const auto file=wide(argv[2]);DWORD unused=0;auto size=GetFileVersionInfoSizeW(file.c_str(),&unused);if(!size)throw std::runtime_error("version info");std::vector<BYTE> bytes(size);if(!GetFileVersionInfoW(file.c_str(),0,size,bytes.data()))throw std::runtime_error("version read");json result;for(const wchar_t* key:{L"FileDescription",L"ProductName",L"OriginalFilename",L"InternalName"}){void* value=nullptr;UINT length=0;const std::wstring query=L"\\StringFileInfo\\040904b0\\"+std::wstring(key);if(!VerQueryValueW(bytes.data(),query.c_str(),&value,&length))throw std::runtime_error("version field");result[u8(key)]=u8(static_cast<wchar_t*>(value));}std::cout<<result.dump();return 0;
    }
    if(argc<2)throw std::runtime_error("Owned test PIDs required");std::set<DWORD> roots;for(int i=1;i<argc;i++){const std::string arg=argv[i];if(arg.find_first_not_of("0123456789")!=std::string::npos)throw std::runtime_error("PID");roots.insert(std::stoul(arg));}if(roots.count(0))throw std::runtime_error("PID zero");
    const auto settings=getenv("HB_AUDIO_TEST_SETTINGS");const auto mutations=settings?json::parse(settings):json::object();for(const auto& item:mutations.items())if(!roots.count(std::stoul(item.key()))||!item.value().contains("volume")||!item.value().contains("mute")||item.value().at("volume").get<float>()<0||item.value().at("volume").get<float>()>1)throw std::runtime_error("Owned volume mutation");
    check(CoInitializeEx(nullptr,COINIT_MULTITHREADED));std::map<DWORD,DWORD> parents;HANDLE snapshot=CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS,0);PROCESSENTRY32W entry{sizeof(entry)};if(Process32FirstW(snapshot,&entry))do{parents[entry.th32ProcessID]=entry.th32ParentProcessID;}while(Process32NextW(snapshot,&entry));CloseHandle(snapshot);
    auto owner=[&](DWORD pid){std::set<DWORD> seen;while(pid&&seen.insert(pid).second){if(roots.count(pid))return pid;pid=parents[pid];}return DWORD(0);};
    IMMDeviceEnumerator* devices=nullptr;check(CoCreateInstance(__uuidof(MMDeviceEnumerator),0,CLSCTX_ALL,__uuidof(IMMDeviceEnumerator),reinterpret_cast<void**>(&devices)));IMMDeviceCollection* collection=nullptr;check(devices->EnumAudioEndpoints(eRender,DEVICE_STATE_ACTIVE,&collection));UINT endpoints=0;check(collection->GetCount(&endpoints));json rows=json::array();
    for(UINT d=0;d<endpoints;d++){
        IMMDevice* device=nullptr;check(collection->Item(d,&device));IAudioSessionManager2* manager=nullptr;check(device->Activate(__uuidof(IAudioSessionManager2),CLSCTX_ALL,0,reinterpret_cast<void**>(&manager)));IAudioSessionEnumerator* sessions=nullptr;check(manager->GetSessionEnumerator(&sessions));int count=0;check(sessions->GetCount(&count));
        for(int i=0;i<count;i++){
            IAudioSessionControl* control=nullptr;check(sessions->GetSession(i,&control));IAudioSessionControl2* control2=nullptr;check(control->QueryInterface(__uuidof(IAudioSessionControl2),reinterpret_cast<void**>(&control2)));DWORD pid=0;check(control2->GetProcessId(&pid));const auto root=owner(pid);
            if(root){
                LPWSTR name=nullptr,id=nullptr,instance=nullptr,icon=nullptr;GUID group{};AudioSessionState state{};check(control->GetDisplayName(&name));check(control->GetIconPath(&icon));check(control->GetGroupingParam(&group));check(control->GetState(&state));check(control2->GetSessionIdentifier(&id));check(control2->GetSessionInstanceIdentifier(&instance));ISimpleAudioVolume* volume=nullptr;check(control->QueryInterface(__uuidof(ISimpleAudioVolume),reinterpret_cast<void**>(&volume)));
                const auto at=mutations.find(std::to_string(root));if(at!=mutations.end()){check(volume->SetMasterVolume(at->at("volume").get<float>(),nullptr));check(volume->SetMute(at->at("mute").get<bool>(),nullptr));}
                float level=0;BOOL mute=0;check(volume->GetMasterVolume(&level));check(volume->GetMute(&mute));rows.push_back({{"pid",pid},{"owner",root},{"name",u8(name)},{"id",u8(id)},{"instance",u8(instance)},{"icon",u8(icon)},{"group",guid(group)},{"state",int(state)},{"volume",level},{"mute",bool(mute)}});volume->Release();CoTaskMemFree(name);CoTaskMemFree(id);CoTaskMemFree(instance);CoTaskMemFree(icon);
            }
            control2->Release();control->Release();
        }
        sessions->Release();manager->Release();device->Release();
    }
    collection->Release();devices->Release();CoUninitialize();std::cout<<rows.dump();return 0;
}catch(const std::exception& e){std::cerr<<e.what();return 1;}}
