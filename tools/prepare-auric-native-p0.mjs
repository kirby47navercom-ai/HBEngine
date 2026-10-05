import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createAsset,validAsset} from '../prototype/asset-documents.js';
import {makeNode} from '../prototype/blueprint-model.js';
import {parseNativeHeader} from '../prototype/native-model.js';
import {validScene} from '../prototype/model.js';
import {createPlacedObject} from '../prototype/placement-catalog.js';
import {preparePlayWorld} from '../prototype/play-world.js';

const engine=path.resolve(import.meta.dirname,'..');
const statsHeader='\nHB_CLASS(Blueprintable) class AuricP0Stats:public hb::Actor{public:HB_PROPERTY(BlueprintReadWrite) float MaxHp=3;HB_PROPERTY(BlueprintReadWrite) int Ticks=0;HB_FUNCTION(BlueprintCallable) void Think(float delta);HB_FUNCTION(BlueprintCallable) float TakeDamage(float amount);};';
const probeHeader='\nHB_CLASS(Blueprintable) class AuricP0Probe:public hb::Actor{hb::Actor* previous=nullptr;public:HB_PROPERTY(BlueprintReadWrite) float Seen=0;HB_PROPERTY(BlueprintReadWrite) float ForeignSeen=0;HB_PROPERTY(BlueprintReadWrite) bool Same=false;HB_PROPERTY(BlueprintReadWrite) int Checks=0;HB_FUNCTION(BlueprintCallable) void Check(hb::Actor* same,hb::Actor* foreign);};';
const statsSource='\nvoid AuricP0Stats::Think(float){Ticks++;}float AuricP0Stats::TakeDamage(float amount){MaxHp-=amount;return MaxHp;}';
const probeSource='\nvoid AuricP0Probe::Check(hb::Actor* same,hb::Actor* foreign){auto* stats=dynamic_cast<AuricP0Stats*>(same);if(!stats)throw std::runtime_error("Auric P0: real class missing");if(!Checks){Seen=stats->MaxHp;if(Seen!=7.25f)throw std::runtime_error("Auric P0: BP defaults missing");stats->MaxHp=8.25f;ForeignSeen=hb::Native::GetFloat(foreign,"MaxHp");hb::Native::SetFloat(foreign,"MaxHp",8.25f);hb::Native::Call(foreign,"TakeDamage",{{"amount",.5f}});previous=same;}Same=previous==same;Checks++;}';

export async function prepareAuricNativeP0(snapshot){
 const source=path.resolve(snapshot),out=await fs.mkdtemp(path.join(engine,'native/build/auric-native-p0-')),game=path.join(out,'AuricLoop');
 await fs.cp(path.join(source,'AuricLoop'),game,{recursive:true,filter:from=>!['Saved','Builds','native'].includes(path.basename(from))});await fs.mkdir(path.join(out,'tools'));await fs.copyFile(path.join(source,'tools/check_demo.mjs'),path.join(out,'tools/check_demo.mjs'));
 const json=value=>JSON.stringify(value,null,2)+'\n',write=(name,value)=>fs.writeFile(path.join(game,name),typeof value==='string'?value:json(value)),read=async name=>fs.readFile(path.join(game,name),'utf8');
 const header=await read('Source/TopDownShooter.h')+statsHeader+probeHeader,implementation=await read('Source/TopDownShooter.cpp')+statsSource+probeSource,metadata=parseNativeHeader(header);
 await write('Source/TopDownShooter.h',header);await write('Source/TopDownShooter.cpp',implementation);
 // Keep every original gameplay graph/default intact; refresh only its saved
 // source/metadata so the disk and BP snapshots agree for the original demo gate.
 let refreshed=0;for(const name of await fs.readdir(path.join(game,'Assets/Blueprints'))){if(!name.endsWith('.hbblueprint.json'))continue;const file='Assets/Blueprints/'+name,bp=JSON.parse(await read(file));if(bp.native?.headerPath==='Source/TopDownShooter.h'){bp.native={...bp.native,...metadata,header,source:implementation};assert.ok(validAsset('blueprint',bp));await write(file,bp);refreshed++;}}
 const blueprint=(name,className,code,sourcePaths,nativeId,inputValues={})=>{const bp=createAsset('blueprint',name);bp.components=[];bp.variables=[];bp.settings.parentClass=className;bp.settings.nativeDefaults=className==='AuricP0Stats'?{[className+'.MaxHp']:7.25}:{};bp.native={...parseNativeHeader(code.header),...code,...sourcePaths};const tick=makeNode('tick'),call=makeNode('nativeCall');call.nativeId=nativeId;call.inputValues=inputValues;bp.nodes=[tick,call];bp.edges=[{from:{node:tick.id,pin:'then'},to:{node:call.id,pin:'exec'}}];if(nativeId.endsWith('.Think'))bp.edges.push({from:{node:tick.id,pin:'delta'},to:{node:call.id,pin:'delta'}});assert.ok(validAsset('blueprint',bp));return bp;};
 const statPath='Assets/Blueprints/BP_AuricP0Stats.hbblueprint.json',foreignPath='Assets/Blueprints/BP_AuricP0Foreign.hbblueprint.json',probePath='Assets/Blueprints/BP_AuricP0Probe.hbblueprint.json',code={header,source:implementation},paths={headerPath:'Source/TopDownShooter.h',sourcePath:'Source/TopDownShooter.cpp'};
 await write(statPath,blueprint('BP_AuricP0Stats','AuricP0Stats',code,paths,'AuricP0Stats.Think'));
 const foreignHeader='#include <HBEngine/Game.hpp>'+statsHeader;await write('Source/AuricP0Foreign.h',foreignHeader);await write('Source/AuricP0Foreign.cpp',statsSource);await write(foreignPath,blueprint('BP_AuricP0Foreign','AuricP0Stats',{header:foreignHeader,source:statsSource},{headerPath:'Source/AuricP0Foreign.h',sourcePath:'Source/AuricP0Foreign.cpp'},'AuricP0Stats.Think'));
 await write(probePath,blueprint('BP_AuricP0Probe','AuricP0Probe',code,paths,'AuricP0Probe.Check',{same:'P0_Same',foreign:'P0_Foreign'}));
 const room=JSON.parse(await read('Assets/Scenes/Dungeon_3.hbscene.json')),actors=Array.from({length:50},(_,i)=>({...createPlacedObject('empty',{id:'P0_Stats_'+i,position:[i,100,0]}),name:'P0 Stats '+i,visible:false})),baseline={...structuredClone(room),sceneName:'P0_NativeBaseline',objects:[...structuredClone(room.objects),...structuredClone(actors)]},stress=structuredClone(baseline);stress.sceneName='P0_Native50';for(const object of stress.objects.filter(o=>o.id.startsWith('P0_Stats_')))object.blueprintAsset=statPath;
 const check=structuredClone(room);check.sceneName='P0_NativeClasses';for(const [id,asset] of [['P0_Same',statPath],['P0_Foreign',foreignPath],['P0_Probe',probePath]])check.objects.push({...createPlacedObject('empty',{id,position:[0,100,0]}),visible:false,blueprintAsset:asset});
 for(const scene of [baseline,stress,check]){assert.ok(validScene(scene));await write('Assets/Scenes/'+scene.sceneName+'.hbscene.json',scene);}
 let builds=0;const prepared=await preparePlayWorld(structuredClone(check.objects),check.runtime,{readAsset:async file=>JSON.parse(await read(file)),readText:read,buildNative:async(header,source)=>({token:'fixture-'+(++builds),metadata:parseNativeHeader(header)})});
 assert.equal(prepared.builds.get(statPath),prepared.builds.get(probePath),'same Auric C++ source shares the module');assert.notEqual(prepared.builds.get(statPath).token,prepared.builds.get(foreignPath).token);for(const id of ['P0_Same','P0_Foreign'])assert.equal(prepared.objects.find(o=>o.id===id).nativeProperties.MaxHp,7.25);
 const digest=file=>fs.readFile(file).then(bytes=>createHash('sha256').update(bytes).digest('hex'));assert.equal(await digest(path.join(out,'tools/check_demo.mjs')),await digest(path.join(source,'tools/check_demo.mjs')));
 const proof={version:1,preparedOnly:true,verified:false,preparationValidated:true,snapshot:source,output:out,project:path.join(game,'AuricLoop.hbproject'),refreshedOriginalBlueprints:refreshed,originalRoomObjects:room.objects.length,comparisonRoomObjects:stress.objects.length,nativeTickInstances:50,scenes:{baseline:'Assets/Scenes/P0_NativeBaseline.hbscene.json',batch:'Assets/Scenes/P0_Native50.hbscene.json',classes:'Assets/Scenes/P0_NativeClasses.hbscene.json'},demoScriptSha256:await digest(path.join(out,'tools/check_demo.mjs'))};await fs.writeFile(path.join(out,'fixture.json'),json(proof));return proof;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){if(!process.argv[2])throw Error('격리된 Auric 기준선 폴더를 지정하세요.');console.log(JSON.stringify(await prepareAuricNativeP0(process.argv[2]),null,2));}
