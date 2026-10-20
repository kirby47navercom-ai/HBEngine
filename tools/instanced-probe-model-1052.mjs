import {BoxGeometry} from 'three';
import {createWorldAsset} from '../prototype/world-assets.js';

// Real importer input, rather than injecting a Three mesh into the runtime.
export function instancedProbeModel1052(){
 const geometry=new BoxGeometry(),chunks=[],bufferViews=[],accessors=[];let size=0;
 const add=(array,type,count,target)=>{const bytes=Buffer.from(array.buffer,array.byteOffset,array.byteLength);bufferViews.push({buffer:0,byteOffset:size,byteLength:bytes.length,...target?{target}:{}});chunks.push(bytes);size+=bytes.length;const accessor={bufferView:bufferViews.length-1,componentType:array instanceof Uint16Array?5123:5126,count,type};accessors.push(accessor);return accessors.length-1;};
 const position=add(geometry.attributes.position.array,'VEC3',geometry.attributes.position.count,34962);accessors[position].min=[-.5,-.5,-.5];accessors[position].max=[.5,.5,.5];const normal=add(geometry.attributes.normal.array,'VEC3',geometry.attributes.normal.count,34962),uv=add(geometry.attributes.uv.array,'VEC2',geometry.attributes.uv.count,34962),indices=add(geometry.index.array,'SCALAR',geometry.index.count,34963),translation=add(new Float32Array([-9.7,-.8,1,-8,.3,1]),'VEC3',2),scale=add(new Float32Array([.6,2,.1,.4,.4,.1]),'VEC3',2),data=Buffer.concat(chunks);geometry.dispose();
 return{asset:{version:'2.0',generator:'HBEngine owned probe fixture1052'},extensionsUsed:['EXT_mesh_gpu_instancing'],extensionsRequired:['EXT_mesh_gpu_instancing'],scene:0,scenes:[{nodes:[0]}],nodes:[{name:'ProbeInstances',mesh:0,extensions:{EXT_mesh_gpu_instancing:{attributes:{TRANSLATION:translation,SCALE:scale}}}}],meshes:[{primitives:[{attributes:{POSITION:position,NORMAL:normal,TEXCOORD_0:uv},indices,material:0}]}],materials:[{pbrMetallicRoughness:{baseColorFactor:[1,1,1,1],metallicFactor:1,roughnessFactor:.04}}],buffers:[{byteLength:data.length,uri:'data:application/octet-stream;base64,'+data.toString('base64')}],bufferViews,accessors};
}

// The engine's existing editable mesh/foliage JSON authoring path uses the same
// runtime instance bounds; no glTF/base64 editing is needed for this variant.
export function instancedProbeFoliage1054(){
 const geometry=new BoxGeometry(),mesh=createWorldAsset('mesh','ProbeBox');mesh.vertices=Array.from({length:geometry.attributes.position.count},(_,i)=>[geometry.attributes.position.getX(i),geometry.attributes.position.getY(i),geometry.attributes.position.getZ(i)]);mesh.normals=Array.from({length:geometry.attributes.normal.count},(_,i)=>[geometry.attributes.normal.getX(i),geometry.attributes.normal.getY(i),geometry.attributes.normal.getZ(i)]);mesh.uvs=Array.from({length:geometry.attributes.uv.count},(_,i)=>[geometry.attributes.uv.getX(i),geometry.attributes.uv.getY(i)]);mesh.indices=[...geometry.index.array];geometry.dispose();const foliage=createWorldAsset('foliage','ProbeFoliage');foliage.mesh='Assets/ProbeBox.hbmesh.json';foliage.instances=[{id:'first',position:[-9.7,-.8,1],rotation:[0,0,0],scale:[.6,2,.1]},{id:'second',position:[-8,.3,1],rotation:[0,0,0],scale:[.4,.4,.1]}];return{'Assets/ProbeBox.hbmesh.json':mesh,'Assets/ProbeFoliage.hbfoliage.json':foliage};
}
