import {storageKey,storage} from './project-session.js';
import {evaluateMaterial,validAsset} from './asset-documents.js';
import * as THREE from 'three';
import {OBJLoader} from 'three/addons/loaders/OBJLoader.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
import {editorRequest,fileUrl} from './project-browser.js';
import {componentDefaults,defaultsFor,validValue,sampleTimeline,timelineLength} from './blueprint-model.js';
import {validSurface} from './model.js';
export function validRuntimeSave(data,vm){
  return data?.version===1&&Array.isArray(data.objects)&&data.objects.length<=1000
    && new Set(data.objects.map(o=>o?.id)).size===data.objects.length
    && data.objects.every(o=>o&&typeof o.id==='string'&&typeof o.visible==='boolean'&&validValue('transform',o)&&['position','rotation','scale'].every(k=>o[k].every(v=>Math.abs(v)<=10000))&&o.scale.every(v=>v>=.01)&&vm.object(o.id)?.kind===o.kind)
    && Array.isArray(data.variables)&&data.variables.length<=500&&data.variables.every(state=>{
      const binding=vm.bindings.find(b=>b.self===state?.self);return binding&&state.values&&typeof state.values==='object'&&!Array.isArray(state.values)&&Object.entries(state.values).every(([id,value])=>{const variable=binding.root.variables.find(v=>v.id===id);return variable&&(variable.container==='array'?Array.isArray(value)&&value.length<=128&&value.every(v=>validValue(variable.type,v)):validValue(variable.type,value));});
    });
}
export async function loadModel(asset){
  const manager=new THREE.LoadingManager(),folder=asset.split('/').slice(0,-1).join('/');manager.setURLModifier(url=>{if(url.startsWith('data:')||url.startsWith('blob:'))return url;if(/^https?:/.test(url))throw Error('외부 모델 의존성은 프로젝트에 가져오세요.');return fileUrl((folder?folder+'/':'')+url.replace(/^\.\//,''));});
  const response=await editorRequest(fileUrl(asset)),extension=asset.split('.').pop().toLowerCase();
  if(extension==='obj')return {object:new OBJLoader(manager).parse(await response.text()),animations:[]};
  if(extension==='fbx'){const object=new FBXLoader(manager).parse(await response.arrayBuffer(),'');return {object,animations:object.animations};}
  if(['glb','gltf'].includes(extension)){const data=extension==='gltf'?await response.text():await response.arrayBuffer();const result=await new Promise((resolve,reject)=>new GLTFLoader(manager).parse(data,'',resolve,reject));return {object:result.scene,animations:result.animations};}
  throw Error('미리보기 임포터가 없는 모델: '+extension);
}
export function engineOperations(hooks){
  const audio=new Map(),mixers=new Map(),animations=new Map(),widgets=new Map();
  const readAsset=hooks.readAsset||(async(path)=>(await editorRequest(fileUrl(path))).json());
  const stopAnimation=id=>{animations.delete(id);const mixer=mixers.get(id);if(mixer){mixer.stopAllAction();mixer.uncacheRoot(mixer.getRoot());mixers.delete(id);}};
  const applyAnimation=(o,state)=>{for(const track of state.tracks)o[track.id]=sampleTimeline(track,state.time);hooks.update(o);};
  const target=(args,b,vm,key='target')=>{const o=vm.object(args[key]===null?b.self:args[key],b);if(!o)throw Error('대상 오브젝트가 없어요.');return o;};
  const operation=async(key,a,b,vm)=>{
    if(key==='spawn'){if(vm.objects.length>=500)throw Error('오브젝트 제한 초과');const known=b.root.native?.classes.some(c=>c.name===a.class),kind={Cube:'cube',Sphere:'sphere',Cylinder:'cylinder',Plane:'plane'}[a.class]||'cube';if(!known&&!['Actor','Cube','Sphere','Cylinder','Plane'].includes(a.class))throw Error('등록되지 않은 클래스: '+a.class);const o={id:crypto.randomUUID(),name:a.class,kind,group:'WORLD',visible:true,...structuredClone(a.transform),...(known?{nativeClass:a.class}:{})};vm.objects.push(o);hooks.build(o);return {actor:o.id};}
    if(key==='destroy'){const o=target(a,b,vm);for(const binding of vm.bindings.filter(x=>x.self===o.id))await vm.emit(binding,'endPlay',{reason:'Destroyed'});vm.bindings=vm.bindings.filter(x=>x.self!==o.id);vm.jobs=vm.jobs.filter(j=>j.owner!==o.id);for(const [id,t] of vm.timelines)if(t.f.b.self===o.id)vm.timelines.delete(id);for(const [id,t] of vm.core.timers)if(t.owner===o.id)vm.core.timers.delete(id);stopAnimation(o.id);vm.objects.splice(vm.objects.indexOf(o),1);hooks.remove(o);return {};}
    if(key==='visibility'){const o=target(a,b,vm);o.visible=a.visible;hooks.update(o);return {};}
    if(key==='attach'){const o=target(a,b,vm),parent=target(a,b,vm,'parent');let p=parent;while(p){if(p.id===o.id)throw Error('부모 연결 순환');p=vm.object(p.parent);}const mesh=hooks.mesh(o.id),parentMesh=hooks.mesh(parent.id);if(!mesh||!parentMesh)throw Error('장면 객체가 없어요.');parentMesh.attach(mesh);o.parent=parent.id;o.position=mesh.position.toArray();o.rotation=mesh.rotation.toArray().slice(0,3).map(THREE.MathUtils.radToDeg);o.scale=mesh.scale.toArray();return {};}
    if(['getComponent','addComponent','componentEnabled'].includes(key)){const o=target(a,b,vm);if(key==='componentEnabled'){if(!o.owner)throw Error('컴포넌트 대상이 아니에요.');o.enabled=a.enabled;return {};}o.components??=structuredClone(o.id===b.self?b.root.components:[]);let c=o.components.find(c=>c.type===a.class);if(!c&&key==='addComponent'){c={id:crypto.randomUUID(),name:a.class,type:a.class,properties:componentDefaults(a.class)};o.components.push(c);}if(!c)return {return:null};const id=o.id+':'+c.id;if(!vm.object(id))vm.objects.push({id,name:c.name,kind:'component',owner:o.id,visible:false,enabled:c.properties?.enabled!==false,position:[...o.position],rotation:[...o.rotation],scale:[...o.scale],properties:c.properties});return {return:id};}
    if(key==='trace'||key==='lineTrace'){const start=new THREE.Vector3(...a.start),direction=new THREE.Vector3(...a.end).sub(start),distance=direction.length();if(!distance)return {[key==='trace'?'return':'hit']:defaultsFor('hit')};hooks.scene().updateMatrixWorld();const ray=new THREE.Raycaster(start,direction.normalize(),0,distance),hit=ray.intersectObjects(hooks.meshes(),true).find(h=>h.object.isMesh&&vm.object(h.object.userData.objectId)?.collisionEnabled!==false),normal=hit?.face?.normal.clone().transformDirection(hit.object.matrixWorld).toArray();return {[key==='trace'?'return':'hit']:hit?{hit:true,position:hit.point.toArray(),normal:normal||[0,1,0],actor:hit.object.userData.objectId}:defaultsFor('hit')};}
    if(key==='impulse'){const o=target(a,b,vm);o.velocity=(o.velocity||[0,0,0]).map((v,i)=>v+a.impulse[i]);return {};}
    if(key==='collisionEnabled'){target(a,b,vm).collisionEnabled=a.enabled;return {};}
    if(['sound','playSoundAt','stopSound'].includes(key)){const name=a.name||a.sound;if(key==='stopSound'){audio.get(name)?.pause();audio.delete(name);return {};}const path=await hooks.asset(name,'media');if(!path)throw Error('오디오 파일을 찾을 수 없어요: '+name);const player=new Audio(fileUrl(path));player.volume=Math.max(0,Math.min(1,a.volume??1));await player.play();audio.get(name)?.pause();audio.set(name,player);return {};}
    if(['playAnimation','stopAnimation'].includes(key)){
      const o=target(a,b,vm);if(key==='stopAnimation'){stopAnimation(o.id);return {};}
      const group=hooks.mesh(o.id),clip=group?.userData.animations?.find(c=>c.name===a.clip);
      if(clip){stopAnimation(o.id);const mixer=new THREE.AnimationMixer(group);mixers.set(o.id,mixer);const action=mixer.clipAction(clip);action.setLoop(a.loop?THREE.LoopRepeat:THREE.LoopOnce,a.loop?Infinity:1);action.clampWhenFinished=true;action.reset().play();return {};}
      const path=await hooks.asset(a.clip,'animation');if(!path)throw Error('애니메이션 클립이나 에셋이 없어요: '+a.clip);
      const data=await readAsset(path);if(!validAsset('animation',data))throw Error('애니메이션 에셋 검증 실패');
      const tracks=data.timeline.tracks.filter(t=>['position','rotation','scale'].includes(t.id));
      if(!tracks.length||tracks.some(t=>t.type!=='vec3'||!t.keys.length))throw Error('애니메이션의 position/rotation/scale 트랙은 키가 있는 Vector여야 해요.');
      const timeline=structuredClone(data.timeline),state={timeline,tracks:timeline.tracks.filter(t=>tracks.some(track=>track.id===t.id)),time:0,length:timelineLength(timeline),loop:a.loop};
      stopAnimation(o.id);animations.set(o.id,state);applyAnimation(o,state);return {};
    }
    if(['setMaterial','materialFloat','lightIntensity'].includes(key)){const o=target(a,b,vm),group=hooks.mesh(o.id);if(!group)throw Error('렌더 대상이 없어요.');if(key==='lightIntensity'){let light;group.traverse(child=>{if(child.isLight)light=child;});if(!light)throw Error('광원 대상이 아니에요.');light.intensity=Math.max(0,a.value);}else{let surface;if(key==='setMaterial'){const path=await hooks.asset(a.material,'material');if(!path)throw Error('머테리얼 파일이 없어요.');const data=await readAsset(path);if(!validAsset('material',data))throw Error('머테리얼 검증 실패');surface=evaluateMaterial(data);if(!validSurface(surface))throw Error('머테리얼 데이터 검증 실패');}group.traverse(child=>{if(!child.isMesh)return;const materials=Array.isArray(child.material)?child.material:[child.material];if(key==='setMaterial'&&(!Number.isInteger(a.slot)||a.slot<0||a.slot>=materials.length))throw Error('머테리얼 슬롯 범위 오류');const slots=key==='setMaterial'?[a.slot]:materials.map((_,i)=>i);for(const slot of slots){const material=materials[slot].clone();if(surface){material.color.set(surface.color);material.roughness=surface.roughness;material.metalness=surface.metalness;}else{const property={Roughness:'roughness',Metallic:'metalness',Opacity:'opacity',EmissiveIntensity:'emissiveIntensity',roughness:'roughness',metalness:'metalness'}[a.parameter];if(!property||!(property in material))throw Error('머테리얼 파라미터가 없어요: '+a.parameter);material[property]=a.value;material.needsUpdate=true;}materials[slot]=material;}child.material=Array.isArray(child.material)?materials:materials[0];});}return {};}
    if(key==='door'){const o=target({target:b.self},b,vm);o.rotation[1]+=90;hooks.update(o);return {};}
    if(key==='saveGame'){storage.setItem(storageKey('hbengine.savegame.'+a.slot),JSON.stringify({version:1,objects:vm.objects,variables:vm.bindings.map(b=>({self:b.self,values:Object.fromEntries(b.variables)}))}));return {success:true};}
    if(key==='loadGame'){const data=JSON.parse(storage.getItem(storageKey('hbengine.savegame.'+a.slot))||'null');if(!validRuntimeSave(data,vm))throw Error('저장 슬롯 데이터 검증 실패');for(const saved of data.objects){const o=vm.object(saved.id);Object.assign(o,saved);hooks.update(o);}for(const state of data.variables){const binding=vm.bindings.find(b=>b.self===state.self);binding.variables=new Map(Object.entries(state.values));}return {data:b.self};}
    if(['createWidget','addViewport','setText'].includes(key)){if(key==='createWidget'){if(!['Text','Button','Panel'].includes(a.class))throw Error('지원 위젯 클래스: Text, Button, Panel');const id=crypto.randomUUID(),element=document.createElement(a.class==='Button'?'button':'div');element.className='runtime-widget';widgets.set(id,element);vm.objects.push({id,name:a.class,kind:'widget',visible:false,position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]});return {widget:id};}const widget=widgets.get(a.widget);if(!widget)throw Error('위젯 참조가 없어요.');if(key==='setText')widget.textContent=a.text;else hooks.overlay().append(widget);return {};}
    if(key==='openScene')throw Error('실행 중 장면 전환은 네이티브 월드 서비스가 필요해요.');
    throw Error('실행 서비스가 없어요: '+key);
  };
  return {operation,physics:async(delta,vm,rawDelta=delta)=>{for(const o of vm.objects){if(o.velocity){o.position=o.position.map((v,i)=>v+o.velocity[i]*delta);hooks.update(o);}mixers.get(o.id)?.update(delta);const state=animations.get(o.id);if(state){state.time+=(state.timeline.ignoreTimeDilation?rawDelta:delta)*(state.timeline.playRate??1);state.time=state.loop?state.time%state.length:Math.min(state.time,state.length);applyAnimation(o,state);if(!state.loop&&state.time===state.length)animations.delete(o.id);}}},dispose(){audio.forEach(a=>a.pause());audio.clear();for(const id of [...mixers.keys()])stopAnimation(id);animations.clear();widgets.forEach(w=>w.remove());widgets.clear();}};
}
