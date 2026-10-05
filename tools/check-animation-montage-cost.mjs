import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import * as THREE from 'three';
import {createAsset} from '../prototype/asset-documents.js';
import {makeAnimationNode,createAnimationGraph} from '../prototype/animation-graph-assets.js';
import {AnimationGraphPlayer} from '../prototype/animation-graph-runtime.js';
import {AnimationMontagePlayer} from '../prototype/animation-montage-runtime.js';

const group=new THREE.Group(),object={id:'Actor',position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],components:[]};
for(const name of ['Leg','Arm','Cape']){const bone=new THREE.Bone();bone.name=name;group.add(bone);}
group.userData.animations=['Walk','Attack','Cape'].map((name,i)=>new THREE.AnimationClip(name,2,[new THREE.VectorKeyframeTrack(['Leg','Arm','Cape'][i]+'.position',[0,2],[0,0,0,2,0,0])]));
const data=createAnimationGraph('Slots'),clip=makeAnimationNode('clip');clip.properties.clip='Walk';data.nodes=[clip,data.nodes[1]];let base=clip;
for(const [name,bone] of [['Upper','Arm'],['Cape','Cape']]){const slot=makeAnimationNode('slot'),layer=makeAnimationNode('layer');slot.properties.slot=name;slot.inputs.pose=clip.id;layer.inputs={base:base.id,overlay:slot.id};layer.properties.filters=[{bone,depth:0}];data.nodes.push(slot,layer);base=layer;}
data.nodes[1].inputs.pose=base.id;let overlay;const player=await AnimationGraphPlayer.load(data,{object,group,slotPose:(_group,slot)=>overlay?.slot(slot)});
const montage=createAsset('montage','Multi');montage.length=2;montage.clips=[['Upper','Attack'],['Cape','Cape']].map(([slot,clip],i)=>({id:'segment'+i,slot,clip,start:0,duration:2,sourceStart:0,rate:1}));const inserted=await AnimationMontagePlayer.load(montage,{object,group});player.adoptProgram(inserted.program);const buffers=[...player.poseBuffers].flat(),before=player.poseBytes;
async function measure(active){overlay=active?inserted:null;let frame=0;const tick=async()=>{if(active)inserted.sample((frame++/60)%2,1);await player.tick(1/60);};for(let i=0;i<100;i++)await tick();const samples=[];for(let round=0;round<5;round++){const start=performance.now();for(let i=0;i<1000;i++)await tick();samples.push((performance.now()-start)/1000);}return {samples,median:[...samples].sort((a,b)=>a-b)[2]};}
const inactive=await measure(false),active=await measure(true);assert.equal(player.poseBytes,before);assert.deepEqual([...player.poseBuffers].flat(),buffers);const report={contract:'1 actor, 3 native clips, 2 masked slots; graph tick/sample/apply CPU only; no VM/events/GPU/FPS/device claim',warmup:100,rounds:5,ticksPerRound:1000,inactive,active,graphPoseBytes:player.poseBytes,montagePoseBytes:inserted.program.poseBytes,bindings:player.slots.length,poseBuffersReused:true};player.dispose();inserted.dispose();const dir=await fs.mkdtemp(path.resolve('native/build/animation-montage-cost-'));await fs.writeFile(path.join(dir,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({dir,...report}));
