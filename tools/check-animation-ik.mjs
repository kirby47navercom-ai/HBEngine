import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createAnimationGraph,makeAnimationNode,validAnimationGraph} from '../prototype/animation-graph-assets.js';
import {AnimationGraphPlayer} from '../prototype/animation-graph-runtime.js';
import {engineOperations} from '../prototype/engine-services.js';
import {BlueprintRuntime} from '../prototype/blueprint-runtime.js';
const near=(a,b,message='')=>assert.ok(Math.abs(a-b)<.0001,`${message}: ${a} != ${b}`);
function fixture(type='twoBoneIK',count=3){const group=new THREE.Group(),bones=[];for(let i=0;i<count;i++){const b=new THREE.Bone();b.name='Bone'+i;if(i)b.position.x=1;(i?bones[i-1]:group).add(b);bones.push(b);}const data=createAnimationGraph('IK'),node=makeAnimationNode(type);node.properties.root='Bone0';node.properties.tip='Bone'+(count-1);node.inputs.pose=data.nodes[0].id;data.nodes.splice(1,0,node);data.nodes.at(-1).inputs.pose=node.id;const object={id:'Rig',name:'Rig',kind:'empty',position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],components:[]};return {group,bones,data,node,object};}
async function load(f){assert.ok(validAnimationGraph(f.data));return AnimationGraphPlayer.load(f.data,{object:f.object,group:f.group,objects:()=>f.objects||[f.object]});}
const point=bone=>bone.getWorldPosition(new THREE.Vector3());
for(const type of ['twoBoneIK','fabrik']){
 const f=fixture(type),player=await load(f),before=f.bones.map(b=>b.position.toArray());await player.tick(0);f.group.updateMatrixWorld(true);const p=point(f.bones.at(-1));near(p.x,1,type);near(p.y,1,type);near(p.z,0,type);near(point(f.bones[0]).distanceTo(point(f.bones[1])),1,'upper length');near(point(f.bones[1]).distanceTo(p),1,'lower length');assert.deepEqual(f.object.position,[0,0,0]);assert.deepEqual(f.bones.map(b=>b.position.toArray()),before,'IK without stretch keeps local lengths');assert.ok(f.object.gameplayDebug.animationGraph.ik[0].error<.0001);const rest=player.rest.map(p=>Array.from(p));for(let i=0;i<180;i++)await player.tick(1/60);assert.deepEqual(player.rest.map(p=>Array.from(p)),rest,'repeated IK cannot mutate reference pose');player.dispose();assert.equal(player.ik.size,0);
}
{
 const f=fixture();f.node.properties.alpha=0;const player=await load(f);await player.tick(0);near(point(f.bones.at(-1)).x,2,'zero weight pass-through');near(point(f.bones.at(-1)).y,0);player.dispose();
 for(const target of [[8,0,0],[0,0,0],[0,0,1],[0,-1,1]]){const f=fixture();f.node.properties.target=target;const player=await load(f);await player.tick(0);assert.ok(f.bones.every(b=>b.quaternion.toArray().every(Number.isFinite)));assert.ok(point(f.bones.at(-1)).length()<=2.0001);player.dispose();}
 const stretch=fixture();stretch.node.properties.allowStretch=true;stretch.node.properties.maxStretch=1.5;stretch.node.properties.target=[3,0,0];const player2=await load(stretch);await player2.tick(0);near(point(stretch.bones.at(-1)).x,3,'limited stretch');player2.dispose();
 const repeated=fixture();repeated.node.properties.allowStretch=true;repeated.node.properties.target=[12,0,0];for(let i=0;i<4;i++){const player=await load(repeated);await player.tick(0);near(point(repeated.bones.at(-1)).x,3,'replay cannot compound maximum stretch');player.dispose();}
}
{
 const f=fixture('fabrik',5);f.node.properties.target=[2,1,1];f.node.properties.iterations=64;const player=await load(f);await player.tick(0);assert.ok(point(f.bones.at(-1)).distanceTo(new THREE.Vector3(2,1,1))<.002);player.dispose();
 const f2=fixture('fabrik',5);f2.node.properties.target=[30,0,0];const p2=await load(f2);await p2.tick(0);near(point(f2.bones.at(-1)).x,4,'unreachable chain keeps lengths');p2.dispose();
}
{
 const f=fixture();f.object.position=[5,0,0];f.object.rotation=[0,0,90];f.object.scale=[2,2,2];f.node.properties.space='world';f.node.properties.target=[3,2,0];const player=await load(f);await player.tick(0);const p=point(f.bones.at(-1));near(p.x,1,'world target transformed to component');near(p.y,1);assert.deepEqual(f.object.position,[5,0,0]);player.dispose();
 const f2=fixture();f2.objects=[f2.object,{id:'Target',position:[1,1,0],rotation:[0,0,0],scale:[1,1,1]}];f2.node.properties.targetActor='Target';f2.node.properties.target=[0,0,0];const p2=await load(f2);await p2.tick(0);near(point(f2.bones.at(-1)).y,1);f2.objects[1].position=[1,-1,0];await p2.tick(0);near(point(f2.bones.at(-1)).y,-1,'moving target Actor');p2.dispose();
}
{
 const f=fixture();f.node.properties.rotationMode='target';f.node.properties.rotation=[0,0,90];const player=await load(f);await player.tick(0);const q=f.bones.at(-1).getWorldQuaternion(new THREE.Quaternion());near(new THREE.Euler().setFromQuaternion(q).z,Math.PI/2,'target rotation');player.dispose();
 const f2=fixture();f2.node.properties.maintainPositionOffset=true;const p2=await load(f2);await p2.tick(0);near(point(f2.bones.at(-1)).x,2,'initial target offset');near(point(f2.bones.at(-1)).y,0);p2.ikSolver(f2.node.id).override.target=[0,1,0];await p2.tick(0);near(point(f2.bones.at(-1)).x,1,'target change retains initial offset');near(point(f2.bones.at(-1)).y,0);p2.dispose();
}
{
 for(const change of [p=>p.iterations=0,p=>p.precision=0,p=>p.space='invalid',p=>p.target=[NaN,0,0]]){const f=fixture('fabrik');change(f.node.properties);assert.equal(validAnimationGraph(f.data),false);}
 for(const change of [f=>f.node.properties.tip='Missing',f=>f.bones[1].position.x=0,f=>f.bones[1].scale.set(1,2,1)]){const f=fixture();change(f);await assert.rejects(async()=>{const p=await load(f);try{await p.tick(0);}finally{p.dispose();}},/IK/);}
}
{
 for(const space of ['bone','parentBone']){const f=fixture();f.bones[0].position.set(2,0,0);f.node.properties.space=space;f.node.properties.spaceBone=space==='bone'?'Bone0':'Bone1';const player=await load(f);await player.tick(0);near(point(f.bones.at(-1)).x,3,space);near(point(f.bones.at(-1)).y,1);player.dispose();}
 for(const type of ['twoBoneIK','fabrik']){const f=fixture(type),clip=makeAnimationNode('clip');clip.properties.clip='Animated';const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,0,Math.PI/4));f.group.userData.animations=[new THREE.AnimationClip('Animated',1,[new THREE.QuaternionKeyframeTrack('Bone0.quaternion',[0,1],[...q.toArray(),...q.toArray()])])];f.node.inputs.pose=clip.id;f.data.nodes.push(clip);const player=await load(f);await player.tick(.5);assert.ok(point(f.bones.at(-1)).distanceTo(new THREE.Vector3(1,1,0))<.002,'IK follows an imported animated input pose');assert.equal(player.lines,undefined);player.dispose();}
 for(const target of [[1,0,0],[0,0,0],[-1,0,0]]){const f=fixture('fabrik');f.node.properties.target=target;f.node.properties.iterations=64;const player=await load(f);await player.tick(0);assert.ok(point(f.bones.at(-1)).distanceTo(new THREE.Vector3(...target))<.002,'straight chain must escape collinear singularity');player.dispose();}
 const f=fixture();f.node.properties.debug=true;const player=await load(f);await player.tick(0);const solver=player.ikSolver(f.node.id),lines=solver.lines,buffer=lines.geometry.attributes.position.array;await player.tick(.1);assert.equal(solver.lines,lines);assert.equal(solver.lines.geometry.attributes.position.array,buffer);assert.ok(buffer.every(Number.isFinite));player.dispose();assert.equal(lines.parent,null);
}
{
 const f=fixture();f.node.properties.alpha=0;f.node.properties.alphaBias=1;const player=await load(f);await player.tick(0);near(point(f.bones.at(-1)).y,1,'alpha bias');player.dispose();
 const rotations=[];for(const hint of [[0,0,1],[0,0,-1]]){const f=fixture();f.node.properties.hintWeight=0;f.node.properties.hint=hint;const player=await load(f);await player.tick(0);rotations.push(f.bones[0].quaternion.toArray());player.dispose();}assert.deepEqual(rotations[0],rotations[1],'zero hint weight is independent of the hint');
 for(const actorTarget of [false,true]){const f=fixture(),clip=makeAnimationNode('clip');clip.properties.clip='MoveRig';f.group.userData.animations=[new THREE.AnimationClip('MoveRig',1,[new THREE.VectorKeyframeTrack('.position',[0,1],[5,0,0,5,0,0])])];f.node.inputs.pose=clip.id;f.node.properties.space='world';f.node.properties.target=actorTarget?[1,1,0]:[6,1,0];if(actorTarget)f.node.properties.targetActor=f.object.id;f.data.nodes.push(clip);const player=await load(f);await player.tick(.25);near(f.object.position[0],5);near(player.ikSolver(f.node.id).debug.tip[0],1,'IK uses the same frame Actor input pose');near(player.ikSolver(f.node.id).debug.tip[1],1);player.dispose();}
}
{
 const f=fixture(),target={id:'Target',position:[1,1,0],rotation:[0,0,0],scale:[1,1,1],components:[]};f.objects=[f.object,target];const services=engineOperations({asset:async p=>p,readAsset:async()=>f.data,mesh:id=>id===f.object.id?f.group:null,update(){},headless:true}),vm=new BlueprintRuntime(f.objects,[],services);await vm.start();const op=(key,args={})=>services.operation(key,{target:f.object.id,node:f.node.id,...args},{self:f.object.id},vm);await op('animGraphPlay',{asset:'Graph'});await op('animGraphIKTargetActor',{effector:'Target'});await op('animGraphIKTarget',{value:[0,0,0]});await services.physics(0,vm);near((await op('animGraphIKTip')).return[1],1);near((await op('animGraphIKError')).return,0);
 target.poolActive=false;await services.physics(0,vm);assert.equal(f.object.gameplayDebug.animationGraph.ik[0].missingActor,'Target');near(point(f.bones.at(-1)).x,2,'inactive target passes original pose');target.poolActive=true;target.position[1]=-1;await services.physics(0,vm);near((await op('animGraphIKTip')).return[1],-1,'reactivated target resumes');await op('animGraphIKWeight',{value:0});await services.physics(0,vm);near(point(f.bones.at(-1)).x,2);await op('animGraphIKTargetActor',{effector:null});await op('animGraphIKTarget',{value:[1,1,0]});await op('animGraphIKWeight',{value:1});await services.physics(0,vm);near(point(f.bones.at(-1)).y,1);
 for(const [key,args] of [['animGraphIKWeight',{value:2}],['animGraphIKTarget',{value:[Infinity,0,0]}],['animGraphIKTargetActor',{effector:'Absent'}],['animGraphIKTip',{node:'Absent'}]])await assert.rejects(()=>op(key,args),/IK/);await op('animGraphStop');assert.equal(f.object.gameplayDebug.animationGraph,undefined);await vm.stop();services.dispose();
}
console.log('3D IK: Two Bone/FABRIK, convergence/lengths, zero weight/degeneracy/stretch, world/Actor targets, rotation/offset, reference isolation and invalid input PASS');
