import fs from 'node:fs/promises';import path from 'node:path';import {createProject} from './project-manifest.mjs';import {createAsset} from '../prototype/asset-documents.js';import {parseNativeHeader} from '../prototype/native-model.js';import {createGameplayAsset,makeSequenceTrack} from '../prototype/gameplay-assets.js';import {makeSceneComponent} from '../prototype/scene-components.js';
export async function sequenceReferenceFixture(work){
 const record=await createProject('SequenceReferences2012',work,'3d'),header=`#include <HBEngine/Game.hpp>
HB_CLASS(Blueprintable) class StateRestoreProbe:public hb::Actor{public:
 HB_PROPERTY(BlueprintReadWrite) hb::Actor* Focus=nullptr;
 HB_PROPERTY(BlueprintReadOnly) bool HasFocus=false;
 HB_PROPERTY(BlueprintReadOnly) bool MatchesOld=false;
 HB_FUNCTION(BlueprintCallable) void Init(); HB_FUNCTION(BlueprintCallable) void Read();
 HB_FUNCTION(BlueprintCallable) void Play(const std::string& asset); HB_FUNCTION(BlueprintCallable) void Seek(float time); HB_FUNCTION(BlueprintCallable) void Stop();
 HB_FUNCTION(BlueprintCallable) void RemoveOld(); HB_FUNCTION(BlueprintCallable) void RecreateOld();
};`,source=`void StateRestoreProbe::Init(){Focus=hb::Scene::FindActorById("Old");}
void StateRestoreProbe::Read(){HasFocus=Focus!=nullptr;MatchesOld=Focus&&Focus==hb::Scene::FindActorById("Old");}
void StateRestoreProbe::Play(const std::string& asset){hb::LevelSequence::Play(this,asset);hb::LevelSequence::Pause(this,true);}
void StateRestoreProbe::Seek(float time){hb::LevelSequence::Seek(this,time);}void StateRestoreProbe::Stop(){hb::LevelSequence::Stop(this);}
void StateRestoreProbe::RemoveOld(){hb::Scene::Destroy(hb::Scene::FindActorById("Old"));}
void StateRestoreProbe::RecreateOld(){hb::Scene::Spawn("Assets/BP_Replacement.hbblueprint.json",{},"Old");}`,
 bp=createAsset('blueprint','StateRestoreProbe');bp.settings.parentClass='StateRestoreProbe';bp.native={...parseNativeHeader(header),header,source,headerPath:'Source/StateRestoreProbe.h',sourcePath:'Source/StateRestoreProbe.cpp'};bp.variables=[{id:'focus',name:'Focus',type:'object',container:'single',value:'Old'}];bp.components=[makeSceneComponent('Camera',{followTarget:'Old',fieldOfView:50},'Cam')];bp.nodes=[];bp.edges=[];
 const replacement=createAsset('blueprint','BP_Replacement');replacement.nodes=[];replacement.edges=[];replacement.components=[];
 await record.project.write(bp.native.headerPath,header);await record.project.write(bp.native.sourcePath,source);await record.project.write(record.manifest.startupBlueprint,JSON.stringify(bp));await record.project.write('Assets/BP_Replacement.hbblueprint.json',JSON.stringify(replacement));
 const low='Assets/LS_Low.hbsequence.json',high='Assets/LS_High.hbsequence.json';for(const [file,id,x]of [[low,'Old',10],[high,'Next',90]]){
  const data=createGameplayAsset('sequenceasset',file===low?'Low':'High'),track=(type,value,extra={})=>({...makeSequenceTrack(type),target:'Target',...extra,keys:[{time:0,value}]});data.length=5;data.tracks=[track('variable',id,{variable:'focus',valueType:'object',array:false}),track('nativeProperty',id,{className:'StateRestoreProbe',property:'Focus',valueType:'object',array:false}),track('component',id,{component:'Cam',componentType:'Camera',property:'followTarget'}),track('position',[x,0,0])];await record.project.write(file,JSON.stringify(data));
 }
 const scene=JSON.parse(await fs.readFile(path.join(record.root,record.manifest.startupScene),'utf8'));scene.objects=['Director','Upper','Target','Old','Next'].map(id=>({id,name:id,kind:'empty',visible:true,position:id==='Target'?[3,0,0]:[0,0,0],rotation:[0,0,0],scale:[1,1,1],components:[],...['Director','Upper','Target'].includes(id)?{blueprintAsset:record.manifest.startupBlueprint}:{}}));await record.project.write(record.manifest.startupScene,JSON.stringify(scene));return {record,low,high};
}
