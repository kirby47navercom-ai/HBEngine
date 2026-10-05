import {NativeProtocol} from './native-protocol.js';
import {NativePhysicsQueries} from './native-physics-query.js';
import {resolveBuildPath} from './build-profile.js';

const safe=name=>typeof name==='string'&&name.length>0&&name.length<=2000&&!/[\\:\x00-\x1f]/.test(name)&&!name.startsWith('/')&&!name.split('/').some(s=>!s||s==='.'||s==='..');
export function mobileBackend(manifest,{read,request}){
  if(manifest.version!==1||!Array.isArray(manifest.entries)||!Array.isArray(manifest.nativeModules)||!safe(manifest.startupScene))throw Error('모바일 패키지 형식 오류');
  const session={id:manifest.id,name:manifest.name,projectFile:'game.hbpack.json',startupScene:manifest.startupScene,startupBlueprint:manifest.startupBlueprint,legacyStorage:false,player:true};
  const entries=new Set(manifest.entries.map(e=>e.path)),protocol=new NativeProtocol(),modules=new Map();let report=null;
  for(const [index,module] of manifest.nativeModules.entries())modules.set(module.signature,{...module,index,token:module.signature,queue:Promise.resolve()});
  const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
  async function nativeCall(data){
    const module=modules.get(data.token);if(!module)throw Error('패키지에 등록되지 않은 C++ 모듈');
    const job=module.queue.then(async()=>{
      let queries;try{
        const decoded=protocol.decodeRequest(module,data.request);protocol.validate(module,decoded);queries=new NativePhysicsQueries(decoded.objects);
        const clockOnly=['frame','reset'].includes(decoded.command),packet=clockOnly?{...decoded,objects:[]}:data.request.objectPatch?{...decoded,objects:undefined,objectPatch:data.request.objectPatch}:decoded;
        const reply=await request('native',{module:module.index,request:packet},query=>queries.query(query));
        if(!reply.ok)throw Error(reply.error||'모바일 C++ 실행 실패');const result=protocol.validateReply(module,decoded,reply);
        if(data.request.worldTransport===1){module.requestWorld=decoded.objects;module.requestWorldId=data.request.worldId;module.requestSequence=data.request.worldSequence;result.worldSequence=data.request.worldSequence;}
        else if(data.request.command!=='frame'){module.requestWorld=null;module.requestSequence=0;}return result;
      }catch(error){module.requestWorld=null;module.requestSequence=0;throw error;}finally{queries?.close();}
    });module.queue=job.catch(()=>{});return job;
  }
  return async function fetchMobile(input,options={}){
    const url=new URL(typeof input==='string'?input:input.url,'https://hbengine.local'),method=options.method||input.method||'GET';
    const body=()=>{const raw=options.body||'{}';if(typeof raw!=='string'||raw.length>8388608)throw Error('모바일 요청 크기 오류');return JSON.parse(raw);};
    try{
      if(url.pathname==='/api/session'&&method==='GET')return json(session);
      if(url.pathname==='/api/player'&&method==='GET')return json({name:manifest.name,configuration:manifest.configuration,redirects:manifest.redirects,width:manifest.width,height:manifest.height,scene:manifest.startupScene,mobile:true});
      if(url.pathname==='/api/project'&&method==='GET')return json({entries:manifest.entries});
      if(url.pathname==='/api/file'&&method==='GET'){const name=url.searchParams.get('path');if(!safe(name))throw Error('모바일 에셋 경로 오류');const resolved=resolveBuildPath(name,manifest.redirects);if(!entries.has(resolved))return json({error:'게임 파일이 없어요.'},404);return read('Content/'+resolved);}
      if(url.pathname==='/api/storage'){
        if(method==='GET'){if(url.searchParams.get('project')!==manifest.id)throw Error('프로젝트 ID 오류');const saved=await request('storageRead',{});if(saved?.version!==1||!saved.items||typeof saved.items!=='object'||Array.isArray(saved.items))throw Error('게임 저장 형식 오류');const suffix='.project.'+encodeURIComponent(manifest.id);return json({version:1,items:Object.fromEntries(Object.entries(saved.items).filter(([key])=>key.endsWith(suffix)))});}
        if(method==='PUT'){const data=body(),suffix='.project.'+encodeURIComponent(manifest.id);if(data.id!==manifest.id||!data.items||Array.isArray(data.items)||typeof data.items!=='object'||Object.entries(data.items).some(([key,value])=>key.length>1000||!key.endsWith(suffix)||!key.startsWith('hbengine.savegame.')&&!key.startsWith('hbengine.storage-migrated.v1.')||value!==null&&typeof value!=='string')||JSON.stringify(data.items).length>4194304)throw Error('게임 저장 범위 오류');return json(await request('storageWrite',data.items));}
      }
      if(url.pathname==='/api/native/build'&&method==='POST'){const data=body(),module=[...modules.values()].find(m=>m.header===data.header&&m.source===data.source);if(!module)throw Error('패키지에 등록되지 않은 C++ 코드');return json({token:module.token,metadata:module.metadata,diagnostics:'모바일 사전 빌드 로드'});}
      if(url.pathname==='/api/native/call'&&method==='POST')return json(await nativeCall(body()));
      if(url.pathname==='/api/player/report'){
        if(method==='POST'){report=body();if(manifest.configuration==='development')await request('report',report);return json({ok:true});}
        if(method==='GET'&&manifest.configuration==='development')return json(report);
      }
      return json({error:'모바일 실행기에 없는 작업'},404);
    }catch(error){return json({error:error.message},400);}
  };
}

export function platformBridge(send){
  const pending=new Map();let sequence=0;
  const request=(operation,data,query)=>new Promise((resolve,reject)=>{
    const id=String(++sequence),timer=setTimeout(()=>{pending.delete(id);reject(Error('모바일 호스트 응답 시간 초과'));},15000);
    pending.set(id,{resolve,reject,timer,query});try{send({id,operation,data});}catch(error){clearTimeout(timer);pending.delete(id);reject(error);}
  });
  const receive=async packet=>{
    const item=pending.get(packet.id);if(!item)return;
    if(packet.query){let response;try{if(!item.query)throw Error('C++ 질의 작업이 없어요.');response={ok:true,value:await item.query(packet.query)};}catch(error){response={ok:false,error:error.message};}send({operation:'queryReply',id:packet.queryId,data:response});return;}
    clearTimeout(item.timer);pending.delete(packet.id);packet.error?item.reject(Error(packet.error)):item.resolve(packet.data);
  };
  return {request,receive};
}

export async function startMobilePlayer(){
  const original=window.fetch.bind(window),manifest=await (await original('/game.hbpack.json')).json();
  const send=packet=>{const value=JSON.stringify(packet);if(window.HBMobile)window.HBMobile.postMessage(value);else window.webkit.messageHandlers.hbmobile.postMessage(value);};
  const bridge=platformBridge(send);window.hbMobileReply=bridge.receive;
  const backend=mobileBackend(manifest,{read:name=>original('/'+name),request:bridge.request});
  window.fetch=(input,options)=>{const url=new URL(typeof input==='string'?input:input.url,location.href);return url.origin===location.origin&&url.pathname.startsWith('/api/')?backend(input,options):original(input,options);};
  // Preserve the existing Player close/save path on both mobile hosts.
  window.chrome={webview:{postMessage:value=>{if(value==='hbengine.close')bridge.request('close',{}).catch(()=>{});}}};
  await import('./player.js');
}
