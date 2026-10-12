import assert from 'node:assert/strict';
import {createPlacedObject} from '../prototype/placement-catalog.js';
import {makeSceneComponent} from '../prototype/scene-components.js';

export async function writeRendering102(write,scene){
 const base=structuredClone(scene);base.runtime.dimension='3d';Object.assign(base.environment,{sunEnabled:false,skyEnabled:false,fogEnabled:false,cloudsEnabled:false,groundColor:'#000000'});
 const cube=(id,position,scale,material)=>({...createPlacedObject('cube',{id}),position,scale,components:[makeSceneComponent('MeshRenderer',{material:'Assets/'+material+'.hbmaterial.json'})]});
 const camera={...createPlacedObject('camera',{id:'Camera'}),position:[0,0,10],components:[makeSceneComponent('Camera',{main:true,projection:'orthographic',orthographicSize:4})]},post={...createPlacedObject('empty',{id:'Post'}),components:[makeSceneComponent('PostProcessVolume',{bloomEnabled:false,screenRaySteps:8,screenRayRefineSteps:0,screenRayDistance:4,screenRayThickness:.01})]},driver={...createPlacedObject('empty',{id:'PostDriver'}),blueprintAsset:'Assets/BP_PostDriver.hbblueprint.json'};
 const receiver=cube('Receiver',[0,0,0],[8,2,.1],'M_ScreenMirror');receiver.rotation=[60,0,0];
 await write('Assets/Scenes/Ray102.hbscene.json',{...base,objects:[driver,camera,post,receiver,cube('Emitter',[0,-1.6,-.65],[3,1.2,.1],'M_ScreenEmitter')]});
 const diffuse=structuredClone(receiver);diffuse.components[0].properties.material='Assets/M_ScreenDiffuse.hbmaterial.json';await write('Assets/Scenes/RayGI102.hbscene.json',{...base,objects:[driver,camera,post,diffuse,cube('Emitter',[.83,-3.5,-.60],[1.6,1.8,.1],'M_ScreenEmitter')]});
}
export async function checkRendering102({evaluate,ready,inspect,pixels,cdp,until}){
 const open=async name=>{await evaluate('window.hbPlayerDebug.open('+JSON.stringify('Assets/Scenes/'+name+'.hbscene.json')+')');await ready();},call=(name,args)=>evaluate('window.hbPlayerDebug.call("PostDriver","PostDriver.'+name+'",'+JSON.stringify({target:'Post',...args})+')'),f=(property,value)=>call('Float',{property,value}),b=(property,value)=>call('Bool',{property,value});
 await open('Ray102');const off=await pixels('102-off');await b('ssrEnabled',true);const coarse=await pixels('102-coarse');assert.ok(Math.abs(coarse[0]-off[0])<=2,JSON.stringify({off,coarse}));await f('screenRayRefineSteps',8);const fine=await pixels('102-fine');assert.ok(fine[0]>off[0]+10,JSON.stringify({off,coarse,fine}));await f('screenRayEdgeFade',.5);const edge=await pixels('102-edge');assert.ok(edge[0]<fine[0]-2,JSON.stringify({fine,edge}));await f('screenRayEdgeFade',.08);await f('screenRayRefineSteps',0);for(const type of ['keyDown','keyUp'])await cdp('Input.dispatchKeyEvent',{type,key:'K',code:'KeyK',windowsVirtualKeyCode:75});await until(async()=> (await inspect()).objects.find(o=>o.id==='Post').components.find(c=>c.type==='PostProcessVolume').properties.screenRayRefineSteps===8,'Blueprint K 광선 정밀');const bp=await pixels('102-blueprint');assert.deepEqual(bp,fine);
 await open('RayGI102');const giOff=await pixels('102-gi-off');await b('ssgiEnabled',true);await f('ssgiStrength',4);await f('screenRayRefineSteps',8);const gi=await pixels('102-gi-fine');assert.ok(gi[0]>giOff[0]+5,JSON.stringify({giOff,gi}));await b('ssgiEnabled',false);assert.deepEqual(await pixels('102-disabled'),giOff);
 return {passed:true,off,coarse,fine,edge,bp,giOff,gi,typedCpp:true,actualBlueprintK:true,scope:'Thin screen-depth intersections and edge fade; no Hi-Z/geometry RT or whole-game FPS assertion.'};
}
