export const typesPath='Source/Types/Gameplay.h',headerPath='Source/Actors/EnumActor.h',sourcePath='Source/Actors/EnumActor.cpp';
export const types=`#pragma once
#include <HBEngine/Game.hpp>
namespace GameTypes {
HB_ENUM(BlueprintType, DisplayName="행동 상태")
enum class Mode : std::uint8_t {
 Idle=4 HB_ENUM_VALUE(DisplayName="대기"),
 Retired=9 HB_ENUM_VALUE(Hidden),
 Attack=12 HB_ENUM_VALUE(DisplayName="공격", ToolTip="공격 상태"),
 Alias=Attack HB_ENUM_VALUE(Hidden)
};
HB_ENUM(BlueprintType, Bitflags, UseEnumValuesAsMaskValuesInEditor=true)
enum class Channels : std::uint32_t {None=0, Light=1u, Sound=1u<<7, High=1u<<31};
HB_ENUM(BlueprintType, Bitflags)
enum class Layers : std::uint8_t {Default=0, Enemy=3, Last=31};
}
`;
export const header=`#pragma once
#include "../Types/Gameplay.h"
HB_CLASS(Blueprintable) class EnumActor: public hb::Actor {public:
 HB_PROPERTY(BlueprintReadWrite) GameTypes::Mode Mode=GameTypes::Mode::Attack;
 HB_PROPERTY(BlueprintReadWrite) std::vector<GameTypes::Mode> Modes={GameTypes::Mode::Idle,GameTypes::Mode::Attack};
 HB_PROPERTY(BlueprintReadWrite) GameTypes::Channels Channels=GameTypes::Channels::High;
 HB_PROPERTY(BlueprintReadWrite, Bitmask, BitmaskEnum="GameTypes::Layers") int LayerMask=1;
 HB_FUNCTION(BlueprintPure) GameTypes::Mode Echo(GameTypes::Mode mode=GameTypes::Mode::Idle) const;
 HB_FUNCTION(BlueprintPure) std::vector<GameTypes::Mode> EchoMany(const std::vector<GameTypes::Mode>& modes) const;
 HB_FUNCTION(BlueprintCallable) GameTypes::Channels Assign(GameTypes::Channels value, GameTypes::Mode& previous);
 HB_FUNCTION(BlueprintPure) std::string Labels() const;
 HB_FUNCTION(BlueprintCallable) void Fire(GameTypes::Mode value);
 HB_FUNCTION(BlueprintCallable) void Drive(GameTypes::Mode state);
 HB_FUNCTION(BlueprintNativeEvent) virtual void Changed(GameTypes::Mode value);
};`;
export const source=`#include "EnumActor.h"
GameTypes::Mode EnumActor::Echo(GameTypes::Mode mode) const{return mode;}
std::vector<GameTypes::Mode> EnumActor::EchoMany(const std::vector<GameTypes::Mode>& modes) const{return modes;}
GameTypes::Channels EnumActor::Assign(GameTypes::Channels value,GameTypes::Mode& previous){previous=Mode;Channels=value;return value;}
std::string EnumActor::Labels() const{return hb::Enum::DisplayName(Mode)+":"+hb::Enum::Name(Channels);}
void EnumActor::Fire(GameTypes::Mode value){Changed(value);}
void EnumActor::Drive(GameTypes::Mode state){Mode=state;transform.position={static_cast<float>(hb::Enum::ToValue(state)),3,2};}
void EnumActor::Changed(GameTypes::Mode){}
`;
export const files=[{path:typesPath,content:types},{path:headerPath,content:header},{path:sourcePath,content:source}];
export const object={id:'EnumOwner',name:'EnumOwner',kind:'empty',visible:true,position:[7,3,2],rotation:[0,0,0],scale:[1,1,1],components:[],nativeClass:'EnumActor',nativeProperties:{Mode:12,Modes:[4,12],Channels:-2147483648,LayerMask:1}};
