#pragma once
#include <windows.h>
#include <objbase.h>
#include <algorithm>
#include <vector>
#include <cstdint>
#include <stdexcept>
#include <array>
#include <atomic>
#include <condition_variable>
#include <functional>
#include <mutex>
#include <thread>

// One acknowledged local frame at a time. Large pixels never enter JSON/base64.
class NativeUIPipe {
public:
    struct Frame {std::uint64_t id=0,sequence=0;unsigned width=0,height=0;bool tiles=false;std::vector<BYTE> pixels;};
private:
    HANDLE pipe=INVALID_HANDLE_VALUE,stopped=nullptr,event=nullptr;
    std::thread reader;std::atomic<bool> stopping{false},ended{false};std::atomic<DWORD> clientPID{0};
    std::mutex mutex;std::condition_variable available;Frame frame;bool pending=false;std::string failure;
    HWND window=nullptr;UINT message=0;
    bool finish(OVERLAPPED& operation,DWORD& bytes){
        HANDLE events[]={stopped,event};const auto result=WaitForMultipleObjects(2,events,FALSE,INFINITE);
        if(result!=WAIT_OBJECT_0+1){CancelIoEx(pipe,&operation);GetOverlappedResult(pipe,&operation,&bytes,TRUE);return false;}
        return GetOverlappedResult(pipe,&operation,&bytes,FALSE)!=FALSE;
    }
    bool read(void* destination,std::size_t size){
        auto* at=static_cast<BYTE*>(destination);
        while(size&&!stopping){ResetEvent(event);OVERLAPPED operation{};operation.hEvent=event;DWORD bytes=0;
            if(!ReadFile(pipe,at,DWORD(std::min<std::size_t>(size,16*1048576)),&bytes,&operation)){
                if(GetLastError()!=ERROR_IO_PENDING||!finish(operation,bytes)){if(stopping)return false;throw std::runtime_error("Native UI pipe read failed or truncated");}
            }
            if(!bytes){if(stopping)return false;throw std::runtime_error("Native UI pipe truncated frame");}at+=bytes;size-=bytes;
        }return !size;
    }
    static std::uint32_t u32(const BYTE* p){return std::uint32_t(p[0])|(std::uint32_t(p[1])<<8)|(std::uint32_t(p[2])<<16)|(std::uint32_t(p[3])<<24);}
    static std::uint64_t u64(const BYTE* p){return std::uint64_t(u32(p))|(std::uint64_t(u32(p+4))<<32);}
public:
    static bool isClose(const std::array<BYTE,40>& bytes){
        if(u32(bytes.data())!=0x49554248||u32(bytes.data()+4)!=1||u32(bytes.data()+36)!=1)return false;
        return std::all_of(bytes.begin()+8,bytes.begin()+36,[](BYTE value){return value==0;});
    }
    bool closed()const{return ended.load();}
    static void header(const std::array<BYTE,40>& bytes,Frame& result){
        const auto* p=bytes.data();const auto id=u64(p+8),sequence=u64(p+16);const auto width=u32(p+24),height=u32(p+28),size=u32(p+32),flags=u32(p+36);
        if(u32(p)!=0x49554248||u32(p+4)!=1||(flags!=0&&flags!=2)||!id||id>9007199254740991ull||!sequence||sequence>9007199254740991ull||!width||!height||width>7680||height>4320||(flags==2?(sequence<2||size<4||size>=std::uint64_t(width)*height*4):std::uint64_t(width)*height*4!=size)||size>128*1024*1024)throw std::runtime_error("Native binary UI header invalid");
        result.id=id;result.sequence=sequence;result.tiles=flags==2;result.width=width;result.height=height;
        if(result.pixels.capacity()>std::size_t(size)*2)std::vector<BYTE>().swap(result.pixels);
        result.pixels.resize(size);
    }
    std::wstring start(HWND target,UINT notification){
        window=target;message=notification;GUID guid{};if(FAILED(CoCreateGuid(&guid)))throw std::runtime_error("Native UI pipe identity");wchar_t token[40];StringFromGUID2(guid,token,40);const auto name=L"\\\\.\\pipe\\HBEngine.UI."+std::to_wstring(GetCurrentProcessId())+L"."+token;
        stopped=CreateEventW(nullptr,TRUE,FALSE,nullptr);event=CreateEventW(nullptr,TRUE,FALSE,nullptr);
        if(!stopped||!event)throw std::runtime_error("Native UI pipe events");
        pipe=CreateNamedPipeW(name.c_str(),PIPE_ACCESS_DUPLEX|FILE_FLAG_OVERLAPPED|FILE_FLAG_FIRST_PIPE_INSTANCE,PIPE_TYPE_BYTE|PIPE_READMODE_BYTE|PIPE_WAIT|PIPE_REJECT_REMOTE_CLIENTS,1,4096,4*1048576,0,nullptr);
        if(pipe==INVALID_HANDLE_VALUE)throw std::runtime_error("Native UI pipe creation");
        reader=std::thread([this]{try{
            OVERLAPPED operation{};operation.hEvent=event;DWORD transferred=0;
            if(!ConnectNamedPipe(pipe,&operation)){const auto error=GetLastError();if(error!=ERROR_PIPE_CONNECTED&&(error!=ERROR_IO_PENDING||!finish(operation,transferred))){if(stopping)return;throw std::runtime_error("Native UI pipe connect failed");}}
            ULONG actualPID=0;if(!GetNamedPipeClientProcessId(pipe,&actualPID)||actualPID!=clientPID.load())throw std::runtime_error("Native UI pipe client mismatch");
            std::uint64_t last=0;for(;;){std::array<BYTE,40> bytes{};if(!read(bytes.data(),bytes.size()))return;if(isClose(bytes)){ended=true;return;}header(bytes,frame);if(last&&frame.sequence!=last+1&&frame.sequence!=1)throw std::runtime_error("Native binary UI sequence mismatch");if(!read(frame.pixels.data(),frame.pixels.size()))return;last=frame.sequence;
                std::unique_lock<std::mutex> lock(mutex);pending=true;PostMessageW(window,message,0,0);available.wait(lock,[this]{return !pending||stopping;});if(stopping)return;
            }
        }catch(const std::exception& e){if(stopping)return;{std::lock_guard<std::mutex> lock(mutex);failure=e.what();}PostMessageW(window,message,0,0);}});
        return name;
    }
    void allow(DWORD pid){clientPID=pid;}
    template<class F> void consume(F callback){std::lock_guard<std::mutex> lock(mutex);if(!failure.empty())throw std::runtime_error(failure);if(!pending)return;try{callback(frame);}catch(...){pending=false;available.notify_one();throw;}pending=false;available.notify_one();}
    void stop(){if(stopping.exchange(true))return;if(stopped)SetEvent(stopped);if(pipe!=INVALID_HANDLE_VALUE)CancelIoEx(pipe,nullptr);available.notify_all();if(reader.joinable())reader.join();if(pipe!=INVALID_HANDLE_VALUE){DisconnectNamedPipe(pipe);CloseHandle(pipe);pipe=INVALID_HANDLE_VALUE;}if(event){CloseHandle(event);event=nullptr;}if(stopped){CloseHandle(stopped);stopped=nullptr;}}
    ~NativeUIPipe(){stop();}
};
