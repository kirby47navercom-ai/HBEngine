import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import * as T from 'three';
import {RuntimeLODPolicy,runtimeLODDefaults,runtimeLODBand} from '../prototype/runtime-lod.js';
import {WorldCollisionLODs} from '../prototype/world-collision-lod.js';
import {createWorldAsset} from '../prototype/world-assets.js';
import {componentDefaults,makeSceneComponent as c,validComponentProperties} from '../prototype/scene-components.js';
import {createRigidPhysics,validPhysicsSnapshot} from '../prototype/physics-world.js';
import {AnimationGraphPlayer} from '../prototype/animation-graph-runtime.js';
import {createAnimationGraph,makeAnimationNode} from '../prototype/animation-graph-assets.js';
import {makeAnimationNotify} from '../prototype/animation-sync.js';
import {retainTestEvidence} from './test-artifacts.mjs';
const work=await fs.mkdtemp(path.resolve('native/build/engine-179-'));retainTestEvidence(work);const checks=[],samples=[];
async function check(name,fn){try{await fn();checks.push({name,passed:true});}catch(error){checks.push({name,passed:false,error:error.stack});process.exitCode=1;}}
const actor=id=>({id,name:id,kind:'empty',position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],components:[]});
await check('typed component keeps valid distance order and explicit zero full-rate semantics',()=>{
 const p=componentDefaults('RuntimeLOD');assert.deepEqual(p,runtimeLODDefaults);assert.ok(validComponentProperties('RuntimeLOD',p));assert.equal(validComponentProperties('RuntimeLOD',{nearDistance:60,farDistance:20}),false);assert.equal(validComponentProperties('RuntimeLOD',{forcedLevel:3}),false);assert.ok(validComponentProperties('RuntimeLOD',{farAnimationRate:0}));
});
await check('distance hysteresis crosses every boundary correctly on teleports',()=>{
 const p=runtimeLODDefaults;assert.equal(runtimeLODBand(p,21,0),0);assert.equal(runtimeLODBand(p,23,0),1);assert.equal(runtimeLODBand(p,62,0),1);assert.equal(runtimeLODBand(p,67,0),2);assert.equal(runtimeLODBand(p,55,2),2);assert.equal(runtimeLODBand(p,53,2),1);assert.equal(runtimeLODBand(p,17,2),0);assert.equal(runtimeLODBand({...p,forcedLevel:2},0),2);
});
await check('30/60/120-Hz clocks give the same visual rate without dropping simulation time',()=>{
 for(const hz of [30,60,120]){const policy=new RuntimeLODPolicy(),o=actor('Sprite2D');let writes=0;for(let i=0;i<hz*4;i++)if(policy.sample(o,runtimeLODDefaults,[100,0,0],[0,0,0],1/hz).visual)writes++;assert.ok(writes>=19&&writes<=22,String(writes));samples.push({hz,seconds:4,poseWrites:writes});policy.release(o);assert.equal(policy.sample(o,runtimeLODDefaults,[100,0,0],[0,0,0],0).visual,true);}
});
await check('2D XY ignores camera depth, billboards and explicit XYZ/XZ keep their planes',()=>{const policy=new RuntimeLODPolicy(),sprite={...actor('Sprite'),kind:'sprite',components:[c('SpriteRenderer')]};assert.equal(policy.sample(sprite,runtimeLODDefaults,[1,0,0],[0,0,1000],.01).level,0);const model=actor('Model');assert.equal(policy.sample(model,runtimeLODDefaults,[1,0,0],[0,0,1000],.01).level,2);assert.equal(policy.sample(actor('XY'),{...runtimeLODDefaults,distanceMode:'xy'},[1,0,0],[0,0,1000],.01).level,0);assert.equal(policy.sample(actor('XZ'),{...runtimeLODDefaults,distanceMode:'xz'},[0,1000,1],[0,0,0],.01).level,0);sprite.components[0].properties.billboard=true;assert.equal(policy.sample(sprite,runtimeLODDefaults,[1,0,0],[0,0,1000],.01).level,2);});
await check('no-camera headless queries preserve mirrored collision band and always refresh pose',()=>{
 const policy=new RuntimeLODPolicy(),o=actor('Headless');o.gameplayDebug={runtimeLOD:{level:2}};const state=policy.sample(o,runtimeLODDefaults,[100,0,0],null,.01);assert.equal(state.level,2);assert.equal(state.rate,0);assert.equal(state.visual,true);assert.equal(state.reason,'no-camera');const forced=policy.sample(o,{...runtimeLODDefaults,forcedLevel:1},[100,0,0],null,.01);assert.equal(forced.level,1);assert.equal(forced.visual,true);
});
await check('skipped bone writes retain clock and notifies then apply the current pose',async()=>{
 const group=new T.Group(),bone=new T.Bone();bone.name='Bone';group.add(bone);group.userData.animations=[new T.AnimationClip('Move',1,[new T.VectorKeyframeTrack('Bone.position',[0,1],[0,0,0,1,0,0])])];const graph=createAnimationGraph('LOD'),clip=makeAnimationNode('clip');clip.properties.clip='Move';clip.properties.loop=false;const notify=makeAnimationNotify('Foot',.2);clip.properties.notifies=[notify];graph.nodes=[clip,graph.nodes.find(n=>n.type==='output')];graph.nodes[1].inputs.pose=clip.id;const player=await AnimationGraphPlayer.load(graph,{object:actor('BoneActor'),group,asset:async()=>null});try{await player.tick(.25,{visual:false});assert.equal(player.time,.25);assert.equal(bone.position.x,0);assert.ok(player.takeEvents().some(event=>event.name==='Foot'));await player.tick(.25,{visual:true});assert.ok(Math.abs(bone.position.x-.5)<1e-6);}finally{player.dispose();}
});
const mesh=createWorldAsset('mesh','Near'),far=structuredClone(mesh);far.name='Far';far.vertices=far.vertices.map(v=>[v[0],v[1]+10,v[2]]);const lod={version:1,name:'Distance',mode:'distance',hysteresis:.1,forced:-1,collisionLevel:0,levels:[{asset:'Assets/Near.hbmesh.json',threshold:.001},{asset:'Assets/Far.hbmesh.json',threshold:20}]},assets={'Assets/Near.hbmesh.json':mesh,'Assets/Far.hbmesh.json':far,'Assets/LOD.hblod.json':lod};
const worldActor=()=>({...actor('World'),components:[c('MeshRenderer',{mesh:'Assets/LOD.hblod.json'}),c('WorldCollision',{lodMode:'runtime'})],gameplayDebug:{runtimeLOD:{level:0}}});
await check('actual Rapier collision geometry changes independently of rendering',async()=>{
 const manager=new WorldCollisionLODs(async p=>assets[p]),o=worldActor();await manager.update(o,0);assert.ok(validPhysicsSnapshot([o]));const world=createRigidPhysics([o]);try{await world.ready();const query={start:[0,20,0],end:[0,-20,0],dimension:3,mask:-1,includeTriggers:false,ignore:null},near=world.query('physicsRaycast',query);assert.equal(near.actor,'World');await manager.update(o,2);world.synchronize();const far=world.query('physicsRaycast',query);assert.equal(far.actor,'World');assert.ok(Math.abs(far.position[1]-near.position[1]-10)<1e-4);assert.equal(o.gameplayDebug.runtimeLOD.collisionLevel,2);await manager.update(o,0);world.synchronize();assert.ok(Math.abs(world.query('physicsRaycast',query).position[1]-near.position[1])<1e-4);}finally{world.dispose();manager.dispose();}
});
await check('cache reuse and dynamic-body policy avoid unnecessary shape replacement',async()=>{
 let reads=0;const manager=new WorldCollisionLODs(async p=>{reads++;return assets[p];}),o=worldActor();o.components.push(c('Rigidbody',{bodyType:'dynamic'}));await manager.update(o,2);assert.equal(o.gameplayDebug.runtimeLOD.collisionReason,'dynamic-body');assert.equal(o.gameplayDebug.runtimeLOD.collisionLevel,'fixed');const previous=o.tileColliders,count=reads;assert.equal(await manager.update(o,0),false);assert.equal(reads,count);assert.equal(o.tileColliders,previous);o.components.find(c=>c.type==='Rigidbody').properties.bodyType='static';await manager.update(o,1);assert.equal(o.gameplayDebug.runtimeLOD.collisionLevel,1);manager.dispose();
});
await check('bounded cache eviction leaves already installed collision arrays usable',async()=>{const manager=new WorldCollisionLODs(async p=>assets[p],{cacheBytes:0}),o=worldActor();await manager.update(o,0);assert.equal(manager.stats().entries,0);assert.equal(manager.stats().estimatedBytes,0);assert.ok(o.tileColliders[0].properties.vertices.length>0);assert.ok(validPhysicsSnapshot([o]));await manager.update(o,1);assert.equal(manager.stats().entries,0);assert.ok(Math.max(...o.tileColliders[0].properties.vertices.map(v=>v[1]))>9);manager.dispose();});
await check('release/disposal cancels pending writes and removed component clears only world geometry',async()=>{
 let resolve;const gate=new Promise(r=>resolve=r),manager=new WorldCollisionLODs(async p=>{await gate;return assets[p];}),o=worldActor(),pending=manager.update(o,0);await Promise.resolve();manager.release(o);resolve();manager.dispose();assert.equal(await pending,false);assert.equal(o.tileColliders,undefined);
 const normal=new WorldCollisionLODs(async p=>assets[p]),other=worldActor();other.tileColliders=[{id:'other',type:'BoxCollider',properties:componentDefaults('BoxCollider')}];await normal.update(other,0);other.components=other.components.filter(c=>c.type!=='WorldCollision');await normal.update(other,0);assert.deepEqual(other.tileColliders.map(c=>c.id),['other']);normal.dispose();
});
const result={passed:checks.filter(c=>c.passed).length,total:checks.length,checks,samples};await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({work,...result}));
