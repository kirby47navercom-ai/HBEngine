import {createGameCamera,selectGameCamera} from './game-camera.js';
import * as THREE from 'three';
import {DecalGeometry} from 'three/addons/geometries/DecalGeometry.js';
import {enabledComponent,objectComponents,componentDefaults} from './scene-components.js';
import {spriteSlices,spriteImage,tileAtlasRect,tileCollisionBoxes} from './two-d-assets.js';
import {createThreeMaterial,resolveMaterialAsset} from './material-runtime.js';
import {ParticleSimulation} from './scene-systems.js';

// Scene-owned GPU resources are released together when an object is rebuilt.
const visualTypes=new Set(['MeshRenderer','SpriteRenderer','TilemapRenderer','Decal','ParticleSystem','NavigationGrid','Camera','DirectionalLight','PointLight','SpotLight']);
export const visualComponentSignature=object=>JSON.stringify(objectComponents(object).filter(c=>visualTypes.has(c.type)));
export function sceneRendering({read,fileUrl,loadModel,current,all=()=>[],error}){
  const texture=async path=>{const result=await new THREE.TextureLoader().loadAsync(fileUrl(path));result.colorSpace=THREE.SRGBColorSpace;return result;};
  function own(group,resource){if(group.userData.disposed){resource.dispose();return false;}(group.userData.resources??=new Set()).add(resource);return true;}
  function dispose(group){group.userData.disposed=true;for(const resource of group.userData.resources||[])resource.dispose();group.userData.resources?.clear();}
  function release(group,resource){if(group.userData.resources?.delete(resource))resource.dispose();}
  async function particles(group,p){
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(p.maxParticles*3),3));geometry.setAttribute('particleColor',new THREE.BufferAttribute(new Float32Array(p.maxParticles*4),4));geometry.setAttribute('particleSize',new THREE.BufferAttribute(new Float32Array(p.maxParticles),1));geometry.setDrawRange(0,0);own(group,geometry);
    const map=p.texture?await texture(p.texture):null;if(map)own(group,map);const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:p.blend==='additive'?THREE.AdditiveBlending:THREE.NormalBlending,uniforms:{map:{value:map},hasMap:{value:!!map},pixelScale:{value:1},orthographic:{value:false}},vertexShader:'attribute vec4 particleColor; attribute float particleSize; varying vec4 tint; uniform float pixelScale; uniform bool orthographic; void main(){tint=particleColor;vec4 mv=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*mv;gl_PointSize=max(1.0,particleSize*pixelScale/(orthographic?1.0:max(.001,-mv.z)));}',fragmentShader:'uniform sampler2D map;uniform bool hasMap;varying vec4 tint;void main(){vec4 tex=hasMap?texture2D(map,gl_PointCoord):vec4(1.0,1.0,1.0,1.0-smoothstep(.35,.5,length(gl_PointCoord-.5)));gl_FragColor=tint*tex;if(gl_FragColor.a<.001)discard;}'});own(group,material);const mesh=new THREE.Points(geometry,material);mesh.frustumCulled=false;mesh.renderOrder=p.sortingOrder;mesh.onBeforeRender=(renderer,_scene,camera)=>{const viewport=renderer.getDrawingBufferSize(new THREE.Vector2());material.uniforms.pixelScale.value=viewport.y*camera.projectionMatrix.elements[5]/2;material.uniforms.orthographic.value=!!camera.isOrthographicCamera;};group.add(mesh);group.userData.particleState={simulation:new ParticleSimulation(p),geometry,properties:p};if(!p.playOnStart)group.userData.particleState.simulation.playing=false;
  }
  function particleSnapshot(object,simulation){const state=current(object.id)?.userData.particleState;if(state)state.simulation=simulation;}
  function tickParticles(objects,delta,running){for(const object of objects){const group=current(object.id),state=group?.userData.particleState;if(!state||group.userData.disposed)continue;group.updateWorldMatrix(true,false);if(!running)state.simulation.advance(delta,group.matrixWorld);const list=state.simulation.particles,p=state.properties,position=state.geometry.attributes.position,color=state.geometry.attributes.particleColor,size=state.geometry.attributes.particleSize,inverse=group.matrixWorld.clone().invert();for(let i=0;i<Math.min(list.length,p.maxParticles);i++){const particle=list[i],point=new THREE.Vector3(...particle.position);if(p.simulationSpace==='world')point.applyMatrix4(inverse);position.setXYZ(i,...point.toArray());const alpha=particle.age/particle.lifetime;color.setXYZW(i,...p.color.map((v,k)=>v+(p.endColor[k]-v)*alpha));size.setX(i,particle.size*(1+(p.endSize-1)*alpha));}position.needsUpdate=color.needsUpdate=size.needsUpdate=true;state.geometry.setDrawRange(0,Math.min(list.length,p.maxParticles));}}
  function syncNavigation(objects){for(const object of objects){const group=current(object.id);if(!group)continue;const state=object.gameplayDebug?.navigation,path=state?.path||[],signature=JSON.stringify([path,object.position]);if(group.userData.navigationSignature===signature)continue;group.userData.navigationSignature=signature;const old=group.userData.navigationLine;if(old){old.removeFromParent();release(group,old.geometry);release(group,old.material);}if(!path.length)continue;group.updateWorldMatrix(true,false);const inverse=group.matrixWorld.clone().invert(),points=[group.getWorldPosition(new THREE.Vector3()),...path.map(p=>new THREE.Vector3(...p))].map(v=>v.applyMatrix4(inverse)),geometry=new THREE.BufferGeometry().setFromPoints(points),material=new THREE.LineBasicMaterial({color:0x63c8ad,depthTest:false});own(group,geometry);own(group,material);const line=new THREE.Line(geometry,material);line.userData.editorHelper=true;line.renderOrder=1000;group.add(line);group.userData.navigationLine=line;}}
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
    if(group.userData.disposed||request!==undefined&&request!==group.userData.spriteRequest){if(map){map.dispose();group.userData.resources?.delete(map);}return;}let sliced;try{if(definition&&properties.drawMode&&properties.drawMode!=='simple')sliced=spriteSlices(definition,map.image,{size:[properties.width||1,properties.height||1],mode:properties.drawMode});}catch(error){if(map)release(group,map);throw error;}const color=properties.color||[1,1,1,1],mat=new THREE.MeshBasicMaterial({map,color:new THREE.Color(...color.slice(0,3)),transparent:true,opacity:color[3],side:THREE.DoubleSide,depthWrite:false});own(group,mat);
    let size=layout?.size||[properties.width||1,properties.height||1],offset=layout?.offset||[0,0],geometry;if(sliced){geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(sliced.positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(sliced.uvs,2));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(sliced.normals,3));offset=sliced.offset;}else geometry=new THREE.PlaneGeometry(...size);own(group,geometry);const mesh=new THREE.Mesh(geometry,mat);mesh.userData.sprite=true;mesh.userData.objectId=group.userData.objectId;mesh.position.set(...offset,0);mesh.scale.set(properties.flipX?-1:1,properties.flipY?-1:1,1);mesh.renderOrder=properties.sortingOrder||0;
    mesh.onBeforeRender=(_r,_s,camera)=>{if(properties.billboard){const rotation=group.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(camera.getWorldQuaternion(new THREE.Quaternion()));mesh.quaternion.copy(rotation);}};
    const old=group.userData.spriteMesh;if(old){old.removeFromParent();old.geometry.dispose();old.material.map?.dispose();old.material.dispose();for(const r of [old.geometry,old.material,old.material.map])group.userData.resources.delete(r);}group.userData.spriteMesh=mesh;group.add(mesh);
  }
  function spriteFlip(object,p){const group=current(object.id),mesh=group?.userData.spriteMesh;if(mesh)mesh.scale.set(p.flipX?-1:1,p.flipY?-1:1,1);if(group)group.userData.componentSignature=visualComponentSignature(object);}
  async function spriteFrame(object,path){const group=current(object.id);if(!group)return;const token=group.userData.spriteRequest=(group.userData.spriteRequest||0)+1;await sprite(group,enabledComponent(object,'SpriteRenderer')||{},path,token);if(current(object.id)===group&&!group.userData.disposed&&group.userData.spriteRequest===token)object.currentSprite=path;}
  async function tilemap(group,path,properties){
    if(!path)return;const map=await read(path);if(!map.tileset)return;const atlas=await texture(map.tileset);if(!own(group,atlas))return;atlas.magFilter=THREE.NearestFilter;atlas.minFilter=THREE.NearestFilter;
    const material=new THREE.MeshBasicMaterial({map:atlas,transparent:true,side:THREE.DoubleSide,depthWrite:false});own(group,material);
    // One mesh per layer keeps draw calls independent of the tile count.
    for(const [index,layer] of map.layers.entries()){if(!layer.visible)continue;const positions=[],uvs=[],indices=[];for(const tile of layer.tiles){const region=tileAtlasRect(map,tile.index,atlas.image);if(!region)continue;const [w,h]=map.cellSize,x=tile.x*w,y=-tile.y*h,z=index*.001,v=positions.length/3,[u0,v0]=region.uv.offset,[uw,vh]=region.uv.repeat;positions.push(x,y-h,z,x+w,y-h,z,x+w,y,z,x,y,z);uvs.push(u0,v0,u0+uw,v0,u0+uw,v0+vh,u0,v0+vh);indices.push(v,v+1,v+2,v,v+2,v+3);}const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeBoundingSphere();own(group,geometry);const mesh=new THREE.Mesh(geometry,material);mesh.userData.sprite=true;mesh.userData.objectId=group.userData.objectId;mesh.renderOrder=(properties.sortingOrder||0)+index;group.add(mesh);}
  }
  async function preparePhysics(objects){for(const object of objects){const path=enabledComponent(object,'TilemapRenderer')?.tilemap||object.tilemapAsset;if(!path)continue;object.tileColliders=tileCollisionBoxes(await read(path)).map((box,index)=>({id:'tile_'+index,name:'Tile',type:'BoxCollider2D',properties:{...componentDefaults('BoxCollider2D'),center:box.center,extent:box.size.map(n=>n/2)}}));}}
  async function decal(group,p){
    const data=p.material?await resolveMaterialAsset(await read(p.material),read):null;
    if(group.userData.disposed)return;
    const material=data?createThreeMaterial(THREE,data,{fileUrl,onError:error}):new THREE.MeshStandardMaterial({color:0xffffff,roughness:1});
    if(!own(group,material))return;
    material.transparent=true;material.opacity=p.opacity;material.depthWrite=false;material.polygonOffset=true;material.polygonOffsetFactor=-4;
    if(p.texture){const map=await texture(p.texture);if(!own(group,map))return;material.map=map;material.needsUpdate=true;}
    group.userData.decal={properties:p,material,meshes:[],signature:''};
  }
  function syncDecals(){
    const groups=all();for(const group of groups){const state=group.userData.decal;if(!state||group.userData.disposed)continue;
      const sources=groups.filter(g=>g!==group&&g.visible&&(!state.properties.target||g.userData.objectId===state.properties.target));group.updateWorldMatrix(true,false);for(const g of sources)g.updateWorldMatrix(true,true);
      // ponytail: projection rebuilds on transform/mesh changes; skinned deformation needs a GPU decal pass later.
      const signature=JSON.stringify([group.matrixWorld.elements,sources.map(g=>[g.userData.objectId,g.matrixWorld.elements,g.children.length])]);if(signature===state.signature)continue;state.signature=signature;
      for(const mesh of state.meshes){mesh.removeFromParent();release(group,mesh.geometry);}state.meshes=[];
      const position=group.getWorldPosition(new THREE.Vector3()),rotation=new THREE.Euler().setFromQuaternion(group.getWorldQuaternion(new THREE.Quaternion())),size=new THREE.Vector3(...state.properties.size).multiply(group.getWorldScale(new THREE.Vector3())),inverse=group.matrixWorld.clone().invert();
      for(const source of sources)source.traverse(mesh=>{if(!mesh.isMesh||!mesh.visible||mesh.userData.objectId&&mesh.userData.objectId!==source.userData.objectId||mesh.userData.sprite||mesh.userData.decal||mesh.userData.editorHelper)return;const geometry=new DecalGeometry(mesh,position,rotation,size);if(!geometry.attributes.position.count){geometry.dispose();return;}geometry.applyMatrix4(inverse);own(group,geometry);const projected=new THREE.Mesh(geometry,state.material);projected.userData.decal=true;projected.userData.objectId=group.userData.objectId;projected.renderOrder=state.properties.sortOrder;group.add(projected);state.meshes.push(projected);});
    }
  }
  async function build(object,group){
    const components=objectComponents(object),meshComponent=components.find(c=>c.type==='MeshRenderer'),renderer=meshComponent?{...componentDefaults('MeshRenderer'),...meshComponent.properties}:null;
    group.userData.componentSignature=visualComponentSignature(object);const meshPath=renderer?.mesh||object.asset;
    if(meshPath){const loaded=await loadModel(meshPath);if(group.userData.disposed){const temporary=new THREE.Group();adopt(temporary,loaded.object);dispose(temporary);return;}adopt(group,loaded.object);group.userData.animations=loaded.animations;}
    for(const component of components){const p={...componentDefaults(component.type),...component.properties};if(p.enabled===false)continue;
      if(component.type==='SpriteRenderer'&&p.visible!==false)await sprite(group,p,p.sprite||object.spriteAsset);
      if(component.type==='TilemapRenderer'&&p.visible!==false)await tilemap(group,p.tilemap||object.tilemapAsset,p);
      if(component.type==='Decal')await decal(group,p);
      if(component.type==='ParticleSystem')await particles(group,p);
      if(component.type==='NavigationGrid'&&p.debug){const axes=p.plane==='XY'?[0,1]:[0,2],points=[];for(const [x,y] of [[-1,-1],[1,-1],[1,1],[-1,1],[-1,-1]]){const v=[0,0,0];v[axes[0]]=x*p.extent[axes[0]];v[axes[1]]=y*p.extent[axes[1]];points.push(new THREE.Vector3(...v));}const geometry=new THREE.BufferGeometry().setFromPoints(points),material=new THREE.LineBasicMaterial({color:0x63c8ad});own(group,geometry);own(group,material);const line=new THREE.Line(geometry,material);line.userData.editorHelper=true;group.add(line);}
      if(component.type==='Camera'){const camera=createGameCamera(p);group.add(camera);group.userData.gameCamera=camera;}
      if(['DirectionalLight','PointLight','SpotLight'].includes(component.type)&&object.kind!=='light'){const color=new THREE.Color(...p.color.slice(0,3)),light=component.type==='DirectionalLight'?new THREE.DirectionalLight(color,p.intensity):component.type==='PointLight'?new THREE.PointLight(color,p.intensity,p.radius,p.decay):new THREE.SpotLight(color,p.intensity,p.radius,THREE.MathUtils.degToRad(p.angle),p.penumbra);light.castShadow=p.castShadow;if(light.target){light.target.position.set(0,0,-1);group.add(light.target);}group.add(light);}
    }
    if(group.userData.disposed)return;group.traverse(child=>{child.userData.objectId=object.id;if(child.isMesh&&!child.userData.sprite){child.visible=renderer?.visible!==false&&renderer?.enabled!==false;child.castShadow=renderer?.castShadow!==false;child.receiveShadow=renderer?.receiveShadow!==false;}});
    const path=renderer?.material||object.materialAsset;if(path)await material(object,path);
  }
  const gameCamera=(objects,aspect,override)=>selectGameCamera(objects,aspect,override,current);
  return {build,dispose,material,materialFloat,spriteFrame,spriteFlip,preparePhysics,gameCamera,syncDecals,tickParticles,particleSnapshot,syncNavigation};
}
