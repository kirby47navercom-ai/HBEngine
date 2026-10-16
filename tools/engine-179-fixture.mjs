import fs from 'node:fs/promises';
import {deflateSync} from 'node:zlib';
import {engine178Fixture} from './engine-178-fixture.mjs';
import {createWorldAsset} from '../prototype/world-assets.js';
import {createAsset} from '../prototype/asset-documents.js';
import {makeSceneComponent as c} from '../prototype/scene-components.js';
import {parseNativeHeader} from '../prototype/native-model.js';
function pixel(color){
 const crc=bytes=>{let value=-1;for(const byte of bytes){value^=byte;for(let i=0;i<8;i++)value=value>>>1^(value&1?0xedb88320:0);}return(value^-1)>>>0;};
 const chunk=(name,bytes)=>{const type=Buffer.from(name),size=Buffer.alloc(4),sum=Buffer.alloc(4);size.writeUInt32BE(bytes.length);sum.writeUInt32BE(crc(Buffer.concat([type,bytes])));return Buffer.concat([size,type,bytes,sum]);};
 const header=Buffer.alloc(13);header.writeUInt32BE(1,0);header.writeUInt32BE(1,4);header[8]=8;header[9]=6;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(Buffer.from([0,...color]))),chunk('IEND',Buffer.alloc(0))]);
}
export async function engine179Fixture(dir){
 const fixture=await engine178Fixture(dir),{record,blueprint:bp,modelPath}=fixture;
 const graph=JSON.parse(await fs.readFile((await record.project.read('Assets/AG_Imported.hbanimgraph.json')).file));graph.name='LODVisual';graph.rootMotionMode='none';graph.nodes.find(n=>n.type==='clip').properties.rootMotion.enabled=false;await record.project.write('Assets/AG_LODVisual.hbanimgraph.json',JSON.stringify(graph));
 const near=createWorldAsset('mesh','LODNear'),far=structuredClone(near);far.name='LODFar';far.vertices=far.vertices.map(v=>[v[0],v[1]+10,v[2]]);
 await record.project.write('Assets/LODNear.hbmesh.json',JSON.stringify(near));await record.project.write('Assets/LODFar.hbmesh.json',JSON.stringify(far));
 await record.project.write('Assets/Distance.hblod.json',JSON.stringify({version:1,name:'Distance',mode:'distance',hysteresis:.1,forced:-1,collisionLevel:0,levels:[{asset:'Assets/LODNear.hbmesh.json',threshold:.001},{asset:'Assets/LODFar.hbmesh.json',threshold:20}]}));
 for(const [name,color]of [['Red',[255,80,60,255]],['Blue',[70,120,255,255]]]){
  await record.project.import('Assets',name+'.png',pixel(color));const sprite=createAsset('sprite',name);sprite.texture='Assets/'+name+'.png';sprite.pixelsPerUnit=1;sprite.rect=[0,0,1,1];await record.project.write('Assets/S_'+name+'.hbsprite.json',JSON.stringify(sprite));
 }
 const spriteAnimation=createAsset('spriteanimation','LOD2D');spriteAnimation.frames=[{sprite:'Assets/S_Red.hbsprite.json',duration:.13},{sprite:'Assets/S_Blue.hbsprite.json',duration:.17}];await record.project.write('Assets/SA_LOD2D.hbspriteanimation.json',JSON.stringify(spriteAnimation));
 const scene=JSON.parse(await fs.readFile((await record.project.read(record.manifest.startupScene)).file));
 const policy=()=>c('RuntimeLOD',{nearDistance:1,farDistance:2,farAnimationRate:5,forcedLevel:-1},'runtimeLOD');
 scene.objects.find(o=>o.id==='Imported').components.push(policy());
 scene.objects.push(
  {id:'LODVisual',name:'LOD Visual',kind:'model',asset:modelPath,position:[-1,0,0],rotation:[0,0,0],scale:[1,1,1],visible:true,components:[c('AnimationGraph',{asset:'Assets/AG_LODVisual.hbanimgraph.json'}),policy()]},
  {id:'LODSprite',name:'LOD 2D Sprite',kind:'sprite',position:[-3,-2,0],rotation:[0,0,0],scale:[1,1,1],visible:true,components:[c('SpriteRenderer',{sprite:'Assets/S_Red.hbsprite.json'}),c('Animator',{clip:'Assets/SA_LOD2D.hbspriteanimation.json'}),policy()]},
  {id:'LODCollision',name:'LOD Collision',kind:'cube',position:[20,0,0],rotation:[0,0,0],scale:[1,1,1],visible:true,components:[c('MeshRenderer',{mesh:'Assets/Distance.hblod.json'}),c('WorldCollision',{lodMode:'runtime'}),policy()]}
 );
 await record.project.write(record.manifest.startupScene,JSON.stringify(scene));
 const header=bp.native.header.replace('};','HB_FUNCTION(BlueprintCallable) void SetLOD(float level);HB_FUNCTION(BlueprintCallable) float LODRayHeight();};'),source=bp.native.source+'\nvoid AuthoringProbe::SetLOD(float level){for(const auto* id:{"LODVisual","LODSprite","LODCollision"})hb::Components::SetFloat(hb::Scene::FindActorById(id),"runtimeLOD","forcedLevel",level);}float AuthoringProbe::LODRayHeight(){for(const auto& hit:hb::Physics::RaycastAll({20,20,0},{20,-20,0}))if(hit.actor==hb::Scene::FindActorById("LODCollision"))return hit.position.y;return -999;}';
 bp.native={...parseNativeHeader(header),header,source,headerPath:bp.native.headerPath,sourcePath:bp.native.sourcePath};await record.project.write(record.manifest.startupBlueprint,JSON.stringify(bp));await record.project.write(bp.native.headerPath,header);await record.project.write(bp.native.sourcePath,source);
 return {...fixture,blueprint:bp};
}
