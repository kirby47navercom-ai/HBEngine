import fs from 'node:fs/promises';
import {batch165Fixture} from './batch-165-fixture.mjs';
import {createAnimationGraph,makeAnimationNode} from '../prototype/animation-graph-assets.js';
import {parseNativeHeader} from '../prototype/native-model.js';
import {makeSceneComponent} from '../prototype/scene-components.js';
import {terrainBrush,editMesh} from '../prototype/world-assets.js';
import {createWidgetAsset,createWidgetNode} from '../prototype/ui-assets.js';
export async function batch166Fixture(dir){
 const result=await batch165Fixture(dir),{record,files}=result;
 const clip={version:1,name:'Heat',duration:1,tracks:[{name:'.position',type:'vector',times:[0,1],values:[0,0,0,0,0,0]}],curves:[{name:'Heat',target:'attribute',keys:[{time:0,value:0},{time:1,value:1}]}]},graph=createAnimationGraph('Heat'),node=makeAnimationNode('clip');node.properties.clip='Assets/SK_Heat.hbskeletalclip.json';node.properties.loop=false;graph.nodes.splice(1,0,node);graph.nodes.at(-1).inputs.pose=node.id;files['Assets/AG_Heat.hbanimgraph.json']=graph;files['Assets/SK_Heat.hbskeletalclip.json']=clip;
 const bp=files[record.manifest.startupBlueprint],header=bp.native.header.replace('float hp=0;','float hp=0; HB_PROPERTY(BlueprintReadWrite) float curveHeat=0;'),source=bp.native.source.replace('void BatchProbe::Setup(){','void BatchProbe::Setup(){hb::AnimationGraph::Play(this,"Assets/AG_Heat.hbanimgraph.json");').replace('void BatchProbe::Read(){','void BatchProbe::Read(){curveHeat=hb::AnimationGraph::GetCurve(this,"Heat");');bp.native={...parseNativeHeader(header),header,source,headerPath:'Source/BatchProbe.h',sourcePath:'Source/BatchProbe.cpp'};
 await record.project.write('Source/BatchProbe.h',header);await record.project.write('Source/BatchProbe.cpp',source);
 files['Assets/T_Ground.hbterrain.json']=terrainBrush(files['Assets/T_Ground.hbterrain.json'],{mode:'hole',position:[5,5],radius:2});files['Assets/SM_Box.hbmesh.json']=editMesh(files['Assets/SM_Box.hbmesh.json'],{operation:'flatNormals'});
 const widget=createWidgetAsset('HUD'),text=createWidgetNode('Text','Localized');Object.assign(text.properties,{stringTable:'Assets/ST_Game.hbstrings.json',textKey:'Example',style:'Assets/US_Game.hbuistyle.json'});widget.nodes.push(text);files['Assets/W_HUD.hbwidget.json']=widget;
 for(const [p,data] of Object.entries(files))await record.project.write(p,JSON.stringify(data));const scene=JSON.parse(await fs.readFile((await record.project.read(record.manifest.startupScene)).file,'utf8'));scene.objects.find(o=>o.id==='Director').components.push(makeSceneComponent('Light2D'));await record.project.write(record.manifest.startupScene,JSON.stringify(scene));return result;
}
