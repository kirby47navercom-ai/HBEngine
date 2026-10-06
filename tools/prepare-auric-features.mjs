import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {prepareAuricSession} from './prepare-auric-session.mjs';
import {nativeInitializer} from '../prototype/native-initializer.js';
import {parseNativeHeader,nativeSourceReference} from '../prototype/native-model.js';

// All migrations are made in the private fixture; the original game/checker stay intact.
export async function prepareAuricFeatures(original){
  const fixture=await prepareAuricSession(original),game=path.join(fixture.out,'AuricLoop');
  const read=async file=>(await fs.readFile(path.join(game,file),'utf8')).replaceAll('\r\n','\n'),write=async(file,value)=>{await fs.mkdir(path.dirname(path.join(game,file)),{recursive:true});await fs.writeFile(path.join(game,file),typeof value==='string'?value:JSON.stringify(value,null,2)+'\n');};
  let header=await read('Source/TopDownShooter.h'),source=await read('Source/TopDownShooter.cpp');
  header=header.replace(/  bool Muted\(\) const\{[^\n]*\}\n/,'').replace('if(!sound.empty()&&!Muted())OnPlaySfx(sound);','if(!sound.empty())hb::Audio::Play(sound);');
  source=source.replace('music!=currentMusic&&!Muted()','music!=currentMusic').replace('OnPlayMusic(music,currentMusic);','hb::Audio::PlayMusic(music,0.25f);');
  header=header.replace(/  HB_FUNCTION\([^\n]*\)\n  void OnPlay(?:Sfx|Music)\([^\n]*\);\n/g,'');
  source=source.replace(/^void TopDownShooter::OnPlay(?:Sfx|Music)\([^\n]*\)\{\}\n/gm,'');
  source=source.replace('  if(frame<2){hudDirty=true;return;}','').replace('if(frame>=2&&UpdateIntro(player,delta,pressed))','if(UpdateIntro(player,delta,pressed))');
  source=source.replace(/  for\(int i=0;i<3;\+\+i\)\{hb::UI::SetVisible\(player,"HUD",std::string\("AttackButton_"\)[\s\S]*?fatigueLevel=level;\n  \}/,`  hb::UI::SetTexture(player,"HUD","AttackButton",std::string("Assets/UI/Kit/")+(rot?"rot_attack_":"btn_attack_")+faces[Character]+".png");
  hb::UI::SetValue(player,"HUD","Fatigue",FatigueMax>0?float(Fatigue)/FatigueMax:1);
`);
  source=source.replace('    hb::UI::SetVisible(player,"HUD","CraftSelect"+std::to_string(i),craftOpen&&i==craftPick);','').replace('  hb::UI::SetText(player,"HUD","CraftName",names[craftPick]);',`  hb::UI::SetPosition(player,"HUD","CraftSelect",hb::Vec2{-428.f+116.f*((craftPick-1)%3),-130.f+116.f*((craftPick-1)/3)});
  hb::UI::SetVisible(player,"HUD","CraftSelect",craftOpen);
  hb::UI::SetText(player,"HUD","CraftName",names[craftPick]);`);
  source=source.replace('if(hb::Input::IsKeyDown("k"))touchMode=true;else if(hb::Input::IsKeyDown("LeftMouseButton"))touchMode=false;','touchMode=hb::Input::GetLastDevice()=="touch";').replaceAll('hb::Input::IsKeyDown("k")||','').replaceAll('||hb::Input::IsKeyDown("k")','');
  const widget=JSON.parse(await read('Assets/UI/W_TopDown.hbwidget.json')),fatigue=structuredClone(widget.nodes.find(n=>n.name==='Fatigue100')),attack=structuredClone(widget.nodes.find(n=>n.name==='AttackButton_valen')),craft=structuredClone(widget.nodes.find(n=>n.name==='CraftSelect1'));
  fatigue.id=fatigue.name='Fatigue';fatigue.type='ProgressBar';Object.assign(fatigue.properties,{min:0,max:1,value:0,fillDirection:'bottomToTop',fillTexture:fatigue.properties.texture,texture:'',background:'#00000000',accent:'#ffffff',visible:true});
  attack.id=attack.name='AttackButton';attack.properties.visible=true;craft.id=craft.name='CraftSelect';craft.properties.visible=false;
  widget.nodes=widget.nodes.filter(n=>!/^Fatigue\d{3}$|^(AttackButton|RotAttack)_|^CraftSelect\d$/.test(n.name));widget.nodes.push(fatigue,attack,craft);widget.nodes.find(n=>n.name==='AttackTouch').properties.inputKey='LeftMouseButton';await write('Assets/UI/W_TopDown.hbwidget.json',widget);

  header=header.replace('private:','private:\n  float normalMoveSpeed=-1.f;');
  source=source.replace('if(dodgeTime<=0&&(Weight()>balance::weightLimit||Fatigue*4>=FatigueMax*3))hb::Physics::SetVelocity(player,hb::Physics::GetVelocity(player)*balance::slowRate);','if(normalMoveSpeed<0)normalMoveSpeed=hb::Components::GetFloat(player,"TopDownMovement2D","speed");\n  hb::Movement2D::SetSpeed(player,normalMoveSpeed*((dodgeTime<=0&&(Weight()>balance::weightLimit||Fatigue*4>=FatigueMax*3))?balance::slowRate:1.f));');
  source=source.replace('bossStep=2;bossTimer=balance::bossChargeTime;','bossStep=2;bossTimer=balance::bossChargeTime;auto cameras=hb::Scene::GetActorsWithTag("MainCamera");if(!cameras.empty())hb::Camera::Shake(cameras[0],.12f,.3f);');
  source=source.replace('HasReturnItem=false;Returning=true;returnRoom=-1;Hud(player);','HasReturnItem=false;Returning=true;returnRoom=-1;auto cameras=hb::Scene::GetActorsWithTag("MainCamera");if(!cameras.empty())hb::Camera::SetOrthoSize(cameras[0],balance::cameraSize*1.08f);Hud(player);');
  const fields=[],assignments=[];source=source.replace(/namespace balance \{([\s\S]*?)\n\}/,(_,body)=>'namespace balance {'+body.replace(/constexpr (float|int) ([^;]+);/g,(_,type,declaration)=>{
    const pieces=declaration.match(/\w+(?:\[\d*\])?\s*=\s*(?:\{[^}]*\}|[^,]+)(?:,|$)/g);if(!pieces)throw Error('밸런스 선언 분석 실패');
    return pieces.map(piece=>{const match=/^(\w+)(\[[^\]]*\])?\s*=\s*(.*?)(?:,)?$/.exec(piece.trim());if(!match)throw Error('밸런스 값 분석 실패');const [,name,array,literal]=match,value=nativeInitializer(literal,'float',!!array);fields.push({name,type:array?'json':'float',value});assignments.push(array?`for(int i=0;i<${value.length};i++)balance::${name}[i]=data.at("${name}").at(i).get<${type}>();`:`balance::${name}=data.at("${name}").get<${type}>();`);return `${type} ${name}${array?'['+value.length+']':''}={};`;}).join('');
  })+'\n}');
  await write('Assets/Data/DA_Balance.hbdata.json',{version:1,name:'DA_Balance',fields});
  const spawns=/constexpr Spawn spawns\[\]=([^;]+);/.exec(source),rooms=/constexpr Room rooms\[\]=([^;]+);/.exec(source);if(!spawns||!rooms)throw Error('방 표 원문 없음');
  const spawnRows=nativeInitializer(spawns[1],'json',true),roomRows=nativeInitializer(rooms[1],'json',true),rows={};
  for(const [i,v] of roomRows.entries())rows['Room'+i]={kind:'room',cy:v[0],half:v[1],roomKind:v[2],first:v[3],count:v[4],x:0,y:0,ranged:0};
  for(const [i,v] of spawnRows.entries())rows['Spawn'+i]={kind:'spawn',cy:0,half:0,roomKind:0,first:0,count:0,x:v[0],y:v[1],ranged:v[2]};
  await write('Assets/Data/DT_Rooms.hbdata.json',{version:1,name:'DT_Rooms',columns:Object.keys(rows.Room0).map(name=>({name,type:name==='kind'?'string':'float'})),rows});
  source=source.replace(spawns[0],'std::vector<Spawn> spawns;').replace(rooms[0],'std::vector<Room> rooms;');
  const dialogueRows={};let dialogues=0;
  source=source.replace(/Say\(\{\{[\s\S]*?\}\}\)/g,call=>{
    const id='Dialogue'+dialogues++,lines=[],context=new Set();
    const entries=call.slice(5,-2).split(/\},\s*\{/);for(let entry of entries){entry=entry.replace(/^\{|\}$/g,'');const parts=/^([^,]+),([^,]+),([\s\S]+)$/.exec(entry);if(!parts)throw Error('대사 분석 실패');
      const who=parts[1].trim(),name=parts[2].trim();let text=parts[3].trim();if(text==='lines[pick]'){text='$introLine';dialogueRows.IntroCharacter={lines:[]};}else{const tokens=text.match(/"(?:\\.|[^"\\])*"|std::to_string\((\w+)\)/g)||[];if(tokens.join('+').replace(/\s/g,'')!==text.replace(/\s/g,''))throw Error('대사 표현식 분석 실패: '+text);text=tokens.map(token=>{const dynamic=/std::to_string\((\w+)\)/.exec(token);if(dynamic){context.add(dynamic[1]);return '{'+dynamic[1]+'}';}return JSON.parse(token);}).join('');}
      lines.push({who:who.startsWith('faces[')?'$character':JSON.parse(who),name:name.startsWith('koreanNames[')?'$character':JSON.parse(name),text});
    }dialogueRows[id]={lines};return `SayData("${id}",hb::Json{${[...context].map(name=>'{"'+name+'",'+name+'}').join(',')}})`;
  });
  // Preserve the authored character introduction strings rather than inventing new lines.
  const authoredIntro=/static const char\* lines\[\]=\{([^;]+)\};/.exec(source);if(dialogueRows.IntroCharacter&&!authoredIntro)throw Error('원본 캐릭터 대사 없음');if(dialogueRows.IntroCharacter&&authoredIntro)dialogueRows.IntroCharacter.lines=nativeInitializer('{'+authoredIntro[1]+'}','string',true);
  await write('Assets/Data/DT_Dialogue.hbdata.json',{version:1,name:'DT_Dialogue',columns:[{name:'lines',type:'json'}],rows:dialogueRows});
  header=header.replace('  void Say(const std::vector<Line>& lines);','  void Say(const std::vector<Line>& lines);\n  void SayData(const std::string& id,const hb::Json& context);\n  void LoadData();');
  source=source.replace('void TopDownShooter::Say(const std::vector<Line>& lines){',`void TopDownShooter::LoadData(){static std::string loaded;const auto session=hb::Game::GetSessionId();if(!loaded.empty()&&loaded==session)return;rooms.clear();spawns.clear();
  const auto data=hb::Data::Get("Assets/Data/DA_Balance.hbdata.json");${assignments.join('\n  ')}
  const auto table=hb::Data::Get("Assets/Data/DT_Rooms.hbdata.json");for(int i=0;i<5;i++){const auto& r=table.at("Room"+std::to_string(i));rooms.push_back({r.at("cy"),r.at("half"),r.at("roomKind"),r.at("first"),r.at("count")});}for(int i=0;i<7;i++){const auto& r=table.at("Spawn"+std::to_string(i));spawns.push_back({r.at("x"),r.at("y"),r.at("ranged")});}loaded=session;
}
void TopDownShooter::SayData(const std::string& id,const hb::Json& context){
  const auto row=hb::Data::GetTable("Assets/Data/DT_Dialogue.hbdata.json",id);std::vector<Line> result;
  for(const auto& line:row.at("lines")){std::string who=line.at("who"),name=line.at("name"),text=line.at("text");if(who=="$character")who=faces[Character];if(name=="$character")name=koreanNames[Character];if(text=="$introLine")text=hb::Data::GetTable("Assets/Data/DT_Dialogue.hbdata.json","IntroCharacter").at("lines").at(Character);
    for(auto it=context.begin();it!=context.end();++it){const std::string key="{"+it.key()+"}",value=it.value().is_string()?it.value().get<std::string>():it.value().dump();size_t pos=0;while((pos=text.find(key,pos))!=std::string::npos){text.replace(pos,key.size(),value);pos+=value.size();}}
    result.push_back({who,name,text});}Say(result);
}
void TopDownShooter::Say(const std::vector<Line>& lines){`);
  source=source.replace(/void TopDownShooter::Update\(([^)]*)\)\{/,(_,parameters)=>'void TopDownShooter::Update('+parameters+'){\n  LoadData();');if(!source.includes('  LoadData();'))throw Error('데이터 초기화 연결 실패');
  await write('Source/TopDownShooter.h',header);await write('Source/TopDownShooter.cpp',source);
  header=header.replace(/HB_PROPERTY\(([^)]*)\)(\s+std::string\s+\w+\s*=\s*"(Assets\/[^"]+)")/g,(whole,flags,declaration,asset)=>{if(flags.includes('AssetType')||asset.includes('#'))return whole;const kind=asset.endsWith('.hbsprite.json')?'sprite':asset.endsWith('.hbaudioasset.json')?'audioasset':asset.endsWith('.hbscene.json')?'scene':null;return kind?'HB_PROPERTY('+flags+', AssetType="'+kind+'")'+declaration:whole;});await write('Source/TopDownShooter.h',header);
  const metadata=parseNativeHeader(header);for(const file of await fs.readdir(path.join(game,'Assets/Blueprints'))){if(!file.endsWith('.hbblueprint.json'))continue;const asset='Assets/Blueprints/'+file,data=JSON.parse(await read(asset));if(data.native?.headerPath!=='Source/TopDownShooter.h')continue;data.native=nativeSourceReference({...metadata,header,source,headerPath:'Source/TopDownShooter.h',sourcePath:'Source/TopDownShooter.cpp'});const remove=new Set(data.nodes.filter(n=>n.key==='nativeEvent'&&/OnPlay(?:Sfx|Music)$/.test(n.nativeId||n.functionId||'')).map(n=>n.id));for(const node of data.nodes)if(remove.has(node.id))for(const edge of data.edges)if(edge.from.node===node.id)remove.add(edge.to.node);data.nodes=data.nodes.filter(n=>!remove.has(n.id));data.edges=data.edges.filter(e=>!remove.has(e.from.node)&&!remove.has(e.to.node));await write(asset,data);}
  for(const file of await fs.readdir(path.join(game,'Assets/Scenes'))){if(!file.endsWith('.hbscene.json'))continue;const asset='Assets/Scenes/'+file,data=JSON.parse(await read(asset));data.runtime.sortingLayers=[{id:'default',name:'Default',sortMode:'y'}];for(const object of data.objects)for(const component of object.components||[]){if(component.type==='Camera')Object.assign(component.properties,{pixelPerfect:true,pixelReferenceWidth:640,pixelReferenceHeight:360,pixelPixelsPerUnit:32});if(component.type==='SpriteRenderer')component.properties.sortPoint='feet';}await write(asset,data);}
  const baseSprite=(name,texture,rect)=>({version:1,name,texture,normalTexture:'',pixelsPerUnit:32,rect,pivot:[.5,.5],filter:'nearest',border:[0,0,0,0]});
  await write('Assets/Sprites/S_FloorTile.hbsprite.json',baseSprite('S_FloorTile','Assets/Sprites/Floor_Stone.png',[0,0,0,0]));await write('Assets/Sprites/S_WallTile.hbsprite.json',baseSprite('S_WallTile','Assets/Sprites/Wall_Stone.png',[0,0,258,32]));
  let tiledObjects=0;for(const folder of ['Assets/Scenes','Assets/Spawn'])for(const file of await fs.readdir(path.join(game,folder))){if(!/\.hb(?:scene|prefab)\.json$/.test(file))continue;const asset=folder+'/'+file,data=JSON.parse(await read(asset));for(const object of data.objects||[])for(const component of object.components||[]){if(component.type!=='SpriteRenderer')continue;const texture=component.properties.texture;if(/^Assets\/Sprites\/Room_(Floor|Wall)_/.test(texture)){component.properties.sprite=texture.includes('Room_Floor_')?'Assets/Sprites/S_FloorTile.hbsprite.json':'Assets/Sprites/S_WallTile.hbsprite.json';component.properties.texture='';component.properties.drawMode='tiled';component.properties.useCustomSize=true;component.properties.tileOrigin='topLeft';tiledObjects++;}}await write(asset,data);}
  const summary=JSON.parse(await fs.readFile(path.join(fixture.out,'fixture.json'),'utf8'));Object.assign(summary,{project:path.join(game,'AuricLoop.hbproject'),featureMigration:{audioCpp:true,muteRemoved:true,firstFrameHud:true,fatigueElements:1,craftSelectionElements:1,attackImageElements:1,balanceFields:fields.length,dataAssets:3,dialogueRows:Object.keys(dialogueRows).length,lastDevice:true,pixelPerfect:true,tiledObjects}});await fs.writeFile(path.join(fixture.out,'fixture.json'),JSON.stringify(summary,null,2));return fixture;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(await prepareAuricFeatures(process.argv[2]||'C:/Users/kirby/OneDrive/바탕 화면/git/Auric_Loop')));
