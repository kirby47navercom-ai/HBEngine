import http from 'node:http';
import {WebSocketServer} from 'ws';
import {randomUUID,timingSafeEqual} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {validReplica,validNetworkRPC} from '../prototype/network-state.js';
const same=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
export async function startMultiplayerServer({port=0,host='127.0.0.1',hostKey=randomUUID(),clientKey=randomUUID(),maxPeers=32,actorBudget=100000,stateBudgetBytes=16777216}={}){
 if(!Number.isInteger(maxPeers)||maxPeers<2||maxPeers>65536||!Number.isInteger(actorBudget)||actorBudget<1||actorBudget>1000000)throw Error('네트워크 연결·오브젝트 예산 오류');
 if(!Number.isSafeInteger(stateBudgetBytes)||stateBudgetBytes<1024||stateBudgetBytes>1073741824)throw Error('네트워크 상태 메모리 예산 오류');
 const server=http.createServer((req,res)=>res.writeHead(404).end()),wss=new WebSocketServer({noServer:true,maxPayload:4194304,perMessageDeflate:false}),peers=new Map(),states=new Map(),sizes=new Map();let sequence=0,stateBytes=0;
 const send=(ws,value)=>{if(ws.readyState!==1)return;if(ws.bufferedAmount>4194304){ws.close(1013,'slow peer');return;}ws.send(JSON.stringify(value));},broadcast=value=>{for(const p of peers.values())if(p.socket){if(p.ready)send(p.socket,value);else if(value.type==='state')for(const row of value.states)p.pending.set(row.id,row);else if(p.rpc.length<1024)p.rpc.push(value);else p.socket.close(1013,'snapshot backlog');}};
 server.on('upgrade',(request,socket,head)=>{try{
  const url=new URL(request.url,'http://localhost'),authority=url.searchParams.get('role')==='host';if(url.pathname!=='/hb-network'||!same(url.searchParams.get('key'),authority?hostKey:clientKey))throw Error('인증 오류');
  for(const [id,p] of peers)if(!p.socket&&p.until<Date.now())peers.delete(id);
  const resume=url.searchParams.get('resume'),prior=resume&&[...peers.values()].find(p=>same(p.resume,resume)&&p.authority===authority);if(prior?.socket||!prior&&peers.size>=maxPeers||authority&&[...peers.values()].some(p=>p.authority&&p!==prior&&p.socket))throw Error('연결 예산·호스트 중복');
  wss.handleUpgrade(request,socket,head,ws=>{
   const peer=prior||{id:authority?'host':randomUUID(),resume:randomUUID(),authority};peer.socket=ws;peer.until=0;peer.messages=0;peer.window=Date.now();peer.ready=false;peer.pending=new Map();peer.rpc=[];peers.set(peer.id,peer);ws.on('error',()=>{});
   const initialSequence=sequence,snapshot=[...states.values()],flush=value=>new Promise((resolve,reject)=>{if(ws.readyState!==1)return reject(Error('연결 종료'));ws.send(JSON.stringify(value),e=>e?reject(e):resolve());});
   (async()=>{await flush({type:'welcome',peer:peer.id,resume:peer.resume,sequence:initialSequence,states:[],chunks:true});for(let i=0;i<snapshot.length;i+=64)await flush({type:'snapshot',states:snapshot.slice(i,i+64)});await flush({type:'welcomeEnd',sequence:initialSequence});peer.ready=true;if(peer.pending.size)send(ws,{type:'state',sequence,states:[...peer.pending.values()]});peer.pending.clear();for(const packet of peer.rpc)send(ws,packet);peer.rpc=[];})().catch(()=>ws.close(1013,'snapshot closed'));
   ws.on('close',()=>{if(peer.socket===ws){peer.socket=null;peer.until=Date.now()+15000;}});
   ws.on('message',(bytes,binary)=>{try{
    const now=Date.now();if(now-peer.window>=1000){peer.window=now;peer.messages=0;}if(!peer.ready||binary||++peer.messages>240)throw Error('요청 예산 초과');const packet=JSON.parse(bytes.toString());
    if(packet.type==='state'){
     if(!Array.isArray(packet.rows)||packet.rows.length>actorBudget||packet.rows.some(r=>!validReplica(r))||new Set(packet.rows.map(r=>r.id)).size!==packet.rows.length)throw Error('상태 형식 오류');
     for(const row of packet.rows){const old=states.get(row.id);if(!peer.authority&&(!old||old.owner!==peer.id||row.owner!==old.owner||Object.keys(row).some(k=>!Object.hasOwn(old,k))||Object.keys(row.properties||{}).some(k=>!Object.hasOwn(old.properties||{},k))))throw Error('오브젝트 소유권·속성 오류');}
     const added=packet.rows.filter(r=>!states.has(r.id)).length,nextSizes=packet.rows.map(r=>[r.id,Buffer.byteLength(JSON.stringify(r))]),nextBytes=nextSizes.reduce((n,[id,size])=>n+size-(sizes.get(id)||0),stateBytes);if(states.size+added>actorBudget||nextBytes>stateBudgetBytes)throw Error('오브젝트·메모리 예산 초과');for(const [id,size] of nextSizes)sizes.set(id,size);stateBytes=nextBytes;for(const row of packet.rows)states.set(row.id,row);broadcast({type:'state',sequence:++sequence,states:packet.rows});
    }else if(packet.type==='rpc'){
     if(!validNetworkRPC(packet)||!states.has(packet.target)||!peer.authority&&(packet.multicast||states.get(packet.target).owner!==peer.id))throw Error('RPC 대상·권한 오류');const value={...packet,sender:peer.id,sequence:++sequence};if(packet.multicast)broadcast(value);else for(const p of peers.values())if(p.authority&&p.socket)send(p.socket,value);
    }else throw Error('요청 종류 오류');
   }catch{ws.close(1008,'invalid message');}});
  });
 }catch{socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');}});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,host,resolve);});
 return {url:'ws://'+(host.includes(':')?'['+host+']':host)+':'+server.address().port+'/hb-network',hostKey,clientKey,inspect:()=>({peers:[...peers.values()].filter(p=>p.socket).length,actors:states.size,stateBytes,stateBudgetBytes,sequence}),close:async()=>{for(const ws of wss.clients)ws.terminate();wss.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const server=await startMultiplayerServer({port:Number(process.env.HB_NETWORK_PORT||0),host:process.env.HB_NETWORK_HOST||'127.0.0.1',...(process.env.HB_NETWORK_HOST_KEY?{hostKey:process.env.HB_NETWORK_HOST_KEY}:{}),...(process.env.HB_NETWORK_CLIENT_KEY?{clientKey:process.env.HB_NETWORK_CLIENT_KEY}:{})});console.log(JSON.stringify({url:server.url,hostKey:server.hostKey,clientKey:server.clientKey}));for(const event of ['SIGINT','SIGTERM'])process.on(event,async()=>{await server.close();process.exit(0);});}
