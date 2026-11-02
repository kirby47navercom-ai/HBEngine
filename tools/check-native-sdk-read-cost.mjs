import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {activeInstalledVersions} from './install-editor.mjs';
import {retainTestEvidence} from './test-artifacts.mjs';
assert.deepEqual(await activeInstalledVersions(path.join(process.env.USERPROFILE,'HBEngine')),[]);
const baseline=path.resolve(process.argv[2]),candidate=path.resolve(process.argv[3]),work=await fs.mkdtemp('native/build/sdk-read-cost-');retainTestEvidence(work);
const header='#include <HBEngine/Game.hpp>\nHB_CLASS() class ReadCost : public hb::Library { public: HB_FUNCTION(BlueprintPure) static std::string Inspect(hb::Actor* target); HB_FUNCTION(BlueprintPure) static std::string Bench(); HB_FUNCTION(BlueprintCallable) static bool Mutate(hb::Actor* target); };';
const source=`#include "User.h"
#include <chrono>
std::string ReadCost::Inspect(hb::Actor* target){const auto text=hb::UI::GetText(target,"HUD","label"),items=hb::UI::GetListItems(target,"HUD","list");const auto value=hb::UI::GetValue(target,"HUD","bar");return hb::Json{{"text",text},{"items",items},{"value",value},{"dirtyRows",(hb::bridgeDirtyStates.size()+hb::bridgeDirtyFields.size())}}.dump();}
std::string ReadCost::Bench(){double sum=0;const auto begin=std::chrono::steady_clock::now();for(int i=0;i<2000;i++){sum+=hb::Input::GetAxis("W");hb::Vec2 p,d;hb::Vec3 origin,direction;sum+=hb::Input::GetMousePosition(p)?p.x:0;d=hb::Input::GetMouseDelta();sum+=d.y;sum+=hb::Input::DeprojectMousePositionToWorld(origin,direction)?direction.z:0;}return hb::Json{{"sum",sum},{"ms",std::chrono::duration<double,std::milli>(std::chrono::steady_clock::now()-begin).count()}}.dump();}
bool ReadCost::Mutate(hb::Actor* target){hb::bridgeWidget(target,"HUD","label")["text"]="temporary";return hb::UI::GetText(target,"HUD","label")=="temporary"&&(hb::bridgeDirtyStates.size()+hb::bridgeDirtyFields.size())==1;}`;
await fs.writeFile(work+'/User.h',header);await fs.writeFile(work+'/User.cpp',source);
const input={keys:Object.fromEntries(Array.from({length:256},(_,i)=>[i?'key'+i:'w',.5])),lastDevice:'mouse',pressed:[],released:[],pointer:{valid:true,inside:true,rayValid:true,position:[80,40],size:[640,360],delta:[2,3],origin:[0,0,0],direction:[0,0,-1]}},objects=[{id:'owner',position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],gameplayDebug:{ui:{HUD:{label:{text:'original'},list:{type:'ListView',listItems:'["one"]'},bar:{value:.25}}}}}];
const make=async root=>{const {NativeHost}=await import(pathToFileURL(path.join(root,'tools/native-host.mjs'))),{NativeWorldClient}=await import(pathToFileURL(path.join(root,'prototype/native-transport.js'))),host=new NativeHost();try{const built=await host.build(header,source),client=new NativeWorldClient(),call=async(method,data=input)=>client.call({key:'nativeCall',nativeId:'ReadCost.'+method,args:method==='Bench'?{}:{target:'owner'},objects,...data?{input:data}:{}},built.metadata,request=>host.call(built.token,JSON.parse(JSON.stringify(request))));return {host,call,samples:[]};}catch(error){host.close();throw error;}};
const settled=await Promise.allSettled([make(baseline),make(candidate)]);if(settled.some(x=>x.status==='rejected')){for(const x of settled)if(x.status==='fulfilled')x.value.host.close();throw settled.find(x=>x.status==='rejected').reason;}const[a,b]=settled.map(x=>x.value);
try{
 const old=JSON.parse((await a.call('Inspect')).outputs.result),next=JSON.parse((await b.call('Inspect')).outputs.result);assert.equal(old.dirtyRows,1);assert.deepEqual({...old,dirtyRows:0},next);assert.equal(next.dirtyRows,0);
 assert.equal((await b.call('Mutate')).outputs.result,true);assert.equal(JSON.parse((await b.call('Inspect')).outputs.result).text,'original','explicit mutable access still restores the authoritative state');
 for(let i=0;i<8;i++)for(const entry of i%2?[a,b]:[b,a]){const result=JSON.parse((await entry.call('Bench')).outputs.result);assert.equal(result.sum,165000);if(i>1)entry.samples.push(result.ms);}
 assert.equal(JSON.parse((await b.call('Bench',null)).outputs.result).sum,0,'missing input retains SDK defaults');
 const median=values=>[...values].sort((a,b)=>a-b)[values.length>>1],owners={};for(const root of[baseline,candidate])owners[root]=createHash('sha256').update(await fs.readFile(path.join(root,'native/include/HBEngine/Bridge.hpp'))).digest('hex');const result={passed:true,readOnlyUI:true,mutableRestore:true,inputParity:true,absentInputDefaults:true,benchmark:{baselineMedianMS:median(a.samples),candidateMedianMS:median(b.samples),samples:6,iterations:2000,keys:256,scope:'actual SDK getter loop inside C++ worker; excludes transport/physics/render and whole-game FPS'},samples:{baseline:a.samples,candidate:b.samples},owners};await fs.writeFile(work+'/acceptance.json',JSON.stringify(result,null,2));console.log(JSON.stringify({work,...result}));
}finally{a.host.close();b.host.close();}
