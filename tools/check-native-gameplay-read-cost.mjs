import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {activeInstalledVersions} from './install-editor.mjs';
import {retainTestEvidence} from './test-artifacts.mjs';

assert.deepEqual(await activeInstalledVersions(path.join(process.env.USERPROFILE,'HBEngine')),[]);
const roots=process.argv.slice(2,4).map(p=>path.resolve(p));assert.equal(roots.length,2);
const work=await fs.mkdtemp('native/build/gameplay-read-cost-');retainTestEvidence(work);
const header=`#include <HBEngine/Game.hpp>
HB_CLASS() class GameplayReadCost : public hb::Library { public:
 HB_FUNCTION(BlueprintPure) static std::string Inspect(hb::Actor* target);
 HB_FUNCTION(BlueprintPure) static std::string Defaults(hb::Actor* target);
 HB_FUNCTION(BlueprintPure) static std::string Errors(hb::Actor* target);
 HB_FUNCTION(BlueprintPure) static std::string Ambiguous(hb::Actor* target);
 HB_FUNCTION(BlueprintCallable) static bool Mutate(hb::Actor* target);
 HB_FUNCTION(BlueprintPure) static std::string Bench();
};`;
const debug={
 audioDucking:{mix:{music:.75}},audioMixers:{mix:{gain:.5}},
 behavior:{tasks:[{id:'node',name:'task',handle:'task1',result:'running'}]},
 blackboard:{flag:true,number:2.5,integer:7,text:'한글',vector:[1,2,3],object:'owner'},
 state:'Run',stateMachine:{active:[{id:'run',name:'Run'}],elapsed:1.5},
 animationGraph:{parameters:{speed:2.5,flag:true,integer:3,enum:2},curves:{curve:.4},rootMotion:{position:[1,2,3],rotation:[4,5,6]},retarget:[{node:'retarget',name:'retarget',scale:1.25,profile:'humanoid'}],ik:[{node:'ik',name:'ik',tip:[2,3,4],error:.25,effectors:[{id:'goal',error:.5}]}],machines:[{key:'machine-key',id:'machine',name:'Machine',stateName:'Run',nextName:'Jump',time:1.5,normalized:.25,transition:{progress:.3},states:[{id:'run',name:'Run',weight:.7}]}],syncGroups:[{name:'sync',leader:{id:'run'},phase:.6,method:'normalized'}]},
 morphs:[{name:'smile',mesh:'face',weight:.3}],spriteSkin:{bones:[{id:'root',name:'Root',position:[1,2],rotation:30,scale:[2,3]}],ik:{weight:.8,solvers:[{id:'arm',name:'Arm',target:[3,4],targetRotation:45,targetActor:'',weight:.7,enabled:true}]}},
 montage:{time:2},montageGroups:[{group:'upper',time:3,weight:.5}],animationBudget:{observedMS:.25,throttled:2},
 sequence:{weight:.6,blendMode:'additive',priority:2,time:3,clockSource:'external',secondsPerFrame:1/30,externalTime:4,externalTimeReady:true,frame:90,frameRateNumerator:30,frameRateDenominator:1},
 navigation:{status:'moving',path:[[1,2,3]],velocity:[2,0,0],preferred:[3,0,0]},perception:[{id:'owner',sensed:true}],particles:{backend:'cpu',count:25},ability:{attributes:{hp:{current:90}},abilities:{fire:{cooldown:2,active:true}},effects:[{handle:'effect1',asset:'buff',level:2}]},eqs:[{score:1}],eqsBatch:{results:[{score:2}]}
};
const reads=[
 'AudioMixer::GetDuckingGain(target,"mix","music")','AudioMixer::GetFloat(target,"mix","gain")',
 'AI::GetTaskHandle(target,"node")','AI::IsTaskAborting(target,"task1")','AI::IsTaskExecuting(target,"task1")',
 'Blackboard::GetBool(target,"flag")','Blackboard::GetFloat(target,"number")','Blackboard::GetInt(target,"integer")','Blackboard::GetString(target,"text")','Blackboard::GetVector(target,"vector")','bridgeId(hb::Blackboard::GetObject(target,"object"))',
 'States::GetState(target)','States::IsInState(target,"Run")','States::GetPath(target)','States::GetElapsed(target)',
 'AnimationGraph::GetRetargetScale(target,"retarget")','AnimationGraph::GetRetargetProfile(target,"retarget")','AnimationGraph::GetIKEffectorError(target,"ik","goal")','AnimationGraph::GetIKTipPosition(target,"ik")','AnimationGraph::GetIKError(target,"ik")','AnimationGraph::GetRootMotionPosition(target)','AnimationGraph::GetRootMotionRotation(target)',
 'Morphs::GetNames(target,"face")','Morphs::GetWeight(target,"smile","face")',
 'AnimationGraph::GetCurve(target,"curve")','AnimationGraph::GetFloat(target,"speed")','AnimationGraph::GetBool(target,"flag")','AnimationGraph::GetInteger(target,"integer")','AnimationGraph::GetEnum(target,"enum")',
 'AnimationGraph::GetState(target,"machine-key")','AnimationGraph::GetNextState(target,"machine")','AnimationGraph::GetStateTime(target,"Machine")','AnimationGraph::GetNormalizedTime(target,"machine")','AnimationGraph::GetStateWeight(target,"machine","Run")','AnimationGraph::IsTransitioning(target,"machine")','AnimationGraph::GetTransitionProgress(target,"machine")',
 'AnimationGraph::GetSyncLeader(target,"sync")','AnimationGraph::GetSyncPhase(target,"sync")','AnimationGraph::GetSyncMode(target,"sync")',
 'SpriteSkin::GetBonePosition(target,"Root")','SpriteSkin::GetBoneRotation(target,"root")','SpriteSkin::GetBoneScale(target,"root")','IK2D::GetTarget(target,"arm")','IK2D::GetTargetRotation(target,"Arm")','IK2D::GetWeight(target,"arm")','IK2D::IsEnabled(target,"arm")','IK2D::GetMasterWeight(target)',
 'Montage::GetPosition(target)','Montage::GetGroupPosition(target,"upper")','Montage::GetGroupWeight(target,"upper")','Montage::IsGroupPlaying(target,"upper")','AnimationBudget::GetObservedMS(target)','AnimationBudget::GetThrottledCount(target)',
 'LevelSequence::GetWeight(target)','LevelSequence::GetBlendMode(target)','LevelSequence::GetPriority(target)','LevelSequence::GetPosition(target)','LevelSequence::GetClockSource(target)','LevelSequence::GetSecondsPerFrame(target)','LevelSequence::GetExternalTime(target)','LevelSequence::HasExternalTime(target)','LevelSequence::GetFrame(target)','LevelSequence::GetFrameRateNumerator(target)','LevelSequence::GetFrameRateDenominator(target)',
 'Navigation::GetStatus(target)','Navigation::GetPath(target)','Navigation::GetSteeringVelocity(target)','Navigation::GetPreferredVelocity(target)','Perception::GetTargets(target).size()','Particles::GetCount(target)','Abilities::GetAttribute(target,"hp")','Abilities::Cooldown(target,"fire")','Abilities::IsActive(target,"fire")','Abilities::GetEffectLevel(target,"effect1")','Abilities::FindEffectHandle(target,"buff",0)','Abilities::Effects(target)','EnvironmentQuery::Results(target)','EnvironmentQuery::BatchResults(target)'
];
const defaults=['AI::GetTaskHandle(target,"missing")','AI::IsTaskAborting(target,"missing")','AI::IsTaskExecuting(target,"missing")','States::IsInState(target,"missing")','States::GetPath(target)','States::GetElapsed(target)','Morphs::GetNames(target,"")','Montage::GetPosition(target)','Montage::GetGroupPosition(target,"missing")','Montage::GetGroupWeight(target,"missing")','Montage::IsGroupPlaying(target,"missing")','AnimationBudget::GetObservedMS(target)','AnimationBudget::GetThrottledCount(target)','LevelSequence::GetWeight(target)','LevelSequence::GetBlendMode(target)','LevelSequence::GetPriority(target)','LevelSequence::GetPosition(target)','LevelSequence::GetClockSource(target)','LevelSequence::GetSecondsPerFrame(target)','LevelSequence::GetExternalTime(target)','LevelSequence::HasExternalTime(target)','LevelSequence::GetFrame(target)','LevelSequence::GetFrameRateNumerator(target)','LevelSequence::GetFrameRateDenominator(target)','Navigation::GetStatus(target)','Navigation::GetPath(target)','Navigation::GetSteeringVelocity(target)','Navigation::GetPreferredVelocity(target)','Perception::GetTargets(target).size()','Particles::GetCount(target)','EnvironmentQuery::Results(target)','EnvironmentQuery::BatchResults(target)'];
const errors=['Blackboard::GetFloat(target,"missing")','Morphs::GetWeight(target,"missing","")','Morphs::GetWeight(target,"","")','AnimationGraph::GetState(target,"missing")','AnimationGraph::GetSyncLeader(target,"missing")','SpriteSkin::GetBonePosition(target,"missing")','IK2D::GetWeight(target,"missing")','AnimationGraph::GetIKError(target,"missing")','AnimationGraph::GetRetargetScale(target,"missing")','Abilities::FindEffectHandle(target,"buff",-1)'];
const gather=expressions=>expressions.map(e=>'values.push_back(hb::'+e+');').join('\n');
const source=`#include "User.h"
#include <chrono>
using Clock=std::chrono::steady_clock;
static double ms(Clock::time_point start){return std::chrono::duration<double,std::milli>(Clock::now()-start).count();}
static size_t dirty(){return hb::bridgeDirtyStates.size()+hb::bridgeDirtyFields.size()+hb::bridgeDirtyUIPaths.size();}
std::string GameplayReadCost::Inspect(hb::Actor* target){hb::Json values=hb::Json::array();${gather(reads)}return hb::Json{{"values",values},{"dirty",dirty()}}.dump();}
std::string GameplayReadCost::Defaults(hb::Actor* target){hb::Json values=hb::Json::array();${gather(defaults)}return hb::Json{{"values",values},{"dirty",dirty()}}.dump();}
std::string GameplayReadCost::Errors(hb::Actor* target){hb::Json values=hb::Json::array();${errors.map(e=>'try{(void)hb::'+e+';values.push_back(false);}catch(const std::exception&){values.push_back(true);}').join('\n')}return values.dump();}
std::string GameplayReadCost::Ambiguous(hb::Actor* target){hb::Json values=hb::Json::array();${['Morphs::GetWeight(target,"smile","")','AnimationGraph::GetState(target,"Machine")','AnimationGraph::GetRetargetScale(target,"retarget")','AnimationGraph::GetIKError(target,"ik")'].map(e=>'try{(void)hb::'+e+';values.push_back(false);}catch(const std::exception&){values.push_back(true);}').join('\n')}return values.dump();}
bool GameplayReadCost::Mutate(hb::Actor* target){
 hb::Blackboard::SetFloat(target,"number",9);hb::AnimationGraph::SetFloat(target,"speed",8);hb::Morphs::SetWeight(target,"smile",.9f,"face");hb::SpriteSkin::SetBoneRotation(target,"root",60);hb::IK2D::SetWeight(target,"arm",.2f);hb::IK2D::SetMasterWeight(target,.1f);
 hb::bridgeAnimationMachine(target,"machine")["stateName"]="Temporary";hb::bridgeAnimationSync(target,"sync")["phase"]=.1f;
 return hb::Blackboard::GetFloat(target,"number")==9&&hb::AnimationGraph::GetFloat(target,"speed")==8&&hb::Morphs::GetWeight(target,"smile","face")==.9f&&hb::SpriteSkin::GetBoneRotation(target,"root")==60&&hb::IK2D::GetWeight(target,"arm")==.2f&&hb::IK2D::GetMasterWeight(target)==.1f&&hb::AnimationGraph::GetState(target,"machine")=="Temporary"&&hb::AnimationGraph::GetSyncPhase(target,"sync")==.1f&&dirty()==1;
}
std::string GameplayReadCost::Bench(){
 // Use the real SDK + next-call restore, without JS IPC noise obscuring this cost.
 const auto authoritative=hb::bridgeWorldData;hb::Json samples=hb::Json::array();size_t restored=0;double checksum=0;
 for(int frame=0;frame<144;frame++){const auto start=Clock::now();for(const auto& row:authoritative){auto* actor=hb::bridgeActor(row.at("id"));checksum+=hb::Blackboard::GetFloat(actor,"number");checksum+=hb::AnimationGraph::GetFloat(actor,"speed");checksum+=hb::SpriteSkin::GetBoneRotation(actor,"root");checksum+=hb::Navigation::GetPath(actor).size();checksum+=hb::Particles::GetCount(actor);}restored+=hb::bridgeRestoreWorld(authoritative);if(frame>=16)samples.push_back(ms(start));}
 return hb::Json{{"samples",samples},{"restored",restored},{"checksum",checksum},{"dirty",dirty()}}.dump();
}`;
await fs.writeFile(work+'/User.h',header);await fs.writeFile(work+'/User.cpp',source);
const objects=[{id:'owner',position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],gameplayDebug:debug}],empty=[{...objects[0],gameplayDebug:null}];
const create=async root=>{const {NativeHost}=await import(pathToFileURL(path.join(root,'tools/native-host.mjs'))),{NativeWorldClient}=await import(pathToFileURL(path.join(root,'prototype/native-transport.js'))),host=new NativeHost();try{const built=await host.build(header,source,{configuration:'release'}),client=new NativeWorldClient();return{root,host,built,client,samples:[],call:async(method,rows=objects)=>client.call({key:'nativeCall',nativeId:'GameplayReadCost.'+method,args:method==='Bench'?{}:{target:'owner'},objects:rows},built.metadata,request=>host.call(built.token,JSON.parse(JSON.stringify(request))))};}catch(e){host.close();throw e;}};
const settled=await Promise.allSettled(roots.map(create));if(settled.some(r=>r.status==='rejected')){for(const r of settled)if(r.status==='fulfilled')r.value.host.close();throw settled.find(r=>r.status==='rejected').reason;}
const [baseline,candidate]=settled.map(r=>r.value);
try{
 const inspect=async(entry,method,rows)=>JSON.parse((await entry.call(method,rows)).outputs.result);
 const old=await inspect(baseline,'Inspect'),next=await inspect(candidate,'Inspect');assert.equal(old.values.length,reads.length);assert.deepEqual(old.values,next.values);assert.equal(old.dirty,1);assert.equal(next.dirty,0);
 for(const rows of [empty,[{...empty[0],gameplayDebug:{stateMachine:{}}}],[{id:'owner',position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]}]]){const a=await inspect(baseline,'Defaults',rows),b=await inspect(candidate,'Defaults',rows);assert.deepEqual(a.values,b.values);assert.equal(b.dirty,0);}
 for(const entry of [baseline,candidate]){assert.deepEqual(await inspect(entry,'Errors'),Array(errors.length).fill(true));assert.equal((await entry.call('Mutate')).outputs.result,true);assert.deepEqual((await inspect(entry,'Inspect')).values,old.values,'next RPC restores authoritative values after writes');}
 const malformed=[{...objects[0],gameplayDebug:42}];for(const entry of [baseline,candidate])await assert.rejects(entry.call('Inspect',malformed));
 // Ambiguous search keys must still throw, while explicit machine keys disambiguate.
 const ambiguous=structuredClone(objects),amb=ambiguous[0].gameplayDebug;amb.morphs.push({name:'smile',mesh:'other',weight:.2});amb.animationGraph.machines.push({...amb.animationGraph.machines[0],key:'other',id:'other'});amb.animationGraph.retarget.push({...amb.animationGraph.retarget[0]});amb.animationGraph.ik.push({...amb.animationGraph.ik[0]});
 for(const entry of [baseline,candidate])assert.deepEqual(await inspect(entry,'Ambiguous',ambiguous),[true,true,true,true]);
 // The mesh-qualified call remains valid and exercises both search paths.
 const qualified=structuredClone(objects);qualified[0].gameplayDebug.morphs=amb.morphs;assert.deepEqual((await inspect(candidate,'Inspect',qualified)).values,old.values);
 const crowded=Array.from({length:500},(_,i)=>({...objects[0],id:'object'+i,gameplayDebug:{...debug,blackboard:{...debug.blackboard,object:'object'+i},retainedPayload:Array.from({length:32},(_,k)=>({name:'state'+k,value:k,vector:[1,2,3]}))}}));
 const batches=[];for(let round=0;round<4;round++)for(const entry of round%2?[baseline,candidate]:[candidate,baseline]){const result=await inspect(entry,'Bench',crowded);assert.equal(result.checksum,4392000);assert.equal(result.dirty,0);assert.equal(result.restored,entry===baseline?72000:0);entry.samples.push(...result.samples);batches.push({variant:entry===baseline?'baseline':'candidate',round,...result});}
 const stats=values=>{const s=[...values].sort((a,b)=>a-b),q=p=>s[Math.ceil(s.length*p)-1];return{p50MS:q(.5),p95MS:q(.95),p99MS:q(.99),samples:s.length};},hash=async file=>createHash('sha256').update(await fs.readFile(file)).digest('hex');
 const report={passed:true,reads:reads.length,defaults:defaults.length,errorCases:errors.length,readOnlyDirtyRows:{baseline:1,candidate:0},readAfterWrite:true,authoritativeRestore:true,malformedStateRejected:true,benchmark:{objects:500,framesPerBatch:144,warmupFrames:16,rounds:4,baseline:stats(baseline.samples),candidate:stats(candidate.samples),scope:'actual C++ SDK gameplay getters and next-call authoritative restore; excludes render, physics, IPC, and whole-game FPS'},owners:await Promise.all([baseline,candidate].map(async entry=>({root:entry.root,headerSHA256:await hash(path.join(entry.root,'native/include/HBEngine/Bridge.hpp')),workerSHA256:await hash(entry.built.binary||entry.host.sessions.get(entry.built.token).binary)}))),batches};
 await fs.writeFile(work+'/acceptance.json',JSON.stringify(report,null,2));console.log(JSON.stringify({work,...report,batches:undefined}));
}finally{baseline.host.close();candidate.host.close();}
