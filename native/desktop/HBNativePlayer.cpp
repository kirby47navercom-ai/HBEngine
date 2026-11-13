#include "NativeRuntimePackets.hpp"
#define NOMINMAX
#include <windows.h>
#include <shellapi.h>
#include <shobjidl.h>
#include <filesystem>
#include <fstream>
#include <thread>
#include <mutex>
#include <condition_variable>
#include <deque>
#include <chrono>
#include <regex>
#include <atomic>
#include <unordered_set>
namespace fs=std::filesystem;
#include "SceneRenderBridge.hpp"
#include "WindowsGameIdentity.hpp"
#include "NativeWidgetWindow.hpp"
#include "NativeUIPipe.hpp"
#include "NativeGameInput.hpp"
#include "NativeGameAudioIdentity.hpp"
using Json=nlohmann::json;
namespace {
constexpr UINT debugContinueMessage=WM_APP+42,debugBreakMessage=WM_APP+43;
constexpr UINT tickMessage=WM_APP+39;constexpr UINT uiPipeMessage=WM_APP+38;constexpr UINT packetMessage=WM_APP+37;constexpr std::size_t packetLimit=128*1024*1024;
std::wstring wide(const std::string& s){const int n=MultiByteToWideChar(CP_UTF8,MB_ERR_INVALID_CHARS,s.data(),int(s.size()),nullptr,0);if(n<1&&!s.empty())throw std::runtime_error("UTF8");std::wstring out(n,0);if(n)MultiByteToWideChar(CP_UTF8,MB_ERR_INVALID_CHARS,s.data(),int(s.size()),out.data(),n);return out;}
std::string utf8(const std::wstring& s){const int n=WideCharToMultiByte(CP_UTF8,WC_ERR_INVALID_CHARS,s.data(),int(s.size()),nullptr,0,nullptr,nullptr);if(n<1&&!s.empty())throw std::runtime_error("UTF16");std::string out(n,0);if(n)WideCharToMultiByte(CP_UTF8,WC_ERR_INVALID_CHARS,s.data(),int(s.size()),out.data(),n,nullptr,nullptr);return out;}
std::wstring quote(const std::wstring& text){std::wstring out=L"\"";std::size_t slashes=0;for(auto c:text){if(c==L'\\'){++slashes;continue;}if(c==L'"')out.append(slashes*2+1,L'\\');else out.append(slashes,L'\\');slashes=0;out+=c;}out.append(slashes*2,L'\\');return out+L'"';}
struct Host {
 HWND window=nullptr,editorOwner=nullptr;HANDLE input=nullptr,output=nullptr,process=nullptr,job=nullptr,timer=nullptr;std::thread reader;std::mutex mutex;std::condition_variable space;std::deque<NativeRuntimePackets::Packet> packets;std::atomic<bool> closing{false};bool hidden=false,ready=false,inFrame=false,closeRequested=false,uncapped=false,tickPosted=false,displaySync=false;std::atomic<bool> failed{false};unsigned rate=120,width=1280,height=720;wchar_t highSurrogate=0;std::uint64_t frames=0;std::chrono::steady_clock::time_point last=std::chrono::steady_clock::now(),nextFrame=last;SceneRenderBridge renderer;NativeWidgetWindow ui;NativeUIPipe uiPipe;NativeGameAudioIdentity audioIdentity;NativeGameInputQueue inputQueue;NativeGamepadInput gamepads;unsigned mouseButtons=0;POINT cursor{};std::unordered_set<UINT32> contacts;bool touchAvailable=false;
 bool mouseLocked=false,mouseCaptureRequested=false;
 std::int64_t mouseRelativeX=0,mouseRelativeY=0;
 bool timingReport=false;
 double wakeMS=0,renderCommandMS=0;
 unsigned presentCount=0;
 std::chrono::steady_clock::time_point frameSent;
 bool kiosk=false,kioskFullscreen=false,kioskHideCursor=false,kioskPreventMinimize=false,operatorUnlocked=false;
 unsigned kioskIdleSeconds=0;ULONGLONG lastActivity=GetTickCount64();fs::path root,logFile,debugSnapshot;std::wstring failureMessage;
 void write(Json packet){const auto s=packet.dump()+"\n";std::size_t at=0;while(at<s.size()){DWORD sent=0;if(!WriteFile(input,s.data()+at,DWORD(std::min<std::size_t>(s.size()-at,1048576)),&sent,nullptr)||!sent)throw std::runtime_error("Native game pipe closed");at+=sent;}}
 void log(const std::string& text){std::ofstream(logFile,std::ios::app)<<text<<'\n';}
 void schedule(){if(!ready||inFrame)return;if(uncapped){if(!tickPosted){if(!PostMessageW(window,tickMessage,0,0))throw std::runtime_error("Native uncapped tick queue");tickPosted=true;}return;}const double remaining=std::chrono::duration<double>(nextFrame-std::chrono::steady_clock::now()).count();LARGE_INTEGER due{};due.QuadPart=-std::max<LONGLONG>(1,LONGLONG(remaining*10000000));SetWaitableTimer(timer,&due,0,nullptr,nullptr,FALSE);}
 void start(const fs::path& executable,const fs::path& script,const std::wstring& extra){
  ui.composite=[this](const auto& pixels,unsigned width,unsigned height,const auto* dirty){return renderer.updateOverlay(pixels,width,height,dirty);};
  SECURITY_ATTRIBUTES sa{sizeof(sa),nullptr,TRUE};HANDLE readIn=nullptr,writeOut=nullptr;if(!CreatePipe(&readIn,&input,&sa,0)||!CreatePipe(&output,&writeOut,&sa,0))throw std::runtime_error("Native runtime pipes");SetHandleInformation(input,HANDLE_FLAG_INHERIT,0);SetHandleInformation(output,HANDLE_FLAG_INHERIT,0);
  STARTUPINFOW startup{};startup.cb=sizeof(startup);startup.dwFlags=STARTF_USESTDHANDLES|STARTF_USESHOWWINDOW;startup.wShowWindow=SW_HIDE;startup.hStdInput=readIn;startup.hStdOutput=writeOut;startup.hStdError=CreateFileW(logFile.c_str(),FILE_APPEND_DATA,FILE_SHARE_READ|FILE_SHARE_WRITE,&sa,OPEN_ALWAYS,FILE_ATTRIBUTE_NORMAL,nullptr);PROCESS_INFORMATION info{};const auto uiPipeName=uiPipe.start(window,uiPipeMessage);std::wstring cmd=quote(executable.wstring())+L" "+quote(script.wstring())+L" --package "+quote(root.wstring())+L" --ui-pipe "+quote(uiPipeName)+L" --ui-pipe-protocol 2 --render-binary 1"+extra;
  const bool ok=CreateProcessW(executable.c_str(),cmd.data(),nullptr,nullptr,TRUE,CREATE_NO_WINDOW|CREATE_SUSPENDED,nullptr,root.c_str(),&startup,&info);CloseHandle(readIn);CloseHandle(writeOut);if(startup.hStdError!=INVALID_HANDLE_VALUE)CloseHandle(startup.hStdError);if(!ok)throw std::runtime_error("Native script runtime launch");process=info.hProcess;uiPipe.allow(info.dwProcessId);job=CreateJobObjectW(nullptr,nullptr);if(!job){TerminateProcess(process,1);CloseHandle(info.hThread);throw std::runtime_error("Native process job");}JOBOBJECT_EXTENDED_LIMIT_INFORMATION limits{};limits.BasicLimitInformation.LimitFlags=JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;SetInformationJobObject(job,JobObjectExtendedLimitInformation,&limits,sizeof(limits));if(!AssignProcessToJobObject(job,process)){TerminateProcess(process,1);CloseHandle(info.hThread);throw std::runtime_error("Native process ownership");}ResumeThread(info.hThread);CloseHandle(info.hThread);audioIdentity.start(info.dwProcessId);
  reader=std::thread([this]{try{NativeRuntimePackets parser;char chunk[65536];DWORD size=0;while(ReadFile(output,chunk,sizeof(chunk),&size,nullptr)&&size){parser.append(chunk,size,[this](NativeRuntimePackets::Packet packet){std::unique_lock<std::mutex> lock(mutex);space.wait(lock,[this]{return closing||packets.size()<8;});if(closing)return;packets.push_back(std::move(packet));PostMessageW(window,packetMessage,0,0);});if(closing)return;}parser.finish();}catch(const std::exception& e){failed=true;log(e.what());}DWORD code=0;if(process){WaitForSingleObject(process,100);GetExitCodeProcess(process,&code);}if(code&&code!=STILL_ACTIVE){failed=true;log("script exit "+std::to_string(code));}PostMessageW(window,WM_CLOSE,0,0);});
 }
 void drainUI(){uiPipe.consume([this](const NativeUIPipe::Frame& frame){bool ok=true;std::string error;try{if(frame.tiles)ui.updateRawTiles(window,frame.pixels,frame.width,frame.height,frame.sequence);else ui.updateRaw(window,frame.pixels,frame.width,frame.height,frame.sequence);}catch(const std::exception& e){ok=false;error=e.what();}if(frame.directAck){uiPipe.acknowledge(frame,ok,ui.decodeMS,ui.presentMS,error);return;}if(ok)write({{"channel","hb.platform"},{"id",frame.id},{"ok",true},{"value",{{"ok",true},{"nativeUiDecodeMS",ui.decodeMS},{"nativeUiPresentMS",ui.presentMS}}}});else write({{"channel","hb.platform"},{"id",frame.id},{"ok",false},{"error",error}});});}
 void drain(){for(unsigned i=0;i<8;i++){NativeRuntimePackets::Packet packet;{std::lock_guard<std::mutex> lock(mutex);if(packets.empty())return;packet=std::move(packets.front());packets.pop_front();}space.notify_one();auto message=Json::parse(packet.text);const auto op=message.value("op",std::string());const auto id=message.value("id",std::uint64_t(0));try{
   if(message.value("channel",std::string())=="hb.render"){
       if(op=="frame"&&displaySync)message["data"]["presentInterval"]=1;
       if(op=="frame"&&uncapped)message["data"]["allowTearing"]=true;
       const bool measure=timingReport&&inFrame&&op=="frame";
       const auto before=measure?std::chrono::steady_clock::now():std::chrono::steady_clock::time_point{};
       auto value=renderer.command(message,window,true,&packet.binary);
       if(measure){renderCommandMS+=milliseconds(std::chrono::steady_clock::now()-before);++presentCount;}
       if(op=="init")value["binaryResourceUpload"]=1;if(op=="frame"){value["overlayDraws"]=renderer.overlayDraws();value["overlayUploadBytes"]=renderer.overlayUploadBytes();}write({{"channel","hb.render"},{"id",id},{"ok",true},{"value",value}});}
   else if(message.value("channel",std::string())=="hb.platform"){Json value;if(op=="ui"){const auto& frame=message.at("data");if(frame.value("encoding",std::string())=="zstd-rgba8-premultiplied-rect"){const auto& r=frame.at("rect");if(!r.is_array()||r.size()!=4)throw std::runtime_error("UI rectangle shape invalid");ui.updateRect(window,frame.at("pixels").get<std::string>(),frame.at("width").get<unsigned>(),frame.at("height").get<unsigned>(),frame.at("sequence").get<std::uint64_t>(),frame.at("baseSequence").get<std::uint64_t>(),r.at(0).get<unsigned>(),r.at(1).get<unsigned>(),r.at(2).get<unsigned>(),r.at(3).get<unsigned>());}else if(frame.value("encoding",std::string())=="zstd-rgba8-premultiplied"||frame.value("encoding",std::string())=="zstd-rgba8-premultiplied-xor")ui.updatePixels(window,frame.at("pixels").get<std::string>(),frame.at("width").get<unsigned>(),frame.at("height").get<unsigned>(),frame.value("sequence",std::uint64_t(0)),frame.value("baseSequence",std::uint64_t(0)),frame.value("encoding",std::string())=="zstd-rgba8-premultiplied-xor");else ui.update(window,frame.at("png").get<std::string>());value={{"ok",true},{"nativeUiDecodeMS",ui.decodeMS},{"nativeUiPresentMS",ui.presentMS}};}else if(op=="frameRate"){if(!message.at("data").at("rate").is_number_integer())throw std::runtime_error("Frame rate invalid");const auto requested=message.at("data").at("rate").get<unsigned>();if(requested<15||requested>240)throw std::runtime_error("Frame rate invalid");rate=requested;nextFrame=last+std::chrono::duration_cast<std::chrono::steady_clock::duration>(std::chrono::duration<double>(1.0/rate));value={{"rate",rate},{"effectiveRate",uncapped?0u:rate}};}else if(op=="mouseCapture"){
     mouseCaptureRequested=message.at("data").at("enabled").get<bool>();syncMouseCapture();value={{"locked",mouseLocked}};
   }else if(op=="timingFlush")value={{"frames",frames}};
   else if(op=="capture")value=renderer.command({{"op","capture"},{"data",Json::object()}},window,true);else throw std::runtime_error("Unknown native platform operation");write({{"channel","hb.platform"},{"id",id},{"ok",true},{"value",value}});}
   else if(op=="ready"){ready=true;timingReport=message.value("timingReport",false);activity();uncapped=uncapped||message.value("uncapped",false);displaySync=!uncapped&&message.value("displaySync",false);rate=message.value("rate",120u);if(rate<15||rate>240)throw std::runtime_error("Frame rate invalid");nextFrame=std::chrono::steady_clock::now();touchAvailable=(GetSystemMetrics(SM_DIGITIZER)&(NID_INTEGRATED_TOUCH|NID_EXTERNAL_TOUCH))!=0&&GetSystemMetrics(SM_MAXIMUMTOUCHES)>0;write({{"event","touchDevice"},{"enabled",touchAvailable}});schedule();write({{"event","resize"},{"width",width},{"height",height},{"pixelRatio",GetDpiForWindow(window)/96.0}});}
   else if(op=="debugBreak"){
       if(editorOwner){
           const auto snapshot=message.dump();
           if(snapshot.size()<=128*1024){
               const auto pending=debugSnapshot.wstring()+L".tmp";
               {std::ofstream file(fs::path(pending),std::ios::binary|std::ios::trunc);file<<snapshot;}
               MoveFileExW(pending.c_str(),debugSnapshot.c_str(),MOVEFILE_REPLACE_EXISTING);
           }
           PostMessageW(editorOwner,debugBreakMessage,GetCurrentProcessId(),0);
       }
   }
   else if(op=="frameDone"){
       if(timingReport){
           const double inFlight=milliseconds(std::chrono::steady_clock::now()-frameSent);
           write({{"event","hostFrame"},{"frame",frames},{"wakeMS",wakeMS},{"inFlightMS",inFlight},
               {"renderCommandMS",renderCommandMS},{"renderCommands",presentCount}});
       }
       inFrame=false;++frames;schedule();
   }
   else if(op=="title"){SetWindowTextW(window,wide(message.at("text").get<std::string>()).c_str());}
   else if(op=="quit"){ready=false;PostMessageW(window,WM_CLOSE,0,0);}
   else if(op=="error"){failed=true;ready=false;failureMessage=wide(message.at("message").get<std::string>()).substr(0,3000);log(message.at("message").get<std::string>());PostMessageW(window,WM_CLOSE,0,0);}
   else throw std::runtime_error("Unknown native host operation");
  }catch(const std::exception& e){if(id)write({{"channel",message.value("channel",std::string("hb.render"))},{"id",id},{"ok",false},{"error",e.what()}});else{failed=true;ready=false;log(e.what());PostMessageW(window,WM_CLOSE,0,0);}}}}
 static double milliseconds(std::chrono::steady_clock::duration duration){return std::chrono::duration<double,std::milli>(duration).count();}
 void activity(){lastActivity=GetTickCount64();}
 void tick(){tickPosted=false;if(!ready||inFrame)return;const auto now=std::chrono::steady_clock::now();double seconds=std::chrono::duration<double>(now-last).count();if(!uncapped&&now<nextFrame){schedule();return;}if(timingReport){wakeMS=uncapped?0:std::max(0.,milliseconds(now-nextFrame));renderCommandMS=0;presentCount=0;}last=now;nextFrame+=std::chrono::duration_cast<std::chrono::steady_clock::duration>(std::chrono::duration<double>(1.0/rate));if(nextFrame<now)nextFrame=now;gamepads.poll(GetTickCount64(),GetForegroundWindow()==window,[this](const char* key,double value,const std::string& source){if(value!=0)activity();inputQueue.push({{"event","input"},{"packet",{{"key",key},{"value",value},{"device","gamepad"},{"source",source}}}});});flushMouseMotion();auto events=inputQueue.take();if(!events.empty())write({{"event","inputBatch"},{"events",std::move(events)}});if(kiosk&&!operatorUnlocked&&kioskIdleSeconds&&GetTickCount64()-lastActivity>=ULONGLONG(kioskIdleSeconds)*1000){activity();write({{"event","kioskReset"}});}if(timingReport)frameSent=std::chrono::steady_clock::now();inFrame=true;write({{"event","tick"},{"delta",std::min(.25,seconds)},{"frame",frames}});}
 void character(wchar_t value){activity();if(value>=0xd800&&value<=0xdbff){highSurrogate=value;return;}std::wstring text;if(highSurrogate){if(value>=0xdc00&&value<=0xdfff)text+=highSurrogate;else text+=wchar_t(0xfffd);highSurrogate=0;}if(value>=32&&!(value>=0xdc00&&value<=0xdfff&&text.empty()))text+=value;if(!text.empty())inputQueue.push({{"event","text"},{"text",utf8(text)}});}
 void publishMouseCapture(bool locked,bool motion=false){
    Json pointer={{"position",{cursor.x,cursor.y}},{"size",{width,height}},{"inside",locked},{"locked",locked}};
    if(motion)pointer["relative"]={mouseRelativeX,mouseRelativeY};
    inputQueue.push({{"event","input"},{"packet",{{"device","mouse"},{"pointer",std::move(pointer)}}}});
 }
 void flushMouseMotion(){
    if(mouseLocked&&(mouseRelativeX||mouseRelativeY))publishMouseCapture(true,true);
    mouseRelativeX=mouseRelativeY=0;
 }
 bool clipMouse(){
    RECT bounds{};
    POINT start{},end{};
    if(!GetClientRect(window,&bounds)||bounds.right<1||bounds.bottom<1)return false;
    end={bounds.right,bounds.bottom};
    if(!ClientToScreen(window,&start)||!ClientToScreen(window,&end))return false;
    const RECT screen{start.x,start.y,end.x,end.y};
    return ClipCursor(&screen)!=FALSE;
 }
 void releaseMouseCapture(bool publish){
    if(!mouseLocked)return;
    mouseLocked=false;mouseRelativeX=mouseRelativeY=0;
    ClipCursor(nullptr);
    RAWINPUTDEVICE mouse{1,2,RIDEV_REMOVE,nullptr};RegisterRawInputDevices(&mouse,1,sizeof(mouse));
    if(publish){SetCursor(LoadCursorW(nullptr,IDC_ARROW));publishMouseCapture(false);}
 }
 void syncMouseCapture(){
    if(!mouseCaptureRequested||hidden||!IsWindowVisible(window)||GetForegroundWindow()!=window){
        releaseMouseCapture(true);return;
    }
    if(mouseLocked)return;
    RAWINPUTDEVICE mouse{1,2,0,window};
    if(!RegisterRawInputDevices(&mouse,1,sizeof(mouse)))return;
    if(!clipMouse()){
        mouse.dwFlags=RIDEV_REMOVE;mouse.hwndTarget=nullptr;RegisterRawInputDevices(&mouse,1,sizeof(mouse));return;
    }
    mouseLocked=true;cursor={LONG(width/2),LONG(height/2)};
    SetCursor(nullptr);publishMouseCapture(true);
 }
 void rawMouse(LPARAM handle){
    RAWINPUT data{};UINT size=sizeof(data);
    if(GetRawInputData(reinterpret_cast<HRAWINPUT>(handle),RID_INPUT,&data,&size,sizeof(RAWINPUTHEADER))==UINT(-1)||
        data.header.dwType!=RIM_TYPEMOUSE||(data.data.mouse.usFlags&MOUSE_MOVE_ABSOLUTE))return;
    const auto& mouse=data.data.mouse;
    if(mouse.lLastX||mouse.lLastY)activity();
    mouseRelativeX=std::clamp(mouseRelativeX+mouse.lLastX,std::int64_t(-2000000),std::int64_t(2000000));
    mouseRelativeY=std::clamp(mouseRelativeY+mouse.lLastY,std::int64_t(-2000000),std::int64_t(2000000));
 }
 void pointer(LPARAM point){if(mouseLocked){flushMouseMotion();return;}POINT at{short(LOWORD(point)),short(HIWORD(point))};if(at.x!=cursor.x||at.y!=cursor.y)activity();cursor=at;inputQueue.push({{"event","input"},{"packet",{{"device","mouse"},{"pointer",{{"position",{at.x,at.y}},{"size",{width,height}},{"inside",at.x>=0&&at.y>=0&&at.x<int(width)&&at.y<int(height)}}}}}});}
 bool touch(UINT message,WPARAM parameter){
    const auto id=UINT32(GET_POINTERID_WPARAM(parameter));
    const auto source="native:touch:"+std::to_string(id);
    POINTER_INFO info{};
    if(message!=WM_POINTERCAPTURECHANGED&&GetPointerInfo(id,&info)&&info.pointerType==PT_TOUCH){
        const bool down=message==WM_POINTERDOWN,up=message==WM_POINTERUP,cancel=(info.pointerFlags&POINTER_FLAG_CANCELED)!=0;
        if(down&&!cancel){
            if(!touchAvailable){touchAvailable=true;write({{"event","touchDevice"},{"enabled",true}});}
            contacts.insert(id);
        }
        if(!contacts.count(id))return true;
        activity();
        POINT at=info.ptPixelLocation;ScreenToClient(window,&at);
        const bool inside=at.x>=0&&at.y>=0&&at.x<int(width)&&at.y<int(height);
        const Json position={{"position",{at.x,at.y}},{"size",{width,height}},{"inside",inside}};
        Json packet={{"device","touch"},{"source",source},{"pointer",position}};
        if(down||up||cancel){packet["key"]="leftmousebutton";packet["value"]=down&&!cancel?1:0;}
        if(cancel)packet["cancelled"]=true;
        if(up||cancel)contacts.erase(id);
        inputQueue.push({{"event","input"},{"packet",std::move(packet)}});return true;
    }
    if(contacts.erase(id)){
        inputQueue.push({{"event","input"},{"packet",{{"device","touch"},{"source",source},{"key","leftmousebutton"},{"value",0},{"cancelled",true}}}});return true;
    }
    return false;
 }
 void key(const std::string& key,bool down,const std::string& device="keyboard"){flushMouseMotion();if(down)activity();inputQueue.push({{"event","input"},{"packet",{{"key",key},{"value",down?1:0},{"device",device}}}});}
 void releaseMouse(){const auto held=mouseButtons;mouseButtons=0;for(unsigned i=0;i<5;i++)if(held&(1u<<i))key(i==0?"leftmousebutton":i==1?"rightmousebutton":i==2?"middlemousebutton":i==3?"thumbmousebutton":"thumbmousebutton2",false,"mouse");if(GetCapture()==window)ReleaseCapture();}
 void releaseInput(){releaseMouseCapture(false);highSurrogate=0;contacts.clear();inputQueue.push({{"event","releaseInput"}});releaseMouse();gamepads.poll(GetTickCount64(),false,[this](const char* key,double value,const std::string& source){inputQueue.push({{"event","input"},{"packet",{{"key",key},{"value",value},{"device","gamepad"},{"source",source}}}});});}
 void stop(){if(closing)return;releaseMouseCapture(false);{std::lock_guard<std::mutex> lock(mutex);closing=true;}space.notify_all();uiPipe.stop();audioIdentity.stop();if(input){CloseHandle(input);input=nullptr;}if(process&&WaitForSingleObject(process,2000)==WAIT_TIMEOUT)TerminateProcess(process,0);if(reader.joinable())reader.join();if(output)CloseHandle(output);if(process)CloseHandle(process);if(job)CloseHandle(job);renderer.shutdown();}
 ~Host(){stop();if(timer)CloseHandle(timer);}
};
LRESULT CALLBACK procedure(HWND,UINT,WPARAM,LPARAM);
int playEditorProject(Host& host,HINSTANCE instance,const fs::path& project,const fs::path& profile,HWND owner,int show,std::wstring extra){
    host.editorOwner=owner;
    if(!fs::is_regular_file(project)||_wcsicmp(project.extension().c_str(),L".hbproject")||!fs::is_directory(profile))throw std::runtime_error("Editor play project or profile");
    const auto state=profile/L"Play"/(std::to_wstring(GetCurrentProcessId())+L"-"+std::to_wstring(GetTickCount64()));
    if(!fs::create_directories(state))throw std::runtime_error("Editor play state already exists");
    struct SessionDirectory {
        fs::path path,parent,debug;
        ~SessionDirectory(){
            if(!debug.empty()){DeleteFileW(debug.c_str());DeleteFileW((debug.wstring()+L".tmp").c_str());}
            std::error_code error;
            const auto current=fs::canonical(path,error);
            if(!error&&current==path&&current.parent_path()==parent)fs::remove_all(current,error);
        }
    } cleanup{fs::canonical(state),fs::canonical(profile)/L"Play",{}};
    host.logFile=profile/L"Sessions"/(L"play-"+std::to_wstring(GetCurrentProcessId())+L".log");
    fs::create_directories(host.logFile.parent_path());
    host.debugSnapshot=host.logFile.parent_path()/(L"debug-"+std::to_wstring(GetCurrentProcessId())+L".json");
    cleanup.debug=host.debugSnapshot;
    const auto cache=profile/L"Cache"/L"ShaderBytecode";
    auto bundled=host.root/L"Shaders";
    if(!fs::is_directory(bundled))bundled=host.root/L"dist/HBEngine/Shaders";
    fs::create_directories(cache);
    if(fs::is_directory(bundled))for(const auto& entry:fs::directory_iterator(bundled))if(entry.is_regular_file()&&!entry.is_symlink()){
        std::error_code error;fs::copy_file(entry.path(),cache/entry.path().filename(),fs::copy_options::skip_existing,error);
    }
    hb::gpu::SceneRenderer::configureShaderCache(cache);
    host.timer=CreateWaitableTimerExW(nullptr,nullptr,2,TIMER_ALL_ACCESS);
    if(!host.timer)host.timer=CreateWaitableTimerW(nullptr,FALSE,nullptr);
    if(!host.timer)throw std::runtime_error("Native frame timer");
    WNDCLASSW type{};type.lpfnWndProc=procedure;type.hInstance=instance;type.lpszClassName=L"HBEngine.NativeGame";type.hCursor=LoadCursorW(nullptr,IDC_ARROW);
    RegisterClassW(&type);
    const auto title=L"플레이 · "+project.stem().wstring();
    const auto window=CreateWindowExW(WS_EX_APPWINDOW,type.lpszClassName,title.c_str(),WS_OVERLAPPEDWINDOW,CW_USEDEFAULT,CW_USEDEFAULT,1296,759,owner,nullptr,instance,&host);
    if(!window)throw std::runtime_error("Native editor play window");
    SetEnvironmentVariableW(L"DISABLE_SYSTEM_FONTS_LOAD",L"1");
    auto node=host.root/L"runtime/node.exe";
    if(!fs::is_regular_file(node))node=host.root/L"dist/HBEngine/runtime/node.exe";
    GUID playAudio{};
    if(FAILED(CoCreateGuid(&playAudio)))throw std::runtime_error("Editor play audio identity");
    host.audioIdentity.configure(playAudio,title,(host.root/L"HBNativePlayer.exe").wstring());
    extra+=L" --editor-project "+quote(project.wstring())+L" --editor-state "+quote(state.wstring());
    host.start(node,host.root/L"tools/native-game-runner.mjs",extra);
    if(!host.hidden)ShowWindow(window,show);
    MSG message{};bool running=true;
    while(running){
        const auto result=MsgWaitForMultipleObjectsEx(1,&host.timer,INFINITE,QS_ALLINPUT,MWMO_INPUTAVAILABLE);
        if(result==WAIT_OBJECT_0)host.tick();
        else if(result==WAIT_FAILED)throw std::runtime_error("Native message wait");
        while(PeekMessageW(&message,nullptr,0,0,PM_REMOVE)){
            if(message.message==WM_QUIT){running=false;break;}
            TranslateMessage(&message);DispatchMessageW(&message);
        }
    }
    host.stop();
    if(host.failed&&!host.hidden)MessageBoxW(owner,(L"편집기 플레이 중 오류가 발생했어요.\n"+host.failureMessage+L"\n"+host.logFile.wstring()).c_str(),L"HBEngine",MB_OK|MB_ICONERROR);
    return host.failed?1:0;
}
LRESULT CALLBACK procedure(HWND window,UINT message,WPARAM w,LPARAM l){auto* h=reinterpret_cast<Host*>(GetWindowLongPtrW(window,GWLP_USERDATA));if(message==WM_NCCREATE){h=static_cast<Host*>(reinterpret_cast<CREATESTRUCTW*>(l)->lpCreateParams);h->window=window;SetWindowLongPtrW(window,GWLP_USERDATA,reinterpret_cast<LONG_PTR>(h));}if(!h)return DefWindowProcW(window,message,w,l);try{switch(message){case debugContinueMessage:if(h->editorOwner&&h->ready)h->write({{"event","debugContinue"},{"step",w!=0}});return 0;case tickMessage:h->tick();return 0;case uiPipeMessage:h->drainUI();return 0;case packetMessage:h->drain();return 0;case WM_MOVE:case WM_SHOWWINDOW:h->ui.place(window);if(h->mouseLocked&&!h->clipMouse())h->releaseMouseCapture(true);break;
 case WM_INPUT:if(h->mouseLocked)h->rawMouse(l);return DefWindowProcW(window,message,w,l);
 case WM_SETFOCUS:if(h->ready)h->syncMouseCapture();break;
 case WM_SETCURSOR:
    if((h->mouseLocked||(h->kiosk&&h->kioskHideCursor&&!h->operatorUnlocked))&&LOWORD(l)==HTCLIENT){SetCursor(nullptr);return TRUE;}
    break;
 case WM_SYSCOMMAND:
    if(h->kiosk&&h->kioskPreventMinimize&&!h->operatorUnlocked&&((w&0xfff0)==SC_MINIMIZE||(w&0xfff0)==SC_MAXIMIZE))return 0;
    break;
 case WM_CHAR:if(h->ready)h->character(wchar_t(w));return 0;case WM_DPICHANGED:{const auto* next=reinterpret_cast<RECT*>(l);SetWindowPos(window,nullptr,next->left,next->top,next->right-next->left,next->bottom-next->top,SWP_NOZORDER|SWP_NOACTIVATE);return 0;}case WM_SIZE:h->width=std::max(1u,unsigned(LOWORD(l)));h->height=std::max(1u,unsigned(HIWORD(l)));if(h->mouseLocked&&!h->clipMouse())h->releaseMouseCapture(true);if(h->ready)h->write({{"event","resize"},{"width",h->width},{"height",h->height},{"pixelRatio",GetDpiForWindow(window)/96.0}});return 0;case WM_POINTERDOWN:case WM_POINTERUP:case WM_POINTERUPDATE:case WM_POINTERCAPTURECHANGED:if(h->ready&&h->touch(message,w))return 0;break;case WM_MOUSEMOVE:if(h->ready){h->pointer(l);TRACKMOUSEEVENT track{sizeof(track),TME_LEAVE,window,0};TrackMouseEvent(&track);}return 0;case WM_MOUSELEAVE:if(h->ready&&!h->mouseButtons&&!h->mouseLocked)h->inputQueue.push({{"event","input"},{"packet",{{"device","mouse"},{"pointer",{{"position",{h->cursor.x,h->cursor.y}},{"size",{h->width,h->height}},{"inside",false}}}}}});return 0;case WM_MOUSEWHEEL:if(h->ready){POINT at{short(LOWORD(l)),short(HIWORD(l))};if(ScreenToClient(window,&at)){h->pointer(MAKELPARAM(at.x,at.y));h->inputQueue.push({{"event","input"},{"packet",{{"key","mousewheelaxis"},{"value",std::clamp(double(short(HIWORD(w)))/WHEEL_DELTA,-1.0,1.0)},{"device","mouse"}}}});}}return 0;case WM_LBUTTONDOWN:case WM_LBUTTONUP:case WM_RBUTTONDOWN:case WM_RBUTTONUP:case WM_MBUTTONDOWN:case WM_MBUTTONUP:case WM_XBUTTONDOWN:case WM_XBUTTONUP:if(h->ready){h->pointer(l);const bool down=message==WM_LBUTTONDOWN||message==WM_RBUTTONDOWN||message==WM_MBUTTONDOWN||message==WM_XBUTTONDOWN;const unsigned index=message==WM_LBUTTONDOWN||message==WM_LBUTTONUP?0:message==WM_RBUTTONDOWN||message==WM_RBUTTONUP?1:message==WM_MBUTTONDOWN||message==WM_MBUTTONUP?2:HIWORD(w)==XBUTTON1?3:4;const unsigned bit=1u<<index;if(down){h->mouseButtons|=bit;SetCapture(window);}else h->mouseButtons&=~bit;h->key(index==0?"leftmousebutton":index==1?"rightmousebutton":index==2?"middlemousebutton":index==3?"thumbmousebutton":"thumbmousebutton2",down,"mouse");if(!h->mouseButtons&&GetCapture()==window)ReleaseCapture();}return message==WM_XBUTTONDOWN||message==WM_XBUTTONUP?TRUE:0;case WM_CAPTURECHANGED:if(h->ready&&reinterpret_cast<HWND>(l)!=window)h->releaseMouse();return 0;case WM_CANCELMODE:if(h->ready)h->releaseInput();return 0;case WM_KEYDOWN:case WM_KEYUP:case WM_SYSKEYDOWN:case WM_SYSKEYUP:if(h->kiosk&&w==VK_F12){if(message==WM_KEYDOWN&&!(l&(1ll<<30))){h->operatorUnlocked=true;h->activity();PostMessageW(window,WM_CLOSE,0,0);}return 0;}if(message==WM_SYSKEYDOWN&&w==VK_F4)return DefWindowProcW(window,message,w,l);if(h->ready){if(w==VK_ESCAPE&&message==WM_KEYDOWN&&h->mouseLocked){h->mouseCaptureRequested=false;h->releaseMouseCapture(true);}if((message==WM_KEYDOWN||message==WM_SYSKEYDOWN)&&(l&(1ll<<30)))return 0;std::wstring key;if((w>=L'A'&&w<=L'Z')||(w>=L'0'&&w<=L'9'))key=wchar_t(w);else if(w>=VK_F1&&w<=VK_F24)key=L"f"+std::to_wstring(w-VK_F1+1);else switch(w){case VK_HOME:key=L"home";break;case VK_END:key=L"end";break;case VK_PRIOR:key=L"pageup";break;case VK_NEXT:key=L"pagedown";break;case VK_DELETE:key=L"delete";break;case VK_INSERT:key=L"insert";break;case VK_SPACE:key=L" ";break;case VK_BACK:key=L"backspace";break;case VK_ESCAPE:key=L"escape";break;case VK_TAB:key=L"tab";break;case VK_RETURN:key=L"enter";break;case VK_SHIFT:key=L"shift";break;case VK_CONTROL:key=L"control";break;case VK_MENU:key=L"alt";break;case VK_LEFT:key=L"arrowleft";break;case VK_RIGHT:key=L"arrowright";break;case VK_UP:key=L"arrowup";break;case VK_DOWN:key=L"arrowdown";break;}if(!key.empty())h->key(utf8(key),message==WM_KEYDOWN||message==WM_SYSKEYDOWN);}return 0;case WM_KILLFOCUS:if(h->ready)h->releaseInput();return 0;case WM_TIMER:if(w==2){h->ready=false;PostMessageW(window,WM_CLOSE,0,0);}return 0;case WM_CLOSE:if(h->ready){if(h->kiosk&&!h->operatorUnlocked&&!h->hidden&&!h->closeRequested&&WaitForSingleObject(h->process,0)==WAIT_TIMEOUT)return 0;if(!h->closeRequested){h->closeRequested=true;h->write({{"event","stop"}});SetTimer(window,2,5000,nullptr);}return 0;}KillTimer(window,2);h->stop();DestroyWindow(window);return 0;case WM_DESTROY:PostQuitMessage(0);return 0;}}catch(const std::exception& e){h->failed=true;h->log(e.what());PostMessageW(window,WM_CLOSE,0,0);}return DefWindowProcW(window,message,w,l);}
}
int WINAPI wWinMain(HINSTANCE instance,HINSTANCE,PWSTR,int show){bool hiddenRequested=false;try{SetProcessDpiAwarenessContext(DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2);CoInitializeEx(nullptr,COINIT_APARTMENTTHREADED);int count=0;auto argv=CommandLineToArgvW(GetCommandLineW(),&count);struct Args{LPWSTR* p;~Args(){LocalFree(p);}} args{argv};wchar_t self[32768];GetModuleFileNameW(nullptr,self,32768);Host host;host.root=fs::path(self).parent_path();std::wstring extra;for(int i=1;i<count;i++){const std::wstring a=argv[i];if(a==L"--prepare-shaders"&&i+1<count){hb::gpu::SceneRenderer::configureShaderCache(fs::absolute(argv[i+1]));SceneRenderBridge warmup;warmup.command({{"op","init"},{"data",{{"width",16},{"height",16},{"asyncShaderPreparation",false}}}},nullptr,true);warmup.shutdown();
  // The direct Direct3D12 renderer compiles its own pipeline set at init; bundle it too (skipped where Direct3D12 is unavailable).
  try{warmup.command({{"op","init"},{"data",{{"width",16},{"height",16},{"backend","d3d12"}}}},nullptr,true);}catch(const std::exception&){}warmup.shutdown();return 0;}if(a==L"--stamp-game"&&i+2<count){hiddenRequested=true;stampGameExecutable(argv[i+1],argv[i+2]);return 0;}if(a==L"--package"&&i+1<count)host.root=fs::absolute(argv[++i]);else if(a==L"--hidden")host.hidden=hiddenRequested=true;else if(a==L"--silent")extra+=L" --silent";else if(a==L"--uncapped"){host.uncapped=true;extra+=L" --uncapped 1";}else if((a==L"--frames"||a==L"--report"||a==L"--graphics-api")&&i+1<count){extra+=L" "+a+L" "+quote(argv[++i]);}}
 fs::path editorProject,editorProfile;
 HWND owner=nullptr;
 for(int i=1;i+1<count;i++){
     const std::wstring flag=argv[i];
     if(flag==L"--editor-project")editorProject=fs::absolute(argv[++i]);
     else if(flag==L"--editor-profile")editorProfile=fs::absolute(argv[++i]);
     else if(flag==L"--editor-owner")owner=reinterpret_cast<HWND>(std::stoull(argv[++i]));
     else if(flag==L"--editor-scene")extra+=L" --editor-scene "+quote(argv[++i]);
     else if(flag==L"--editor-take-output"||flag==L"--editor-take-name"||flag==L"--editor-take-target"||flag==L"--editor-take-preset"||flag==L"--editor-audio-output")
         extra+=L" "+flag+L" "+quote(argv[++i]);
 }
 if(!editorProject.empty())return playEditorProject(host,instance,editorProject,editorProfile,owner,show,std::move(extra));
 Json manifest;{std::ifstream file(host.root/L"game.hbpack.json");if(!file)throw std::runtime_error("Native game manifest missing");file>>manifest;}const auto kiosk=manifest.value("kiosk",Json::object());host.kiosk=kiosk.value("enabled",false);host.kioskFullscreen=host.kiosk&&kiosk.value("fullscreen",true);host.kioskHideCursor=host.kiosk&&kiosk.value("hideCursor",false);host.kioskPreventMinimize=host.kiosk&&kiosk.value("preventMinimize",true);host.kioskIdleSeconds=std::min(86400u,kiosk.value("idleResetSeconds",60u));const auto projectId=manifest.at("id").get<std::string>();gameIdentity(wide(projectId));SetCurrentProcessExplicitAppUserModelID(wide(manifest.at("windowsApplication").at("id").get<std::string>()).c_str());wchar_t local[32768];const auto n=GetEnvironmentVariableW(L"LOCALAPPDATA",local,32768);if(!n||n>=32768)throw std::runtime_error("Local app data path");const fs::path localData(local);const auto testLength=host.hidden?GetEnvironmentVariableW(L"HB_NATIVE_TEST_STATE",local,32768):0;const auto state=testLength&&testLength<32768?fs::path(local):fs::path(local)/L"HBEngine"/L"Games"/wide(projectId);fs::create_directories(state);const auto shaderCache=(testLength?state:localData/L"HBEngine")/L"Cache"/L"ShaderBytecode";fs::create_directories(shaderCache);const auto bundled=host.root/L"Shaders";if(fs::is_directory(bundled))for(const auto& entry:fs::directory_iterator(bundled)){if(entry.is_regular_file()&&!entry.is_symlink()&&entry.file_size()<=8*1024*1024){std::error_code error;fs::copy_file(entry.path(),shaderCache/entry.path().filename(),fs::copy_options::skip_existing,error);}}hb::gpu::SceneRenderer::configureShaderCache(shaderCache);host.logFile=state/L"native-runtime.log";host.timer=CreateWaitableTimerExW(nullptr,nullptr,2,TIMER_ALL_ACCESS);if(!host.timer)host.timer=CreateWaitableTimerW(nullptr,FALSE,nullptr);if(!host.timer)throw std::runtime_error("Native frame timer");host.width=manifest.value("width",1280u);host.height=manifest.value("height",720u);if(host.width<1||host.width>7680||host.height<1||host.height>4320)throw std::runtime_error("Window dimensions invalid");const auto title=wide(manifest.value("name",std::string("HBEngine Game")));host.width=MulDiv(host.width,GetDpiForSystem(),96);host.height=MulDiv(host.height,GetDpiForSystem(),96);RECT initialWork{};if(SystemParametersInfoW(SPI_GETWORKAREA,0,&initialWork,0)){const double fit=std::min({1.0,double(initialWork.right-initialWork.left-32)/host.width,double(initialWork.bottom-initialWork.top-80)/host.height});if(fit>0&&fit<1){host.width=std::max(1u,unsigned(host.width*fit));host.height=std::max(1u,unsigned(host.height*fit));}}WNDCLASSW wc{};wc.lpfnWndProc=procedure;wc.hInstance=instance;wc.lpszClassName=L"HBEngine.NativeGame";wc.hCursor=LoadCursorW(nullptr,IDC_ARROW);RegisterClassW(&wc);RECT rect{0,0,LONG(host.width),LONG(host.height)};AdjustWindowRectExForDpi(&rect,WS_OVERLAPPEDWINDOW,FALSE,0,GetDpiForSystem());const auto window=CreateWindowExW(0,wc.lpszClassName,title.c_str(),WS_OVERLAPPEDWINDOW,CW_USEDEFAULT,CW_USEDEFAULT,rect.right-rect.left,rect.bottom-rect.top,nullptr,nullptr,instance,&host);if(!window)throw std::runtime_error("Native game window");if(host.kioskFullscreen&&!host.hidden){MONITORINFO monitor{sizeof(monitor)};if(GetMonitorInfoW(MonitorFromWindow(window,MONITOR_DEFAULTTONEAREST),&monitor)){const auto& bounds=monitor.rcMonitor;SetWindowLongPtrW(window,GWL_STYLE,WS_POPUP);SetWindowPos(window,HWND_TOPMOST,bounds.left,bounds.top,bounds.right-bounds.left,bounds.bottom-bounds.top,SWP_FRAMECHANGED|SWP_NOACTIVATE);}}SetEnvironmentVariableW(L"DISABLE_SYSTEM_FONTS_LOAD",L"1");host.audioIdentity.configure(gameIdentity(wide(projectId)),title,self);host.start(host.root/wide(manifest.at("scriptRuntime").get<std::string>()),host.root/L"tools/native-game-runner.mjs",extra);if(!host.hidden)ShowWindow(window,show);MSG message{};bool running=true;while(running){const auto result=MsgWaitForMultipleObjectsEx(1,&host.timer,INFINITE,QS_ALLINPUT,MWMO_INPUTAVAILABLE);if(result==WAIT_OBJECT_0)host.tick();else if(result==WAIT_FAILED)throw std::runtime_error("Native message wait");while(PeekMessageW(&message,nullptr,0,0,PM_REMOVE)){if(message.message==WM_QUIT){running=false;break;}TranslateMessage(&message);DispatchMessageW(&message);}}host.stop();if(host.failed&&!host.hidden)MessageBoxW(nullptr,(L"게임 실행 중 오류가 발생했어요.\n"+host.failureMessage+L"\n\n기록: "+host.logFile.wstring()).c_str(),L"HBEngine",MB_OK|MB_ICONERROR);return host.failed?1:0;
 }catch(const std::exception& e){OutputDebugStringA(e.what());const auto diagnostic=std::string(e.what())+"\n";DWORD written=0;const auto errorOutput=GetStdHandle(STD_ERROR_HANDLE);if(errorOutput&&errorOutput!=INVALID_HANDLE_VALUE)WriteFile(errorOutput,diagnostic.data(),DWORD(diagnostic.size()),&written,nullptr);if(!hiddenRequested)MessageBoxW(nullptr,wide(std::string("게임을 시작하지 못했어요.\n")+e.what()).c_str(),L"HBEngine",MB_OK|MB_ICONERROR);return 1;}}
