import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {activeInstalledVersions} from './install-editor.mjs';
import {retainTestEvidence} from './test-artifacts.mjs';

assert.deepEqual(await activeInstalledVersions(path.join(process.env.USERPROFILE,'HBEngine')),[]);
const engine=path.resolve(process.argv[2]||'.'),{NativeHost}=await import(pathToFileURL(path.join(engine,'tools/native-host.mjs'))),{NativeWorldClient,immutableNativeSnapshot}=await import(pathToFileURL(path.join(engine,'prototype/native-transport.js')));
const work=await fs.mkdtemp('native/build/ui-sdk-flow-');retainTestEvidence(work);
const header=`#include <HBEngine/Game.hpp>
HB_CLASS() class UIProbe : public hb::Library { public:
 HB_FUNCTION(BlueprintCallable) static bool Write(hb::Actor* target);
 HB_FUNCTION(BlueprintPure) static bool Read(hb::Actor* target);
 HB_FUNCTION(BlueprintCallable) static void Tamper(hb::Actor* target);
 HB_FUNCTION(BlueprintPure) static bool Canvas();
};`;
const source=`#include "User.h"
bool UIProbe::Write(hb::Actor* target){hb::UI::SetText(target,"HUD~/","label~/","changed");hb::UI::SetValue(target,"HUD~/","bar",.8f);hb::UI::SetValue(target,"HUD~/","box",1);hb::UI::SetVisible(target,"HUD~/","label~/",false);hb::UI::SetEnabled(target,"HUD~/","label~/",false);return hb::UI::GetText(target,"HUD~/","label~/")=="changed"&&hb::UI::GetValue(target,"HUD~/","bar")>.79f&&hb::UI::GetValue(target,"HUD~/","box")==1;}
bool UIProbe::Read(hb::Actor* target){const auto& ui=hb::bridgeReadState(target)->at("gameplayDebug").at("ui").at("HUD~/");return hb::UI::GetText(target,"HUD~/","label~/")=="original"&&hb::UI::GetValue(target,"HUD~/","bar")==.2f&&hb::UI::GetValue(target,"HUD~/","box")==0&&ui.at("label~/").at("visible")==true&&ui.at("label~/").at("enabled")==true;}
void UIProbe::Tamper(hb::Actor* target){hb::UI::SetText(target,"HUD~/","label~/","changed");hb::bridgeWorld.at(0)["gameplayDebug"]["ui"]["HUD~/"]["bar"]["value"]=99;}
bool UIProbe::Canvas(){hb::Vec2 raw{},fit{};return hb::Input::GetMousePosition(raw)&&hb::Input::GetMousePositionForCanvas({1280,720},fit)&&raw.x==960&&raw.y==540&&fit.x==640&&fit.y==360;}`;
await fs.writeFile(work+'/User.h',header);await fs.writeFile(work+'/User.cpp',source);
const ui=immutableNativeSnapshot({'HUD~/':{'label~/':{type:'Text',text:'original',visible:true,enabled:true},bar:{type:'ProgressBar',min:0,max:1,value:.2},box:{type:'CheckBox',min:0,max:1,value:0,checked:false}}}),objects=[{id:'owner',position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],gameplayDebug:{ui}}],host=new NativeHost(),client=new NativeWorldClient({hooks:{nativeRowReuse:true}}),wire=value=>JSON.parse(JSON.stringify(value));
try{
 const built=await host.build(header,source),call=(method,input)=>client.call({key:'nativeCall',nativeId:'UIProbe.'+method,args:method==='Canvas'?{}:{target:'owner'},objects,...input?{input:{keys:{},lastDevice:"mouse",pressed:[],released:[],pointer:{delta:[0,0],origin:[0,0,0],direction:[0,0,0],rayValid:false,...input.pointer}}}:{}},built.metadata,async request=>wire(await host.call(built.token,wire(request))));
 assert.equal((await call('Read')).outputs.result,true);
 for(let i=0;i<8;i++){assert.equal((await call('Write')).outputs.result,true,'C++ setters are immediately readable');assert.equal((await call('Read')).outputs.result,true,'uncommitted UI leaves restore from authoritative snapshot');}
 await call('Tamper');assert.equal((await call('Read')).outputs.result,true,'whole-row mutable access still restores all fields');
 assert.equal((await call('Canvas',{pointer:{valid:true,inside:true,position:[960,540],size:[1920,1080]}})).outputs.result,true,'fit helper preserves the raw pointer API');
 assert.equal((await call('Canvas',{pointer:{valid:false,inside:false,position:[960,540],size:[1920,1080]}})).outputs.result,false);
 const owners={};for(const file of ['prototype/native-transport.js','tools/native-source.mjs','native/include/HBEngine/Game.hpp','native/include/HBEngine/Bridge.hpp'])owners[file]=createHash('sha256').update(await fs.readFile(path.join(engine,file))).digest('hex');
 const result={passed:true,readAfterWrite:true,leafRestore:true,escapedPointers:true,arbitraryMutableRestore:true,checkboxAndRange:true,rawAndFitPointer:true,owners,scope:'actual C++ worker via public SDK and NativeWorldClient; generated fixture, no user game'};await fs.writeFile(work+'/acceptance.json',JSON.stringify(result,null,2));console.log(JSON.stringify({work,...result}));
}finally{host.close();}
