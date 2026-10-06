import assert from 'node:assert/strict';
import * as THREE from 'three';
import {light2DUniforms} from '../prototype/two-d-lighting.js';
import {createPlacedObject} from '../prototype/placement-catalog.js';
import {componentInspector} from '../prototype/scene-inspector.js';
import {detailsMarkup} from '../prototype/blueprint-details.js';
import {createAsset} from '../prototype/asset-documents.js';
import {validComponentProperties,editComponentProperty,componentPropertyVisible} from '../prototype/scene-components.js';
import {lightBlendChoices,renderer2DProperties} from '../prototype/light-blend-styles.js';
import {engineOperations} from '../prototype/engine-services.js';
import {engineSchema} from './editor-automation.mjs';
import {NativeHost} from './native-host.mjs';
import {nativeWorld} from '../prototype/native-model.js';

const lamp=createPlacedObject('globalLight2d',{id:'lamp'}),settings=createPlacedObject('renderer2d',{id:'settings'}),sprite=createPlacedObject('sprite',{id:'sprite'}),world=[lamp,settings,sprite],p=settings.components.find(c=>c.type==='Renderer2D').properties;
p.style1Name='횃불';assert.equal(lightBlendChoices(world)[1][1],'1 · 횃불');
assert.equal(renderer2DProperties([...world,{id:'hidden',visible:false,components:[{type:'Renderer2D',properties:{priority:9}}]}]),p);
assert.equal(renderer2DProperties([{id:'parent',visible:false},{id:'child',parent:'parent',components:settings.components},...world]),p);
for(const index of [-1,4,1.5,'1'])assert.equal(validComponentProperties('Light2D',{blendStyle:index}),false);
assert.deepEqual(editComponentProperty('Light2D',{},'blendStyle','2').blendStyle,2);
for(const order of [-1048577,1048577,.5,NaN])assert.equal(validComponentProperties('Light2D',{lightOrder:order}),false);assert.equal(validComponentProperties('Light2D',{overlapOperation:'bad'}),false);assert.ok(componentInspector(createPlacedObject('pointLight2d'),[]).includes('광원 순서'));assert.ok(!componentInspector(lamp,[]).includes('광원 순서'));
assert.equal(validComponentProperties('Renderer2D',{style0Mode:'bad'}),false);assert.equal(validComponentProperties('Renderer2D',{style0Mask:'bad'}),false);
assert.equal(componentPropertyVisible('SpriteRenderer','lightMaskTexture',{shading:'unlit'}),false);
assert.ok(componentInspector(lamp,[],{objects:world}).includes('1 · 횃불'));
const bp=createAsset('blueprint','Styles');bp.components=[...lamp.components,...settings.components];const light=bp.components.find(c=>c.type==='Light2D');assert.ok(detailsMarkup(bp,bp,{kind:'component',id:light.id},[],[]).includes('1 · 횃불'));
const binding={self:lamp.id},vm={objects:world,object:id=>world.find(o=>o.id===id)},services=engineOperations({asset:async p=>p,read:async()=>{},mesh:()=>null});
try{
  const op=(key,args)=>services.operation(key,args,binding,vm),before=structuredClone(world);
  for(const [key,args] of [['light2dSetOrder',{target:lamp.id,order:.5}],['light2dSetOverlap',{target:lamp.id,mode:'bad'}],['light2dSetBlendStyle',{target:lamp.id,index:4}],['light2dRendererSetStyle',{target:settings.id,index:0,mode:'multiply',mask:'bad'}],['spriteSetLightMask',{target:sprite.id,texture:'../outside.png'}]])await assert.rejects(op(key,args));assert.deepEqual(world,before);
  const host=new NativeHost();try{
    const header='#include <HBEngine/Game.hpp>\nHB_CLASS() class BlendProbe : public hb::Library { public: HB_FUNCTION(BlueprintCallable) static bool Run(hb::Actor* lamp,hb::Actor* renderer,hb::Actor* sprite); };';
    const source='bool BlendProbe::Run(hb::Actor* lamp,hb::Actor* renderer,hb::Actor* sprite){hb::Light2D::SetLightOrder(lamp,-7);hb::Light2D::SetOverlapOperation(lamp,"alphaBlend");hb::Light2D::SetBlendStyle(lamp,3);hb::Light2D::SetRendererBlendStyle(renderer,3,"subtractive","oneMinusA");hb::Sprites::SetLightMaskTexture(sprite,"Assets/Mask.png");bool a=false,b=false,c=false,d=false,e=false;try{hb::Light2D::SetLightOrder(lamp,1048577);}catch(const std::exception&){d=true;}try{hb::Light2D::SetOverlapOperation(lamp,"bad");}catch(const std::exception&){e=true;}try{hb::Light2D::SetBlendStyle(lamp,4);}catch(const std::exception&){a=true;}try{hb::Light2D::SetRendererBlendStyle(renderer,3,"bad","r");}catch(const std::exception&){b=true;}try{hb::Sprites::SetLightMaskTexture(sprite,"../bad.png");}catch(const std::exception&){c=true;}std::string mode,mask;hb::Light2D::GetRendererBlendStyle(renderer,3,mode,mask);return a&&b&&c&&d&&e&&hb::Light2D::GetLightOrder(lamp)==-7&&hb::Light2D::GetOverlapOperation(lamp)=="alphaBlend"&&hb::Light2D::GetBlendStyle(lamp)==3&&mode=="subtractive"&&mask=="oneMinusA"&&hb::Sprites::GetLightMaskTexture(sprite)=="Assets/Mask.png";}';
    const build=await host.build(header,source),reply=await host.call(build.token,{key:'nativeCall',nativeId:'BlendProbe.Run',args:{lamp:lamp.id,renderer:settings.id,sprite:sprite.id},objects:nativeWorld(world,new Set())});assert.equal(reply.outputs.result,true);assert.equal(reply.operations.length,5);for(const cmd of reply.operations)await op(cmd.key,cmd.args);
    assert.equal((await op('light2dGetOrder',{target:lamp.id})).return,-7);assert.equal((await op('light2dGetOverlap',{target:lamp.id})).return,'alphaBlend');
    assert.equal((await op('light2dGetBlendStyle',{target:lamp.id})).return,3);assert.deepEqual(await op('light2dRendererGetStyle',{target:settings.id,index:3}),{mode:'subtractive',mask:'oneMinusA'});assert.equal((await op('spriteGetLightMask',{target:sprite.id})).return,'Assets/Mask.png');
  }finally{host.close();}
}finally{services.dispose();}
const material=new THREE.MeshStandardMaterial(),uniforms=light2DUniforms(material);uniforms.hbLight2DData.value=new THREE.DataTexture(new Float32Array(28),7,1,THREE.RGBAFormat,THREE.FloatType);const cloned=material.clone();assert.ok(!Object.hasOwn(cloned.userData,'hbLight2D'),'runtime GPU textures must not be serialized into material clones');const copy=light2DUniforms(cloned);assert.notEqual(copy,uniforms);copy.hbLight2DOrigin.value.set(3,4);assert.deepEqual(uniforms.hbLight2DOrigin.value.toArray(),[0,0]);uniforms.hbLight2DData.value.dispose();material.dispose();cloned.dispose();
const schema=engineSchema();assert.equal(schema.render2d.blendStyles.count,4);for(const key of ['light2dSetOrder','light2dGetOrder','light2dSetOverlap','light2dGetOverlap','light2dSetBlendStyle','light2dGetBlendStyle','light2dRendererSetStyle','light2dRendererGetStyle','spriteSetLightMask','spriteGetLightMask'])assert.ok(schema.blueprint.nodes.some(n=>n.key===key),key);
console.log('2D shared styles: scene/BP controls, hidden priority, atomic validation, C++/BP same-call state and AI contract PASS');
