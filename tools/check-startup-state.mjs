import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import * as THREE from 'three';
import {createAsset} from '../prototype/asset-documents.js';
import {makeNode,legacyTemplateConstruction} from '../prototype/blueprint-model.js';
import {makeSceneComponent} from '../prototype/scene-components.js';
import {BlueprintRuntime} from '../prototype/blueprint-runtime.js';
import {engineOperations} from '../prototype/engine-services.js';
import {parseNativeHeader,nativeRequestWorld} from '../prototype/native-model.js';
import {NativeHost} from './native-host.mjs';
const legacy={nodes:[{id:'construction',key:'construction',position:{x:28,y:50},splitPins:[]},{id:'setup',key:'setPosition',position:{x:290,y:50},splitPins:[]}],edges:[{from:{node:'construction',pin:'then'},to:{node:'setup',pin:'exec'}}],comments:[]};
const hud=createAsset('widget','W_HUD');hud.nodes.push({id:'title',name:'Title',type:'Text',parent:'root',slot:structuredClone(hud.nodes[0].slot),properties:{...structuredClone(hud.nodes[0].properties),text:'before'},bindings:{},events:{}});
const dir=await fs.mkdtemp(path.join(path.resolve('native/build'),'startup-state-')),host=new NativeHost();
const header='#include <HBEngine/Game.hpp>\nHB_CLASS(Blueprintable)\nclass StartupProbe: public hb::Actor {public: HB_FUNCTION(BlueprintCallable) void Initialize(); HB_FUNCTION(BlueprintPure) hb::Vec3 Position() const;};',source='void StartupProbe::Initialize(){hb::UI::SetText(this,"HUD","Title","시작 직후");} hb::Vec3 StartupProbe::Position() const{return transform.position;}';
try{
  const build=await host.build(header,source),results=[];
  for(const mode of ['new','legacy','authored']){
    const bp=createAsset('blueprint','BP_Startup');bp.native={...parseNativeHeader(header),header,source};bp.settings.parentClass='StartupProbe';
    if(mode==='legacy')bp.construction=structuredClone(legacy);
    if(mode==='authored'){bp.construction=structuredClone(legacy);bp.construction.nodes[1].inputValues={position:[7,8,9]};}
    assert.equal(legacyTemplateConstruction(bp.construction),mode==='legacy');
    const call=makeNode('nativeCall');call.nativeId='StartupProbe.Initialize';bp.construction.nodes.push(call);if(mode!=='legacy')bp.construction.edges.push({from:{node:mode==='authored'?'setup':'construction',pin:'then'},to:{node:call.id,pin:'exec'}});
    // Keep the historical graph byte-for-byte; execute native initialization at BeginPlay.
    if(mode==='legacy'){bp.construction.nodes.pop();bp.nodes.push(call);bp.edges.push({from:{node:'beginPlay',pin:'then'},to:{node:call.id,pin:'exec'}});}
    const actor={id:'Player',name:'Player',kind:'sprite',visible:true,position:[3,-8,.1],rotation:[0,0,20],scale:[2,3,1],nativeClass:'StartupProbe',nativeProperties:{},components:[makeSceneComponent('UIWidget',{asset:'HUD',instance:'HUD'})]},group=new THREE.Group(),services=engineOperations({readAsset:async()=>{await new Promise(r=>setTimeout(r,2));return hud;},mesh:()=>group,meshes:()=>[group],scene:()=>new THREE.Scene(),update:()=>{}});
    let vm;const native=async request=>{const result=await host.call(build.token,{...request,objects:nativeRequestWorld([actor],new Set(),request,build.metadata)});for(const state of result.objects)Object.assign(actor,state);for(const command of result.operations)await services.operation(command.key,command.args,vm.bindings[0],vm);return result;};
    vm=new BlueprintRuntime([actor],[{root:bp,self:actor.id}],{...services,native});const original=JSON.stringify(bp);await host.call(build.token,{command:'reset',objects:[]});await vm.start();
    const expected=mode==='authored'?[7,8,9]:[3,-8,.1];actor.position.forEach((v,i)=>assert.ok(Math.abs(v-expected[i])<1e-5,'placed position '+mode));assert.deepEqual(actor.rotation,[0,0,20]);assert.deepEqual(actor.scale,[2,3,1]);assert.equal(actor.gameplayDebug.ui.HUD.Title.text,'시작 직후','C++ updates HUD before first tick');
    const pos=await native({key:'nativeCall',nativeId:'StartupProbe.Position',args:{target:actor.id},self:actor.id});pos.outputs.result.forEach((v,i)=>assert.ok(Math.abs(v-expected[i])<1e-5));assert.equal(JSON.stringify(bp),original,'source blueprint preserved');results.push({mode,position:actor.position,text:actor.gameplayDebug.ui.HUD.Title.text,firstTickRequired:false});await vm.stop();services.dispose();
  }
  await fs.writeFile(path.join(dir,'acceptance.json'),JSON.stringify({ok:true,results},null,2));console.log('Placed transform / exact legacy template / explicit construction / C++ HUD before first tick:',dir);
}catch(error){console.error('Startup evidence:',dir);throw error;}finally{host.close();}
