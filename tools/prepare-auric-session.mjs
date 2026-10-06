import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {prepareAuricSpawn} from './prepare-auric-spawn.mjs';
import {parseNativeHeader} from '../prototype/native-model.js';

export async function prepareAuricSession(original){
  const fixture=await prepareAuricSpawn(original),game=path.join(fixture.out,'AuricLoop');
  const read=p=>fs.readFile(path.join(game,p),'utf8'),write=(p,v)=>fs.writeFile(path.join(game,p),typeof v==='string'?v:JSON.stringify(v,null,2)+'\n');
  let source=await read('Source/TopDownShooter.cpp');
  source=source.replace(/^constexpr int handoffSeconds=[^\n]*\n/m,'').replace(/^static std::string StatePath\(\)[^\n]*\n/m,'');
  source=source.replace(/  std::ofstream o\(StatePath\(\)\);[\s\S]*?  o\.close\(\);leaving=true;/,`  auto* game=hb::Game::GetInstance();if(!game)throw std::runtime_error("Auric GameInstance missing");
  hb::Json flags=hb::Json::array();for(int v:{FatigueMax,Fatigue,Hp,Kills,RoomClears,Swings,Hits,Shots,int(HasReturnItem),int(Returning),int(ReturnSuccess),Flashbangs,Gold,Ore,Herb,Monster,Bottle,WeaponLevel,Debt,LastRepaid,Enchant,Crafted,MaxHp,SofaLevel,HomeLevel,Phase,int(oreTaken),int(herbTaken),Character})flags.push_back(v);
  hb::Json rooms=hb::Json::array();for(int i=0;i<roomCount;i++)rooms.push_back(roomState[i]);
  game->state["handoff"]={{"position",{position.x,position.y}},{"facing",{facing.x,facing.y}},{"boss",int(BossHp*100)},{"flags",flags},{"rooms",rooms}};
  hb::Save::Write("Auric.progress",{{"debt",Debt},{"sofa",SofaLevel},{"home",HomeLevel}});
  leaving=true;`);
  source=source.replace(/  std::ifstream in\(StatePath\(\)\);[\s\S]*?  if\(!ok\|\|std::time\(nullptr\)-saved>balance::handoffSeconds\)return false;/,`  auto* game=hb::Game::GetInstance();if(!game)throw std::runtime_error("Auric GameInstance missing");
  if(!game->state.contains("handoff")){const auto progress=hb::Save::Read("Auric.progress");if(progress.is_object()){game->state["progress"]=progress;Debt=progress.value("debt",Debt);SofaLevel=progress.value("sofa",SofaLevel);HomeLevel=progress.value("home",HomeLevel);MaxHp+=SofaLevel;Hp=MaxHp;}return false;}
  const auto saved=game->state.at("handoff");game->state.erase("handoff");const float px=saved.at("position").at(0),py=saved.at("position").at(1),fx=saved.at("facing").at(0),fy=saved.at("facing").at(1);const int boss=saved.at("boss");int flags[29],rooms[roomCount];for(int i=0;i<29;i++)flags[i]=saved.at("flags").at(i);for(int i=0;i<roomCount;i++)rooms[i]=saved.at("rooms").at(i);`);
  source=source.replace('std::remove(StatePath().c_str());leaving=true;hb::Scene::Open(HubScene);','leaving=true;hb::Game::Reset();');
  source=source.replace('void TopDownShooter::Hud(hb::Actor* player){',`void TopDownShooter::Hud(hb::Actor* player){
  if(started&&Phase>=2){auto* game=hb::Game::GetInstance();const hb::Json progress={{"debt",Debt},{"sofa",SofaLevel},{"home",HomeLevel}};
    if(!game->state.contains("progress")||game->state["progress"]!=progress){hb::Save::Write("Auric.progress",progress);game->state["progress"]=progress;}}
`);
  source=source.replace('// 처음부터: 넘길 상태 파일을 지우고 거점 장면을 다시 열면 C++ 상태도 새로 시작한다','// F12는 실행 세션만 초기화하고 저장한 진행은 유지한다');
  source=source.replace('Character=pick;Debt=balance::debts[pick];','Character=pick;Debt=hb::Game::GetInstance()->state.value("progress",hb::Json::object()).value("debt",balance::debts[pick]);');
  if(/StatePath|handoffSeconds|ofstream|ifstream/.test(source))throw Error('임시 파일 우회가 남았어요.');
  await write('Source/TopDownShooter.cpp',source);
  const header=await read('Source/TopDownShooter.h'),native={...parseNativeHeader(header),header,source,headerPath:'Source/TopDownShooter.h',sourcePath:'Source/TopDownShooter.cpp'};
  for(const file of await fs.readdir(path.join(game,'Assets/Blueprints'))){if(!file.endsWith('.hbblueprint.json'))continue;const data=JSON.parse(await read('Assets/Blueprints/'+file));if(data.native?.headerPath==='Source/TopDownShooter.h'){data.native=structuredClone(native);await write('Assets/Blueprints/'+file,data);}}
  await write('Source/AuricSession.h',`#pragma once\n#include <HBEngine/Game.hpp>\nHB_CLASS(Blueprintable) class AuricSession : public hb::GameInstance {\npublic:\n HB_PROPERTY(BlueprintReadWrite) int InitCount = 0;\n void Init() override;\n};\n`);
  await write('Source/AuricSession.cpp',`#include "AuricSession.h"\nvoid AuricSession::Init(){InitCount++;state["sessionInitCount"]=InitCount;}\n`);
  const manifest=JSON.parse(await read('AuricLoop.hbproject'));manifest.gameInstance='Source/AuricSession.h#AuricSession';await write('AuricLoop.hbproject',manifest);
  const summary=JSON.parse(await fs.readFile(path.join(fixture.out,'fixture.json'),'utf8'));Object.assign(summary,{gameInstance:manifest.gameInstance,tempHandoffRemoved:true,progressSlot:'Auric.progress'});await fs.writeFile(path.join(fixture.out,'fixture.json'),JSON.stringify(summary,null,2));
  return {...fixture,project:path.join(game,'AuricLoop.hbproject')};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(await prepareAuricSession(process.argv[2]||'C:/Users/kirby/OneDrive/바탕 화면/git/Auric_Loop')));
