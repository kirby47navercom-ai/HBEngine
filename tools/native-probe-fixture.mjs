import assert from 'node:assert/strict';
import {createAsset} from '../prototype/asset-documents.js';
import {createPlacedObject} from '../prototype/placement-catalog.js';
import {makeSceneComponent} from '../prototype/scene-components.js';
import {makeMaterialNode} from '../prototype/material-runtime.js';
import {makeNode} from '../prototype/blueprint-model.js';
import {parseNativeHeader} from '../prototype/native-model.js';

export async function nativeProbeFixture(write,scene,camera){
  const header='#include <HBEngine/Game.hpp>\nHB_CLASS(Blueprintable) class ProbeDriver : public hb::Actor {public:HB_FUNCTION(BlueprintCallable) void Off(hb::Actor* target);HB_FUNCTION(BlueprintCallable) void Refresh(hb::Actor* target);};',source='void ProbeDriver::Off(hb::Actor* target){hb::ReflectionProbes::SetIntensity(target,0);}void ProbeDriver::Refresh(hb::Actor* target){hb::ReflectionProbes::Refresh(target);}';
  const bp=createAsset('blueprint','BP_Probe');bp.settings.parentClass='ProbeDriver';bp.native={...parseNativeHeader(header),header,source,headerPath:'Source/ProbeDriver.h',sourcePath:'Source/ProbeDriver.cpp'};bp.nodes=[];bp.edges=[];
  for(const [key,type,args] of [['I','nativeCall',{target:'Probe'}],['O','reflectionProbeIntensity',{target:'Probe',value:1}],['R','nativeCall',{target:'Probe'}],['D','reflectionProbeDiffuse',{target:'Probe',value:1}]]){const input=makeNode('input'),node=makeNode(type);input.options={key};if(type==='nativeCall')node.nativeId='ProbeDriver.'+(key==='I'?'Off':'Refresh');node.inputValues=args;bp.nodes.push(input,node);bp.edges.push({from:{node:input.id,pin:'then'},to:{node:node.id,pin:'exec'}});}bp.construction={nodes:[makeNode('construction')],edges:[],comments:[]};
  await write('Source/ProbeDriver.h',header);await write('Source/ProbeDriver.cpp',source);await write('Assets/BP_Probe.hbblueprint.json',bp);
  const glow=createAsset('material','M_ProbeGlow'),surface=makeMaterialNode('surface',200,0),color=makeMaterialNode('vector3',0,0);color.value=[4,0,0];glow.graph={nodes:[surface,color],edges:[{from:{node:color.id,pin:'value'},to:{node:surface.id,pin:'emissive'}}]};await write('Assets/M_ProbeGlow.hbmaterial.json',glow);
  const mirror=createAsset('material','M_Mirror');mirror.surface={...mirror.surface,color:'#ffffff',metalness:1,roughness:.04};await write('Assets/M_Mirror.hbmaterial.json',mirror);
  const fixture=structuredClone(scene);fixture.environment.sunEnabled=false;fixture.environment.groundColor='#000000';fixture.environment.skyEnabled=false;fixture.environment.fogEnabled=false;fixture.environment.cloudsEnabled=false;fixture.runtime.dimension='3d';const c=structuredClone(camera);c.position=[0,0,10];c.components=[makeSceneComponent('Camera',{main:true,projection:'orthographic',orthographicSize:4})];
  fixture.objects=[{...createPlacedObject('empty',{id:'ProbeDriver'}),blueprintAsset:'Assets/BP_Probe.hbblueprint.json'},c,{...createPlacedObject('reflectionProbe',{id:'Probe'}),position:[0,0,2],components:[makeSceneComponent('ReflectionProbe',{resolution:32,size:[20,20,20],blendDistance:0,boxProjection:false})]},{...createPlacedObject('cube',{id:'Mirror'}),position:[0,-2,1],scale:[4,4,.1],components:[makeSceneComponent('MeshRenderer',{material:'Assets/M_Mirror.hbmaterial.json'})]},{...createPlacedObject('cube',{id:'Glow'}),position:[0,-8,12],scale:[16,16,.2],components:[makeSceneComponent('MeshRenderer',{material:'Assets/M_ProbeGlow.hbmaterial.json'})]}];
  // The emitter is behind the main camera, but visible to the probe's +Z face.
  await write('Assets/Scenes/Probes.hbscene.json',fixture);
}
export async function runNativeProbes({evaluate,ready,inspect,capture,cdp,until}){
  await evaluate("window.hbPlayerDebug.open('Assets/Scenes/Probes.hbscene.json')");await ready();const initial=await inspect();assert.equal(initial.renderer.reflectionProbes,1);assert.ok(initial.renderer.probeTextureBytes>131072);assert.ok(initial.renderer.probeCaptures>0);
  const bright=(await capture('probe-reflection',[.5]))[0];assert.ok(bright[0]>150&&bright[0]-bright[1]>80,JSON.stringify(bright));const before=await inspect();await capture('probe-idle',[.5]);const idle=await inspect();assert.equal(idle.renderer.probeCaptures,before.renderer.probeCaptures);assert.equal(idle.renderer.probeDispatches,before.renderer.probeDispatches);
  await evaluate('window.hbPlayerDebug.call("ProbeDriver","ProbeDriver.Off",{target:"Probe"})');const dark=await until(async()=>{const p=(await capture('probe-cpp-off',[.5]))[0];return p[0]<bright[0]-80?p:null;},'C++ probe intensity');const off=await inspect();assert.equal(off.renderer.probeCaptures,initial.renderer.probeCaptures);
  for(const type of ['keyDown','keyUp'])await cdp('Input.dispatchKeyEvent',{type,key:'O',code:'KeyO',windowsVirtualKeyCode:79});await until(async()=> (await capture('probe-bp-on',[.5]))[0][0]>dark[0]+80,'Blueprint probe intensity');
  await evaluate('window.hbPlayerDebug.call("ProbeDriver","ProbeDriver.Refresh",{target:"Probe"})');await until(async()=> (await inspect()).renderer.probeCaptures>off.renderer.probeCaptures,'C++ probe refresh');const refreshed=await inspect();
  return {passed:true,initial,before,idle,off,refreshed,bright,dark,cppBlueprint:true,staticReuse:true};
}

export async function runWebProbes({evaluate,ready,inspect,pixels,cdp,until}){
  await evaluate("window.hbPlayerDebug.open('Assets/Scenes/Probes.hbscene.json')");await ready();const first=await inspect(),bright=await pixels('probe-reflection');assert.equal(first.renderer.probes.count,1);assert.ok(bright[0]>150&&bright[0]-bright[1]>80,JSON.stringify(bright));await pixels('probe-idle');const idle=await inspect();assert.equal(idle.renderer.probes.captures,first.renderer.probes.captures);
  await evaluate('window.hbPlayerDebug.call("ProbeDriver","ProbeDriver.Off",{target:"Probe"})');const dark=await until(async()=>{const p=await pixels('probe-cpp-off');return p[0]<bright[0]-80?p:null;},'C++ probe intensity');assert.equal((await inspect()).renderer.probes.captures,first.renderer.probes.captures);
  for(const type of ['keyDown','keyUp'])await cdp('Input.dispatchKeyEvent',{type,key:'O',code:'KeyO',windowsVirtualKeyCode:79});await until(async()=> (await pixels('probe-bp-on'))[0]>dark[0]+80,'Blueprint probe intensity');await evaluate('window.hbPlayerDebug.call("ProbeDriver","ProbeDriver.Refresh",{target:"Probe"})');await until(async()=> (await inspect()).renderer.probes.captures>first.renderer.probes.captures,'C++ probe refresh');const refreshed=await inspect();
  return {passed:true,first,idle,refreshed,bright,dark,cppBlueprint:true,staticReuse:true};
}
