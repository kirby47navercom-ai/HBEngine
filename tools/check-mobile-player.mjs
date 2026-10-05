import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import readline from 'node:readline';
import {mobileSources} from './build-mobile.mjs';
import {runTool} from './mobile-android.mjs';
import {mobileBackend,platformBridge} from '../prototype/mobile-player.js';
import {createAsset} from '../prototype/asset-documents.js';
import {makeNode} from '../prototype/blueprint-model.js';
import {parseNativeHeader} from '../prototype/native-model.js';
import {createWidgetNode} from '../prototype/ui-assets.js';
import {componentDefaultValues,makeSceneComponent} from '../prototype/scene-components.js';
import {NativeWorldClient} from '../prototype/native-transport.js';
import {validBuildProfile,defaultBuildProfile} from '../prototype/build-profile.js';
import {createProject} from './project-manifest.mjs';
import {buildGame} from './build-game.mjs';

const root=path.resolve(import.meta.dirname,'..');await fs.mkdir(path.join(root,'native/build'),{recursive:true});const dir=await fs.mkdtemp(path.join(root,'native/build/mobile-player-'));
const header='#include <HBEngine/Game.hpp>\nHB_CLASS(Blueprintable) class MobileActor:public hb::Actor{public:HB_PROPERTY(BlueprintReadWrite) int Count=0;HB_FUNCTION(BlueprintCallable) int Start();HB_FUNCTION(BlueprintPure) std::string Greeting();HB_FUNCTION(BlueprintPure) bool Hit();};';
const source='int MobileActor::Start(){Count++;return Count;}std::string MobileActor::Greeting(){return "주인님 안녕하세요";}bool MobileActor::Hit(){return hb::Physics::Raycast({0,3,0},{0,-3,0},2,-1,false,this).hit;}';
const modules=new Map();for(const code of [source,source.replace('Count++','Count+=10')])modules.set(createHash('sha256').update(JSON.stringify([header,code])).digest('hex'),{header,source:code});
const native=await mobileSources(modules,dir);
const main='#include "Modules.hpp"\n#include <iostream>\n#include <nlohmann/json.hpp>\nint main(){std::string line;while(std::getline(std::cin,line)){auto request=nlohmann::json::parse(line);try{auto query=[](const std::string& packet){std::cout<<"QUERY\\t"<<packet<<std::endl;std::string reply;std::getline(std::cin,reply);return reply;};auto result=HB_mobileInvoke(request.at("module").get<int>(),request.at("request").dump(),query);std::cout<<"RESULT\\t"<<result<<std::endl;}catch(const std::exception& e){std::cout<<"RESULT\\t"<<nlohmann::json{{"ok",false},{"error",e.what()}}.dump()<<std::endl;}}}';
await fs.writeFile(path.join(dir,'test.cpp'),main);const compiler=process.env.CXX||(process.platform==='win32'?'C:/msys64/ucrt64/bin/g++.exe':'c++'),env={...process.env,PATH:path.dirname(compiler)+path.delimiter+process.env.PATH},binary=path.join(dir,'mobile-worker.exe');
await runTool(compiler,['-std=c++17','-O0','-I',path.join(dir,'Native'),'-I',path.join(dir,'Native/include'),...native.sources,path.join(dir,'test.cpp'),'-o',path.relative(root,binary)],{cwd:root,env});
const child=spawn(binary,[],{env,windowsHide:true,stdio:['pipe','pipe','pipe']}),lines=readline.createInterface({input:child.stdout});let active,output='';child.stderr.on('data',data=>{output+=data;});
lines.on('line',async line=>{if(line.startsWith('QUERY\t')){try{const value=await active.query(JSON.parse(line.slice(6)));child.stdin.write(JSON.stringify({ok:true,value})+'\n');}catch(error){child.stdin.write(JSON.stringify({ok:false,error:error.message})+'\n');}return;}const start=line.indexOf('RESULT\t');if(start>=0){const pending=active;active=null;pending.resolve(JSON.parse(line.slice(start+7)));}});
const saved={version:1,items:{'hbengine.savegame.old.project.older-project':'이전 게임'}},reads=[],manifest={version:1,id:crypto.randomUUID(),name:'모바일 검증',configuration:'development',startupScene:'Assets/Scene.hbscene.json',startupBlueprint:'Assets/BP.hbblueprint.json',width:1280,height:720,entries:[{path:'Assets/Scene.hbscene.json'},{path:'Assets/새 이름.svg'}],redirects:{'Assets/Old.svg':'Assets/새 이름.svg'},nativeModules:native.modules};
const backend=mobileBackend(manifest,{read:async name=>{reads.push(name);return new Response('SVG');},request:async(operation,data,query)=>{
  if(operation==='storageRead')return structuredClone(saved);if(operation==='storageWrite'){for(const [key,value] of Object.entries(data))value===null?delete saved.items[key]:saved.items[key]=value;return structuredClone(saved);}if(operation==='native')return new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('portable C++ timeout '+output)),10000);active={query,resolve:value=>{clearTimeout(timeout);resolve(value);}};child.stdin.write(JSON.stringify(data)+'\n');});if(operation==='report')return {ok:true};throw Error(operation);
}});
const post=async(url,data)=>{const result=await backend(url,{method:'POST',body:JSON.stringify(data)});const value=await result.json();if(!result.ok)throw Error(value.error);return value;};
try{
  assert.equal((await (await backend('/api/session')).json()).player,true);assert.equal((await (await backend('/api/player')).json()).mobile,true);
  assert.equal((await backend('/api/file?path=Assets%2FOld.svg')).status,200);assert.deepEqual(reads,['Content/Assets/새 이름.svg']);assert.equal((await backend('/api/file?path=../secret')).status,400);
  const key='hbengine.savegame.slot.project.'+manifest.id;
  assert.equal((await backend('/api/storage',{method:'PUT',body:JSON.stringify({id:manifest.id,items:{[key]:'한글 저장'}})})).status,200);assert.equal(saved.items[key],'한글 저장');const loaded=await(await backend('/api/storage?project='+manifest.id)).json();assert.equal(loaded.items['hbengine.savegame.old.project.older-project'],undefined);assert.equal(saved.items['hbengine.savegame.old.project.older-project'],'이전 게임');assert.equal((await backend('/api/storage',{method:'PUT',body:JSON.stringify({id:manifest.id,items:{other:'금지'}})})).status,400);assert.equal(saved.items[key],'한글 저장');
  const builds=[];for(const module of native.modules)builds.push(await post('/api/native/build',{header:module.header,source:module.source}));await assert.rejects(post('/api/native/build',{header,source:'unregistered'}),/등록/);
  const objects=[{id:'player',nativeClass:'MobileActor',nativeProperties:{Count:0},position:[4,2,0],rotation:[0,0,0],scale:[1,1,1]},{id:'ground',position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],components:[{id:'box',type:'BoxCollider2D',properties:{...componentDefaultValues('BoxCollider2D'),extent:[1,.5,.5]}}]}],clients=builds.map(()=>new NativeWorldClient());
  const call=(index,name,args={target:'player'})=>clients[index].call({key:'nativeCall',nativeId:'MobileActor.'+name,self:'player',objects,args},builds[index].metadata,request=>post('/api/native/call',{token:builds[index].token,request}));
  const first=await call(0,'Start');assert.equal(first.outputs.result,1);assert.deepEqual(first.objects[0].position,[4,2,0]);assert.equal(first.objects[0].nativeProperties.Count,1);
  assert.equal((await call(1,'Start')).outputs.result,10,'same C++ class names keep separate AOT state');const frame=await clients[0].call({command:'frame',delta:.016,clock:{scale:1,paused:false},objects},builds[0].metadata,request=>post('/api/native/call',{token:builds[0].token,request}));assert.equal(frame.clock.delta>.015,true);assert.deepEqual(frame.objects,[]);
  objects[0].nativeProperties.Count=1;objects[0].position[0]=5;
  assert.equal((await call(0,'Start')).outputs.result,2,'delta world is applied to the portable C++ module');assert.equal((await call(0,'Greeting')).outputs.result,'주인님 안녕하세요');assert.equal((await call(0,'Hit')).outputs.result,true,'C++ synchronous queries use the shared real Rapier 2D world');
  const invalid={key:'nativeCall',nativeId:'Unknown.Start',args:{},objects};await assert.rejects(post('/api/native/call',{token:builds[0].token,request:invalid}),/등록/);
  for(const [i,build] of builds.entries())await clients[i].call({command:'reset',objects:[]},build.metadata,request=>post('/api/native/call',{token:build.token,request}));assert.equal((await call(0,'Start')).outputs.result,2);
}finally{child.stdin.end();await new Promise(resolve=>{child.once('close',resolve);});lines.close();}
let outputBytes=0;const largeJSON=await runTool(process.execPath,['-e','process.stdout.write(JSON.stringify({text:"x".repeat(100000)}))'],{maxOutput:150000,onOutput:text=>{outputBytes+=text.length;}});assert.equal(JSON.parse(largeJSON).text.length,100000);assert.equal(outputBytes,largeJSON.length);
const timeoutStart=Date.now();await assert.rejects(runTool(process.execPath,['-e','process.on("SIGTERM",()=>{});setInterval(()=>{},100)'],{timeout:200}),/시간 초과/);assert.ok(Date.now()-timeoutStart<8000,'시간 초과 도구를 실제로 종료해야 해요.');
let posted,bridge=platformBridge(packet=>{posted=packet;}),job=bridge.request('native',{},async query=>query.x+1);await bridge.receive({id:posted.id,queryId:'q',query:{x:2}});assert.equal(posted.operation,'queryReply');assert.equal(posted.data.value,3);await bridge.receive({id:'1',data:{ok:true}});assert.deepEqual(await job,{ok:true});
const record=await createProject('모바일 출력',dir,'2d'),profile={...defaultBuildProfile(record.manifest),id:'ios',target:'ios'};
const scenePath=await record.project.resolve(record.manifest.startupScene),scene=JSON.parse(await fs.readFile(scenePath,'utf8'));
const widget=createAsset('widget','W_Mobile');widget.scaleMode='scale';widget.scaleRule='height';widget.safeArea=true;
const title=createWidgetNode('Text','title');title.name='Title';title.properties.text='초기값';title.properties.fontSize=28;title.slot.offset=[32,32,450,48];widget.nodes.push(title);
const health=createWidgetNode('ProgressBar','health');health.name='Health';health.slot.offset=[32,90,280,20];health.properties.value=.75;widget.nodes.push(health);
const image=createWidgetNode('Image','vector');image.name='Vector';image.slot.offset=[32,130,96,96];image.properties.texture='Assets/MobileVector.svg';widget.nodes.push(image);
for(const [type,id,right] of [['Joystick','Move',false],['TouchButton','Attack',true]]){const node=createWidgetNode(type,id);node.name=id;node.slot.anchors=[right?1:0,1,right?1:0,1];node.slot.offset=[right?-32:32,-32,right?112:220,right?112:220];node.slot.alignment=[right?1:0,1];widget.nodes.push(node);}
await record.project.write('Assets/W_Mobile.hbwidget.json',JSON.stringify(widget));
await record.project.write('Assets/MobileVector.svg','<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect x="2" y="2" width="92" height="92" rx="18" fill="#284e75" stroke="#c8edff" stroke-width="3"/><path d="M16 48L48 16L80 48L48 80Z" fill="#5dccad"/></svg>');
const sprite=createAsset('sprite','S_Mobile');sprite.texture='Assets/MobileVector.svg';sprite.pixelsPerUnit=96;await record.project.write('Assets/S_Mobile.hbsprite.json',JSON.stringify(sprite));
scene.objects.push({id:'mobile-sprite',name:'Mobile Sprite',kind:'sprite',visible:true,position:[0,0,0],rotation:[0,0,0],scale:[2,2,1],components:[makeSceneComponent('SpriteRenderer',{sprite:'Assets/S_Mobile.hbsprite.json'})]});
for(const [i,module] of native.modules.entries()){
  const code=i===0?module.source.replace('Count++;','Count++;hb::UI::SetText(this,"HUD","Title",Greeting());'):module.source;
  const bp=createAsset('blueprint','BP_Mobile'+i),headerPath='Source/Mobile'+i+'.h',sourcePath='Source/Mobile'+i+'.cpp',assetPath='Assets/BP_Mobile'+i+'.hbblueprint.json';
  bp.native={...parseNativeHeader(module.header),header:module.header,source:code,headerPath,sourcePath};bp.settings.parentClass='MobileActor';
  const call=makeNode('nativeCall');call.nativeId='MobileActor.Start';bp.nodes.push(call);bp.edges.push({from:{node:'beginPlay',pin:'then'},to:{node:call.id,pin:'exec'}});
  await record.project.write(headerPath,module.header);await record.project.write(sourcePath,code);await record.project.write(assetPath,JSON.stringify(bp));
  scene.objects.push({id:'mobile-probe-'+i,name:'Mobile Probe '+i,kind:'cube',visible:true,position:[i?2:-2,1,0],rotation:[0,0,0],scale:[1,1,1],blueprintAsset:assetPath,nativeClass:'MobileActor',nativeProperties:{Count:0},components:i===0?[makeSceneComponent('UIWidget',{asset:'Assets/W_Mobile.hbwidget.json',instance:'HUD'})]:[]});
}
await record.project.write(record.manifest.startupScene,JSON.stringify(scene));
assert.equal(validBuildProfile(profile),true);assert.equal(validBuildProfile({...profile,target:'unknown'}),false);assert.equal(validBuildProfile({...profile,mobile:{applicationId:'bad/escape'}}),false);assert.equal(validBuildProfile({...profile,mobile:{versionName:'dev'}}),false);assert.equal(validBuildProfile({...profile,mobile:{applicationId:'com.bad_id.game'}}),false);assert.equal(validBuildProfile({...profile,target:'android',mobile:{versionName:'dev'}}),true);
const exported=await buildGame(record,profile);assert.equal(exported.artifactType,'xcodeProject');assert.equal(exported.compileVerified,false);assert.equal(exported.launchVerified,false);
const packed=JSON.parse(await fs.readFile(path.join(exported.output,'Assets/game.hbpack.json'),'utf8'));assert.equal(packed.nativeModules.length,2);assert.equal(packed.entries.some(e=>e.kind==='scene'),true);assert.equal(packed.files.some(e=>e.path==='prototype/mobile-player.js'),true);assert.equal(packed.files.some(e=>e.path.includes('app.js')||e.path.includes('node.exe')||e.path.includes('serve.mjs')),false);
assert.match(await fs.readFile(path.join(exported.output,'HBGame.xcodeproj/project.pbxproj'),'utf8'),/PBXNativeTarget/);assert.equal((await fs.stat(path.join(exported.output,'Native/Main.mm'))).size>5000,true);
await fs.writeFile(path.join(dir,'acceptance.json'),JSON.stringify({ok:true,portableCpp:true,sharedPhysics:true,unicode:true,sourceIsolation:true,iosExport:exported,androidDeviceVerified:false,iosCompiled:false},null,2));
if(process.env.HB_MOBILE_PROOF_EXPORT)await fs.writeFile(process.env.HB_MOBILE_PROOF_EXPORT,JSON.stringify({output:exported.output,applicationId:exported.mobile.applicationId,acceptance:path.join(dir,'acceptance.json')},null,2));
console.log('모바일 공용 실행: 실제 C++ AOT 두 모듈·증분 월드·시작 위치·한글·Rapier 질의·검증·저장·응답 수명·iOS 프로젝트 출력 통과: '+dir);
