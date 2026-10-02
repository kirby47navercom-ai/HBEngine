import * as THREE from 'three';
import {enabledComponent,objectComponents,componentDefaults} from './scene-components.js';
import {spriteImage,tileAtlasRect,tileCollisionBoxes} from './two-d-assets.js';
import {createThreeMaterial,resolveMaterialAsset} from './material-runtime.js';

// Scene-owned GPU resources are released together when an object is rebuilt.
export function sceneRendering({read,fileUrl,loadModel,current,error}){
  const texture=async path=>{const result=await new THREE.TextureLoader().loadAsync(fileUrl(path));result.colorSpace=THREE.SRGBColorSpace;return result;};
  function own(group,resource){if(group.userData.disposed){resource.dispose();return false;}(group.userData.resources??=new Set()).add(resource);return true;}
  function dispose(group){group.userData.disposed=true;for(const resource of group.userData.resources||[])resource.dispose();group.userData.resources?.clear();}
  function release(group,resource){if(group.userData.resources?.delete(resource))resource.dispose();}
  function replaceMaterials(group,result,slot){
    const meshes=[];group.traverse(child=>{if(child.isMesh&&!child.userData.editorHelper&&!child.userData.sprite)meshes.push(child);});
    if(slot!==undefined&&(!Number.isInteger(slot)||slot<0||meshes.some(mesh=>slot>=(Array.isArray(mesh.material)?mesh.material.length:1)))){result.dispose();throw Error('머테리얼 슬롯 범위 오류');}
    if(!own(group,result))return;const old=new Set();for(const mesh of meshes){const list=Array.isArray(mesh.material)?[...mesh.material]:[mesh.material];if(slot===undefined){list.forEach(m=>old.add(m));mesh.material=result;}else{old.add(list[slot]);list[slot]=result;mesh.material=Array.isArray(mesh.material)?list:list[0];}}
    const used=new Set();group.traverse(child=>{for(const mat of child.material?(Array.isArray(child.material)?child.material:[child.material]):[])used.add(mat);});for(const mat of old)if(!used.has(mat))release(group,mat);
  }
  function adopt(group,child){child.traverse(node=>{if(node.geometry)own(group,node.geometry);for(const m of node.material?(Array.isArray(node.material)?node.material:[node.material]):[]){own(group,m);for(const v of Object.values(m))if(v?.isTexture)own(group,v);}node.userData.objectId=group.userData.objectId;});group.add(child);}
  async function material(object,path,slot){
    const group=current(object.id);if(!group)return;const token=group.userData.materialRequest=(group.userData.materialRequest||0)+1,data=await resolveMaterialAsset(await read(path),read);if(current(object.id)!==group||token!==group.userData.materialRequest||group.userData.disposed)return;
    const result=createThreeMaterial(THREE,data,{fileUrl,onError:error});replaceMaterials(group,result,slot);group.userData.materialData=data;
  }
  async function materialFloat(object,key,value){
    const group=current(object.id),source=group?.userData.materialData;if(!source)throw Error('노드 머테리얼을 먼저 지정하세요.');
    const data=structuredClone(source),node=data.graph.nodes.find(n=>n.parameter===key);
    if(node){if(typeof node.value!=='number')throw Error('Float 파라미터가 아니에요.');node.value=value;}else{const property={Roughness:'roughness',Metallic:'metalness',Opacity:'opacity',EmissiveIntensity:'emissiveIntensity'}[key]||key;if(!['roughness','metalness','opacity','emissiveIntensity'].includes(property))throw Error('머테리얼 파라미터가 없어요: '+key);data.surface[property]=value;}
    const result=createThreeMaterial(THREE,data,{fileUrl,onError:error});replaceMaterials(group,result);group.userData.materialData=data;
  }
  async function sprite(group,properties,path,request){
    const definitions=group.userData.spriteDefinitions??=new Map();if(path&&!definitions.has(path))definitions.set(path,read(path));const definition=path?await definitions.get(path):null,source=definition?.texture||properties.texture;
    const cache=group.userData.spriteTextures??=new Map();let map=null,layout=null;
    if(source){if(!cache.has(source)){const pending=texture(source).then(value=>{own(group,value);return value;});cache.set(source,pending);pending.catch(()=>cache.delete(source));}const base=await cache.get(source);if(group.userData.disposed)return;map=base.clone();map.needsUpdate=true;if(!own(group,map))return;layout=definition?spriteImage(definition,map.image):null;if(definition&&!layout){release(group,map);throw Error('스프라이트 잘라내기 범위 오류');}map.magFilter=definition?.filter==='linear'?THREE.LinearFilter:THREE.NearestFilter;map.minFilter=map.magFilter;if(layout){map.offset.fromArray(layout.uv.offset);map.repeat.fromArray(layout.uv.repeat);}
      // ponytail: retain at most 32 source atlases per object; a larger flipbook reloads evicted atlases.
      cache.delete(source);cache.set(source,Promise.resolve(base));while(cache.size>32){const [old,pending]=cache.entries().next().value;cache.delete(old);pending.then(value=>release(group,value)).catch(()=>{});}}
    if(group.userData.disposed||request!==undefined&&request!==group.userData.spriteRequest){if(map){map.dispose();group.userData.resources?.delete(map);}return;}const color=properties.color||[1,1,1,1],mat=new THREE.MeshBasicMaterial({map,color:new THREE.Color(...color.slice(0,3)),transparent:true,opacity:color[3],side:THREE.DoubleSide,depthWrite:false});own(group,mat);
    const size=layout?.size||[properties.width||1,properties.height||1],geometry=new THREE.PlaneGeometry(...size);own(group,geometry);const mesh=new THREE.Mesh(geometry,mat);mesh.userData.sprite=true;mesh.userData.objectId=group.userData.objectId;mesh.position.set(...(layout?.offset||[0,0]),0);mesh.scale.set(properties.flipX?-1:1,properties.flipY?-1:1,1);mesh.renderOrder=properties.sortingOrder||0;
    mesh.onBeforeRender=(_r,_s,camera)=>{if(properties.billboard){const rotation=group.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(camera.getWorldQuaternion(new THREE.Quaternion()));mesh.quaternion.copy(rotation);}};
    const old=group.userData.spriteMesh;if(old){old.removeFromParent();old.geometry.dispose();old.material.map?.dispose();old.material.dispose();for(const r of [old.geometry,old.material,old.material.map])group.userData.resources.delete(r);}group.userData.spriteMesh=mesh;group.add(mesh);
  }
  async function spriteFrame(object,path){const group=current(object.id);if(!group)return;const token=group.userData.spriteRequest=(group.userData.spriteRequest||0)+1;await sprite(group,enabledComponent(object,'SpriteRenderer')||{},path,token);}
  async function tilemap(group,path,properties){
    if(!path)return;const map=await read(path);if(!map.tileset)return;const atlas=await texture(map.tileset);if(!own(group,atlas))return;atlas.magFilter=THREE.NearestFilter;atlas.minFilter=THREE.NearestFilter;
    const material=new THREE.MeshBasicMaterial({map:atlas,transparent:true,side:THREE.DoubleSide,depthWrite:false});own(group,material);
    // One mesh per layer keeps draw calls independent of the tile count.
    for(const [index,layer] of map.layers.entries()){if(!layer.visible)continue;const positions=[],uvs=[],indices=[];for(const tile of layer.tiles){const region=tileAtlasRect(map,tile.index,atlas.image);if(!region)continue;const [w,h]=map.cellSize,x=tile.x*w,y=-tile.y*h,z=index*.001,v=positions.length/3,[u0,v0]=region.uv.offset,[uw,vh]=region.uv.repeat;positions.push(x,y-h,z,x+w,y-h,z,x+w,y,z,x,y,z);uvs.push(u0,v0,u0+uw,v0,u0+uw,v0+vh,u0,v0+vh);indices.push(v,v+1,v+2,v,v+2,v+3);}const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeBoundingSphere();own(group,geometry);const mesh=new THREE.Mesh(geometry,material);mesh.userData.sprite=true;mesh.userData.objectId=group.userData.objectId;mesh.renderOrder=(properties.sortingOrder||0)+index;group.add(mesh);}
  }
  async function preparePhysics(objects){for(const object of objects){const path=enabledComponent(object,'TilemapRenderer')?.tilemap||object.tilemapAsset;if(!path)continue;object.tileColliders=tileCollisionBoxes(await read(path)).map((box,index)=>({id:'tile_'+index,name:'Tile',type:'BoxCollider2D',properties:{...componentDefaults('BoxCollider2D'),center:box.center,extent:box.size.map(n=>n/2)}}));}}
  async function build(object,group){
    const components=objectComponents(object),meshComponent=components.find(c=>c.type==='MeshRenderer'),renderer=meshComponent?{...componentDefaults('MeshRenderer'),...meshComponent.properties}:null;
    group.userData.componentSignature=JSON.stringify(components);const meshPath=renderer?.mesh||object.asset;
    if(meshPath){const loaded=await loadModel(meshPath);if(group.userData.disposed){const temporary=new THREE.Group();adopt(temporary,loaded.object);dispose(temporary);return;}adopt(group,loaded.object);group.userData.animations=loaded.animations;}
    for(const component of components){const p={...componentDefaults(component.type),...component.properties};if(p.enabled===false)continue;
      if(component.type==='SpriteRenderer'&&p.visible!==false)await sprite(group,p,p.sprite||object.spriteAsset);
      if(component.type==='TilemapRenderer'&&p.visible!==false)await tilemap(group,p.tilemap||object.tilemapAsset,p);
      if(component.type==='Camera'){const camera=p.projection==='orthographic'?new THREE.OrthographicCamera(-p.orthographicSize,p.orthographicSize,p.orthographicSize,-p.orthographicSize,p.near,p.far):new THREE.PerspectiveCamera(p.fieldOfView,1,p.near,p.far);camera.userData.cameraProperties=p;group.add(camera);group.userData.gameCamera=camera;}
      if(['DirectionalLight','PointLight','SpotLight'].includes(component.type)&&object.kind!=='light'){const color=new THREE.Color(...p.color.slice(0,3)),light=component.type==='DirectionalLight'?new THREE.DirectionalLight(color,p.intensity):component.type==='PointLight'?new THREE.PointLight(color,p.intensity,p.radius,p.decay):new THREE.SpotLight(color,p.intensity,p.radius,THREE.MathUtils.degToRad(p.angle),p.penumbra);light.castShadow=p.castShadow;if(light.target){light.target.position.set(0,0,-1);group.add(light.target);}group.add(light);}
    }
    if(group.userData.disposed)return;group.traverse(child=>{child.userData.objectId=object.id;if(child.isMesh&&!child.userData.sprite){child.visible=renderer?.visible!==false&&renderer?.enabled!==false;child.castShadow=renderer?.castShadow!==false;child.receiveShadow=renderer?.receiveShadow!==false;}});
    const path=renderer?.material||object.materialAsset;if(path)await material(object,path);
  }
  function gameCamera(objects,aspect){const choices=objects.map(object=>({object,camera:current(object.id)?.userData.gameCamera})).filter(x=>x.camera&&x.object.visible!==false&&x.camera.userData.cameraProperties.main).sort((a,b)=>b.camera.userData.cameraProperties.priority-a.camera.userData.cameraProperties.priority);const selected=choices[0];if(!selected)return null;const c=selected.camera,p=c.userData.cameraProperties;if(c.isOrthographicCamera){c.left=-p.orthographicSize*aspect;c.right=p.orthographicSize*aspect;}else c.aspect=aspect;if(p.followTarget){const target=current(p.followTarget);if(target){const position=target.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(...(p.followOffset||[0,0,10])));c.parent.updateWorldMatrix(true,false);c.position.copy(c.parent.worldToLocal(position));}}c.updateProjectionMatrix();return c;}
  return {build,dispose,material,materialFloat,spriteFrame,preparePhysics,gameCamera};
}
