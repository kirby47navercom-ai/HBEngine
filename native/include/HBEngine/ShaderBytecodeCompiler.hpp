#pragma once
#include "ComputePlatform.hpp"
#if defined(_WIN32) && !defined(HB_COMPUTE_UNAVAILABLE)
#include "ShaderBytecodeDiskCache.hpp"
#include "ShaderBytecodeCache.hpp"
#include "ShaderPreparationQueue.hpp"
#include <memory>
#include <mutex>

namespace hb::gpu::detail {
// No implicit filesystem access in SDK consumers. The desktop host opts in.
// One bounded store serves every renderer using this helper, across projects/versions.
class ShaderBytecodeCompiler {
    struct State {
        std::mutex mutex;
        ShaderBytecodeDiskCache disk;
        std::uint64_t generation=0;
        explicit State(const std::filesystem::path& root={}):disk(root){}
    };
    static State& state(){static State value;return value;}
    static std::string fingerprint(){
        wchar_t file[32768]{};
        const auto count=GetModuleFileNameW(libraries().compiler,file,32768);
        WIN32_FILE_ATTRIBUTE_DATA info{};
        if(!count||count>=32768||!GetFileAttributesExW(file,GetFileExInfoStandard,&info))return {};
        return std::to_string(info.nFileSizeHigh)+":"+std::to_string(info.nFileSizeLow)+":"+
            std::to_string(info.ftLastWriteTime.dwHighDateTime)+":"+std::to_string(info.ftLastWriteTime.dwLowDateTime);
    }
public:
    struct Result {std::vector<unsigned char> code;bool compiled=false;std::uint64_t compileMS=0;};
    static constexpr UINT flags=D3DCOMPILE_ENABLE_STRICTNESS|D3DCOMPILE_OPTIMIZATION_LEVEL3;
    static void configure(const std::filesystem::path& root){
        auto& s=state();std::lock_guard<std::mutex> lock(s.mutex);++s.generation;s.disk.configure(root);
    }
    static std::array<std::uint64_t,10> info(){
        auto& s=state();std::lock_guard<std::mutex> lock(s.mutex);const auto& i=s.disk.info();
        return {i.hits,i.misses,i.writes,i.evictions,i.lastScannedBytes,i.budget,i.invalid,i.errors,i.busy,i.configured?1ULL:0ULL};
    }
    static std::string key(const std::string& source,const char* name,const char* entry,const char* target){
        const auto stamp=fingerprint();if(stamp.empty())return {};
        std::string out="HBShaderBytecode:1:"+stamp+":"+std::to_string(flags)+":";
        for(const auto* value:{name,entry,target}){const auto size=std::strlen(value);out+=std::to_string(size)+":";out.append(value,size);}
        out+=source;return out;
    }
    // create returns HRESULT. Device rejection of a disk entry retries the compiler
    // once; source/compiler/device failures still propagate normally.
    template<class Create> static Result create(const std::string& source,const char* name,const char* entry,const char* target,Create&& make,bool refresh=false){
        auto& s=state();Result result;std::string cacheKey;std::uint64_t generation;bool cached=false;
        {
            std::lock_guard<std::mutex> lock(s.mutex);generation=s.generation;
            cacheKey=s.disk.info().configured?key(source,name,entry,target):std::string{};
            if(!cacheKey.empty()){if(refresh)s.disk.reject(cacheKey);else cached=s.disk.get(cacheKey,result.code);}
        }
        // Driver creation and compilation can take seconds. Keep cache/configuration
        // inspection independent and allow callbacks to inspect compiler state.
        if(cached){
            if(SUCCEEDED(make(result.code.data(),result.code.size())))return result;
            {std::lock_guard<std::mutex> lock(s.mutex);if(generation==s.generation)s.disk.reject(cacheKey);}
            result.code.clear();
        }
        const auto compile=libraries().symbol<decltype(&D3DCompile)>(libraries().compiler,"D3DCompile");
        Com<ID3DBlob> blob,error;const auto start=GetTickCount64();
        const auto status=compile(source.data(),source.size(),name,nullptr,nullptr,entry,target,flags,0,&blob.p,&error.p);
        result.compileMS=GetTickCount64()-start;result.compiled=true;
        if(FAILED(status))throw std::runtime_error(error.p?std::string(static_cast<const char*>(error->GetBufferPointer()),error->GetBufferSize()):"Shader compile failed");
        const auto* bytes=static_cast<const unsigned char*>(blob->GetBufferPointer());result.code.assign(bytes,bytes+blob->GetBufferSize());
        check(make(result.code.data(),result.code.size()),"Compiled shader creation");
        if(!cacheKey.empty()){std::lock_guard<std::mutex> lock(s.mutex);if(generation==s.generation)s.disk.put(cacheKey,result.code);}
        return result;
    }
};
// Initialize every worker dependency before the shared service. In particular,
// the screen compiler cache must outlive a queue first requested by Compute.
struct ScreenShaderCompilerState {std::mutex mutex;ShaderBytecodeCache cache;std::uint64_t compilations=0,totalMS=0,lastMS=0;};
inline ScreenShaderCompilerState& screenShaderCompilerState(){static ScreenShaderCompilerState value;return value;}
inline ShaderPreparationQueue& sharedShaderPreparationQueue(){libraries();ShaderBytecodeCompiler::info();screenShaderCompilerState();static ShaderPreparationQueue queue;return queue;}
}
#endif
// Preserve consumers that included this helper for the Compute SDK. Definitions
// above must precede Device; pragma-once handles the reverse include from Compute.
#include "Compute.hpp"
