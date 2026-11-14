import {staticGroupSphere,staticGroupRecord,staticGroupBox,staticConfig} from './static-groups.js';
import {materialRevision,revisionTrust,revisionConfig,reportRevisionMismatch,objectRevision,subscribeObjectChanges} from './object-revision.js';
import {NativeUploadBytes} from './native-upload-bytes.js';
import {NativeDrawHistory} from './native-draw-history.js';
import {nativeUploadBatches} from './native-upload-batches.js';
import {nativeSpriteTextureSource,spriteTextureUploadKey} from './sprite-texture-source.js';
import {createPixelCanvas} from './pixel-canvas.js';
import {ProbeCandidateIndex} from './reflection-probe-spatial.js';
import {reflectionProbeMeshBounds} from './reflection-probe-bounds.js';
import {prepareDistanceFieldAO} from './mesh-distance-field-scene.js';
import {authoredTextureLevels} from './texture-authored-mips.js';
import {packedTextureRegionUpdates} from './texture-region-updates.js';
import {createNativeParticlePreparation} from './native-particle-preparation.js';
import {updateNativePathPreparation,nativePathPreparationInfo,pollNativePathPreparation} from './native-path-preparation.js';
import {cancelGPUPathPreparation} from './gpu-path-preparation.js';
import {textureUploadBytes,packedTextureMips} from './native-texture-mips.js';
import {geometryStreamStamp,packedDynamicVertices} from './native-geometry-stream.js';
import {nativeSamplerState} from './sampler-state.js';
import {NativeLinePool} from './native-lines.js';
import {NativeShadowCache} from './native-shadow-cache.js';
import {sharedRayInfo} from './shared-ray-geometry.js';
import {ProgressivePathState,bindTransport,configurePathLens,pathFilterKey} from './path-tracing.js';
import {GeometryGIWorld} from './geometry-gi.js';
import {screenEffectsEnabled,ScreenFrameState} from './screen-effects.js';
import {native2DSettings,native2DTextures,native2DTarget,nativeMaskMaterial,nativeShadowMaterials,nativeOffscreenDraw} from './native-2d.js';
import {postProcessActive,postProcessSettings,packedPostProcess,lookupSize} from './post-processing.js';
import {collectReflectionProbes,selectReflectionProbes,reflectionProbeDrawBindings,probeCaptureViews,probeCaptureKey} from './reflection-probes.js';
import {NativeParticleSimulation} from './native-particles.js';
import * as THREE from 'three';
import {createNativeMaterial} from './native-materials.js';
import {bloomSettings} from './bloom-rendering.js';
const cellFrames={serial:0};

const clipDepth=new THREE.Matrix4().set(1,0,0,0,0,1,0,0,0,0,.5,.5,0,0,0,1);
const isDeformed=node=>{if(node.isSkinnedMesh)return true;const morph=node.geometry?.morphAttributes;if(morph)for(const key in morph)if(Object.hasOwn(morph,key)&&morph[key].length)return true;return false;};
const visible=node=>{for(let p=node;p;p=p.parent)if(!p.visible)return false;return true;};
export function rgbaBase64(bytes){if(typeof Buffer!=='undefined'&&ArrayBuffer.isView(bytes)&&bytes.BYTES_PER_ELEMENT===1)return Buffer.from(bytes.buffer,bytes.byteOffset,bytes.byteLength).toString('base64');let text='';for(let i=0;i<bytes.length;i+=32768)text+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(text);}
export function packedRaySceneUpdates(texture,encode=rgbaBase64){
 const {data,width,height}=texture.image||{},stride=width*4;
 if(!texture.userData.hbRayScene||texture.type!==THREE.FloatType||texture.format!==THREE.RGBAFormat||texture.flipY||texture.generateMipmaps||!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||width>16384||height>16384||!(data instanceof Float32Array)||data.length!==stride*height||!texture.updateRanges.length)throw Error('광선 atlas 변경 구간을 확인하세요.');
 const spans=[];for(const r of [...texture.updateRanges].sort((a,b)=>a.start-b.start)){if(!Number.isSafeInteger(r.start)||!Number.isSafeInteger(r.count)||r.start<0||r.count<=0||r.start%stride||r.count%stride||r.start+r.count>data.length)throw Error('광선 atlas 변경 행을 확인하세요.');const last=spans.at(-1);if(last&&r.start<=last.start+last.count)last.count=Math.max(last.count,r.start+r.count-last.start);else spans.push({...r});}
 for(const r of spans)if(!data.subarray(r.start,r.start+r.count).every(Number.isFinite))throw Error('광선 atlas 변경 값이 유한하지 않아요.');
 return {kind:'raySceneUpdates',width,height,patches:spans.map(r=>({row:r.start/stride,rows:r.count/stride,rgbaBase64:encode(new Uint8Array(data.buffer,data.byteOffset+r.start*4,r.count*4))}))};
}
export function packedRaySceneUpdate(texture,encode=rgbaBase64){if(texture.image?.data?.some(v=>!Number.isFinite(v)))throw Error('광선 atlas 값이 유한하지 않아요.');const value=packedRaySceneUpdates(texture,encode),first=value.patches[0].row,last=value.patches.at(-1),rows=last.row+last.rows-first;const {data,width,height}=texture.image,stride=width*4;const selected=data.subarray(first*stride,(first+rows)*stride);if(!selected.every(Number.isFinite))throw Error('광선 atlas 구간이 유한하지 않아요.');return {kind:'raySceneUpdate',width,height,row:first,rows,rgbaBase64:encode(new Uint8Array(selected.buffer,selected.byteOffset,selected.byteLength))};}
export function packedTexture(texture,allowUV1=false,encode=rgbaBase64){
  if(texture.channel!==0&&!(allowUV1&&texture.channel===1))throw Error('DirectX 추가 UV 채널 변환이 필요해요.');
  const cube=!!texture.isCubeTexture,volume=!!texture.isData3DTexture,array=!!texture.isDataArrayTexture,images=cube?texture.image:[texture.image],first=images?.[0]?.isDataTexture?images[0].image:images?.[0],w=first?.width||first?.videoWidth,h=first?.height||first?.videoHeight,layers=cube?6:volume||array?first?.depth:1;
  if(!Number.isSafeInteger(w)||!Number.isSafeInteger(h)||w<=0||h<=0||!Number.isSafeInteger(layers)||layers<=0||w>(volume?2048:16384)||h>(volume?2048:16384)||layers>(volume||array?2048:6)||cube&&(images.length!==6||w!==h))throw Error('DirectX 텍스처 크기와 슬라이스를 확인하세요.');
  const channels=texture.format===THREE.RGBAFormat?4:texture.format===THREE.RGFormat?2:0,half=texture.type===THREE.HalfFloatType,floating=texture.type===THREE.FloatType||half;
  if(w*h*layers*channels*(half?2:floating?4:1)>2147483647)throw Error('텍스처 데이터 크기를 확인하세요.');
  if(!channels||channels!==4&&!floating||!floating&&texture.type!==THREE.UnsignedByteType||floating&&texture.colorSpace===THREE.SRGBColorSpace)throw Error('DirectX 텍스처 형식을 확인하세요.');
  if(cube&&texture.userData?.hbAuthoredMips){const base=authoredTextureLevels(texture)[0];return {kind:'dataTexture',width:w,height:h,layers:6,array:false,dimension:'cube',channels:4,floating:false,srgb:texture.colorSpace===THREE.SRGBColorSpace,mipmaps:false,mipLevels:packedTextureMips(texture,w,h,encode),rgbaBase64:encode(textureUploadBytes(base.data,h,w*4,texture.flipY))};}
  const data=first.data;if(!cube&&data){
    if(data.length!==w*h*layers*channels||!(half?data instanceof Uint16Array:floating?data instanceof Float32Array:data instanceof Uint8Array||data instanceof Uint8ClampedArray)||floating&&data.some(v=>half?(v&0x7c00)===0x7c00:!Number.isFinite(v)))throw Error('DirectX 텍스처 자료 크기와 값을 확인하세요.');
    const mipLevels=packedTextureMips(texture,w,h,encode),bytes=textureUploadBytes(data,h,w*channels*(half?2:floating?4:1),texture.flipY);
    return {kind:'dataTexture',width:w,height:h,layers,array,dimension:volume?'volume':'2d',channels,floating,...(half?{half:true}:{}),srgb:texture.colorSpace===THREE.SRGBColorSpace,mipmaps:texture.generateMipmaps,...(mipLevels?{mipLevels}:{}),rgbaBase64:encode(bytes)};
  }
  if(floating||channels!==4||volume||array)throw Error('DirectX 텍스처 자료 변환을 확인하세요.');
  const bytes=new Uint8Array(w*h*layers*4),off=createPixelCanvas();off.width=w;off.height=h;const context=off.getContext('2d',{willReadFrequently:true});if(!context)throw Error('텍스처 이미지 변환을 시작할 수 없어요.');
  try{for(const [z,face] of images.entries()){const image=face.isDataTexture?face.image:face;if((image.width||image.videoWidth)!==w||(image.height||image.videoHeight)!==h)throw Error('큐브맵 이미지 크기를 맞춰 주세요.');context.clearRect(0,0,w,h);if(image.data){if(face.type!==THREE.UnsignedByteType||face.format!==THREE.RGBAFormat||image.data.length!==w*h*4)throw Error('큐브맵 RGBA8 자료를 확인하세요.');context.putImageData(new ImageData(new Uint8ClampedArray(image.data),w,h),0,0);}else context.drawImage(image,0,0);bytes.set(context.getImageData(0,0,w,h).data,z*w*h*4);}
    if(texture.flipY){const row=w*4;for(let z=0;z<layers;z++)for(let y=0;y<Math.floor(h/2);y++){const a=(z*h+y)*row,b=(z*h+h-y-1)*row,top=bytes.slice(a,a+row);bytes.copyWithin(a,b,b+row);bytes.set(top,b);}}
  }finally{off.width=off.height=0;}
  return {kind:'dataTexture',width:w,height:h,layers,array:false,dimension:cube?'cube':'2d',channels:4,floating:false,srgb:texture.colorSpace===THREE.SRGBColorSpace,mipmaps:texture.generateMipmaps,rgbaBase64:encode(bytes)};
}
// Sphere enclosing a view-projection's frustum (centroid of its 8 corners, max corner distance): a caster sphere that
// misses it cannot be inside the frustum, so the plane tests are skipped.
const frustumCorner=new THREE.Vector3(),frustumInverse=new THREE.Matrix4();
function frustumSphere(vp){frustumInverse.copy(vp).invert();const corners=[];for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])corners.push(frustumCorner.set(x,y,z).applyMatrix4(frustumInverse).clone());const center=corners.reduce((a,c)=>a.add(c),new THREE.Vector3()).multiplyScalar(1/8);let radius=0;for(const c of corners)radius=Math.max(radius,c.distanceTo(center));return Number.isFinite(radius)?new THREE.Sphere(center,radius):null;}
export function nativeShadows(light){
  if(!light.castShadow||!light.shadow||!['DirectionalLight','PointLight','SpotLight'].includes(light.type))return [];
  light.target?.updateWorldMatrix(true,false);const shadow=light.shadow,records=[];
  for(let face=0;face<shadow.getViewportCount();face++){shadow.updateMatrices(light,face);const vp=new THREE.Matrix4().multiplyMatrices(shadow.camera.projectionMatrix,shadow.camera.matrixWorldInverse);records.push({frustum:new THREE.Frustum().setFromProjectionMatrix(vp),sphere:frustumSphere(vp),packed:[...clipDepth.clone().multiply(vp).toArray(),shadow.bias,shadow.normalBias,shadow.radius,shadow.intensity,...shadow.mapSize.toArray(),0,0],casters:[]});}return records;
}
export function packedGeometry(geometry){
  const p=geometry.attributes.position,n=geometry.attributes.normal,u=geometry.attributes.uv,c=geometry.attributes.color;
  if(!p||p.itemSize!==3)throw Error('DirectX 메시 위치 자료를 확인하세요.');
  const vertices=[];for(let i=0;i<p.count;i++)vertices.push(p.getX(i),p.getY(i),p.getZ(i),n?.getX(i)??0,n?.getY(i)??0,n?.getZ(i)??1,u?.getX(i)??0,u?.getY(i)??0,geometry.attributes.extrude?.getX(i)??c?.getX(i)??1,geometry.attributes.turn?.getX(i)??c?.getY(i)??1,geometry.attributes.weight?.getX(i)??c?.getZ(i)??1,c?.itemSize===4?c.getW(i):1);
  const indices=geometry.index?Array.from({length:geometry.index.count},(_,i)=>geometry.index.getX(i)):Array.from({length:p.count},(_,i)=>i);
  if(indices.length%3||vertices.some(v=>!Number.isFinite(v))||indices.some(i=>!Number.isInteger(i)||i<0||i>=p.count))throw Error('DirectX 삼각형 자료를 확인하세요.');const secondary=geometry.attributes.uv1;if(secondary&&(secondary.itemSize!==2||secondary.count!==p.count))throw Error('DirectX UV 1 개수를 확인하세요.');const uv1=secondary?Array.from({length:p.count},(_,i)=>[secondary.getX(i),secondary.getY(i)]).flat():null;if(uv1?.some(v=>!Number.isFinite(v)))throw Error('DirectX UV 1 좌표를 확인하세요.');return {vertices,indices,...(uv1?{uv1}:{})};
}
export function packedInstances(node){
  const shots=node.geometry?.attributes.shotPosition,projectile=node.material?.userData.hbNativeProjectile,capacity=node.isInstancedMesh?node.instanceMatrix.count:shots?.count,count=node.isInstancedMesh?node.count:node.geometry.instanceCount;
  if(!Number.isSafeInteger(capacity)||capacity<=0||!Number.isSafeInteger(count)||count<0||count>capacity||!node.isInstancedMesh&&(!projectile||shots.itemSize!==3))throw Error('DirectX 인스턴스 개수/자료를 확인하세요.');
  if(!node.isInstancedMesh){const values=[];for(let i=0;i<count;i++)values.push(shots.getX(i),shots.getY(i),shots.getZ(i),1);if(values.some(v=>!Number.isFinite(v)))throw Error('DirectX 투사체 위치가 유한해야 해요.');return {capacity:Math.min(capacity,2**Math.ceil(Math.log2(Math.max(1,count)))),positionsOnly:true,values};}
  const values=[],matrix=new THREE.Matrix4(),normal=new THREE.Matrix4(),color=new THREE.Color();
  for(let i=0;i<count;i++){
    node.getMatrixAt(i,matrix);
    if(!Number.isFinite(matrix.determinant())||matrix.determinant()===0)throw Error('DirectX 인스턴스의 변환은 역행렬이 있어야 해요.');normal.copy(matrix).invert().transpose();if(node.instanceColor)node.getColorAt(i,color);else color.setRGB(1,1,1);values.push(...matrix.toArray(),...normal.toArray(),...color.toArray(),1);
  }
  if(values.some(v=>!Number.isFinite(v)))throw Error('DirectX 인스턴스 값이 유한해야 해요.');return {capacity,values};
}
export function packedDeformation(node){
  const geometry=node.geometry,vertexCount=geometry.attributes.position?.count,boneCount=node.isSkinnedMesh?node.skeleton?.bones.length:0,morph=geometry.morphAttributes;
  const morphCount=Math.max(0,...Object.values(morph).map(a=>a.length)),skin=[],targets=[];
  if(!Number.isSafeInteger(vertexCount)||vertexCount<=0||node.isSkinnedMesh&&!boneCount||!boneCount&&!morphCount)throw Error('DirectX 뼈대·모프 자료를 확인하세요.');
  if(Object.keys(morph).some(k=>!['position','normal','color'].includes(k))||Object.values(morph).some(a=>a.length!==morphCount))throw Error('DirectX 모프 채널/개수가 맞지 않아요.');
  const indices=geometry.attributes.skinIndex,weights=geometry.attributes.skinWeight;
  if(boneCount){if(indices?.itemSize!==4||weights?.itemSize!==4||indices.count!==vertexCount||weights.count!==vertexCount)throw Error('DirectX 정점당 네 뼈 자료가 필요해요.');for(let i=0;i<vertexCount;i++){const js=Array.from({length:4},(_,j)=>indices.getComponent(i,j)),ws=Array.from({length:4},(_,j)=>weights.getComponent(i,j));if(js.some(j=>!Number.isInteger(j)||j<0||j>=boneCount)||ws.some(w=>!Number.isFinite(w)||w<0)||!ws.some(w=>w>0))throw Error('DirectX 뼈 인덱스/가중치를 확인하세요.');skin.push(...js,...ws);}}
  for(let t=0;t<morphCount;t++)for(let i=0;i<vertexCount;i++)for(const key of ['position','normal','color']){
    const attribute=morph[key]?.[t],base=geometry.attributes[key],size=key==='color'?4:3;
    if(attribute&&(attribute.count!==vertexCount||attribute.itemSize<3||attribute.itemSize>size))throw Error('DirectX 모프 정점/채널 크기가 맞지 않아요.');
    for(let j=0;j<4;j++){let v=0;const original=j<(base?.itemSize||0)?base.getComponent(i,j):key==='color'?1:key==='normal'&&j===2?1:0;if(attribute&&j<attribute.itemSize)v=attribute.getComponent(i,j)-(geometry.morphTargetsRelative?0:original);else if(attribute&&key==='color'&&j===3&&base?.itemSize===4)v=1-(geometry.morphTargetsRelative?0:base.getW(i));targets.push(v);}
  }
  if(targets.some(v=>!Number.isFinite(v)))throw Error('DirectX 모프 값이 유한해야 해요.');return {vertexCount,boneCount,morphCount,skin,targets};
}
export function packedPose(node){
  const bones=[],matrix=new THREE.Matrix4();if(node.isSkinnedMesh){node.skeleton.update();for(let i=0;i<node.skeleton.bones.length;i++)bones.push(matrix.fromArray(node.skeleton.boneMatrices,i*16).premultiply(node.bindMatrixInverse).multiply(node.bindMatrix).toArray());}
  const count=Math.max(0,...Object.values(node.geometry.morphAttributes).map(a=>a.length)),weights=node.morphTargetInfluences||[];
  const bindTranslation=node.isSkinnedMesh?node.bindMatrixInverse.elements.slice(12,15):[0,0,0];if(weights.length!==count||bones.some(m=>m.some(v=>!Number.isFinite(v)))||weights.some(v=>!Number.isFinite(v))||bindTranslation.some(v=>!Number.isFinite(v)))throw Error('DirectX 애니메이션 포즈/모프 가중치를 확인하세요.');return {bones,weights:Array.from(weights),bindTranslation};
}
export function createNativeProjectileMaterial(style){
  const size=64,bytes=new Uint8Array(size*size*4);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=(y*size+x)*4,d=Math.hypot((x+.5)/size-.5,(y+.5)/size-.5),t=THREE.MathUtils.clamp((d-.42)/.08,0,1);bytes.set([255,255,255,Math.round(255*(1-t*t*(3-2*t)))],i);}
  const fallback=new THREE.DataTexture(bytes,size,size);fallback.needsUpdate=true;const material=new THREE.MeshBasicMaterial({color:new THREE.Color(...style.color.slice(0,3)),opacity:style.color[3],map:fallback,transparent:true,depthWrite:false,side:THREE.DoubleSide,alphaTest:.001});
  let source=null;material.uniforms={uvRect:{value:new THREE.Vector4(0,0,1,1)},shape:{value:new THREE.Vector2(1,1)},size:{value:style.size},planeXZ:{value:style.plane==='XZ'},hasMap:{value:false},map:{get value(){return source;},set value(value){source=value;material.map=value||fallback;material.needsUpdate=true;}}};material.userData.hbNativeProjectile=true;material.addEventListener('dispose',()=>fallback.dispose());return material;
}
const nativeTextureSlots=['map','normalMap','roughnessMap','metalnessMap','emissiveMap','aoMap'],nativeIdentityUV=[1,0,0,0,1,0,0,0,1];
export function nativeMaterial(material){
  if(material.isShaderMaterial&&material.uniforms.topColor){const u=material.uniforms;return {color:[1,1,1,1],emissive:[0,0,0,0],roughness:1,metalness:0,alphaCutoff:0,unlit:true,toneMapped:false,depthTest:true,depthWrite:false,doubleSided:true,backSide:false,vertexColors:false,blend:2,uvX:Array.from({length:6},()=>[1,0,0,0]),uvY:Array.from({length:6},()=>[0,1,0,0]),normalScale:[1,1],sky:true,skyTop:[...u.topColor.value.toArray(),1],skyHorizon:[...u.horizonColor.value.toArray(),1],sunDirection:[...u.sunDirection.value.toArray(),u.sunDiskPower.value],sunColor:[...u.sunColor.value.toArray(),1],moonDirection:[...(u.moonDirection?.value?.toArray?.()||[0,-1,0]),0],moonColor:[...(u.moonColor?.value?.toArray?.()||[0,0,0]),1]};}
  checkNativeMaterial(material);
  return nativeMaterialInto(material,{},{changed:false});
}
export function checkNativeMaterial(material){
  // Imported OBJ/FBX models arrive with Phong/Lambert/Toon materials: shade them as PBR (roughness from Phong shininess, no metal).
  if(!material.isMeshStandardMaterial&&!material.isMeshBasicMaterial&&!material.isSpriteMaterial&&!material.isMeshPhongMaterial&&!material.isMeshLambertMaterial&&!material.isMeshToonMaterial)throw Error('DirectX 셰이더 변환이 필요해요: '+material.type);
  if(material.userData.hbMaterial&&!material.userData.hbNativeProgram)throw Error('DirectX 머테리얼·마스크·2D 조명 변환이 필요해요.');
  if(material.transmissionMap||material.thicknessMap)throw Error('투과·두께 텍스처는 머테리얼 그래프에 연결하세요.');if(material.sheenColorMap||material.sheenRoughnessMap||material.anisotropyMap||material.iridescenceMap||material.iridescenceThicknessMap||material.specularIntensityMap||material.specularColorMap)throw Error('추가 셰이딩 텍스처는 머테리얼 그래프에 연결하세요.');if(material.clearcoatMap||material.clearcoatRoughnessMap||material.clearcoatNormalMap)throw Error('코팅 텍스처는 머테리얼 그래프에 연결하세요.');
  if(material.lightMap&&material.lightMap.channel!==1)throw Error('라이트맵은 UV 1을 사용해요.');
}
// Writes the non-sky material record into `out` (same keys, order and values as a fresh record) and sets
// tracker.changed when any value differs from what `out` held. Retained draws reuse `out` across frames.
function put(o,k,v,w){if(o[k]!==v){o[k]=v;w.changed=true;}}
function put4(o,k,a,b,c,d,w){const t=o[k];if(!t){o[k]=[a,b,c,d];w.changed=true;}else if(t[0]!==a||t[1]!==b||t[2]!==c||t[3]!==d){t[0]=a;t[1]=b;t[2]=c;t[3]=d;w.changed=true;}}
// Packet data is plain arrays/objects/primitives: a direct copy is several times cheaper than structuredClone.
function copyData(v){if(v===null||typeof v!=='object')return v;if(Array.isArray(v)){const out=new Array(v.length);for(let i=0;i<v.length;i++)out[i]=copyData(v[i]);return out;}const out={};for(const k in v)if(Object.hasOwn(v,k))out[k]=copyData(v[k]);return out;}
// Deep write of plain packet data; a new shape stores a private copy (inputs may share arrays with probes).
function syncData(o,k,v,w){const t=o[k];if(t===v)return;if(t&&v&&typeof t==='object'&&typeof v==='object'&&Array.isArray(t)===Array.isArray(v)){const keys=Array.isArray(v)?null:Object.keys(v);if(keys?(()=>{const old=Object.keys(t);return old.length===keys.length&&old.every((x,n)=>x===keys[n]);})():t.length===v.length){if(keys)for(const key of keys)syncData(t,key,v[key],w);else for(let n=0;n<v.length;n++)syncData(t,n,v[n],w);return;}}o[k]=v!==null&&typeof v==='object'?copyData(v):v;w.changed=true;}
function putList(o,k,v,w){const t=o[k];if(!t||t.length!==v.length){o[k]=v.slice();w.changed=true;return;}for(let i=0;i<v.length;i++)if(t[i]!==v[i]){t[i]=v[i];w.changed=true;}}
const uvValues=new Float64Array(48),white=new THREE.Color(1,1,1);
export function nativeMaterialInto(material,o,w,wi=w){
  for(let slot=0;slot<6;slot++){const map=material[nativeTextureSlots[slot]];if(map?.matrixAutoUpdate)map.updateMatrix();const uv=map?.matrix.elements||nativeIdentityUV,i=slot*8;uvValues[i]=uv[0];uvValues[i+1]=uv[3];uvValues[i+2]=uv[6];uvValues[i+3]=0;uvValues[i+4]=uv[1];uvValues[i+5]=uv[4];uvValues[i+6]=uv[7];uvValues[i+7]=0;}
  const effects=material.userData.hbSpriteEffects,u=material.userData.hbNativeProjectile?material.uniforms:null;if(u){const r=u.uvRect.value;uvValues[0]=r.z;uvValues[1]=0;uvValues[2]=r.x;uvValues[3]=0;uvValues[4]=0;uvValues[5]=r.w;uvValues[6]=r.y;uvValues[7]=0;}
  const flash=Math.min(1,Math.max(0,effects?.hbSpriteFlash.value||0)),sourceColor=material.color;let c0,c1,c2;
  if(!sourceColor||sourceColor.constructor===THREE.Color&&sourceColor.clone===THREE.Color.prototype.clone){const r=sourceColor?sourceColor.r:1,g=sourceColor?sourceColor.g:1,b=sourceColor?sourceColor.b:1;c0=r+(1-r)*flash;c1=g+(1-g)*flash;c2=b+(1-b)*flash;}
  else{const c=sourceColor.clone().lerp(white,flash).toArray();c0=c[0];c1=c[1];c2=c[2];}
  put4(o,'color',c0,c1,c2,material.opacity,wi);
  const emission=effects?.hbSpriteEmission.value||0,e=material.emissive;
  put4(o,'emissive',(e?e.r:0)+c0*emission,(e?e.g:0)+c1*emission,(e?e.b:0)+c2*emission,material.emissiveIntensity??1,w);
  put(o,'lightmapIntensity',material.lightMapIntensity??1,w);put(o,'lightmapReflectionMix',material.userData?.hbProbeLightmapMixing===true,w);
  put(o,'roughness',material.roughness??(material.isMeshPhongMaterial?Math.sqrt(2/((material.shininess??30)+2)):1),w);put(o,'metalness',material.metalness??0,w);put(o,'alphaCutoff',material.alphaTest||0,w);
  put4(o,'physical',material.clearcoat||0,material.clearcoatRoughness??.1,material.ior??1.5,material.dispersion||0,w);
  put4(o,'volume',material.transmission||0,material.thickness||0,0,0,w);
  const at=material.attenuationColor;put4(o,'absorption',at?at.r:1,at?at.g:1,at?at.b:1,Number.isFinite(material.attenuationDistance)?material.attenuationDistance:0,w);
  const sc=material.sheenColor;put4(o,'sheenColor',sc?sc.r:1,sc?sc.g:1,sc?sc.b:1,material.sheenRoughness??.5,w);
  put4(o,'lobes',material.sheen||0,material.anisotropy||0,material.anisotropyRotation||0,material.iridescence||0,w);
  put4(o,'film',material.iridescenceIOR??1.3,material.iridescenceThicknessRange?.[1]??400,material.specularIntensity??1,0,w);
  const sp=material.specularColor;put4(o,'specular',sp?sp.r:1,sp?sp.g:1,sp?sp.b:1,0,w);
  put(o,'unlit',!material.isMeshStandardMaterial,w);put(o,'toneMapped',material.toneMapped,w);put(o,'depthTest',material.depthTest,w);put(o,'depthWrite',material.depthWrite,w);put(o,'doubleSided',material.side===THREE.DoubleSide,w);put(o,'backSide',material.side===THREE.BackSide,w);put(o,'vertexColors',material.vertexColors,w);put(o,'blend',material.blending===THREE.AdditiveBlending?1:material.transparent?0:2,w);
  let list=o.uvX;if(!list){o.uvX=list=[];w.changed=true;}for(let slot=0,i=0;slot<6;slot++,i+=8)put4(list,slot,uvValues[i],uvValues[i+1],uvValues[i+2],uvValues[i+3],wi);
  list=o.uvY;if(!list){o.uvY=list=[];w.changed=true;}for(let slot=0,i=4;slot<6;slot++,i+=8)put4(list,slot,uvValues[i],uvValues[i+1],uvValues[i+2],uvValues[i+3],wi);
  const ns=material.normalScale;if(ns){const t=o.normalScale;if(!t||t.length!==2){o.normalScale=[ns.x,ns.y];w.changed=true;}else if(t[0]!==ns.x||t[1]!==ns.y){t[0]=ns.x;t[1]=ns.y;w.changed=true;}}else putList(o,'normalScale',[1,1],w);
  if(u)put4(o,'shotShape',u.size.value*u.shape.value.x,u.size.value*u.shape.value.y,u.planeXZ.value?1:0,0,w);else put4(o,'shotShape',1,1,0,0,w);
  return o;
}
export async function createNativeSceneRenderer(canvas,onError=()=>{},platform={}){
  const bridge=platform.bridge||globalThis.window?.chrome?.webview;if(!bridge)throw Error('DirectX 실행 파일에서 열어 주세요.');
  const pending=new Map();let sequence=0,disposed=false,ratio=1,width=canvas.clientWidth||1,height=canvas.clientHeight||1;
  const viewport=new THREE.Vector4(0,0,width,height),scissor=viewport.clone(),clearColor=new THREE.Color(0);let scissorTest=false,clearAlpha=1,explicitClear=null;
  const surface=platform.surface;
  const receive=event=>{const m=event.data;if(m?.channel!=='hb.render'||m.surface!==surface)return;const r=pending.get(m.id);if(!r)return;pending.delete(m.id);clearTimeout(r.timer);m.ok?r.resolve(m.value):r.reject(Error(m.error));};bridge.addEventListener('message',receive);
  function send(op,data,serializedData,buffers){if(disposed)return Promise.reject(Error('DirectX 렌더러가 닫혔어요.'));const id=++sequence;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(id);reject(Error('DirectX 응답 시간이 초과됐어요: '+op));},op==='init'?120000:15000);pending.set(id,{resolve,reject,timer});try{const message={channel:'hb.render',id,op,surface};if(buffers?.length&&typeof bridge.postBinaryMessage==='function')bridge.postBinaryMessage(JSON.stringify(message).slice(0,-1)+',"data":'+serializedData+'}',buffers);else if(serializedData!==undefined&&typeof bridge.postSerializedMessage==='function')bridge.postSerializedMessage(JSON.stringify(message).slice(0,-1)+',"data":'+serializedData+'}');else bridge.postMessage({...message,data});}catch(error){pending.delete(id);clearTimeout(timer);reject(error);}});}
  // Embedded: the host window's swap chain sits behind a transparent WebView, so the frame covers the whole client area
  // and the canvas becomes a viewport rectangle inside it. Outside the canvas the surface is cleared to platform.outsideColor (sRGB).
  function embed(data){
    const rect=canvas.getBoundingClientRect(),dpr=globalThis.devicePixelRatio||1,w=Math.max(1,Math.round(globalThis.innerWidth*dpr)),h=Math.max(1,Math.round(globalThis.innerHeight*dpr)),x=Math.round(rect.left*dpr),y=Math.round(rect.top*dpr);
    const shift=r=>r&&[r[0]+x,r[1]+y,r[2],r[3]];data.width=w;data.height=h;data.viewport=shift(data.viewport);if(data.scissor)data.scissor=shift(data.scissor);else data.scissor=[x,y,canvas.width,canvas.height];
    if(data.clear){if(!data.viewportClear)data.viewportClear=[...new THREE.Color(data.clear[0],data.clear[1],data.clear[2]).convertSRGBToLinear().toArray(),data.clear[3]];data.clear=[...(platform.outsideColor||[0,0,0]),1];}
  }
  let capabilities;try{capabilities=await send('init',{width:Math.max(1,width),height:Math.max(1,height),asyncShaderPreparation:true,asyncD3D12:!!(platform.surface||platform.embedded),backend:platform.graphicsAPI||'d3d11'});}catch(error){bridge.removeEventListener('message',receive);throw error;}
  const binaryUploads=capabilities.binaryResourceUpload===1&&typeof bridge.postBinaryMessage==='function',uploadBytes=binaryUploads?bytes=>new NativeUploadBytes(bytes):rgbaBase64;
  if(!surface)globalThis.document?.documentElement?.classList.add('native-scene');
  const particleCommands=[],nativeParticles=new Set(),offscreenResources=[],offscreenPasses=[],offscreenUsed={meshes:new Set(),textures:new Set()},maskPassCache=new Map(),probeCache=new Map(),probeCandidateIndex=new ProbeCandidateIndex(),shadowCache=new NativeShadowCache();let renderTarget=null,globalProbeStamp=null;const particlePreparation=createNativeParticlePreparation(send,{isDisposed:()=>disposed,onState:packet=>{renderer.hbPathPreparation=updateNativePathPreparation(renderer.hbPathPreparation,packet);}});
  // Retained draws go into the packet without a copy: a frame packet is serialized when sent (or at encode for capture
  // views), and render() refuses to encode again while the previous frame job is pending, so no later write reaches it.
  // Draw id strings are reused per node (a rebuilt string is rehashed on every Map lookup).
  const retainTracker={changed:false},instanceTracker={changed:false},materialTracker={changed:false},materialInstanceTracker={changed:false},drawIds=new WeakMap();let materialSamples=0;
  // Sprite batching (2D): consecutive sorted sprites with identical non-instance draw values become one instanced draw.
  // Per instance: world, normal, colour (material colour incl. opacity) and the map's UV rows; the batch draw keeps an
  // identity world/normal, white colour and identity UV rows. renderer.hbSpriteBatching=false turns it off.
  const spriteCandidates=new Map(),batchedSprites=new Set(),spriteInstances=new Map(),spriteStateKeys=new Map(),identity16=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],SPRITE_STRIDE=44;
  function batchableSpriteUV(d){const x=d.material.uvX,y=d.material.uvY;for(let k=1;k<6;k++)if(d.maps[k]){const a=x[k],b=x[0],c=y[k],e=y[0];if(a[0]!==b[0]||a[1]!==b[1]||a[2]!==b[2]||c[0]!==e[0]||c[1]!==e[1]||c[2]!==e[2])return false;}return true;}
  // Geometry part of the batch key: an unmodified built-in parametric geometry is identified by type and parameters (the
  // batch draws the first member's identical mesh); anything else must be the same geometry object.
  function batchGeometryKey(g){if(g.type!=='BufferGeometry'&&g.parameters&&!g.index?.version&&!Object.keys(g.morphAttributes).length){let fresh=true;for(const name in g.attributes){const a=g.attributes[name];if((a.isInterleavedBufferAttribute?a.data.version:a.version)!==0){fresh=false;break;}}if(fresh)return [g.type,g.parameters];}return g.uuid;}
  function spriteStateKey(c){const entry=c.entry;if(entry.stateKey!=null)return entry.stateKey;const {id:_id,world:_w,normal:_n,mesh:_m,material,...rest}=entry.draw,{color:_c,uvX:_x,uvY:_y,...mat}=material,text=JSON.stringify([rest,mat,batchGeometryKey(c.geometry)]);let key=spriteStateKeys.get(text);if(key===undefined){if(spriteStateKeys.size>4096)spriteStateKeys.clear();spriteStateKeys.set(text,key=spriteStateKeys.size+1);}return entry.stateKey=key;}
  function emitSpriteBatch(run,resources,used,items){
    const first=run[0],batchId='sprites:'+first.item.id,instId=batchId+':instances',n=run.length;let cache=spriteInstances.get(instId);
    if(!cache||cache.values.length<n*SPRITE_STRIDE){cache={values:new Float64Array(2**Math.ceil(Math.log2(n))*SPRITE_STRIDE),count:-1};spriteInstances.set(instId,cache);}
    const v=cache.values;let changed=cache.count!==n;
    // Compare-on-write per instance row (inline: this runs for every visible batched draw each frame).
    for(let i=0;i<n;i++){const d=run[i].c.entry.draw,m=d.material,o=i*SPRITE_STRIDE,w=d.world,nm=d.normal,c=m.color,x=m.uvX[0],y=m.uvY[0];let same=true;
     for(let k=0;k<16;k++)if(v[o+k]!==w[k]||v[o+16+k]!==nm[k]){same=false;break;}
     if(same)for(let k=0;k<4;k++)if(v[o+32+k]!==c[k]){same=false;break;}
     if(same)for(let k=0;k<3;k++)if(v[o+36+k]!==x[k]||v[o+40+k]!==y[k]){same=false;break;}
     if(same&&v[o+39]===0&&v[o+43]===0)continue;changed=true;
     for(let k=0;k<16;k++){v[o+k]=w[k];v[o+16+k]=nm[k];}for(let k=0;k<4;k++)v[o+32+k]=c[k];for(let k=0;k<3;k++){v[o+36+k]=x[k];v[o+40+k]=y[k];}v[o+39]=0;v[o+43]=0;}
    if(changed){cache.count=n;resources.push({kind:'instances',id:instId,capacity:cache.values.length/SPRITE_STRIDE,uv:true,values:Array.from(v.subarray(0,n*SPRITE_STRIDE))});}
    cache.used=true;used.instances.add(instId);
    const draw=copyData(first.c.entry.draw);draw.id=batchId;draw.world=identity16.slice();draw.normal=identity16.slice();draw.material.color=[1,1,1,1];draw.material.uvX=draw.material.uvX.map(()=>[1,0,0,0]);draw.material.uvY=draw.material.uvY.map(()=>[0,1,0,0]);draw.instances=instId;
    const stamp=drawHistory.stamp(batchId,draw);if(previous.get(batchId)!==stamp){batchUpdates.push(draw);previous.set(batchId,stamp);}batchSeen.add(batchId);items.push({...first.item,id:batchId});
  }
  // Main-pass order after sorting: opaque items group same-key candidates within one (phase, renderOrder) block at the
  // first member's place; transparent and transmissive items only merge sorted neighbours (their order is visible).
  let batchUpdates=null,batchSeen=null;
  function emitSpriteDraws(items,updates,seen,resources,used){
    batchUpdates=updates;batchSeen=seen;const list=items.splice(0),phase=item=>item.transmissive?1:item.transparent?2:0;
    const emit=run=>{if(run.length>1)emitSpriteBatch(run,resources,used,items);else items.push(run[0].item);};
    for(let start=0;start<list.length;){
      let end=start+1;while(end<list.length&&phase(list[end])===phase(list[start])&&(phase(list[start])!==0||list[end].order===list[start].order))end++;
      if(phase(list[start])===0){const groups=new Map(),rows=[];for(let i=start;i<end;i++){const item=list[i],c=spriteCandidates.get(item.id);if(!c){rows.push({item});continue;}const key=spriteStateKey(c);let group=groups.get(key);if(!group){groups.set(key,group=[]);rows.push({group});}group.push({item,c,key});}
       for(const row of rows)if(row.item)items.push(row.item);else emit(row.group);}
      else{let run=[];for(let i=start;i<end;i++){const item=list[i],c=spriteCandidates.get(item.id);if(!c){if(run.length){emit(run);run=[];}items.push(item);continue;}const key=spriteStateKey(c);if(run.length&&run[0].key!==key){emit(run);run=[];}run.push({item,c,key});}if(run.length)emit(run);}
      start=end;
    }
    spriteCandidates.clear();
  }
  function releaseSpriteInstances(){for(const [id,cache] of spriteInstances){if(cache.used){cache.used=false;continue;}spriteInstances.delete(id);released.instances.add(id);}}let retainSerial=0,probeEpoch=0,lastProbeKey=null;
  const linePool=new NativeLinePool(),geometries=new Map(),textures=new Map(),programs=new Map(),instances=new Map(),deformations=new Map(),previous=new Map(),spriteGeometry=new THREE.PlaneGeometry(1,1),normalMatrix=new THREE.Matrix4(),at=new THREE.Vector3(),cameraAt=new THREE.Vector3(),cameraBack=new THREE.Vector3(),lightAt=new THREE.Vector3(),targetAt=new THREE.Vector3(),frustum=new THREE.Frustum(),projectionView=new THREE.Matrix4();
  // staticDrawEpoch: host draws are reset with the scene, so cached static group draws of an older epoch are invalid.
  const defaultDrawHistory=new NativeDrawHistory();let staticDrawEpoch=0,drawHistory=defaultDrawHistory,captureViews=null,activeView=null;const cameraContexts=new Map();
  const cameraKeys=['hbScreenState','hbScreenSettings','hbScreenArea','hbPathState','hbGeometryWorld','hbFilterKey','hbPostCamera','hbPostScene','hbPostTime'];
  function useCameraContext(id,fn){let state=cameraContexts.get(id);if(!state)cameraContexts.set(id,state={history:new NativeDrawHistory()});const saved=cameraKeys.map(key=>renderer[key]),history=drawHistory;for(const key of cameraKeys)renderer[key]=state[key];drawHistory=state.history;try{return fn();}finally{for(const key of cameraKeys)state[key]=renderer[key];cameraKeys.forEach((key,index)=>renderer[key]=saved[index]);drawHistory=history;}}
  function pruneCameraContexts(ids){for(const [id,state] of cameraContexts)if(!ids.includes(id)){state.hbScreenState?.reset();state.hbPathState?.reset();state.hbGeometryWorld?.dispose();cameraContexts.delete(id);}}
  let frameJob=null,oldOrder='',oldLights='',oldShadows='',oldCasters='',lastUpdateCount=0,stats={calls:0,meshes:0,textures:0,uploads:0,captures:0,presents:0};
  const uploadTotals={packets:0,bytes:0,maxPacketBytes:0};
  const sharedTextureGroups=new Map(),subscriptions=new Set(),released={meshes:new Set(),textures:new Set(),programs:new Set(),instances:new Set(),deformations:new Set()};
  let tracked=new WeakMap(),disposeJob=null;
  function subscribeDisposal(resource,release){const ref=new WeakRef(resource),record={ref,listener:null};record.listener=event=>{const target=event.target||ref.deref();target?.removeEventListener('dispose',record.listener);subscriptions.delete(record);release(target);};subscriptions.add(record);resource.addEventListener('dispose',record.listener);}
  function clearDisposalSubscriptions(){for(const record of subscriptions)record.ref.deref()?.removeEventListener('dispose',record.listener);subscriptions.clear();tracked=new WeakMap();}
  const attributes=new WeakMap();let nextAttribute=0;const attributeId=a=>{if(!a)return 0;if(!attributes.has(a))attributes.set(a,++nextAttribute);return attributes.get(a);};
  function track(resource,kind,id,cache){let entries=tracked.get(resource);if(!entries){entries=new Set();tracked.set(resource,entries);}const key=kind+':'+id;if(entries.has(key))return;entries.add(key);subscribeDisposal(resource,target=>{tracked.get(target)?.delete(key);cache.delete(id);maskPassCache.delete(id);released[kind].add(id);});}
  const info={autoReset:false,memory:{geometries:0,textures:0},render:{calls:0,triangles:0,points:0,lines:0},reset(){this.render.calls=this.render.triangles=0;}};
  // Unchanged geometry (same index/attribute objects and versions) skips the JSON stamp entirely.
  const geometryVersions=new WeakMap();
  // Same comparison as geometryVersionKey(...).every(===) without building the key array on every draw.
  function sameGeometryVersion(known,geometry){let i=0;if(known[i++]!==geometry.index||known[i++]!==geometry.index?.version)return false;for(const name in geometry.attributes){const a=geometry.attributes[name];if(known[i++]!==name||known[i++]!==a||known[i++]!==(a.isInterleavedBufferAttribute?a.data.version:a.version)||known[i++]!==a.usage)return false;}return i===known.length;}
  function geometryVersionKey(geometry){const out=[geometry.index,geometry.index?.version];for(const name in geometry.attributes){const a=geometry.attributes[name];out.push(name,a,a.isInterleavedBufferAttribute?a.data.version:a.version,a.usage);}return out;}
  function geometryResource(geometry,resources){
    const known=geometryVersions.get(geometry);
    if(known&&sameGeometryVersion(known,geometry)&&geometries.has(geometry.uuid))return geometry.uuid;
    const versions=geometryVersionKey(geometry);
    track(geometry,'meshes',geometry.uuid,geometries);
    const stamp=geometryStreamStamp(geometry,attributeId,capabilities?.dynamicMesh),previous=geometries.get(geometry.uuid);
    if(previous?.signature!==stamp.signature){if(stamp.dynamic&&previous?.layout===stamp.layout){const vertices=packedDynamicVertices(geometry,previous.vertices);resources.push({kind:'meshVertices',id:geometry.uuid,vertices});geometries.set(geometry.uuid,{...stamp,vertices});}else{resources.push({kind:'mesh',id:geometry.uuid,...packedGeometry(geometry),...(stamp.dynamic?{dynamic:true}:{})});geometries.set(geometry.uuid,stamp);}}geometryVersions.set(geometry,versions);return geometry.uuid;
  }
  function instanceResource(node,resources,objectMotion){
    const owner=node.isInstancedMesh?node:node.geometry,id=owner.uuid,u=node.material?.userData.hbNativeProjectile?node.material.uniforms:null,signature=JSON.stringify([node.count,node.geometry.instanceCount,node.instanceMatrix?.version,node.instanceColor?.version,node.geometry.attributes.shotPosition?.version,node.instanceMatrix?.count,node.geometry.attributes.shotPosition?.count,objectMotion?.pose?.instances,u?.size?.value,u?.shape?.value.toArray(),u?.planeXZ?.value]);track(owner,'instances',id,instances);if(node.isInstancedMesh)track(node.geometry,'instances',id,instances);
    if(instances.get(id)!==signature){resources.push({kind:'instances',id,...packedInstances(node),...(objectMotion?.pose?.instances?{previousMatrices:objectMotion.pose.instances}:{})});instances.set(id,signature);}return id;
  }
  function deformationResource(node,resources,poses,objectMotion){
    const id=node.uuid,geometry=node.geometry,signature=JSON.stringify([geometry.uuid,node.skeleton?.bones.length,geometry.morphTargetsRelative,...['position','normal','color','skinIndex','skinWeight'].map(k=>[k,attributeId(geometry.attributes[k]),geometry.attributes[k]?.isInterleavedBufferAttribute?geometry.attributes[k].data.version:geometry.attributes[k]?.version]),...Object.entries(geometry.morphAttributes).map(([k,a])=>[k,...a.map(v=>[attributeId(v),v.isInterleavedBufferAttribute?v.data.version:v.version])])]);
    track(node,'deformations',id,deformations);track(geometry,'deformations',id,deformations);let entry=deformations.get(id);
    if(entry?.signature!==signature){resources.push({kind:'deformation',id,...packedDeformation(node)});entry={signature,pose:''};deformations.set(id,entry);}
    const values={...packedPose(node),previous:objectMotion?.pose?{bones:objectMotion.pose.bones,weights:objectMotion.pose.weights,bindTranslation:objectMotion.pose.bindTranslation}:null},pose=JSON.stringify(values);if(entry.pose!==pose){poses.push({id,...values});entry.pose=pose;}return id;
  }
  function trackSharedTexture(resource,id){let group=sharedTextureGroups.get(id);if(!group){group=new Set();sharedTextureGroups.set(id,group);}if(group.has(resource))return;group.add(resource);subscribeDisposal(resource,target=>{group.delete(target);if(!group.size&&sharedTextureGroups.get(id)===group){sharedTextureGroups.delete(id);textures.delete(id);maskPassCache.delete(id);released.textures.add(id);}});}
  function textureResource(texture,resources,allowUV1=false){
    if(!texture)return '';if(texture.userData.hbNativeTarget)return targetResource(texture.userData.hbNativeTarget,resources);
    const source=nativeSpriteTextureSource(texture),key=source?spriteTextureUploadKey(texture,source.base):texture.uuid,version=source?source.revision:texture.version;if(source)trackSharedTexture(source.base,key);if(textures.get(key)!==version){
      if(!source)track(texture,'textures',key,textures);
      const regions=!source&&textures.has(key)?packedTextureRegionUpdates(texture,textures.get(key),uploadBytes):null;if(!regions||regions.patches.length)resources.push({id:key,...(regions||(textures.has(key)&&texture.userData.hbRayScene&&texture.updateRanges.length?packedRaySceneUpdates(texture,uploadBytes):packedTexture(texture,allowUV1,uploadBytes)))});textures.set(key,version);if(texture.userData.hbRayScene)texture.clearUpdateRanges();
    }return key;
  }
  function targetResource(target,resources){const id=target.texture.uuid,stamp='target:'+target.width+':'+target.height+':'+target.stencilBuffer;track(target,'textures',id,textures);if(textures.get(id)!==stamp){resources.push({kind:'target2d',id,width:target.width,height:target.height,stencil:target.stencilBuffer});textures.set(id,stamp);maskPassCache.delete(id);}return id;}
  function offscreen(scene,camera,clearOnly=false){
    if(frameJob)throw Error('DirectX 이전 프레임 전송이 진행 중이에요.');const target=renderTarget,id=targetResource(target,offscreenResources);offscreenUsed.textures.add(id);
    const v=target.viewport,s=target.scissor,pass={target:id,viewProjection:clipDepth.clone().multiply(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse)).toArray(),viewport:[v.x,target.height-v.y-v.w,v.z,v.w],clear:clearOnly||renderer.autoClear,clearColor:[...clearColor.toArray(),clearAlpha],draws:[]};if(target.scissorTest)pass.scissor=[s.x,target.height-s.y-s.w,s.z,s.w];
    if(!clearOnly){scene.updateMatrixWorld();camera.updateWorldMatrix(true,false);pass.viewProjection=clipDepth.clone().multiply(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse)).toArray();const nodes=[];scene.traverseVisible(n=>{if(n.isMesh&&visible(n)&&n.material.visible)nodes.push(n);});nodes.sort((a,b)=>a.renderOrder-b.renderOrder||a.uuid.localeCompare(b.uuid));for(const node of nodes){const draw=nativeOffscreenDraw(node,camera,geometryResource,textureResource,offscreenResources);pass.draws.push(draw);offscreenUsed.meshes.add(draw.mesh);if(draw.map)offscreenUsed.textures.add(draw.map);}}
    const stamp=JSON.stringify(pass);if(renderer.autoClear&&!clearOnly&&offscreenResources.length===0&&maskPassCache.get(id)===stamp)return;if(renderer.autoClear)maskPassCache.set(id,stamp);offscreenPasses.push(pass);
  }
  // World bounding sphere exactly as Frustum.intersectsObject builds it (object.boundingSphere, else the geometry's).
  const worldSphere=new THREE.Sphere();
  function nodeWorldSphere(node){if(node.boundingSphere!==undefined){if(node.boundingSphere===null)node.computeBoundingSphere();worldSphere.copy(node.boundingSphere).applyMatrix4(node.matrixWorld);}else{const geometry=node.geometry;if(geometry.boundingSphere===null)geometry.computeBoundingSphere();worldSphere.copy(geometry.boundingSphere).applyMatrix4(node.matrixWorld);}return worldSphere;}
  // traverseVisible with a subtree skip: same visit order; skip(node) is asked before visiting a visible node.
  // traverseVisible with a subtree skip: same visit order; skip(node) is asked before visiting a visible node.
  // marked(child) (optional) handles a child marked by a static cell this frame without a call per member.
  function traverseVisibleSkipping(node,callback,skip,leave,mark){if(node.visible===false||skip(node))return;callback(node);const children=node.children;for(let i=0;i<children.length;i++){const child=children[i];const host=child.hbHost;if(host!==undefined&&hostActive&&host.owner===hostOwner&&hostKeep(child,host))continue;if(mark!==undefined&&child.hbCellMark===mark){if(child.visible!==false)skippedMarked(child);continue;}traverseVisibleSkipping(child,callback,skip,leave,mark);}leave?.(node);}
  let skippedMarked=null;
  // Host static sets (docs/HOST_SCENE_DESIGN.md stage 1). A clean static group whose draws are all opaque batch
  // candidates, unchanged for HOST_AGE encodes, moves into host sets keyed by batch state, render order and shadow casting:
  // its instance rows and bounding spheres go to the host once, the host culls them per frame and draws one instanced
  // draw per set, and the traversal skips the group with one property read. Any announced change, visibility, parent or
  // matrix flag change, leaving the scene, probes, verify mode or static skipping off moves the group back.
  const HOST_AGE=30,hostOwner={},hostSets=new Map(),hostGroups=new Map(),hostObjects=new WeakMap(),hostChanges=subscribeObjectChanges(),hostPending=new Map(),hostReleased=[];let hostActive=false,hostSerial=0,hostEpoch=-1,hostFrame=0,hostBuildNode=null,hostForceLeft=0;const hostForce=new Set(),HOST_FORCE_BUDGET=512;
  function hostDemote(group){const h=hostGroups.get(group);if(!h)return;hostGroups.delete(group);group.hbHost=undefined;for(const m of h.members){m.set.members.delete(m);m.set.dirty=true;}}
  function hostKeep(child,h){
   if(child.visible===false||child.matrixWorldNeedsUpdate||child.parent!==h.parent){hostDemote(child);return false;}
   const p=child.parent;if(p.hbIdentityFrame!==cellFrame){p.hbIdentityFrame=cellFrame;p.hbIdentity=identityWorld(p);}if(!p.hbIdentity){hostDemote(child);return false;}
   h.seen=hostFrame;return true;
  }
  function hostReset(){for(const group of hostGroups.keys())group.hbHost=undefined;hostGroups.clear();hostSets.clear();hostPending.clear();hostReleased.length=0;}
  // A visited clean group (its capture holds every draw id) waits HOST_AGE encodes with the same revisions.
  function hostConsider(group,capture){const r=capture.record,rev=objectRevision(r.object),t=rev?rev.transform:0,c=rev?rev.components:0;if(r.hostT!==t||r.hostC!==c){r.hostT=t;r.hostC=c;r.hostSince=hostFrame;hostPending.delete(group);return;}if(hostFrame-r.hostSince<HOST_AGE||!capture.ids.length)return;const p=hostPending.get(group);if(p){p.ids=capture.ids;p.seen=hostFrame;}else hostPending.set(group,{group,record:r,ids:capture.ids,since:hostFrame,seen:hostFrame});}
  function hostPromote({group,record,ids},promoted){
   const members=[];for(const id of ids){const c=spriteCandidates.get(id);if(!c||c.transparent||c.entry.twoD||c.node.userData.draw2d||!c.node.parent)return;/* 2D sorting rewrites renderOrder every frame */members.push(c);}
   const h={owner:hostOwner,parent:group.parent,members:[],seen:hostFrame};
   for(const c of members){const node=c.node,key=spriteStateKey(c)+'|'+node.renderOrder+'|'+(node.castShadow?1:0);let set=hostSets.get(key);if(!set)hostSets.set(key,set={id:'host:'+(++hostSerial),members:new Set(),dirty:true,version:0,order:node.renderOrder,casts:!!node.castShadow,receives:false,template:null,stamp:''});
    const d=c.entry.draw,m=d.material,row=new Float32Array(44),sphere=nodeWorldSphere(node);row.set(d.world,0);row.set(d.normal,16);row.set(m.color,32);row.set(m.uvX[0].slice(0,3),36);row.set(m.uvY[0].slice(0,3),40);
    const member={set,row,sphere:[sphere.center.x,sphere.center.y,sphere.center.z,sphere.radius],draw:d,receives:c.receives};set.members.add(member);set.dirty=true;h.members.push(member);}
   hostGroups.set(group,h);group.hbHost=h;hostObjects.set(record.object,group);record.drawCache=null;for(const id of ids)promoted.add(id);
  }
  // Sends changed sets (rows and spheres as bytes), releases empty ones, and adds every set to this frame's draw lists.
  function hostEmit(items,updates,seen,resources,used,shadowRecords){
   for(const [key,set] of hostSets){
    if(!set.members.size){hostSets.delete(key);if(set.sent)hostReleased.push(set.id);continue;}
    if(set.dirty){const list=[...set.members],rows=new Float32Array(list.length*44),spheres=new Float32Array(list.length*4);let receives=false;for(let i=0;i<list.length;i++){rows.set(list[i].row,i*44);spheres.set(list[i].sphere,i*4);receives||=list[i].receives;}
     resources.push({kind:'cullSet',id:set.id,rows:uploadBytes(new Uint8Array(rows.buffer)),spheres:uploadBytes(new Uint8Array(spheres.buffer))});
     const draw=copyData(list[0].draw);draw.id=set.id;draw.world=identity16.slice();draw.normal=identity16.slice();draw.material.color=[1,1,1,1];draw.material.uvX=draw.material.uvX.map(()=>[1,0,0,0]);draw.material.uvY=draw.material.uvY.map(()=>[0,1,0,0]);delete draw.instances;draw.cullSet=set.id;
     set.template=draw;set.receives=receives;set.version++;set.dirty=false;set.sent=true;set.stamp=drawHistory.stamp(set.id,draw)+':'+set.version;updates.push(draw);previous.set(set.id,set.stamp);}
    const draw=set.template;seen.add(set.id);used.meshes.add(draw.mesh);for(const id of draw.maps)if(id)used.textures.add(id);if(draw.lightmap)used.textures.add(draw.lightmap);
    if(set.casts&&shadowRecords.length){shadowCache.draw(set.id,draw,set.stamp,false);for(const record of shadowRecords)record.casters.push(set.id);}
    items.push({id:set.id,order:set.order,transparent:false,transmissive:false,depth:-1e30});
   }
  }
  // Static cells: clean static groups that were skipped once join a world grid cell (cell size from their radius). Each
  // frame a cell is tested once; when it misses the camera and every shadow frustum, its members that still match their
  // entry (visibility, revisions, parent, draw cache) are marked, and the traversal skips a marked group with a property
  // read, adding the same cached draws in the same order as the per-group skip.
  const STATIC_ENTRY=Symbol('hbStaticEntry'),staticCells=new Map();let cellFrame=0;// unique across renderers: node.hbCellMark is shared by every renderer
  function staticCellKey(sphere){const level=Math.max(4,Math.ceil(Math.log2(Math.max(sphere.radius*4,1)))),size=2**level,c=sphere.center;return level+':'+Math.floor(c.x/size)+','+Math.floor(c.y/size)+','+Math.floor(c.z/size);}
  function admitStatic(node,r,sphere,box,cache,probes){
   let e=node[STATIC_ENTRY];if(e&&e.cell.members.has(node))return;const key=staticCellKey(sphere);let cell=staticCells.get(key);if(!cell)staticCells.set(key,cell={members:new Set(),sphere:new THREE.Sphere(),box:new THREE.Box3(),dirty:true});
   const rev=objectRevision(r.object);e={cell,r,transform:rev?rev.transform:0,components:rev?rev.components:0,cache,probes,epoch:staticDrawEpoch,pre:0,main:0};Object.defineProperty(node,STATIC_ENTRY,{value:e,writable:true,configurable:true,enumerable:false});
   cell.members.add(node);if(cell.dirty)return;if(cell.sphere.isEmpty())cell.sphere.copy(sphere);else cell.sphere.union(sphere);if(box)cell.box.union(box);else cell.boxPartial=true;
  }
  function staticEntryValid(node,e,probes){
   if(node.visible===false||!node.parent||node.matrixWorldNeedsUpdate||e.probes!==probes||e.epoch!==staticDrawEpoch||e.r.drawCache!==e.cache)return false;
   const p=node.parent;if(p.hbIdentityFrame!==cellFrame){p.hbIdentityFrame=cellFrame;p.hbIdentity=identityWorld(p);}if(!p.hbIdentity)return false;
   const rev=objectRevision(e.r.object);return (rev?rev.transform:0)===e.transform&&(rev?rev.components:0)===e.components;
  }
  // Marks the valid members of cells that pass offscreen(cell); invalid members leave their cell.
  function markStaticCells(probes,key,offscreen){
   for(const [id,cell] of staticCells){
    if(cell.dirty){cell.sphere.makeEmpty();cell.box.makeEmpty();cell.boxPartial=false;for(const node of cell.members){const r=node[STATIC_ENTRY].r,sphere=staticGroupSphere(node,r);if(!sphere){cell.members.delete(node);node[STATIC_ENTRY]=undefined;continue;}if(cell.sphere.isEmpty())cell.sphere.copy(sphere);else cell.sphere.union(sphere);const box=probes?staticGroupBox(node,r):null;if(box)cell.box.union(box);else cell.boxPartial=true;}cell.dirty=false;}
    if(!cell.members.size){staticCells.delete(id);continue;}if(probes&&cell.boxPartial||!offscreen(cell))continue;
    for(const node of cell.members){const e=node[STATIC_ENTRY];if(node.hbHost!==undefined){cell.members.delete(node);node[STATIC_ENTRY]=undefined;cell.dirty=true;continue;}if(staticEntryValid(node,e,probes)){e[key]=cellFrame;if(key==='main')node.hbCellMark=cellFrame;}else{cell.members.delete(node);node[STATIC_ENTRY]=undefined;cell.dirty=true;}}
   }
  }
  const identityElements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],identityWorld=node=>{const e=node.matrixWorld.elements;for(let i=0;i<16;i++)if(e[i]!==identityElements[i])return false;return true;};
  const wrap=value=>value===THREE.RepeatWrapping?0:value===THREE.MirroredRepeatWrapping?1:2;
  function encode(scene,camera){
    scene.updateMatrixWorld();camera.updateWorldMatrix(true,false);cameraAt.setFromMatrixPosition(camera.matrixWorld);cameraBack.setFromMatrixColumn(camera.matrixWorld,2).normalize();projectionView.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(projectionView);
    const materialsPending=!!stats.shaderPreparation?.raster?.pending;if(materialsPending)probeCache.clear();
    // Announced changes leave host sets before probes are collected (a probe added to a held group is seen at once).
    if(hostEpoch!==staticDrawEpoch){hostReset();hostEpoch=staticDrawEpoch;}for(const o of hostChanges){const g=hostObjects.get(o);if(g)hostDemote(g);}hostChanges.clear();
    let needsGlobalProbes=false;const probes=collectReflectionProbes(scene);probeCandidateIndex.update(probes);
    // Probe epoch: changes only when the probe list (its JSON wire values) changes; retained draws reuse bindings within one epoch.
    const probeKey=probes.length?JSON.stringify(probes.map(({group,...probe})=>probe)):'';if(probeKey!==lastProbeKey){lastProbeKey=probeKey;probeEpoch++;}const probeBounds=new THREE.Box3(),probeDraws=[],skyCapture=scene.userData.skyNative,skyNodes=new Set(),skyDraws=[];if(skyCapture)for(const group of [skyCapture.skyDome,skyCapture.cloudGroup])group?.traverseVisible(node=>{if(node.isMesh)skyNodes.add(node);});
    const resources=offscreenResources.splice(0),updates=[],items=[],seen=new Set(),lights=[],ambient=[0,0,0,1],parameters=[],poses=[],shadowRecords=[],shadowIndexes=new Map(),used={meshes:new Set(),textures:new Set(),programs:new Set(),instances:new Set(),deformations:new Set()};let animatedCaster=false;for(const kind of ['meshes','textures']){for(const id of offscreenUsed[kind])used[kind].add(id);offscreenUsed[kind].clear();}
    linePool.begin();const shadowLights=[];let receivers=false;
    // Static groups whose bounding sphere misses the camera and every shadow frustum are not visited (no reflection probes:
    // probe captures include off-screen objects). Same visit order as traverseVisible otherwise.
    // Clean static groups outside the camera and every shadow frustum are not visited. Their last visit's draws stay on the
    // host (marked seen) and their probe-capture entries are reused, so reflection probes see them unchanged. Without such a
    // cache (and with probes) the group is visited and its cache recorded (leaveStaticGroup).
    let capture=null;const reuseStatic=drawHistory===defaultDrawHistory;
    // With probes the per-mesh culling uses reflection-probe AABBs, so the group test uses their union (never tighter).
    skippedMarked=node=>{const cache=node[STATIC_ENTRY].cache;if(cache){for(const id of cache.ids)seen.add(id);for(const entry of cache.probeDraws)probeDraws.push(entry);}staticSkips++;cellSkips++;};
    const skipStaticGroup=node=>{const marked=node[STATIC_ENTRY];if(marked&&marked.main===cellFrame){skippedMarked(node);return true;}
     if(hostForce.has(node)){const r=staticGroupRecord(node);if(r&&!capture){capture={node,record:r,ids:[],probeDraws:[]};hostBuildNode=node;return false;}}
     if(!node.parent)return false;const r=staticGroupRecord(node),sphere=r&&staticGroupSphere(node,r),box=probes.length&&r?staticGroupBox(node,r):null;if(!sphere||probes.length&&!box)return false;
     let offscreen=box?!frustum.intersectsBox(box):!frustum.intersectsSphere(sphere);if(offscreen)for(const record of shadowRecords)if(box?(!record.sphere||box.distanceToPoint(record.sphere.center)<=record.sphere.radius)&&record.frustum.intersectsBox(box):(!record.sphere||record.sphere.center.distanceTo(sphere.center)<=record.sphere.radius+sphere.radius)&&record.frustum.intersectsSphere(sphere)){offscreen=false;break;}
     // Off-screen groups skipped one by one (their cell is not marked) also get forced host visits within the budget.
     if(offscreen&&hostActive&&hostForceLeft>0&&!capture&&!node.hbHost){const rev=objectRevision(r.object),t=rev?rev.transform:0,c=rev?rev.components:0;if(r.hostT!==t||r.hostC!==c||hostFrame-r.hostSince>=HOST_AGE){hostForceLeft--;capture={node,record:r,ids:[],probeDraws:[]};hostBuildNode=node;return false;}}
     const cache=reuseStatic&&r.drawCache?.epoch===staticDrawEpoch&&r.drawCache.transform===r.updatedTransform&&r.drawCache.components===r.updatedComponents?r.drawCache:null;
     if(offscreen&&cache){for(const id of cache.ids)seen.add(id);for(const entry of cache.probeDraws)probeDraws.push(entry);staticSkips++;if(staticCellsOn)admitStatic(node,r,sphere,box,cache,!!probes.length);return true;}
     if(offscreen&&!probes.length){staticSkips++;if(staticCellsOn)admitStatic(node,r,sphere,null,null,false);return true;}
     if(reuseStatic&&!capture)capture={node,record:r,ids:[],probeDraws:[]};return false;},
    leaveStaticGroup=node=>{if(capture?.node===node){capture.record.drawCache={epoch:staticDrawEpoch,transform:capture.record.updatedTransform,components:capture.record.updatedComponents,ids:capture.ids,probeDraws:capture.probeDraws};if(hostActive&&!node.hbHost)hostConsider(node,capture);capture=null;}if(hostBuildNode===node)hostBuildNode=null;},staticCellsOn=staticConfig.enabled&&!revisionConfig.verify&&reuseStatic,blockOffscreen=b=>{let offscreen=probes.length?!frustum.intersectsBox(b.box):!frustum.intersectsSphere(b.sphere);if(offscreen)for(const record of shadowRecords)if(probes.length?(!record.sphere||b.box.distanceToPoint(record.sphere.center)<=record.sphere.radius)&&record.frustum.intersectsBox(b.box):(!record.sphere||record.sphere.center.distanceTo(b.sphere.center)<=record.sphere.radius+b.sphere.radius)&&record.frustum.intersectsSphere(b.sphere)){offscreen=false;break;}return offscreen;},
    skipOffscreenOnly=node=>{if(node[STATIC_ENTRY]?.pre===cellFrame)return true;if(probes.length||!node.parent)return false;const sphere=staticGroupSphere(node);return !!sphere&&!frustum.intersectsSphere(sphere);};let staticSkips=0,cellSkips=0;cellFrame=++cellFrames.serial;if(staticCellsOn&&!probes.length)markStaticCells(false,'pre',cell=>!frustum.intersectsSphere(cell.sphere));
    hostFrame=cellFrame;
    // Other camera contexts traverse host groups normally; anything else that rules sets out moves every group back.
    const hostAllowed=staticCellsOn&&!probes.length&&renderer.hbSpriteBatching!==false&&renderer.hbHostStatic!==false;hostActive=hostAllowed&&reuseStatic;if(!hostAllowed&&reuseStatic&&hostGroups.size){for(const g of [...hostGroups.keys()])hostDemote(g);hostPending.clear();}
    traverseVisibleSkipping(scene,node=>{if(!visible(node)||node.userData.editorHelper)return;if(node.isLight)shadowLights.push(node);else if((node.isMesh||node.isSprite)&&node.receiveShadow&&node.layers.test(camera.layers)&&(probes.length||isDeformed(node)||!node.frustumCulled||node.isSprite||frustum.intersectsObject(node))&&(Array.isArray(node.material)?node.material:[node.material]).some(m=>m?.isMeshStandardMaterial&&m.visible))receivers=true;},skipOffscreenOnly);
    if(hostActive&&!receivers)for(const set of hostSets.values())if(set.receives&&set.members.size){receivers=true;break;}
    if(receivers)for(const node of shadowLights){const records=nativeShadows(node);if(records.length){shadowIndexes.set(node.uuid,shadowRecords.length+1);shadowRecords.push(...records);}}
    if(staticCellsOn)markStaticCells(!!probes.length,'main',cell=>{const box=probes.length?cell.box:null,sphere=cell.sphere;if(box?frustum.intersectsBox(box):frustum.intersectsSphere(sphere))return false;for(const record of shadowRecords)if(box?(!record.sphere||box.distanceToPoint(record.sphere.center)<=record.sphere.radius)&&record.frustum.intersectsBox(box):(!record.sphere||record.sphere.center.distanceTo(sphere.center)<=record.sphere.radius+sphere.radius)&&record.frustum.intersectsSphere(sphere))return false;return true;});
    // Off-screen host candidates: up to HOST_FORCE_BUDGET marked cell members whose revisions are new to the host check or
    // old enough are visited this encode (draws built, not drawn), so they can move into host sets like visible groups.
    hostForce.clear();hostForceLeft=0;if(hostActive){let budget=HOST_FORCE_BUDGET;for(const cell of staticCells.values()){if(!budget)break;for(const node of cell.members){const e=node[STATIC_ENTRY];if(!e||e.main!==cellFrame||node.hbHost!==undefined)continue;const r=e.r,rev=objectRevision(r.object),t=rev?rev.transform:0,c=rev?rev.components:0;if(r.hostT===t&&r.hostC===c&&hostFrame-r.hostSince<HOST_AGE)continue;e.main=0;node.hbCellMark=0;hostForce.add(node);if(!--budget)break;}}hostForceLeft=budget;}
    traverseVisibleSkipping(scene,node=>{
      if(!visible(node)||node.userData.editorHelper)return;
      if(node.isLight){
        if(node.isAmbientLight){const c=node.color.toArray();for(let i=0;i<3;i++)ambient[i]+=c[i]*node.intensity;return;}
        if(node.isHemisphereLight){node.getWorldPosition(lightAt);lights.push([0,0,0,3,...lightAt.normalize().toArray(),0,...node.color.toArray(),node.intensity,...node.groundColor.toArray(),0]);return;}
        if(node.isDirectionalLight||node.isPointLight||node.isSpotLight){node.getWorldPosition(lightAt);let dir;if(node.target){node.target.getWorldPosition(targetAt);dir=node.isDirectionalLight?lightAt.clone().sub(targetAt):targetAt.clone().sub(lightAt);}else dir=new THREE.Vector3(0,0,1);lights.push([...lightAt.toArray(),node.isDirectionalLight?0:node.isSpotLight?2:1,...dir.normalize().toArray(),node.distance||0,...node.color.toArray(),node.intensity,Math.cos(node.angle||0),Math.cos((node.angle||0)*(1-(node.penumbra||0))),node.decay??2,shadowIndexes.get(node.uuid)||0]);return;}throw Error('DirectX 광원 셰이더 변환이 필요해요: '+node.type);
      }
      if(node.isPoints)throw Error('DirectX 점 렌더러 변환이 필요해요.');if(node.isLine){node=linePool.mesh(node,camera,canvas.width,canvas.height);if(!node)return;}if(!node.isMesh&&!node.isSprite)return;if(!node.layers.test(camera.layers))return;
      if(node.userData.hbNativeParticle){
        if(!node.userData.hbNativeParticle.remainingLifetime)return;
        const effect=node.userData.hbNativeParticle,id=node.uuid+':particles',map=textureResource(effect.map,resources),mask=native2DSettings(node.material,[canvas.width,canvas.height]),maskTexture=textureResource(native2DTextures(node.material)[0],resources),draw={twoD:mask.pass[1]?{settings:mask,maps:[maskTexture,'','','','','','','']}:undefined,id,particles:effect.id,style:effect.style(camera),texture:map,sampling:effect.map?(effect.map.magFilter===THREE.NearestFilter?1:0)+wrap(effect.map.wrapS)*2+wrap(effect.map.wrapT)*6:0},signature=JSON.stringify(draw);
        if(maskTexture)used.textures.add(maskTexture);if(map)used.textures.add(map);if(previous.get(id)!==signature){updates.push(draw);previous.set(id,signature);}seen.add(id);at.setFromMatrixPosition(node.matrixWorld);items.push({id,order:node.renderOrder,transparent:true,depth:at.distanceToSquared(cameraAt)});return;
      }
      node.onBeforeRender(renderer,scene,camera,node.geometry,node.material,null);
      if(node.morphTexture)throw Error('DirectX 인스턴스별 모프 변환이 필요해요.');const deformed=isDeformed(node);const instanced=node.isInstancedMesh||node.geometry?.isInstancedBufferGeometry;if(instanced&&!node.isInstancedMesh&&!node.material?.userData.hbNativeProjectile)throw Error('DirectX 사용자 인스턴스 셰이더 변환이 필요해요.');if(instanced&&(node.isInstancedMesh?node.count:node.geometry.instanceCount)===0)return;const bounds=probes.length&&node.isMesh?reflectionProbeMeshBounds(node,probeBounds):null;const unbounded=deformed&&!bounds||!node.frustumCulled||node.isSprite,sphere=unbounded||bounds?null:nodeWorldSphere(node),inView=unbounded||(bounds?frustum.intersectsBox(bounds):frustum.intersectsSphere(sphere)),casts=node.castShadow?shadowRecords.filter(s=>unbounded||(bounds?s.frustum.intersectsBox(bounds):(!s.sphere||s.sphere.center.distanceTo(sphere.center)<=s.sphere.radius+sphere.radius)&&s.frustum.intersectsSphere(sphere))):[];if(!inView&&!casts.length&&!probes.length&&!skyNodes.has(node)&&!hostBuildNode)return;
      const geometry=node.isSprite?spriteGeometry:node.geometry,materials=Array.isArray(node.material)?node.material:[node.material],parts=Array.isArray(node.material)?geometry.groups:[{start:0,count:geometry.index?.count||geometry.attributes.position.count,materialIndex:0}];
      // Current CPU-deformed bounds select probes; unsupported deformation keeps its fallback.
      const objectMotion=renderer.hbScreenSettings?.motion[3]>0&&inView?renderer.hbScreenState.objects.get(node):null;const deformation=deformed?deformationResource(node,resources,poses,objectMotion):'';if(deformation)used.deformations.add(deformation);
      let world=node.matrixWorld;if(node.isSprite){const scale=new THREE.Vector3();node.matrixWorld.decompose(at,new THREE.Quaternion(),scale);world=new THREE.Matrix4().compose(at,camera.getWorldQuaternion(new THREE.Quaternion()),scale);world.multiply(new THREE.Matrix4().makeTranslation(.5-node.center.x,.5-node.center.y,0));}
      for(let index=0;index<parts.length;index++){
        const part=parts[index],material=materials[part.materialIndex];if(!material?.visible)continue;const start=Math.max(part.start,geometry.drawRange.start),end=Math.min(part.start+part.count,geometry.drawRange.start+geometry.drawRange.count),count=end-start;if(count<=0)continue;
        let ids=drawIds.get(node);if(ids?.uuid!==node.uuid)drawIds.set(node,ids={uuid:node.uuid,list:[]});const id=ids.list[index]??=node.uuid+':'+index,program=material.userData.hbNativeProgram;let draw,properties,transmissive,stamp=null,retainedEntry=null;
        // Retained draw: plain static meshes keep one record per id and write only changed values, so an unchanged draw
        // allocates and compares nothing extra. Same keys, order, values and resource side-effect order as the full build below.
        if(!program&&!deformation&&!instanced&&!objectMotion&&!(material.isShaderMaterial&&material.uniforms?.topColor)){
         checkNativeMaterial(material);const w=retainTracker,wi=instanceTracker,settings=material.userData.hbSpriteMask||material.userData.hbLight2D?native2DSettings(material,[canvas.width,canvas.height]):null,twoDActive=!!(settings&&(settings.pass[1]||settings.pass[2]));let entry=drawHistory.retained.get(id);if(entry&&entry.twoD!==twoDActive)entry=null;w.changed=!entry;wi.changed=false;
         if(!entry){entry={stamp:'',twoD:twoDActive,draw:{...(twoDActive?{twoD:{settings:{},maps:[],maskSampling:0}}:{}),id,transmissive:false,mesh:'',world:[],normal:[],lightmap:'',maps:[],sampling:[],first:0,count:0,material:{},probes:[],globalProbes:false,shadowAlphaCutoff:0}};drawHistory.retained.set(id,entry);drawHistory.records.delete(id);}
         const d=entry.draw;
          // Material revision (docs/CHANGE_TRACKING_DESIGN.md stage 3): an announced-unchanged material keeps
          // its record without re-reading ~70 values. Verify mode always re-reads; otherwise one in (sampleMask+1) skips is
          // sampled, and a value change without a revision is reported and switches the skip off.
          const mrev=materialRevision(material),announced=mrev!==null&&!w.changed&&entry.material===material&&entry.materialRev===mrev;
          if(!announced||!revisionTrust.material||revisionConfig.verify||((++materialSamples)&revisionConfig.sampleMask)===0){const mt=materialTracker,mti=materialInstanceTracker;mt.changed=mti.changed=false;nativeMaterialInto(material,d.material,mt,mti);if(mt.changed)w.changed=true;if(mti.changed)wi.changed=true;if(announced&&(mt.changed||mti.changed)){reportRevisionMismatch('material',{id:node.userData.objectId,name:material.name},{material:material.uuid});if(!revisionConfig.verify)revisionTrust.material=false;}}
          entry.material=material;entry.materialRev=mrev;put(d.material,'receiveShadow',!!node.receiveShadow,w);
          // 2D pass record (sprite mask / 2D light): same values and texture order as the full build.
          if(twoDActive){const t=d.twoD,maps=native2DTextures(material);syncData(t,'settings',settings,w);for(let k=0;k<maps.length;k++){const key=textureResource(maps[k],resources);put(t.maps,k,key,w);if(key)used.textures.add(key);}const mask=material.hbLight2DMaskTexture;put(t,'maskSampling',mask?(mask.magFilter===THREE.NearestFilter?1:0)+wrap(mask.wrapS)*2+wrap(mask.wrapT)*6:16,w);}
         normalMatrix.copy(world).invert().transpose();transmissive=material.transmission>0;
         put(d,'transmissive',!!transmissive,w);put(d,'mesh',geometryResource(geometry,resources),w);const we=world.elements,ne=normalMatrix.elements;for(let k=0;k<16;k++){put(d.world,k,we[k],wi);put(d.normal,k,ne[k],wi);}
         put(d,'lightmap',material.lightMap?textureResource(material.lightMap,resources,true):'',w);for(let k=0;k<6;k++){const t=material[nativeTextureSlots[k]];put(d.maps,k,textureResource(t,resources),w);put(d.sampling,k,nativeSamplerState(THREE,t),w);}put(d,'first',start,w);put(d,'count',count,w);
         if(d.material.unlit){syncData(d,'probes',[],w);put(d,'globalProbes',false,w);entry.probeInput=null;}else{const m=node.matrixWorld.elements,k=entry.probeInput;
          // Same probe epoch, position and bounds select the same bindings already held in d.probes.
          if(!(k&&k.epoch===probeEpoch&&k.x===m[12]&&k.y===m[13]&&k.z===m[14]&&(bounds?k.bounds!==null&&k.bounds[0]===bounds.min.x&&k.bounds[1]===bounds.min.y&&k.bounds[2]===bounds.min.z&&k.bounds[3]===bounds.max.x&&k.bounds[4]===bounds.max.y&&k.bounds[5]===bounds.max.z:k.bounds===null))){const b=reflectionProbeDrawBindings(probes,at.setFromMatrixPosition(node.matrixWorld).toArray(),bounds,probeCandidateIndex);syncData(d,'probes',b.probes,w);put(d,'globalProbes',b.globalProbes,w);entry.probeInput={epoch:probeEpoch,x:m[12],y:m[13],z:m[14],bounds:bounds?[bounds.min.x,bounds.min.y,bounds.min.z,bounds.max.x,bounds.max.y,bounds.max.z]:null};}}
         put(d,'shadowAlphaCutoff',node.customDepthMaterial?.alphaTest??d.material.alphaCutoff,w);needsGlobalProbes||=d.globalProbes;if(w.changed)entry.stateKey=null;if(w.changed||wi.changed||!entry.stamp)entry.stamp='#'+(++retainSerial);draw=d;properties=d.material;stamp=entry.stamp;retainedEntry=entry;
        }else{
         drawHistory.retained.delete(id);
         const maps=[material.map,material.normalMap,material.roughnessMap,material.metalnessMap,material.emissiveMap,material.aoMap];properties=nativeMaterial(material);properties.receiveShadow=!!node.receiveShadow;normalMatrix.copy(world).invert().transpose();
         transmissive=program?program.transmissive:material.transmission>0;if(program){track(material,'programs',program.id,programs);const signature=JSON.stringify(program.uniforms);if(!programs.has(program.id))resources.push({kind:'program',id:program.id,declarations:program.declarations,evaluation:program.evaluation,uniforms:program.uniforms});else if(programs.get(program.id)!==signature)parameters.push({id:program.id,values:program.uniforms});programs.set(program.id,signature);}
         // Plain 3D materials (no sprite mask / 2D light) never need the 2D pass record.
         const settings=material.userData.hbSpriteMask||material.userData.hbLight2D?native2DSettings(material,[canvas.width,canvas.height]):null,twoD=settings&&(settings.pass[1]||settings.pass[2])?{settings,maps:native2DTextures(material).map(t=>textureResource(t,resources)),maskSampling:material.hbLight2DMaskTexture?(material.hbLight2DMaskTexture.magFilter===THREE.NearestFilter?1:0)+wrap(material.hbLight2DMaskTexture.wrapS)*2+wrap(material.hbLight2DMaskTexture.wrapT)*6:16}:undefined;twoD?.maps.forEach(id=>{if(id)used.textures.add(id);});
         draw={...(objectMotion?{previousWorld:objectMotion.world.toArray(),motionFlag:objectMotion.flag}:{}),...(twoD?{twoD}:{}),id,transmissive:!!transmissive,mesh:geometryResource(geometry,resources),world:world.toArray(),normal:normalMatrix.toArray(),lightmap:material.lightMap?textureResource(material.lightMap,resources,true):'',maps:maps.map(t=>textureResource(t,resources)),sampling:maps.map(t=>nativeSamplerState(THREE,t)),first:start,count,material:properties,...(properties.unlit||properties.sky?{probes:[],globalProbes:false}:reflectionProbeDrawBindings(probes,at.setFromMatrixPosition(node.matrixWorld).toArray(),bounds,probeCandidateIndex)),shadowAlphaCutoff:node.customDepthMaterial?.alphaTest??properties.alphaCutoff};needsGlobalProbes||=draw.globalProbes;
         if(deformation)draw.deformation=deformation;if(instanced){draw.instances=instanceResource(node,resources,objectMotion);used.instances.add(draw.instances);}if(program){draw.program=program.id;draw.programMaps=program.maps.map(t=>textureResource(t,resources));draw.programSampling=program.maps.map(t=>nativeSamplerState(THREE,t));}
        }
        // Batching candidates (sprites and meshes): the member draw stays on the host as usual (shadows and probe captures
        // keep using it); after sorting, the main-pass order replaces members sharing every non-instance value with one batch.
        if(retainedEntry&&renderer.hbSpriteBatching!==false&&(inView||capture)&&!transmissive&&node.isMesh&&!node.isSkinnedMesh&&!skyNodes.has(node)&&batchableSpriteUV(draw))spriteCandidates.set(id,{entry:retainedEntry,geometry,node,transparent:!!material.transparent,receives:!!node.receiveShadow&&material.isMeshStandardMaterial});
        used.meshes.add(draw.mesh);draw.maps.forEach(id=>used.textures.add(id));if(draw.program)used.programs.add(draw.program);draw.programMaps?.forEach(id=>used.textures.add(id));stamp??=drawHistory.stamp(id,draw);if(casts.length)shadowCache.draw(id,draw,stamp,!!program?.animated);if(previous.get(id)!==stamp){updates.push(draw);previous.set(id,stamp);}seen.add(id);capture?.ids.push(id);if(skyNodes.has(node))skyDraws.push(id);if(probes.length&&!node.userData.draw2d&&!transmissive){const entry={id,node,deformed,sky:!!properties.sky};probeDraws.push(entry);capture?.probeDraws.push(entry);}for(const record of casts)record.casters.push(id);if((casts.length||probes.length&&!node.userData.draw2d)&&program?.animated)animatedCaster=true;if(inView){at.setFromMatrixPosition(node.matrixWorld);items.push({id,order:node.renderOrder,transparent:material.transparent,transmissive:!!transmissive,depth:at.distanceToSquared(cameraAt)});}
      }
    },skipStaticGroup,leaveStaticGroup,staticCellsOn?cellFrame:undefined);
    renderer.hbStaticSkips=staticSkips;renderer.hbStaticCellSkips=cellSkips;
    if(hostActive){for(const [g,h] of hostGroups)if(h.seen!==hostFrame)hostDemote(g);
     // Promotions are applied in groups (at least 256 waiting, or the oldest waiting 60 encodes) so sets are not re-sent
     // every frame while the camera reveals new groups; only groups visited this encode (current draw ids) move.
     let oldest=Infinity;for(const p of hostPending.values())oldest=Math.min(oldest,p.since);
     // Draws of groups promoted now leave this frame's lists: their set already holds them.
     const promoted=new Set();if(hostPending.size>=256||hostFrame-oldest>=60)for(const [g,p] of hostPending){if(p.seen===hostFrame){hostPending.delete(g);if(!g.hbHost&&g.parent)hostPromote(p,promoted);}else if(hostFrame-p.seen>120)hostPending.delete(g);}
     if(promoted.size){let n=0;for(const item of items)if(!promoted.has(item.id))items[n++]=item;items.length=n;for(const record of shadowRecords){let k=0;for(const id of record.casters)if(!promoted.has(id))record.casters[k++]=id;record.casters.length=k;}for(const id of promoted)seen.delete(id);}
     hostEmit(items,updates,seen,resources,used,shadowRecords);}
    renderer.hbHostStats={groups:hostGroups.size,sets:hostSets.size,pending:hostPending.size};
    const phase=item=>item.transmissive?1:item.transparent?2:0;items.sort((a,b)=>phase(a)-phase(b)||a.order-b.order||(a.transmissive||a.transparent?b.depth-a.depth:a.depth-b.depth)||a.id.localeCompare(b.id));
    linePool.end();
    if(spriteCandidates.size)emitSpriteDraws(items,updates,seen,resources,used);releaseSpriteInstances();
    const order=items.map(item=>item.id),lightSignature=JSON.stringify(lights),remove=[...previous.keys()].filter(id=>!seen.has(id));for(const id of remove){previous.delete(id);if(!batchedSprites.has(id))drawHistory.delete(id);}batchedSprites.clear();
    const rect=viewport,bg=scene.background?.isColor?scene.background:clearColor;
    const data={transmission:items.some(item=>item.transmissive),width:canvas.width,height:canvas.height,updates,remove,viewProjection:clipDepth.clone().multiply(projectionView).toArray(),clear:[...bg.clone().convertLinearToSRGB().toArray(),clearAlpha],eye:[...cameraAt.toArray(),1],viewDirection:[...cameraBack.toArray(),camera.isOrthographicCamera?1:0],ambient,fog:scene.fog?[...scene.fog.color.toArray(),scene.fog.density||0]:[0,0,0,0],fogRange:scene.fog?[scene.fog.near||0,scene.fog.far||100000,0,0]:[0,0,0,0],viewport:[rect.x*ratio,canvas.height-(rect.y+rect.w)*ratio,rect.z*ratio,rect.w*ratio],exposure:renderer.toneMappingExposure};
    const shadows=shadowRecords.map(s=>s.packed),casters=shadowRecords.map(s=>s.casters),shadowSignature=JSON.stringify(shadows),casterSignature=JSON.stringify(casters);data.shadowRefresh=oldShadows!==shadowSignature||oldCasters!==casterSignature||updates.some(draw=>!draw.particles)||resources.length>0||parameters.length>0||poses.length>0||animatedCaster;if(oldShadows!==shadowSignature){data.shadows=shadows;oldShadows=shadowSignature;}if(oldCasters!==casterSignature){data.shadowCasters=casters;oldCasters=casterSignature;}
    data.shadowRefreshLayers=shadowCache.prepare(shadowRecords,resources,parameters,poses,remove);data.shadowRefresh=data.shadowRefreshLayers.length>0;
    if(materialsPending){data.shadowRefresh=true;delete data.shadowRefreshLayers;}
    const probeSceneChanged=updates.some(draw=>!draw.particles)||resources.length>0||parameters.length>0||poses.length>0||animatedCaster;
    const probeIds=new Set(probes.map(p=>p.id));for(const id of probeCache.keys())if(!probeIds.has(id))probeCache.delete(id);
    data.probes=probes.map(probe=>{
      const p=probe.p,key=probeCaptureKey(probe,[lights,ambient,bg.toArray(),scene.userData.resolvedEnvironment]),old=probeCache.get(probe.id),refresh=old!==key||p.refreshMode==='onChange'&&(probeSceneChanged||data.shadowRefresh);
      const record={id:probe.id,size:p.resolution,bounces:p.bounces,refresh};if(refresh){record.eye=[...probe.center,1];record.clear=[...bg.toArray(),1];record.faces=probeCaptureViews(probe).map(view=>{const f=new THREE.Frustum().setFromProjectionMatrix(view.projection);return {viewProjection:clipDepth.clone().multiply(view.projection).toArray(),draws:probeDraws.filter(d=>{if(p.excludeOwner&&d.node.userData.objectId===probe.owner)return false;if(d.sky||d.deformed||!d.node.frustumCulled)return true;const b=reflectionProbeMeshBounds(d.node,probeBounds);return b?f.intersectsBox(b):f.intersectsObject(d.node);}).map(d=>d.id)};});probeCache.set(probe.id,key);}return record;
    });
    const globalBindings=needsGlobalProbes?selectReflectionProbes(probes,null,null,Infinity,probeCandidateIndex):[];if(JSON.stringify(globalBindings)!==globalProbeStamp)data.globalProbeBindings=globalBindings;
    data.skyCapture=skyCapture?{key:skyCapture.key,size:skyCapture.size,intensity:skyCapture.intensity,tint:skyCapture.tint,clear:skyCapture.clear,faces:probeCaptureViews({center:[0,0,0],p:{near:.1,far:1000000}}).map(view=>clipDepth.clone().multiply(view.projection).toArray()),draws:skyDraws}:null;
    const sky=scene.userData.skyHDRI;data.skyEnvironment=null;if(sky?.texture&&sky.intensity>0){const texture=textureResource(sky.texture,resources);used.textures.add(texture);data.skyEnvironment={texture,size:sky.resolution||128,rotation:sky.rotation,intensity:sky.intensity};}data.rasterLightCulling=renderer.hbRasterLightCulling!==false;
    if(scissorTest)data.scissor=[scissor.x*ratio,canvas.height-(scissor.y+scissor.w)*ratio,scissor.z*ratio,scissor.w*ratio];
    if(explicitClear){data.clear=explicitClear;data.viewportClear=[...bg.toArray(),clearAlpha];explicitClear=null;}
    if(!Array.isArray(oldOrder)||oldOrder.length!==order.length||oldOrder.some((v,i)=>v!==order[i])){data.order=order;oldOrder=order;}if(oldLights!==lightSignature){data.lights=lights;oldLights=lightSignature;}data.release=Object.fromEntries(Object.entries(released).map(([kind,ids])=>{const keys=[...ids].filter(id=>!used[kind].has(id));ids.clear();return [kind,keys];}));shadowCache.release(data.release);if(hostReleased.length)data.release.cullSets=hostReleased.splice(0);const fog=scene.userData.resolvedEnvironment?.fog;if(fog&&!fog.legacy){data.fog=[...fog.color.slice(0,3),fog.density];data.fogRange=[fog.startDistance,fog.cutoffDistance,0,0];data.heightFog=[1,fog.heightFalloff,fog.height,fog.maxOpacity];}const bloom=renderer.hbBloomSettings;data.bloom=bloom?[bloom.bloomThreshold,bloom.bloomStrength,bloom.bloomRadius,bloom.bloomResolutionScale]:null;data.screenEffects=renderer.hbScreenSettings||null;data.distanceFieldScene="";const distanceTexture=prepareDistanceFieldAO(renderer,scene,renderer.hbPostSettings||{},data.screenEffects||{ambientAO:[0,0,0,0]});if(distanceTexture){data.distanceFieldScene=textureResource(distanceTexture,resources);used.textures.add(data.distanceFieldScene);}data.geometryScene="";data.pathEnvironmentScene="";if(!data.screenEffects?.path[0])renderer.hbPathState?.reset();if(data.screenEffects&&(data.screenEffects.geometry[0]>0||data.screenEffects.path[0]>0)){renderer.hbGeometryWorld??=new GeometryGIWorld();const p=bindTransport(data.screenEffects,renderer.hbGeometryWorld,scene);if(data.screenEffects.path[0]>0){renderer.hbPathState??=new ProgressivePathState();renderer.hbPathState.prepare(data.screenEffects,renderer.hbGeometryWorld);}const filterKey=pathFilterKey(data.screenEffects,renderer.hbGeometryWorld);if(renderer.hbFilterKey!==filterKey)data.screenEffects.pathFilter[2]=0;renderer.hbFilterKey=filterKey;data.screenEffects.rayPrograms=p.rayInfo.programs||[];data.screenEffects.noTransmission=p.rayInfo.transmission===false;data.geometryScene=textureResource(renderer.hbGeometryWorld.texture,resources);used.textures.add(data.geometryScene);if(renderer.hbGeometryWorld.environmentTexture){data.pathEnvironmentScene=textureResource(renderer.hbGeometryWorld.environmentTexture,resources);used.textures.add(data.pathEnvironmentScene);}data.screenEffects.geometryInfo=[p.width,p.height,p.nodeCount,p.triangleOffset];data.screenEffects.geometryLimits[2]=p.lightsOffset;data.screenEffects.geometryLimits[3]=p.lightCount;}else if(renderer.hbGeometryWorld){renderer.hbGeometryWorld.dispose();renderer.hbGeometryWorld=null;renderer.hbPathState?.reset();}data.postProcess=renderer.hbPostSettings?packedPostProcess(renderer.hbPostSettings,renderer.hbTime||0,camera):null;const lut=scene.userData.hbPostLookup?.(renderer.hbPostSettings?.colorLookup);data.postLookup=lut?textureResource(lut,resources):'';if(data.postLookup)used.textures.add(data.postLookup);if(data.postProcess){data.postProcess.lookup[1]=lookupSize(lut);data.postProcess.adapt[2]=Math.min(.1,Math.max(0,(renderer.hbTime||0)-(renderer.hbPostTime||0)));data.postProcess.adapt[3]=renderer.hbPostScene===scene&&renderer.hbPostCamera===camera&&(renderer.hbTime||0)>=(renderer.hbPostTime||0)?1:0;}renderer.hbPostTime=renderer.hbTime||0;renderer.hbPostScene=scene;renderer.hbPostCamera=camera;data.passes2d=offscreenPasses.splice(0);data.particles=particleCommands.splice(0);data.parameters=parameters;data.poses=poses;data.time=renderer.hbTime||0;lastUpdateCount=updates.length;return {resources,data};
  }
  const renderer={hbBackend:'d3d11',hbDisplayCounts:false,hbTextureLimits:{maxTextureDimension2D:16384,maxTextureDimension3D:2048,maxTextureArrayLayers:2048},hbBloomSettings:null,hbBloom(){return {render(r,scene,camera,objects){const volume=postProcessSettings(objects,camera.getWorldPosition(new THREE.Vector3()),scene.userData.hbPostWorld,true);r.hbRasterLightCulling=volume?.rasterLightCulling!==false;r.hbPostSettings=postProcessActive(volume)?volume:null;scene.userData.hbBeforeLighting?.(r.hbPostSettings);r.hbBloomSettings=r.hbPostSettings?.bloomEnabled?r.hbPostSettings:null;const state=r.hbScreenState??=new ScreenFrameState();const areaKey=viewport.x+":"+viewport.y;if(r.hbScreenArea!==areaKey){state.reset();r.hbPathState?.reset();r.hbScreenArea=areaKey;}const frame=screenEffectsEnabled(r.hbPostSettings)?state.begin(camera,r.hbPostSettings,viewport.z*ratio,viewport.w*ratio,r.hbTime||0,scene,true):null;r.hbScreenSettings=frame?.packed||null;if(frame?.pathReset)r.hbPathState?.reset();if(frame)configurePathLens(frame.packed,camera,r.hbPostSettings);if(frame)r.hbScreenSettings.camera=packedPostProcess(r.hbPostSettings,r.hbTime||0,camera).camera;else state.reset();let pathState,geometry;const commit=success=>{if(frame?.packed.path[0]>0)pathState?.commit(frame.packed,success);geometry?.commit(success);frame?.end(success);};try{const job=r.render(scene,camera);pathState=r.hbPathState;geometry=r.hbGeometryWorld;if(job)job.then(()=>commit(!r.hbPathPreparation?.pending&&!r.hbPathPreparation?.error),()=>commit(false));else commit(true);}catch(error){commit(false);throw error;}},disposeRenderer(r){r.hbPostSettings=null;r.hbBloomSettings=null;},dispose(){renderer.hbPostSettings=null;renderer.hbBloomSettings=null;}};},capabilities:{maxTextureSize:16384},hbMaskTarget:native2DTarget,hbShadowTarget:native2DTarget,hbMaskMaterial:nativeMaskMaterial,hbShadowMaterials:nativeShadowMaterials,domElement:canvas,info,shadowMap:{enabled:false},xr:{enabled:false},toneMappingExposure:1,autoClear:true,
    hbNativeParticles:nativeParticles,hbQueueParticles:command=>{if(disposed)throw Error('DirectX 렌더러가 닫혔어요.');particleCommands.push(command);},hbParticles:(group,p,map)=>new NativeParticleSimulation(renderer,group,p,map),
    hbPrepareParticles:sorting=>particlePreparation.prepare(sorting),
    async hbParticleEvents(id){await this.hbFinishFrame();return send('particleEvents',{commands:particleCommands.splice(0),pool:id});},
    async hbParticleCount(id){await this.hbFinishFrame();let result=await send('particles',{commands:particleCommands.splice(0),count:id});while(result.pending){await new Promise(resolve=>setTimeout(resolve,25));result=await send('particles',{commands:[],count:id});}return result.count;},
    hbMaterial:(data,options)=>createNativeMaterial(THREE,data,{...options,renderer}),hbProjectile:createNativeProjectileMaterial,
    getPixelRatio:()=>ratio,setPixelRatio(value){ratio=platform.embedded?globalThis.devicePixelRatio||1:value;this.setSize(width,height,false);},
    setSize(w,h,style=false){width=w;height=h;canvas.width=Math.max(1,Math.round(w*ratio));canvas.height=Math.max(1,Math.round(h*ratio));viewport.set(0,0,w,h);scissor.copy(viewport);if(style){canvas.style.width=w+'px';canvas.style.height=h+'px';}},getSize:target=>target.set(width,height),getDrawingBufferSize:target=>target.set(canvas.width,canvas.height),
    getViewport:target=>target.copy(viewport),setViewport(x,y,w,h){if(x?.isVector4)viewport.copy(x);else viewport.set(x,y,w,h);},getScissor:target=>target.copy(scissor),setScissor(x,y,w,h){if(x?.isVector4)scissor.copy(x);else scissor.set(x,y,w,h);},getScissorTest:()=>scissorTest,setScissorTest:value=>scissorTest=value,
    getClearColor:target=>target.copy(clearColor),getClearAlpha:()=>clearAlpha,setClearColor(value,alpha=1){clearColor.set(value);clearAlpha=alpha;},clear(){if(renderTarget){offscreen(new THREE.Scene(),new THREE.OrthographicCamera(-1,1,1,-1),true);return;}explicitClear=[...clearColor.clone().convertLinearToSRGB().toArray(),clearAlpha];},getRenderTarget:()=>renderTarget,setRenderTarget(target){if(target&&!target.texture?.userData.hbNativeTarget)throw Error('DirectX 2D 렌더 타깃을 확인하세요.');renderTarget=target;},
    hbPruneCameraViews:pruneCameraContexts,
    hbWithCameraView:useCameraContext,
    hbSetCameraView(id,index,count,rect){if(!captureViews)throw Error('카메라 출력 묶음이 필요해요.');activeView={id,index,count,rect:[rect.x*ratio,canvas.height-(rect.y+rect.height)*ratio,rect.width*ratio,rect.height*ratio]};},
    hbCaptureViews(ids,draw){if(frameJob||captureViews)throw Error('DirectX 이전 프레임 전송이 진행 중이에요.');const entries=[];captureViews={ids,entries};pruneCameraContexts(ids);
      try{draw();if(entries.length!==ids.length)throw Error('카메라 출력 수가 일치하지 않아요.');}
      catch(error){for(const entry of entries)entry.reject(error);captureViews=activeView=null;throw error;}
      captureViews=activeView=null;frameJob=(async()=>{try{for(const entry of entries){await entry.submit();entry.resolve();}}catch(error){for(const entry of entries)entry.reject(error);throw error;}})();frameJob.catch(onError);return frameJob;
    },
    render(scene,camera){if(renderTarget){offscreen(scene,camera);return;}if(frameJob)throw Error('DirectX 이전 프레임 전송이 진행 중이에요.');const packet=encode(scene,camera);if(platform.embedded)embed(packet.data);
      // Capture immutable commands now: the next view may change scene uniforms and passes.
      const view=activeView;if(view)packet.data.cameraView={id:view.id,index:view.index,ids:captureViews.ids,rect:view.rect};
      const json=view?JSON.stringify(packet.data):undefined,batches=view?[...nativeUploadBatches(packet.resources,4*1024*1024,{binary:binaryUploads})]:null;
      const submit=async()=>{for(const batch of batches||nativeUploadBatches(packet.resources,4*1024*1024,{binary:binaryUploads})){await send('upload',batch.data,batch.json,batch.buffers);uploadTotals.packets++;uploadTotals.bytes+=batch.bytes;uploadTotals.maxPacketBytes=Math.max(uploadTotals.maxPacketBytes,batch.bytes);}stats=await send('frame',packet.data,json);if(packet.data.globalProbeBindings)globalProbeStamp=JSON.stringify(packet.data.globalProbeBindings);if(stats.shaderPreparation?.raster?.basePending)maskPassCache.clear();renderer.hbPathPreparation=updateNativePathPreparation(renderer.hbPathPreparation,stats.shaderPreparation);pollNativePathPreparation(renderer,()=>send('prepareStatus',{}));info.render.calls=stats.calls;info.memory.geometries=stats.meshes;info.memory.textures=stats.textures;};
      if(view){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});promise.catch(()=>{});captureViews.entries.push({submit,resolve,reject});return promise;}
      frameJob=submit();frameJob.catch(onError);return frameJob;
    },
    get hbFrameBusy(){return !!frameJob;},
    hbPlaceSurface(data){return surface?send('placement',data):Promise.resolve();},
    hbSurfaceInfo(){return surface?send('surfaceInfo',{}):Promise.resolve(null);},
    async hbFinishFrame(){if(!frameJob)return;const job=frameJob;try{await job;}finally{frameJob=null;}},
    async hbReleaseScene(){particlePreparation.reset();try{await this.hbFinishFrame();await send('reset',{});}finally{pruneCameraContexts([]);clearDisposalSubscriptions();probeCandidateIndex.update([]);cancelGPUPathPreparation(this.hbPathPreparation);this.hbPathPreparation=null;linePool.dispose();this.hbDistanceFields?.dispose();this.hbDistanceFields=null;this.hbGeometryWorld?.dispose();this.hbGeometryWorld=null;for(const effect of [...nativeParticles])effect.dispose();particleCommands.length=0;this.hbPostSettings=null;this.hbBloomSettings=null;this.hbScreenSettings=null;this.hbScreenState?.reset();renderTarget=null;offscreenResources.length=offscreenPasses.length=0;maskPassCache.clear();probeCache.clear();globalProbeStamp=null;for(const ids of Object.values(offscreenUsed))ids.clear();geometries.clear();textures.clear();sharedTextureGroups.clear();programs.clear();instances.clear();deformations.clear();previous.clear();drawHistory.clear();staticDrawEpoch++;spriteInstances.clear();spriteCandidates.clear();batchedSprites.clear();for(const ids of Object.values(released))ids.clear();oldOrder=oldLights=oldShadows=oldCasters='';shadowCache.clear();}},
    hbDiagnostics:()=>({cameraViews:cameraContexts.size,compositionBytes:stats.cameraViewBytes||0,uploadBatching:{...uploadTotals},lineMeshes:linePool.entries.size,resourceSubscriptions:subscriptions.size,backend:capabilities.backend||'D3D11',requestedBackend:capabilities.requestedBackend||'d3d11',backendFallback:capabilities.fallback||null,nativeCommandLists:capabilities.nativeCommandLists??false,device:capabilities.device||null,adapterVendor:capabilities.adapterVendor??null,adapterDevice:capabilities.adapterDevice??null,adapterDedicatedBytes:capabilities.adapterDedicatedBytes??null,software:capabilities.software??null,probeCandidates:probeCandidateIndex.info(),distanceFields:renderer.hbDistanceFields?.state()||null,pathSamples:renderer.hbPathState?.samples||0,pathNormalFootprint:renderer.hbScreenSettings?.pathNormalMode||0,pipelinePreparation:nativePathPreparationInfo(renderer.hbPathPreparation),rayGeometry:sharedRayInfo(renderer.hbGeometryWorld?.packed),bvh:renderer.hbGeometryWorld?{refits:renderer.hbGeometryWorld.bvhRefits,rebuilds:renderer.hbGeometryWorld.bvhRebuilds}:null,info:{calls:stats.calls},memory:{geometries:stats.meshes,textures:stats.textures},...stats,shaderCompilation:stats.shaderCompilation?Object.fromEntries(['compilations','cacheHits','cacheMisses','cacheEvictions','cacheBytes','cacheBudgetBytes','lastCompileMS','totalCompileMS','sourceBuilds'].map((key,i)=>[key,stats.shaderCompilation[i]])):null,shaderDiskCache:stats.shaderDiskCache?Object.fromEntries(['hits','misses','writes','evictions','lastScannedBytes','budgetBytes','invalid','errors','busy','configured'].map((key,i)=>[key,key==='configured'?Boolean(stats.shaderDiskCache[i]):stats.shaderDiskCache[i]])):null,drawUpdates:lastUpdateCount,constantBuffers:3,maskCachedTargets:maskPassCache.size,probeCachedCaptures:probeCache.size,shadowTrackedDraws:shadowCache.draws.size,shadowTrackedResources:shadowCache.resources.size,automaticReadbacks:0}),
    async hbCaptureRGBA(){await this.hbFinishFrame();const result=await send('capture',{});return {width:result.width,height:result.height,rgba:Uint8Array.from(result.rgba)};},
    async hbCapture(){await this.hbFinishFrame();const result=await send('capture',{}),off=createPixelCanvas();off.width=result.width;off.height=result.height;off.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(result.rgba),result.width,result.height),0,0);return off.toDataURL('image/png');},
    dispose(){if(disposeJob)return disposeJob;if(disposed)return Promise.resolve();disposeJob=(async()=>{const errors=[];try{try{await this.hbReleaseScene();}catch(error){errors.push(error);}try{await send('dispose',{});}catch(error){errors.push(error);}}finally{disposed=true;clearDisposalSubscriptions();bridge.removeEventListener('message',receive);globalThis.document?.documentElement?.classList.remove('native-scene');spriteGeometry.dispose();for(const r of pending.values()){clearTimeout(r.timer);r.reject(Error('DirectX 렌더러 종료'));}pending.clear();}if(errors.length)throw new AggregateError(errors,'DirectX 렌더러 종료 실패');})();return disposeJob;}
  };
  renderer.setSize(width,height,false);return renderer;
}
