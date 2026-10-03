#include <algorithm>
#ifdef HB_GAME_PLAYER
#include <nlohmann/json.hpp>
#endif
#ifndef UNICODE
#define UNICODE
#endif
#define _UNICODE
#include <windows.h>
#include <shellapi.h>
#include <shlobj.h>
#include <dwmapi.h>
#include <WebView2.h>
#include <filesystem>
#include <fstream>
#include <regex>
#include <string>
#include <cwctype>
#include <stdexcept>
namespace fs=std::filesystem;
struct State {
    HWND window=nullptr; HANDLE job=nullptr,process=nullptr;
    ICoreWebView2Controller* controller=nullptr; ICoreWebView2* view=nullptr;
    fs::path root,userData,ready,log,smoke; std::wstring url; bool closing=false,smokeSuccess=false,failed=false,development=true;
    ~State(){if(view)view->Release();if(controller){controller->Close();controller->Release();}if(job)CloseHandle(job);if(process)CloseHandle(process);}
} app;
std::wstring quote(const std::wstring& value){
    std::wstring out=L"\"";size_t slashes=0;
    for(wchar_t c:value){if(c==L'\\'){slashes++;continue;}if(c==L'"')out.append(slashes*2+1,L'\\');else out.append(slashes,L'\\');slashes=0;out+=c;}
    out.append(slashes*2,L'\\');return out+L'"';
}
std::wstring env(const wchar_t* name){DWORD size=GetEnvironmentVariableW(name,nullptr,0);if(!size)return {};std::wstring out(size,L'\0');GetEnvironmentVariableW(name,out.data(),size);out.resize(size-1);return out;}
std::wstring wide(const std::string& value){int n=MultiByteToWideChar(CP_UTF8,MB_ERR_INVALID_CHARS,value.data(),int(value.size()),nullptr,0);std::wstring result(n,L'\0');MultiByteToWideChar(CP_UTF8,MB_ERR_INVALID_CHARS,value.data(),int(value.size()),result.data(),n);return result;}
std::string read(const fs::path& file){std::ifstream in(file,std::ios::binary);return {std::istreambuf_iterator<char>(in),{}};}
void write(const fs::path& file,const std::string& value){std::ofstream out(file,std::ios::binary);out<<value;if(!out)throw std::runtime_error("output file");}
void error(const wchar_t* text,HRESULT code=E_FAIL){
    app.failed=true;
    if(!app.smoke.empty()){try{write(app.smoke,"{\"ok\":false,\"hresult\":"+std::to_string(unsigned(code))+"}");}catch(...){}}
    else MessageBoxW(app.window,text,L"HBEngine",MB_OK|MB_ICONERROR);
    app.closing=true;if(app.window)DestroyWindow(app.window);
}
template<class Interface> class Callback : public Interface {
    ULONG references=1;const wchar_t* guid;
public:
    explicit Callback(const wchar_t* id):guid(id){}
    virtual ~Callback()=default;
    HRESULT STDMETHODCALLTYPE QueryInterface(REFIID id,void** out) override {
        if(!out)return E_POINTER;*out=nullptr;IID own;IIDFromString(guid,&own);
        if(IsEqualIID(id,IID_IUnknown)||IsEqualIID(id,own)){*out=static_cast<Interface*>(this);AddRef();return S_OK;}return E_NOINTERFACE;
    }
    ULONG STDMETHODCALLTYPE AddRef() override{return ++references;}
    ULONG STDMETHODCALLTYPE Release() override{const auto n=--references;if(!n)delete this;return n;}
};
class MessageHandler final : public Callback<ICoreWebView2WebMessageReceivedEventHandler> {
public:
    MessageHandler():Callback(L"{57213f19-00e6-49fa-8e07-898ea01ecbd2}"){}
    HRESULT STDMETHODCALLTYPE Invoke(ICoreWebView2*,ICoreWebView2WebMessageReceivedEventArgs* args) override{
        LPWSTR source=nullptr,message=nullptr;args->get_Source(&source);args->TryGetWebMessageAsString(&message);
        const bool own=source&&std::wstring(source).rfind(app.url,0)==0;
        if(own&&message&&!app.smoke.empty()&&(std::wstring(message)==L"hbengine.ready.hub"||std::wstring(message)==L"hbengine.ready.editor"||std::wstring(message)==L"hbengine.ready.player")){
            const auto workspace=std::wstring(message)==L"hbengine.ready.hub"?"hub":std::wstring(message)==L"hbengine.ready.player"?"player":"editor";
            write(app.smoke,"{\"ok\":true,\"embedded\":true,\"workspace\":\""+std::string(workspace)+"\",\"port\":"+std::string(app.url.begin()+17,app.url.end()-1)+"}");app.smokeSuccess=true;
            const auto result=app.view->ExecuteScript(L"window.hbEngineRequestClose();",nullptr);if(FAILED(result))error(L"편집기를 종료하지 못했어요.",result);
        }
        if(own&&message&&std::wstring(message)==L"hbengine.close"){app.closing=true;DestroyWindow(app.window);}
        CoTaskMemFree(source);CoTaskMemFree(message);return S_OK;
    }
};
class NavigationHandler final : public Callback<ICoreWebView2NavigationCompletedEventHandler> {
public:
    NavigationHandler():Callback(L"{d33a35bf-1c49-4f98-93ab-006e0533fe1c}"){}
    HRESULT STDMETHODCALLTYPE Invoke(ICoreWebView2*,ICoreWebView2NavigationCompletedEventArgs* args) override{
        BOOL success=FALSE;args->get_IsSuccess(&success);
        if(!success){error(L"편집기 페이지를 열지 못했어요. 실행 로그를 확인해 주세요.");return S_OK;}
        return S_OK;
    }
};
#ifdef HB_GAME_PLAYER
class AutoplayHandler final : public Callback<ICoreWebView2SetPermissionStateCompletedHandler> {
public:
    AutoplayHandler():Callback(L"{fc77fb30-9c9e-4076-b8c7-7644a703ca1b}"){}
    HRESULT STDMETHODCALLTYPE Invoke(HRESULT status) override{
        if(app.closing)return S_OK;
        if(FAILED(status)){error(L"게임 사운드를 초기화하지 못했어요.",status);return S_OK;}
        const auto result=app.view->Navigate(app.url.c_str());if(FAILED(result))error(L"게임 페이지를 열지 못했어요.",result);return S_OK;
    }
};
#endif
class ControllerHandler final : public Callback<ICoreWebView2CreateCoreWebView2ControllerCompletedHandler> {
public:
    ControllerHandler():Callback(L"{6c4819f3-c9b7-4260-8127-c9f5bde7f68c}"){}
    HRESULT STDMETHODCALLTYPE Invoke(HRESULT status,ICoreWebView2Controller* controller) override{
        if(app.closing){if(controller)controller->Close();return S_OK;}
        if(FAILED(status)||!controller){error(L"편집기 창을 만들지 못했어요.",status);return S_OK;}
        app.controller=controller;controller->AddRef();controller->get_CoreWebView2(&app.view);
        RECT bounds;GetClientRect(app.window,&bounds);controller->put_Bounds(bounds);controller->put_IsVisible(TRUE);
        ICoreWebView2Settings* settings=nullptr;app.view->get_Settings(&settings);
        if(settings){settings->put_IsZoomControlEnabled(FALSE);settings->put_AreDefaultContextMenusEnabled(FALSE);
#ifdef HB_GAME_PLAYER
        settings->put_AreDevToolsEnabled(app.development);
#endif
        settings->Release();}
        EventRegistrationToken token;auto message=new MessageHandler;app.view->add_WebMessageReceived(message,&token);message->Release();
        auto navigation=new NavigationHandler;app.view->add_NavigationCompleted(navigation,&token);navigation->Release();
#ifdef HB_GAME_PLAYER
        ICoreWebView2_13* extended=nullptr;ICoreWebView2Profile* profile=nullptr;ICoreWebView2Profile4* permissions=nullptr;
        HRESULT result=app.view->QueryInterface(IID_ICoreWebView2_13,reinterpret_cast<void**>(&extended));
        if(SUCCEEDED(result))result=extended->get_Profile(&profile);
        if(SUCCEEDED(result))result=profile->QueryInterface(IID_ICoreWebView2Profile4,reinterpret_cast<void**>(&permissions));
        if(SUCCEEDED(result)){auto handler=new AutoplayHandler;result=permissions->SetPermissionState(COREWEBVIEW2_PERMISSION_KIND_AUTOPLAY,app.url.c_str(),COREWEBVIEW2_PERMISSION_STATE_ALLOW,handler);handler->Release();}
        if(permissions)permissions->Release();if(profile)profile->Release();if(extended)extended->Release();
        if(FAILED(result))error(L"게임 사운드를 초기화하지 못했어요. WebView2 Runtime을 업데이트하세요.",result);
#else
        const auto result=app.view->Navigate(app.url.c_str());if(FAILED(result))error(L"편집기 페이지를 열지 못했어요.",result);
#endif
        return S_OK;
    }
};
class EnvironmentHandler final : public Callback<ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler> {
public:
    EnvironmentHandler():Callback(L"{4e8a3389-c9d8-4bd2-b6b5-124fee6cc14d}"){}
    HRESULT STDMETHODCALLTYPE Invoke(HRESULT status,ICoreWebView2Environment* environment) override{
        if(app.closing)return S_OK;
        if(FAILED(status)||!environment){error(L"Microsoft WebView2 Runtime이 필요해요.\nhttps://developer.microsoft.com/microsoft-edge/webview2/",status);return S_OK;}
        auto handler=new ControllerHandler;const auto result=environment->CreateCoreWebView2Controller(app.window,handler);handler->Release();
        if(FAILED(result))error(L"편집기 창 초기화에 실패했어요.",result);return S_OK;
    }
};
LRESULT CALLBACK windowProcedure(HWND window,UINT message,WPARAM wParam,LPARAM lParam){
    if(message==WM_SIZE&&app.controller){RECT bounds;GetClientRect(window,&bounds);app.controller->put_Bounds(bounds);}
    else if(message==WM_SETFOCUS&&app.controller)app.controller->MoveFocus(COREWEBVIEW2_MOVE_FOCUS_REASON_PROGRAMMATIC);
    else if(message==WM_DPICHANGED){const auto bounds=reinterpret_cast<RECT*>(lParam);SetWindowPos(window,nullptr,bounds->left,bounds->top,bounds->right-bounds->left,bounds->bottom-bounds->top,SWP_NOZORDER|SWP_NOACTIVATE);}
    else if(message==WM_CLOSE){
        if(!app.closing&&app.view){const auto result=app.view->ExecuteScript(L"if(typeof window.hbEngineRequestClose==='function'){window.hbEngineRequestClose();}else{window.chrome.webview.postMessage('hbengine.close');}",nullptr);if(SUCCEEDED(result))return 0;}
        app.closing=true;DestroyWindow(window);return 0;
    }else if(message==WM_TIMER){
        if(wParam==2){error(L"편집기 초기화 시간이 초과됐어요.");return 0;}
        if(app.process&&WaitForSingleObject(app.process,0)==WAIT_OBJECT_0){error(L"편집기 서버가 종료됐어요. 실행 로그를 확인해 주세요.");return 0;}
    }else if(message==WM_DESTROY){app.window=nullptr;PostQuitMessage(0);return 0;}
    return DefWindowProcW(window,message,wParam,lParam);
}
bool setRegistry(const std::wstring& path,const wchar_t* name,const std::wstring& value){
    HKEY key;const auto result=RegCreateKeyExW(HKEY_CURRENT_USER,path.c_str(),0,nullptr,0,KEY_SET_VALUE,nullptr,&key,nullptr);if(result!=ERROR_SUCCESS)return false;
    const auto written=RegSetValueExW(key,name,0,REG_SZ,reinterpret_cast<const BYTE*>(value.c_str()),DWORD((value.size()+1)*sizeof(wchar_t)));RegCloseKey(key);return written==ERROR_SUCCESS;
}
void associateProject(const fs::path& executable){
    if(!setRegistry(L"Software\\Classes\\.hbproject",nullptr,L"HBEngine.Project")
        ||!setRegistry(L"Software\\Classes\\HBEngine.Project",nullptr,L"HBEngine 프로젝트")
        ||!setRegistry(L"Software\\Classes\\HBEngine.Project\\DefaultIcon",nullptr,quote(executable.wstring())+L",0")
        ||!setRegistry(L"Software\\Classes\\HBEngine.Project\\shell\\open\\command",nullptr,quote(executable.wstring())+L" \"%1\""))
        throw std::runtime_error("project association");
    SHChangeNotify(SHCNE_ASSOCCHANGED,SHCNF_IDLIST,nullptr,nullptr);
}
int WINAPI wWinMain(HINSTANCE instance,HINSTANCE,LPWSTR,int show){
    const auto initialized=CoInitializeEx(nullptr,COINIT_APARTMENTTHREADED);if(FAILED(initialized))return 1;
    HMODULE loader=nullptr;HANDLE single=nullptr;
    try{
        wchar_t buffer[32768];GetModuleFileNameW(nullptr,buffer,32768);const fs::path executable=buffer;const auto folder=executable.parent_path();
        #ifdef HB_GAME_PLAYER
        app.root=folder;
        const auto serverScript=L"tools/player-server.mjs";
        #else
        const auto serverScript=L"tools/serve.mjs";
        app.root=fs::exists(folder/serverScript)?folder:folder/L"dist/HBEngine";
        #endif
        if(!fs::exists(app.root/serverScript))throw std::runtime_error("engine files");
        app.userData=env(L"HB_USER_DATA_DIR");if(app.userData.empty())app.userData=fs::path(env(L"LOCALAPPDATA"))/L"HBEngine";
        fs::create_directories(app.userData/L"Sessions");std::wstring project;bool registerOnly=false;int count;auto arguments=CommandLineToArgvW(GetCommandLineW(),&count);
        for(int i=1;i<count;i++){const std::wstring value=arguments[i];if(value==L"--register")registerOnly=true;else if(value==L"--smoke-test"&&i+1<count)app.smoke=fs::absolute(arguments[++i]);else if(value.rfind(L"--",0)==0)throw std::runtime_error("argument");else if(project.empty())project=fs::absolute(value).wstring();else throw std::runtime_error("argument");}LocalFree(arguments);
        if(!project.empty()&&(!fs::is_regular_file(project)||_wcsicmp(fs::path(project).extension().c_str(),L".hbproject")))throw std::runtime_error("project file");
        #ifndef HB_GAME_PLAYER
        if(app.smoke.empty())associateProject(executable);
        #else
        if(!project.empty()||registerOnly)throw std::runtime_error("player argument");
        const auto game=nlohmann::json::parse(read(app.root/L"game.hbpack.json"));app.development=game.value("configuration",std::string{})=="development";
        if(env(L"HB_USER_DATA_DIR").empty()){const auto id=game.at("id").get<std::string>();if(!std::regex_match(id,std::regex("[0-9a-f-]{36}")))throw std::runtime_error("game identity");app.userData=fs::path(env(L"LOCALAPPDATA"))/L"HBEngine"/L"Games"/wide(id);fs::create_directories(app.userData/L"Sessions");}
        SetEnvironmentVariableW(L"HB_PLAYER_SMOKE",app.smoke.empty()?nullptr:L"1");
        #endif
        if(registerOnly){CoUninitialize();return 0;}
        unsigned hash=2166136261u;for(wchar_t c:(project.empty()?app.root.wstring():project)){hash^=std::towlower(c);hash*=16777619;}
        const auto className=L"HBEngine."+std::to_wstring(hash);single=CreateMutexW(nullptr,FALSE,(L"Local\\"+className).c_str());
        if(GetLastError()==ERROR_ALREADY_EXISTS){const auto window=FindWindowW(className.c_str(),nullptr);if(window){ShowWindow(window,SW_RESTORE);SetForegroundWindow(window);}CloseHandle(single);CoUninitialize();return 0;}
        if(env(L"PORT").empty())SetEnvironmentVariableW(L"PORT",L"0");
        SetEnvironmentVariableW(L"HB_DESKTOP",L"1");SetEnvironmentVariableW(L"HB_PROJECT_FILE",project.empty()?nullptr:project.c_str());SetEnvironmentVariableW(L"HB_USER_DATA_DIR",app.userData.c_str());
        const auto run=std::to_wstring(GetCurrentProcessId());app.ready=app.userData/L"Sessions"/(run+L".json");app.log=app.userData/L"Sessions"/(run+L".log");
        SetEnvironmentVariableW(L"HB_READY_FILE",app.ready.c_str());fs::remove(app.ready);
        auto node=app.root/L"runtime/node.exe";if(!fs::exists(node))node=folder/L"dist/HBEngine/runtime/node.exe";if(!fs::exists(node))throw std::runtime_error("node runtime");
        SECURITY_ATTRIBUTES security{sizeof(security),nullptr,TRUE};const auto log=CreateFileW(app.log.c_str(),GENERIC_WRITE,FILE_SHARE_READ|FILE_SHARE_WRITE,&security,CREATE_ALWAYS,FILE_ATTRIBUTE_NORMAL,nullptr);
        if(log==INVALID_HANDLE_VALUE)throw std::runtime_error("log file");
        STARTUPINFOW startup{};startup.cb=sizeof(startup);startup.dwFlags=STARTF_USESTDHANDLES|STARTF_USESHOWWINDOW;startup.wShowWindow=SW_HIDE;startup.hStdOutput=startup.hStdError=log;startup.hStdInput=GetStdHandle(STD_INPUT_HANDLE);PROCESS_INFORMATION child{};
        app.job=CreateJobObjectW(nullptr,nullptr);JOBOBJECT_EXTENDED_LIMIT_INFORMATION limit{};limit.BasicLimitInformation.LimitFlags=JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
        if(!app.job||!SetInformationJobObject(app.job,JobObjectExtendedLimitInformation,&limit,sizeof(limit)))throw std::runtime_error("process job");
        auto command=quote(node.wstring())+L" "+quote((app.root/serverScript).wstring());
        const bool started=CreateProcessW(node.c_str(),command.data(),nullptr,nullptr,TRUE,CREATE_NO_WINDOW|CREATE_SUSPENDED,nullptr,app.root.c_str(),&startup,&child);CloseHandle(log);
        if(!started)throw std::runtime_error("server process");app.process=child.hProcess;
        if(!AssignProcessToJobObject(app.job,child.hProcess)){TerminateProcess(child.hProcess,1);CloseHandle(child.hThread);throw std::runtime_error("process ownership");}ResumeThread(child.hThread);CloseHandle(child.hThread);
        const auto deadline=GetTickCount64()+30000;int port=0;
        while(GetTickCount64()<deadline){if(WaitForSingleObject(app.process,100)==WAIT_OBJECT_0)throw std::runtime_error("server startup");if(fs::exists(app.ready)){std::smatch match;const auto data=read(app.ready);if(std::regex_search(data,match,std::regex("\"port\"\\s*:\\s*(\\d+)"))){port=std::stoi(match[1]);break;}}}
        if(port<1||port>65535)throw std::runtime_error("server ready");app.url=L"http://127.0.0.1:"+std::to_wstring(port)+L"/";
        WNDCLASSW windowClass{};windowClass.hInstance=instance;windowClass.lpszClassName=className.c_str();windowClass.lpfnWndProc=windowProcedure;windowClass.hCursor=LoadCursorW(nullptr,IDC_ARROW);windowClass.hIcon=LoadIconW(instance,MAKEINTRESOURCEW(101));windowClass.hbrBackground=CreateSolidBrush(RGB(23,26,31));RegisterClassW(&windowClass);
        app.window=CreateWindowExW(0,className.c_str(),L"HBEngine",WS_OVERLAPPEDWINDOW,CW_USEDEFAULT,CW_USEDEFAULT,1440,900,nullptr,nullptr,instance,nullptr);if(!app.window)throw std::runtime_error("native window");
        #ifdef HB_GAME_PLAYER
        SetWindowTextW(app.window,wide(game.at("name").get<std::string>()).c_str());
        {RECT size{0,0,std::clamp(game.value("width",1280),320,7680),std::clamp(game.value("height",720),240,4320)};AdjustWindowRect(&size,WS_OVERLAPPEDWINDOW,FALSE);SetWindowPos(app.window,nullptr,0,0,size.right-size.left,size.bottom-size.top,SWP_NOMOVE|SWP_NOZORDER);}
        #endif
        BOOL dark=TRUE;DwmSetWindowAttribute(app.window,20,&dark,sizeof(dark));if(app.smoke.empty())ShowWindow(app.window,show);
#ifdef HB_GAME_PLAYER
        else{SetWindowPos(app.window,HWND_BOTTOM,-20000,-20000,0,0,SWP_NOSIZE|SWP_NOACTIVATE);ShowWindow(app.window,SW_SHOWNOACTIVATE);}
#endif

        auto loaderPath=app.root/L"WebView2Loader.dll";if(!fs::exists(loaderPath))loaderPath=folder/L"dist/HBEngine/WebView2Loader.dll";
        loader=LoadLibraryExW(loaderPath.c_str(),nullptr,LOAD_LIBRARY_SEARCH_DLL_LOAD_DIR|LOAD_LIBRARY_SEARCH_DEFAULT_DIRS);if(!loader)throw std::runtime_error("WebView2 loader");
        using CreateEnvironment=HRESULT(STDAPICALLTYPE*)(PCWSTR,PCWSTR,ICoreWebView2EnvironmentOptions*,ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler*);
        const auto create=reinterpret_cast<CreateEnvironment>(GetProcAddress(loader,"CreateCoreWebView2EnvironmentWithOptions"));if(!create)throw std::runtime_error("WebView2 entry");
        const auto profile=app.userData/L"WebView2";auto handler=new EnvironmentHandler;const auto result=create(nullptr,profile.c_str(),nullptr,handler);handler->Release();if(FAILED(result))error(L"WebView2 Runtime을 시작하지 못했어요.",result);
        SetTimer(app.window,1,1000,nullptr);if(!app.smoke.empty())SetTimer(app.window,2,30000,nullptr);
        MSG message;while(GetMessageW(&message,nullptr,0,0)>0){TranslateMessage(&message);DispatchMessageW(&message);}
    }catch(const std::exception& exception){
        const auto details=L"엔진을 시작하지 못했어요: "+wide(exception.what())+L"\n실행 로그: "+app.log.wstring();error(details.c_str());
    }
    app.closing=true;if(app.view){app.view->Release();app.view=nullptr;}if(app.controller){app.controller->Close();app.controller->Release();app.controller=nullptr;}
    if(app.job){CloseHandle(app.job);app.job=nullptr;}if(loader)FreeLibrary(loader);if(single)CloseHandle(single);CoUninitialize();
    return app.smoke.empty()?(app.failed?1:0):(app.smokeSuccess&&!app.failed?0:1);
}
