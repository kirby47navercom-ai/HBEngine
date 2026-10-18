#include <HBEngine/ShaderBytecodeDiskCache.hpp>
#include <cassert>
#include <iostream>
#include <thread>
#include <chrono>
namespace fs=std::filesystem;
using Cache=hb::gpu::ShaderBytecodeDiskCache;
static std::vector<fs::path> entries(const fs::path& root){
    std::vector<fs::path> result;
    for(const auto& file:fs::directory_iterator(root))if(file.path().extension()==L".hbsbc")result.push_back(file.path());
    return result;
}
static std::uint64_t size(const fs::path& root){std::uint64_t total=0;for(const auto& file:entries(root))total+=fs::file_size(file);return total;}
static fs::path keyed(const fs::path& root,const std::string& key){
    for(const auto& file:entries(root)){std::ifstream input(file,std::ios::binary);input.seekg(64);std::string value(key.size(),'\0');input.read(value.data(),std::streamsize(value.size()));if(value==key)return file;}
    throw std::runtime_error("Test key missing");
}
static void write(const fs::path& file,const std::string& value){std::ofstream out(file,std::ios::binary);out<<value;}
int main(int argc,char** argv){try{
    if(argc<3)throw std::runtime_error("mode and owned directory required");
    const std::string mode=argv[1];const fs::path root=fs::absolute(argv[2]);
    if(mode=="hold"){
        fs::create_directories(root);const auto file=CreateFileW((root/L".hb-shader-cache-lock").c_str(),GENERIC_READ|GENERIC_WRITE,FILE_SHARE_READ|FILE_SHARE_WRITE,nullptr,OPEN_ALWAYS,FILE_ATTRIBUTE_NORMAL,nullptr);
        assert(file!=INVALID_HANDLE_VALUE);OVERLAPPED range{};assert(LockFileEx(file,LOCKFILE_EXCLUSIVE_LOCK|LOCKFILE_FAIL_IMMEDIATELY,0,1,0,&range));
        write(root/L".hb-shader-cache-v1.tmp-123-1","incomplete");write(root/L"hbsc-00000000000000000000000000000000.hbsbc.tmp-123-2","incomplete");
        std::cout<<"ready"<<std::endl;Sleep(INFINITE);return 0;
    }
    if(mode=="writer"){
        Cache cache(root,4096);const std::string owner=std::to_string(GetCurrentProcessId());
        for(int i=0;i<60;++i)cache.put(owner+":"+std::to_string(i),std::vector<unsigned char>(700,static_cast<unsigned char>(i)));
        std::cout<<"{\"passed\":true,\"writes\":"<<cache.info().writes<<",\"busy\":"<<cache.info().busy<<"}";return 0;
    }
    if(mode=="recover"){
        Cache cache(root,4096);assert(cache.put("recovered",std::vector<unsigned char>(1000,17)));
        assert(!fs::exists(root/L".hb-shader-cache-v1.tmp-123-1"));assert(!fs::exists(root/L"hbsc-00000000000000000000000000000000.hbsbc.tmp-123-2"));
        std::vector<unsigned char> code;assert(cache.get("recovered",code)&&code[0]==17);assert(size(root)<=4096);
        std::cout<<"{\"passed\":true,\"crashLockReleased\":true,\"partialPublicationCleaned\":true}";return 0;
    }
    assert(mode=="unit");fs::create_directories(root);std::vector<unsigned char> output,code(1000,7);
    Cache disabled;assert(!disabled.put("a",code)&&!disabled.get("a",output));
    const auto lru=root/L"lru";Cache cache(lru,4096);assert(!cache.get("a",output));
    for(const auto* key:{"a","b","c"})assert(cache.put(key,code));
    const auto now=fs::file_time_type::clock::now();fs::last_write_time(keyed(lru,"a"),now-std::chrono::seconds(1));fs::last_write_time(keyed(lru,"b"),now-std::chrono::seconds(3));fs::last_write_time(keyed(lru,"c"),now-std::chrono::seconds(2));
    assert(cache.put("d",code));assert(!cache.get("b",output)&&cache.get("a",output));assert(cache.info().evictions==1);assert(size(lru)<=4096);
    assert(cache.put("a",std::vector<unsigned char>(1800,9)));assert(cache.get("a",output)&&output.size()==1800&&output[0]==9);assert(size(lru)<=4096);
    const auto retained=size(lru);assert(!cache.put("oversized",std::vector<unsigned char>(4096,1)));assert(size(lru)==retained);
    const auto bad=root/L"corrupt";Cache corrupt(bad,4096);const std::string key("a\0b",3);assert(corrupt.put(key,code));assert(corrupt.get(key,output)&&output==code);assert(!corrupt.get("a",output));
    const auto file=keyed(bad,key);{std::fstream change(file,std::ios::binary|std::ios::in|std::ios::out);change.seekp(-1,std::ios::end);change.put(8);}
    assert(!corrupt.get(key,output)&&output.empty());assert(corrupt.put(key,code));
    {std::fstream change(file,std::ios::binary|std::ios::in|std::ios::out);const std::uint64_t giant=std::numeric_limits<std::uint64_t>::max();change.seekp(24);change.write(reinterpret_cast<const char*>(&giant),8);}
    assert(!corrupt.get(key,output)&&output.empty());write(file,"short");assert(!corrupt.get(key,output));assert(corrupt.put(key,code));assert(corrupt.reject(key));assert(!corrupt.get(key,output));assert(corrupt.info().invalid>=4);
    write(bad/L"unknown.bin","preserved");write(bad/L".hb-shader-cache-v1.tmp-invalid","preserved");assert(corrupt.put(key,code));assert(fs::file_size(bad/L"unknown.bin")==9&&fs::exists(bad/L".hb-shader-cache-v1.tmp-invalid"));
    const auto marker=root/L"foreign";fs::create_directories(marker);write(marker/L".hb-shader-cache-v1","foreign");Cache foreign(marker,4096);assert(!foreign.put("a",code)&&!foreign.get("a",output));assert(fs::file_size(marker/L".hb-shader-cache-v1")==7);
    const auto blocked=root/L"file";write(blocked,"keep");Cache unwritable(blocked,4096);assert(!unwritable.put("a",code)&&!unwritable.get("a",output));assert(fs::file_size(blocked)==4);
    const auto lock=CreateFileW((lru/L".hb-shader-cache-lock").c_str(),GENERIC_READ|GENERIC_WRITE,FILE_SHARE_READ|FILE_SHARE_WRITE,nullptr,OPEN_ALWAYS,FILE_ATTRIBUTE_NORMAL,nullptr);assert(lock!=INVALID_HANDLE_VALUE);OVERLAPPED range{};assert(LockFileEx(lock,LOCKFILE_EXCLUSIVE_LOCK|LOCKFILE_FAIL_IMMEDIATELY,0,1,0,&range));
    const auto begin=GetTickCount64();assert(!cache.put("busy",code));assert(cache.info().busy==1&&GetTickCount64()-begin<1000);UnlockFileEx(lock,0,1,0,&range);CloseHandle(lock);assert(cache.put("after",code));assert(size(lru)<=4096);
    Cache readOnly(lru,4096);assert(readOnly.get("after",output)&&output==code);
    std::cout<<"{\"passed\":true,\"budget\":4096,\"lru\":true,\"replacementTemporaryBudget\":true,\"corruptAndOversized\":true,\"binaryKey\":true,\"unknownPreserved\":true,\"nonblockingLock\":true,\"unwritableFallback\":true}";
}catch(const std::exception& error){std::cerr<<error.what()<<'\n';return 1;}}
