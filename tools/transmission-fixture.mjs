import assert from 'node:assert/strict';
import {createAsset} from '../prototype/asset-documents.js';
import {createPlacedObject} from '../prototype/placement-catalog.js';
import {makeSceneComponent} from '../prototype/scene-components.js';
import {makeMaterialNode} from '../prototype/material-runtime.js';
import {makeNode} from '../prototype/blueprint-model.js';
import {writeCoatingFixture} from './coating-fixture.mjs';

export function transmissionMaterial(tilt=false){
  const material=createAsset('material','M_Transmission');Object.assign(material.surface,{color:'#ffffff',roughness:0,metalness:0,transmission:0,thickness:0,ior:1.5});
  if(tilt){const node=makeMaterialNode('vector3');node.value=[.8,0,1];material.graph.nodes.push(node);material.graph.edges.push({from:{node:node.id,pin:'value'},to:{node:'surface',pin:'normal'}});}
  return material;
}
export async function writeTransmissionFixture(write,scene){
  await writeCoatingFixture(write,scene);
  const bp=createAsset('blueprint','BP_Transmission'),input=makeNode('input'),set=makeNode('materialFloat');input.options={key:'T'};set.inputValues={target:'Coated',parameter:'Transmission',value:1};bp.nodes=[input,set];bp.edges=[{from:{node:input.id,pin:'then'},to:{node:set.id,pin:'exec'}}];bp.construction={nodes:[makeNode('construction')],edges:[],comments:[]};await write('Assets/BP_Transmission.hbblueprint.json',bp);
  for(const color of ['Red','Green']){const material=createAsset('material','M_Back'+color);Object.assign(material.surface,{color:'#000000',emissive:color==='Red'?'#ff0000':'#00ff00',emissiveIntensity:1,metalness:0});await write('Assets/M_Back'+color+'.hbmaterial.json',material);}
  for(const tilt of [false,true]){
    const name=tilt?'TransmissionTilt':'Transmission',fixture=structuredClone(scene);fixture.runtime.dimension='3d';Object.assign(fixture.environment,{sunEnabled:false,skyEnabled:false,fogEnabled:false,cloudsEnabled:false,groundColor:'#000000'});
    fixture.objects=[{...createPlacedObject('empty',{id:'CoatingDriver'}),blueprintAsset:'Assets/BP_Coating.hbblueprint.json'}, {...createPlacedObject('empty',{id:'TransmissionDriver'}),blueprintAsset:'Assets/BP_Transmission.hbblueprint.json'}, {...createPlacedObject('camera',{id:'Camera'}),position:[0,0,10],rotation:[0,0,0],components:[makeSceneComponent('Camera',{main:true,projection:'orthographic',orthographicSize:4})]}, {...createPlacedObject('cube',{id:'Coated'}),position:[0,-2,0],scale:[4,4,1],components:[makeSceneComponent('MeshRenderer',{material:'Assets/M_'+name+'.hbmaterial.json'})]}, ...['Red','Green'].map((color,i)=>({...createPlacedObject('cube',{id:'Back'+color}),position:[i?2:-2,-4,-3],scale:[4,8,1],components:[makeSceneComponent('MeshRenderer',{material:'Assets/M_Back'+color+'.hbmaterial.json'})]}))];
    const red=fixture.objects.find(o=>o.id==='BackRed'),green=fixture.objects.find(o=>o.id==='BackGreen');red.position=[0,-4,-4];red.scale=[8,8,1];green.position=[0,-4,-3];green.scale=[.4,8,1];
    await write('Assets/M_'+name+'.hbmaterial.json',transmissionMaterial(tilt));await write('Assets/Scenes/'+name+'.hbscene.json',fixture);
  }
}
export async function checkTransmissionPlayer({evaluate,ready,inspect,pixels,cdp,until}){
  const set=(parameter,value)=>evaluate('window.hbPlayerDebug.call("CoatingDriver","CoatingDriver.Set",'+JSON.stringify({target:'Coated',parameter,value})+')'),state=async()=>{const s=await inspect();return {renderer:s.renderer,material:s.materials.find(m=>m.object==='Coated')};};
  await evaluate('window.hbPlayerDebug.open("Assets/Scenes/Transmission.hbscene.json")');await ready();const off=await pixels('transmission-off'),initial=await state();
  await set('Transmission',1);await set('IOR',1);const on=await pixels('transmission-thin'),active=await state();assert.ok(on[1]>on[0]+50&&on[1]>off[1]+50,JSON.stringify({off,on}));assert.notDeepEqual(on,off);
  await set('Transmission',0);for(const type of ['keyDown','keyUp'])await cdp('Input.dispatchKeyEvent',{type,key:'T',code:'KeyT',windowsVirtualKeyCode:84});await until(async()=> (await state()).material.surface.transmission===1,'Blueprint 투과');const bp=await pixels('transmission-bp');assert.deepEqual(bp,on);
  const reuse=await state();assert.equal(reuse.material.id,active.material.id);assert.equal(reuse.material.version,active.material.version);if(active.material.program){assert.equal(reuse.material.program,active.material.program);assert.equal(reuse.renderer.uploads,active.renderer.uploads);assert.ok(reuse.renderer.transmissionTextureBytes>0);assert.equal(reuse.renderer.bloomDispatches,0);}
  await evaluate('window.hbPlayerDebug.open("Assets/Scenes/TransmissionTilt.hbscene.json")');await ready();await set('Transmission',1);await set('Thickness',.3);await set('IOR',1);const straight=await pixels('transmission-ior-one');await set('IOR',1.5);const bent=await pixels('transmission-refracted');assert.ok(Math.abs(straight[0]-bent[0])+Math.abs(straight[1]-bent[1])>40,JSON.stringify({straight,bent}));
  await set('Roughness',1);const rough=await pixels('transmission-rough');assert.notDeepEqual(rough,bent);
  await set('Transmission',0);const released=await state();await pixels('transmission-released');const final=await state();if(final.material.program)assert.equal(final.renderer.transmissionTextureBytes,0);
  return {passed:true,off,on,bp,straight,bent,rough,initial,active,reuse,released,final,cppBlueprint:true,screenSpaceOpaqueCapture:true,roughMip:true,uniformReuse:true,releaseWhenUnused:true,recursiveOrDepthTrace:false,fpsClaim:false};
}
