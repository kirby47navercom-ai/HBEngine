import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {NativeHost} from './native-host.mjs';
import {startPlayerServer} from './player-server.mjs';
import {engineSchema} from './editor-automation.mjs';
import {createProject} from './project-manifest.mjs';

const host=new NativeHost(),build=host.registerBinary('private-binary-path',{classes:[]}),session=host.sessions.get(build.token);
const world=[{id:'private-actor',position:[0,0,0]}],context={templates:{privateTemplate:{objects:[...world,...world,...world]}},aliases:{}};
session.requestWorld=session.transportWorld=world;session.spawnContexts=new Map([['private-prefix-1',context],['private-prefix-2',context]]);
const state=host.inspectResources();assert.equal(state.pid,process.pid);for(const value of Object.values(state.memory))assert.ok(Number.isSafeInteger(value)&&value>=0);
assert.deepEqual(state.modules,[{module:0,workerPid:null,busy:false,requestObjects:1,transportObjects:1,sharedWorld:true,spawnContexts:2,uniqueSpawnContexts:1,spawnTemplates:2,spawnObjects:6}]);
const wire=JSON.stringify(state);assert.ok(!wire.includes(build.token));assert.ok(!wire.includes('private-'));state.modules[0].spawnContexts=900;assert.equal(host.inspectResources().modules[0].spawnContexts,2);
session.requestWorld=null;assert.equal(host.inspectResources().modules[0].sharedWorld,false);host.close();assert.deepEqual(host.inspectResources().modules,[]);
assert.equal(engineSchema().nativeResources.route,'GET /api/native/inspect');

const root=await fs.mkdtemp(path.join(path.resolve(import.meta.dirname,'../native/build'),'native-resources-')),entries=[];
for(const [name,data] of [['Content/Assets/Test.hbscene.json','{}'],['Binaries/test-worker','not executed']]){
  const file=path.join(root,name),bytes=Buffer.from(data);await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,bytes);entries.push({path:name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
}
const manifest={version:1,id:randomUUID(),name:'Private resources check',startupScene:'Assets/Test.hbscene.json',entries:[{path:'Assets/Test.hbscene.json',kind:'scene'}],files:entries,nativeModules:[{signature:'test',binary:'Binaries/test-worker',metadata:{classes:[]}}]};
const smoke=process.env.HB_PLAYER_SMOKE;delete process.env.HB_PLAYER_SMOKE;
try{
  for(const configuration of ['development','release','smoke']){
    manifest.configuration=configuration==='smoke'?'release':configuration;if(configuration==='smoke')process.env.HB_PLAYER_SMOKE='1';
    await fs.writeFile(path.join(root,'game.hbpack.json'),JSON.stringify(manifest));const server=await startPlayerServer({root,userData:path.join(root,'UserData',configuration)}),base='http://127.0.0.1:'+server.port;
    try{
      const response=await fetch(base+'/api/native/inspect');assert.equal(response.status,configuration==='release'?404:200);assert.equal(response.headers.get('Cache-Control'),'no-store');
      if(response.ok){const data=await response.json();assert.equal(data.modules.length,1);assert.equal(data.modules[0].workerPid,null);assert.ok(!JSON.stringify(data).includes('test-worker'));}
      assert.equal((await fetch(base+'/api/native/inspect',{headers:{Origin:'https://example.com'}})).status,403);
      assert.equal((await fetch(base+'/api/native/inspect',{method:'POST',headers:{'X-HB-Editor':'1'},body:'{}'})).status,404);
    }finally{await server.close();}
    await assert.rejects(fetch(base+'/api/native/inspect',{signal:AbortSignal.timeout(1000)}));
  }
}finally{if(smoke===undefined)delete process.env.HB_PLAYER_SMOKE;else process.env.HB_PLAYER_SMOKE=smoke;}
const project=await createProject('Private diagnostics',path.join(root,'Editor'),'2d'),ready=path.join(root,'editor-ready.json');
const child=spawn(process.execPath,['tools/serve.mjs'],{cwd:path.resolve(import.meta.dirname,'..'),windowsHide:true,stdio:'pipe',env:{...process.env,PORT:'0',HB_DESKTOP:'1',HB_PROJECT_FILE:project.file,HB_USER_DATA_DIR:path.join(root,'EditorUser'),HB_READY_FILE:ready}});
let ended,output='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);const exit=new Promise(resolve=>child.once('exit',()=>{ended=true;resolve();}));
try{
  let address;const deadline=Date.now()+15000;while(!address&&Date.now()<deadline){if(ended)throw Error(output);address=await fs.readFile(ready,'utf8').then(JSON.parse).catch(()=>null);if(!address)await new Promise(r=>setTimeout(r,50));}assert.ok(address,output);
  const base='http://127.0.0.1:'+address.port,response=await fetch(base+'/api/native/inspect'),data=await response.json();assert.equal(response.status,200);assert.equal(data.pid,child.pid);assert.deepEqual(data.modules,[]);
  assert.equal((await(await fetch(base+'/api/schema')).json()).nativeResources.route,'GET /api/native/inspect');assert.equal((await fetch(base+'/api/native/inspect',{headers:{Origin:'https://example.com'}})).status,403);
}finally{if(!ended)child.kill();await exit;}
await fs.writeFile(path.join(root,'acceptance.json'),JSON.stringify({passed:true,hostLifecycle:true,privateDataOmitted:true,readOnly:true,developmentAndSmokeOnly:true,editorRouteAndSchema:true,originGuard:true,serverClosed:true},null,2));
console.log('C++ 호스트 메모리·참조 진단/수명·민감 데이터 제외·배포/출처 경계 PASS: '+root);
