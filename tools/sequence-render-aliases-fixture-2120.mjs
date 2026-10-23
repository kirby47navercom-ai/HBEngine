import fs from 'node:fs/promises';
import path from 'node:path';
import {indexedTransformsFixture} from './sequence-indexed-transforms-fixture-2103.mjs';
import {createAsset} from '../prototype/asset-documents.js';
import {createPlacedObject} from '../prototype/placement-catalog.js';
import {makeSceneComponent} from '../prototype/scene-components.js';
import {makeSequenceTrack} from '../prototype/gameplay-assets.js';
import {parseNativeHeader} from '../prototype/native-model.js';

// One owned project covers the pending indexed rig and renderer parameter work.
export async function renderAliasesFixture(work){
 const f=await indexedTransformsFixture(work),p=f.record.project,read=async asset=>JSON.parse(await fs.readFile(path.join(f.record.root,asset),'utf8')),materialPath='Assets/SequenceSurface.hbmaterial.json',material=createAsset('material','SequenceSurface');
 material.graph.edges=[];material.surface.roughness=.6;material.surface.color=[.2,.3,.4];await p.write(materialPath,JSON.stringify(material));
 const scene=await read(f.record.manifest.startupScene),cube=scene.objects.find(o=>o.id==='Cube');cube.components=[makeSceneComponent('MeshRenderer',{material:materialPath},'Mesh')];scene.objects.push({...createPlacedObject('empty',{id:'Lamp'}),components:[makeSceneComponent('Light2D',{intensity:2},'Light')]});await p.write(f.record.manifest.startupScene,JSON.stringify(scene));
 const render={material:materialPath},track=(type,value,extra={})=>({...makeSequenceTrack(type),target:['material','materialVector'].includes(type)?'Cube':'Lamp',keys:[{time:0,value}],...extra}),light=scene.objects.find(o=>o.id==='Lamp').components[0],take=()=>track('componentState',{...structuredClone(light),properties:{...light.properties,intensity:7}},{component:'Light'});
 for(const [name,tracks,settings]of[
  ['low',[track('material',.2,{name:'Roughness'}),track('materialVector',[.2,.4,.6],{name:'BaseColor'}),track('light',10)],{weight:.25,blendMode:'normalized'}],
  ['high',[track('material',.8,{name:'roughness'}),track('materialVector',[1,.8,.2],{name:'color'}),track('component',30,{component:'Light',componentType:'Light2D',property:'intensity'})],{weight:.75,blendMode:'normalized'}],
  ['order',[track('material',.3,{name:'Roughness'}),track('material',.9,{name:'roughness'}),track('materialVector',[.1,.2,.3],{name:'BaseColor'}),track('materialVector',[.7,.1,.9],{name:'Color'}),track('light',10),take()],{}],
  ['keep',[track('material',.4,{name:'Roughness',completionMode:'keep'}),track('materialVector',[.4,.5,.6],{name:'Color',completionMode:'keep'}),track('light',4,{completionMode:'keep'})],{}],
  ['force',[track('material',.9,{name:'roughness',completionMode:'keep'}),track('materialVector',[.9,.8,.7],{name:'BaseColor',completionMode:'keep'}),track('light',9,{completionMode:'keep'})],{forceRestore:true}]
 ]){const asset='Assets/LS_Render_'+name+'.hbsequence.json';render[name]=asset;await p.write(asset,JSON.stringify({...createAsset('sequenceasset','Render_'+name),length:4,tracks,...settings}));}
 const bp=await read(f.record.manifest.startupBlueprint),header=bp.native.header.replace('public:','public:HB_PROPERTY(BlueprintReadOnly) float LampIntensity=-999;'),source=bp.native.source.replace('void MixProbe::Probe(){','void MixProbe::Probe(){LampIntensity=hb::Light2D::GetIntensity(hb::Scene::FindActorById("Lamp"));');bp.native={...bp.native,...parseNativeHeader(header),header,source};for(const [asset,data]of[[bp.native.headerPath,header],[bp.native.sourcePath,source],[f.record.manifest.startupBlueprint,JSON.stringify(bp)]])await p.write(asset,data);
 return {...f,paths:{...f.paths,render}};
}
