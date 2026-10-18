#pragma once
#include <atomic>
#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>
#include <cstring>
#include <limits>
#include <mutex>
#include <optional>
#include <stdexcept>
#include <string>
#include <utility>
#include <vector>
#if defined(_WIN32) && !defined(HB_COMPUTE_UNAVAILABLE)
#ifndef NOMINMAX
#define NOMINMAX
#endif
#pragma push_macro("GetObject")
#include <windows.h>
#include <d3d11.h>
#include <d3dcompiler.h>
#pragma pop_macro("GetObject")
#endif

namespace hb::gpu {
#if defined(_WIN32) && !defined(HB_COMPUTE_UNAVAILABLE)
namespace detail {
template<class T> struct Com {
    T* p=nullptr; Com()=default; ~Com(){if(p)p->Release();}
    Com(const Com&)=delete;Com& operator=(const Com&)=delete;
    Com(Com&& o) noexcept:p(std::exchange(o.p,nullptr)){}
    Com& operator=(Com&& o) noexcept{if(this!=&o){if(p)p->Release();p=std::exchange(o.p,nullptr);}return *this;}
    T* operator->() const{return p;}
};
inline void check(HRESULT result,const char* action){if(FAILED(result))throw std::runtime_error(std::string(action)+" (HRESULT "+std::to_string(static_cast<unsigned long>(result))+")");}
struct Libraries {
    HMODULE d3d=LoadLibraryExW(L"d3d11.dll",nullptr,LOAD_LIBRARY_SEARCH_SYSTEM32),compiler=LoadLibraryExW(L"d3dcompiler_47.dll",nullptr,LOAD_LIBRARY_SEARCH_SYSTEM32);
    ~Libraries(){if(compiler)FreeLibrary(compiler);if(d3d)FreeLibrary(d3d);}
    template<class T> T symbol(HMODULE library,const char* name){const auto raw=library?GetProcAddress(library,name):nullptr;T result=nullptr;static_assert(sizeof(raw)==sizeof(result));std::memcpy(&result,&raw,sizeof(result));if(!result)throw std::runtime_error("DirectCompute system entry unavailable");return result;}
};
inline Libraries& libraries(){static Libraries value;return value;}
inline UINT bytes(std::size_t floats){if(!floats||floats>std::numeric_limits<UINT>::max()/sizeof(float))throw std::runtime_error("Compute buffer byte size overflows D3D11 ByteWidth");return static_cast<UINT>(floats*sizeof(float));}
}
#endif
}
