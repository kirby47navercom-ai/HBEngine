import assert from 'node:assert/strict';
import http from 'node:http';
import WebSocket from 'ws';
import {attachNativeChannel} from './native-channel.mjs';
import {createNativeChannel} from '../prototype/native-channel.js';
import {moduleClosure} from './build-game.mjs';

const server=http.createServer(),calls=[],sockets=[];let base,generation=1,fallbacks=0,release;
const channel=attachNativeChannel(server,{origin:()=>base,scope:()=>{const epoch=generation;return async data=>{if(epoch!==generation)throw Error('project changed');calls.push(data.request);if(data.request.slow)await new Promise(r=>release=r);if(data.request.drop)channel.close();if(data.request.fail)throw Error('user function failure');return {value:data.request.value};};}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;
const host={location:{href:base},setTimeout,clearTimeout,WebSocket:class extends WebSocket{constructor(url){super(url,{origin:base});sockets.push(this);}}};
const fallback=async()=>{fallbacks++;return 'fallback';},send=createNativeChannel(channel.descriptor,fallback,host),packet=value=>({token:'compiled',request:{value}});
async function rejected(options,path=channel.descriptor.path){const ws=new WebSocket(base.replace('http:','ws:')+path,options);ws.on('error',()=>{});await new Promise(r=>ws.once('close',r));}
try{
  assert.deepEqual(await Promise.all([send(packet(1)),send(packet(2))]),[{value:1},{value:2}]);assert.equal(fallbacks,0);
  await assert.rejects(send({token:'compiled',request:{fail:true}}),/user function failure/);assert.equal(calls.length,3,'business errors never retry side effects');
  await rejected({origin:'https://foreign.invalid'});await rejected({origin:base},'/api/native/channel?token=wrong');assert.equal(calls.length,3,'origin and capability failures never reach C++');
  generation++;await assert.rejects(send(packet(4)),/project changed/);assert.equal(calls.length,3);
  sockets[0].close();await new Promise(r=>sockets[0].once('close',r));
  const raw=new WebSocket(base.replace('http:','ws:')+channel.descriptor.path,{origin:base});raw.on('error',()=>{});await new Promise(r=>raw.once('open',r));raw.send(JSON.stringify({id:1,token:'compiled',request:{slow:true}}));while(!release)await new Promise(r=>setTimeout(r,1));raw.send(JSON.stringify({id:1,token:'compiled',request:{value:9}}));const closed=await new Promise(r=>raw.once('close',code=>r(code)));assert.equal(closed,1008);release();assert.equal(calls.length,4,'duplicate in-flight IDs close the channel before another function runs');
  const reconnect=createNativeChannel(channel.descriptor,fallback,host);await assert.rejects(reconnect({token:'compiled',request:{drop:true}}),/종료/);assert.equal(calls.length,5);assert.equal(fallbacks,0,'lost replies never retry a committed call over HTTP');
  assert.equal(await createNativeChannel(null,fallback,host)(packet(7)),'fallback','legacy and mobile backends retain HTTP/platform routing');
  const files=await moduleClosure('tools/player-server.mjs');for(const name of ['node_modules/ws/package.json','node_modules/ws/index.js','node_modules/ws/lib/websocket-server.js','node_modules/ws/LICENSE'])assert.ok([...files].some(p=>p.replaceAll('\\','/').endsWith(name)),name+' is included in game packages');
  console.log('Native channel: real persistent socket, order, project scope, origin/capability, duplicate rejection, no side-effect retry, legacy fallback and packaged runtime passed');
}finally{for(const ws of sockets)ws.terminate();channel.close();await new Promise(r=>server.close(r));}
