import {requestSceneTravel} from './play-world.js';
import {storageKey,storage} from './project-session.js';
import {evaluateMaterial,validAsset} from './asset-documents.js';
import * as THREE from 'three';
import {OBJLoader} from 'three/addons/loaders/OBJLoader.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
import {editorRequest,fileUrl} from './project-browser.js';
import {componentDefaults,defaultsFor,validValue,sampleTimeline,timelineLength} from './blueprint-model.js';
import {validSurface} from './model.js';
import {componentDefinitions,objectComponents,addSceneComponent,enabledComponent} from './scene-components.js';
import {createScenePhysics,sceneWorldPosition,setSceneWorldPosition} from './scene-runtime.js';
import {resolveMaterialAsset,validMaterialSurface} from './material-runtime.js';
import {spriteAnimationFrame,valid2DAsset} from './two-d-assets.js';
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
  let physics;
  const readAsset=hooks.readAsset||(async(path)=>(await editorRequest(fileUrl(path))).json());
  const stopAnimation=id=>{animations.delete(id);const mixer=mixers.get(id);if(mixer){mixer.stopAllAction();mixer.uncacheRoot(mixer.getRoot());mixers.delete(id);}};
  const applyAnimation=(o,state)=>{for(const track of state.tracks)o[track.id]=sampleTimeline(track,state.time);hooks.update(o);};
  const target=(args,b,vm,key='target')=>{const o=vm.object(args[key]===null?b.self:args[key],b);if(!o)throw Error('대상 오브젝트가 없어요.');return o;};
  const ensurePhysics=vm=>physics??=createScenePhysics(vm.objects,{...hooks.physicsOptions,gameplay:hooks.gameplay,update:hooks.update});
  const operation=async(key,a,b,vm)=>{
    if(['getWorldPosition','setWorldPosition','getLocalPosition','setLocalPosition'].includes(key)){const o=target(a,b,vm);if(key==='getWorldPosition')return {return:sceneWorldPosition(o,vm.objects)};if(key==='getLocalPosition')return {return:[...o.position]};if(!Array.isArray(a.position)||a.position.length!==3||!a.position.every(Number.isFinite))throw Error('위치를 확인하세요.');if(key==='setWorldPosition')setSceneWorldPosition(o,a.position,vm.objects);else o.position=[...a.position];hooks.update(o);return {};}
    if(key==='spawn'){if(vm.objects.length>=500)throw Error('오브젝트 제한 초과');const known=b.root.native?.classes.some(c=>c.name===a.class),kind={Cube:'cube',Sphere:'sphere',Cylinder:'cylinder',Plane:'plane',Character:'character',Pawn:'character',Actor:'empty'}[a.class]||'cube';if(!known&&!['Actor','Pawn','Character','Cube','Sphere','Cylinder','Plane'].includes(a.class))throw Error('등록되지 않은 클래스: '+a.class);const o={id:crypto.randomUUID(),name:a.class,kind,group:'WORLD',visible:true,...structuredClone(a.transform),nativeClass:a.class};objectComponents(o);vm.objects.push(o);hooks.build(o);return {actor:o.id};}
    if(key==='destroy'){const o=target(a,b,vm);for(const binding of vm.bindings.filter(x=>x.self===o.id))await vm.emit(binding,'endPlay',{reason:'Destroyed'});vm.bindings=vm.bindings.filter(x=>x.self!==o.id);vm.jobs=vm.jobs.filter(j=>j.owner!==o.id);for(const [id,t] of vm.timelines)if(t.f.b.self===o.id)vm.timelines.delete(id);for(const [id,t] of vm.core.timers)if(t.owner===o.id)vm.core.timers.delete(id);stopAnimation(o.id);vm.objects.splice(vm.objects.indexOf(o),1);hooks.remove(o);return {};}
    if(key==='visibility'){const o=target(a,b,vm);o.visible=a.visible;hooks.update(o);return {};}
    if(key==='attach'){const o=target(a,b,vm),parent=target(a,b,vm,'parent');let p=parent;while(p){if(p.id===o.id)throw Error('부모 연결 순환');p=vm.object(p.parent);}const mesh=hooks.mesh(o.id),parentMesh=hooks.mesh(parent.id);if(!mesh||!parentMesh)throw Error('장면 객체가 없어요.');parentMesh.attach(mesh);o.parent=parent.id;o.position=mesh.position.toArray();o.rotation=mesh.rotation.toArray().slice(0,3).map(THREE.MathUtils.radToDeg);o.scale=mesh.scale.toArray();return {};}
    if(['getComponent','addComponent','componentEnabled'].includes(key)){const o=target(a,b,vm);if(key==='componentEnabled'){if(!o.owner)throw Error('컴포넌트 대상이 아니에요.');const owner=vm.object(o.owner),component=objectComponents(owner).find(c=>c.id===o.componentId);if(!component)throw Error('컴포넌트가 제거됐어요.');component.properties??=componentDefaults(component.type);component.properties.enabled=a.enabled;o.enabled=a.enabled;hooks.update(owner);return {};}let c=objectComponents(o).find(c=>c.type===a.class);if(!c&&key==='addComponent'){c=addSceneComponent(o,a.class);hooks.update(o);}if(!c)return {return:null};const id=o.id+':'+c.id;if(!vm.object(id))vm.objects.push({id,name:c.name,kind:'component',owner:o.id,componentId:c.id,visible:false,enabled:c.properties?.enabled!==false,position:[...o.position],rotation:[...o.rotation],scale:[...o.scale],properties:c.properties});return {return:id};}
    if(['getGameMode','getGameState','getPlayerController','getPlayerState','getPlayerPawn'].includes(key)){const field={getGameMode:'gameMode',getGameState:'gameState',getPlayerController:'controller',getPlayerState:'playerState',getPlayerPawn:'pawn'}[key];return {return:hooks.gameplay?.[field]||null};}
    if(key==='possess'||key==='unPossess'){const controller=target(a,b,vm,'controller'),control=objectComponents(controller).find(c=>['PlayerController','AIController'].includes(c.type));if(!control)throw Error('컨트롤러 컴포넌트가 필요해요.');const previous=controller.pawn&&vm.object(controller.pawn);if(previous)previous.controller=null;const pawn=key==='possess'?target(a,b,vm,'pawn'):null;if(pawn){if(pawn.controller&&pawn.controller!==controller.id){const old=vm.object(pawn.controller);if(old){old.pawn=null;const oldControl=objectComponents(old).find(c=>['PlayerController','AIController'].includes(c.type));if(oldControl)oldControl.properties.pawn='';}}pawn.controller=controller.id;}controller.pawn=pawn?.id||null;control.properties.pawn=pawn?.id||'';if(hooks.gameplay?.controller===controller.id)hooks.gameplay.pawn=pawn?.id||null;return {};}
    if(['addMovementInput','jump','getVelocity','setVelocity','addForce'].includes(key)){const o=target(a,b,vm),system=ensurePhysics(vm);if(key==='getVelocity')return {return:structuredClone(o.velocity||[0,0,0])};if(key==='addMovementInput'){if(!['PawnMovement','CharacterMovement','CharacterMovement2D'].some(type=>enabledComponent(o,type)))throw Error('이동 컴포넌트가 필요해요.');system.movement(o,a.direction,a.scale);}if(key==='jump')system.jump(o);if(key==='setVelocity')system.velocity(o,a.velocity);if(key==='addForce')system.force(o,a.force);return {};}
    if(key==='trace'||key==='lineTrace'){const start=new THREE.Vector3(...a.start),direction=new THREE.Vector3(...a.end).sub(start),distance=direction.length();if(!distance)return {[key==='trace'?'return':'hit']:defaultsFor('hit')};hooks.scene().updateMatrixWorld();const ray=new THREE.Raycaster(start,direction.normalize(),0,distance),hit=ray.intersectObjects(hooks.meshes(),true).find(h=>h.object.isMesh&&vm.object(h.object.userData.objectId)?.collisionEnabled!==false),normal=hit?.face?.normal.clone().transformDirection(hit.object.matrixWorld).toArray();return {[key==='trace'?'return':'hit']:hit?{hit:true,position:hit.point.toArray(),normal:normal||[0,1,0],actor:hit.object.userData.objectId}:defaultsFor('hit')};}
    if(key==='impulse'){ensurePhysics(vm).impulse(target(a,b,vm),a.impulse);return {};}
    if(key==='collisionEnabled'){target(a,b,vm).collisionEnabled=a.enabled;return {};}
    if(['sound','playSoundAt','stopSound'].includes(key)){const name=a.name||a.sound;if(key==='stopSound'){audio.get(name)?.pause();audio.delete(name);return {};}let path=await hooks.asset(name,'media'),settings;if(!path){const asset=await hooks.asset(name,'audioasset');if(asset){settings=await readAsset(asset);if(!validAsset('audioasset',settings)||!settings.clip)throw Error('오디오 에셋의 클립을 확인하세요.');path=settings.clip;}}if(!path)throw Error('오디오 파일을 찾을 수 없어요: '+name);const player=new Audio(fileUrl(path));player.volume=Math.max(0,Math.min(1,(a.volume??1)*(settings?.volume??1)));player.loop=settings?.loop??false;player.playbackRate=settings?.pitch??1;player.hbPosition=a.position;player.hbSettings=settings;await player.play();audio.get(name)?.pause();audio.set(name,player);return {};}
    if(['playAnimation','stopAnimation'].includes(key)){
      const o=target(a,b,vm);if(key==='stopAnimation'){stopAnimation(o.id);return {};}
      const group=hooks.mesh(o.id),clip=group?.userData.animations?.find(c=>c.name===a.clip);
      if(clip){stopAnimation(o.id);const mixer=new THREE.AnimationMixer(group);mixers.set(o.id,mixer);const action=mixer.clipAction(clip);action.setLoop(a.loop?THREE.LoopRepeat:THREE.LoopOnce,a.loop?Infinity:1);action.clampWhenFinished=true;action.reset().play();return {};}
      const path=await hooks.asset(a.clip,'animation')||await hooks.asset(a.clip,'spriteanimation');if(!path)throw Error('애니메이션 클립이나 에셋이 없어요: '+a.clip);
      if(path.endsWith('.hbspriteanimation.json')){const data=await readAsset(path);if(!valid2DAsset('spriteanimation',data)||!data.frames.length)throw Error('스프라이트 애니메이션 프레임을 확인하세요.');if(!hooks.spriteFrame)throw Error('스프라이트 렌더 서비스가 없어요.');const state={type:'sprite',animation:structuredClone(data),time:0,length:data.frames.reduce((sum,frame)=>sum+frame.duration,0),loop:a.loop,lastFrame:0};await hooks.spriteFrame(o,data.frames[0].sprite);stopAnimation(o.id);animations.set(o.id,state);return {};}
      const data=await readAsset(path);if(!validAsset('animation',data))throw Error('애니메이션 에셋 검증 실패');
      const tracks=data.timeline.tracks.filter(t=>['position','rotation','scale'].includes(t.id));
      if(!tracks.length||tracks.some(t=>t.type!=='vec3'||!t.keys.length))throw Error('애니메이션의 position/rotation/scale 트랙은 키가 있는 Vector여야 해요.');
      const timeline=structuredClone(data.timeline),state={timeline,tracks:timeline.tracks.filter(t=>tracks.some(track=>track.id===t.id)),time:0,length:timelineLength(timeline),loop:a.loop};
      stopAnimation(o.id);animations.set(o.id,state);applyAnimation(o,state);return {};
    }
    if(['setMaterial','materialFloat','lightIntensity'].includes(key)){
      const o=target(a,b,vm),group=hooks.mesh(o.id);if(!group)throw Error('렌더 대상이 없어요.');
      if(key==='lightIntensity'){let light;group.traverse(child=>{if(child.isLight)light=child;});if(!light)throw Error('광원 대상이 아니에요.');light.intensity=Math.max(0,a.value);return {};}
      if(key==='materialFloat'&&hooks.materialFloat){await hooks.materialFloat(o,a.parameter,a.value);return {};}
      let surface;if(key==='setMaterial'){const path=await hooks.asset(a.material,'material')||await hooks.asset(a.material,'materialinstance');if(!path)throw Error('머테리얼 파일이 없어요.');const data=await readAsset(path);if(!validAsset(data.surfaceOverrides?'materialinstance':'material',data))throw Error('머테리얼 검증 실패');if(hooks.material){await hooks.material(o,path,a.slot);return {};}surface=evaluateMaterial(await resolveMaterialAsset(data,readAsset));if(!validMaterialSurface(surface))throw Error('머테리얼 데이터 검증 실패');}
      group.traverse(child=>{if(!child.isMesh)return;const materials=Array.isArray(child.material)?child.material:[child.material];if(key==='setMaterial'&&(!Number.isInteger(a.slot)||a.slot<0||a.slot>=materials.length))throw Error('머테리얼 슬롯 범위 오류');const slots=key==='setMaterial'?[a.slot]:materials.map((_,i)=>i);for(const slot of slots){const material=materials[slot].clone();if(surface){material.color.set(surface.color);material.roughness=surface.roughness;material.metalness=surface.metalness;}else{const property={Roughness:'roughness',Metallic:'metalness',Opacity:'opacity',EmissiveIntensity:'emissiveIntensity',roughness:'roughness',metalness:'metalness'}[a.parameter];if(!property||!(property in material))throw Error('머테리얼 파라미터가 없어요: '+a.parameter);material[property]=a.value;material.needsUpdate=true;}materials[slot]=material;}child.material=Array.isArray(child.material)?materials:materials[0];});return {};
    }
    if(key==='door'){const o=target({target:b.self},b,vm);o.rotation[1]+=90;hooks.update(o);return {};}
    if(key==='saveGame'){(hooks.storage||storage).setItem((hooks.storageKey||storageKey)('hbengine.savegame.'+a.slot),JSON.stringify({version:1,objects:vm.objects,variables:vm.bindings.map(b=>({self:b.self,values:Object.fromEntries(b.variables)}))}));return {success:true};}
    if(key==='loadGame'){const data=JSON.parse((hooks.storage||storage).getItem((hooks.storageKey||storageKey)('hbengine.savegame.'+a.slot))||'null');if(!validRuntimeSave(data,vm))throw Error('저장 슬롯 데이터 검증 실패');for(const saved of data.objects){const o=vm.object(saved.id);Object.assign(o,saved);hooks.update(o);}for(const state of data.variables){const binding=vm.bindings.find(b=>b.self===state.self);binding.variables=new Map(Object.entries(state.values));}return {data:b.self};}
    if(['createWidget','addViewport','setText'].includes(key)){if(key==='createWidget'){if(!['Text','Button','Panel'].includes(a.class))throw Error('지원 위젯 클래스: Text, Button, Panel');const id=crypto.randomUUID(),element=document.createElement(a.class==='Button'?'button':'div');element.className='runtime-widget';widgets.set(id,element);vm.objects.push({id,name:a.class,kind:'widget',visible:false,position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]});return {widget:id};}const widget=widgets.get(a.widget);if(!widget)throw Error('위젯 참조가 없어요.');if(key==='setText')widget.textContent=a.text;else hooks.overlay().append(widget);return {};}
    if(key==='openScene')return requestSceneTravel(vm,a.scene,{readAsset,asset:hooks.asset});
    throw Error('실행 서비스가 없어요: '+key);
  };
  return {
    operation,gameplay:hooks.gameplay,
    start:async vm=>{await ensurePhysics(vm).loadMaterials(readAsset);for(const o of [...vm.objects]){const b=vm.bindings.find(b=>b.self===o.id)||{self:o.id,root:{components:objectComponents(o)}};for(const c of objectComponents(o)){const p={...componentDefaults(c.type),...c.properties};if(p.enabled===false)continue;if(c.type==='AudioSource'&&p.playOnStart&&p.clip){await operation('playSoundAt',{sound:p.clip,position:o.position,volume:p.volume},b,vm);const player=audio.get(p.clip);player.loop=p.loop;player.playbackRate=p.pitch;player.hbSource=o.id;}if(c.type==='Animator'&&p.playOnStart&&p.clip)await operation('playAnimation',{target:o.id,clip:p.clip,loop:p.loop},b,vm);}}},
    input:(key,value)=>physics?.input(key,value),releaseInput:()=>physics?.releaseInput(),contacts:()=>physics?.contacts(),
    physics:async(delta,vm,rawDelta=delta)=>{
      for(const o of vm.objects){const speed=enabledComponent(o,'Animator')?.speed??1;mixers.get(o.id)?.update(delta*speed);const state=animations.get(o.id);if(state){state.time+=(state.timeline?.ignoreTimeDilation?rawDelta:delta)*(state.timeline?.playRate??state.animation?.playRate??1)*speed;state.time=state.loop?state.time%state.length:Math.min(state.time,state.length);if(state.type==='sprite'){const frame=spriteAnimationFrame(state.animation,state.time,{loop:state.loop,rate:1});if(frame&&frame.index!==state.lastFrame){await hooks.spriteFrame(o,frame.sprite);state.lastFrame=frame.index;}}else applyAnimation(o,state);if(!state.loop&&state.time===state.length)animations.delete(o.id);}}
      await ensurePhysics(vm).advance(delta,dt=>vm.fixedTick(dt),()=>vm.collisions());
      const listener=hooks.listenerPosition?.()||vm.object(hooks.gameplay?.pawn)?.position||[0,0,0];
      for(const player of audio.values()){let p=player.hbSettings,position=player.hbPosition;if(player.hbSource){const source=vm.object(player.hbSource);p=source&&enabledComponent(source,'AudioSource');if(!p){player.pause();continue;}position=sceneWorldPosition(source,vm.objects);}if(!p||!position)continue;const distance=Math.hypot(...position.map((v,i)=>v-listener[i])),min=p.minDistance??p.refDistance,max=p.maxDistance,attenuation=p.spatial?Math.max(0,Math.min(1,1-(distance-min)/Math.max(.001,max-min))):1;player.volume=Math.min(1,p.volume*attenuation);}
    },
    dispose(){physics?.dispose();physics=null;audio.forEach(a=>a.pause());audio.clear();for(const id of [...mixers.keys()])stopAnimation(id);animations.clear();widgets.forEach(w=>w.remove());widgets.clear();}
  };
}
