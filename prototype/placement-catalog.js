import {defaultsForObject,addSceneComponent} from './scene-components.js';
import {makeEnvironmentActor,environmentActorKinds} from './scene-environment.js';

// The editor and automation schema expose the same serializable recipes.
export const placementCatalog=[
  ['empty','Empty Actor · 빈 오브젝트','기본'],['group','Group · 그룹','기본'],
  ['cube','Cube · 큐브','도형'],['sphere','Sphere · 구','도형'],['cylinder','Cylinder · 원기둥','도형'],['cone','Cone · 원뿔','도형'],['capsule','Capsule · 캡슐','도형'],['torus','Torus · 고리','도형'],['plane','Plane · 평면','도형'],
  ['sprite','Sprite · 스프라이트','2D'],['character2d','Platform Character · 플랫포머 캐릭터','2D'],['tilemap','Tilemap · 타일맵','2D'],
  ['sortingGroup','Sorting Group · 정렬 그룹','2D','empty',{SortingGroup:{}}],
  ['spriteMask','Sprite Mask · 스프라이트 마스크','2D','empty',{SpriteMask:{}}],
  ['shadowCaster2d','Shadow Caster 2D · 그림자 모양','2D','empty',{ShadowCaster2D:{source:'shape'}}],
  ['shadowGroup2d','Composite Shadow Caster 2D · 그림자 그룹','2D','empty',{CompositeShadowCaster2D:{}}],
  ['topdown2d','Top Down Character · 탑다운 캐릭터','2D','sprite',{TopDownMovement2D:{autoPossess:true},Rigidbody2D:{useGravity:false}}],
  ['physics2d','Physics Sprite · 물리 스프라이트','2D','sprite',{Rigidbody2D:{}}],
  ['trigger2d','Trigger 2D · 감지 영역','2D','empty',{BoxCollider2D:{trigger:true}}],
  ['renderer2d','Renderer 2D · 2D 조명 설정','2D','empty',{Renderer2D:{}}],
  ['pointLight2d','Point Light 2D · 원형 광원','2D','light2d',{Light2D:{}}],
  ['spotLight2d','Spot Light 2D · 부채꼴 광원','2D','light2d',{Light2D:{lightType:'spot'}}],
  ['freeformLight2d','Freeform Light 2D · 자유 모양 광원','2D','light2d',{Light2D:{lightType:'freeform'}}],
  ['spriteLight2d','Sprite Light 2D · 스프라이트 광원','2D','light2d',{Light2D:{lightType:'sprite'}}],
  ['globalLight2d','Global Light 2D · 전체 광원','2D','light2d',{Light2D:{lightType:'global'}}],
  ['camera2d','Camera 2D · 직교 카메라','2D','camera',{Camera:{projection:'orthographic',main:true}}],
  ['particles2d','Particles 2D · 2D 입자','2D','particles',{ParticleSystem:{shape:'circle'}}],
  ['navigation2d','Navigation 2D · 경로 영역','2D','navigation',{NavigationGrid:{plane:'XY'}}],
  ['character','Character · 캐릭터','게임플레이'],['playerStart','Player Start · 시작점','게임플레이'],
  ['pawn','Pawn · 폰','게임플레이','cube',{PawnMovement:{autoPossess:true},Rigidbody:{useGravity:false}}],
  ['controller','Player Controller · 플레이어 제어','게임플레이'],['gameMode','Game Mode · 게임 모드','게임플레이'],['gameState','Game State · 게임 상태','게임플레이'],['playerState','Player State · 플레이어 상태','게임플레이'],
  ['rope2d','Rope 2D · 로프','2D','empty',{Rope2D:{},MeshRenderer:{}}],
  ['rope3d','Rope 3D · 입체 로프','물리','empty',{Cloth:{topology:'rope',pinMode:'both'},MeshRenderer:{}}],
  ['cloth','Cloth · 천','물리','empty',{Cloth:{},MeshRenderer:{}}],
  ['vehicle','Vehicle · 차량','물리','cube',{Rigidbody:{mass:1200},BoxCollider:{center:[0,.5,0]},RaycastVehicle:{}}],
  ['physicsCube','Physics Cube · 물리 큐브','물리','cube',{Rigidbody:{}}],
  ['physicsSphere','Physics Sphere · 물리 구','물리','sphere',{Rigidbody:{}}],
  ['trigger','Trigger Box · 감지 영역','물리','empty',{BoxCollider:{trigger:true}}],
  ['animationBudget','Animation Budget · 애니메이션 예산','최적화','empty',{AnimationBudget:{}}],
  ['directionalLight','Directional Light · 태양광','조명'],['pointLight','Point Light · 점 광원','조명'],['spotLight','Spot Light · 스포트 광원','조명'],
  ['megaLights','Mega Lights · 다중 광원','조명','empty',{PostProcessVolume:{bloomEnabled:false,pathTracingEnabled:true,pathTracingDenoise:true,megaLightsEnabled:true}}],
  ['skyAtmosphere','Sky Atmosphere · 하늘 대기','환경'],['skyLight','Sky Light · 주변광','환경'],['volumetricCloud','Volumetric Cloud · 구름','환경'],['heightFog','Exponential Height Fog · 높이 안개','환경'],['reflectionProxyVolume','Reflection Proxy Volume · 투영 프록시','환경','empty',{ReflectionProxyVolume:{}}],['reflectionProbe','Reflection Probe · 반사 프로브','환경','empty',{ReflectionProbe:{}}],['sphereReflectionProbe','Sphere Reflection Probe · 구형 반사 프로브','환경','empty',{ReflectionProbe:{volumeShape:'sphere'}}],['postProcess','Post Process Volume · 후처리','환경','empty',{PostProcessVolume:{}}],
  ['camera','Camera · 카메라','시네마틱'],['sequence','Sequence Player · 시퀀스 재생','시네마틱','empty',{SequencePlayer:{}}],['audio','Audio Source · 오디오','오디오'],['audioListener','Audio Listener · 오디오 수신','오디오','empty',{AudioListener:{}}],
  ['decal','Decal · 데칼','효과'],['particles','Particle System · 입자','효과'],
  ['navigation','Navigation Grid · 경로 영역','AI'],
  ['navigationArea','Navigation Area · 비용 영역','AI','empty',{NavigationArea:{}}],
  ['navigationBlocker','Navigation Blocker · 이동 장애물','AI','empty',{NavigationObstacle:{},BoxCollider:{extent:[1,1,1]}}],
  ['navigationArea2d','Navigation Area 2D · 비용 영역','2D','empty',{NavigationArea:{extent:[1,1,.1]}}],
  ['navigationBlocker2d','Navigation Blocker 2D · 이동 장애물','2D','empty',{NavigationObstacle:{},BoxCollider2D:{extent:[1,1,.1]}}],
  ['aiCharacter','AI Character · AI 캐릭터','AI','character',{AIController:{},NavigationAgent:{},AIPerception:{},BehaviorTree:{}}],
].map(([key,label,category,kind=key,components={}])=>({key,label,category,kind,components}));

export function createPlacedObject(key,{position=[0,0,0],id=crypto.randomUUID()}={}){
  const recipe=placementCatalog.find(entry=>entry.key===key);if(!recipe)throw Error('배치할 오브젝트 종류를 확인하세요.');
  if(Object.hasOwn(environmentActorKinds,key))return makeEnvironmentActor(key,{position,id});
  const object={id,name:recipe.label.split(' · ')[0],kind:recipe.kind,group:'WORLD',position:[...position],rotation:[0,0,0],scale:[1,1,1],visible:true,components:defaultsForObject(recipe.kind)};
  for(const [type,properties] of Object.entries(recipe.components)){
    const component=object.components.find(c=>c.type===type)||addSceneComponent(object,type);Object.assign(component.properties,structuredClone(properties));
  }
  if(key==='vehicle'){object.scale=[1.8,.6,3.6];object.position[1]+=.9;}return object;
}

export function appendPlacedObject(data,key,{position=[0,0,0],id,name,parent}={}){
 if(!Array.isArray(data?.objects)||!Array.isArray(position)||position.length!==3||position.some(v=>!Number.isFinite(v))||id!==undefined&&(typeof id!=='string'||!id.trim()||id.length>160)||name!==undefined&&(typeof name!=='string'||!name.trim()||name.length>200)||parent!==undefined&&parent!==null&&(typeof parent!=='string'||!data.objects.some(o=>o.id===parent)))throw Error('배치 대상 장면·위치·이름·부모를 확인하세요.');
 const object=createPlacedObject(key,{position,id});if(data.objects.some(o=>o.id===object.id))throw Error('오브젝트 ID가 이미 있어요.');if(name!==undefined)object.name=name;if(parent)object.parent=parent;data.objects.push(object);return {id:object.id,kind:object.kind,recipe:key,components:object.components.map(c=>({id:c.id,type:c.type}))};
}

// Prepare an entire authoring batch before changing even the caller's draft.
// Parent links may refer forward within the batch; one iterative graph pass
// rejects cycles without a recursion limit or a global object-count cap.
export function appendPlacedObjects(data,placements){
 if(!Array.isArray(data?.objects)||!Array.isArray(placements))throw Error('장면 배치 목록을 확인하세요.');
 const ids=new Set(data.objects.map(o=>o.id)),objects=[],results=[],parents=new Map(data.objects.map(o=>[o.id,o.parent||o.parentId]));if(ids.size!==data.objects.length)throw Error('장면 오브젝트 ID가 중복됐어요.');
 for(const row of placements){
  if(!row||typeof row!=='object'||Array.isArray(row)||Object.keys(row).some(key=>!['kind','position','id','name','parent'].includes(key)))throw Error('오브젝트 배치 항목을 확인하세요.');
  const {kind,position=[0,0,0],id,name,parent}=row;
  if(!Array.isArray(position)||position.length!==3||position.some(v=>!Number.isFinite(v))||id!==undefined&&(typeof id!=='string'||!id.trim()||id.length>160)||name!==undefined&&(typeof name!=='string'||!name.trim()||name.length>200)||parent!==undefined&&parent!==null&&(typeof parent!=='string'||!parent.trim()))throw Error('배치 위치·ID·이름·부모를 확인하세요.');
  const object=createPlacedObject(kind,{position,id});if(ids.has(object.id))throw Error('오브젝트 ID가 이미 있어요.');ids.add(object.id);if(name!==undefined)object.name=name;if(parent)object.parent=parent;objects.push(object);parents.set(object.id,parent);results.push({id:object.id,kind:object.kind,recipe:kind,components:object.components.map(c=>({id:c.id,type:c.type}))});
 }
 const done=new Set();for(const object of objects){const visiting=new Set(),chain=[];for(let at=object.id;at&&!done.has(at);at=parents.get(at)){if(!ids.has(at))throw Error('배치 부모 오브젝트가 없어요.');if(visiting.has(at))throw Error('배치 부모 연결이 순환해요.');visiting.add(at);chain.push(at);}for(const id of chain)done.add(id);}
 for(const object of objects)data.objects.push(object);return {objects:results};
}
