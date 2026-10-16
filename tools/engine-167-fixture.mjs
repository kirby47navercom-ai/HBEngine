import fs from 'node:fs/promises';
import {createProject} from './project-manifest.mjs';
import {createAsset} from '../prototype/asset-documents.js';
import {makeSceneComponent} from '../prototype/scene-components.js';
import {makeNode} from '../prototype/blueprint-model.js';
import {parseNativeHeader} from '../prototype/native-model.js';
import {createSpriteRig,makeRigBone} from '../prototype/sprite-rig-assets.js';
import {makeRigIKSolver} from '../prototype/ik2d-assets.js';
export async function engine167Fixture(dir){
 const record=await createProject('streaming167-'+Date.now(),dir,'3d'),files={};
 const blueprint=(name,header,source,events)=>{const bp=createAsset('blueprint','BP_'+name);bp.native={...parseNativeHeader(header),header,source,headerPath:'Source/'+name+'.h',sourcePath:'Source/'+name+'.cpp'};bp.settings.parentClass=name;bp.nodes=[];bp.edges=[];for(const [event,fn] of events){const a=makeNode(event),b=makeNode('nativeCall');b.nativeId=name+'.'+fn;bp.nodes.push(a,b);bp.edges.push({from:{node:a.id,pin:'then'},to:{node:b.id,pin:'exec'}});}return bp;};
 const header='#include <HBEngine/Game.hpp>\nHB_CLASS(Blueprintable) class LevelDirector : public hb::Actor {public: HB_PROPERTY(BlueprintReadWrite) int ticks=0; HB_PROPERTY(BlueprintReadWrite) bool loaded=false; HB_PROPERTY(BlueprintReadWrite) bool gone=false; HB_PROPERTY(BlueprintReadWrite) bool reloaded=false; HB_PROPERTY(BlueprintReadWrite) float worldX=0; HB_FUNCTION(BlueprintCallable) void Setup(); HB_FUNCTION(BlueprintCallable) void Read();};';
 const source='void LevelDirector::Setup(){hb::Transform t;t.position={10,0,0};hb::Levels::Load("Assets/L_Chunk.hbscene.json","Room",t);}void LevelDirector::Read(){++ticks;if(ticks==2){loaded=hb::Levels::IsLoaded("Room")&&hb::Levels::GetInstances().size()==1;auto actor=hb::Levels::GetActor("Room","ChunkActor");if(actor)worldX=hb::Scene::GetWorldPosition(actor).x;}if(ticks==6)hb::Levels::Unload("Room");if(ticks==7)gone=!hb::Levels::IsLoaded("Room");if(ticks==10)Setup();if(ticks==12)reloaded=hb::Levels::GetActor("Room","ChunkActor")!=nullptr;if(ticks==14)hb::Levels::SetVisible("Room",false);if(ticks==16)hb::Levels::SetVisible("Room",true);}';
 files[record.manifest.startupBlueprint]=blueprint('LevelDirector',header,source,[['beginPlay','Setup'],['tick','Read']]);
 const ch='#include <HBEngine/Game.hpp>\nHB_CLASS(Blueprintable) class ChunkProbe : public hb::Actor {public: HB_PROPERTY(BlueprintReadWrite) int began=0; HB_PROPERTY(BlueprintReadWrite) float initialX=0; HB_FUNCTION(BlueprintCallable) void Begin(); HB_FUNCTION(BlueprintCallable) void End();};';
 const cs='void ChunkProbe::Begin(){++began;initialX=hb::Scene::GetWorldPosition(this).x;hb::Transform t;t.position={12,3,0};hb::Scene::Spawn("Actor",t);}void ChunkProbe::End(){auto state=hb::Json::parse(hb::Game::GetStateText());state["chunkEnds"]=state.value("chunkEnds",0)+1;hb::Game::SetStateText(state.dump());}';
 files['Assets/BP_Chunk.hbblueprint.json']=blueprint('ChunkProbe',ch,cs,[['beginPlay','Begin'],['endPlay','End']]);
 const scene=JSON.parse(await fs.readFile((await record.project.read(record.manifest.startupScene)).file,'utf8'));
 const actor=(id,kind='empty',position=[0,0,0])=>({id,name:id,kind,visible:true,position,rotation:[0,0,0],scale:[1,1,1],components:[]});
 scene.objects=scene.objects.filter(o=>o.kind==='camera'||o.kind==='light');const director=actor('Director');director.blueprintAsset=record.manifest.startupBlueprint;const cell=makeSceneComponent('LevelStreaming');cell.properties.scene='Assets/L_Chunk.hbscene.json';director.components.push(cell);scene.objects.push(director);await record.project.write(record.manifest.startupScene,JSON.stringify(scene));
 const chunk=actor('ChunkActor','cube',[2,1,0]);chunk.blueprintAsset='Assets/BP_Chunk.hbblueprint.json';chunk.components.push(makeSceneComponent('BoxCollider'));files['Assets/L_Chunk.hbscene.json']={...scene,objects:[chunk]};
 for(const name of ['Source','Target']){const rig=createSpriteRig(name);rig.bones.push({...makeRigBone('Elbow','root'),id:'elbow',position:[1,0],length:1},{...makeRigBone('Hand','elbow'),id:'hand',position:[1,0],length:1});if(name==='Source')rig.clips=[{id:'turn',name:'Turn',length:1,loop:false,tracks:[{bone:'root',property:'rotation',keys:[{time:0,value:0,interpolation:'linear'},{time:1,value:30,interpolation:'linear'}]}]}];rig.solvers=[makeRigIKSolver(rig,{name:'Hand IK',type:'limb',root:'root',effector:'hand'})];files['Assets/R_'+name+'.hbspriterig.json']=rig;}
 for(const bp of [files[record.manifest.startupBlueprint],files['Assets/BP_Chunk.hbblueprint.json']]){await record.project.write(bp.native.headerPath,bp.native.header);await record.project.write(bp.native.sourcePath,bp.native.source);}
 for(const [p,data] of Object.entries(files))await record.project.write(p,JSON.stringify(data));return {record,files};
}
