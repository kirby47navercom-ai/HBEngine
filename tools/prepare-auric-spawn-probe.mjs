import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createAsset} from '../prototype/asset-documents.js';
import {makeNode} from '../prototype/blueprint-model.js';
import {parseNativeHeader} from '../prototype/native-model.js';

export async function prepareAuricSpawnProbe(directory){
 const base=await fs.realpath(path.resolve(import.meta.dirname,'../native/build')),dir=await fs.realpath(directory);assert.ok(dir.startsWith(base+path.sep)&&path.basename(dir).startsWith('auric-spawn-'));
 const fixture=JSON.parse(await fs.readFile(path.join(dir,'fixture.json'),'utf8')),root=path.join(dir,'AuricLoop');
 if(fixture.nativeSpawnProbe?.scene)return fixture.nativeSpawnProbe;
 const header=`#include <HBEngine/Game.hpp>
HB_CLASS(Blueprintable) class AuricSpawnCell:public hb::Actor{public:
 HB_PROPERTY(BlueprintReadWrite) float Hp=7.25;
 HB_PROPERTY(BlueprintReadOnly) int BootCalls=0;
 HB_FUNCTION(BlueprintCallable) void Boot();
};
HB_CLASS(Blueprintable) class AuricSpawnProbe:public hb::Actor{public:
 HB_PROPERTY(BlueprintReadOnly) int Created=0;
 HB_PROPERTY(BlueprintReadOnly) int Constructed=0;
 HB_PROPERTY(BlueprintReadOnly) float LastHp=0;
 HB_PROPERTY(BlueprintReadOnly) bool TypeOk=false;
 HB_PROPERTY(BlueprintReadWrite, AssetType="blueprint") std::string Cell="Assets/Blueprints/BP_SpawnCell.hbblueprint.json";
 HB_FUNCTION(BlueprintCallable) void Burst(int count);
 HB_FUNCTION(BlueprintCallable) void Verify();
 HB_FUNCTION(BlueprintCallable) void Clear();
private: AuricSpawnCell* remembered=nullptr;std::vector<hb::Actor*> spawned;
};`;
 const source=`void AuricSpawnCell::Boot(){BootCalls++;}
void AuricSpawnProbe::Burst(int count){if(count<1||count>93)throw std::runtime_error("probe count 1..93");Clear();for(int i=0;i<count;i++){auto* actor=hb::Scene::Spawn(Cell,hb::Transform{{50.f,float(i),0.f},{0,0,0},{1,1,1}});spawned.push_back(actor);remembered=dynamic_cast<AuricSpawnCell*>(actor);if(!remembered)throw std::runtime_error("spawn type lost");remembered->Hp=7.25f+float(i);Created++;}}
void AuricSpawnProbe::Verify(){TypeOk=remembered&&dynamic_cast<AuricSpawnCell*>(remembered)==remembered;LastHp=remembered?remembered->Hp:-1;Constructed=0;for(auto* actor:spawned){auto* cell=dynamic_cast<AuricSpawnCell*>(actor);if(cell)Constructed+=cell->BootCalls;}}
void AuricSpawnProbe::Clear(){for(auto* actor:spawned)hb::Scene::Destroy(actor);spawned.clear();remembered=nullptr;Created=0;Constructed=0;TypeOk=false;LastHp=0;}`;
 await fs.writeFile(path.join(root,'Source/SpawnProbe.h'),header);await fs.writeFile(path.join(root,'Source/SpawnProbe.cpp'),source);
 const native={...parseNativeHeader(header),header,source,headerPath:'Source/SpawnProbe.h',sourcePath:'Source/SpawnProbe.cpp'};
 const cell=createAsset('blueprint','BP_SpawnCell');cell.native=native;cell.settings.parentClass='AuricSpawnCell';cell.settings.tickEnabled=false;cell.nodes=[];cell.edges=[];cell.components=[];
 const construction=makeNode('construction'),boot=makeNode('nativeCall');boot.nativeId='AuricSpawnCell.Boot';cell.construction={nodes:[construction,boot],edges:[{from:{node:construction.id,pin:'then'},to:{node:boot.id,pin:'exec'}}],comments:[]};
 const probe=createAsset('blueprint','BP_SpawnProbe');probe.native=native;probe.settings.parentClass='AuricSpawnProbe';probe.settings.tickEnabled=false;probe.nodes=[];probe.edges=[];probe.components=[];
 for(const [name,data] of [['BP_SpawnCell',cell],['BP_SpawnProbe',probe]])await fs.writeFile(path.join(root,'Assets/Blueprints/'+name+'.hbblueprint.json'),JSON.stringify(data,null,2));
 const sceneFile=path.join(root,fixture.projectileStress.scene),scene=JSON.parse(await fs.readFile(sceneFile,'utf8'));scene.objects=scene.objects.filter(o=>o.id!=='native-spawn-probe');await fs.writeFile(sceneFile,JSON.stringify(scene,null,2));scene.sceneName='Native Spawn Regression';scene.objects.push({id:'native-spawn-probe',name:'Native Spawn Probe',kind:'empty',visible:true,position:[50,0,0],rotation:[0,0,0],scale:[1,1,1],blueprintAsset:'Assets/Blueprints/BP_SpawnProbe.hbblueprint.json'});const probeScene='Assets/Scenes/Test_NativeSpawns.hbscene.json';await fs.writeFile(path.join(root,probeScene),JSON.stringify(scene,null,2));
 fixture.nativeSpawnProbe={owner:'native-spawn-probe',class:'AuricSpawnProbe',count:93,scene:probeScene};await fs.writeFile(path.join(dir,'fixture.json'),JSON.stringify(fixture,null,2));return fixture.nativeSpawnProbe;
}
if(process.argv[1]&&path.resolve(process.argv[1])===import.meta.filename)console.log(await prepareAuricSpawnProbe(path.resolve(process.argv[2])));
