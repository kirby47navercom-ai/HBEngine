import fs from 'node:fs/promises';
import path from 'node:path';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const limit=64*1024*1024;
const integer=value=>Number.isInteger(value)&&value>=0;
function glb(source){
  if(source.length<20||source.readUInt32LE(0)!==0x46546c67||source.readUInt32LE(4)!==2||source.readUInt32LE(8)!==source.length)throw Error('GLB 헤더 오류');
  let json,binary,offset=12,index=0;
  while(offset<source.length){
    if(offset+8>source.length)throw Error('GLB 청크 헤더 오류');const size=source.readUInt32LE(offset),type=source.readUInt32LE(offset+4);offset+=8;
    if(size%4||offset+size>source.length)throw Error('GLB 청크 범위 오류');
    if(index===0&&type!==0x4e4f534a)throw Error('GLB 첫 청크는 JSON이어야 해요.');
    if(type===0x4e4f534a){if(index!==0)throw Error('GLB JSON 청크 중복');json=JSON.parse(source.subarray(offset,offset+size).toString('utf8'));}
    else if(type===0x004e4942){if(index!==1||binary)throw Error('GLB BIN 청크 순서 오류');binary=source.subarray(offset,offset+size);}
    offset+=size;index++;
  }
  return {json,binary};
}
function checkHierarchy(nodes){
  const states=new Map(),heights=new Map();
  const parents=new Set();for(const node of nodes)for(const child of node.children||[]){if(parents.has(child))throw Error('glTF 노드 부모 중복');parents.add(child);}
  const visit=(index,depth=1)=>{if(depth>128)throw Error('glTF 노드 깊이 제한128');if(!integer(index)||index>=nodes.length)throw Error('glTF 노드 참조 오류');if(states.get(index)===1)throw Error('glTF 노드 순환');if(states.get(index)===2)return heights.get(index);states.set(index,1);const children=nodes[index].children||[];if(!Array.isArray(children)||children.length>10000)throw Error('glTF 자식 노드 오류');let height=1;for(const child of children)height=Math.max(height,1+visit(child,depth+1));if(height>128)throw Error('glTF 노드 깊이 제한128');heights.set(index,height);states.set(index,2);return height;};
  for(let i=0;i<nodes.length;i++)visit(i);
}

// Reuse the game's loader for hierarchy, skins, names and interpolation. Meshes are
// pose targets only; buffer views are read lazily without fetching textures or URLs.
export async function loadHeadlessModel(project,name){
  if(!/\.(gltf|glb)$/i.test(name))throw Error('화면 없는 모델 포즈 로드는 glTF/GLB를 사용하세요: '+name);
  const read=async source=>{const {file,size}=await project.read(source);if(size>limit)throw Error('모델 포즈 원본은 64 MiB까지 지원해요.');const bytes=await fs.readFile(file);if(bytes.length>limit)throw Error('모델 포즈 원본은 64 MiB까지 지원해요.');return bytes;};
  const source=await read(name),{json,binary}=/\.glb$/i.test(name)?glb(source):{json:JSON.parse(source.toString('utf8'))};
  if(json?.asset?.version!=='2.0'||json.asset.minVersion&&json.asset.minVersion!=='2.0')throw Error('glTF 모델 포즈 버전 오류');
  for(const [key,max] of [['nodes',10000],['buffers',1024],['bufferViews',16384],['accessors',16384],['meshes',10000],['skins',1024],['animations',1024]])if(json[key]!==undefined&&(!Array.isArray(json[key])||json[key].length>max))throw Error('glTF 모델 포즈 개수 오류: '+key);
  checkHierarchy(json.nodes||[]);
  for(const accessor of json.accessors||[]){const components={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16}[accessor.type];if(!components||!integer(accessor.count)||accessor.count*components*4>limit)throw Error('glTF 포즈 접근자 크기 오류');}
  if((json.extensionsUsed||[]).includes('EXT_mesh_gpu_instancing'))throw Error('화면 없는 포즈 검사는 GPU 인스턴스 모델을 지원하지 않아요.');
  const buffers=new Map(),resources=new Set();let total=source.length;
  const loadBuffer=index=>{
    if(!buffers.has(index))buffers.set(index,(async()=>{
      const buffer=json.buffers?.[index];if(!buffer||!integer(buffer.byteLength)||!buffer.byteLength||buffer.byteLength>limit)throw Error('glTF 버퍼 길이 오류');let bytes;
      if(buffer.uri===undefined){if(index!==0||!binary||binary.length<buffer.byteLength||binary.length>buffer.byteLength+3)throw Error('glTF BIN 버퍼 길이 오류');bytes=binary.subarray(0,buffer.byteLength);}
      else if(typeof buffer.uri!=='string')throw Error('glTF 버퍼 주소 오류');
      else if(/^data:/i.test(buffer.uri)){if(!/^data:application\/(?:octet-stream|gltf-buffer);base64,/i.test(buffer.uri))throw Error('glTF data 버퍼 형식 오류');const encoded=buffer.uri.slice(buffer.uri.indexOf(',')+1);if(!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded))throw Error('glTF base64 버퍼 오류');bytes=Buffer.from(encoded,'base64');}
      else {const uri=decodeURIComponent(buffer.uri);if(/^(?:[a-z][a-z0-9+.-]*:|[\\/])/i.test(uri)||uri.includes('\\')||/[?#]/.test(uri))throw Error('모델 버퍼는 프로젝트 내부 파일을 사용하세요.');bytes=await read(path.posix.normalize(path.posix.join(path.posix.dirname(name),uri)));}
      if(bytes.length<buffer.byteLength)throw Error('glTF 버퍼가 선언보다 짧아요.');total+=bytes.length;if(total>limit*2)throw Error('모델 포즈 버퍼 총량 제한128 MiB');return bytes.subarray(0,buffer.byteLength);
    })());return buffers.get(index);
  };
  const manager=new THREE.LoadingManager();manager.setURLModifier(()=>{throw Error('화면 없는 포즈 로드는 외부 주소를 읽지 않아요.');});
  const loader=new GLTFLoader(manager);loader.register(parser=>({name:'HB_HEADLESS_POSE',
    loadBufferView:async index=>{const view=json.bufferViews?.[index],offset=view?.byteOffset??0;if(!view||!integer(offset)||!integer(view.byteLength)||!view.byteLength)throw Error('glTF 버퍼 뷰 범위 오류');if(view.extensions?.EXT_meshopt_compression||view.extensions?.KHR_meshopt_compression)throw Error('압축 포즈 버퍼에는 디코더가 필요해요.');const bytes=await loadBuffer(view.buffer);if(offset+view.byteLength>bytes.length)throw Error('glTF 버퍼 뷰 범위 오류');const result=bytes.subarray(offset,offset+view.byteLength);return result.buffer.slice(result.byteOffset,result.byteOffset+result.byteLength);},
    loadMesh:async index=>{
      const definition=parser.json.meshes[index],group=new THREE.Group();if(!Array.isArray(definition.primitives)||!definition.primitives.length||definition.primitives.length>256)throw Error('glTF 포즈 메시 개수 오류');
      for(const primitive of definition.primitives){const count=primitive.targets?.length||0;if(count>64)throw Error('glTF 모프 타깃 개수 제한64');const geometry=new THREE.BufferGeometry(),material=new THREE.MeshBasicMaterial();resources.add(geometry);resources.add(material);const mesh=definition.isSkinnedMesh?new THREE.SkinnedMesh(geometry,material):new THREE.Mesh(geometry,material);mesh.name=parser.createUniqueName(definition.name||'mesh_'+index);
        if(count){mesh.morphTargetInfluences=Array.from({length:count},(_,i)=>definition.weights?.[i]??0);mesh.morphTargetDictionary=Object.fromEntries(Array.from({length:count},(_,i)=>[definition.extras?.targetNames?.[i]||String(i),i]));}group.add(mesh);
      }return group.children.length===1?group.children[0]:group;
    }
  }));
  try{const result=await loader.parseAsync(JSON.stringify(json),'');if(!result.scene)throw Error('glTF 기본 장면이 없어요.');for(const scene of result.scenes)scene.traverse(node=>{if(node.skeleton)resources.add(node.skeleton);});result.scene.userData.headlessResources=resources;return {object:result.scene,animations:result.animations};}
  catch(error){for(const resource of resources)resource.dispose();throw error;}
}
export function disposeHeadlessModel(group){const resources=group?.userData.headlessResources;if(resources){for(const resource of resources)resource.dispose();resources.clear();}}
