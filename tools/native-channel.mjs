import {WebSocketServer} from 'ws';
import {randomUUID} from 'node:crypto';

// Keep the existing typed native protocol and project lifetime checks; only the
// local browser/Node transport changes. Compression adds no value to small deltas.
export function attachNativeChannel(server,{origin,scope}){
  const token=randomUUID(),path='/api/native/channel',wss=new WebSocketServer({noServer:true,maxPayload:4194304,perMessageDeflate:false});
  server.on('upgrade',(request,socket,head)=>{
    try{const base=origin(),url=new URL(request.url,base);if(request.headers.host!==new URL(base).host||request.headers.origin!==base||url.pathname!==path||url.searchParams.get('token')!==token)throw Error('출처 오류');
      const call=scope();wss.handleUpgrade(request,socket,head,ws=>{
        ws.on('error',()=>{});const pending=new Set(),queries=new Map();let sequence=0;
        ws.on('close',()=>{for(const q of queries.values()){clearTimeout(q.timer);q.reject(Error('GPU 질의 채널 종료'));}queries.clear();});
        ws.on('message',async(bytes,binary)=>{let id,accepted=false;try{
          const data=JSON.parse(bytes.toString());id=data.id;
          if(data.queryId!==undefined){const q=queries.get(data.queryId);if(binary||!q||q.id!==id||!pending.has(id))throw Error('GPU 질의 응답 ID 오류');queries.delete(data.queryId);clearTimeout(q.timer);data.error?q.reject(Error(String(data.error))):q.resolve(data.value);return;}
          if(binary||!Number.isSafeInteger(id)||id<1||pending.has(id)||pending.size>=64||typeof data.token!=='string'||!data.request||typeof data.request!=='object')throw Error('C++ 채널 요청 형식 오류');
          pending.add(id);accepted=true;const query=packet=>new Promise((resolve,reject)=>{if(ws.readyState!==1||queries.size>=128){reject(Error('GPU 질의 채널 범위 오류'));return;}const queryId=++sequence,timer=setTimeout(()=>{queries.delete(queryId);reject(Error('GPU 질의 시간 초과'));},4000);queries.set(queryId,{id,resolve,reject,timer});ws.send(JSON.stringify({id,queryId,query:packet}));});const result=await call(data,query);if(ws.readyState===1)ws.send(JSON.stringify({id,result}));
        }catch(error){if(!accepted){ws.close(1008,'invalid request');return;}if(ws.readyState===1)ws.send(JSON.stringify({id,error:error.message}));}finally{if(accepted)pending.delete(id);}});
      });
    }catch{socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');}
  });
  return {descriptor:{version:1,path:path+'?token='+token},close(){for(const ws of wss.clients)ws.terminate();wss.close();}};
}
