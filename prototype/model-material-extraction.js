import * as THREE from 'three';
import {materialDefaults,makeMaterialNode,validMaterialGraph,validMaterialSurface} from './material-runtime.js';

export function modelTexturePath(source,uri){
 if(typeof source!=='string'||typeof uri!=='string'||!uri||/^(?:[a-z][a-z\d+.-]*:|[\\/])/i.test(uri)||/[?#\\\x00-\x1f]/.test(uri))return null;
 let decoded;try{decoded=decodeURIComponent(uri);}catch{return null;}if(/[?#:\\\x00-\x1f]/.test(decoded))return null;
 const parts=source.split('/').slice(0,-1);for(const part of decoded.split('/')){if(part==='..'){if(parts.length<=1)return null;parts.pop();}else if(part&&part!=='.')parts.push(part);}
 const path=parts.join('/');return path.startsWith('Assets/')&&/\.(?:png|jpe?g|webp|avif|gif|bmp|svg)$/i.test(path)?path:null;
}
// Keep identities and project paths, never the parser or embedded blob URLs.
export function tagModelMaterials(root,{format,associations,json,source,originalIds}={}){
 root.traverse(object=>{for(const material of object.material?(Array.isArray(object.material)?object.material:[object.material]):[]){
  const index=associations?.get(material)?.materials;if(format==='gltf'&&Number.isInteger(index))material.userData.hbModelSource={format,index};
  else if(format==='fbx'&&Number.isSafeInteger(material.ID))material.userData.hbModelSource={format,objectId:originalIds?.get(material.ID)??String(material.ID)};
  if(format==='gltf')for(const texture of Object.values(material).filter(v=>v?.isTexture)){const t=associations?.get(texture)?.textures,definition=json?.textures?.[t],image=json?.images?.[definition?.source];texture.userData.hbModelTextureAsset=modelTexturePath(source,image?.uri);}
 }});
}
export function modelMaterialSubasset(result,metadata,id){
 const row=metadata.subassets.find(r=>r.id===id&&r.kind==='material');if(!row)throw Error('머테리얼 하위 에셋을 선택하세요.');const materials=new Set();result.object.traverse(o=>{for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[])materials.add(m);});
 const indexed=/\.(gltf|glb)$/i.test(metadata.source),matches=[...materials].filter(m=>indexed?m.userData.hbModelSource?.index===row.sourceIndex:row.sourceObjectId?m.userData.hbModelSource?.objectId===row.sourceObjectId:m.name===row.name);
 if(matches.length!==1)throw Error('원본 재질이 없거나 연결이 중복돼요. 다시 가져오세요.');return matches[0];
}
export function extractModelMaterial(material,{name=material?.name||'Material'}={}){
 if(!material?.isMeshStandardMaterial||!name||name.length>80)throw Error('Standard/Physical PBR 재질과 새 이름을 확인하세요.');
 if(material.side===THREE.BackSide||material.wireframe||material.flatShading||material.vertexColors||material.alphaHash||material.premultipliedAlpha||material.blending!==THREE.NormalBlending||material.depthTest===false||material.depthWrite===false||material.colorWrite===false||material.stencilWrite||material.polygonOffset||material.alphaToCoverage||material.clippingPlanes?.length||material.depthFunc!==THREE.LessEqualDepth||material.onBeforeCompile!==THREE.Material.prototype.onBeforeCompile)throw Error('별도 래스터 상태를 사용하는 원본 재질은 아직 추출할 수 없어요.');
 const surface={...structuredClone(materialDefaults),color:material.color.toArray(),roughness:material.roughness,metalness:material.metalness,light:1,emissive:material.emissive.toArray(),emissiveIntensity:material.emissiveIntensity,opacity:material.opacity,blendMode:material.alphaTest>0?'masked':material.transparent?'translucent':'opaque',alphaTest:material.alphaTest,doubleSided:material.side===THREE.DoubleSide};
 for(const key of ['clearcoat','clearcoatRoughness','transmission','thickness','ior','dispersion','sheen','sheenRoughness','anisotropy','anisotropyRotation','iridescence','iridescenceIOR','specularIntensity'])if(material[key]!==undefined)surface[key]=material[key];
 for(const key of ['sheenColor','specularColor','attenuationColor'])if(material[key])surface[key]=material[key].toArray();
 if(material.attenuationDistance!==undefined)surface.attenuationDistance=material.attenuationDistance===Infinity?0:material.attenuationDistance;
 if(material.iridescenceThicknessRange)surface.iridescenceThickness=material.iridescenceThicknessRange[1];
 const graph={nodes:[],edges:[]},add=(key,fields={})=>{const n={...makeMaterialNode(key,80+Math.floor(graph.nodes.length/12)*260,40+(graph.nodes.length%12)*90),...fields};graph.nodes.push(n);return n;},output=add('surface'),connect=(node,pin,target,input)=>graph.edges.push({from:{node:node.id,pin},to:{node:target.id,pin:input}}),multiply=(node,pin,value)=>{const n=add('multiply',{inputValues:{b:value}});connect(node,pin,n,'a');return n;};
 const mappings={map:['baseColor','rgb',surface.color],roughnessMap:['roughness','g',surface.roughness],metalnessMap:['metallic','b',surface.metalness],emissiveMap:['emissive','rgb',surface.emissive],alphaMap:['opacity','g',surface.opacity],aoMap:['ao','r',material.aoMapIntensity],normalMap:['normal','rgb',null],clearcoatMap:['clearcoat','r',surface.clearcoat],clearcoatRoughnessMap:['clearcoatRoughness','g',surface.clearcoatRoughness],clearcoatNormalMap:['clearcoatNormal','rgb',null],transmissionMap:['transmission','r',surface.transmission],thicknessMap:['thickness','g',surface.thickness],sheenColorMap:['sheenColor','rgb',surface.sheenColor],sheenRoughnessMap:['sheenRoughness','a',surface.sheenRoughness],specularIntensityMap:['specularIntensity','a',surface.specularIntensity],specularColorMap:['specularColor','rgb',surface.specularColor],iridescenceMap:['iridescence','r',surface.iridescence]};
 const textures=[],textureNodes=new Map();for(const [key,texture]of Object.entries(material).filter(([,v])=>v?.isTexture)){
  if(!mappings[key])throw Error('지원하지 않는 원본 재질 맵이에요: '+key);const asset=texture.userData.hbModelTextureAsset;if(typeof asset!=='string'||!asset.startsWith('Assets/')||/[\\:\x00-\x1f?#]/.test(asset)||asset.split('/').some(p=>!p||p==='.'||p==='..'))throw Error('외부 프로젝트 이미지로 가져온 텍스처가 필요해요: '+key);
  if(![THREE.SRGBColorSpace,THREE.NoColorSpace,THREE.LinearSRGBColorSpace].includes(texture.colorSpace))throw Error('지원하지 않는 텍스처 색 공간이에요.');if(texture.premultiplyAlpha||texture.isDataTexture||texture.isCompressedTexture||texture.mipmaps?.length||texture.type!==THREE.UnsignedByteType||texture.format!==THREE.RGBAFormat)throw Error('원본 이미지의 픽셀/밉 변환을 확인하세요: '+key);if(texture.channel!==0||texture.mapping!==THREE.UVMapping||texture.matrixAutoUpdate===false)throw Error('추가 UV 채널·사용자 텍스처 행렬은 지원하지 않아요: '+key);
  const filters=new Map([[THREE.NearestFilter,['nearest',false]],[THREE.LinearFilter,['linear',false]],[THREE.NearestMipmapNearestFilter,['nearest',true]],[THREE.LinearMipmapLinearFilter,['linear',true]]]),filter=filters.get(texture.minFilter),wrap=v=>v===THREE.RepeatWrapping?'repeat':v===THREE.ClampToEdgeWrapping?'clamp':v===THREE.MirroredRepeatWrapping?'mirror':null;
  if(!filter||filter[1]&&!texture.generateMipmaps||![THREE.NearestFilter,THREE.LinearFilter].includes(texture.magFilter)||!wrap(texture.wrapS)||!wrap(texture.wrapT))throw Error('변환할 수 없는 텍스처 샘플러예요: '+key);
  const uv=add('uv'),rotation=add('rotateUV',{inputValues:{angle:-texture.rotation,center:texture.center.toArray()}}),transform=add('tilingOffset',{inputValues:{tiling:texture.repeat.toArray(),offset:texture.offset.toArray().map((v,i)=>v+texture.center.getComponent(i)*(1-texture.repeat.getComponent(i)))}});connect(uv,'value',rotation,'uv');connect(rotation,'value',transform,'uv');let coords=transform;
  if(!texture.flipY){coords=add('tilingOffset',{inputValues:{tiling:[1,-1],offset:[0,1]}});connect(transform,'value',coords,'uv');}
  const node=add('texture',{texture:asset,colorSpace:texture.colorSpace===THREE.SRGBColorSpace?'srgb':'linear',sampler:{wrapS:wrap(texture.wrapS),wrapT:wrap(texture.wrapT),minFilter:filter[0],magFilter:texture.magFilter===THREE.NearestFilter?'nearest':'linear',mipmaps:filter[1],anisotropy:texture.anisotropy}});connect(coords,'value',node,'uv');textureNodes.set(key,node);
  const [target,pin,factor]=mappings[key];let value;
  if(key.endsWith('NormalMap')||key==='normalMap'){const scale=material[key==='normalMap'?'normalScale':'clearcoatNormalScale'];if(scale.x!==scale.y||key==='normalMap'&&material.normalMapType!==THREE.TangentSpaceNormalMap)throw Error('동일 축 배율의 접선 노멀맵이 필요해요.');value=add('normalMap',{inputValues:{strength:scale.x}});connect(node,pin,value,'value');}
  else{value=multiply(node,pin,factor);if(key==='aoMap'){const n=add('add',{inputValues:{b:1-factor}});connect(value,'value',n,'a');value=n;}}
  connect(value,'value',output,target);textures.push(asset);

 }
 if(material.map&&(material.transparent||material.alphaTest>0)){const alpha=add('multiply'),prior=graph.edges.find(e=>e.to.node===output.id&&e.to.pin==='opacity');if(prior){graph.edges.splice(graph.edges.indexOf(prior),1);connect(graph.nodes.find(n=>n.id===prior.from.node),prior.from.pin,alpha,'b');}else alpha.inputValues.b=surface.opacity;connect(textureNodes.get('map'),'a',alpha,'a');connect(alpha,'value',output,'opacity');}
 const data={version:1,name,surface,graph};if(!validMaterialSurface(surface)||!validMaterialGraph(graph))throw Error('추출 머테리얼의 표면·그래프 검증에 실패했어요.');return{data,summary:{nodes:graph.nodes.length,textures:[...new Set(textures)],sourceType:material.type}};
}
export async function extractModelMaterialDocument(params,hooks){
 for(const key of ['dryRun','includeData'])if(params[key]!==undefined&&typeof params[key]!=='boolean')throw Error(key+'는 bool로 지정하세요.');
 const{doc,revision}=await hooks.document(params);if(doc.kind!=='modelimport')throw Error('모델 가져오기 문서를 여세요.');const preview=hooks.preview(doc);if(!preview)throw Error('모델 미리보기를 여세요.');await preview.ready;const latest=await hooks.document(params);if(latest.doc!==doc||preview.disposed||hooks.preview(doc)!==preview)throw Object.assign(Error('추출 중 원본 문서가 바뀌었어요.'),{code:'REVISION_CONFLICT'});preview.snapshot();
 const result=extractModelMaterial(modelMaterialSubasset(preview.result,doc.data,params.subasset),{name:params.name}),source={model:doc.data.source,subasset:params.subasset,revision,hash:doc.data.sourceHash??null};
 if(params.dryRun)return{valid:true,result:result.summary,source,...(params.includeData?{data:result.data}:{dataOmitted:true})};return{...await hooks.create(doc,result.data),result:result.summary,source};
}
export const modelMaterialExtractionContract={output:'Existing v1 material graph/surface; independent asset, atomic create without overwrite.',source:'Loaded Standard/Physical PBR, exact glTF material index or unique other-format name/FBX identity. External project images only; no parser or blob URL retention.',features:'Linear color values; physical constants; base/emissive/ORM/alpha/normal/coat/transmission/thickness/sheen/specular/iridescence maps with channel factors, UV0 transforms/flip and representable sampler states.',limits:'Embedded images, other shading models/maps, BackSide/custom raster states, secondary UVs, anisotropic normal scales and unsupported sampler filters reject before publication. No image copying or full DCC/render parity claim.'};
