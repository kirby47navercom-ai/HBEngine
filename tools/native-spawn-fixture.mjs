import {createAsset} from '../prototype/asset-documents.js';
import {makeSceneComponent} from '../prototype/scene-components.js';
import {parseNativeHeader} from '../prototype/native-model.js';

export function nativeSpawnFixture(){
  const files=new Map([
    ['Source/Spawner.h',`#include <HBEngine/Game.hpp>
HB_CLASS() class Spawner:public hb::Library {public:HB_FUNCTION(BlueprintCallable) static hb::Actor* CreateAndCall(const std::string& asset);};`],
    ['Source/Spawner.cpp',`hb::Actor* Spawner::CreateAndCall(const std::string& asset){hb::Transform t;t.position={4,5,6};auto* actor=hb::Scene::Spawn(asset,t);if(hb::Native::GetFloat(actor,"HP")!=10)throw std::runtime_error("foreign spawn default");hb::Native::SetFloat(actor,"HP",8);const auto damage=hb::Native::Call(actor,"Damage",{{"amount",2}});if(damage.at("result")!=6||hb::Native::GetFloat(actor,"HP")!=6)throw std::runtime_error("foreign spawned state not retained");const auto hits=hb::Physics::OverlapSphere(actor->transform.position,2);if(std::find(hits.begin(),hits.end(),actor)==hits.end())throw std::runtime_error("same-call physics cannot see spawn");return actor;}`],
    ['Source/Enemy.h',`#include <HBEngine/Game.hpp>
HB_CLASS(Blueprintable) class ForeignEnemy:public hb::Actor {public:HB_PROPERTY(BlueprintReadWrite) float HP=10;HB_FUNCTION(BlueprintCallable) float Damage(float amount);};`],
    ['Source/Enemy.cpp',`float ForeignEnemy::Damage(float amount){HP-=amount;transform.position.x+=3;hb::Physics::SetVelocity(this,{1,2,3});return HP;}`]
  ]);
  const director=createAsset('blueprint','BP_Director'),enemy=createAsset('blueprint','BP_Enemy');
  for(const [bp,name] of [[director,'Spawner'],[enemy,'Enemy']]){const header=files.get('Source/'+name+'.h'),source=files.get('Source/'+name+'.cpp');bp.native={...parseNativeHeader(header),header,source,headerPath:'Source/'+name+'.h',sourcePath:'Source/'+name+'.cpp'};}
  enemy.settings.parentClass='ForeignEnemy';enemy.components=[makeSceneComponent('BoxCollider'),makeSceneComponent('Rigidbody',{useGravity:false})];
  const assets=new Map([['Assets/BP_Director.hbblueprint.json',director],['Assets/BP_Enemy.hbblueprint.json',enemy]]),objects=[{id:'director',name:'Director',kind:'empty',visible:true,position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],blueprintAsset:'Assets/BP_Director.hbblueprint.json'}];
  return {files,assets,objects};
}
