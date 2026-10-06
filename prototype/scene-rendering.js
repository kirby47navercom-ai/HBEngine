import {BloomRendering} from './bloom-rendering.js';
import {resolveSprite} from './sprite-import.js';
import {createGameCamera,selectGameCamera} from './game-camera.js';
import * as THREE from 'three';
import {DecalGeometry} from 'three/addons/geometries/DecalGeometry.js';
import {enabledComponent,objectComponents,componentDefaults} from './scene-components.js';
import {spriteSlices,spriteImage,tileAtlasRect,tileRenderRect} from './two-d-assets.js';
import {tilemapColliders} from './tilemap-runtime.js';
import {createThreeMaterial,resolveMaterialAsset} from './material-runtime.js';
import {ParticleSimulation} from './scene-systems.js';
import {TwoDRendering,spriteEffectsUniforms} from './two-d-rendering.js';
import {SpriteRigPose} from './sprite-rig-runtime.js';
import {cacheAssetReader} from './runtime-storage.js';
import {light2DUniforms} from './two-d-lighting.js';

// Scene-owned GPU resources are released together when an object is rebuilt.
const visualTypes=new Set(['MeshRenderer','SpriteRenderer','SpriteSkin','TilemapRenderer','SpriteMask','SortingGroup','ShadowCaster2D','CompositeShadowCaster2D','Decal','ParticleSystem','NavigationGrid','Camera','DirectionalLight','PointLight','SpotLight','Light2D','Renderer2D']);
export const visualComponentSignature=object=>JSON.stringify(objectComponents(object).filter(c=>visualTypes.has(c.type)));
export function sceneRendering({read,fileUrl,loadModel,current,all=()=>[],editor=false,error}){
  read=cacheAssetReader(read);
  const twoD=new TwoDRendering(),bloom=new BloomRendering();
  const textureSources=new Map();let textureBytes=0,textureEpoch=0;
  function invalidateAssets(){textureEpoch++;read.clear();for(const entry of textureSources.values())entry.promise.then(t=>t.dispose(),()=>{});textureSources.clear();textureBytes=0;}
  const texture=async(path,normal=false)=>{
    const key=JSON.stringify([path,normal]);let entry=textureSources.get(key);
    if(entry){textureSources.delete(key);textureSources.set(key,entry);}else{
      const epoch=textureEpoch;entry={bytes:0};textureSources.set(key,entry);
      entry.promise=new THREE.TextureLoader().loadAsync(fileUrl(path)).then(result=>{result.colorSpace=normal?THREE.NoColorSpace:THREE.SRGBColorSpace;
        if(epoch===textureEpoch&&textureSources.get(key)===entry){entry.bytes=(result.image.width||1)*(result.image.height||1)*4;textureBytes+=entry.bytes;while(textureSources.size>128||textureBytes>32*1024*1024){const [old,value]=textureSources.entries().next().value;textureSources.delete(old);textureBytes-=value.bytes;value.promise.then(t=>t.dispose(),()=>{});}}
        return result;
      },e=>{if(textureSources.get(key)===entry)textureSources.delete(key);throw Error('텍스처를 읽지 못했어요: '+path+(e?.message?' · '+e.message:''));});
    }
    // UV/filter state is private; Texture.clone shares the immutable image Source.
    return (await entry.promise).clone();
  };
  async function prepareSpawn(catalog){for(const template of new Set(catalog?.templates.values()||[]))for(const object of template.objects){const p=enabledComponent(object,'SpriteRenderer');if(!p)continue;const resolved=p.sprite?await resolveSprite(await read(p.sprite),read):{texture:p.texture};for(const [path,normal] of [[resolved.texture,false],[p.normalTexture||resolved.normalTexture,true],[p.lightMaskTexture,true]])if(path){const t=await texture(path,normal);t.dispose();}}}
  function own(group,resource){if(group.userData.disposed){resource.dispose();return false;}(group.userData.resources??=new Set()).add(resource);return true;}
  function lightOutline(group,p){
    if(p.lightType==='global')return;
    const bounds=group.userData.light2dCookie,half=bounds?.size.map(v=>v/2)||[p.cookieWidth/2,p.cookieHeight/2],offset=bounds?.offset||[0,0];
    const paths=p.lightType==='sprite'?[[[-half[0]+offset[0],-half[1]+offset[1]],[half[0]+offset[0],-half[1]+offset[1]],[half[0]+offset[0],half[1]+offset[1]],[-half[0]+offset[0],half[1]+offset[1]]]]:p.lightType==='freeform'?[p.shapePath]:[[p.outerRadius,p.outerAngle],...(p.innerRadius>0?[[p.innerRadius,p.innerAngle]]:[])].map(([radius,degrees])=>{
      const angle=p.lightType==='spot'?degrees*Math.PI/180:Math.PI*2,points=[];
      if(p.lightType==='spot')points.push([0,0]);for(let i=0;i<=64;i++){const a=-angle/2+angle*i/64;points.push([Math.sin(a)*radius,Math.cos(a)*radius]);}return points;
    });
    for(const path of paths){const geometry=new THREE.BufferGeometry().setFromPoints([...path,path[0]].map(point=>new THREE.Vector3(...point,0))),material=new THREE.LineBasicMaterial({color:new THREE.Color(...p.color.slice(0,3)),depthTest:false}),line=new THREE.Line(geometry,material);own(group,geometry);own(group,material);line.userData.editorHelper=true;line.userData.light2dHelper=true;line.userData.objectId=group.userData.objectId;line.renderOrder=900;group.add(line);}
  }
  async function light2d(group,p){
    group.userData.light2d=p;
    if(p.lightType==='sprite'){
      const definition=p.cookieSprite?await resolveSprite(await read(p.cookieSprite),read):null,source=definition?.texture||p.cookieTexture;
      if(source){const map=await texture(source);if(!own(group,map))return;const layout=definition?spriteImage(definition,map.image):{rect:[0,0,map.image.width,map.image.height],size:[p.cookieWidth,p.cookieHeight],offset:[0,0]};if(!layout)throw Error('광원 스프라이트 잘라내기 범위 오류');group.userData.light2dCookie={texture:map,...layout,filter:definition?.filter||'linear',key:JSON.stringify([map.source.uuid,layout.rect,definition?.filter||'linear'])};}
    }
    if(group.userData.disposed)return;
    if(p.volumetric&&p.lightType!=='global'){
      const cookie=group.userData.light2dCookie,radius=p.lightType==='freeform'?Math.max(...p.shapePath.map(q=>Math.hypot(...q)))+p.shapeFalloff:p.outerRadius,size=p.lightType==='sprite'?cookie?.size||[p.cookieWidth,p.cookieHeight]:[2*radius,2*radius],offset=cookie?.offset||[0,0];
      const geometry=new THREE.PlaneGeometry(...size),material=new THREE.MeshStandardMaterial({transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});own(group,geometry);own(group,material);light2DUniforms(material).hbLight2DVolume.value=0;
      const mesh=new THREE.Mesh(geometry,material);mesh.position.set(...offset,0);mesh.userData.objectId=group.userData.objectId;mesh.userData.light2dVolume=true;mesh.userData.draw2d={shading:'volume2d'};mesh.userData.draw2dId='volume';group.userData.light2dVolume=mesh;group.add(mesh);
    }
    if(editor)lightOutline(group,p);
  }
  function dispose(group){group.userData.disposed=true;group.userData.spriteSkin?.dispose();for(const resource of group.userData.resources||[])resource.dispose();group.userData.resources?.clear();}
  function release(group,resource){if(group.userData.resources?.delete(resource))resource.dispose();}
  function spriteMaterial(map,p,normalMap=null){
    const color=p.color||[1,1,1,1],mode=p.blendMode||'translucent',lit=['lit','lit2d'].includes(p.shading),material=new (lit?THREE.MeshStandardMaterial:THREE.MeshBasicMaterial)({map,color:new THREE.Color(...color.slice(0,3)),transparent:['translucent','additive'].includes(mode),blending:mode==='additive'?THREE.AdditiveBlending:THREE.NormalBlending,opacity:color[3],alphaTest:mode==='masked'?(p.alphaCutoff??.5):0,side:THREE.DoubleSide,depthWrite:!['translucent','additive'].includes(mode)});
    spriteEffectsUniforms(material).hbSpriteEmission.value=p.emissiveIntensity||0;if(lit&&normalMap){material.normalMap=normalMap;const strength=p.normalStrength??1;material.normalScale.set(strength,p.normalFlipY?-strength:strength);}return material;
  }
  function spriteShadows(group,mesh,p){
    mesh.castShadow=!!p.castShadow;mesh.receiveShadow=p.shading==='lit'&&!!p.receiveShadow;if(!mesh.castShadow)return [];
    const options={map:mesh.material.map,alphaTest:p.blendMode==='opaque'?0:(p.alphaCutoff??.5),opacity:mesh.material.opacity,side:THREE.DoubleSide},depth=new THREE.MeshDepthMaterial({...options,depthPacking:THREE.RGBADepthPacking}),distance=new THREE.MeshDistanceMaterial(options);own(group,depth);own(group,distance);mesh.customDepthMaterial=depth;mesh.customDistanceMaterial=distance;
    // WebGLShadowMap copies the color material's alphaTest even onto custom materials.
    mesh.onBeforeShadow=(r,_o,camera,shadowCamera,_geometry,material)=>{material.alphaTest=options.alphaTest;if(p.billboard){mesh.onBeforeRender(r,null,camera);mesh.modelViewMatrix.multiplyMatrices(shadowCamera.matrixWorldInverse,mesh.matrixWorld);}};return [depth,distance];
  }
  async function spriteTexture(group,path,normal,definition){
    const cache=group.userData.spriteTextures??=new Map(),key=(normal?'normal:':'color:')+path;
    if(!cache.has(key)){const pending=texture(path,normal).then(value=>{own(group,value);return value;});cache.set(key,pending);pending.catch(()=>cache.delete(key));}const base=await cache.get(key);if(group.userData.disposed)return null;const map=base.clone();map.needsUpdate=true;if(!own(group,map))return null;map.magFilter=map.minFilter=definition?.filter==='linear'?THREE.LinearFilter:THREE.NearestFilter;
    // ponytail: retain at most 32 color/normal source atlases per object; larger flipbooks reload evicted sources.
    cache.delete(key);cache.set(key,Promise.resolve(base));while(cache.size>32){const [old,pending]=cache.entries().next().value;cache.delete(old);pending.then(value=>release(group,value)).catch(()=>{});}return map;
  }
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
  function adopt(group,child){child.traverse(node=>{if(node.geometry)own(group,node.geometry);if(node.isLight)own(group,node);for(const m of node.material?(Array.isArray(node.material)?node.material:[node.material]):[]){own(group,m);for(const v of Object.values(m))if(v?.isTexture)own(group,v);}node.userData.objectId=group.userData.objectId;});group.add(child);}
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
  async function sprite(group,properties,path,request,isMask=false){
    const definitions=group.userData.spriteDefinitions??=new Map();if(path&&!definitions.has(path))definitions.set(path,read(path).then(data=>resolveSprite(data,read)));const definition=path?await definitions.get(path):null,source=definition?.texture||properties.texture;
    let map=null,normalMap=null,lightMask=null,layout=null,sliced;try{
      if(source){map=await spriteTexture(group,source,false,definition);if(!map)return;layout=definition?spriteImage(definition,map.image):null;if(definition&&!layout)throw Error('스프라이트 잘라내기 범위 오류');if(layout){map.offset.fromArray(layout.uv.offset);map.repeat.fromArray(layout.uv.repeat);}}
      const normalSource=!isMask&&['lit','lit2d'].includes(properties.shading)&&(properties.normalTexture||definition?.normalTexture);if(normalSource){normalMap=await spriteTexture(group,normalSource,true,definition);if(normalMap&&layout){normalMap.offset.copy(map.offset);normalMap.repeat.copy(map.repeat);}}
      if(!isMask&&properties.shading==='lit2d'&&properties.lightMaskTexture){lightMask=await spriteTexture(group,properties.lightMaskTexture,true,definition);if(lightMask&&layout){lightMask.offset.copy(map.offset);lightMask.repeat.copy(map.repeat);}}
      if(group.userData.disposed||request!==undefined&&request!==group.userData.spriteRequest){for(const r of [map,normalMap,lightMask])if(r)release(group,r);return;}
      if(map&&properties.drawMode&&properties.drawMode!=='simple')sliced=spriteSlices(definition||{version:1,name:'Texture',texture:source,normalTexture:'',pixelsPerUnit:properties.pixelsPerUnit||100,rect:[0,0,0,0],pivot:[.5,.5],filter:'nearest',border:properties.border||[properties.borderLeft||0,properties.borderBottom||0,properties.borderRight||0,properties.borderTop||0]},map.image,{size:[properties.width||1,properties.height||1],mode:properties.drawMode,origin:properties.tileOrigin||'bottomLeft'});
    }catch(error){for(const r of [map,normalMap,lightMask])if(r)release(group,r);throw error;}
    const mat=spriteMaterial(map,properties,normalMap);mat.hbLight2DMaskTexture=lightMask;spriteEffectsUniforms(mat);own(group,mat);
    let size=properties.useCustomSize?[properties.width||1,properties.height||1]:layout?.size||[properties.width||1,properties.height||1],offset=layout&&properties.useCustomSize?[(.5-layout.pivot[0])*size[0],(.5-layout.pivot[1])*size[1]]:layout?.offset||[0,0],geometry;if(sliced){geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(sliced.positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(sliced.uvs,2));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(sliced.normals,3));offset=sliced.offset;}else geometry=new THREE.PlaneGeometry(...size);own(group,geometry);const mesh=new THREE.Mesh(geometry,mat);mesh.userData.sprite=true;mesh.userData.objectId=group.userData.objectId;mesh.position.set(...offset,0);mesh.scale.set(properties.flipX?-1:1,properties.flipY?-1:1,1);mesh.renderOrder=properties.sortingOrder||0;
    mesh.onBeforeRender=(_r,_s,camera)=>{const effects=spriteEffectsUniforms(mat);effects.hbPixelPPU.value=camera.userData.cameraProperties?.pixelPerfect?camera.userData.cameraProperties.pixelPixelsPerUnit||32:0;const flash=group.userData.spriteActor?.spriteFlash;effects.hbSpriteFlash.value=flash?.remaining>0?flash.strength:0;effects.hbSpriteEmission.value=properties.emissiveIntensity||0;if(properties.billboard){const rotation=group.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(camera.getWorldQuaternion(new THREE.Quaternion()));mesh.quaternion.copy(rotation);mesh.updateWorldMatrix(true,false);}};
    const slot=isMask?'maskMesh':'spriteMesh',old=group.userData[slot];if(old){old.removeFromParent();for(const r of [old.geometry,old.material,old.material.map,old.material.normalMap,old.material.hbLight2DMaskTexture,old.customDepthMaterial,old.customDistanceMaterial,old.userData.maskMaterial])if(r)release(group,r);}group.userData[slot]=mesh;
    if(isMask){mesh.visible=false;mesh.userData.spriteMask=true;mesh.userData.maskProperties=properties;mesh.userData.maskMaterial=new THREE.MeshBasicMaterial({color:0xffffff,map,alphaTest:properties.alphaCutoff,side:THREE.DoubleSide,depthTest:false,depthWrite:false,toneMapped:false});own(group,mesh.userData.maskMaterial);}else{spriteShadows(group,mesh,properties);mesh.userData.sortPoint=properties.sortPoint==='feet'?[0,-size[1]/2,0]:properties.sortPoint==='pivot'?[0,-offset[1],0]:[0,0,0];mesh.userData.draw2d=properties;mesh.userData.draw2dId='sprite';if(group.userData.spriteSkin){group.userData.spriteSkin.attachGeometry(geometry);mesh.position.set(0,0,0);}}group.add(mesh);
  }
  function spriteFlip(object,p){const group=current(object.id),mesh=group?.userData.spriteMesh;if(mesh)mesh.scale.set(p.flipX?-1:1,p.flipY?-1:1,1);if(group)group.userData.componentSignature=visualComponentSignature(object);}
  async function spriteFrame(object,path){const group=current(object.id);if(!group)return;const token=group.userData.spriteRequest=(group.userData.spriteRequest||0)+1;await sprite(group,enabledComponent(object,'SpriteRenderer')||{},path,token);if(current(object.id)===group&&!group.userData.disposed&&group.userData.spriteRequest===token)object.currentSprite=path;}
  async function tilemap(group,path,properties,data,request){
    if(!path)return;const map=data||await read(path);if(!map.tileset)return;const atlas=await texture(map.tileset);if(!own(group,atlas))return;atlas.magFilter=THREE.NearestFilter;atlas.minFilter=THREE.NearestFilter;
    let normalMap,lightMask;try{const normalSource=['lit','lit2d'].includes(properties.shading)&&(properties.normalTexture||map.normalTexture);if(normalSource){normalMap=await texture(normalSource,true);own(group,normalMap);normalMap.magFilter=normalMap.minFilter=THREE.NearestFilter;}if(properties.shading==='lit2d'&&properties.lightMaskTexture){lightMask=await texture(properties.lightMaskTexture,true);own(group,lightMask);lightMask.magFilter=lightMask.minFilter=THREE.NearestFilter;}}catch(error){release(group,atlas);if(normalMap)release(group,normalMap);if(lightMask)release(group,lightMask);throw error;}
    if(group.userData.disposed||request!==undefined&&request!==group.userData.tilemapRequest){release(group,atlas);if(normalMap)release(group,normalMap);if(lightMask)release(group,lightMask);return;}
    const material=spriteMaterial(atlas,properties,normalMap);material.hbLight2DMaskTexture=lightMask;own(group,material);group.userData.tilemapResources=[atlas,material,...normalMap?[normalMap]:[],...lightMask?[lightMask]:[]];
    // One mesh per layer keeps draw calls independent of the tile count.
    for(const [index,layer] of map.layers.entries()){if(!layer.visible)continue;const positions=[],uvs=[],indices=[];const tiles=map.layout==='isometric'?[...layer.tiles].sort((a,b)=>a.x+a.y-b.x-b.y||a.y-b.y||a.x-b.x):layer.tiles;for(const tile of tiles){const region=tileAtlasRect(map,tile.index,atlas.image);if(!region)continue;const [x,y,w,h]=tileRenderRect(map,tile),z=index*.001,v=positions.length/3,[u0,v0]=region.uv.offset,[uw,vh]=region.uv.repeat;positions.push(x,y,z,x+w,y,z,x+w,y+h,z,x,y+h,z);uvs.push(u0,v0,u0+uw,v0,u0+uw,v0+vh,u0,v0+vh);indices.push(v,v+1,v+2,v,v+2,v+3);}const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();own(group,geometry);group.userData.tilemapResources.push(geometry);let layerMaterial=material;if(properties.shading==='lit2d'||properties.maskInteraction==='inside'||properties.maskInteraction==='outside'){layerMaterial=material.clone();layerMaterial.hbLight2DMaskTexture=lightMask;own(group,layerMaterial);group.userData.tilemapResources.push(layerMaterial);}const mesh=new THREE.Mesh(geometry,layerMaterial);mesh.userData.sprite=true;mesh.userData.tilemap=true;mesh.userData.draw2dId='tile:'+layer.id;mesh.userData.draw2d={...properties,sortingOrder:(properties.sortingOrder||0)+index};mesh.userData.objectId=group.userData.objectId;mesh.renderOrder=(properties.sortingOrder||0)+index;group.userData.tilemapResources.push(...spriteShadows(group,mesh,properties));group.add(mesh);}
  }
  async function tilemapFrame(object,map){const group=current(object.id);if(!group)return;const token=group.userData.tilemapRequest=(group.userData.tilemapRequest||0)+1;for(const mesh of group.children.filter(c=>c.userData.tilemap))mesh.removeFromParent();for(const resource of group.userData.tilemapResources||[])release(group,resource);group.userData.tilemapResources=[];await tilemap(group,object.runtimeTilemapPath,enabledComponent(object,'TilemapRenderer')||{},map,token);}
  async function preparePhysics(objects){for(const object of objects){const path=enabledComponent(object,'TilemapRenderer')?.tilemap||object.tilemapAsset;if(!path)continue;object.tileColliders=tilemapColliders(await read(path));}}
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
    group.userData.spriteActor=object;const components=objectComponents(object),meshComponent=components.find(c=>c.type==='MeshRenderer'),renderer=meshComponent?{...componentDefaults('MeshRenderer'),...meshComponent.properties}:null;
    group.userData.componentSignature=visualComponentSignature(object);const meshPath=renderer?.mesh||object.asset;
    if(meshPath){const loaded=await loadModel(meshPath);if(group.userData.disposed){const temporary=new THREE.Group();adopt(temporary,loaded.object);dispose(temporary);return;}adopt(group,loaded.object);group.userData.animations=loaded.animations;}
    const skin=components.find(c=>c.type==='SpriteSkin'&&c.properties?.enabled!==false)?.properties,rig=skin?.rig?await read(skin.rig):null;
    if(rig&&!components.some(c=>c.type==='SpriteRenderer'&&c.properties?.enabled!==false))throw Error('Sprite Skin에는 활성 Sprite Renderer가 필요해요.');
    for(const component of components){const p={...componentDefaults(component.type),...component.properties};if(p.enabled===false)continue;
      if(component.type==='Renderer2D')group.userData.renderer2d=p;
      if(component.type==='Light2D')await light2d(group,p);
      if(component.type==='ShadowCaster2D'){group.userData.shadowCaster2d=p;if(editor&&p.source==='shape')lightOutline(group,{lightType:'freeform',shapePath:p.shapePath,color:[.9,.85,.5]});}
      if(component.type==='CompositeShadowCaster2D')group.userData.shadowGroup2d=p;
      if(component.type==='SortingGroup')group.userData.sortingGroup=p;
      if(component.type==='SpriteMask')await sprite(group,p,p.sprite,undefined,true);
      if(component.type==='SpriteRenderer'&&p.visible!==false)await sprite(group,p,rig?.sprite||p.sprite||object.spriteAsset);
      if(component.type==='TilemapRenderer'&&p.visible!==false)await tilemap(group,p.tilemap||object.tilemapAsset,p,object.runtimeTilemap);
      if(component.type==='Decal')await decal(group,p);
      if(component.type==='ParticleSystem')await particles(group,p);
      if(component.type==='NavigationGrid'&&p.debug){const axes=p.plane==='XY'?[0,1]:[0,2],points=[];for(const [x,y] of [[-1,-1],[1,-1],[1,1],[-1,1],[-1,-1]]){const v=[0,0,0];v[axes[0]]=x*p.extent[axes[0]];v[axes[1]]=y*p.extent[axes[1]];points.push(new THREE.Vector3(...v));}const geometry=new THREE.BufferGeometry().setFromPoints(points),material=new THREE.LineBasicMaterial({color:0x63c8ad});own(group,geometry);own(group,material);const line=new THREE.Line(geometry,material);line.userData.editorHelper=true;group.add(line);}
      if(component.type==='Camera'){const camera=createGameCamera(p);group.add(camera);group.userData.gameCamera=camera;}
      if(['DirectionalLight','PointLight','SpotLight'].includes(component.type)&&object.kind!=='light'){const color=new THREE.Color(...p.color.slice(0,3)),light=component.type==='DirectionalLight'?new THREE.DirectionalLight(color,p.intensity):component.type==='PointLight'?new THREE.PointLight(color,p.intensity,p.radius,p.decay):new THREE.SpotLight(color,p.intensity,p.radius,THREE.MathUtils.degToRad(p.angle),p.penumbra);own(group,light);light.castShadow=p.castShadow;if(light.target){light.target.position.set(0,0,-1);group.add(light.target);}group.add(light);}
    }
    if(group.userData.disposed)return;if(rig){const pose=new SpriteRigPose(rig,{geometry:group.userData.spriteMesh?.geometry,requireSprite:true});group.add(pose.group);group.userData.spriteSkin=pose;group.userData.animations=[...group.userData.animations||[],...pose.animations];if(group.userData.spriteMesh)group.userData.spriteMesh.position.set(0,0,0);}
    group.traverse(child=>{child.userData.objectId=object.id;if(child.isMesh&&!child.userData.sprite){child.visible=renderer?.visible!==false&&renderer?.enabled!==false;child.castShadow=renderer?.castShadow!==false;child.receiveShadow=renderer?.receiveShadow!==false;}});
    const path=renderer?.material||object.materialAsset;if(path)await material(object,path);
  }
  const gameCamera=(objects,aspect,override)=>selectGameCamera(objects,aspect,override,current);
  return {build,dispose,prepareSpawn,invalidateAssets,material,materialFloat,spriteFrame,spriteFlip,tilemapFrame,preparePhysics,gameCamera,syncDecals,tickParticles,particleSnapshot,syncNavigation,prepare2D:(renderer,scene,camera,layers,options)=>{for(const group of all())group.userData.spriteSkin?.update();return twoD.prepare(renderer,scene,camera,all(),layers,options);},renderBloom:(renderer,scene,camera,objects)=>bloom.render(renderer,scene,camera,objects),disposeRenderer:renderer=>bloom.disposeRenderer(renderer),dispose2D:()=>{twoD.dispose();bloom.dispose();invalidateAssets();}};
}
