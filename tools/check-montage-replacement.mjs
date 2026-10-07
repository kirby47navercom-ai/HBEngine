import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createAsset} from '../prototype/asset-documents.js';
import {makeAnimationNode} from '../prototype/animation-graph-assets.js';
import {AnimationMontagePlayer} from '../prototype/animation-montage-runtime.js';
import {engineOperations} from '../prototype/engine-services.js';
import {BlueprintRuntime} from '../prototype/blueprint-runtime.js';
import {makeAnimationNotifyState} from '../prototype/animation-sync.js';

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`),assets={},events=[],created=[],group=new THREE.Group(),bones={};
const load=AnimationMontagePlayer.load;AnimationMontagePlayer.load=async(...args)=>{const player=await load.call(AnimationMontagePlayer,...args);created.push(player);return player;};
for(const name of ['Arm','Leg','Cape']){const bone=new THREE.Bone();bone.name=name;group.add(bone);bones[name]=bone;}
const absDot=(a,b)=>Math.abs(a.dot(b));
const q=angle=>new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),angle);
const track=(bone,x)=>new THREE.VectorKeyframeTrack(bone+'.position',[0,2],[x,0,0,x,0,0]);
const quat=angle=>new THREE.QuaternionKeyframeTrack('Arm.quaternion',[0,2],[...q(angle).toArray(),...q(angle).toArray()]);
group.userData.animations=[new THREE.AnimationClip('A',2,[track('Arm',6),track('Leg',10),quat(Math.PI/2)]),new THREE.AnimationClip('B',2,[track('Arm',14),quat(Math.PI)]),new THREE.AnimationClip('C',2,[track('Arm',22),quat(Math.PI)]),new THREE.AnimationClip('Cape',2,[track('Cape',12)])];
const actor={id:'Hero',kind:'empty',name:'Hero',position:[7,8,9],rotation:[0,0,0],scale:[1,1,1],visible:true,components:[]},bp=createAsset('blueprint','BP_Probe');bp.nodes=[];bp.edges=[];
const services=engineOperations({asset:async n=>assets[n]?n:null,readAsset:async n=>assets[n],mesh:()=>group,update(){}}),vm=new BlueprintRuntime([actor],[{self:actor.id,root:bp}],services);
let callback=async()=>{};vm.custom=async(_b,name,args,scope)=>{events.push({name,args:structuredClone(args),scope});if(name==='AttackBegin'){vm.jobs.push({scope,at:100});vm.core.timers.set(scope,{scope});}await callback(name,args);};
await vm.start();const op=(key,args={})=>services.operation(key,{target:actor.id,...args},vm.bindings[0],vm),tick=dt=>services.physics(dt,vm),debug=()=>actor.gameplayDebug;
const ended=name=>events.filter(e=>e.name==='OnMontageEnded'&&e.args.asset===name),reset=async()=>{callback=async()=>{};await op('montageStop');events.length=0;await tick(0);};
function montage(name,clip,options={}){const d=createAsset('montage',name);Object.assign(d,{length:2,blendIn:.4,blendOut:.4,blendCurve:'linear',autoBlendOut:false,...options});d.clips=[{id:'clip',clip,slot:'DefaultSlot',start:0,duration:2,sourceStart:0,rate:1}];return assets[name]=d;}
const graph=createAsset('animgraph','Graph'),slot=makeAnimationNode('slot');slot.inputs.pose=graph.nodes[0].id;graph.nodes.push(slot);graph.nodes[1].inputs.pose=slot.id;assets.Graph=graph;
montage('A','A',{blendIn:0});montage('B','B');montage('C','C');await op('animGraphPlay',{asset:'Graph'});
assets.A.notifyStates=[{...makeAnimationNotifyState('Attack',.1,1)}];assets.A.notifies=[{id:'late',time:.8,event:'NeverAfterReplacement'}];
await op('playMontage',{asset:'A'});await tick(.2);near(bones.Leg.position.x,10);near(bones.Arm.position.x,6);assert.equal(vm.scopes.size,1);
await op('montagePause',{paused:true});await op('playMontage',{asset:'B'});await tick(0);near(bones.Leg.position.x,10);near(bones.Arm.position.x,6);assert.equal(vm.scopes.size,0);assert.equal(vm.jobs.length,0);assert.equal(vm.core.timers.size,0);assert.equal(events.find(e=>e.name==='AttackEnd').args.reason,'replaced');
assert.equal(debug().montageTransitions.length,1);assert.equal(debug().montageTransitions[0].retiring,true);assert.notEqual(debug().montageTransitions[0].instance,debug().montage.instance);assert.equal(ended('A').length,0);
await tick(.2);near(bones.Leg.position.x,5);near(bones.Arm.position.x,10);near(absDot(bones.Arm.quaternion,q(Math.PI*.75)),1);near(debug().montageTransitions[0].time,.2);near(debug().montageTransitions[0].weight,.5);near(debug().montage.weight,.5);
await tick(.2);near(bones.Leg.position.x,0);near(bones.Arm.position.x,14);near(absDot(bones.Arm.quaternion,q(Math.PI)),1);assert.equal(debug().montageTransitions.length,0);assert.equal(ended('A').length,1);assert.equal(ended('A')[0].args.reason,'replaced');assert.equal(events.some(e=>e.name==='NeverAfterReplacement'),false);assert.deepEqual(actor.position,[7,8,9]);
await reset();

// Fast replacements keep each contribution until its own fade ends; buffers are reused.
await op('playMontage',{asset:'A'});await tick(.1);await op('playMontage',{asset:'B'});await tick(.1);near(bones.Arm.position.x,8);await op('playMontage',{asset:'C'});await tick(.1);assert.equal(debug().montageTransitions.length,2);near(bones.Arm.position.x,11.125);
const players=created.slice(-3),bytes=players.map(p=>p.program.poseBytes);for(let i=0;i<10;i++)await tick(.001);assert.deepEqual(players.map(p=>p.program.poseBytes),bytes,'steady fade allocates no new pose buffers');await tick(.5);assert.equal(debug().montageTransitions.length,0);assert.equal(ended('A').length,1);assert.equal(ended('B').length,1);assert.ok(players.slice(0,2).every(p=>p.program.poseBuffers.size===0),'retired programs release pose buffers');
await reset();

// Invalid replacement and preflight allocation failure cannot evict either live layer.
await op('playMontage',{asset:'A'});await tick(.1);await op('playMontage',{asset:'B'});await tick(.1);const live=debug().montage.instance,retired=debug().montageTransitions[0].instance;montage('Missing','A').clips[0].slot='Missing';await assert.rejects(op('playMontage',{asset:'Missing'}),/슬롯/);assert.equal(debug().montage.instance,live);assert.equal(debug().montageTransitions[0].instance,retired);
const prepare=AnimationMontagePlayer.prototype.prepareBlend;AnimationMontagePlayer.prototype.prepareBlend=function(players){if(this.data.name==='C')throw Error('replacement allocation failed');return prepare.call(this,players);};try{await assert.rejects(op('playMontage',{asset:'C'}),/allocation failed/);}finally{AnimationMontagePlayer.prototype.prepareBlend=prepare;}assert.equal(debug().montage.instance,live);assert.equal(debug().montageTransitions[0].instance,retired);
await reset();

// StopGroup captures all old/current instances, continues cleanup after callback errors.
await op('playMontage',{asset:'A'});await tick(.1);await op('playMontage',{asset:'B'});await tick(.1);callback=async(name,args)=>{if(name==='OnMontageInterrupted'&&args.asset==='A')throw Error('callback failure');};await assert.rejects(op('montageStopGroup',{group:'DefaultGroup'}),/callback failure/);assert.equal(debug().montage,null);assert.equal(debug().montageTransitions.length,0);assert.equal(ended('A').length,1);assert.equal(ended('B').length,1);
await reset();
await op('playMontage',{asset:'A'});await tick(.1);await op('playMontage',{asset:'B'});await tick(.1);callback=async(name,args)=>{if(name==='OnMontageEnded'&&args.asset==='A')await op('playMontage',{asset:'C'});};await op('montageStop');assert.equal(debug().montage.asset,'C','callback-created replacement survives the captured stop');assert.equal(ended('A').length,1);assert.equal(ended('B').length,1);await reset();

// Separate groups and slots remain independent, including a slot absent in the incoming clip.
const multi=createAsset('animgraph','Multi'),upper=makeAnimationNode('slot'),cape=makeAnimationNode('slot');Object.assign(upper.properties,{slot:'Upper'});upper.inputs.pose=multi.nodes[0].id;Object.assign(cape.properties,{slot:'Cape'});cape.inputs.pose=upper.id;multi.nodes.push(upper,cape);multi.nodes[1].inputs.pose=cape.id;assets.Multi=multi;
const ma=montage('MultiA','A',{blendIn:0});ma.clips[0].slot='Upper';ma.clips.push({id:'cape',clip:'Cape',slot:'Cape',start:0,duration:2,sourceStart:0,rate:1});montage('MultiB','B').clips[0].slot='Upper';await op('animGraphPlay',{asset:'Multi'});await op('playMontage',{asset:'MultiA'});await tick(.1);await op('playMontage',{asset:'MultiB'});await tick(.2);near(bones.Cape.position.x,6);near(bones.Leg.position.x,2.5);near(bones.Arm.position.x,5);assert.equal(debug().montageTransitions[0].slots.length,2);await tick(.2);near(bones.Cape.position.x,0);near(bones.Arm.position.x,14);await reset();

// A single full-body legacy montage needs no graph to use replacement blending.
await op('animGraphStop');for(const bone of Object.values(bones)){bone.position.set(0,0,0);bone.quaternion.identity();}await op('playMontage',{asset:'A'});await tick(.1);await op('playMontage',{asset:'B'});await tick(.2);near(bones.Leg.position.x,5);near(bones.Arm.position.x,10);await tick(.2);near(bones.Arm.position.x,14);await reset();

// 2D frames follow the existing highest-contribution policy during the same transition.
const spriteActor={id:'Sprite',kind:'empty',components:[],position:[-2,3,0],rotation:[0,0,0],scale:[1,1,1],currentSprite:'Idle'},spriteGroup=new THREE.Group(),spriteAssets={};
for(const [name,sprite] of [['Idle','I'],['Attack','A']]){const clip=createAsset('spriteanimation',name),path='Assets/'+name+'.hbspriteanimation.json';clip.frames=[{sprite,duration:2}];spriteAssets[path]=clip;const m=montage('Sprite'+name,path,{blendIn:name==='Idle'?0:.4});spriteAssets[m.name]=m;}
const spriteServices=engineOperations({asset:async n=>spriteAssets[n]?n:null,readAsset:async n=>spriteAssets[n],mesh:()=>spriteGroup,spriteFrame:async(o,image)=>{o.currentSprite=image;},update(){}}),spriteBP=createAsset('blueprint','SpriteBP');spriteBP.nodes=[];spriteBP.edges=[];
const spriteVM=new BlueprintRuntime([spriteActor],[{self:spriteActor.id,root:spriteBP}],spriteServices);await spriteVM.start();const sop=(key,args={})=>spriteServices.operation(key,{target:spriteActor.id,...args},spriteVM.bindings[0],spriteVM);
await sop('playMontage',{asset:'SpriteIdle'});await spriteServices.physics(.1,spriteVM);assert.equal(spriteActor.currentSprite,'I');await sop('playMontage',{asset:'SpriteAttack'});await spriteServices.physics(.1,spriteVM);assert.equal(spriteActor.currentSprite,'I');await spriteServices.physics(.2,spriteVM);assert.equal(spriteActor.currentSprite,'A');await spriteServices.physics(.1,spriteVM);assert.equal(spriteActor.gameplayDebug.montageTransitions.length,0);assert.deepEqual(spriteActor.position,[-2,3,0]);await spriteVM.stop();spriteServices.dispose();
await op('playMontage',{asset:'A'});await tick(.1);await op('playMontage',{asset:'B'});await tick(.1);const stoppingPlayers=created.slice(-2);assert.equal(debug().montageTransitions.length,1);await vm.stop();assert.equal(debug().montage,null);assert.equal(debug().montageTransitions.length,0);assert.ok(stoppingPlayers.every(p=>p.program.poseBuffers.size===0),'world stop releases both current and retired poses');services.dispose();AnimationMontagePlayer.load=load;console.log('Montage replacement: pose/quaternion/2D, paused frozen fade, notify scopes, rapid changes/buffer reuse, preflight preservation, multi-slot, stop/reentrancy and cleanup passed');
