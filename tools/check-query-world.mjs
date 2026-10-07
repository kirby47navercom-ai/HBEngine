import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {NativeHost} from './native-host.mjs';

const dir=await fs.mkdtemp(path.resolve(import.meta.dirname,'../native/build/query-world-')),host=new NativeHost();
const header='#include <HBEngine/Game.hpp>\nHB_CLASS() class QueryWorldProbe : public hb::Library { public: HB_FUNCTION(BlueprintPure) static float Measure(int passes); HB_FUNCTION(BlueprintPure) static bool Verify(); };';
const source=`#include "User.h"
#include <chrono>
namespace {
struct RestoreQuery {std::function<hb::Json(const hb::Json&)> previous=hb::bridgeQuery;~RestoreQuery(){hb::bridgeQuery=previous;}};
}
float QueryWorldProbe::Measure(int passes){
  RestoreQuery restore;hb::bridgeQuery=[](const hb::Json& packet){return hb::Json{{"ok",true},{"value",packet.at("objects").size()}};};
  const auto start=std::chrono::steady_clock::now();
  for(int i=0;i<passes;i++)if(hb::engineQuery("probe",hb::Json::object()).get<int>()!=5000)throw std::runtime_error("incomplete query world");
  return std::chrono::duration<float,std::milli>(std::chrono::steady_clock::now()-start).count()/passes;
}
bool QueryWorldProbe::Verify(){
  RestoreQuery restore;const auto id=std::string("row-4999");auto* last=hb::bridgeActor(id);last->transform.position.x=19;
  auto previousIndex=hb::bridgeStateIndices.at(id);
  struct RestoreIndex {std::string id;size_t index;~RestoreIndex(){hb::bridgeStateIndices[id]=index;}} index{id,previousIndex};
  hb::bridgeQuery=[&](const hb::Json& packet){
    const auto& objects=packet.at("objects");if(objects.size()!=5000)return hb::Json{{"ok",true},{"value",false}};
    bool value=objects.at(0).at("id")=="row-0"&&objects.at(0).at("position").at(0)==0&&objects.at(4999).at("id")==id&&objects.at(4999).at("position").at(0)==19&&objects.at(4999).at("extra")=="retained";
    return hb::Json{{"ok",true},{"value",value}};
  };
  if(!hb::engineQuery("probe",hb::Json::object()).get<bool>())return false;
  hb::bridgeStateIndices[id]=0;if(!hb::engineQuery("probe",hb::Json::object()).get<bool>())return false;
  hb::bridgeStateIndices.erase(id);return hb::engineQuery("probe",hb::Json::object()).get<bool>();
}`;
const objects=Array.from({length:5000},(_,i)=>({id:'row-'+i,name:'Row '+i,kind:'empty',visible:true,position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],components:[],extra:'retained'}));
try{
  const build=await host.build(header,source),call=(name,args={})=>host.call(build.token,{key:'nativeCall',nativeId:'QueryWorldProbe.'+name,args,objects});
  assert.equal((await call('Verify')).outputs.result,true);
  const warm=(await call('Measure',{passes:1})).outputs.result,samples=[];
  for(let i=0;i<3;i++)samples.push((await call('Measure',{passes:1})).outputs.result);
  assert.ok([warm,...samples].every(v=>Number.isFinite(v)&&v>=0));
  const sdk='native/include/HBEngine/Bridge.hpp',checkedFiles={[sdk]:createHash('sha256').update(await fs.readFile(path.resolve(import.meta.dirname,'..',sdk))).digest('hex')};
  const result={passed:true,dir,objects:objects.length,warmMs:warm,samplesMs:samples,checkedFiles,cases:['current actor transform / row order / extra data preserved','stale and missing row index fallback preserves correct actor','5,000-row actual compiled C++ query world merge'],scope:'C++ in-process snapshot/merge/packet construction; excludes IPC, Rapier, rendering and FPS',performanceAcceptance:false};
  await fs.writeFile(path.join(dir,'acceptance.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{host.close();}
