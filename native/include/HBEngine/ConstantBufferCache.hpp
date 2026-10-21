#pragma once
#include <array>
#include <cstddef>
#include <cstdint>
#include <cstring>
#include <stdexcept>
#include <type_traits>

namespace hb::gpu {
// One snapshot per owned GPU buffer. Commit only after a successful upload.
template<class T,std::size_t Slots> class ConstantBufferCache {
    static_assert(Slots>0&&std::is_trivially_copyable_v<T>,"Constant buffer payload must be trivially copyable");
    std::array<std::array<unsigned char,sizeof(T)>,Slots> values{};
    std::array<bool,Slots> ready{};
    std::uint64_t uploads_=0,skips_=0;
    void check(std::size_t slot) const {if(slot>=Slots)throw std::out_of_range("Constant buffer cache slot");}
public:
    bool shouldUpload(std::size_t slot,const T& value){check(slot);if(ready[slot]&&std::memcmp(values[slot].data(),&value,sizeof(T))==0){++skips_;return false;}return true;}
    void commit(std::size_t slot,const T& value){check(slot);std::memcpy(values[slot].data(),&value,sizeof(T));ready[slot]=true;++uploads_;}
    void invalidate(){ready.fill(false);}
    std::uint64_t uploads() const{return uploads_;}std::uint64_t skips() const{return skips_;}
    constexpr std::size_t retainedBytes() const{return sizeof(*this);}
};
}
