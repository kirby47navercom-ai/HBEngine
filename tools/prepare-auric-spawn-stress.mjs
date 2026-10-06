import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {makeNode} from '../prototype/blueprint-model.js';
import {parseNativeHeader} from '../prototype/native-model.js';
import {validAsset} from '../prototype/asset-documents.js';
import {validScene} from '../prototype/model.js';

export async function prepareAuricSpawnStress(directory){
  const game=path.join(directory,'AuricLoop'),read=async p=>fs.readFile(path.join(game,p),'utf8'),write=(p,data)=>fs.writeFile(path.join(game,p),typeof data==='string'?data:JSON.stringify(data,null,2)+'\n');
  const sourceScene='Assets/Scenes/Test_Alea.hbscene.json',scene=JSON.parse(await read(sourceScene));
  let header=await read('Source/TopDownShooter.h'),source=await read('Source/TopDownShooter.cpp');
  assert.ok(!header.includes('void Stress('),'탄막 검사 복사본은 한 번만 준비해요.');
  header=header.replace(/};\s*$/,` public:
 HB_PROPERTY(BlueprintReadOnly) int StressShots=0;
 HB_PROPERTY(BlueprintReadOnly) int StressBullets=0;
 HB_PROPERTY(BlueprintReadOnly) int StressPeak=0;
 HB_FUNCTION(BlueprintCallable) void Stress(float delta);
 float stressTime=0,stressShotAt=0,stressRingAt=0;int stressRing=0;bool stressUIReady=false;
 std::map<hb::Actor*,float> stressLifetime;
};\n`);
  source+=`
void TopDownShooter::Stress(float delta){
 if(!stressUIReady&&stressTime>.25f){stressUIReady=true;auto* player=hb::Gameplay::GetPlayerPawn();for(auto* name:{"LoadingBack","LoadingCoin","LoadingText","TitleBack","TitleScreen","TitleHint"})hb::UI::SetVisible(player,"HUD",name,false);}
 stressTime+=delta;std::vector<hb::Actor*> expired;
 for(auto& item:stressLifetime){item.second-=delta;if(item.second<=0)expired.push_back(item.first);}
 for(auto* actor:expired){hb::Scene::Destroy(actor);stressLifetime.erase(actor);}
 if(stressTime>=stressShotAt){stressShotAt+=.15f;hb::Transform t;t.position={0,-3,.2f};auto* actor=hb::Scene::Spawn("PF_Shot",t);hb::Physics::SetVelocity(actor,{0,4,0});stressLifetime[actor]=balance::playerShotLife;StressShots++;}
 if(stressTime>=stressRingAt){stressRingAt+=stressRing%2?3.5f:.5f;stressRing++;
  for(int i=0;i<12;i++){const float a=i*6.28318530718f/12;hb::Vec3 d{std::cos(a),std::sin(a),0};hb::Transform t;t.position=d*1.6f;t.position.z=.1f;auto* actor=hb::Scene::Spawn("PF_Bullet",t);hb::Physics::SetVelocity(actor,d*4);stressLifetime[actor]=3;StressBullets++;}}
 StressPeak=std::max(StressPeak,static_cast<int>(stressLifetime.size()));
}
`;
  await write('Source/TopDownShooter.h',header);await write('Source/TopDownShooter.cpp',source);const metadata=parseNativeHeader(header);
  for(const file of (await fs.readdir(path.join(game,'Assets/Blueprints'))).filter(n=>n.endsWith('.hbblueprint.json'))){const p='Assets/Blueprints/'+file,bp=JSON.parse(await read(p));if(bp.native?.headerPath==='Source/TopDownShooter.h'){bp.native={...bp.native,...metadata,header,source};assert.ok(validAsset('blueprint',bp));await write(p,bp);}}
  const bp=JSON.parse(await read('Assets/Blueprints/BP_Test_Alea.hbblueprint.json')),tick=makeNode('tick'),call=makeNode('nativeCall');call.nativeId='TopDownShooter.Stress';call.inputValues={target:'self',delta:1/60};bp.name='BP_SpawnStress';bp.nodes=[tick,call];bp.edges=[{from:{node:tick.id,pin:'then'},to:{node:call.id,pin:'exec'}},{from:{node:tick.id,pin:'delta'},to:{node:call.id,pin:'delta'}}];bp.variables=[];bp.construction={nodes:[],edges:[],comments:[]};bp.functions=[];bp.macros=[];assert.ok(validAsset('blueprint',bp));await write('Assets/Blueprints/BP_SpawnStress.hbblueprint.json',bp);
  scene.name='SpawnStress';scene.objects.find(o=>o.id==='Director').blueprintAsset='Assets/Blueprints/BP_SpawnStress.hbblueprint.json';scene.objects.find(o=>o.id==='Player').position=[0,-3,.1];scene.objects.find(o=>o.id==='Camera').position=[0,0,18];assert.ok(!scene.objects.some(o=>o.components?.some(c=>c.type==='PooledActor')));assert.ok(validScene(scene));const stressScene='Assets/Scenes/SpawnStress.hbscene.json';await write(stressScene,scene);
  const project=path.join(game,'AuricLoop.hbproject'),data=JSON.parse(await fs.readFile(project,'utf8'));data.startupScene=stressScene;await fs.writeFile(project,JSON.stringify(data,null,2)+'\n');
  const fixture=JSON.parse(await fs.readFile(path.join(directory,'fixture.json'),'utf8'));Object.assign(fixture,{project,stressScene,stress:{shotInterval:.15,shotLifetime:1.6,bulletsPerRing:12,ringIntervals:[.5,3.5],bulletLifetime:3,preplacedPoolActors:0}});await fs.writeFile(path.join(directory,'fixture.json'),JSON.stringify(fixture,null,2));return fixture;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)console.log(await prepareAuricSpawnStress(path.resolve(process.argv[2])));
