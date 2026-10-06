import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createAsset,validAsset} from '../prototype/asset-documents.js';
import {parseNativeHeader} from '../prototype/native-model.js';
import {validScene} from '../prototype/model.js';

export async function prepareAuricSpawn(source){
  const engine=path.resolve(import.meta.dirname,'..'),out=await fs.mkdtemp(path.join(engine,'native/build/auric-spawn-')),game=path.join(out,'AuricLoop');
  await fs.cp(path.join(source,'AuricLoop'),game,{recursive:true,filter:p=>!['Builds','Saved','.git'].includes(path.basename(p))});await fs.mkdir(path.join(out,'tools'));await fs.copyFile(path.join(source,'tools/check_demo.mjs'),path.join(out,'tools/check_demo.mjs'));
  const read=async p=>fs.readFile(path.join(game,p),'utf8'),write=(p,data)=>fs.writeFile(path.join(game,p),typeof data==='string'?data:JSON.stringify(data,null,2)+'\n');
  const base=JSON.parse(await read('Assets/Scenes/Dungeon_0.hbscene.json')),prefabDir='Assets/Spawn';await fs.mkdir(path.join(game,prefabDir));
  const spec={Bullet:['Bullet0','Auric.EnemyBullet',128],Melee:['Enemy0','Auric.Enemy',32],Ranged:['Enemy6','Auric.Enemy',32],Shot:['Shot0','Auric.PlayerShot',64],Coin:['Coin0','Auric.Coin',32],Boss:['Boss','Auric.Boss',1],Slash:['SlashFX','Auric.Slash',1],Ore:['Ore','Auric.Ore',1],Herb:['Herb','Auric.Herb',1]};
  for(const [name,[id,tag,max]] of Object.entries(spec)){const source=structuredClone(base.objects.find(o=>o.id===id));assert.ok(source,name);source.id='root';source.name=name;source.tags=[tag,...(name==='Ranged'?['Auric.Ranged']:name==='Melee'?['Auric.Melee']:[])];source.components.find(c=>c.type==='PooledActor').properties.maxInactive=max;const prefab={version:1,name:'PF_'+name,root:'root',objects:[source]};assert.ok(validAsset('prefab',prefab));await write(prefabDir+'/PF_'+name+'.hbprefab.json',prefab);}
  for(let i=0;i<4;i++){const o=structuredClone(base.objects.find(o=>o.id==='Door'+i));o.id='root';o.tags=['Auric.Door'];o.components.find(c=>c.type==='PooledActor').properties.maxInactive=1;await write(prefabDir+'/PF_Door'+i+'.hbprefab.json',{version:1,name:'PF_Door'+i,root:'root',objects:[o]});}
  const scenes=await fs.readdir(path.join(game,'Assets/Scenes'));let removed=0;
  for(const file of scenes.filter(n=>n.endsWith('.hbscene.json'))){const scene=JSON.parse(await read('Assets/Scenes/'+file));removed+=scene.objects.filter(o=>o.components?.some(c=>c.type==='PooledActor')).length;scene.objects=scene.objects.filter(o=>!o.components?.some(c=>c.type==='PooledActor'));for(const o of scene.objects){if(o.id==='Camera')o.tags=[...o.tags||[],'MainCamera'];if(o.blueprintAsset==='Assets/Blueprints/BP_Hub.hbblueprint.json')o.blueprintAsset='Assets/Blueprints/BP_TopDownShooter.hbblueprint.json';}assert.ok(validScene(scene));await write('Assets/Scenes/'+file,scene);}
  let header=await read('Source/TopDownShooter.h'),sourceCpp=await read('Source/TopDownShooter.cpp');
  const helpers=`
static bool AuricActive(hb::Actor* actor){return actor&&hb::ActorPool::IsActive(actor);}
static hb::Actor* AuricFirst(const char* tag){auto list=hb::Scene::GetActorsWithTag(tag,true);return list.empty()?nullptr:list.front();}
static std::vector<hb::Actor*> AuricDoors(){std::vector<hb::Actor*> doors;for(int i=0;i<4;i++)if(auto* d=hb::Scene::FindActorById("Door"+std::to_string(i),true))doors.push_back(d);return doors;}
static std::vector<hb::Actor*> AuricItems(){auto* ore=AuricFirst("Auric.Ore");auto* herb=AuricFirst("Auric.Herb");if(!ore&&!herb)return {};std::vector<hb::Actor*> items{ore,herb};auto coins=hb::Scene::GetActorsWithTag("Auric.Coin",true);items.insert(items.end(),coins.begin(),coins.end());return items;}
static void AuricStatics(int area){hb::Transform t;t.position={0,-60,.2f};auto* slash=hb::Scene::Spawn("PF_Slash",t,"SlashFX");hb::Scene::Destroy(slash);if(area<0)return;
 const float cy[]={0,25,46,67,96};const float y=cy[area];const float north[]={12.5f,37.5f,54.5f,79.5f};
 for(int i=0;i<4;i++){t.position={0,north[i]-y,0};auto* door=hb::Scene::Spawn("PF_Door"+std::to_string(i),t,"Door"+std::to_string(i));hb::Scene::Destroy(door);}
 t.position={-3,47-y,.05f};auto* ore=hb::Scene::Spawn("PF_Ore",t,"Ore");t.position={3,47-y,.05f};auto* herb=hb::Scene::Spawn("PF_Herb",t,"Herb");if(area!=2){hb::Scene::Destroy(ore);hb::Scene::Destroy(herb);}
}
`;
  sourceCpp=sourceCpp.replace('int TopDownShooter::AreaAt',helpers+'\nint TopDownShooter::AreaAt');
  // Replace every mutating pool call with the public asset Spawn/Destroy API.
  const replacements=[['hb::ActorPool::Acquire(bullets,t)','hb::Scene::Spawn("PF_Bullet",t)'],['hb::ActorPool::Acquire(shots,t)','hb::Scene::Spawn("PF_Shot",t)'],['hb::ActorPool::Acquire(boss,t)','hb::Scene::Spawn("PF_Boss",t)'],['hb::ActorPool::Acquire(coins,t)','hb::Scene::Spawn("PF_Coin",t)'],['hb::ActorPool::Acquire(spawns[i].ranged?ranged:melee,t)','SpawnEnemy(spawns[i].ranged!=0,t)'],['hb::ActorPool::Acquire(s[2]?ranged:melee,t)','SpawnEnemy(s[2]!=0,t)'],['hb::ActorPool::Acquire(melee,t)','SpawnEnemy(false,t)'],['hb::ActorPool::Acquire(std::vector<hb::Actor*>{effects[0]},t)','hb::Scene::Spawn("PF_Slash",t,"SlashFX")'],['hb::ActorPool::Acquire(std::vector<hb::Actor*>{d},t)','hb::Scene::Spawn("PF_Door"+std::to_string(i),t,"Door"+std::to_string(i))'],['hb::ActorPool::Acquire(std::vector<hb::Actor*>{doors[at-1]},t)','hb::Scene::Spawn("PF_Door"+std::to_string(at-1),t,"Door"+std::to_string(at-1))']];
  for(const [from,to] of replacements){assert.ok(sourceCpp.includes(from),from);sourceCpp=sourceCpp.replaceAll(from,to);}sourceCpp=sourceCpp.replaceAll('hb::ActorPool::Release(', 'hb::Scene::Destroy(').replaceAll('hb::ActorPool::IsActive(', 'AuricActive(');sourceCpp=sourceCpp.replace('return actor&&AuricActive(actor);','return actor&&hb::ActorPool::IsActive(actor);');
  sourceCpp=sourceCpp.replaceAll('const std::vector<hb::Actor*> melee(enemies.begin(),enemies.begin()+balance::rangedFrom),ranged(enemies.begin()+balance::rangedFrom,enemies.end());','').replaceAll('const std::vector<hb::Actor*> melee(enemies.begin(),enemies.begin()+balance::rangedFrom);','').replaceAll('const std::vector<hb::Actor*> coins(items.begin()+2,items.end());','');sourceCpp=sourceCpp.replace('if(r.kind==3&&!boss.empty())','if(r.kind==3)').replace('  if(items.size()<3){Gold+=value;return;}','').replace('    if((int)i<balance::rangedFrom){','    if(!hb::Tags::Has(e,"Auric.Ranged",true)){');
  sourceCpp+=`\nhb::Actor* TopDownShooter::SpawnEnemy(bool ranged,const hb::Transform& at){auto* enemy=hb::Scene::Spawn(ranged?"PF_Ranged":"PF_Melee",at);enemyHp[enemy]=balance::enemyHp;burn[enemy]=0;if(!shotTimer.count(enemy)){auto all=hb::Scene::GetActorsWithTag(ranged?"Auric.Ranged":"Auric.Melee",true);shotTimer[enemy]=1+.3f*((ranged?balance::rangedFrom:0)+static_cast<int>(all.size())-1);}return enemy;}\n`;
  header=header.replace(/};\s*$/, '  hb::Actor* SpawnEnemy(bool ranged,const hb::Transform& at);\n};\n');
  const signature=/void TopDownShooter::Update\(([^)]*)\)\{/;const match=sourceCpp.match(signature);assert.ok(match);let parameters=match[1];for(const name of ['bullets','enemies','effects','doors','boss','items','shots'])parameters=parameters.replace(new RegExp('\\b'+name+'\\b'), 'incoming_'+name);
  const refresh=`bullets=hb::Scene::GetActorsWithTag("Auric.EnemyBullet",true);enemies=hb::Scene::GetActorsWithTag("Auric.Enemy",true);effects={AuricFirst("Auric.Slash"),AuricFirst("MainCamera")};doors=AuricDoors();boss=hb::Scene::GetActorsWithTag("Auric.Boss",true);items=AuricItems();shots=hb::Scene::GetActorsWithTag("Auric.PlayerShot",true);`;
  sourceCpp=sourceCpp.replace(signature,`void TopDownShooter::Update(${parameters}){\n  std::vector<hb::Actor*> bullets,enemies,effects,doors,boss,items,shots;${refresh}`);
  sourceCpp=sourceCpp.replace('area=i;  // 이 장면이 맡은 구역:', 'area=i;AuricStatics(area);'+refresh+'  // 이 장면이 맡은 구역:');
  sourceCpp=sourceCpp.replace('  // 탄환 수명과 방 밖으로 나간 탄환 정리', '  '+refresh+'\n  // 탄환 수명과 방 밖으로 나간 탄환 정리');
  sourceCpp=sourceCpp.replace('UpdateShots(player,delta,shots,enemies,doors,items);','shots=hb::Scene::GetActorsWithTag("Auric.PlayerShot",true);items=AuricItems();UpdateShots(player,delta,shots,enemies,doors,items);');
  assert.ok(!sourceCpp.includes('hb::ActorPool::Acquire(')&&!sourceCpp.includes('hb::ActorPool::Release('));
  await write('Source/TopDownShooter.h',header);await write('Source/TopDownShooter.cpp',sourceCpp);const metadata=parseNativeHeader(header);
  for(const file of (await fs.readdir(path.join(game,'Assets/Blueprints'))).filter(n=>n.endsWith('.hbblueprint.json'))){if(file==='BP_Hub.hbblueprint.json'){await fs.unlink(path.join(game,'Assets/Blueprints',file));continue;}const bp=JSON.parse(await read('Assets/Blueprints/'+file));if(bp.native?.headerPath!=='Source/TopDownShooter.h')continue;bp.native={...bp.native,...metadata,header,source:sourceCpp};const ids=new Set(bp.nodes.filter(n=>n.key==='getVariable').map(n=>n.id));bp.nodes=bp.nodes.filter(n=>!ids.has(n.id));bp.edges=bp.edges.filter(e=>!ids.has(e.from.node)&&!ids.has(e.to.node));bp.variables=[];assert.ok(validAsset('blueprint',bp));await write('Assets/Blueprints/'+file,bp);}
  await fs.writeFile(path.join(out,'fixture.json'),JSON.stringify({original:path.resolve(source),removedAuthoredPoolActors:removed,prefabCount:13,sameHubAndDungeonBlueprint:true,mutatingPoolCalls:0},null,2));return {out,game,removed};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){console.log(await prepareAuricSpawn(path.resolve(process.argv[2])));}
