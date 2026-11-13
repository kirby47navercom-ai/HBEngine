#include <algorithm>
#include <nlohmann/json.hpp>
#include "SceneRenderBridge.hpp"
#ifndef UNICODE
#define UNICODE
#endif
#define _UNICODE
#include <windows.h>
#include <shellapi.h>
#include <shlobj.h>
#include <dwmapi.h>
#include <filesystem>
#include <fstream>
#include <regex>
#include <string>
#include <cwctype>
#include <stdexcept>
#include <memory>
#include <map>
#include <cstdio>
namespace fs=std::filesystem;
#include "EditorTreePanel.hpp"
#include "EditorFormPanel.hpp"
#include "EditorListPanel.hpp"
struct State {
    HWND window=nullptr;
    fs::path root,userData,ready,log,smoke;
    bool closing=false,failed=false,windowSmoke=false;
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
#include "NativeEditorShell.hpp"
void error(const wchar_t* text,HRESULT code=E_FAIL){
    app.failed=true;
    if(!app.smoke.empty()){try{write(app.smoke,"{\"ok\":false,\"hresult\":"+std::to_string(unsigned(code))+"}");write(fs::path(app.smoke.wstring()+L".error.txt"),utf8(text));}catch(...){}}
    else MessageBoxW(app.window,text,L"HBEngine",MB_OK|MB_ICONERROR);
    app.closing=true;if(app.window)DestroyWindow(app.window);
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
    try{
        wchar_t buffer[32768];GetModuleFileNameW(nullptr,buffer,32768);const fs::path executable=buffer;const auto folder=executable.parent_path();
        const auto serverScript=L"tools/serve.mjs";
        app.root=fs::exists(folder/serverScript)?folder:folder/L"dist/HBEngine";
        if(!fs::exists(app.root/serverScript))throw std::runtime_error("engine files");
        app.userData=env(L"HB_USER_DATA_DIR");
        auto defaultUserData=fs::path(env(L"LOCALAPPDATA"))/L"HBEngine";
        // Installed user builds keep their browser profile away from development builds.
        if(fs::is_regular_file(app.root/L"HBEngine.install.json")){defaultUserData/=L"User";SetEnvironmentVariableW(L"PORT",L"0");}
        if(app.userData.empty())app.userData=defaultUserData;
        fs::create_directories(app.userData/L"Sessions");std::wstring project;bool registerOnly=false,nativeEditor=false;
        nativeEditor=true;
        int count=0;
        std::unique_ptr<wchar_t*,decltype(&LocalFree)> arguments(CommandLineToArgvW(GetCommandLineW(),&count),LocalFree);
        if(!arguments)throw std::runtime_error("command line");
        for(int i=1;i<count;i++){
            const std::wstring value=arguments.get()[i];
            if(value==L"--register")registerOnly=true;
            else if(value==L"--native-editor")nativeEditor=true;
            else if((value==L"--smoke-test"||value==L"--smoke-windows")&&i+1<count){app.windowSmoke=value==L"--smoke-windows";app.smoke=fs::absolute(arguments.get()[++i]);}
            else if(value.rfind(L"--",0)==0)throw std::runtime_error("argument");
            else if(project.empty())project=fs::absolute(value).wstring();
            else throw std::runtime_error("argument");
        }
        if(!project.empty()&&(!fs::is_regular_file(project)||_wcsicmp(fs::path(project).extension().c_str(),L".hbproject")))throw std::runtime_error("project file");
        if(app.smoke.empty()&&(registerOnly||(!nativeEditor&&fs::is_regular_file(app.root/L"HBEngine.install.json"))))associateProject(executable);
        if(registerOnly){CoUninitialize();return 0;}
        // Seed the same shader bytecode cache for both desktop authoring paths.
        {const auto shaderCache=(env(L"HB_USER_DATA_DIR").empty()?fs::path(env(L"LOCALAPPDATA"))/L"HBEngine":app.userData)/L"Cache"/L"ShaderBytecode";
        std::error_code ignored;fs::create_directories(shaderCache,ignored);for(const auto& bundled:{app.root/L"Shaders",folder/L"dist/HBEngine/Shaders"})if(fs::is_directory(bundled,ignored)){for(const auto& entry:fs::directory_iterator(bundled,ignored))if(entry.is_regular_file()&&!entry.is_symlink()&&entry.file_size()<=8*1024*1024)fs::copy_file(entry.path(),shaderCache/entry.path().filename(),fs::copy_options::skip_existing,ignored);break;}
        hb::gpu::SceneRenderer::configureShaderCache(shaderCache);}
        if(nativeEditor){
            SetEnvironmentVariableW(L"HB_USER_DATA_DIR",app.userData.c_str());
            auto node=app.root/L"runtime/node.exe";
            if(!fs::is_regular_file(node))node=folder/L"dist/HBEngine/runtime/node.exe";
            if(!fs::is_regular_file(node))throw std::runtime_error("node runtime");
            int result=0;
            {NativeEditorShell editor(instance);result=editor.run(node,app.root/L"tools/native-editor-session.mjs",app.userData,project,show,app.smoke);}
            CoUninitialize();return result;
        }
    }catch(const std::exception& exception){
        const auto details=L"엔진을 시작하지 못했어요: "+wide(exception.what())+L"\n실행 로그: "+app.log.wstring();error(details.c_str());
    }
    CoUninitialize();return app.failed?1:0;
}
