import assert from 'node:assert/strict';
import {createAsset} from '../prototype/asset-documents.js';
import {parseNativeHeader,nativeRequestWorld} from '../prototype/native-model.js';
import {preparePlayWorld} from '../prototype/play-world.js';

const header='#include <HBEngine/Game.hpp>\nHB_CLASS(Blueprintable) class WorldDirector : public hb::Actor { public: HB_FUNCTION(BlueprintCallable) void Update(hb::Actor* enemy); };\nHB_CLASS(Blueprintable) class EnemyStats : public hb::Actor { public: HB_PROPERTY(BlueprintReadWrite) float MaxHp=3; HB_FUNCTION(BlueprintCallable) void Think(float delta); };';
const source='void WorldDirector::Update(hb::Actor*){} void EnemyStats::Think(float){}',metadata=parseNativeHeader(header),assets=new Map(),texts=new Map([['Source/Game.h',header],['Source/Game.cpp',source]]);
function blueprint(name,parent,implementation=source){const bp=createAsset('blueprint',name);bp.settings.parentClass=parent;bp.native={...structuredClone(metadata),header,source:implementation,headerPath:'Source/Game.h',sourcePath:implementation===source?'Source/Game.cpp':'Source/Other.cpp'};assets.set('Assets/'+name+'.hbblueprint.json',bp);return bp;}
blueprint('BP_Director','WorldDirector');const enemy=blueprint('BP_Enemy','EnemyStats');enemy.settings.nativeDefaults={'EnemyStats.MaxHp':7.25};blueprint('BP_Other','EnemyStats',source+'\n');texts.set('Source/Other.cpp',source+'\n');
const objects=['Director','Enemy','Other'].map((id,i)=>({id,name:id,kind:'empty',visible:true,position:[i,2,0],rotation:[0,0,0],scale:[1,1,1],components:[],blueprintAsset:'Assets/BP_'+id+'.hbblueprint.json'}));
let count=0;const compiled=[];const options={readAsset:async path=>structuredClone(assets.get(path)),readText:async path=>texts.get(path),buildNative:async(header,source)=>{compiled.push({header,source});return {token:'worker-'+(++count),metadata:parseNativeHeader(header)};}};
const prepare=()=>preparePlayWorld(structuredClone(objects),{dimension:'2d',autoSpawnPlayer:false},options);
const first=await prepare(),director=first.builds.get(objects[0].blueprintAsset),shared=first.builds.get(objects[1].blueprintAsset),other=first.builds.get(objects[2].blueprintAsset);
assert.equal(count,2,'two BP assets with identical C++ compile and run once');assert.equal(director,shared);assert.notEqual(other.token,shared.token,'different source keeps its own module');
const paths=new Set([...first.builds].filter(([,build])=>build.token===director.token).map(([path])=>path));
const world=nativeRequestWorld(first.objects,paths,{},metadata);
assert.equal(world.find(o=>o.id==='Enemy').nativeClass,'EnemyStats');assert.equal(world.find(o=>o.id==='Enemy').nativeProperties.MaxHp,7.25,'same worker receives the real class and BP defaults');assert.equal(world.find(o=>o.id==='Other').nativeClass,undefined);
const next=await prepare();assert.equal(count,4);assert.notEqual(next.builds.get(objects[0].blueprintAsset).token,director.token,'new play world owns fresh C++ instances');
assert.deepEqual(objects.map(o=>o.position),[[0,2,0],[1,2,0],[2,2,0]],'scene source is preserved');
const changed=source+'\n// external edit';texts.set('Source/Game.cpp','\uFEFF'+changed.replaceAll('\n','\r\n'));
const refreshed=await prepare(),updated=refreshed.builds.get(objects[0].blueprintAsset);
assert.equal(count,6);assert.equal(updated,refreshed.builds.get(objects[1].blueprintAsset),'shared actors compile the updated Source once');assert.equal(updated.source,changed);assert.equal(compiled.at(-2).source,changed,'the compiler receives Source content with BOM/line endings normalized');
assert.equal(refreshed.bindings.find(b=>b.self==='Enemy').root.native.source,changed);assert.equal(refreshed.builds.get(objects[2].blueprintAsset).source,source+'\n','a different source file stays separate');
assert.notEqual(updated.token,director.token);assert.equal(director.source,source,'previous play owns its immutable source');assert.equal(assets.get(objects[0].blueprintAsset).native.source,source,'loading external Source never rewrites the stored BP');
console.log('Shared native world: shared compilation, class/default preservation, fresh ownership, authoritative external Source and BOM/line-ending normalization passed');
