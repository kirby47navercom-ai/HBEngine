export const header=`#pragma once
#include <HBEngine/Game.hpp>
#include "Values.h"
namespace Game::Access {
class Container {
 HB_CLASS(Blueprintable) class AccessActor:public hb::Actor {
 public: AccessActor()=default;
 private:
  // These names and braces are source data, not declarations or scopes.
  HB_PROPERTY() std::string Label="HB_CLASS(Blueprintable) class Fake:public hb::Actor { HB_PROPERTY() int Broken; } // {";
  HB_PROPERTY(BlueprintReadWrite) int Score=7;
  int Hidden=91;
  HB_FUNCTION(BlueprintCallable) int Change(int amount,int& previous);
  HB_FUNCTION(BlueprintCallable) void Place(int value);
  HB_FUNCTION(BlueprintCallable) static int Twice(int amount);
 protected:
  HB_ENUM(BlueprintType) enum class Mode:int {Idle=0,Run=4};
  HB_PROPERTY() Mode Current=Mode::Run;
  HB_PROPERTY() std::vector<Mode> Modes{Mode::Idle,Mode::Run};
  HB_FUNCTION(BlueprintPure) Mode Echo(Mode value) const;
  HB_FUNCTION(BlueprintCallable) void Start(const Mode& value);
  HB_FUNCTION(BlueprintNativeEvent) void Changed(const Mode& value);
  HB_FUNCTION(BlueprintImplementableEvent) void Exposed(const Mode& value);
  HB_FUNCTION(BlueprintPure) Game::Access::Container::AccessActor* Self() const;
  HB_FUNCTION(BlueprintPure) std::vector<double> Doubles(const std::vector<double>& values) const;
  HB_FUNCTION(BlueprintCallable) void Fail();
 };
};
HB_CLASS(Blueprintable) class AccessComponent:public hb::Component {
 private: HB_PROPERTY() int Value=3;
 protected: HB_FUNCTION(BlueprintCallable) int Add(int delta);
};
}
`;
export const source=`#include "Access.h"
namespace Game::Access {
int Container::AccessActor::Change(int amount,int& previous){previous=Score;Score+=amount;Hidden++;return Score;}
void Container::AccessActor::Place(int value){transform.position.x=static_cast<float>(value);}
int Container::AccessActor::Twice(int amount){return amount*2;}
Container::AccessActor::Mode Container::AccessActor::Echo(Mode value)const{return value;}
void Container::AccessActor::Start(const Mode& value){Changed(value);Exposed(value);}
void Container::AccessActor::Changed(const Mode& value){Score+=static_cast<int>(value);}
Game::Access::Container::AccessActor* Container::AccessActor::Self()const{return const_cast<AccessActor*>(this);}
std::vector<double> Container::AccessActor::Doubles(const std::vector<double>& values)const{return values;}
void Container::AccessActor::Fail(){Score=999;Modes.clear();transform.position={99,99,99};throw std::runtime_error("private rollback");}
int AccessComponent::Add(int delta){Value+=delta;return actor?Value:-1;}
}
`;
export const files=[{path:'Source/Access.h',content:header},{path:'Source/Access.cpp',content:source},{path:'Source/Values.h',content:'#pragma once\n#include <HBEngine/Game.hpp>\nnamespace Auxiliary {class EnumHolder{HB_ENUM(BlueprintType) enum class HiddenMode:unsigned char{Ready=2};};}\n'}];
export const objects=[{id:'Owner',name:'Owner',kind:'empty',visible:true,components:[],position:[7,3,2],rotation:[0,0,0],scale:[1,1,1],nativeClass:'AccessActor'},{id:'Part',name:'Part',kind:'empty',visible:true,components:[],position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],nativeClass:'AccessComponent'}];
export const enumName='Game::Access::Container::AccessActor::Mode';
