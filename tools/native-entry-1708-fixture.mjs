import {createProject} from './project-manifest.mjs';
import {createAsset} from '../prototype/asset-documents.js';
export const header='#pragma once\n#include <HBEngine/Game.hpp>\n#include "Value.hpp"\nHB_CLASS(Blueprintable) class Entry : public hb::Actor {public: HB_PROPERTY(BlueprintReadWrite) Domain::Payload Data; HB_FUNCTION(BlueprintCallable) void Drive();};';
export const source='#include "Entry.h"\nvoid Entry::Drive(){transform.position={static_cast<float>(Data.Value),3,2};}\n';
export const entries=['A','B'].map((name,i)=>({name,headerPath:'Source/'+name+'/Entry.h',sourcePath:'Source/'+name+'/Entry.cpp',valuePath:'Source/'+name+'/Value.hpp',value:i+1,bpPath:'Assets/BP_'+name+'.hbblueprint.json',actorId:'Actor_'+name}));
export const files=entries.flatMap(e=>[{path:e.headerPath,content:header},{path:e.sourcePath,content:source},{path:e.valuePath,content:'#pragma once\n#include <HBEngine/Game.hpp>\nnamespace Domain {HB_STRUCT(BlueprintType) struct Payload {HB_PROPERTY(BlueprintReadWrite) int Value='+e.value+';};}\n'}]);
export async function nativeEntry1708Fixture(work){
 const record=await createProject('Entry1708',work,'2d'),project=record.project;for(const f of files)await project.write(f.path,f.content);
 const scene=createAsset('scene','TwoEntries');scene.objects=[];
 for(const e of entries){const bp=createAsset('blueprint','BP_'+e.name);bp.native={version:1,sourceReference:true,headerPath:e.headerPath,sourcePath:e.sourcePath};bp.settings.parentClass='Entry';bp.nodes=[];bp.edges=[];bp.components=[];await project.write(e.bpPath,JSON.stringify(bp));scene.objects.push({id:e.actorId,name:e.actorId,kind:'empty',position:[7,3,2],rotation:[0,0,0],scale:[1,1,1],visible:true,blueprintAsset:e.bpPath});}
 await project.write(record.manifest.startupScene,JSON.stringify(scene));return {...record,scene,entries,files,header,source};
}
