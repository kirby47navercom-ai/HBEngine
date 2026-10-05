import assert from 'node:assert/strict';
import {createAsset} from '../prototype/asset-documents.js';
import {parseNativeHeader,nativeRequestWorld} from '../prototype/native-model.js';
import {preparePlayWorld} from '../prototype/play-world.js';

const header='#include <HBEngine/Game.hpp>\nHB_CLASS(Blueprintable) class WorldDirector : public hb::Actor { public: HB_FUNCTION(BlueprintCallable) void Update(hb::Actor* enemy); };\nHB_CLASS(Blueprintable) class EnemyStats : public hb::Actor { public: HB_PROPERTY(BlueprintReadWrite) float MaxHp=3; HB_FUNCTION(BlueprintCallable) void Think(float delta); };';
const source='void WorldDirector::Update(hb::Actor*){} void EnemyStats::Think(float){}',metadata=parseNativeHeader(header),assets=new Map(),texts=new Map([['Source/Game.h',header],['Source/Game.cpp',source]]);
function blueprint(name,parent,implementation=source){const bp=createAsset('blueprint',name);bp.settings.parentClass=parent;bp.native={...structuredClone(metadata),header,source:implementation,headerPath:'Source/Game.h',sourcePath:implementation===source?'Source/Game.cpp':'Source/Other.cpp'};assets.set('Assets/'+name+'.hbblueprint.json',bp);return bp;}
blueprint('BP_Director','WorldDirector');const enemy=blueprint('BP_Enemy','EnemyStats');enemy.settings.nativeDefaults={'EnemyStats.MaxHp':7.25};blueprint('BP_Other','EnemyStats',source+'\n');texts.set('Source/Other.cpp',source+'\n');
const objects=['Director','Enemy','Other'].map((id,i)=>({id,name:id,kind:'empty',visible:true,position:[i,2,0],rotation:[0,0,0],scale:[1,1,1],components:[],blueprintAsset:'Assets/BP_'+id+'.hbblueprint.json'}));
let count=0;const options={readAsset:async path=>structuredClone(assets.get(path)),readText:async path=>texts.get(path),buildNative:async()=>({token:'worker-'+(++count),metadata})};
const prepare=()=>preparePlayWorld(structuredClone(objects),{dimension:'2d',autoSpawnPlayer:false},options);
const first=await prepare(),director=first.builds.get(objects[0].blueprintAsset),shared=first.builds.get(objects[1].blueprintAsset),other=first.builds.get(objects[2].blueprintAsset);
assert.equal(count,2,'two BP assets with identical C++ compile and run once');assert.equal(director,shared);assert.notEqual(other.token,shared.token,'different source keeps its own module');
const paths=new Set([...first.builds].filter(([,build])=>build.token===director.token).map(([path])=>path));
const world=nativeRequestWorld(first.objects,paths,{},metadata);
assert.equal(world.find(o=>o.id==='Enemy').nativeClass,'EnemyStats');assert.equal(world.find(o=>o.id==='Enemy').nativeProperties.MaxHp,7.25,'same worker receives the real class and BP defaults');assert.equal(world.find(o=>o.id==='Other').nativeClass,undefined);
const next=await prepare();assert.equal(count,4);assert.notEqual(next.builds.get(objects[0].blueprintAsset).token,director.token,'new play world owns fresh C++ instances');
assert.deepEqual(objects.map(o=>o.position),[[0,2,0],[1,2,0],[2,2,0]],'scene source is preserved');
texts.set('Source/Game.cpp',source+'\nchanged');await assert.rejects(prepare(),/외부 C\+\+ 변경/,'dedup never hides stale asset code');
console.log('Shared native world: identical source tokens, class/default preservation, distinct builds, fresh play ownership and stale-source rejection passed');
