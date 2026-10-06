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
#include <memory>
#include <map>
namespace fs=std::filesystem;
struct State {
    HWND window=nullptr; HANDLE job=nullptr,process=nullptr;
    ICoreWebView2Controller* controller=nullptr; ICoreWebView2* view=nullptr;
    ICoreWebView2Environment* environment=nullptr;
    fs::path root,userData,ready,log,smoke; std::wstring url; bool closing=false,smokeSuccess=false,failed=false,development=true,windowSmoke=false,windowSmokeStarted=false,editorAcceptance=false,kiosk=false,kioskFullscreen=false,kioskPreventMinimize=false,operatorUnlocked=false;
    ~State(){if(view)view->Release();if(controller){controller->Close();controller->Release();}if(environment)environment->Release();if(job)CloseHandle(job);if(process)CloseHandle(process);}
} app;
std::wstring quote(const std::wstring& value){
    std::wstring out=L"\"";size_t slashes=0;
    for(wchar_t c:value){if(c==L'\\'){slashes++;continue;}if(c==L'"')out.append(slashes*2+1,L'\\');else out.append(slashes,L'\\');slashes=0;out+=c;}
    out.append(slashes*2,L'\\');return out+L'"';
}
std::wstring env(const wchar_t* name){DWORD size=GetEnvironmentVariableW(name,nullptr,0);if(!size)return {};std::wstring out(size,L'\0');GetEnvironmentVariableW(name,out.data(),size);out.resize(size-1);return out;}
std::wstring wide(const std::string& value){int n=MultiByteToWideChar(CP_UTF8,MB_ERR_INVALID_CHARS,value.data(),int(value.size()),nullptr,0);std::wstring result(n,L'\0');MultiByteToWideChar(CP_UTF8,MB_ERR_INVALID_CHARS,value.data(),int(value.size()),result.data(),n);return result;}
std::string utf8(const std::wstring& value){const int n=WideCharToMultiByte(CP_UTF8,0,value.data(),int(value.size()),nullptr,0,nullptr,nullptr);std::string result(n,'\0');WideCharToMultiByte(CP_UTF8,0,value.data(),int(value.size()),result.data(),n,nullptr,nullptr);return result;}
std::string read(const fs::path& file){std::ifstream in(file,std::ios::binary);return {std::istreambuf_iterator<char>(in),{}};}
void write(const fs::path& file,const std::string& value){std::ofstream out(file,std::ios::binary);out<<value;if(!out)throw std::runtime_error("output file");}
void error(const wchar_t* text,HRESULT code=E_FAIL){
    app.failed=true;
    if(!app.smoke.empty()){try{write(app.smoke,"{\"ok\":false,\"hresult\":"+std::to_string(unsigned(code))+"}");write(fs::path(app.smoke.wstring()+L".error.txt"),utf8(text));}catch(...){}}
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
#ifndef HB_GAME_PLAYER
struct DetachedWindow {
    HWND window=nullptr;ICoreWebView2Controller* controller=nullptr;ICoreWebView2* view=nullptr;std::wstring uri;bool closing=false;
    ~DetachedWindow(){if(controller){controller->Close();controller->Release();}if(view)view->Release();}
};
std::map<HWND,std::shared_ptr<DetachedWindow>> detachedWindows;
LRESULT CALLBACK detachedProcedure(HWND,UINT,WPARAM,LPARAM);
void closeDetached(){while(!detachedWindows.empty())DestroyWindow(detachedWindows.begin()->first);}
class DetachedMessage final:public Callback<ICoreWebView2WebMessageReceivedEventHandler>{
    std::weak_ptr<DetachedWindow> owner;
public:
    explicit DetachedMessage(std::shared_ptr<DetachedWindow> value):Callback(L"{57213f19-00e6-49fa-8e07-898ea01ecbd2}"),owner(value){}
    HRESULT STDMETHODCALLTYPE Invoke(ICoreWebView2*,ICoreWebView2WebMessageReceivedEventArgs* args) override{
        const auto window=owner.lock();if(!window)return S_OK;LPWSTR source=nullptr,message=nullptr;args->get_Source(&source);args->TryGetWebMessageAsString(&message);
        if(source&&message&&std::wstring(source)==window->uri&&std::wstring(message)==L"hbengine.detached.close"){window->closing=true;DestroyWindow(window->window);}
        if(source&&message&&app.windowSmoke&&std::wstring(source)==window->uri&&std::wstring(message)==L"hbengine.detached.test.resize")SetWindowPos(window->window,nullptr,0,0,840,560,SWP_NOMOVE|SWP_NOZORDER);
        CoTaskMemFree(source);CoTaskMemFree(message);return S_OK;
    }
};
class DetachedClose final:public Callback<ICoreWebView2WindowCloseRequestedEventHandler>{
    std::weak_ptr<DetachedWindow> owner;
public:
    explicit DetachedClose(std::shared_ptr<DetachedWindow> value):Callback(L"{5c19e9e0-092f-486b-affa-ca8231913039}"),owner(value){}
    HRESULT STDMETHODCALLTYPE Invoke(ICoreWebView2*,IUnknown*) override{if(const auto window=owner.lock())PostMessageW(window->window,WM_CLOSE,0,0);return S_OK;}
};
class DetachedTitle final:public Callback<ICoreWebView2DocumentTitleChangedEventHandler>{
    std::weak_ptr<DetachedWindow> owner;
public:
    explicit DetachedTitle(std::shared_ptr<DetachedWindow> value):Callback(L"{f5f2b923-953e-4042-9f95-f3a118e1afd4}"),owner(value){}
    HRESULT STDMETHODCALLTYPE Invoke(ICoreWebView2* sender,IUnknown*) override{if(const auto window=owner.lock()){LPWSTR title=nullptr;sender->get_DocumentTitle(&title);if(title)SetWindowTextW(window->window,title);CoTaskMemFree(title);}return S_OK;}
};
class DetachedNavigation final:public Callback<ICoreWebView2NavigationStartingEventHandler>{
    std::weak_ptr<DetachedWindow> owner;
public:
    explicit DetachedNavigation(std::shared_ptr<DetachedWindow> value):Callback(L"{9adbe429-f36d-432b-9ddc-f8881fbd76e3}"),owner(value){}
    HRESULT STDMETHODCALLTYPE Invoke(ICoreWebView2*,ICoreWebView2NavigationStartingEventArgs* args) override{const auto window=owner.lock();LPWSTR uri=nullptr;args->get_Uri(&uri);if(!window||!uri||std::wstring(uri)!=window->uri)args->put_Cancel(TRUE);CoTaskMemFree(uri);return S_OK;}
};
class NewWindowHandler;
void attachNewWindow(ICoreWebView2*);
class DetachedController final:public Callback<ICoreWebView2CreateCoreWebView2ControllerCompletedHandler>{
    std::shared_ptr<DetachedWindow> owner;ICoreWebView2NewWindowRequestedEventArgs* args;ICoreWebView2Deferral* deferral;
public:
    DetachedController(std::shared_ptr<DetachedWindow> value,ICoreWebView2NewWindowRequestedEventArgs* requested,ICoreWebView2Deferral* delayed):Callback(L"{6c4819f3-c9b7-4260-8127-c9f5bde7f68c}"),owner(value),args(requested),deferral(delayed){args->AddRef();deferral->AddRef();}
    ~DetachedController(){args->Release();deferral->Release();}
    HRESULT STDMETHODCALLTYPE Invoke(HRESULT status,ICoreWebView2Controller* controller) override{
        if(app.closing||!IsWindow(owner->window)||FAILED(status)||!controller){if(controller)controller->Close();args->put_Handled(TRUE);deferral->Complete();if(IsWindow(owner->window))DestroyWindow(owner->window);return S_OK;}
        owner->controller=controller;controller->AddRef();controller->get_CoreWebView2(&owner->view);RECT bounds;GetClientRect(owner->window,&bounds);controller->put_Bounds(bounds);controller->put_IsVisible(TRUE);
        ICoreWebView2Settings* settings=nullptr;owner->view->get_Settings(&settings);if(settings){settings->put_IsZoomControlEnabled(FALSE);settings->put_AreDefaultContextMenusEnabled(FALSE);settings->Release();}
        EventRegistrationToken token;auto message=new DetachedMessage(owner);owner->view->add_WebMessageReceived(message,&token);message->Release();auto closed=new DetachedClose(owner);owner->view->add_WindowCloseRequested(closed,&token);closed->Release();auto title=new DetachedTitle(owner);owner->view->add_DocumentTitleChanged(title,&token);title->Release();auto navigation=new DetachedNavigation(owner);owner->view->add_NavigationStarting(navigation,&token);navigation->Release();attachNewWindow(owner->view);
        const auto result=args->put_NewWindow(owner->view);args->put_Handled(TRUE);deferral->Complete();if(FAILED(result)){DestroyWindow(owner->window);return S_OK;}ShowWindow(owner->window,SW_SHOW);SetForegroundWindow(owner->window);return S_OK;
    }
};
class NewWindowHandler final:public Callback<ICoreWebView2NewWindowRequestedEventHandler>{
public:
    NewWindowHandler():Callback(L"{d4c185fe-c81c-4989-97af-2d3fa7ab5651}"){}
    HRESULT STDMETHODCALLTYPE Invoke(ICoreWebView2* sender,ICoreWebView2NewWindowRequestedEventArgs* args) override{
        args->put_Handled(TRUE);LPWSTR uri=nullptr,source=nullptr;args->get_Uri(&uri);sender->get_Source(&source);const auto target=uri?std::wstring(uri):L"",origin=source?std::wstring(source):L"";CoTaskMemFree(uri);CoTaskMemFree(source);
        const auto prefix=app.url+L"prototype/detached-window.html?id=";
        if(app.closing||!app.environment||detachedWindows.size()>=16||target.rfind(prefix,0)!=0||target.size()>prefix.size()+2048||(origin!=app.url&&origin!=app.url+L"prototype/index.html"&&origin.rfind(prefix,0)!=0))return S_OK;
        ICoreWebView2Deferral* deferral=nullptr;if(FAILED(args->GetDeferral(&deferral)))return S_OK;
        const auto value=std::make_shared<DetachedWindow>();value->uri=target;int width=1000,height=720,left=CW_USEDEFAULT,top=CW_USEDEFAULT;ICoreWebView2WindowFeatures* features=nullptr;
        if(SUCCEEDED(args->get_WindowFeatures(&features))&&features){BOOL hasSize=FALSE,hasPosition=FALSE;features->get_HasSize(&hasSize);features->get_HasPosition(&hasPosition);UINT32 number;if(hasSize){features->get_Width(&number);width=std::clamp(int(number),420,7680);features->get_Height(&number);height=std::clamp(int(number),300,4320);}if(hasPosition){features->get_Left(&number);left=int(number);features->get_Top(&number);top=int(number);}features->Release();}
        WNDCLASSW type{};type.hInstance=GetModuleHandleW(nullptr);type.lpszClassName=L"HBEngine.Detached";type.lpfnWndProc=detachedProcedure;type.hCursor=LoadCursorW(nullptr,IDC_ARROW);type.hIcon=LoadIconW(type.hInstance,MAKEINTRESOURCEW(101));RegisterClassW(&type);
        RECT bounds{0,0,width,height};AdjustWindowRectEx(&bounds,WS_OVERLAPPEDWINDOW,FALSE,WS_EX_APPWINDOW);value->window=CreateWindowExW(WS_EX_APPWINDOW,type.lpszClassName,L"HBEngine 작업창",WS_OVERLAPPEDWINDOW,left,top,bounds.right-bounds.left,bounds.bottom-bounds.top,nullptr,nullptr,type.hInstance,nullptr);
        if(!value->window){deferral->Complete();deferral->Release();return S_OK;}detachedWindows.emplace(value->window,value);BOOL dark=TRUE;DwmSetWindowAttribute(value->window,20,&dark,sizeof(dark));
        auto handler=new DetachedController(value,args,deferral);const auto result=app.environment->CreateCoreWebView2Controller(value->window,handler);handler->Release();if(FAILED(result)){deferral->Complete();DestroyWindow(value->window);}deferral->Release();return S_OK;
    }
};
void attachNewWindow(ICoreWebView2* view){EventRegistrationToken token;auto handler=new NewWindowHandler;view->add_NewWindowRequested(handler,&token);handler->Release();}
LRESULT CALLBACK detachedProcedure(HWND window,UINT message,WPARAM wParam,LPARAM lParam){
    const auto found=detachedWindows.find(window);if(found==detachedWindows.end())return DefWindowProcW(window,message,wParam,lParam);const auto value=found->second;
    if(message==WM_SIZE&&value->controller){RECT bounds;GetClientRect(window,&bounds);value->controller->put_Bounds(bounds);}
    else if(message==WM_SETFOCUS&&value->controller)value->controller->MoveFocus(COREWEBVIEW2_MOVE_FOCUS_REASON_PROGRAMMATIC);
    else if(message==WM_DPICHANGED){const auto bounds=reinterpret_cast<RECT*>(lParam);SetWindowPos(window,nullptr,bounds->left,bounds->top,bounds->right-bounds->left,bounds->bottom-bounds->top,SWP_NOZORDER|SWP_NOACTIVATE);}
    else if(message==WM_CLOSE){if(!app.closing&&!value->closing&&value->view){const auto result=value->view->ExecuteScript(L"if(window.hbEngineRequestClose){window.hbEngineRequestClose();}else{window.chrome.webview.postMessage('hbengine.detached.close');}",nullptr);if(SUCCEEDED(result))return 0;}value->closing=true;DestroyWindow(window);return 0;}
    else if(message==WM_NCDESTROY){value->window=nullptr;detachedWindows.erase(found);return 0;}
    return DefWindowProcW(window,message,wParam,lParam);
}
#else
class BlockNewWindow final:public Callback<ICoreWebView2NewWindowRequestedEventHandler>{public:BlockNewWindow():Callback(L"{d4c185fe-c81c-4989-97af-2d3fa7ab5651}"){}HRESULT STDMETHODCALLTYPE Invoke(ICoreWebView2*,ICoreWebView2NewWindowRequestedEventArgs* args) override{args->put_Handled(TRUE);return S_OK;}};
#endif
class MessageHandler final : public Callback<ICoreWebView2WebMessageReceivedEventHandler> {
public:
    MessageHandler():Callback(L"{57213f19-00e6-49fa-8e07-898ea01ecbd2}"){}
    HRESULT STDMETHODCALLTYPE Invoke(ICoreWebView2*,ICoreWebView2WebMessageReceivedEventArgs* args) override{
        LPWSTR source=nullptr,message=nullptr;args->get_Source(&source);args->TryGetWebMessageAsString(&message);
        const bool own=source&&std::wstring(source).rfind(app.url,0)==0;
        if(own&&message&&!app.smoke.empty()&&(std::wstring(message)==L"hbengine.ready.hub"||std::wstring(message)==L"hbengine.ready.editor"||std::wstring(message)==L"hbengine.ready.player")){
#ifndef HB_GAME_PLAYER
            if(app.windowSmoke&&!app.windowSmokeStarted){app.windowSmokeStarted=true;app.view->ExecuteScript(L"import('/prototype/tests/detached-window-cases.js').then(test=>test.detachedWindowCases()).catch(error=>window.chrome.webview.postMessage('hbengine.windows.failed:'+error.message));",nullptr);CoTaskMemFree(source);CoTaskMemFree(message);return S_OK;}
#endif
            const auto workspace=std::wstring(message)==L"hbengine.ready.hub"?"hub":std::wstring(message)==L"hbengine.ready.player"?"player":"editor";
            write(app.smoke,"{\"ok\":true,\"embedded\":true,\"workspace\":\""+std::string(workspace)+"\",\"port\":"+std::string(app.url.begin()+17,app.url.end()-1)+"}");app.smokeSuccess=true;
            if(app.editorAcceptance){CoTaskMemFree(source);CoTaskMemFree(message);return S_OK;}
            const auto result=app.view->ExecuteScript(L"window.hbEngineRequestClose();",nullptr);if(FAILED(result))error(L"편집기를 종료하지 못했어요.",result);
        }
        if(own&&message&&app.editorAcceptance&&std::wstring(message)==L"hbengine.acceptance.finished")app.view->ExecuteScript(L"window.hbEngineRequestClose();",nullptr);
        if(own&&message&&app.windowSmoke&&std::wstring(message)==L"hbengine.windows.passed"){
            write(app.smoke,"{\"ok\":true,\"embedded\":true,\"workspace\":\"detached-windows\",\"nativeWindows\":"+
#ifndef HB_GAME_PLAYER
                std::to_string(detachedWindows.size())+
#else
                std::string("0")+
#endif
                "}");app.smokeSuccess=true;app.view->ExecuteScript(L"window.hbEngineRequestClose();",nullptr);
        }
        if(own&&message&&app.windowSmoke&&std::wstring(message).rfind(L"hbengine.windows.failed:",0)==0)error(message);
        if(own&&message&&std::wstring(message)==L"hbengine.operator.unlock")app.operatorUnlocked=true;
        if(own&&message&&std::wstring(message)==L"hbengine.close"&&(!app.kiosk||app.operatorUnlocked||!app.smoke.empty())){app.closing=true;DestroyWindow(app.window);}
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
        auto blocked=new BlockNewWindow;app.view->add_NewWindowRequested(blocked,&token);blocked->Release();
        ICoreWebView2_13* extended=nullptr;ICoreWebView2Profile* profile=nullptr;ICoreWebView2Profile4* permissions=nullptr;
        HRESULT result=app.view->QueryInterface(IID_ICoreWebView2_13,reinterpret_cast<void**>(&extended));
        if(SUCCEEDED(result))result=extended->get_Profile(&profile);
        if(SUCCEEDED(result))result=profile->QueryInterface(IID_ICoreWebView2Profile4,reinterpret_cast<void**>(&permissions));
        if(SUCCEEDED(result)){auto handler=new AutoplayHandler;result=permissions->SetPermissionState(COREWEBVIEW2_PERMISSION_KIND_AUTOPLAY,app.url.c_str(),COREWEBVIEW2_PERMISSION_STATE_ALLOW,handler);handler->Release();}
        if(permissions)permissions->Release();if(profile)profile->Release();if(extended)extended->Release();
        if(FAILED(result))error(L"게임 사운드를 초기화하지 못했어요. WebView2 Runtime을 업데이트하세요.",result);
#else
        attachNewWindow(app.view);
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
        app.environment=environment;environment->AddRef();
        auto handler=new ControllerHandler;const auto result=environment->CreateCoreWebView2Controller(app.window,handler);handler->Release();
        if(FAILED(result))error(L"편집기 창 초기화에 실패했어요.",result);return S_OK;
    }
};
LRESULT CALLBACK windowProcedure(HWND window,UINT message,WPARAM wParam,LPARAM lParam){
    if(app.kiosk&&app.smoke.empty()&&!app.operatorUnlocked){if(message==WM_CLOSE)return 0;if(message==WM_SYSCOMMAND&&app.kioskPreventMinimize&&((wParam&0xfff0)==SC_MINIMIZE||(wParam&0xfff0)==SC_MAXIMIZE))return 0;}
    if(message==WM_SIZE&&app.controller){RECT bounds;GetClientRect(window,&bounds);app.controller->put_Bounds(bounds);}
    else if(message==WM_SETFOCUS&&app.controller)app.controller->MoveFocus(COREWEBVIEW2_MOVE_FOCUS_REASON_PROGRAMMATIC);
    else if(message==WM_DPICHANGED){const auto bounds=reinterpret_cast<RECT*>(lParam);SetWindowPos(window,nullptr,bounds->left,bounds->top,bounds->right-bounds->left,bounds->bottom-bounds->top,SWP_NOZORDER|SWP_NOACTIVATE);}
    else if(message==WM_CLOSE){
        if(!app.closing&&app.view){const auto result=app.view->ExecuteScript(L"if(typeof window.hbEngineRequestClose==='function'){window.hbEngineRequestClose();}else{window.chrome.webview.postMessage('hbengine.close');}",nullptr);if(SUCCEEDED(result))return 0;}
        app.closing=true;DestroyWindow(window);return 0;
    }else if(message==WM_TIMER){
        if(wParam==2){error(L"편집기 초기화 시간이 초과됐어요.");return 0;}
        if(app.process&&WaitForSingleObject(app.process,0)==WAIT_OBJECT_0){error(L"편집기 서버가 종료됐어요. 실행 로그를 확인해 주세요.");return 0;}
    }else if(message==WM_DESTROY){
#ifndef HB_GAME_PLAYER
        closeDetached();
#endif
        app.window=nullptr;PostQuitMessage(0);return 0;}
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
        app.userData=env(L"HB_USER_DATA_DIR");
        auto defaultUserData=fs::path(env(L"LOCALAPPDATA"))/L"HBEngine";
        #ifndef HB_GAME_PLAYER
        // Installed user builds keep their browser profile away from development builds.
        if(fs::is_regular_file(app.root/L"HBEngine.install.json")){defaultUserData/=L"User";SetEnvironmentVariableW(L"PORT",L"0");}
        #endif
        if(app.userData.empty())app.userData=defaultUserData;
        fs::create_directories(app.userData/L"Sessions");std::wstring project;bool registerOnly=false;int count;auto arguments=CommandLineToArgvW(GetCommandLineW(),&count);
        for(int i=1;i<count;i++){const std::wstring value=arguments[i];if(value==L"--register")registerOnly=true;else if((value==L"--smoke-test"||value==L"--smoke-windows")&&i+1<count){app.windowSmoke=value==L"--smoke-windows";app.smoke=fs::absolute(arguments[++i]);}else if(value.rfind(L"--",0)==0)throw std::runtime_error("argument");else if(project.empty())project=fs::absolute(value).wstring();else throw std::runtime_error("argument");}LocalFree(arguments);
        if(!project.empty()&&(!fs::is_regular_file(project)||_wcsicmp(fs::path(project).extension().c_str(),L".hbproject")))throw std::runtime_error("project file");
        #ifndef HB_GAME_PLAYER
        if(app.smoke.empty())associateProject(executable);
        #else
        if(!project.empty()||registerOnly||app.windowSmoke)throw std::runtime_error("player argument");
        const auto game=nlohmann::json::parse(read(app.root/L"game.hbpack.json"));app.development=game.value("configuration",std::string{})=="development";
        const auto kiosk=game.value("kiosk",nlohmann::json::object());app.kiosk=kiosk.value("enabled",false);app.kioskFullscreen=app.kiosk&&kiosk.value("fullscreen",true);app.kioskPreventMinimize=app.kiosk&&kiosk.value("preventMinimize",true);
        if(env(L"HB_USER_DATA_DIR").empty()){const auto id=game.at("id").get<std::string>();if(!std::regex_match(id,std::regex("[0-9a-f-]{36}")))throw std::runtime_error("game identity");app.userData=fs::path(env(L"LOCALAPPDATA"))/L"HBEngine"/L"Games"/wide(id);fs::create_directories(app.userData/L"Sessions");}
        SetEnvironmentVariableW(L"HB_PLAYER_SMOKE",app.smoke.empty()?nullptr:L"1");
        #endif
#ifndef HB_GAME_PLAYER
        app.editorAcceptance=!app.smoke.empty()&&!project.empty()&&env(L"HB_EDITOR_ACCEPTANCE")==L"1";
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
        if(app.kioskFullscreen&&app.smoke.empty()){MONITORINFO monitor{sizeof(monitor)};GetMonitorInfoW(MonitorFromWindow(app.window,MONITOR_DEFAULTTONEAREST),&monitor);SetWindowLongPtrW(app.window,GWL_STYLE,WS_POPUP);SetWindowPos(app.window,HWND_TOPMOST,monitor.rcMonitor.left,monitor.rcMonitor.top,monitor.rcMonitor.right-monitor.rcMonitor.left,monitor.rcMonitor.bottom-monitor.rcMonitor.top,SWP_FRAMECHANGED|SWP_NOACTIVATE);}
        BOOL dark=TRUE;DwmSetWindowAttribute(app.window,20,&dark,sizeof(dark));if(app.editorAcceptance){SetWindowPos(app.window,HWND_BOTTOM,-20000,-20000,0,0,SWP_NOSIZE|SWP_NOACTIVATE);ShowWindow(app.window,SW_SHOWNOACTIVATE);}else if(app.smoke.empty())ShowWindow(app.window,show);
#ifdef HB_GAME_PLAYER
        else{SetWindowPos(app.window,HWND_BOTTOM,-20000,-20000,0,0,SWP_NOSIZE|SWP_NOACTIVATE);ShowWindow(app.window,SW_SHOWNOACTIVATE);}
#endif

        auto loaderPath=app.root/L"WebView2Loader.dll";if(!fs::exists(loaderPath))loaderPath=folder/L"dist/HBEngine/WebView2Loader.dll";
        loader=LoadLibraryExW(loaderPath.c_str(),nullptr,LOAD_LIBRARY_SEARCH_DLL_LOAD_DIR|LOAD_LIBRARY_SEARCH_DEFAULT_DIRS);if(!loader)throw std::runtime_error("WebView2 loader");
        using CreateEnvironment=HRESULT(STDAPICALLTYPE*)(PCWSTR,PCWSTR,ICoreWebView2EnvironmentOptions*,ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler*);
        const auto create=reinterpret_cast<CreateEnvironment>(GetProcAddress(loader,"CreateCoreWebView2EnvironmentWithOptions"));if(!create)throw std::runtime_error("WebView2 entry");
        // AudioRuntime gates playback on input or explicit automation consent, as the mobile hosts do.
        const auto browserArguments=env(L"WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS")+L" --autoplay-policy=no-user-gesture-required";
        SetEnvironmentVariableW(L"WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS",browserArguments.c_str());
        const auto profile=app.userData/L"WebView2";auto handler=new EnvironmentHandler;const auto result=create(nullptr,profile.c_str(),nullptr,handler);handler->Release();if(FAILED(result))error(L"WebView2 Runtime을 시작하지 못했어요.",result);
        SetTimer(app.window,1,1000,nullptr);if(!app.smoke.empty()){UINT timeout=(app.editorAcceptance||env(L"HB_PLAYER_ACCEPTANCE")==L"1")?180000:30000;const auto soak=env(L"HB_PLAYER_SOAK_HOURS");if(!soak.empty()&&env(L"HB_PLAYER_ACCEPTANCE")==L"1"){const auto hours=std::stoul(soak);if(hours<1||hours>24||std::to_wstring(hours)!=soak)throw std::runtime_error("soak hours");timeout=static_cast<UINT>(hours*3600000+60000);}SetTimer(app.window,2,timeout,nullptr);}
        MSG message;while(GetMessageW(&message,nullptr,0,0)>0){TranslateMessage(&message);DispatchMessageW(&message);}
    }catch(const std::exception& exception){
        const auto details=L"엔진을 시작하지 못했어요: "+wide(exception.what())+L"\n실행 로그: "+app.log.wstring();error(details.c_str());
    }
    app.closing=true;if(app.view){app.view->Release();app.view=nullptr;}if(app.controller){app.controller->Close();app.controller->Release();app.controller=nullptr;}
    if(app.environment){app.environment->Release();app.environment=nullptr;}
    if(app.job){CloseHandle(app.job);app.job=nullptr;}if(loader)FreeLibrary(loader);if(single)CloseHandle(single);CoUninitialize();
    return app.smoke.empty()?(app.failed?1:0):(app.smokeSuccess&&!app.failed?0:1);
}
