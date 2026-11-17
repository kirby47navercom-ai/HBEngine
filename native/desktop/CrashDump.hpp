#pragma once
// Crash reporting: an unhandled exception writes a minidump to %LOCALAPPDATA%\HBEngine\Crashes\<app>-<time>.dmp.
// The newest 10 dumps are kept.
#include <windows.h>
#include <dbghelp.h>
#include <algorithm>
#include <filesystem>
#include <string>
#include <vector>

namespace hb::crash {
inline std::wstring& folder(){static std::wstring value;return value;}
inline std::wstring& app(){static std::wstring value;return value;}
inline LONG WINAPI write(EXCEPTION_POINTERS* exception){
    SYSTEMTIME t{};GetLocalTime(&t);wchar_t name[96];swprintf(name,96,L"%ls-%04u%02u%02u-%02u%02u%02u.dmp",app().c_str(),t.wYear,t.wMonth,t.wDay,t.wHour,t.wMinute,t.wSecond);
    const auto file=folder()+L"\\"+name;
    const HANDLE out=CreateFileW(file.c_str(),GENERIC_WRITE,0,nullptr,CREATE_ALWAYS,FILE_ATTRIBUTE_NORMAL,nullptr);
    if(out!=INVALID_HANDLE_VALUE){MINIDUMP_EXCEPTION_INFORMATION info{GetCurrentThreadId(),exception,FALSE};MiniDumpWriteDump(GetCurrentProcess(),GetCurrentProcessId(),out,MiniDumpWithThreadInfo,exception?&info:nullptr,nullptr,nullptr);CloseHandle(out);}
    return EXCEPTION_CONTINUE_SEARCH;
}
inline void install(const wchar_t* name){
    wchar_t base[MAX_PATH]{};if(!GetEnvironmentVariableW(L"LOCALAPPDATA",base,MAX_PATH))return;
    namespace fs=std::filesystem;std::error_code error;const fs::path dir=fs::path(base)/L"HBEngine"/L"Crashes";fs::create_directories(dir,error);if(error)return;
    folder()=dir.wstring();app()=name;
    std::vector<fs::path> dumps;for(const auto& entry:fs::directory_iterator(dir,error))if(entry.path().extension()==L".dmp")dumps.push_back(entry.path());
    std::sort(dumps.begin(),dumps.end(),[](const fs::path& a,const fs::path& b){std::error_code e;return fs::last_write_time(a,e)>fs::last_write_time(b,e);});
    for(std::size_t i=10;i<dumps.size();i++)fs::remove(dumps[i],error);
    SetUnhandledExceptionFilter(write);
}
}
