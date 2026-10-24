export const headerPath='Source/Module/ScanOwner.h',sourcePath='Source/Module/ScanOwner.cpp';
const continuation='\\\n';
export const header='#pragma once\n#include <HBEngine/Game.hpp>\ninline constexpr auto ScanHelp=R"help(\n#include "C:\\documentation\\NotAHeader.hpp"\n)help";\n# in'+continuation+'clude /* types */ "../Types/Payload.hpp"\nHB_CLASS(Blueprintable) class ScanOwner:public hb::Actor {public: HB_PROPERTY(BlueprintReadWrite) Payload Data; HB_FUNCTION(BlueprintPure) int Read() const;};\n';
export const source='#include "ScanOwner.h"\n# include /* helper */ "Helper.h"\nint ScanOwner::Read() const{return Helper::Value()+Data.Value;}\n';
export const helperSource='namespace {constexpr auto helperHelp=R"example(\n#include "Helper.h"\n#include "User.h"\n)example";}\nint Helper::Value(){return 37;}\n';
export const files=[{path:headerPath,content:header},{path:sourcePath,content:source},{path:'Source/Types/Payload.hpp',content:'#pragma once\nHB_STRUCT(BlueprintType) struct Payload {HB_PROPERTY(BlueprintReadWrite) int Value=5;};\n'},{path:'Source/Helper.h',content:'#pragma once\nstruct Helper {static int Value();};\n'},{path:'Source/Helper.cpp',content:helperSource}];
export const owner={id:'owner',name:'Owner',type:'empty',position:[7,3,2],rotation:[0,0,0],scale:[1,1,1],visible:true,components:[],nativeClass:'ScanOwner',nativeProperties:{Data:{Value:5}}};
