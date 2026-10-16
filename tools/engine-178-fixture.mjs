import fs from 'node:fs/promises';
import * as THREE from 'three';
import {engine177Fixture} from './engine-177-fixture.mjs';
import {createAnimationGraph,makeAnimationNode} from '../prototype/animation-graph-assets.js';
import {parseNativeHeader} from '../prototype/native-model.js';
import {makeSceneComponent as component} from '../prototype/scene-components.js';
export function importModelFixture(){
 const geometry=new THREE.BoxGeometry(100,100,100),views=[],chunks=[];let offset=0;
 const add=array=>{const bytes=Buffer.from(array.buffer,array.byteOffset,array.byteLength);views.push({buffer:0,byteOffset:offset,byteLength:bytes.length});chunks.push(bytes);offset+=bytes.length;return views.length-1;};
 const position=add(geometry.attributes.position.array),normal=add(geometry.attributes.normal.array),index=add(geometry.index.array),time=add(new Float32Array([0,1])),motion=add(new Float32Array([0,0,0,100,0,0]));
 const buffer=Buffer.concat(chunks),primitive={attributes:{POSITION:0,NORMAL:1},indices:2,material:0};geometry.dispose();
 return {asset:{version:'2.0'},scene:0,scenes:[{nodes:[0,1]}],nodes:[{name:'Mover',mesh:0},{name:'Other',mesh:1,translation:[200,0,0]}],meshes:[{name:'Repeated',primitives:[primitive]},{name:'Repeated',primitives:[primitive]}],materials:[{name:'Paint',pbrMetallicRoughness:{baseColorFactor:[.9,.55,.15,1],metallicFactor:0,roughnessFactor:.6}}],buffers:[{uri:'data:application/octet-stream;base64,'+buffer.toString('base64'),byteLength:buffer.length}],bufferViews:views,accessors:[{bufferView:position,componentType:5126,count:24,type:'VEC3',min:[-50,-50,-50],max:[50,50,50]},{bufferView:normal,componentType:5126,count:24,type:'VEC3'},{bufferView:index,componentType:5123,count:36,type:'SCALAR'},{bufferView:time,componentType:5126,count:2,type:'SCALAR',min:[0],max:[1]},{bufferView:motion,componentType:5126,count:2,type:'VEC3'}],animations:[{name:'ImportedMove',samplers:[{input:3,output:4,interpolation:'LINEAR'}],channels:[{sampler:0,target:{node:0,path:'translation'}}]}]};
}
export const realMeshFBX=Buffer.from(`; FBX 7.4.0 project file
FBXHeaderExtension:  {
 FBXVersion: 7400
}
GlobalSettings:  {
 Properties70:  {
  P: "UnitScaleFactor", "double", "Number", "",1
  P: "UpAxis", "int", "Integer", "",1
 }
}
Objects:  {
 Geometry: 1000, "Geometry::Triangle", "Mesh" {
  Vertices: *9 {
   a: 0,0,0,100,0,0,0,100,0
  }
  PolygonVertexIndex: *3 {
   a: 0,1,-3
  }
 }
 Model: 1001, "Model::Twin", "Mesh" {
  Version: 232
 }
 Model: 1002, "Model::Twin", "Mesh" {
  Version: 232
 }
}
Connections:  {
 C: "OO",1000,1001
 C: "OO",1000,1002
 C: "OO",1001,0
 C: "OO",1002,0
}
`.replace(/^ +/gm,spaces=>'\t'.repeat(spaces.length)));
export async function engine178Fixture(dir){
 const fixture=await engine177Fixture(dir),{record,blueprint:bp}=fixture,modelPath='Assets/Models/Imported.gltf';
 await record.project.write(modelPath,JSON.stringify(importModelFixture()));await record.project.import('Assets/Models','Twin.fbx',realMeshFBX);
 const prepared=await record.project.prepareModelImport(modelPath),metadata=prepared.data;
 metadata.settings={...metadata.settings,scale:.01,sourceUp:'x'};metadata.subassets.find(row=>row.kind==='mesh'&&row.sourceIndex===1).overrides.visible=false;
 await record.project.write(prepared.path,JSON.stringify(metadata));
 const graph=createAnimationGraph('Imported'),clip=makeAnimationNode('clip');clip.properties.clip='ImportedMove';clip.properties.rootMotion={enabled:true,bone:'Mover',lock:'first',forceLock:false};graph.rootMotionMode='all';graph.model=modelPath;graph.nodes=[clip,graph.nodes.find(node=>node.type==='output')];graph.nodes[1].inputs.pose=clip.id;
 await record.project.write('Assets/AG_Imported.hbanimgraph.json',JSON.stringify(graph));
 const scene=JSON.parse(await fs.readFile((await record.project.read(record.manifest.startupScene)).file,'utf8'));
 scene.objects.push({id:'Imported',name:'Imported',asset:modelPath,kind:'model',position:[-3,2,0],rotation:[0,0,0],scale:[1,1,1],visible:true,components:[component('AnimationGraph',{asset:'Assets/AG_Imported.hbanimgraph.json'})]});await record.project.write(record.manifest.startupScene,JSON.stringify(scene));
 const header=bp.native.header.replace('};','HB_FUNCTION(BlueprintCallable) hb::Vec3 ImportedMotion();};'),source=bp.native.source+'\nhb::Vec3 AuthoringProbe::ImportedMotion(){return hb::AnimationGraph::GetRootMotionPosition(hb::Scene::FindActorById("Imported"));}';
 bp.native={...parseNativeHeader(header),header,source,headerPath:bp.native.headerPath,sourcePath:bp.native.sourcePath};await record.project.write(record.manifest.startupBlueprint,JSON.stringify(bp));await record.project.write(bp.native.headerPath,header);await record.project.write(bp.native.sourcePath,source);
 return {...fixture,blueprint:bp,modelPath,metadataPath:prepared.path};
}
