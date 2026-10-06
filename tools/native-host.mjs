import {persistentQueryKeys} from '../prototype/runtime-storage.js';
import {NativeProtocol,canonicalWorld} from '../prototype/native-protocol.js';
import {nativeSources} from './native-source.mjs';
import {worldPatch,applyWorldPatch} from './native-world-patch.mjs';
import {commitNativeWorld} from '../prototype/native-transport.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import {existsSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import readline from 'node:readline';
import {prepareNative,jsonInclude} from './prepare-native.mjs';
import {NativePhysicsQueries} from './native-physics-query.mjs';
import {nativeModuleRequest,mergeNativeReply} from '../prototype/native-module-query.js';
import {spawnQueryRequest,spawnQueryCursor} from '../prototype/native-spawn.js';
const root=path.resolve(import.meta.dirname,'..'),buildRoot=path.join(root,'native/build/plugins');
const compiler=process.env.CXX||(process.platform==='win32'&&existsSync('C:/msys64/ucrt64/bin/g++.exe')?'C:/msys64/ucrt64/bin/g++.exe':'g++');
const env={...process.env,PATH:path.dirname(compiler)+path.delimiter+process.env.PATH};

export class NativeHost extends NativeProtocol {
  constructor(){super();this.sessions=new Map();}
  registerBinary(binary,metadata){const token=randomUUID();this.sessions.set(token,{binary,metadata,queue:Promise.resolve(),lastUsed:Date.now()});return {token,metadata,diagnostics:'사전 빌드 로드'};}
  async build(header,source,{configuration='editor',signal}={}){
    signal?.throwIfAborted();
    if(!['editor','development','release'].includes(configuration))throw Error('C++ 빌드 구성 오류');
    const {metadata,header:compiledHeader,source:compiledSource,worker}=nativeSources(header,source);const headers=await Promise.all(['Game.hpp','Bridge.hpp','Library.hpp','Native.hpp','NativeRouting.hpp','Spawn.hpp','Session.hpp'].map(name=>fs.readFile(path.join(root,'native/include/HBEngine',name)))),hash=createHash('sha256').update('atomic-v2-worker-o2'+configuration+compiledHeader+compiledSource+worker+headers.join('')).digest('hex').slice(0,20),dir=path.join(buildRoot,hash),binary=path.join(dir,process.platform==='win32'?'worker.exe':'worker');await prepareNative();await fs.mkdir(dir,{recursive:true});
    const cacheHit=existsSync(binary);if(!cacheHit){
      const attempt=randomUUID(),compileDir=path.join(dir,'compile-'+attempt),temporary=path.join(dir,'worker-'+attempt+(process.platform==='win32'?'.tmp.exe':'.tmp'));await fs.mkdir(compileDir);
      await Promise.all([fs.writeFile(path.join(compileDir,'User.hpp'),'#pragma once\n'+compiledHeader),fs.writeFile(path.join(compileDir,'User.cpp'),compiledSource),fs.writeFile(path.join(compileDir,'worker.cpp'),worker)]);
      try{
        const deadline=performance.now()+60000,compile=args=>new Promise((resolve,reject)=>{if(performance.now()>=deadline){reject(Error('C++ 빌드 시간 제한 초과'));return;}const child=spawn(compiler,args,{env,cwd:root,windowsHide:true,signal});let diagnostics='',failure;const append=b=>{diagnostics=(diagnostics+b).slice(-30000);};child.stderr.on('data',append);child.stdout.on('data',append);const timeout=setTimeout(()=>{failure=Error('C++ 빌드 시간 제한 초과');child.kill();},deadline-performance.now());child.once('error',error=>{failure=error;});child.once('close',code=>{clearTimeout(timeout);failure?reject(failure):code===0?resolve():reject(Error(diagnostics||'C++ 빌드 실패'));});});
        // GCC's assembler cannot reopen an intermediate file in a Unicode TEMP
        // on Windows. Pipe translation units directly; keep the game's TEMP intact.
        const common=['-std=c++17','-pipe','-I','native/include','-I',path.relative(root,jsonInclude)],file=name=>path.relative(root,path.join(compileDir,name));
        // Optimize the JSON/engine translation unit while preserving user-code
        // debugging. All stages share the existing 60-second build deadline.
        await compile([...common,'-O2','-c',file('worker.cpp'),'-o',file('worker.o')]);
        await compile([...common,...(configuration==='editor'?['-O0','-g']:configuration==='development'?['-Og','-g']:['-O2']),'-c',file('User.cpp'),'-o',file('User.o')]);
        await compile([file('worker.o'),file('User.o'),...(configuration==='editor'?[]:['-static']),...(configuration==='release'?['-s']:[]),'-o',path.relative(root,temporary)]);
        signal?.throwIfAborted();
        // Only a complete executable enters the shared cache. Other attempts may
        // commit the same hash while this compiler runs; keep their complete file.
        if(!existsSync(binary))await fs.rename(temporary,binary).catch(error=>{if(!existsSync(binary))throw error;});
      }finally{await Promise.all([temporary,path.join(compileDir,'worker.o'),path.join(compileDir,'User.o')].map(file=>fs.unlink(file).catch(error=>{if(error.code!=='ENOENT')throw error;})));}
    }
    signal?.throwIfAborted();
    const token=randomUUID(),session={binary,metadata,queue:Promise.resolve(),lastUsed:Date.now()};this.sessions.set(token,session);for(const [key,value] of this.sessions)if(key!==token&&Date.now()-value.lastUsed>3600000){value.process?.kill();this.sessions.delete(key);}return {token,metadata,cacheKey:hash,cacheHit,compiler:path.basename(compiler),diagnostics:'빌드 성공'};
  }
  async call(token,request,from){
    const session=this.sessions.get(token);if(!session)throw Error('C++을 먼저 빌드하세요.');session.lastUsed=Date.now();
    if(from&&session.busy)throw Error('실행 중인 C++ 모듈로 순환 호출할 수 없어요.');
    if(from&&from.nativeDepth>=7)throw Error('C++ 모듈 호출 깊이 제한 초과');
    const job=session.queue.then(async()=>{try{
      session.busy=true;session.nativeDepth=from?from.nativeDepth+1:0;session.nativeBudget=from?.nativeBudget||{count:0};
      const started=performance.now(),decoded=this.decodeRequest(session,request),decodedAt=performance.now();this.validate(session,decoded);if(decoded.gameSession&&this.gameSessionId!==decoded.gameSession.id){this.gameSessionId=decoded.gameSession.id;this.persistentQueries?.clear();}if(decoded.spawnTemplates){session.spawnContexts??=new Map();session.spawnContexts.set(decoded.spawnPrefix,decoded.spawnTemplates);if(session.spawnContexts.size>8)session.spawnContexts.delete(session.spawnContexts.keys().next().value);}const validatedAt=performance.now(),reply=await this.rpc(session,decoded),replyAt=performance.now(),result=this.validateReply(session,decoded,reply);Object.assign(result.transport,{decodeMs:decodedAt-started,validateMs:validatedAt-decodedAt,replyValidationMs:performance.now()-replyAt});
      const committed=request.worldTransport===1?commitNativeWorld(decoded.objects,result):undefined;
      if(session.transportWorld)session.transportWorld=session.transportWorld===decoded.objects&&committed?committed:commitNativeWorld(session.transportWorld,result);
      // Nested module calls change the worker world, not the client's acknowledged
      // snapshot history. Its next delta still refers to that earlier client world.
      if(request.worldTransport===1){session.requestWorld=committed;session.requestWorldId=request.worldId;session.requestSequence=request.worldSequence;result.worldSequence=request.worldSequence;result.transport.upstreamMode=request.baseSequence?'patch':'full';result.transport.upstreamBytes=Buffer.byteLength(JSON.stringify(request));}
      else if(request.command==='reset'){session.requestWorld=null;session.requestSequence=0;}if(result.nativeError){if(request.worldTransport===1){session.requestWorld=null;session.requestSequence=0;}session.transportWorld=null;}return result;
    }catch(error){if(request.worldTransport===1||request.command==='reset'){session.requestWorld=null;session.requestSequence=0;}session.transportWorld=null;throw error;}finally{session.busy=false;session.nativeBudget=null;}});
    session.queue=job.catch(()=>{});return job;
  }
  rpc(session,request){
    if(request.spawnPrefix&&session.spawnContexts?.has(request.spawnPrefix)&&(!session.process||session.workerSpawnPrefix!==request.spawnPrefix))request={...request,spawnTemplates:session.spawnContexts.get(request.spawnPrefix)};
    if(!session.process){session.transportWorld=null;session.process=spawn(session.binary,[],{env:{...env,...process.env,PATH:env.PATH},windowsHide:true,stdio:['pipe','pipe','pipe']});session.lines=readline.createInterface({input:session.process.stdout});session.process.stderr.on('data',()=>{});session.process.on('error',()=>{});session.process.once('exit',()=>{session.process=null;session.workerSpawnPrefix=null;});}
    return new Promise((resolve,reject)=>{const prepareStart=performance.now();const clockOnly=session.metadata.workerProtocol>=2&&["frame","reset"].includes(request.command);if(request.command==="reset")session.transportWorld=null;const current=clockOnly?null:request[canonicalWorld]?request.objects:JSON.parse(JSON.stringify(request.objects)),patch=!clockOnly&&session.metadata.workerProtocol>=2&&session.transportWorld?(request[canonicalWorld]?.patch&&session.transportWorld===request[canonicalWorld].base?request[canonicalWorld].patch:worldPatch(session.transportWorld,current)):null,packet=clockOnly?{...request,objects:[]}:patch?{...request,objects:undefined,objectPatch:patch}:request;if(!clockOnly)session.transportWorld=current;const payload=JSON.stringify(packet),rpcStart=performance.now();const child=session.process,lines=session.lines,queries=new NativePhysicsQueries(request.objects,{authorizeWorld:query=>spawnQueryRequest(request,query,session.metadata,request.spawnTemplates||session.spawnContexts?.get(request.spawnPrefix))});let finished=false;
      const cleanup=()=>{finished=true;clearTimeout(timeout);queries.close();lines.off('line',onLine);child.off('exit',onExit);child.off('error',onError);};const onError=error=>{if(finished)return;cleanup();session.transportWorld=null;reject(error);},onExit=code=>onError(Error('C++ 실행 프로세스가 종료됐어요: '+code));const timeout=setTimeout(()=>{child.kill();onError(Error('C++ 함수 실행 시간 제한 초과'));},5000);
      const onLine=async line=>{if(finished)return;
        if(line.startsWith('HB_QUERY\t')){let reply;try{if(Buffer.byteLength(line,'utf8')>4000000)throw Error('C++ 질의 크기 제한 초과');const query=JSON.parse(line.slice(9));let value;if(persistentQueryKeys.has(query.key)){if(!this.persistentQueries)throw Error('게임 저장·데이터 서비스가 준비되지 않았어요.');value=await this.persistentQueries(query.key,query.args);}else if(query.key==='nativeModule'){
          if(++session.nativeBudget.count>128)throw Error('C++ 모듈 질의 개수 오류');const authorized=spawnQueryRequest(request,query,session.metadata,request.spawnTemplates||session.spawnContexts?.get(request.spawnPrefix));this.validate(session,{command:'reset',objects:query.objects});const route=nativeModuleRequest(authorized,query,token=>this.module(token)),result=await this.call(route.token,route.request,session);
          request.nativeBindings=authorized.nativeBindings;request[spawnQueryCursor]=query.operations?.length||0;for(const state of mergeNativeReply(result,route.call.self).objects){const binding=request.nativeBindings.find(b=>b.id===state.id);if(binding&&state.nativeProperties)binding.properties=state.nativeProperties;}value={token:route.token,call:route.call,result};
        }else value=await queries.query(query);reply={ok:true,value};}catch(error){reply={ok:false,error:error.message};}if(!finished)child.stdin.write(JSON.stringify(reply)+'\n',error=>{if(error)onError(error);});return;}
        const start=line.indexOf('HB_RESULT\t');if(start<0)return;try{const result=JSON.parse(line.slice(start+10));cleanup();if(result.ok){if(request.spawnTemplates)session.workerSpawnPrefix=request.spawnPrefix;result.transport={...result.transport,mode:clockOnly?"clock":packet.objectPatch?"patch":"full",bytes:Buffer.byteLength(payload),patchOperations:packet.objectPatch?.length||0,prepareMs:rpcStart-prepareStart,replyBytes:Buffer.byteLength(line),returnedObjects:result.objects?.length||0,rpcMs:performance.now()-rpcStart};resolve(result);}else{session.transportWorld=null;reject(Error(result.error));}}catch(error){onError(error);}};lines.on('line',onLine);child.once('exit',onExit);child.once('error',onError);child.stdin.write(payload+'\n',error=>{if(error)onError(error);});});
  }
  close(){for(const session of this.sessions.values())session.process?.kill();this.sessions.clear();}
}
