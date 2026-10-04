import {worldPatch,applyWorldPatch} from './native-world-patch.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {existsSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import readline from 'node:readline';
import {parseNativeHeader,nativeTargetPin} from '../prototype/native-model.js';
import {validValue} from '../prototype/blueprint-model.js';
import {serviceApi} from '../prototype/core-api.js';
import {prepareNative,jsonInclude} from './prepare-native.mjs';
import {validInputSnapshot} from '../prototype/runtime-input.js';
import {valid2DAsset} from '../prototype/two-d-assets.js';
import {NativePhysicsQueries} from './native-physics-query.mjs';
const root=path.resolve(import.meta.dirname,'..'),buildRoot=path.join(root,'native/build/plugins');
const compiler=process.env.CXX||(process.platform==='win32'&&existsSync('C:/msys64/ucrt64/bin/g++.exe')?'C:/msys64/ucrt64/bin/g++.exe':'g++');
const env={...process.env,PATH:path.dirname(compiler)+path.delimiter+process.env.PATH};
const canonicalWorld=Symbol('canonical native world');
const cpp={bool:'bool',int:'int',float:'float',string:'std::string',vec2:'hb::Vec2',vec3:'hb::Vec3',color:'hb::Color',transform:'hb::Transform',object:'hb::Actor*',hit:'hb::HitResult'};
const cppType=p=>p.array?`std::vector<${cppType({...p,array:false})}>`:p.type==='object'?`${['Object','Actor','Pawn','Character','Controller','PlayerController','GameMode','GameState','PlayerState','AIController','Component','SceneComponent'].includes(p.className)?'hb::'+(p.className==='Object'?'Actor':p.className):p.className||'hb::Actor'}*`:cpp[p.type];
function unpack(p,expr){if(p.array&&p.type==='object')return `hb::bridgeObjectArray<${cppType({...p,array:false}).slice(0,-1)}>(${expr})`;return p.type==='object'?`dynamic_cast<${cppType(p)}>(hb::bridgeActor(${expr}))`:`${expr}.get<${cppType(p)}>()`;}
function generatedWorker(meta){
  let definitions='',cases='',factory='';
  for(const c of meta.classes){
    if(!['Actor','Pawn','Character','Controller','PlayerController','GameMode','GameState','PlayerState','AIController','Component','SceneComponent','Library'].includes(c.base))throw Error('실행 부모 클래스는 Actor·Component·Library를 지원해요.');
    const actor=['Actor','Pawn','Character','Controller','PlayerController','GameMode','GameState','PlayerState','AIController'].includes(c.base)?'return this;':['Component','SceneComponent'].includes(c.base)?'return this->'+c.name+'::actor;':'return nullptr;';
    const props=c.properties.map(p=>`j["${p.name}"]=hb::bridgeValue(this->${p.name});`).join('');
    const defaults=c.properties.map(p=>`if(j.contains("${p.name}"))this->${p.name}=${unpack(p,`j.at("${p.name}")`)};`).join('');
    const events=c.functions.filter(f=>f.event!=='none').map(f=>{const args=f.parameters.map(p=>`${p.cppType} ${p.name}`).join(','),id=c.name+'.'+f.name,payload=f.inputs.map(p=>`{"${p.id}",hb::bridgeValue(${p.id})}`).join(',');return `void ${f.name}(${args}) override {if(hb::overridden("${id}")){hb::bridgeEvents.push_back({{"nativeId","${id}"},{"target",this->id},{"args",hb::Json{${payload}}}});}else{${f.event==='native'?`${c.name}::${f.name}(${f.parameters.map(p=>p.name).join(',')});`:''}}}`;}).join('\n');
    definitions+=`struct HB_${c.name}: public ${c.name},public hb::BridgeCell {std::string id;${events} hb::Actor* actor() override {${actor}} hb::Json properties() override {hb::Json j=hb::Json::object();${props}return j;}void defaults(const hb::Json& j) override {${defaults}}};\n`;
    factory+=`if(className=="${c.name}"){auto cell=std::make_unique<HB_${c.name}>();cell->id=id;${['Component','SceneComponent'].includes(c.base)?'cell->'+c.name+'::actor=hb::bridgeActor(id);':''}${['Actor','Pawn','Character','Controller','PlayerController','GameMode','GameState','PlayerState','AIController'].includes(c.base)?'hb::bridgeActors.erase(id);':''}hb::bridgeCells[id]=std::move(cell);return true;}\n`;
    for(const p of c.properties){const id=c.name+'.'+p.name,target=`auto* target=dynamic_cast<HB_${c.name}*>(hb::bridgeCells.at(targetId).get());if(!target)throw std::runtime_error("C++ target class mismatch");`;
      cases+=`if(nativeId=="${id}"){if(ensure(targetId,"${c.name}"))hb::bridgeSync(objects);${target}if(key=="nativeGet")out["value"]=hb::bridgeValue(target->${p.name});${!p.readOnly?`else if(key=="nativeSet")target->${p.name}=${unpack(p,'args.at("value")')};`:''}else throw std::runtime_error("invalid property operation");handled=true;}\n`;
    }
    for(const f of c.functions){
      const id=c.name+'.'+f.name,locals=f.parameters.map((_,i)=>'HB_arg_'+i),declarations=f.parameters.map((parameter,i)=>{const p=[...f.inputs,...f.outputs].find(p=>p.id===parameter.name);if(!p)throw Error('공개 매개변수 정보가 없어요.');return cppType(p)+' '+locals[i]+'='+(parameter.out?'{}':unpack(p,'args.at("'+p.id+'")'))+';';}).join('');
      const receiverId=!f.static?'args.at("'+nativeTargetPin(f)+'").get<std::string>()':'targetId',target=f.static?'':'if(ensure('+receiverId+',"'+c.name+'"))hb::bridgeSync(objects);auto* HB_receiver=dynamic_cast<HB_'+c.name+'*>(hb::bridgeCells.at('+receiverId+').get());if(!HB_receiver)throw std::runtime_error("C++ target class mismatch");',receiver=f.static?c.name+'::':'HB_receiver->';
      const invoke=receiver+f.name+'('+locals.join(',')+')',result=f.returnType==='void'?invoke+';':'auto HB_result='+invoke+';out["'+f.outputs.find(p=>!f.parameters.some(param=>param.out&&param.name===p.id)).id+'"]=hb::bridgeValue(HB_result);';
      cases+='if(nativeId=="'+id+'"&&key=="nativeCall"){'+target+declarations+result+f.parameters.map((p,i)=>p.out?'out["'+p.name+'"]=hb::bridgeValue('+locals[i]+');':'').join('')+'handled=true;}\n';
    }
  }
  return `#include <HBEngine/Bridge.hpp>\n#include "User.hpp"\n${definitions}
bool ensure(const std::string& id,const std::string& className){if(hb::bridgeCells.count(id))return false;${factory}throw std::runtime_error("unknown C++ class");}
int main(){hb::Json inputObjects=hb::Json::array();std::string line;while(std::getline(std::cin,line)){hb::Json response;const auto HB_started=std::chrono::steady_clock::now();auto HB_phase=HB_started;auto HB_ms=[](auto from){return std::chrono::duration<double,std::milli>(std::chrono::steady_clock::now()-from).count();};hb::Json HB_timing=hb::Json::object();try{auto request=hb::Json::parse(line);HB_timing["parseMs"]=HB_ms(HB_started);HB_phase=std::chrono::steady_clock::now();hb::bridgeEvents=hb::Json::array();hb::bridgeOperations=hb::Json::array();hb::bridgeOverrides=request.value("overrides",std::vector<std::string>{});hb::bridgeInput=request.value("input",hb::Json::object());const auto command=request.value("command",std::string{});
if(request.value("command",std::string{})=="reset"){inputObjects=hb::Json::array();hb::bridgeCells.clear();hb::bridgeActors.clear();hb::bridgeActorIds.clear();hb::bridgeStateIndices.clear();hb::bridgeWorld=hb::Json::array();hb::Clock::Reset();hb::Timers::Reset();}
else if(request.value("command",std::string{})=="frame"){if(request.contains("clock")){hb::Clock::SetTimeScale(request.at("clock").at("scale").get<float>());hb::Clock::SetPaused(request.at("clock").at("paused").get<bool>());}hb::AdvanceFrame(request.at("delta").get<float>());}
else{const bool HB_patch=request.contains("objectPatch");if(HB_patch){hb::bridgeRestoreWorld(inputObjects);inputObjects.patch_inplace(request.at("objectPatch"));hb::bridgeWorld.patch_inplace(request.at("objectPatch"));}else inputObjects=request.value("objects",hb::Json::array());HB_timing["patchMs"]=HB_ms(HB_phase);HB_phase=std::chrono::steady_clock::now();const auto& objects=inputObjects;bool HB_created=false;for(const auto& o:objects)if(o.contains("nativeClass")&&!o.at("nativeClass").is_null()&&o.at("nativeClass")!="Actor")HB_created=ensure(o.at("id").get<std::string>(),o.at("nativeClass").get<std::string>())||HB_created;hb::bridgeSync(objects,!HB_patch||HB_created);HB_timing["syncMs"]=HB_ms(HB_phase);HB_phase=std::chrono::steady_clock::now();const auto key=request.at("key").get<std::string>(),nativeId=request.at("nativeId").get<std::string>();const auto args=request.at("args");const auto targetId=args.value("target",request.value("self",std::string{}));hb::Json out=hb::Json::object();bool handled=false;${cases}if(!handled)throw std::runtime_error("unknown native function");response["outputs"]=out;HB_timing["invokeMs"]=HB_ms(HB_phase);}HB_phase=std::chrono::steady_clock::now();
response["clock"]={{"time",hb::Clock::GetGameTime()},{"delta",hb::Clock::GetWorldDeltaSeconds()},{"scale",hb::Clock::TimeScale()},{"paused",hb::Clock::IsPaused()}};response["events"]=hb::bridgeEvents;response["operations"]=hb::bridgeOperations;response["objects"]=command=="frame"||command=="reset"?hb::Json::array():hb::bridgeChangedSnapshot(inputObjects);response["timerEvents"]=hb::Timers::TakeEvents();HB_timing["snapshotMs"]=HB_ms(HB_phase);HB_timing["workerMs"]=HB_ms(HB_started);response["transport"]=HB_timing;response["ok"]=true;
}catch(const std::exception& e){response={{"ok",false},{"error",e.what()}};}std::cout<<"HB_RESULT\\t"<<response.dump()<<std::endl;}return 0;}`;
}
export class NativeHost {
  constructor(){this.sessions=new Map();}
  registerBinary(binary,metadata){const token=randomUUID();this.sessions.set(token,{binary,metadata,queue:Promise.resolve(),lastUsed:Date.now()});return {token,metadata,diagnostics:'사전 빌드 로드'};}
  async build(header,source,{configuration='editor',signal}={}){
    signal?.throwIfAborted();
    if(!['editor','development','release'].includes(configuration))throw Error('C++ 빌드 구성 오류');
    if(typeof source!=='string'||source.length>500000)throw Error('C++ 구현은 500 KB 이하로 입력하세요.');const metadata=parseNativeHeader(header);metadata.workerProtocol=3;if(!metadata.classes.length)throw Error('공개 C++ 클래스가 없어요.');
    let compiledHeader=header.replace(/(HB_FUNCTION\([^)]*Blueprint(?:Native|Implementable)Event[^)]*\)\s*)(?!virtual\b)(void\s)/g,'$1virtual $2');
    let compiledSource='#include <HBEngine/Bridge.hpp>\n'+source.replace(/^\s*#include\s*"[^"\n]+\.(?:h|hpp)"\s*$/gm,'');compiledSource='#include "User.hpp"\n'+compiledSource;
    for(const c of metadata.classes)for(const f of c.functions.filter(f=>f.event==='implementable'))if(!new RegExp(`\\b${c.name}\\s*::\\s*${f.name}\\s*\\(`).test(source))compiledSource+=`\nvoid ${c.name}::${f.name}(${f.parameters.map(p=>p.cppType+' '+p.name).join(',')}){}\n`;
    const worker=generatedWorker(metadata),headers=await Promise.all(['Game.hpp','Bridge.hpp','Library.hpp'].map(name=>fs.readFile(path.join(root,'native/include/HBEngine',name)))),hash=createHash('sha256').update('atomic-v1'+configuration+compiledHeader+compiledSource+worker+headers.join('')).digest('hex').slice(0,20),dir=path.join(buildRoot,hash),binary=path.join(dir,process.platform==='win32'?'worker.exe':'worker');await prepareNative();await fs.mkdir(dir,{recursive:true});
    if(!existsSync(binary)){
      const attempt=randomUUID(),compileDir=path.join(dir,'compile-'+attempt),temporary=path.join(dir,'worker-'+attempt+(process.platform==='win32'?'.tmp.exe':'.tmp'));await fs.mkdir(compileDir);
      await Promise.all([fs.writeFile(path.join(compileDir,'User.hpp'),'#pragma once\n'+compiledHeader),fs.writeFile(path.join(compileDir,'User.cpp'),compiledSource),fs.writeFile(path.join(compileDir,'worker.cpp'),worker)]);
      try{
        await new Promise((resolve,reject)=>{const child=spawn(compiler,['-std=c++17',...(configuration==='editor'?['-O0']:configuration==='release'?['-O2','-s','-static']:['-Og','-g','-static']),'-I','native/include','-I',path.relative(root,jsonInclude),path.relative(root,path.join(compileDir,'worker.cpp')),path.relative(root,path.join(compileDir,'User.cpp')),'-o',path.relative(root,temporary)],{env,cwd:root,windowsHide:true,signal});let diagnostics='',failure;const append=b=>{diagnostics=(diagnostics+b).slice(-30000);};child.stderr.on('data',append);child.stdout.on('data',append);const timeout=setTimeout(()=>{failure=Error('C++ 빌드 시간 제한 초과');child.kill();},60000);child.once('error',error=>{failure=error;});child.once('close',code=>{clearTimeout(timeout);failure?reject(failure):code===0?resolve():reject(Error(diagnostics||'C++ 빌드 실패'));});});
        signal?.throwIfAborted();
        // Only a complete executable enters the shared cache. Other attempts may
        // commit the same hash while this compiler runs; keep their complete file.
        if(!existsSync(binary))await fs.rename(temporary,binary).catch(error=>{if(!existsSync(binary))throw error;});
      }finally{await fs.unlink(temporary).catch(error=>{if(error.code!=='ENOENT')throw error;});}
    }
    signal?.throwIfAborted();
    const token=randomUUID(),session={binary,metadata,queue:Promise.resolve(),lastUsed:Date.now()};this.sessions.set(token,session);for(const [key,value] of this.sessions)if(key!==token&&Date.now()-value.lastUsed>3600000){value.process?.kill();this.sessions.delete(key);}return {token,metadata,compiler:path.basename(compiler),diagnostics:'빌드 성공'};
  }
  validate(session,request){
    if(Array.isArray(request?.objects)&&request.objects.some(o=>o?.runtimeTilemap!==undefined&&!valid2DAsset('tilemap',o.runtimeTilemap)||o?.tilemapDirty!==undefined&&typeof o.tilemapDirty!=='boolean'))throw Error('C++ 타일맵 상태 오류');
    if(!request||typeof request!=='object')throw Error('잘못된 C++ 요청');if(request.input!==undefined&&!validInputSnapshot(request.input))throw Error('C++ 입력 상태 오류');if(!Array.isArray(request.objects)||request.objects.length>2000||new Set(request.objects.map(o=>o?.id)).size!==request.objects.length||request.objects.some(o=>!o||typeof o.id!=='string'||o.id.length>160||!validValue('transform',o)))throw Error('C++ 객체 상태 오류');for(const o of request.objects){const c=session.metadata.classes.find(c=>c.name===o.nativeClass);for(const [name,value] of Object.entries(o.nativeProperties||{})){const p=c?.properties.find(p=>p.name===name);if(!p||!(p.array?Array.isArray(value)&&value.length<=100000&&value.every(v=>validValue(p.type,v)):validValue(p.type,value)))throw Error('C++ 속성 자료형 오류: '+name);}}if(['frame','reset'].includes(request.command)){if(request.command==='frame'&&(!Number.isFinite(request.delta)||request.delta<0||request.delta>1||request.clock&&(!Number.isFinite(request.clock.scale)||request.clock.scale<0||typeof request.clock.paused!=='boolean')))throw Error('프레임 시간 오류');return;}
    const [className,name]=String(request.nativeId).split('.'),c=session.metadata.classes.find(c=>c.name===className),f=c?.functions.find(f=>f.name===name),p=c?.properties.find(p=>p.name===name);if(!c||!['nativeCall','nativeGet','nativeSet'].includes(request.key)||!request.args)throw Error('등록되지 않은 C++ 함수');
    const ports=request.key==='nativeCall'?f?.inputs:request.key==='nativeSet'&&!p?.readOnly?[{...p,id:'value'}]:request.key==='nativeGet'&&p?[]:null;if(!ports)throw Error('등록되지 않은 C++ 작업');for(const pin of ports){const value=request.args[pin.id];if(!(pin.array?Array.isArray(value)&&value.length<=100000&&value.every(v=>validValue(pin.type,v)):validValue(pin.type,value)))throw Error('C++ 입력 자료형 오류: '+pin.id);}
    for(const pin of ports.filter(p=>['object','hit'].includes(p.type)))for(const value of pin.array?request.args[pin.id]:[request.args[pin.id]]){const id=pin.type==='hit'?value.actor:value;if(id!==null&&!request.objects.some(o=>o.id===id))throw Error('C++ 객체 참조 오류: '+pin.id);}const receiver=request.args[request.key==='nativeCall'?nativeTargetPin(f):'target'];if(!f?.static&&(typeof receiver!=='string'||!request.objects?.some(o=>o.id===receiver)))throw Error('C++ 대상 오브젝트가 없어요.');
  }
  validateReply(session,request,result){
    const objectIndex=new Map(request.objects.map(o=>[o.id,o])),known=id=>objectIndex.has(id),validOne=(p,v)=>validValue(p.type,v)&&(p.type!=='object'||v===null||known(v))&&(p.type!=='hit'||v.actor===null||known(v.actor)),valid=(p,v)=>p.array?Array.isArray(v)&&v.length<=100000&&v.every(x=>validOne(p,x)):validOne(p,v);
    const [className,name]=String(request.nativeId).split('.'),c=session.metadata.classes.find(c=>c.name===className),f=c?.functions.find(f=>f.name===name),p=c?.properties.find(p=>p.name===name),ports=request.key==='nativeCall'?f?.outputs:request.key==='nativeGet'&&p?[{...p,id:'value'}]:[];
    for(const pin of ports||[]){const value=result.outputs?.[pin.id];if(!valid(pin,value)||(pin.type==='object'&&!pin.array&&value!==null&&!known(value)))throw Error('C++ 출력 자료형 오류: '+pin.id);}
    if(!Array.isArray(result.objects)||result.objects.some(o=>!known(o?.id)||(o.position!==undefined?(!validValue('transform',o)||!o.scale.every(v=>v>=.01)||!['position','rotation','scale'].every(k=>o[k].every(v=>Math.abs(v)<=10000))):!session.metadata.classes.some(c=>c.name===objectIndex.get(o.id)?.nativeClass&&c.base!=='Actor'))))throw Error('C++ 객체 출력 범위 오류');
    for(const o of result.objects)for(const [name,value] of Object.entries(o.nativeProperties||{})){const cl=session.metadata.classes.find(c=>c.name===objectIndex.get(o.id)?.nativeClass),property=cl?.properties.find(p=>p.name===name);if(!property||!valid(property,value))throw Error('C++ 속성 출력 자료형 오류: '+name);}
    if(!Array.isArray(result.events))throw Error('C++ 이벤트 출력 오류');for(const e of result.events){const [cls,name]=String(e.nativeId).split('.'),event=session.metadata.classes.find(c=>c.name===cls)?.functions.find(f=>f.name===name&&f.event!=='none');if(!event||!known(e.target)||event.inputs.some(p=>!valid(p,e.args?.[p.id])))throw Error('C++ 이벤트 출력 자료형 오류');}
    if(!Array.isArray(result.operations)||result.operations.length>1000)throw Error('C++ 엔진 작업 출력 오류');
    for(const operation of result.operations){const spec=serviceApi.find(s=>s.key===operation?.key&&!s.pure);if(!spec||!operation.args||spec.inputs.filter(p=>p.type!=='exec').some(p=>!valid(p,operation.args[p.id])))throw Error('C++ 엔진 작업 자료형 오류');}
    if(!result.clock||!['time','delta','scale'].every(k=>Number.isFinite(result.clock[k])&&result.clock[k]>=0)||typeof result.clock.paused!=='boolean')throw Error('C++ 시간 출력 오류');return result;
  }
  decodeRequest(session,request){
    if(request?.worldTransport===undefined)return request;
    if(session.metadata.workerProtocol!==3||request.worldTransport!==1||request.command||typeof request.worldId!=='string'||!/^[0-9a-f-]{36}$/.test(request.worldId)||!Number.isSafeInteger(request.worldSequence)||request.worldSequence<1||!Number.isSafeInteger(request.baseSequence)||request.baseSequence<0)throw Error('C++ snapshot transport contract');
    const {objectPatch,worldTransport,worldId,baseSequence,worldSequence,...plain}=request;let objects;
    if(baseSequence===0){if(worldSequence!==1||objectPatch!==undefined||!Array.isArray(request.objects))throw Error('C++ full snapshot contract');objects=request.objects;}
    else {if(!session.requestWorld||worldId!==session.requestWorldId||baseSequence!==session.requestSequence||worldSequence!==baseSequence+1||request.objects!==undefined)throw Error('C++ snapshot sequence mismatch');objects=applyWorldPatch(session.requestWorld,objectPatch);}
    return {...plain,objects,[canonicalWorld]:{base:session.requestWorld,patch:objectPatch}};
  }
  async call(token,request){
    const session=this.sessions.get(token);if(!session)throw Error('C++을 먼저 빌드하세요.');session.lastUsed=Date.now();
    const job=session.queue.then(async()=>{try{
      const started=performance.now(),decoded=this.decodeRequest(session,request),decodedAt=performance.now();this.validate(session,decoded);const validatedAt=performance.now(),reply=await this.rpc(session,decoded),replyAt=performance.now(),result=this.validateReply(session,decoded,reply);Object.assign(result.transport,{decodeMs:decodedAt-started,validateMs:validatedAt-decodedAt,replyValidationMs:performance.now()-replyAt});
      if(request.worldTransport===1){session.requestWorld=decoded.objects;session.requestWorldId=request.worldId;session.requestSequence=request.worldSequence;result.worldSequence=request.worldSequence;result.transport.upstreamMode=request.baseSequence?'patch':'full';result.transport.upstreamBytes=Buffer.byteLength(JSON.stringify(request));}
      else if(request.command!=='frame'){session.requestWorld=null;session.requestSequence=0;}return result;
    }catch(error){session.requestWorld=null;session.requestSequence=0;session.transportWorld=null;throw error;}});
    session.queue=job.catch(()=>{});return job;
  }
  rpc(session,request){
    if(!session.process){session.transportWorld=null;session.process=spawn(session.binary,[],{env,windowsHide:true,stdio:['pipe','pipe','pipe']});session.lines=readline.createInterface({input:session.process.stdout});session.process.stderr.on('data',()=>{});session.process.on('error',()=>{});session.process.once('exit',()=>session.process=null);}
    return new Promise((resolve,reject)=>{const prepareStart=performance.now();const clockOnly=session.metadata.workerProtocol>=2&&["frame","reset"].includes(request.command);if(request.command==="reset")session.transportWorld=null;const current=clockOnly?null:request[canonicalWorld]?request.objects:JSON.parse(JSON.stringify(request.objects)),patch=!clockOnly&&session.metadata.workerProtocol>=2&&session.transportWorld?(request[canonicalWorld]?.patch&&session.transportWorld===request[canonicalWorld].base?request[canonicalWorld].patch:worldPatch(session.transportWorld,current)):null,packet=clockOnly?{...request,objects:[]}:patch?{...request,objects:undefined,objectPatch:patch}:request;if(!clockOnly)session.transportWorld=current;const payload=JSON.stringify(packet),rpcStart=performance.now();const child=session.process,lines=session.lines,queries=new NativePhysicsQueries(request.objects);let finished=false;
      const cleanup=()=>{finished=true;clearTimeout(timeout);queries.close();lines.off('line',onLine);child.off('exit',onExit);child.off('error',onError);};const onError=error=>{if(finished)return;cleanup();session.transportWorld=null;reject(error);},onExit=code=>onError(Error('C++ 실행 프로세스가 종료됐어요: '+code));const timeout=setTimeout(()=>{child.kill();onError(Error('C++ 함수 실행 시간 제한 초과'));},5000);
      const onLine=async line=>{if(finished)return;
        if(line.startsWith('HB_QUERY\t')){let reply;try{if(Buffer.byteLength(line,'utf8')>4000000)throw Error('C++ 물리 질의 크기 제한 초과');reply={ok:true,value:await queries.query(JSON.parse(line.slice(9)))};}catch(error){reply={ok:false,error:error.message};}if(!finished)child.stdin.write(JSON.stringify(reply)+'\n',error=>{if(error)onError(error);});return;}
        const start=line.indexOf('HB_RESULT\t');if(start<0)return;try{const result=JSON.parse(line.slice(start+10));cleanup();if(result.ok){result.transport={...result.transport,mode:clockOnly?"clock":packet.objectPatch?"patch":"full",bytes:Buffer.byteLength(payload),patchOperations:packet.objectPatch?.length||0,prepareMs:rpcStart-prepareStart,replyBytes:Buffer.byteLength(line),returnedObjects:result.objects?.length||0,rpcMs:performance.now()-rpcStart};resolve(result);}else{session.transportWorld=null;reject(Error(result.error));}}catch(error){onError(error);}};lines.on('line',onLine);child.once('exit',onExit);child.once('error',onError);child.stdin.write(payload+'\n',error=>{if(error)onError(error);});});
  }
  close(){for(const session of this.sessions.values())session.process?.kill();this.sessions.clear();}
}
