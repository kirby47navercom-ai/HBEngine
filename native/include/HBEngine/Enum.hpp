#pragma once
#include <cstdint>
#include <cstring>
#include <limits>
#include <stdexcept>
#include <type_traits>
#include <typeinfo>
#include <string>
#include <string_view>
#include <vector>

#define HB_ENUM(...)
#define HB_ENUM_VALUE(...)
#define HB_META(...)

namespace hb { namespace Enum {
template<class E> using Underlying = std::underlying_type_t<E>;
template<class E> using Bits = std::make_unsigned_t<Underlying<E>>;

template<class E> inline std::int32_t ToValue(E value) {
    static_assert(std::is_enum_v<E> && sizeof(Underlying<E>) <= 4, "HB reflected enums use 8/16/32-bit underlying integers");
    const auto raw = static_cast<Underlying<E>>(value);
    if constexpr(std::is_unsigned_v<Underlying<E>> && sizeof(Underlying<E>) == 4) {
        std::int32_t result; const auto bits = static_cast<std::uint32_t>(raw);
        std::memcpy(&result, &bits, sizeof(result)); return result;
    } else return static_cast<std::int32_t>(raw);
}
template<class E> inline E FromValue(std::int32_t value) {
    static_assert(std::is_enum_v<E> && sizeof(Underlying<E>) <= 4, "HB reflected enums use 8/16/32-bit underlying integers");
    using U = Underlying<E>;
    if constexpr(std::is_unsigned_v<U> && sizeof(U) == 4) return static_cast<E>(static_cast<U>(static_cast<std::uint32_t>(value)));
    else {
        if(static_cast<std::int64_t>(value) < static_cast<std::int64_t>(std::numeric_limits<U>::min()) || static_cast<std::int64_t>(value) > static_cast<std::int64_t>(std::numeric_limits<U>::max()))
            throw std::runtime_error("native enum underlying range");
        return static_cast<E>(static_cast<U>(value));
    }
}
template<class E> inline std::vector<std::int32_t> ToValues(const std::vector<E>& values) {
    std::vector<std::int32_t> result; result.reserve(values.size());
    for(const auto value : values) result.push_back(ToValue(value));
    return result;
}
template<class E> inline std::vector<E> FromValues(const std::vector<std::int32_t>& values) {
    std::vector<E> result; result.reserve(values.size());
    for(const auto value : values) result.push_back(FromValue<E>(value));
    return result;
}
template<class E> inline E FromBits(Bits<E> bits) {
    Underlying<E> raw; std::memcpy(&raw, &bits, sizeof(raw)); return static_cast<E>(raw);
}
template<class E> inline bool HasAny(E value, E flags) { return (static_cast<Bits<E>>(value) & static_cast<Bits<E>>(flags)) != 0; }
template<class E> inline bool HasAll(E value, E flags) { const auto mask = static_cast<Bits<E>>(flags); return (static_cast<Bits<E>>(value) & mask) == mask; }
template<class E> inline E Add(E value, E flags) { return FromBits<E>(static_cast<Bits<E>>(static_cast<Bits<E>>(value) | static_cast<Bits<E>>(flags))); }
template<class E> inline E Remove(E value, E flags) { return FromBits<E>(static_cast<Bits<E>>(static_cast<Bits<E>>(value) & ~static_cast<Bits<E>>(flags))); }
template<class E> inline E Toggle(E value, E flags) { return FromBits<E>(static_cast<Bits<E>>(static_cast<Bits<E>>(value) ^ static_cast<Bits<E>>(flags))); }

struct Entry { std::int32_t value; std::string_view name, label; bool hidden; };
struct Descriptor { const std::type_info* type; std::string_view name; const Entry* entries; std::size_t count; bool flags, maskValues; };
namespace detail {
inline std::vector<Descriptor>& Registry() { static std::vector<Descriptor> result; return result; }
// Generated workers provide static tables/string literals with process lifetime.
// This internal registration is never called with authored temporary buffers.
template<class E, std::size_t N> inline bool RegisterStatic(std::string_view name, const Entry (&entries)[N], bool flags, bool maskValues) {
    for(const auto& value : Registry()) if(*value.type == typeid(E)) {
        if(value.name != name || value.count != N || value.flags != flags || value.maskValues != maskValues) return false;
        for(std::size_t i=0;i<N;i++) if(value.entries[i].value != entries[i].value || value.entries[i].name != entries[i].name || value.entries[i].label != entries[i].label || value.entries[i].hidden != entries[i].hidden) return false;
        return true;
    }
    Registry().push_back({&typeid(E),name,entries,N,flags,maskValues}); return true;
}
inline std::string_view Trim(std::string_view value) {
    const auto space=[](char c){return c==' '||c=='\t'||c=='\r'||c=='\n';};
    while(!value.empty()&&space(value.front()))value.remove_prefix(1);
    while(!value.empty()&&space(value.back()))value.remove_suffix(1);
    return value;
}
inline std::int32_t SignedBits(std::uint32_t value) { std::int32_t result;std::memcpy(&result,&value,sizeof(result));return result; }
inline std::uint32_t EntryMask(const Descriptor& type, const Entry& entry) {
    if(type.maskValues)return static_cast<std::uint32_t>(entry.value);
    if(entry.value<0||entry.value>=32)return 0;
    return std::uint32_t{1}<<entry.value;
}
}
template<class E> inline const Descriptor& Describe() {
    // Generated tables register before native actor construction. The registry
    // is append-only, so a cached index remains valid after vector relocation.
    static const auto index=[](){const auto& types=detail::Registry();for(std::size_t i=0;i<types.size();i++)if(*types[i].type==typeid(E))return i;throw std::runtime_error("native enum metadata not registered");}();
    return detail::Registry().at(index);
}
template<class E> inline bool IsValid(E value) {
    const auto& type=Describe<E>();const auto wire=ToValue(value);
    for(std::size_t i=0;i<type.count;i++)if(type.entries[i].value==wire)return true;
    return false;
}
template<class E> inline std::vector<E> Values(bool includeHidden=false) {
    const auto& type=Describe<E>();std::vector<E> result;result.reserve(type.count);
    for(std::size_t i=0;i<type.count;i++)if(includeHidden||!type.entries[i].hidden)result.push_back(FromValue<E>(type.entries[i].value));
    return result;
}
template<class E> inline std::string Name(E value, bool display=false) {
    const auto& type=Describe<E>();const auto wire=ToValue(value);const Entry* hidden=nullptr;
    for(std::size_t i=0;i<type.count;i++)if(type.entries[i].value==wire){if(!type.entries[i].hidden)return std::string(display?type.entries[i].label:type.entries[i].name);if(!hidden)hidden=&type.entries[i];}
    if(hidden)return std::string(display?hidden->label:hidden->name);
    return std::to_string(wire);
}
template<class E> inline std::string DisplayName(E value) {return Name(value,true);}
template<class E> inline bool TryParse(std::string_view text,E& output) {
    const auto& type=Describe<E>();text=detail::Trim(text);if(text.empty())return false;
    std::uint32_t bits=0;std::size_t begin=0;
    do {
        const auto end=text.find('|',begin);auto part=detail::Trim(text.substr(begin,end==std::string_view::npos?text.size()-begin:end-begin));
        if(end!=std::string_view::npos&&(!type.flags||!type.maskValues))return false;
        const auto scope=part.rfind("::");
        if(scope!=std::string_view::npos){const auto owner=part.substr(0,scope);const auto separator=type.name.rfind("::");const auto shortName=separator==std::string_view::npos?type.name:type.name.substr(separator+2);if(owner!=type.name&&owner!=shortName)return false;part.remove_prefix(scope+2);}
        bool found=false;for(std::size_t i=0;i<type.count;i++)if(type.entries[i].name==part){bits|=static_cast<std::uint32_t>(type.entries[i].value);found=true;break;}
        if(!found)return false;
        if(end==std::string_view::npos)break;
        begin=end+1;
    }while(begin<=text.size());
    const auto result=FromValue<E>(detail::SignedBits(bits));output=result;return true;
}
template<class E> inline E Parse(std::string_view text) {E result{};if(!TryParse(text,result))throw std::runtime_error("unknown native enum name");return result;}
template<class E> inline std::uint32_t Mask(E entry) {
    const auto& type=Describe<E>();if(!type.flags)throw std::runtime_error("native enum is not a bitmask type");
    if(type.maskValues)return static_cast<std::uint32_t>(ToValue(entry));
    const auto value=ToValue(entry);if(value<0||value>=32)throw std::runtime_error("native bit position range");return std::uint32_t{1}<<value;
}
template<class E> inline bool HasFlag(std::int32_t flags,E entry) {const auto mask=Mask(entry);return (static_cast<std::uint32_t>(flags)&mask)==mask;}
template<class E> inline std::int32_t SetFlag(std::int32_t flags,E entry,bool enabled=true) {const auto mask=Mask(entry),bits=static_cast<std::uint32_t>(flags);return detail::SignedBits(enabled?bits|mask:bits&~mask);}
template<class E> inline bool IsValidFlags(std::int32_t flags) {
    const auto& type=Describe<E>();if(!type.flags)return false;std::uint32_t allowed=0;
    for(std::size_t i=0;i<type.count;i++)allowed|=detail::EntryMask(type,type.entries[i]);
    return (static_cast<std::uint32_t>(flags)&~allowed)==0;
}
} }
