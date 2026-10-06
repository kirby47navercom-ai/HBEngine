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
  ['pointLight2d','Point Light 2D · 원형 광원','2D','light2d',{Light2D:{}}],
  ['spotLight2d','Spot Light 2D · 부채꼴 광원','2D','light2d',{Light2D:{lightType:'spot'}}],
  ['freeformLight2d','Freeform Light 2D · 자유 모양 광원','2D','light2d',{Light2D:{lightType:'freeform'}}],
  ['globalLight2d','Global Light 2D · 전체 광원','2D','light2d',{Light2D:{lightType:'global'}}],
  ['camera2d','Camera 2D · 직교 카메라','2D','camera',{Camera:{projection:'orthographic',main:true}}],
  ['particles2d','Particles 2D · 2D 입자','2D','particles',{ParticleSystem:{shape:'circle'}}],
  ['navigation2d','Navigation 2D · 경로 영역','2D','navigation',{NavigationGrid:{plane:'XY'}}],
  ['character','Character · 캐릭터','게임플레이'],['playerStart','Player Start · 시작점','게임플레이'],
  ['pawn','Pawn · 폰','게임플레이','cube',{PawnMovement:{autoPossess:true},Rigidbody:{useGravity:false}}],
  ['controller','Player Controller · 플레이어 제어','게임플레이'],['gameMode','Game Mode · 게임 모드','게임플레이'],['gameState','Game State · 게임 상태','게임플레이'],['playerState','Player State · 플레이어 상태','게임플레이'],
  ['physicsCube','Physics Cube · 물리 큐브','물리','cube',{Rigidbody:{}}],
  ['physicsSphere','Physics Sphere · 물리 구','물리','sphere',{Rigidbody:{}}],
  ['trigger','Trigger Box · 감지 영역','물리','empty',{BoxCollider:{trigger:true}}],
  ['directionalLight','Directional Light · 태양광','조명'],['pointLight','Point Light · 점 광원','조명'],['spotLight','Spot Light · 스포트 광원','조명'],
  ['skyAtmosphere','Sky Atmosphere · 하늘 대기','환경'],['skyLight','Sky Light · 주변광','환경'],['volumetricCloud','Volumetric Cloud · 구름','환경'],['heightFog','Exponential Height Fog · 높이 안개','환경'],['postProcess','Post Process Volume · 후처리','환경','empty',{PostProcessVolume:{}}],
  ['camera','Camera · 카메라','시네마틱'],['sequence','Sequence Player · 시퀀스 재생','시네마틱','empty',{SequencePlayer:{}}],['audio','Audio Source · 오디오','오디오'],
  ['decal','Decal · 데칼','효과'],['particles','Particle System · 입자','효과'],
  ['navigation','Navigation Grid · 경로 영역','AI'],
  ['aiCharacter','AI Character · AI 캐릭터','AI','character',{AIController:{},NavigationAgent:{},AIPerception:{},BehaviorTree:{}}],
].map(([key,label,category,kind=key,components={}])=>({key,label,category,kind,components}));

export function createPlacedObject(key,{position=[0,0,0],id=crypto.randomUUID()}={}){
  const recipe=placementCatalog.find(entry=>entry.key===key);if(!recipe)throw Error('배치할 오브젝트 종류를 확인하세요.');
  if(Object.hasOwn(environmentActorKinds,key))return makeEnvironmentActor(key,{position,id});
  const object={id,name:recipe.label.split(' · ')[0],kind:recipe.kind,group:'WORLD',position:[...position],rotation:[0,0,0],scale:[1,1,1],visible:true,components:defaultsForObject(recipe.kind)};
  for(const [type,properties] of Object.entries(recipe.components)){
    const component=object.components.find(c=>c.type===type)||addSceneComponent(object,type);Object.assign(component.properties,structuredClone(properties));
  }
  return object;
}
