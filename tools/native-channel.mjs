import {WebSocketServer} from 'ws';
import {randomUUID} from 'node:crypto';

// Keep the existing typed native protocol and project lifetime checks; only the
// local browser/Node transport changes. Compression adds no value to small deltas.
export function attachNativeChannel(server,{origin,scope}){
  const token=randomUUID(),path='/api/native/channel',wss=new WebSocketServer({noServer:true,maxPayload:4194304,perMessageDeflate:false});
  server.on('upgrade',(request,socket,head)=>{
    try{const base=origin(),url=new URL(request.url,base);if(request.headers.host!==new URL(base).host||request.headers.origin!==base||url.pathname!==path||url.searchParams.get('token')!==token)throw Error('출처 오류');
      const call=scope();wss.handleUpgrade(request,socket,head,ws=>{
        ws.on('error',()=>{});const pending=new Set();
        ws.on('message',async(bytes,binary)=>{let id,accepted=false;try{
          const data=JSON.parse(bytes.toString());id=data.id;if(binary||!Number.isSafeInteger(id)||id<1||pending.has(id)||pending.size>=64||typeof data.token!=='string'||!data.request||typeof data.request!=='object')throw Error('C++ 채널 요청 형식 오류');
          pending.add(id);accepted=true;const result=await call(data);if(ws.readyState===1)ws.send(JSON.stringify({id,result}));
        }catch(error){if(!accepted){ws.close(1008,'invalid request');return;}if(ws.readyState===1)ws.send(JSON.stringify({id,error:error.message}));}finally{if(accepted)pending.delete(id);}});
      });
    }catch{socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');}
  });
  return {descriptor:{version:1,path:path+'?token='+token},close(){for(const ws of wss.clients)ws.terminate();wss.close();}};
}
