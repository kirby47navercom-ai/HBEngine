// Incremental game C++ build: a project with eight .cpp files builds once; editing one .cpp recompiles only that file
// (worker and the other units come from the object cache) and the new code runs; editing a header recompiles them all.
// Isolated user data and caches; prints cold / one-file / header build times.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';

const root=path.resolve(import.meta.dirname,'..'),work=await fs.mkdtemp(path.join(root,'native/build/native-incremental-'));
process.env.HB_USER_DATA_DIR=path.join(work,'UserData');process.env.LOCALAPPDATA=path.join(work,'LocalAppData');
const {NativeHost}=await import(pathToFileURL(path.join(root,'tools/native-host.mjs')));const host=new NativeHost();
const headerPath='Source/Game/Counter.h',sourcePath='Source/Game/Counter.cpp',count=7;
const header=value=>'#pragma once\n#include <HBEngine/Game.hpp>\n#include "Parts.h"\n'+(value?'// header revision '+value+'\n':'')+'HB_CLASS(Blueprintable) class Counter:public hb::Actor {public: HB_FUNCTION(BlueprintPure) int Total() const;};\n';
const parts='#pragma once\n'+Array.from({length:count},(_,i)=>'int Part'+i+'();').join('\n')+'\n';
const source='#include "Counter.h"\nint Counter::Total() const{return '+Array.from({length:count},(_,i)=>'Part'+i+'()').join('+')+';}\n';
const part=(i,value)=>'#include "Parts.h"\n#include <map>\n#include <string>\n#include <vector>\nint Part'+i+'(){std::map<std::string,std::vector<int>> m;m["v"].push_back('+value+');return m["v"][0];}\n';
const files=(values,revision=0)=>[{path:headerPath,content:header(revision)},{path:sourcePath,content:source},{path:'Source/Game/Parts.h',content:parts},...values.map((v,i)=>({path:'Source/Game/Part'+i+'.cpp',content:part(i,v)}))];
const owner={id:'owner',name:'Owner',type:'empty',position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],visible:true,components:[],nativeClass:'Counter',nativeProperties:{}};
const run=async(values,revision=0)=>{const started=performance.now(),list=files(values,revision),built=await host.build(header(revision),source,{files:list,headerPath,sourcePath}),ms=Math.round(performance.now()-started),reply=await host.call(built.token,{key:'nativeCall',nativeId:'Counter.Total',self:owner.id,args:{target:owner.id},objects:[structuredClone(owner)],overrides:[]});return {ms,objectCache:built.objectCache,total:reply.outputs.result};};
try{
  const base=Array.from({length:count},(_,i)=>i+1),sum=values=>values.reduce((a,b)=>a+b,0);
  const cold=await run(base);assert.equal(cold.total,sum(base));assert.equal(cold.objectCache.reused,0,'cold build compiles everything');
  const edited=base.map((v,i)=>i===3?v+100:v),one=await run(edited);assert.equal(one.total,sum(edited),'the edited .cpp runs');
  assert.equal(one.objectCache.compiled,1,'only the edited .cpp recompiles: '+JSON.stringify(one.objectCache));assert.ok(one.objectCache.reused>=count,'worker and the other units are reused');
  const headerChange=await run(edited,1);assert.equal(headerChange.total,sum(edited));assert.ok(headerChange.objectCache.compiled>=count,'a header change recompiles the units: '+JSON.stringify(headerChange.objectCache));
  const result={passed:true,units:count+1,coldMs:cold.ms,oneFileMs:one.ms,headerChangeMs:headerChange.ms,oneFile:one.objectCache,headerChange:headerChange.objectCache};
  await fs.writeFile(path.join(work,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{host.close?.();await fs.rm(work,{recursive:true,force:true}).catch(()=>{});}
