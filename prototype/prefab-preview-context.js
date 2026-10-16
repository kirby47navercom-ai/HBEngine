import * as THREE from 'three';

export function grayPrefabBackground(group){
 const cache=new Map();group.traverse(node=>{if(!node.material)return;const convert=original=>{if(!cache.has(original)){const material=original.clone(),compile=original.onBeforeCompile,key=original.customProgramCacheKey();material.onBeforeCompile=(shader,renderer)=>{compile.call(original,shader,renderer);const output='#include <colorspace_fragment>';if(!shader.fragmentShader.includes(output))throw Error('이 미리보기 셰이더는 회색 배경을 지원하지 않아요.');shader.fragmentShader=shader.fragmentShader.replace(output,output+'\ngl_FragColor.rgb=vec3(dot(gl_FragColor.rgb,vec3(0.2126,0.7152,0.0722)));');};material.customProgramCacheKey=()=>key+'|hb-prefab-gray-207';material.userData.prefabGray=true;cache.set(original,material);(group.userData.resources??=new Set()).add(material);}return cache.get(original);};node.material=Array.isArray(node.material)?node.material.map(convert):convert(node.material);});return cache.size;
}

export function prefabSnapSettings(value={}){
 const out={enabled:false,translation:.5,rotation:15,scale:.1,mode:'grid',...value};if(Object.keys(value).some(k=>!['enabled','translation','rotation','scale','mode'].includes(k))||typeof out.enabled!=='boolean'||!['grid','surface','vertex'].includes(out.mode)||!Number.isFinite(out.translation)||out.translation<=0||out.translation>1e6||!Number.isFinite(out.rotation)||out.rotation<=0||out.rotation>180||!Number.isFinite(out.scale)||out.scale<=0||out.scale>1000)throw Error('프리팹 스냅 값을 확인하세요.');return out;
}

// Scene targets are read-only. The result is an authored local transform, so
// the ordinary document edit path owns revisions, one Undo and source writes.
export function prefabSnapTransform(group,targets,{origin,direction,mode='surface',target}={}){
 if(!group?.parent||!['surface','vertex'].includes(mode)||![origin,direction].every(v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite)))throw Error('스냅 광선과 대상을 확인하세요.');const axis=new THREE.Vector3(...direction);if(axis.lengthSq()<1e-20)throw Error('스냅 방향을 확인하세요.');group.updateWorldMatrix(true,false);if(Math.abs(group.parent.matrixWorld.determinant())<1e-15)throw Error('크기가 0인 부모에는 스냅할 수 없어요.');for(const row of targets)row.updateWorldMatrix(true,true);
 const ray=new THREE.Raycaster(new THREE.Vector3(...origin),axis.normalize()),hits=ray.intersectObjects(targets,true).filter(h=>{let o=h.object;while(o){if(o===group||!o.visible)return false;o=o.parent;}return true;});
 for(const hit of hits){let owner=hit.object;while(owner&&!targets.includes(owner))owner=owner.parent;if(!owner||target&&owner.userData.objectId!==target&&owner.userData.objectId!=='__hb_context__/'+target)continue;const point=hit.point.clone();let vertex=null;
  if(mode==='vertex'){const position=hit.object.geometry?.getAttribute('position');if(!position||!hit.face)continue;let distance=Infinity;for(const index of[hit.face.a,hit.face.b,hit.face.c]){const v=new THREE.Vector3();if(hit.object.getVertexPosition)hit.object.getVertexPosition(index,v);else v.fromBufferAttribute(position,index);v.applyMatrix4(hit.object.matrixWorld);const d=v.distanceToSquared(hit.point);if(d<distance){distance=d;vertex=index;point.copy(v);}}}
  const local=group.parent.worldToLocal(point.clone());return {value:{position:local.toArray(),rotation:[group.rotation.x,group.rotation.y,group.rotation.z].map(THREE.MathUtils.radToDeg),scale:group.scale.toArray()},hit:{target:owner.userData.objectId,point:point.toArray(),vertex}};
 }throw Error('광선과 만나는 스냅 표면이 없어요.');
}
