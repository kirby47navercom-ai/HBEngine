#include <HBEngine/Enum.hpp>
#include <cassert>
#include <iostream>
enum class Mode:std::uint8_t {Idle=4,Hidden=9,Attack=12};
enum class Direct:std::uint32_t {None=0,Light=1,High=1u<<31};
enum class Ordinal:std::uint8_t {Default=0,Last=31};
enum class Signed:std::int16_t {Negative=-32768,Positive=32767};
int main(){
 constexpr hb::Enum::Entry modes[]={{4,"Idle","대기",false},{9,"Hidden","이전",true},{12,"Attack","공격",false}};
 constexpr hb::Enum::Entry direct[]={{0,"None","없음",false},{1,"Light","빛",false},{INT32_MIN,"High","높은 비트",false}};
 constexpr hb::Enum::Entry ordinal[]={{0,"Default","기본",false},{31,"Last","마지막",false}};
 assert(hb::Enum::detail::RegisterStatic<Mode>("Mode",modes,false,false));
 assert(hb::Enum::detail::RegisterStatic<Direct>("Direct",direct,true,true));
 assert(hb::Enum::detail::RegisterStatic<Ordinal>("Ordinal",ordinal,true,false));
 assert(hb::Enum::DisplayName(Mode::Attack)=="공격");assert(hb::Enum::Values<Mode>().size()==2);assert(hb::Enum::Values<Mode>(true).size()==3);
 assert(hb::Enum::Name(static_cast<Mode>(255))=="255");assert(hb::Enum::IsValid(Mode::Hidden));assert(!hb::Enum::IsValid(static_cast<Mode>(255)));
 Mode output=Mode::Attack;assert(hb::Enum::TryParse("Mode::Idle",output)&&output==Mode::Idle);assert(!hb::Enum::TryParse("Idle|missing",output)&&output==Mode::Idle);
 assert(!hb::Enum::TryParse("Wrong::Attack",output)&&output==Mode::Idle);
 const auto combo=hb::Enum::Parse<Direct>("Light|High");assert(hb::Enum::ToValue(combo)==INT32_MIN+1);assert(hb::Enum::HasAll(combo,Direct::High));assert(hb::Enum::ToValue(hb::Enum::Remove(combo,Direct::High))==1);
 assert(hb::Enum::HasAny(hb::Enum::Toggle(combo,Direct::Light),Direct::High));assert(hb::Enum::ToValue(hb::Enum::Add(Direct::Light,Direct::High))==INT32_MIN+1);
 assert(hb::Enum::FromValue<Direct>(INT32_MIN)==Direct::High);assert(hb::Enum::FromValue<Signed>(-32768)==Signed::Negative);
 assert(hb::Enum::Mask(Ordinal::Default)==1);assert(hb::Enum::Mask(Ordinal::Last)==0x80000000u);assert(hb::Enum::SetFlag(1,Ordinal::Last)==INT32_MIN+1);assert(hb::Enum::HasFlag(INT32_MIN,Ordinal::Last));assert(hb::Enum::IsValidFlags<Ordinal>(INT32_MIN+1));assert(!hb::Enum::IsValidFlags<Ordinal>(2));
 assert(hb::Enum::ToValues(hb::Enum::FromValues<Mode>({4,9,255}))==std::vector<std::int32_t>({4,9,255}));
 for(const int value:{-1,256}){bool rejected=false;try{hb::Enum::FromValue<Mode>(value);}catch(const std::runtime_error&){rejected=true;}assert(rejected);}
 bool rejected=false;try{hb::Enum::FromValues<Mode>({4,256});}catch(const std::runtime_error&){rejected=true;}assert(rejected);
 std::cout<<"enum SDK: names, hidden, arrays, U32 bit31, ordinal/direct flags, parse atomicity, range\n";
}
