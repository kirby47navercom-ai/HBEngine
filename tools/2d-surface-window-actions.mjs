import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createAsset} from '../prototype/asset-documents.js';
import {makeNode,connect} from '../prototype/blueprint-model.js';
import {makeSceneComponent} from '../prototype/scene-components.js';
import {parseNativeHeader} from '../prototype/native-model.js';

export async function installSurfaceFixture(record,scene){
  const normal='Source/SurfaceNormal.png',spritePath='Assets/S_Surface.hbsprite.json',bpPath='Assets/BP_Surface.hbblueprint.json',headerPath='Source/SurfaceProbe.h',sourcePath='Source/SurfaceProbe.cpp';
  await fs.copyFile(path.join(record.root,'Assets/Normal.png'),path.join(record.root,normal));
  const sprite={...createAsset('sprite','S_Surface'),texture:'Assets/Sheet.png',normalTexture:normal,pixelsPerUnit:32};
  const header='#pragma once\n#include <HBEngine/Game.hpp>\nHB_CLASS(Blueprintable) class SurfaceProbe : public hb::Actor { public: HB_PROPERTY(BlueprintReadWrite) bool verified=false; HB_PROPERTY(BlueprintReadWrite) bool pinVerified=false; HB_FUNCTION(BlueprintCallable) void Configure(); HB_FUNCTION(BlueprintCallable) void Probe(const std::string& texture,float strength,bool flipY); };';
  const source='void SurfaceProbe::Configure(){const bool before=hb::Sprites::GetBlendMode(this)=="masked"&&std::abs(hb::Sprites::GetAlphaCutoff(this)-.6f)<1e-6;hb::Sprites::SetLit(this,true);hb::Sprites::SetNormalMap(this,"Source/SurfaceNormal.png",1.5f,true);hb::Sprites::SetShadows(this,true,true);hb::Sprites::SetBlendMode(this,"translucent",.4f);std::string texture;float strength;bool flipY,cast,receive;hb::Sprites::GetNormalMap(this,texture,strength,flipY);hb::Sprites::GetShadows(this,cast,receive);verified=before&&texture=="Source/SurfaceNormal.png"&&strength==1.5f&&flipY&&cast&&receive&&hb::Sprites::IsLit(this)&&hb::Sprites::GetBlendMode(this)=="translucent"&&std::abs(hb::Sprites::GetAlphaCutoff(this)-.4f)<1e-6;} void SurfaceProbe::Probe(const std::string& texture,float strength,bool flipY){pinVerified=texture=="Source/SurfaceNormal.png"&&strength==1.5f&&flipY;}';
  const bp=createAsset('blueprint','BP_Surface');bp.native={...parseNativeHeader(header),header,source,headerPath,sourcePath};bp.settings.parentClass='SurfaceProbe';bp.components=[];bp.nodes=[];bp.edges=[];bp.construction={nodes:[makeNode('construction')],edges:[],comments:[]};
  const begin=makeNode('beginPlay'),blend=makeNode('spriteSetBlend'),configure=makeNode('nativeCall'),query=makeNode('spriteGetNormal'),probe=makeNode('nativeCall');blend.inputValues={mode:'masked',alphaCutoff:.6};configure.nativeId='SurfaceProbe.Configure';probe.nativeId='SurfaceProbe.Probe';bp.nodes.push(begin,blend,configure,query,probe);connect(bp,{node:begin.id,pin:'then'},{node:blend.id,pin:'exec'});connect(bp,{node:blend.id,pin:'then'},{node:configure.id,pin:'exec'});connect(bp,{node:configure.id,pin:'then'},{node:probe.id,pin:'exec'});for(const pin of ['texture','strength','flipY'])connect(bp,{node:query.id,pin},{node:probe.id,pin});
  for(const [file,data] of [[spritePath,sprite],[bpPath,bp]])await record.project.write(file,JSON.stringify(data));await record.project.write(headerPath,header);await record.project.write(sourcePath,source);
  scene.objects.push({id:'Surface',name:'Surface',kind:'sprite',visible:true,position:[2,-1,.25],rotation:[0,0,0],scale:[1,1,1],blueprintAsset:bpPath,components:[makeSceneComponent('Transform'),makeSceneComponent('SpriteRenderer',{sprite:spritePath,useCustomSize:true,width:1,height:1})]},{id:'SurfaceLight',name:'SurfaceLight',kind:'pointLight',visible:true,position:[2,-1,3],rotation:[0,0,0],scale:[1,1,1],components:[makeSceneComponent('Transform'),makeSceneComponent('PointLight',{intensity:12,radius:10})]});
  return {normal,spritePath,bpPath,headerPath,sourcePath};
}

export async function verifySurfacePlayer({evaluate,until,fixture}){
  const state=await until(async()=>{const s=await evaluate('window.hbPlayerDebug.inspect()'),o=s.objects.find(o=>o.id==='Surface'),sprite=s.sprites.find(o=>o.id==='Surface');return o?.nativeProperties?.verified&&o.nativeProperties.pinVerified&&sprite?.surface.normalImage[0]===96?s:null;},'배포 C++/BP 노멀 표면');
  const o=state.objects.find(o=>o.id==='Surface'),sprite=state.sprites.find(o=>o.id==='Surface'),p=o.components.find(c=>c.type==='SpriteRenderer').properties;assert.deepEqual(o.position,[2,-1,.25]);assert.equal(p.normalTexture,fixture.normal);assert.equal(p.blendMode,'translucent');assert.equal(sprite.surface.material,'MeshStandardMaterial');assert.deepEqual(sprite.surface.normalScale,[1.5,-1.5]);assert.equal(sprite.surface.normalColorSpace,'');assert.ok(sprite.surface.castShadow&&sprite.surface.receiveShadow&&sprite.surface.transparent&&!sprite.surface.depthWrite);return {object:o,sprite};
}
