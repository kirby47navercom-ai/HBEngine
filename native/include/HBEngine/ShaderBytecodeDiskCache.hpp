#pragma once
#if defined(_WIN32)
#ifndef NOMINMAX
#define NOMINMAX
#endif
#include <windows.h>
#include <algorithm>
#include <array>
#include <atomic>
#include <cstdint>
#include <cstring>
#include <exception>
#include <filesystem>
#include <fstream>
#include <limits>
#include <string>
#include <vector>

namespace hb::gpu {
// Optional, bounded data cache. The compiler owns synchronization of this instance.
// A short nonblocking file lock serializes publishers across processes/sessions.
class ShaderBytecodeDiskCache {
public:
    struct Info {std::uint64_t hits=0,misses=0,writes=0,evictions=0,lastScannedBytes=0,budget=0,invalid=0,errors=0,busy=0;bool configured=false;};
private:
    struct Header {char magic[8];std::uint64_t version,keyBytes,codeBytes,keyA,keyB,codeA,codeB;};
    static_assert(sizeof(Header)==64,"Shader cache header layout");
    static constexpr char magic[8]={'H','B','S','C','B','C','1',0};
    static constexpr const char* marker="HBEngine bounded shader bytecode cache v1\n";
    struct File {std::filesystem::path path;std::uint64_t bytes;std::filesystem::file_time_type time;};
    struct Lock {
        HANDLE file=INVALID_HANDLE_VALUE;OVERLAPPED range{};bool owned=false;
        explicit Lock(const std::filesystem::path& path){
            file=CreateFileW(path.c_str(),GENERIC_READ|GENERIC_WRITE,FILE_SHARE_READ|FILE_SHARE_WRITE,nullptr,OPEN_ALWAYS,FILE_ATTRIBUTE_NORMAL|FILE_FLAG_OPEN_REPARSE_POINT,nullptr);
            if(file==INVALID_HANDLE_VALUE)return;
            BY_HANDLE_FILE_INFORMATION info{};
            if(GetFileInformationByHandle(file,&info)&&!(info.dwFileAttributes&FILE_ATTRIBUTE_REPARSE_POINT))owned=LockFileEx(file,LOCKFILE_EXCLUSIVE_LOCK|LOCKFILE_FAIL_IMMEDIATELY,0,1,0,&range)!=FALSE;
        }
        ~Lock(){if(file!=INVALID_HANDLE_VALUE){if(owned)UnlockFileEx(file,0,1,0,&range);CloseHandle(file);}}
        Lock(const Lock&)=delete;Lock& operator=(const Lock&)=delete;
    };
    std::filesystem::path root;std::uint64_t limit;Info info_;bool scanned=false;
    static std::uint64_t hash(const void* data,std::size_t bytes,std::uint64_t seed){const auto* p=static_cast<const unsigned char*>(data);for(std::size_t i=0;i<bytes;++i){seed^=p[i];seed*=1099511628211ULL;}return seed;}
    static std::array<std::uint64_t,2> hashes(const void* data,std::size_t bytes){return {hash(data,bytes,14695981039346656037ULL),hash(data,bytes,7809847782465536322ULL)};}
    static std::wstring hex(std::uint64_t value){std::wstring result(16,L'0');for(int i=15;i>=0;--i){result[std::size_t(i)]=L"0123456789abcdef"[value&15];value>>=4;}return result;}
    std::filesystem::path entry(const std::string& key)const{const auto h=hashes(key.data(),key.size());return root/(L"hbsc-"+hex(h[0])+hex(h[1])+L".hbsbc");}
    static bool finalName(const std::wstring& name){if(name.size()!=43||name.compare(0,5,L"hbsc-")||name.compare(37,6,L".hbsbc"))return false;return std::all_of(name.begin()+5,name.begin()+37,[](wchar_t c){return (c>=L'0'&&c<=L'9')||(c>=L'a'&&c<=L'f');});}
    static bool temporaryName(const std::wstring& name){
        const auto suffix=name.find(L".tmp-");
        if(suffix==std::wstring::npos||(!finalName(name.substr(0,suffix))&&name.substr(0,suffix)!=L".hb-shader-cache-v1"))return false;
        const auto start=suffix+5;bool dash=false;
        for(std::size_t i=start;i<name.size();++i){if(name[i]==L'-'&&!dash&&i>start&&i+1<name.size())dash=true;else if(name[i]<L'0'||name[i]>L'9')return false;}
        return dash;
    }
    bool regular(const std::filesystem::path& path)const{std::error_code error;const auto s=std::filesystem::symlink_status(path,error);return !error&&std::filesystem::is_regular_file(s)&&!std::filesystem::is_symlink(s)&&path.parent_path()==root;}
    bool markerValid()const{
        const auto path=root/L".hb-shader-cache-v1";if(!regular(path))return false;
        std::error_code error;if(std::filesystem::file_size(path,error)!=std::strlen(marker)||error)return false;
        std::ifstream input(path,std::ios::binary);std::string contents(std::strlen(marker),'\0');return bool(input.read(contents.data(),std::streamsize(contents.size())))&&contents==marker;
    }
    bool writeAll(HANDLE file,const void* data,std::size_t bytes){const auto* p=static_cast<const unsigned char*>(data);while(bytes){const auto count=DWORD(std::min<std::size_t>(bytes,1048576));DWORD written=0;if(!WriteFile(file,p,count,&written,nullptr)||written!=count)return false;p+=written;bytes-=written;}return true;}
    std::filesystem::path temporary(const std::filesystem::path& destination)const{static std::atomic<std::uint64_t> serial{0};return std::filesystem::path(destination.wstring()+L".tmp-"+std::to_wstring(GetCurrentProcessId())+L"-"+std::to_wstring(++serial));}
    bool publish(const std::filesystem::path& destination,const Header* header,const std::string& key,const std::vector<unsigned char>& code,bool replace){
        const auto temp=temporary(destination);HANDLE file=CreateFileW(temp.c_str(),GENERIC_WRITE,0,nullptr,CREATE_NEW,FILE_ATTRIBUTE_NORMAL,nullptr);if(file==INVALID_HANDLE_VALUE)return false;
        const bool written=(!header||writeAll(file,header,sizeof(*header)))&&writeAll(file,key.data(),key.size())&&writeAll(file,code.data(),code.size())&&FlushFileBuffers(file);CloseHandle(file);
        const bool moved=written&&MoveFileExW(temp.c_str(),destination.c_str(),MOVEFILE_WRITE_THROUGH|(replace?MOVEFILE_REPLACE_EXISTING:0));if(!moved){std::error_code error;std::filesystem::remove(temp,error);}return moved;
    }
    bool ensureMarker(){
        if(markerValid())return true;
        const auto path=root/L".hb-shader-cache-v1";std::error_code error;if(std::filesystem::exists(path,error)||error)return false;
        return publish(path,nullptr,marker,{},false)&&markerValid();
    }
    std::vector<File> scan(bool cleanTemps){
        std::vector<File> files;std::uint64_t total=0;
        for(const auto& e:std::filesystem::directory_iterator(root)){
            if(!regular(e.path()))continue;
            const auto name=e.path().filename().wstring();
            if(cleanTemps&&temporaryName(name)){std::error_code error;std::filesystem::remove(e.path(),error);if(error)++info_.errors;continue;}
            if(!finalName(name))continue;
            std::error_code error;const auto bytes=e.file_size(error);if(error){++info_.errors;continue;}auto time=e.last_write_time(error);if(error)time=std::filesystem::file_time_type::min();files.push_back({e.path(),bytes,time});total=bytes>std::numeric_limits<std::uint64_t>::max()-total?std::numeric_limits<std::uint64_t>::max():total+bytes;
        }info_.lastScannedBytes=total;scanned=true;return files;
    }
public:
    explicit ShaderBytecodeDiskCache(std::filesystem::path directory={},std::uint64_t budget=8*1024*1024):limit(budget){
        configure(directory);
    }
    void configure(const std::filesystem::path& directory)noexcept{root.clear();info_={};scanned=false;info_.budget=limit;try{if(!directory.empty()&&limit>sizeof(Header)){root=std::filesystem::weakly_canonical(std::filesystem::absolute(directory));info_.configured=true;}}catch(const std::exception&){++info_.errors;}}
    ShaderBytecodeDiskCache(const ShaderBytecodeDiskCache&)=delete;ShaderBytecodeDiskCache& operator=(const ShaderBytecodeDiskCache&)=delete;
    const Info& info()const{return info_;}
    bool get(const std::string& key,std::vector<unsigned char>& output)noexcept{
        output.clear();if(!info_.configured)return false;const auto miss=[&](){++info_.misses;return false;};
        try{
            if(!markerValid())return miss();
            if(!scanned)scan(false);
            const auto path=entry(key);if(!regular(path))return miss();
            std::error_code error;const auto bytes=std::filesystem::file_size(path,error);if(error){++info_.errors;return miss();}if(bytes<sizeof(Header)||bytes>limit){++info_.invalid;return miss();}
            std::ifstream input(path,std::ios::binary);Header h{};if(!input.read(reinterpret_cast<char*>(&h),sizeof(h))){++info_.errors;return miss();}
            const auto kh=hashes(key.data(),key.size());if(std::memcmp(h.magic,magic,8)||h.version!=1||h.keyBytes!=key.size()||h.keyBytes>limit-sizeof(Header)||!h.codeBytes||h.codeBytes>limit-sizeof(Header)-h.keyBytes||sizeof(Header)+h.keyBytes+h.codeBytes!=bytes||h.keyA!=kh[0]||h.keyB!=kh[1]){++info_.invalid;return miss();}
            std::string stored(std::size_t(h.keyBytes),'\0');std::vector<unsigned char> code(std::size_t(h.codeBytes));
            if(!input.read(stored.data(),std::streamsize(stored.size()))||!input.read(reinterpret_cast<char*>(code.data()),std::streamsize(code.size()))){++info_.errors;return miss();}const auto ch=hashes(code.data(),code.size());if(stored!=key||ch[0]!=h.codeA||ch[1]!=h.codeB){++info_.invalid;return miss();}
            output=std::move(code);++info_.hits;std::filesystem::last_write_time(path,std::filesystem::file_time_type::clock::now(),error);return true;
        }catch(const std::exception&){output.clear();++info_.errors;return miss();}
    }
    bool put(const std::string& key,const std::vector<unsigned char>& code)noexcept{
        if(!info_.configured||key.size()>limit-sizeof(Header)||code.empty()||code.size()>limit-sizeof(Header)-key.size())return false;
        try{
            std::filesystem::create_directories(root);if(std::filesystem::canonical(root)!=root)return false;
            Lock lock(root/L".hb-shader-cache-lock");if(!lock.owned){++info_.busy;return false;}if(!ensureMarker()){++info_.errors;return false;}
            const auto destination=entry(key);std::error_code error;if(std::filesystem::exists(destination,error)&&!regular(destination)){++info_.errors;return false;}
            auto files=scan(true);auto total=info_.lastScannedBytes;
            const auto cost=sizeof(Header)+key.size()+code.size();std::sort(files.begin(),files.end(),[](const File& a,const File& b){return a.time==b.time?a.path<b.path:a.time<b.time;});
            // Include the old replacement while budgeting the temporary publication.
            // Cache entries are reproducible, so evict before writing if needed.
            for(const auto& f:files){if(total<=limit-cost)break;std::filesystem::remove(f.path,error);if(!error){total-=f.bytes;++info_.evictions;}else ++info_.errors;}
            info_.lastScannedBytes=total;
            if(total>limit-cost)return false;
            const auto kh=hashes(key.data(),key.size()),ch=hashes(code.data(),code.size());Header h{};std::memcpy(h.magic,magic,8);h.version=1;h.keyBytes=key.size();h.codeBytes=code.size();h.keyA=kh[0];h.keyB=kh[1];h.codeA=ch[0];h.codeB=ch[1];
            if(!publish(destination,&h,key,code,true)){++info_.errors;return false;}
            ++info_.writes;scan(false);return true;
        }catch(const std::exception&){++info_.errors;return false;}
    }
    bool reject(const std::string& key)noexcept{
        ++info_.invalid;if(!info_.configured)return false;
        try{if(!markerValid())return false;Lock lock(root/L".hb-shader-cache-lock");if(!lock.owned){++info_.busy;return false;}const auto path=entry(key);if(!regular(path))return false;std::error_code error;const bool removed=std::filesystem::remove(path,error);if(error)++info_.errors;scanned=false;return removed;}catch(const std::exception&){++info_.errors;return false;}
    }
};
}
#endif
