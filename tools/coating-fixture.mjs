import assert from 'node:assert/strict';
import {createAsset} from '../prototype/asset-documents.js';
import {createPlacedObject} from '../prototype/placement-catalog.js';
import {makeSceneComponent} from '../prototype/scene-components.js';
import {makeMaterialNode} from '../prototype/material-runtime.js';
import {makeNode} from '../prototype/blueprint-model.js';
import {parseNativeHeader} from '../prototype/native-model.js';

export function coatingMaterial(name='Coating',baseNormal=false,coatNormal=false){
  const material=createAsset('material','M_'+name);
  Object.assign(material.surface,{color:'#000000',metalness:0,roughness:1,clearcoat:0,clearcoatRoughness:.3,ior:1.5});
  for(const [pin,enabled] of [['normal',baseNormal],['clearcoatNormal',coatNormal]])if(enabled){
    const node=makeMaterialNode('vector3');node.value=[1,0,1];material.graph.nodes.push(node);
    material.graph.edges.push({from:{node:node.id,pin:'value'},to:{node:'surface',pin}});
  }
  return material;
}
export async function writeCoatingFixture(write,scene){
  const header='#include <HBEngine/Game.hpp>\nHB_CLASS(Blueprintable) class CoatingDriver : public hb::Actor {public:HB_FUNCTION(BlueprintCallable) void Set(hb::Actor* target,const std::string& parameter,float value);};',source='void CoatingDriver::Set(hb::Actor* target,const std::string& parameter,float value){hb::Materials::SetFloat(target,parameter,value);}';
  const bp=createAsset('blueprint','BP_Coating');bp.settings.parentClass='CoatingDriver';bp.native={...parseNativeHeader(header),header,source,headerPath:'Source/CoatingDriver.h',sourcePath:'Source/CoatingDriver.cpp'};
  const input=makeNode('input'),set=makeNode('materialFloat');input.options={key:'C'};set.inputValues={target:'Coated',parameter:'Clearcoat',value:1};bp.nodes=[input,set];bp.edges=[{from:{node:input.id,pin:'then'},to:{node:set.id,pin:'exec'}}];bp.construction={nodes:[makeNode('construction')],edges:[],comments:[]};
  await write('Source/CoatingDriver.h',header);await write('Source/CoatingDriver.cpp',source);await write('Assets/BP_Coating.hbblueprint.json',bp);
  for(const [name,base,coat] of [['Coating',false,false],['CoatingBaseTilt',true,false],['CoatingTopTilt',false,true]]){
    await write('Assets/M_'+name+'.hbmaterial.json',coatingMaterial(name,base,coat));
    const fixture=structuredClone(scene);fixture.runtime.dimension='3d';Object.assign(fixture.environment,{sunEnabled:false,skyEnabled:false,fogEnabled:false,cloudsEnabled:false,groundColor:'#000000'});
    fixture.objects=[{...createPlacedObject('empty',{id:'CoatingDriver'}),blueprintAsset:'Assets/BP_Coating.hbblueprint.json'},{...createPlacedObject('camera',{id:'Camera'}),position:[0,0,10],rotation:[0,0,0],components:[makeSceneComponent('Camera',{main:true,projection:'orthographic',orthographicSize:4})]},{...createPlacedObject('cube',{id:'Coated'}),position:[0,-2,0],scale:[4,4,1],components:[makeSceneComponent('MeshRenderer',{material:'Assets/M_'+name+'.hbmaterial.json'})]},{...createPlacedObject('directionalLight',{id:'Light'}),position:[0,0,5],rotation:[0,0,0],components:[makeSceneComponent('DirectionalLight',{color:[1,1,1,1],intensity:2,castShadow:false})]}];
    await write('Assets/Scenes/'+name+'.hbscene.json',fixture);
  }
}
export async function checkCoatingPlayer({evaluate,ready,inspect,pixels,cdp,until}){
  const set=(parameter,value)=>evaluate('window.hbPlayerDebug.call("CoatingDriver","CoatingDriver.Set",'+JSON.stringify({target:'Coated',parameter,value})+')'),state=async()=>{const s=await inspect();return {renderer:s.renderer,material:s.materials.find(m=>m.object==='Coated')};};
  await evaluate('window.hbPlayerDebug.open("Assets/Scenes/Coating.hbscene.json")');await ready();const initial=await state(),off=await pixels('coating-off');
  await set('Clearcoat',1);const on=await pixels('coating-cpp-on');assert.ok(on[0]>off[0]+30,JSON.stringify({off,on}));
  const active=await state();await set('CoatRoughness',1);const rough=await pixels('coating-rough');assert.ok(rough[0]<on[0]-30,JSON.stringify({on,rough}));await set('CoatRoughness',.3);
  await set('Clearcoat',0);for(const type of ['keyDown','keyUp'])await cdp('Input.dispatchKeyEvent',{type,key:'C',code:'KeyC',windowsVirtualKeyCode:67});await until(async()=> (await state()).material.surface.clearcoat===1,'Blueprint 코팅');const bp=await pixels('coating-bp-on');assert.deepEqual(bp,on);
  await set('Clearcoat',0);await set('IOR',1);const noFresnel=await pixels('coating-ior-one');await set('IOR',2.5);const highFresnel=await pixels('coating-ior-high');assert.ok(highFresnel[0]>noFresnel[0]+10,JSON.stringify({noFresnel,highFresnel}));
  await set('AO',.25);assert.equal((await state()).material.surface.ao,.25);const final=await state();assert.equal(final.material.id,active.material.id);assert.equal(final.material.version,active.material.version);if(active.material.program){assert.equal(final.material.program,active.material.program);assert.equal(final.renderer.uploads,active.renderer.uploads);}
  const normals={};for(const name of ['CoatingBaseTilt','CoatingTopTilt']){await evaluate('window.hbPlayerDebug.open('+JSON.stringify('Assets/Scenes/'+name+'.hbscene.json')+')');await ready();await set('Clearcoat',1);normals[name]=await pixels(name);}
  assert.ok(normals.CoatingBaseTilt[0]>normals.CoatingTopTilt[0]+30,JSON.stringify(normals));
  return {passed:true,initial,active,final,off,on,rough,bp,noFresnel,highFresnel,normals,cppBlueprint:true,coatingNormalIndependent:true,uniformMaterialReuse:true,firstWebGPUActivationMayCompile:true,fpsClaim:false};
}
