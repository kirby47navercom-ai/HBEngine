import {makeStarterScene} from './scene-templates.js';
import {defaultsForObject,addSceneComponent} from './scene-components.js';
import {createAsset} from './asset-documents.js';
import {makeNode,connect} from './blueprint-model.js';
import {parseNativeHeader} from './native-model.js';
import {createWidgetAsset,createWidgetNode,addMobileControls} from './ui-assets.js';

// The sample is ordinary project data and user C++, editable by the same tools as any game.
export function shooterTemplate(name,{bullets=64,enemies=12}={}){
  if(!Number.isInteger(bullets)||bullets<1||bullets>128||!Number.isInteger(enemies)||enemies<0||enemies>128)throw Error('탄환·적 풀 크기를 확인하세요.');
  const scene=makeStarterScene(name,'2d'),files={},p=(o,type)=>o.components.find(c=>c.type===type).properties;
  const object=(id,kind,position)=>({id,name:id,kind,position,rotation:[0,0,0],scale:[1,1,1],visible:true,components:defaultsForObject(kind)});
  const player=scene.objects.find(o=>o.id==='Player');player.position=[0,0,.1];player.components=player.components.filter(c=>c.type!=='CharacterMovement2D');addSceneComponent(player,'TopDownMovement2D').properties.autoPossess=true;p(player,'Rigidbody2D').useGravity=false;p(player,'SpriteRenderer').width=.7;p(player,'SpriteRenderer').height=.9;
  const camera=scene.objects.find(o=>o.id==='Camera');camera.position=[0,0,12];Object.assign(p(camera,'Camera'),{followTarget:'',orthographicSize:7});scene.objects=[player,camera];
  const pool=(count,prefix,color,size)=>Array.from({length:count},(_,i)=>{const o=object(prefix+i,'sprite',[Math.cos(i*2.4)*6,Math.sin(i*2.4)*4,.1]);Object.assign(p(o,'SpriteRenderer'),{color,width:size,height:size});addSceneComponent(o,'Rigidbody2D').properties.useGravity=false;const body=p(o,'Rigidbody2D');body.drag=0;body.angularDrag=0;body.collisionDetection='continuous';Object.assign(p(o,'BoxCollider2D'),{extent:[size/2,size/2,.1],trigger:true,layer:prefix==='Enemy'?2:3,mask:prefix==='Enemy'?10:4});addSceneComponent(o,'PooledActor').properties.initiallyActive=prefix==='Enemy';return o;});
  const projectiles=pool(bullets,'Bullet',[1,.82,.29,1],.14),opponents=pool(enemies,'Enemy',[.89,.27,.36,1],.7);scene.objects.push(...projectiles,...opponents);
  const header=`#pragma once
#include <HBEngine/Game.hpp>
#include <map>
HB_CLASS(Blueprintable)
class TopDownShooter : public hb::Actor {
public:
  HB_FUNCTION(BlueprintCallable, KoreanName="조준·발사·탄환 재사용", Category="탑다운 슈터")
  void Update(float delta,const std::vector<hb::Actor*>& bullets,const std::vector<hb::Actor*>& enemies);
private:
  float cooldown=0;
  hb::Vec3 facing{1,0,0};
  std::map<hb::Actor*,float> lifetime;
};
`;
  const source=`#include "TopDownShooter.h"
void TopDownShooter::Update(float delta,const std::vector<hb::Actor*>& bullets,const std::vector<hb::Actor*>& enemies){
  for(auto it=lifetime.begin();it!=lifetime.end();){it->second-=delta;if(it->second<=0){hb::ActorPool::Release(it->first);it=lifetime.erase(it);}else ++it;}
  auto* player=hb::Gameplay::GetPlayerPawn();if(!player)return;
  const auto position=hb::Scene::GetPosition(player);
  hb::Vec3 direction{hb::Input::GetAxis("d")-hb::Input::GetAxis("a"),hb::Input::GetAxis("w")-hb::Input::GetAxis("s"),0};
  if(hb::VectorMath::VectorLengthSquared(direction)>.01f)facing=hb::VectorMath::NormalizeVector(direction);
  hb::Vec3 aim;if(hb::Input::GetMouseWorldPosition(hb::Vec3{0,0,1},position,aim)){
    direction=aim-position;if(hb::VectorMath::VectorLengthSquared(direction)>.01f)facing=hb::VectorMath::NormalizeVector(direction);
  }
  hb::Sprites::SetFlip(player,facing.x<0,false);
  cooldown-=delta;if(hb::Input::IsKeyDown("LeftMouseButton")&&cooldown<=0){
    hb::Transform spawn;spawn.position=position+facing*.55f;
    if(auto* bullet=hb::ActorPool::Acquire(bullets,spawn)){hb::Physics::SetVelocity(bullet,facing*12);lifetime[bullet]=1.5f;cooldown=.09f;}
  }
  for(auto* enemy:enemies){if(!hb::ActorPool::IsActive(enemy))continue;
    const auto enemyPosition=hb::Scene::GetPosition(enemy);hb::Physics::SetVelocity(enemy,hb::VectorMath::NormalizeVector(position-enemyPosition)*1.2f);
    for(auto* bullet:bullets)if(hb::ActorPool::IsActive(bullet)&&hb::VectorMath::DistanceSquared(enemyPosition,hb::Scene::GetPosition(bullet))<.25f){
      hb::ActorPool::Release(bullet);lifetime.erase(bullet);hb::ActorPool::Release(enemy);lifetime[enemy]=2;break;
    }
  }
  for(auto* enemy:enemies)if(!hb::ActorPool::IsActive(enemy)&&lifetime.find(enemy)==lifetime.end()){
    hb::Transform spawn;spawn.position=hb::Vec3{-6,4,.1f};hb::ActorPool::Acquire(std::vector<hb::Actor*>{enemy},spawn);
  }
}
`;
  files['Source/TopDownShooter.h']=header;files['Source/TopDownShooter.cpp']=source;
  const bp=createAsset('blueprint','BP_TopDownShooter');bp.native={...parseNativeHeader(header),header,source,headerPath:'Source/TopDownShooter.h',sourcePath:'Source/TopDownShooter.cpp'};bp.settings.parentClass='TopDownShooter';
  bp.variables=[{id:'bullets',name:'Bullets',type:'object',container:'array',value:projectiles.map(o=>o.id)},{id:'enemies',name:'Enemies',type:'object',container:'array',value:opponents.map(o=>o.id)}];
  const tick=makeNode('tick',100,240),call=makeNode('nativeCall',430,240);call.nativeId='TopDownShooter.Update';const reads=bp.variables.map((v,i)=>{const n=makeNode('getVariable',130,430+i*120);n.variableId=v.id;return n;});bp.nodes.push(tick,call,...reads);
  for(const [from,pin,to,input] of [[tick,'then',call,'exec'],[tick,'delta',call,'delta'],[reads[0],'value',call,'bullets'],[reads[1],'value',call,'enemies']]){const result=connect(bp,{node:from.id,pin},{node:to.id,pin:input});if(!result.ok)throw Error(result.message||'슈터 그래프 연결 오류');}
  const path='Assets/Blueprints/BP_TopDownShooter.hbblueprint.json';files[path]=bp;player.blueprintAsset=path;
  const hud=createWidgetAsset('W_TopDown');addMobileControls(hud);hud.nodes=hud.nodes.filter(n=>n.name!=='Jump');const title=createWidgetNode('Text','title');title.name='Title';title.properties.text=name;title.properties.fontSize=28;title.slot.offset=[32,24,600,48];hud.nodes.push(title);const hudPath='Assets/UI/W_TopDown.hbwidget.json';files[hudPath]=hud;addSceneComponent(player,'UIWidget').properties.asset=hudPath;
  return {scene,files};
}
