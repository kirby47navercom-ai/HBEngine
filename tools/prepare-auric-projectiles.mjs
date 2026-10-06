import fs from 'node:fs/promises';
import path from 'node:path';
import {createAsset} from '../prototype/asset-documents.js';
import {makeNode} from '../prototype/blueprint-model.js';
import {parseNativeHeader,nativeSourceReference} from '../prototype/native-model.js';
import {makeSceneComponent} from '../prototype/scene-components.js';

export async function prepareAuricProjectiles(directory){
  const game=path.join(directory,'AuricLoop'),read=async p=>fs.readFile(path.join(game,p),'utf8'),write=(p,data)=>fs.writeFile(path.join(game,p),typeof data==='string'?data:JSON.stringify(data,null,2)+'\n');
  let header=await read('Source/TopDownShooter.h'),source=await read('Source/TopDownShooter.cpp');
  if(header.includes('class AuricProjectileProbe'))throw Error('격리 탄막 장면을 중복 준비할 수 없어요.');
  header+=`
HB_CLASS(Blueprintable)
class AuricProjectileProbe : public hb::Actor {
public:
 HB_PROPERTY(BlueprintReadOnly) int Active=0;
 HB_PROPERTY(BlueprintReadOnly) bool WidgetReady=false;
 HB_PROPERTY(BlueprintReadOnly) int DataFields=0;
 HB_PROPERTY(BlueprintReadOnly) float DataPlayerHp=0;
 HB_PROPERTY(BlueprintReadOnly) bool TempWritable=false;
 HB_PROPERTY(BlueprintReadOnly) bool LocalWritable=false;
 HB_PROPERTY(BlueprintReadOnly) int Hits=0;
 HB_PROPERTY(BlueprintReadWrite) std::vector<hb::Vec3> Points={{1,2,3},{4,5,6}};
 HB_PROPERTY(BlueprintReadWrite) std::vector<std::string> Labels={"한글","두 번째"};
 HB_PROPERTY(BlueprintReadWrite, AssetType="sprite") std::string ShotSprite="Assets/Sprites/S_FloorTile.hbsprite.json";
 HB_FUNCTION(BlueprintCallable) void Begin();
 HB_FUNCTION(BlueprintCallable) void Play(const std::string& asset,bool music);
 HB_FUNCTION(BlueprintCallable) void Tick(float delta);
 HB_FUNCTION(BlueprintCallable) void HitBatch(const std::string& hits);
 float elapsed=30.f;
};
`;
  source+=`
#include <fstream>
#include <filesystem>
#include <cstdlib>
void AuricProjectileProbe::Begin(){auto* player=hb::Gameplay::GetPlayerPawn();hb::UI::SetText(player,"HUD","GoldText","첫 프레임 준비");WidgetReady=true;auto data=hb::Data::Get("Assets/Data/DA_Balance.hbdata.json");DataFields=int(data.size());DataPlayerHp=data.at("playerHp").get<float>();auto writable=[](const char* key){
#ifdef _WIN32
 const auto* dir=_wgetenv(std::string(key)=="TEMP"?L"TEMP":L"LOCALAPPDATA");if(!dir)return false;const auto directory=std::filesystem::path(dir);
#else
 const auto* dir=std::getenv(key);if(!dir)return false;const auto directory=std::filesystem::u8path(dir);
#endif
 std::ofstream file(directory/"HBEngineProbe.txt");file<<"한글 파일 쓰기";return bool(file);};TempWritable=writable("TEMP");LocalWritable=writable("LOCALAPPDATA");}
void AuricProjectileProbe::Play(const std::string& asset,bool music){if(music)hb::Audio::PlayMusic(asset,.1f);else hb::Audio::Play(asset);}
void AuricProjectileProbe::Tick(float delta){
 elapsed+=delta;auto enemies=hb::Scene::GetActorsWithTag("ProjectileTarget");for(size_t i=0;i<enemies.size();i++)hb::Scene::SetPosition(enemies[i],hb::Vec3{3.f+float(i/6)*.7f,-2.5f+float(i%6)+std::sin(elapsed+float(i))*.15f,0});if(elapsed<20.f)return;elapsed=0;hb::Projectiles::Clear();hb::Projectiles::OnHit("OnProjectileHit");
 hb::Projectiles::Fire(hb::Json{{"mode","circle"},{"count",1000},{"origin",{0,0,0.1}},{"speed",.02},{"lifetime",30},{"size",.08},{"radius",.02},{"targetTags",{"ProjectileTarget"}},{"color",{1,.8,.2,1}}});Active=1000;
}
void AuricProjectileProbe::HitBatch(const std::string& text){auto hits=hb::Json::parse(text);Hits+=int(hits.size());Active-=int(hits.size());}
`;
  await write('Source/TopDownShooter.h',header);await write('Source/TopDownShooter.cpp',source);
  // Both directors share one native module; the original Auric game rules still tick.
  const native=nativeSourceReference({...parseNativeHeader(header),header,source,headerPath:'Source/TopDownShooter.h',sourcePath:'Source/TopDownShooter.cpp'});
  const bp=createAsset('blueprint','BP_ProjectileProbe');bp.settings.parentClass='AuricProjectileProbe';bp.native=native;bp.components=[];bp.nodes=[];bp.edges=[];
  const tick={...makeNode('tick'),id:'tick'},call={...makeNode('nativeCall'),id:'step',nativeId:'AuricProjectileProbe.Tick'},hit={...makeNode('customEvent'),id:'hit',options:{eventName:'OnProjectileHit'},customOutputs:[{id:'hits',label:'Hits JSON',type:'string',array:false}]},handle={...makeNode('nativeCall'),id:'handle',nativeId:'AuricProjectileProbe.HitBatch'};
  const begin={...makeNode('beginPlay'),id:'begin'},init={...makeNode('nativeCall'),id:'init',nativeId:'AuricProjectileProbe.Begin'};bp.nodes.push(begin,init,tick,call,hit,handle);bp.edges.push({from:{node:'begin',pin:'then'},to:{node:'init',pin:'exec'}});bp.edges.push({from:{node:'tick',pin:'then'},to:{node:'step',pin:'exec'}},{from:{node:'tick',pin:'delta'},to:{node:'step',pin:'delta'}},{from:{node:'hit',pin:'then'},to:{node:'handle',pin:'exec'}},{from:{node:'hit',pin:'hits'},to:{node:'handle',pin:'hits'}});
  await write('Assets/Blueprints/BP_ProjectileProbe.hbblueprint.json',bp);
  const scene=JSON.parse(await read('Assets/Scenes/Test_Alea.hbscene.json'));scene.sceneName='Auric 1000 projectiles';
  const actor=(id,position)=>({id,name:id,kind:'empty',group:'PROBE',visible:true,position,rotation:[0,0,0],scale:[1,1,1]});
  scene.objects.push({...actor('projectile-director',[0,0,0]),blueprintAsset:'Assets/Blueprints/BP_ProjectileProbe.hbblueprint.json'});
  await write('Assets/Sprites/S_ProbeSkeleton.hbsprite.json',{version:1,name:'S_ProbeSkeleton',texture:'Assets/Sprites/Skeleton_Idle.png',normalTexture:'',pixelsPerUnit:32,rect:[0,0,0,0],pivot:[.5,.5],filter:'nearest',border:[0,0,0,0]});
  for(let n=0;n<30;n++){const collider=makeSceneComponent('CircleCollider2D');collider.properties.radius=.25;scene.objects.push({...actor('projectile-target-'+n,[3+Math.floor(n/6)*.7,-2.5+(n%6),0]),tags:['ProjectileTarget'],components:[collider,makeSceneComponent('SpriteRenderer',{sprite:'Assets/Sprites/S_ProbeSkeleton.hbsprite.json',sortPoint:'feet'})]});}
  const stressScene='Assets/Scenes/Test_Projectiles.hbscene.json';await write(stressScene,scene);
  const summary=JSON.parse(await fs.readFile(path.join(directory,'fixture.json'),'utf8'));summary.projectileStress={scene:stressScene,count:1000,targets:30,sharedAuricCpp:true,collision:'swept'};await fs.writeFile(path.join(directory,'fixture.json'),JSON.stringify(summary,null,2));return summary.projectileStress;
}
