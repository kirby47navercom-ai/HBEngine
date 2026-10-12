import {attachGPURefraction} from './gpu-refraction.js';
import * as THREE from 'three';
import {componentDefaults,validComponentProperties} from './scene-components.js';
import {ShaderChunk} from 'three';
import {materialNodeKey} from './material-runtime.js';

const directions=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]],ups=[[0,-1,0],[0,-1,0],[0,0,1],[0,0,-1],[0,-1,0],[0,-1,0]];
export function collectReflectionProbes(scene){
  const result=[];scene.traverse(group=>{
    if(!group.userData.reflectionProbes)return;for(let parent=group;parent;parent=parent.parent)if(!parent.visible)return;
    for(const entry of group.userData.reflectionProbes){
      const p={...componentDefaults('ReflectionProbe'),...entry.properties};if(!validComponentProperties('ReflectionProbe',p))throw Error('반사 프로브 범위·해상도·캡처 설정을 확인하세요.');if(!p.enabled)continue;
      const extent=new THREE.Vector3(...p.size).multiplyScalar(.5),box=new THREE.Box3(extent.clone().negate().add(new THREE.Vector3(...p.offset)),extent.clone().add(new THREE.Vector3(...p.offset))).applyMatrix4(group.matrixWorld),center=new THREE.Vector3(...p.captureOffset).applyMatrix4(group.matrixWorld).toArray(),size=box.getSize(new THREE.Vector3());
      // shortcut: rotated probe volumes use their world AABB; add oriented bounds when authored rooms require it.
      result.push({id:group.userData.objectId+':'+entry.id,owner:group.userData.objectId,p,center,minimum:box.min.toArray(),maximum:box.max.toArray(),volume:size.x*size.y*size.z,group});
    }
  });return result;
}
export function selectReflectionProbes(probes,position){
  return probes.filter(p=>position.every((v,i)=>v>=p.minimum[i]&&v<=p.maximum[i])).sort((a,b)=>b.p.importance-a.p.importance||a.volume-b.volume||a.id.localeCompare(b.id)).slice(0,2).map(p=>({id:p.id,settings:{center:[...p.center,p.p.intensity],minimum:[...p.minimum,p.p.blendDistance],maximum:[...p.maximum,0],options:[1,p.p.diffuseIntensity,1,p.p.boxProjection?1:0]}}));
}
export function probeCaptureViews(probe){
  const camera=new THREE.PerspectiveCamera(90,1,probe.p.near,probe.p.far);camera.position.fromArray(probe.center);return directions.map((direction,i)=>{camera.up.fromArray(ups[i]);camera.lookAt(new THREE.Vector3(...probe.center).add(new THREE.Vector3(...direction)));camera.updateMatrixWorld();return {camera:camera.clone(),projection:new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse)};});
}

const glProjection=`uniform vec3 hbProbeCenter,hbProbeMin,hbProbeMax;uniform vec4 hbProbeOptions;varying vec3 hbProbePosition;
float hbProbeWeight(){if(hbProbeOptions.w<.5)return 1.0;vec3 d=min(hbProbePosition-hbProbeMin,hbProbeMax-hbProbePosition);if(any(lessThan(d,vec3(0))))return 0.0;return hbProbeOptions.z>0.0?clamp(min(d.x,min(d.y,d.z))/hbProbeOptions.z,0.0,1.0):1.0;}
vec3 hbProbeDirection(vec3 r){if(hbProbeOptions.y<.5)return r;vec3 safe=(step(vec3(0),r)*2.0-1.0)*max(abs(r),vec3(.000001)),t=max((hbProbeMin-hbProbePosition)/safe,(hbProbeMax-hbProbePosition)/safe);return hbProbePosition+r*min(t.x,min(t.y,t.z))-hbProbeCenter;}`;
// Three owns browser PMREM convolution; native captures/filter/SH remain on D3D11.
export class ReflectionProbesRendering{
  constructor(){this.views=new Map();}
  prepare(renderer,scene){
    if(renderer.hbBackend==='d3d11')return;
    scene.updateMatrixWorld();const probes=collectReflectionProbes(scene);let view=this.views.get(renderer);
    if(!probes.length){if(view)this.disposeRenderer(renderer);return;}
    if(!view){view={generator:renderer.hbPMREM?.()||new THREE.PMREMGenerator(renderer),probes:new Map(),materials:new Map(),clones:new Map(),captures:0};this.views.set(renderer,view);}
    const meshes=[],lights=[];scene.traverseVisible(n=>{if(n.isLight)lights.push([n.uuid,n.matrixWorld.elements,n.color?.toArray(),n.groundColor?.toArray(),n.intensity,n.distance,n.decay,n.angle,n.penumbra,n.target?.matrixWorld.elements]);if(n.isMesh&&!n.userData.editorHelper&&!n.userData.draw2d)meshes.push(n);});
    const used=new Set(probes.map(p=>p.id));for(const [id,entry] of view.probes)if(!used.has(id)){entry.target.dispose();view.probes.delete(id);}
    const live=new Set(meshes);for(const [mesh,entry] of view.clones)if(!live.has(mesh)){mesh.material=entry.original;for(const m of entry.owned){const state=view.materials.get(m);if(state){this.restore(m,state);view.materials.delete(m);}m.dispose();}view.clones.delete(mesh);}
    // Share authored uniform nodes and hooks; independent probe state must not freeze game material edits.
    const claimed=new Set();for(const mesh of meshes){const source=Array.isArray(mesh.material)?mesh.material:[mesh.material];if(source.some(m=>claimed.has(m))){const owned=source.map(m=>{const copy=new m.constructor().copy(m),state=view.materials.get(m);copy.userData=m.userData;copy.onBeforeCompile=state?.compile||m.onBeforeCompile;copy.customProgramCacheKey=state?.key||m.customProgramCacheKey;copy.setupEnvironment=state?.environment||m.setupEnvironment;copy.setupSpecular=m.setupSpecular;if(m.hbLayeredRefraction)attachGPURefraction(copy);if(state){copy.envMap=state.map;copy.envMapIntensity=state.intensity;copy.envNode=state.node;}return copy;});view.clones.set(mesh,{original:mesh.material,owned});mesh.material=Array.isArray(mesh.material)?owned:owned[0];}for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material])claimed.add(m);}
    const changed=probes.some(p=>p.p.refreshMode==='onChange')?JSON.stringify([lights,scene.background?.isColor?scene.background.toArray():null,scene.userData.resolvedEnvironment,meshes.map(n=>{n.skeleton?.update();return [n.uuid,n.matrixWorld.elements,n.instanceMatrix?.version,n.morphTargetInfluences,n.skeleton?Array.from(n.skeleton.boneMatrices):null,...(Array.isArray(n.material)?n.material:[n.material]).map(m=>{const source=m.userData?.materialSource;return [m.uuid,m.color?.toArray(),m.emissive?.toArray(),m.roughness,m.metalness,m.emissiveIntensity,source?.parameters,source?.surface,m.userData?.textureState?.(),source?.graph?.nodes.some(n=>['time','panner'].includes(materialNodeKey(n)))?scene.userData.hbMaterialTime||0:0,...['map','normalMap','roughnessMap','metalnessMap','emissiveMap','aoMap'].map(k=>m[k]?[m[k].uuid,m[k].version]:null)];})];})]):'';
    const bind=()=>{    const seen=new Set();for(const mesh of meshes){const selected=selectReflectionProbes(probes,mesh.getWorldPosition(new THREE.Vector3()).toArray())[0],probe=selected&&view.probes.has(selected.id)&&probes.find(p=>p.id===selected.id);
      for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]){
        if(!material?.isMeshStandardMaterial&&!material?.isMeshStandardNodeMaterial)continue;seen.add(material);let state=view.materials.get(material);
        if(!state){state={map:material.envMap,intensity:material.envMapIntensity,node:material.envNode,environment:material.setupEnvironment,compile:material.onBeforeCompile,key:material.customProgramCacheKey,cacheKey:material.customProgramCacheKey(),uniforms:{hbProbeCenter:{value:new THREE.Vector3()},hbProbeMin:{value:new THREE.Vector3()},hbProbeMax:{value:new THREE.Vector3()},hbProbeOptions:{value:new THREE.Vector4(1,0,0,0)}}};view.materials.set(material,state);
          if(renderer.hbProbeEnvironment)material.setupEnvironment=function(builder){return this.envNode?.isLightingNode?this.envNode:state.environment.call(this,builder);};
          if(!renderer.hbProbeEnvironment){material.onBeforeCompile=(shader,r)=>{state.compile.call(material,shader,r);Object.assign(shader.uniforms,state.uniforms);shader.vertexShader='varying vec3 hbProbePosition;\n'+shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvec4 hbProbeLocal=vec4(transformed,1.0);\n#ifdef USE_INSTANCING\nhbProbeLocal=instanceMatrix*hbProbeLocal;\n#endif\nhbProbePosition=(modelMatrix*hbProbeLocal).xyz;');shader.fragmentShader=glProjection+'\n'+shader.fragmentShader.replace('#include <envmap_physical_pars_fragment>',ShaderChunk.envmap_physical_pars_fragment.replace('return PI * envMapColor.rgb * envMapIntensity;','return PI * envMapColor.rgb * envMapIntensity * hbProbeOptions.x * hbProbeWeight();').replace('envMapRotation * reflectVec,','envMapRotation * hbProbeDirection(reflectVec),').replace('return envMapColor.rgb * envMapIntensity;','return envMapColor.rgb * envMapIntensity * hbProbeWeight();'));};material.customProgramCacheKey=()=>state.cacheKey+'|hb-probe-box';}
          material.needsUpdate=true;
        }
        const map=probe?view.probes.get(probe.id).target.texture:state.map;if(material.envMap!==map){material.envMap=map;material.needsUpdate=true;}material.envMapIntensity=probe?probe.p.intensity:state.intensity;
        if(renderer.hbProbeEnvironment){if(probe&&!state.gpu)state.gpu=renderer.hbProbeEnvironment(probe,map);const node=probe?state.gpu.node:state.node;if(material.envNode!==node){material.envNode=node;material.needsUpdate=true;}if(probe)state.gpu.update(probe,map);material.hbProbeRefraction=probe?state.gpu:null;}else{const u=state.uniforms;u.hbProbeOptions.value.set(probe?probe.p.diffuseIntensity:1,probe?.p.boxProjection?1:0,probe?.p.blendDistance||0,probe?1:0);if(probe){u.hbProbeCenter.value.fromArray(probe.center);u.hbProbeMin.value.fromArray(probe.minimum);u.hbProbeMax.value.fromArray(probe.maximum);}}
      }
    }
    for(const [m,state] of view.materials)if(!seen.has(m)){this.restore(m,state);view.materials.delete(m);}
};
    const keys=new Map(probes.map(probe=>[probe.id,JSON.stringify([probe.center,probe.minimum,probe.maximum,probe.p,probe.p.refreshMode==='onChange'?changed:''])]));
    const dirty=probes.filter(p=>view.probes.get(p.id)?.key!==keys.get(p.id));
    if(dirty.length){const iterations=Math.max(...dirty.map(p=>p.p.bounces));
      for(let bounce=0;bounce<iterations;bounce++){
        if(bounce>0)bind();const next=new Map();
        try{for(const probe of dirty){const p=probe.p;if(bounce>=p.bounces)continue;const hidden=[],materials=[],skies=[],environment=scene.environment;scene.environment=null;
          scene.traverse(n=>{if(n.visible&&(n.userData.editorHelper||n.userData.draw2d||p.excludeOwner&&n.userData.objectId===probe.owner||n.isMesh&&(Array.isArray(n.material)?n.material:[n.material]).some(m=>m?.transmission>0||m?.transmissionNode))){hidden.push(n);n.visible=false;}if(n.userData.environmentRender&&n.material?.uniforms?.topColor){skies.push([n,n.position.clone(),n.scale.clone()]);n.position.fromArray(probe.center);n.scale.setScalar(p.far*.85);n.updateMatrixWorld();}if(bounce===0&&n.isMesh)for(const m of Array.isArray(n.material)?n.material:[n.material]){if(!m||materials.some(e=>e[0]===m))continue;materials.push([m,m.envMap,m.envNode]);m.envMap=null;m.envNode=null;m.needsUpdate=true;}});
          try{const target=view.generator.fromScene(scene,0,p.near,p.far,{size:p.resolution,position:new THREE.Vector3(...probe.center)});next.set(probe.id,{key:bounce===p.bounces-1?keys.get(probe.id):null,target,size:p.resolution});view.captures++;}finally{scene.environment=environment;for(const n of hidden)n.visible=true;for(const [n,position,scale] of skies){n.position.copy(position);n.scale.copy(scale);n.updateMatrixWorld();}for(const [m,map,node] of materials){m.envMap=map;m.envNode=node;m.needsUpdate=true;}}
        }}catch(e){for(const entry of next.values())entry.target.dispose();throw e;}
        // Commit after every capture finishes, so all probes read the same previous iteration.
        for(const [id,entry]of next){view.probes.get(id)?.target.dispose();view.probes.set(id,entry);}
      }
    }
    bind();
    renderer.hbProbeResources={count:view.probes.size,captures:view.captures,browserSelection:'one probe per material; no cross-probe blend'};
  }
  restore(material,state){material.envMap=state.map;material.envMapIntensity=state.intensity;material.envNode=state.node;material.setupEnvironment=state.environment;material.onBeforeCompile=state.compile;material.customProgramCacheKey=state.key;material.needsUpdate=true;}
  disposeRenderer(renderer){const view=this.views.get(renderer);if(!view)return;for(const [m,state] of view.materials)this.restore(m,state);for(const [mesh,entry] of view.clones){mesh.material=entry.original;for(const m of entry.owned)m.dispose();}for(const p of view.probes.values())p.target.dispose();view.generator.dispose();this.views.delete(renderer);renderer.hbProbeResources={count:0};}
  dispose(){for(const renderer of this.views.keys())this.disposeRenderer(renderer);}
}
