import {parseNativeHeader} from '../prototype/native-model.js';import {nativeRecordDefault} from '../prototype/native-records.js';
export const headerPath='Source/Records/RecordOwner.h',sourcePath='Source/Records/RecordOwner.cpp';
export const header=`#pragma once
#include <HBEngine/Game.hpp>
#include <HBEngine/Struct.hpp>
namespace Combat {
HB_ENUM(BlueprintType) enum class State:std::uint8_t{Idle=4 HB_ENUM_VALUE(DisplayName="대기"),Attack=12 HB_ENUM_VALUE(DisplayName="공격")};
HB_STRUCT(BlueprintType,DisplayName="피해") struct Damage {HB_PROPERTY(DisplayName="수치") int Amount=42;HB_PROPERTY(DisplayName="방향") hb::Vec3 Direction={1,2,3};};
HB_STRUCT(BlueprintType,DisplayName="능력치") struct Stats {HB_PROPERTY(DisplayName="피해") Damage Hit;HB_PROPERTY(DisplayName="표시") std::string Label=u8"Vec3{체력}";HB_PROPERTY(DisplayName="상태") State Mode=State::Attack;HB_PROPERTY(DisplayName="대상") hb::Actor* Target=nullptr;HB_PROPERTY(DisplayName="기록") std::vector<Damage> Hits={{7,{0,1,0}}};};
}
HB_CLASS(Blueprintable) class RecordOwner:public hb::Actor {public:
HB_PROPERTY(BlueprintReadWrite) Combat::Stats Data;
HB_PROPERTY(BlueprintReadWrite) std::vector<Combat::Stats> Items;
HB_FUNCTION(BlueprintCallable) Combat::Stats Apply(Combat::Stats value,Combat::Stats& previous);
HB_FUNCTION(BlueprintPure) std::vector<Combat::Stats> Echo(const std::vector<Combat::Stats>& values) const;
HB_FUNCTION(BlueprintCallable) void Drive(Combat::Stats value);
HB_FUNCTION(BlueprintCallable) void Fire(Combat::Stats value);
HB_FUNCTION(BlueprintNativeEvent) virtual void Changed(Combat::Stats value);
};`;
export const source=`#include "RecordOwner.h"
Combat::Stats RecordOwner::Apply(Combat::Stats value,Combat::Stats& previous){previous=Data;Data=hb::Struct::WithMembers(Data,value,&Combat::Stats::Hit,&Combat::Stats::Label,&Combat::Stats::Mode,&Combat::Stats::Target,&Combat::Stats::Hits);return Data;}
std::vector<Combat::Stats> RecordOwner::Echo(const std::vector<Combat::Stats>& values) const{return values;}
void RecordOwner::Drive(Combat::Stats value){Data=value;transform.position={static_cast<float>(value.Hit.Amount),3,2};}
void RecordOwner::Fire(Combat::Stats value){Changed(value);}void RecordOwner::Changed(Combat::Stats){}
`;
export const files=[{path:headerPath,content:header},{path:sourcePath,content:source}];
export const metadata=()=>parseNativeHeader(header,{sourcePath:headerPath,files});
export const statsDefault=()=>nativeRecordDefault(metadata(),{type:'record',structName:'Combat::Stats'});
export const damageDefault=()=>nativeRecordDefault(metadata(),{type:'record',structName:'Combat::Damage'});
export const owner={id:'RecordActor',name:'RecordActor',kind:'empty',visible:true,position:[7,3,2],rotation:[0,0,0],scale:[1,1,1],components:[]};
