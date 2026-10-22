import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import WebSocket from 'ws';
import {createAsset} from '../prototype/asset-documents.js';
import {makeNode} from '../prototype/blueprint-model.js';
import {makeSceneComponent} from '../prototype/scene-components.js';
import {createProject} from './project-manifest.mjs';
import {editorWindowProbe} from './editor-window-probe.mjs';
import {activeInstalledVersions} from './install-editor.mjs';
import {startMultiplayerServer} from './multiplayer-server.mjs';
import {retainTestEvidence,pruneTestArtifacts} from './test-artifacts.mjs';

assert.deepEqual(await activeInstalledVersions('C:/Users/kirby/HBEngine'),[]);
const work=await fs.mkdtemp(path.resolve('native/build/network-replacement-1645-window-'));retainTestEvidence(work);
const at=process.argv.indexOf('--executable'),executable=at<0?null:path.resolve(process.argv[at+1]),installed=executable?path.dirname(executable):null;
let probe,server,host;
try{
 server=await startMultiplayerServer();host=new WebSocket(server.url+'?role=host&key='+encodeURIComponent(server.hostKey));
 await new Promise((resolve,reject)=>{host.on('message',wire=>{if(JSON.parse(wire).type==='welcomeEnd')resolve();});host.once('error',reject);});
 const record=await createProject('NetworkReplacement1645',work,'2d'),remotePath='Assets/BP_Remote.hbblueprint.json',bp=createAsset('blueprint','BP_Network'),remote=createAsset('blueprint','BP_Remote');
 const graph=(asset,rows)=>{asset.nodes=rows.map(([key,inputValues],i)=>({...makeNode(key,40+i*240,40),id:'N'+i,inputValues}));asset.edges=asset.nodes.slice(1).map((n,i)=>({from:{node:asset.nodes[i].id,pin:'then'},to:{node:n.id,pin:'exec'}}));asset.construction={nodes:[],edges:[],comments:[]};};
 graph(bp,[['beginPlay',{}],['netConnect',{endpoint:server.url,accessKey:server.clientKey,authority:false}],['print',{message:'SESSION_READY'}]]);
 remote.components=[makeSceneComponent('NetworkReplica',{interpolation:0})];graph(remote,[['beginPlay',{}],['print',{message:'REMOTE_READY'}]]);
 const otherPath='Assets/BP_RemoteB.hbblueprint.json',other=structuredClone(remote);other.name='BP_RemoteB';graph(other,[['beginPlay',{}],['print',{message:'REMOTE_B_READY'}]]);const end=makeNode('endPlay'),ended=makeNode('print');ended.inputValues={message:'REMOTE_A_ENDED'};remote.nodes.push(end,ended);remote.edges.push({from:{node:end.id,pin:'then'},to:{node:ended.id,pin:'exec'}});await record.project.write(otherPath,JSON.stringify(other));await record.project.write(record.manifest.startupBlueprint,JSON.stringify(bp));await record.project.write(remotePath,JSON.stringify(remote));
 const scene=JSON.parse(await fs.readFile(path.join(record.root,record.manifest.startupScene),'utf8'));scene.objects=[{id:'Director',name:'Director',kind:'empty',visible:true,position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],components:[],blueprintAsset:record.manifest.startupBlueprint}];await record.project.write(record.manifest.startupScene,JSON.stringify(scene));
 probe=await editorWindowProbe({work,project:record.file,...executable?{executable}:{}});await probe.call('runtime.play');await probe.until(async()=>(await probe.call('runtime.network')).status==='connected','network connected');
 const row={id:'Remote',owner:'host',position:[5,3,0],rotation:[0,0,0],scale:[1,1,1],spawn:{asset:remotePath,root:'Remote',local:'root'}};
 host.send(JSON.stringify({type:'state',rows:[row]}));await probe.until(async()=>(await probe.call('runtime.network',{kind:'replicas'})).items.some(r=>r.object==='Remote'),'remote instantiated');
 const first=await probe.call('runtime.network',{kind:'replicas',query:'Remote',limit:1});assert.equal(first.items.length,1);assert.equal(first.items[0].root,'Remote');assert(first.readOnly);assert(!JSON.stringify(first).includes(server.clientKey));
 let state=await probe.call('runtime.state');assert.deepEqual(state.objects.find(o=>o.id==='Remote').position,[5,3,0]);assert.equal(state.logs.filter(l=>l.message==='REMOTE_READY').length,1);
 host.send(JSON.stringify({type:'state',rows:[{...row,position:[7,6,0],spawn:{...row.spawn,asset:otherPath}}]}));await probe.until(async()=>{const v=await probe.call('runtime.state');return v.logs.filter(l=>l.message==='REMOTE_B_READY').length===1;},'loaded asset replaced');state=await probe.call('runtime.state');assert.deepEqual(state.objects.find(o=>o.id==='Remote').position,[7,6,0]);assert.equal(state.logs.filter(l=>l.message==='REMOTE_A_ENDED').length,1);const swapped=await probe.call('runtime.network',{kind:'replicas'});assert.equal(swapped.items.find(r=>r.id==='Remote').asset,otherPath);assert.equal(swapped.items.find(r=>r.id==='Remote').localMatchesSource,true);host.send(JSON.stringify({type:'destroy',ids:['Remote']}));await probe.until(async()=>!(await probe.call('runtime.state')).objects.some(o=>o.id==='Remote'),'remote destroyed');assert.equal((await probe.call('runtime.network',{kind:'replicas'})).count,0);
 host.send(JSON.stringify({type:'state',rows:[{...row,position:[9,4,0],spawn:{...row.spawn,asset:otherPath}}]}));await probe.until(async()=>(await probe.call('runtime.state')).logs.filter(l=>l.message==='REMOTE_B_READY').length===2,'same ID respawned');
 state=await probe.call('runtime.state');assert.deepEqual(state.objects.find(o=>o.id==='Remote').position,[9,4,0]);const summary=await probe.call('runtime.network');assert.equal(summary.status,'connected');assert.equal(summary.replicas,1);
 await probe.call('runtime.stop');await probe.capture('network-remote-2d.png');const exit=await probe.finish();probe=null;assert.equal(exit.code,0);
 const result={passed:true,work,installedDirectory:installed,actualEditor:true,mode:'2d',actualWebSockets:true,spawnDestroyRespawn:true,loadedAssetReplacement:true,endOldCount:1,newBeginCount:2,sameIdPlacement:[9,4,0],beginPlayCount:3,pagedRuntimeNetwork:first,summary,exit,scope:'Owned hidden actual 2D editor with local ws host, Blueprint netConnect and prefab BeginPlay, public runtime.network summary/page/query, loaded A→B asset replacement, exact A EndPlay/B BeginPlay and B destroy/same-ID respawn. Isolated project/profile; no native renderer/phone/internet-loss/prediction claim.'};await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({passed:true,work,installed,spawnDestroyRespawn:true}));
}catch(error){await fs.writeFile(path.join(work,'failure.json'),JSON.stringify({passed:false,error:error.message,diagnostics:await probe?.diagnostics()},null,2));console.error(JSON.stringify({passed:false,work,error:error.message.slice(-1500)}));process.exitCode=1;
}finally{await probe?.stop();host?.terminate();await server?.close();await pruneTestArtifacts(work);}
