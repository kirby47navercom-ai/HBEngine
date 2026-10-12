#pragma once
#include <mmdeviceapi.h>
#include <audioclient.h>
#include <audiopolicy.h>
#include <thread>
#include <mutex>
#include <atomic>
#include <vector>
#include <cmath>
#include <cstring>

class NativeAudio {
    static constexpr size_t frames=4096,block=512,slots=4;
    std::mutex mutex;std::vector<float> queue;
    size_t head=0,count=0;uint64_t sequence=0,submitted=0,rendered=0,dropped=0,underflows=0;float peak=0;
    HANDLE stop=nullptr,wake=nullptr;std::thread worker;std::atomic<bool> available{false},changed{false};std::atomic<long> lastError{0};std::atomic<UINT32> deviceFrames{0};
    ICoreWebView2SharedBuffer* shared=nullptr;BYTE* memory=nullptr;GUID identity{};std::wstring name,icon;bool silentTest=false;
    static void check(HRESULT hr){if(FAILED(hr))throw std::runtime_error("Windows audio HRESULT "+std::to_string(static_cast<unsigned>(hr)));}
    struct DeviceEvents:IMMNotificationClient {
        NativeAudio& owner;std::atomic<ULONG> references{1};explicit DeviceEvents(NativeAudio& a):owner(a){}
        HRESULT STDMETHODCALLTYPE QueryInterface(REFIID id,void** p)override{if(!p)return E_POINTER;*p=nullptr;if(id==IID_IUnknown||id==__uuidof(IMMNotificationClient)){*p=this;AddRef();return S_OK;}return E_NOINTERFACE;}
        ULONG STDMETHODCALLTYPE AddRef()override{return ++references;}ULONG STDMETHODCALLTYPE Release()override{auto n=--references;if(!n)delete this;return n;}
        HRESULT STDMETHODCALLTYPE OnDefaultDeviceChanged(EDataFlow flow,ERole role,LPCWSTR)override{if(flow==eRender&&role==eMultimedia){owner.changed=true;SetEvent(owner.wake);}return S_OK;}
        HRESULT STDMETHODCALLTYPE OnDeviceStateChanged(LPCWSTR,DWORD)override{return S_OK;}HRESULT STDMETHODCALLTYPE OnDeviceAdded(LPCWSTR)override{return S_OK;}HRESULT STDMETHODCALLTYPE OnDeviceRemoved(LPCWSTR)override{return S_OK;}HRESULT STDMETHODCALLTYPE OnPropertyValueChanged(LPCWSTR,const PROPERTYKEY)override{return S_OK;}
    };
    void run(){
        const auto initialized=CoInitializeEx(nullptr,COINIT_MULTITHREADED);if(FAILED(initialized)){lastError=initialized;return;}
        IMMDeviceEnumerator* devices=nullptr;DeviceEvents* events=new DeviceEvents(*this);bool registered=false;
        if(SUCCEEDED(CoCreateInstance(__uuidof(MMDeviceEnumerator),nullptr,CLSCTX_ALL,__uuidof(IMMDeviceEnumerator),reinterpret_cast<void**>(&devices))))registered=SUCCEEDED(devices->RegisterEndpointNotificationCallback(events));
        IAudioClient* client=nullptr;IAudioRenderClient* output=nullptr;const auto signal=CreateEventW(nullptr,FALSE,FALSE,nullptr);bool playing=false;ULONGLONG lastInput=GetTickCount64();
        auto release=[&](){available=false;playing=false;if(client)client->Stop();if(output){output->Release();output=nullptr;}if(client){client->Release();client=nullptr;}deviceFrames=0;};
        HANDLE handles[]={stop,wake,signal};
        while(WaitForSingleObject(stop,0)!=WAIT_OBJECT_0){
            if(changed.exchange(false))release();
            size_t queued;{std::lock_guard<std::mutex> lock(mutex);queued=count;}
            if(queued)lastInput=GetTickCount64();
            if(!queued&&playing&&GetTickCount64()-lastInput>300)release();
            if(!client&&queued&&devices){
                IMMDevice* device=nullptr;HRESULT hr=devices->GetDefaultAudioEndpoint(eRender,eMultimedia,&device);
                if(SUCCEEDED(hr))hr=device->Activate(__uuidof(IAudioClient),CLSCTX_ALL,nullptr,reinterpret_cast<void**>(&client));if(device)device->Release();
                WAVEFORMATEX format{};format.wFormatTag=WAVE_FORMAT_IEEE_FLOAT;format.nChannels=2;format.nSamplesPerSec=48000;format.wBitsPerSample=32;format.nBlockAlign=8;format.nAvgBytesPerSec=384000;
                if(SUCCEEDED(hr))hr=client->Initialize(AUDCLNT_SHAREMODE_SHARED,AUDCLNT_STREAMFLAGS_EVENTCALLBACK|AUDCLNT_STREAMFLAGS_AUTOCONVERTPCM|AUDCLNT_STREAMFLAGS_SRC_DEFAULT_QUALITY,200000,0,&format,&identity);
                if(SUCCEEDED(hr))hr=client->SetEventHandle(signal);UINT32 capacity=0;if(SUCCEEDED(hr))hr=client->GetBufferSize(&capacity);
                if(SUCCEEDED(hr))hr=client->GetService(__uuidof(IAudioRenderClient),reinterpret_cast<void**>(&output));
                IAudioSessionControl* session=nullptr;if(SUCCEEDED(hr))hr=client->GetService(__uuidof(IAudioSessionControl),reinterpret_cast<void**>(&session));
                if(session){if(SUCCEEDED(hr))hr=session->SetGroupingParam(&identity,nullptr);if(SUCCEEDED(hr))hr=session->SetDisplayName(name.c_str(),nullptr);if(SUCCEEDED(hr))hr=session->SetIconPath(icon.c_str(),nullptr);if(silentTest){ISimpleAudioVolume* volume=nullptr;if(SUCCEEDED(session->QueryInterface(__uuidof(ISimpleAudioVolume),reinterpret_cast<void**>(&volume)))){volume->SetMute(TRUE,nullptr);volume->Release();}}session->Release();}
                if(FAILED(hr)){lastError=hr;release();WaitForSingleObject(stop,250);continue;}lastError=0;deviceFrames=capacity;available=true;
            }
            if(client){UINT32 padding=0;HRESULT hr=client->GetCurrentPadding(&padding);const UINT32 needed=deviceFrames.load()-std::min(padding,deviceFrames.load());
                if(SUCCEEDED(hr)&&needed){BYTE* bytes=nullptr;hr=output->GetBuffer(needed,&bytes);if(SUCCEEDED(hr)){float* samples=reinterpret_cast<float*>(bytes);size_t copied=0;{std::lock_guard<std::mutex> lock(mutex);copied=std::min<size_t>(needed,count);for(size_t i=0;i<copied;i++){samples[i*2]=queue[head*2];samples[i*2+1]=queue[head*2+1];head=(head+1)%frames;}count-=copied;rendered+=copied;if(playing&&copied<needed&&queued)underflows++;}std::fill(samples+copied*2,samples+needed*2,0.f);hr=output->ReleaseBuffer(needed,copied?0:AUDCLNT_BUFFERFLAGS_SILENT);}}
                if(SUCCEEDED(hr)&&!playing){hr=client->Start();playing=SUCCEEDED(hr);}if(FAILED(hr)){lastError=hr;release();}
            }
            const auto result=WaitForMultipleObjects(3,handles,FALSE,client?100:INFINITE);if(result==WAIT_OBJECT_0)break;
        }
        release();if(devices){if(registered)devices->UnregisterEndpointNotificationCallback(events);devices->Release();}events->Release();CloseHandle(signal);CoUninitialize();
    }
public:
    ~NativeAudio(){shutdown();}
    void configure(GUID id,std::wstring title,std::wstring executable,bool mute){identity=id;name=std::move(title);icon=std::move(executable)+L",-101";silentTest=mute;}
    void initialize(ICoreWebView2Environment* environment,ICoreWebView2* view){
        if(shared)throw std::runtime_error("Windows audio already initialized");ICoreWebView2Environment12* extended=nullptr;ICoreWebView2_17* script=nullptr;
        check(environment->QueryInterface(IID_ICoreWebView2Environment12,reinterpret_cast<void**>(&extended)));const auto result=extended->CreateSharedBuffer(block*2*sizeof(float)*slots,&shared);extended->Release();check(result);check(shared->get_Buffer(&memory));std::memset(memory,0,block*2*sizeof(float)*slots);
        check(view->QueryInterface(IID_ICoreWebView2_17,reinterpret_cast<void**>(&script)));const auto posted=script->PostSharedBufferToScript(shared,COREWEBVIEW2_SHARED_BUFFER_ACCESS_READ_WRITE,L"{\"channel\":\"hb.audio\",\"frames\":512,\"slots\":4,\"channels\":2,\"sampleRate\":48000}");script->Release();check(posted);
        queue.resize(frames*2);stop=CreateEventW(nullptr,TRUE,FALSE,nullptr);wake=CreateEventW(nullptr,FALSE,FALSE,nullptr);if(!stop||!wake)throw std::runtime_error("Windows audio event");worker=std::thread([this](){run();});
    }
    void submit(unsigned slot,uint64_t serial){
        if(!memory||slot>=slots||serial!=sequence+1)throw std::runtime_error("Windows audio block sequence");const auto samples=reinterpret_cast<const float*>(memory)+slot*block*2;
        std::lock_guard<std::mutex> lock(mutex);for(size_t i=0;i<block*2;i++)if(!std::isfinite(samples[i]))throw std::runtime_error("Windows audio nonfinite sample");sequence=serial;
        // Bound latency after an occluded renderer stalls instead of replaying a stale backlog.
        if(count+block>2048){dropped+=count;head=count=0;}
        for(size_t i=0;i<block;i++){const auto at=(head+count+i)%frames;for(size_t c=0;c<2;c++){const float v=std::clamp(samples[i*2+c],-1.f,1.f);queue[at*2+c]=v;peak=std::max(peak,std::abs(v));}}count+=block;submitted+=block;SetEvent(wake);
    }
    nlohmann::json stats(){std::lock_guard<std::mutex> lock(mutex);return {{"available",available.load()},{"error",lastError.load()},{"submittedFrames",submitted},{"renderedFrames",rendered},{"droppedFrames",dropped},{"underflows",underflows},{"peak",peak},{"queuedFrames",count},{"deviceFrames",deviceFrames.load()},{"sharedBytes",shared?16384:0}};}
    void shutdown(){if(stop)SetEvent(stop);if(worker.joinable())worker.join();if(stop){CloseHandle(stop);stop=nullptr;}if(wake){CloseHandle(wake);wake=nullptr;}if(shared){shared->Close();shared->Release();shared=nullptr;memory=nullptr;}head=count=0;sequence=0;std::vector<float>().swap(queue);}
};
