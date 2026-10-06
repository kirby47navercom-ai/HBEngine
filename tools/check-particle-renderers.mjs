import {componentInspector} from '../prototype/scene-inspector.js';
import {detailsMarkup} from '../prototype/blueprint-details.js';
import {createAsset} from '../prototype/asset-documents.js';
import * as THREE from 'three';
import {sceneRendering} from '../prototype/scene-rendering.js';
import assert from 'node:assert/strict';
import {makeSceneComponent,validComponentProperties} from '../prototype/scene-components.js';
import {engineOperations} from '../prototype/engine-services.js';
import {engineSchema} from './editor-automation.mjs';
import {NativeHost} from './native-host.mjs';
import {nativeWorld} from '../prototype/native-model.js';

const emitter={id:'emitter',name:'Emitter',kind:'empty',visible:true,position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],components:[makeSceneComponent('ParticleSystem')]},world=[emitter],binding={self:emitter.id},vm={objects:world,object:id=>world.find(o=>o.id===id)};
let updates=0;
const services=engineOperations({update(){updates++;},mesh(){return null;},physicsOptions:{backend:'legacy'}}),host=new NativeHost(),op=(key,args)=>services.operation(key,{target:emitter.id,component:'ParticleSystem',...args},binding,vm);
try{
  const bp=createAsset('blueprint','Particles');bp.components=structuredClone(emitter.components);for(const html of [componentInspector(emitter,[]),detailsMarkup(bp,bp,{kind:'component',id:bp.components[0].id},world,[])]){assert.ok(html.includes('마스크'));assert.ok(html.indexOf('정렬 레이어')>=0&&html.indexOf('정렬 레이어')<html.indexOf('레이어 내 순서'));}
  for(const properties of [{maskInteraction:'invalid'},{sortingLayer:'../bad'},{sortingOrder:100001}])assert.equal(validComponentProperties('ParticleSystem',properties),false);
  const before=structuredClone(world);await assert.rejects(op('componentSetString',{property:'maskInteraction',value:'invalid'}));assert.deepEqual(world,before);
  const header='#include <HBEngine/Game.hpp>\nHB_CLASS() class ParticleRendererProbe : public hb::Library {public:HB_FUNCTION(BlueprintCallable) static bool Run(hb::Actor* emitter);};';
  const source='bool ParticleRendererProbe::Run(hb::Actor* emitter){hb::Components::SetString(emitter,"ParticleSystem","maskInteraction","inside");hb::Components::SetString(emitter,"ParticleSystem","sortingLayer","front");hb::Components::SetFloat(emitter,"ParticleSystem","sortingOrder",7);return hb::Components::GetString(emitter,"ParticleSystem","maskInteraction")=="inside"&&hb::Components::GetString(emitter,"ParticleSystem","sortingLayer")=="front"&&hb::Components::GetFloat(emitter,"ParticleSystem","sortingOrder")==7;}';
  const build=await host.build(header,source),reply=await host.call(build.token,{key:'nativeCall',nativeId:'ParticleRendererProbe.Run',args:{emitter:emitter.id},objects:nativeWorld(world,new Set())});assert.equal(reply.outputs.result,true);
  for(const command of reply.operations)await services.operation(command.key,command.args,binding,vm);
  assert.equal((await op('componentGetString',{property:'maskInteraction'})).return,'inside');assert.equal((await op('componentGetString',{property:'sortingLayer'})).return,'front');assert.equal((await op('componentGetFloat',{property:'sortingOrder'})).return,7);assert.equal(updates,3);
  const schema=engineSchema();assert.equal(schema.components.ParticleSystem.properties.maskInteraction.type,'select');assert.equal(schema.components.ParticleSystem.properties.sortingLayer.type,'sortinglayer');for(const key of ['componentSetString','componentGetString','componentSetFloat','componentGetFloat'])assert.ok(schema.blueprint.nodes.some(n=>n.key===key));
  const group=new THREE.Group();group.userData.objectId=emitter.id;const visuals=sceneRendering({read:async()=>{throw Error('unexpected asset');},fileUrl:p=>p,loadModel:async()=>{throw Error('unexpected model');},current:()=>group,all:()=>[group]});
  try{
    await visuals.build(emitter,group);const state=group.userData.particleState;state.simulation.emit(1,new THREE.Matrix4());const particle=state.simulation.particles[0];particle.position=[0,0,0];particle.age=.5;particle.lifetime=1;state.properties.color=[1,0,0,1];state.properties.endColor=[0,0,1,.5];group.position.x=1;state.properties.simulationSpace='world';visuals.tickParticles(world,0,true);
    assert.equal(state.geometry.attributes.position.getX(0),-1);assert.equal(state.geometry.attributes.particleColor.getX(0),.5);assert.equal(state.geometry.attributes.particleColor.getZ(0),.5);assert.equal(state.geometry.attributes.particleColor.getW(0),.75);assert.deepEqual(particle.position,[0,0,0]);state.properties.simulationSpace='local';visuals.tickParticles(world,0,true);assert.equal(state.geometry.attributes.position.getX(0),0);
    const mesh=group.children.find(n=>n.isPoints),viewports=[],renderer={getDrawingBufferSize(v){viewports.push(v);return v.set(64,64);}},camera={projectionMatrix:new THREE.Matrix4(),isOrthographicCamera:true};mesh.onBeforeRender(renderer,null,camera);mesh.onBeforeRender(renderer,null,camera);assert.equal(viewports[0],viewports[1]);assert.equal(mesh.material.uniforms.pixelScale.value,32);
  }finally{visuals.dispose(group);visuals.dispose2D();}
  console.log('파티클 Renderer: C++·BP·AI 공용 컴포넌트 편집/즉시 읽기/갱신·범위 검증 PASS');
}finally{host.close();services.dispose();}
