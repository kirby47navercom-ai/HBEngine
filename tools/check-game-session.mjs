import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {NativeHost} from './native-host.mjs';
import {createPersistentQueries} from '../prototype/runtime-storage.js';
import {RuntimeGame,validGameJson,applyTravelSpawn} from '../prototype/runtime-game.js';
import {NativeWorldClient} from '../prototype/native-transport.js';
import {sceneWorldPosition} from '../prototype/scene-runtime.js';
import {createAsset} from '../prototype/asset-documents.js';
import {preparePlayWorld} from '../prototype/play-world.js';
const out=await fs.mkdtemp(path.resolve('native/build/game-session-')),saved=new Map(),record=[];
assert.ok(validGameJson({한글:'저장',array:[1,false,null]}));assert.equal(validGameJson(JSON.parse('{"__proto__":1}')),false);assert.equal(validGameJson({x:Infinity}),false);
const header=`#include <HBEngine/Game.hpp>
HB_CLASS(Blueprintable) class Session : public hb::GameInstance {
public:
 HB_PROPERTY(BlueprintReadWrite) int InitCount = 0;
 void Init() override;
 void Shutdown() override;
 HB_FUNCTION(BlueprintCallable) int Step();
private: int calls=0;
};`;
const source=`#include "Session.h"
void Session::Init(){InitCount++;state["initializations"]=InitCount;}
void Session::Shutdown(){hb::Save::Write("shutdown",{{"called",true}});}
int Session::Step(){if(hb::Game::GetInstance()!=this)throw std::runtime_error("singleton pointer");calls++;state["calls"]=calls;hb::Save::Write("progress",{{"debt",9800-calls},{"한글","황금"}});auto json=hb::Save::Read("progress");return json.at("debt");}`;
let host=new NativeHost(),build,session={id:randomUUID(),actor:'gi',state:{},arguments:{door:'아래'}};
const object={id:'gi',name:'Session',kind:'empty',group:'GAMEPLAY',frameworkRole:'gameInstance',position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],visible:false,nativeClass:'Session',nativeProperties:{InitCount:0}};
const configure=()=>host.persistentQueries=createPersistentQueries({readAsset:async()=>({value:1}),readSave:async slot=>saved.get(slot)??null,writeSave:async(slot,value)=>{saved.set(slot,value);await fs.writeFile(path.join(out,slot+'.json'),value);},deleteSave:async slot=>{saved.delete(slot);await fs.rm(path.join(out,slot+'.json'),{force:true});}});
const client=new NativeWorldClient();const call=async packet=>{const result=await client.call({objects:[structuredClone(object)],gameSession:structuredClone(session),...packet},build.metadata,request=>host.call(build.token,request));if(result.gameSession)session.state=result.gameSession.state;for(const o of result.objects||[])if(o.id==='gi')Object.assign(object,o);return result;};
try{
  configure();build=await host.build(header,source);
  await call({command:'reset',objects:[]});await call({command:'initialize',self:'gi'});assert.equal(session.state.initializations,1);
  let result=await call({key:'nativeCall',nativeId:'Session.Step',self:'gi',args:{target:'gi'}});assert.equal(result.outputs.result,9799);
  await call({command:'reset',objects:[]});await call({command:'initialize',self:'gi'});result=await call({key:'nativeCall',nativeId:'Session.Step',self:'gi',args:{target:'gi'}});assert.equal(result.outputs.result,9798);assert.equal(object.nativeProperties.InitCount,1);assert.equal(session.state.calls,2);record.push('C++ singleton, Init once, private members and JSON survive scene reset');
  const previous=session.id;session={id:randomUUID(),actor:null,state:{},arguments:{}};await call({command:'reset',objects:[]});assert.notEqual(session.id,previous);assert.equal(JSON.parse(saved.get('shutdown')).called,true);record.push('Stop destroys GameInstance and calls Shutdown');
  host.close();host=new NativeHost();configure();build=await host.build(header,source);assert.equal(JSON.parse(await host.persistentQueries('saveJsonRead',{slot:'progress'})).debt,9798);assert.equal(JSON.parse(await fs.readFile(path.join(out,'progress.json'),'utf8')).한글,'황금');await host.persistentQueries('saveJsonDelete',{slot:'progress'});assert.equal(await host.persistentQueries('saveJsonRead',{slot:'progress'}),'null');await assert.rejects(()=>host.persistentQueries('saveJsonWrite',{slot:'../bad',json:'{}'}));record.push('Persistent JSON Unicode, new host, Delete and path validation');
  const game=new RuntimeGame(),root=createAsset('blueprint','BP_Session','GameInstance'),assets=new Map([['Assets/BP_Session.hbblueprint.json',root]]),prepare=objects=>preparePlayWorld(objects,{dimension:'2d'},{game,gameInstance:'Assets/BP_Session.hbblueprint.json',readAsset:async p=>structuredClone(assets.get(p)),readText:async()=>'',buildNative:async()=>{throw Error('unexpected native build');}});let world=await prepare([]);game.initialized=true;game.instance.position=[4,5,6];game.setState({money:100});world=await prepare([]);assert.ok(world.bindings.find(b=>b.self===game.instance.id).retained);assert.deepEqual(game.instance.position,[4,5,6]);assert.equal(game.state.money,100);game.reset();assert.equal(game.instance,null);record.push('Blueprint instance identity, retained binding and explicit Reset');
  const base={kind:'empty',scale:[1,1,1],rotation:[0,0,0],visible:true},objects=[{...base,id:'startParent',position:[10,0,0],rotation:[0,0,90]},{...base,id:'pawnParent',position:[0,5,0]},{...base,id:'DoorBottom',kind:'playerStart',parent:'startParent',position:[2,0,0]},{...base,id:'pawn',parent:'pawnParent',position:[0,0,0]}];applyTravelSpawn(objects,{pawn:'pawn'},{spawn:'DoorBottom'});assert.deepEqual(sceneWorldPosition(objects[3],objects).map(v=>Math.round(v)),[10,2,0]);assert.equal(Math.round(objects[3].rotation[2]),90);assert.throws(()=>applyTravelSpawn(objects,{pawn:'pawn'},{spawn:'Missing'}));record.push('PlayerStart world position/rotation, parented pawn and missing start');
  await fs.writeFile(path.join(out,'acceptance.json'),JSON.stringify({passed:true,checks:record},null,2));console.log(JSON.stringify({out,passed:record.length}));
}finally{host.close();}
