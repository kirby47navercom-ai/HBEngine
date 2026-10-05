import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createSpriteRig,makeRigBone,validSpriteRig,removeRigBone,splitRigBone} from '../prototype/sprite-rig-assets.js';
import {makeRigIKSolver,rigIKChain} from '../prototype/ik2d-assets.js';
import {SpriteRigPose} from '../prototype/sprite-rig-runtime.js';
const near=(a,b,label='IK')=>assert.ok(Math.abs(a-b)<.002,label+' '+a+' != '+b);
export function makeIKFixture(type='limb'){
  const d=createSpriteRig('SR_IK');d.bones.push({...makeRigBone('팔','root'),id:'arm',position:[1,0]},{...makeRigBone('손','arm'),id:'hand',position:[1,0],length:.2});
  d.solvers=[{...makeRigIKSolver(d,{root:'root',effector:'hand',type}),id:'ik_hand',target:[1,1]}];return d;
}
const endpoint=pose=>{pose.group.updateWorldMatrix(true,true);return pose.bone('hand').getWorldPosition(new THREE.Vector3()).applyMatrix4(pose.group.matrixWorld.clone().invert());};
for(const type of ['limb','ccd','fabrik']){
  const d=makeIKFixture(type);assert.equal(validSpriteRig(d),true);assert.deepEqual(rigIKChain(d,'root','hand'),['root','arm','hand']);const p=new SpriteRigPose(d);
  assert.equal(p.ik.update(),true);let end=endpoint(p);near(end.x,1,type);near(end.y,1,type);assert.equal(p.ik.snapshot().solvers[0].reached,true,type);
  const buffer=p.ik.solvers[0].points,positions=p.positions,revision=p.revision;assert.equal(p.ik.update(),false,'static target and pose skipped');assert.equal(p.revision,revision);assert.equal(p.positions,positions);assert.equal(p.ik.solvers[0].points,buffer);
  p.ik.set('ik_hand','target',[5,0]);p.ik.update();end=endpoint(p);near(end.x,2,type+' unreachable');near(end.y,0,type+' unreachable');assert.equal(p.ik.snapshot().solvers[0].reached,false);
  p.ik.set('ik_hand','target',[1,0]);p.ik.update();end=endpoint(p);near(end.x,1,type+' collinear inward');near(end.y,0,type+' collinear inward');
  p.reset();p.ik.set('ik_hand','target',[1,1]);p.ik.set('ik_hand','weight',.5);p.ik.update();assert.ok(endpoint(p).distanceTo(new THREE.Vector3(1,1,0))>.1,'partial weight retains part of rest pose');
  p.ik.set('ik_hand','weight',0);const before=p.get('arm');p.ik.update();assert.deepEqual(p.get('arm'),before);p.ik.set('ik_hand','weight',1);p.reset();assert.equal(p.ik.update({visible:false}),false);assert.equal(p.ik.update({visible:false,alwaysUpdate:true}),true);
  p.ik.set('ik_hand','enabled',false);p.reset();assert.equal(p.ik.update(),false);p.dispose();
}
const motionless=new SpriteRigPose(makeIKFixture('ccd'));motionless.ik.solvers[0].settings.velocity=0;const motionlessBefore=motionless.snapshot();assert.equal(motionless.ik.update(),false);assert.deepEqual(motionless.snapshot().bones,motionlessBefore.bones);motionless.dispose();assert.equal(motionless.ik.solvers.length,0);
const data=makeIKFixture(),pose=new SpriteRigPose(data),actor=new THREE.Group();actor.position.set(6,-2,0);actor.rotation.z=Math.PI/2;actor.scale.set(2,3,1);actor.add(pose.group);const target=new THREE.Group();target.position.set(3,0,0);pose.ik.bindTarget('ik_hand','target');pose.ik.update({targetObject:id=>id==='target'?target:null});near(pose.ik.solver('ik_hand').settings.target[0],1);near(pose.ik.solver('ik_hand').settings.target[1],1);
near(pose.ik.solver('ik_hand').settings.targetRotation,-90);pose.ik.bindTarget('ik_hand','');pose.ik.set('ik_hand','target',[1,1]);const limb=pose.ik.solver('ik_hand');limb.settings.flip=true;limb.version++;pose.ik.update();near(pose.get('root').rotation,90);near(pose.get('arm').rotation,-90);
pose.ik.set('ik_hand','targetRotation',15);assert.equal(pose.ik.solver('ik_hand').settings.targetRotation,15);limb.settings.constrainRotation=true;limb.settings.targetRotation=30;limb.version++;pose.ik.update();pose.group.updateWorldMatrix(true,true);const handMatrix=new THREE.Matrix4().multiplyMatrices(pose.group.matrixWorld.clone().invert(),pose.bone('hand').matrixWorld);near(Math.atan2(handMatrix.elements[1],handMatrix.elements[0])*180/Math.PI,30);
assert.throws(()=>pose.ik.set('ik_hand','weight',NaN),/가중치/);assert.throws(()=>pose.ik.set('ik_hand','target',[Infinity,0]),/목표/);assert.throws(()=>pose.ik.update({weight:2}),/가중치/);pose.ik.bindTarget('ik_hand','missing');assert.throws(()=>pose.ik.update(),/오브젝트/);pose.ik.bindTarget('ik_hand','');pose.bone('root').scale.set(2,1,1);assert.throws(()=>pose.ik.update(),/균일/);pose.dispose();
const topology=makeIKFixture(),topologyBefore=JSON.stringify(topology);assert.throws(()=>splitRigBone(topology,'arm'),/Limb/);assert.equal(JSON.stringify(topology),topologyBefore);
const bad=makeIKFixture();bad.solvers[0].effector='missing';assert.equal(validSpriteRig(bad),false);bad.solvers[0].effector='arm';assert.equal(validSpriteRig(bad),false);bad.solvers[0].effector='hand';bad.solvers.push(structuredClone(bad.solvers[0]));assert.equal(validSpriteRig(bad),false);const removed=makeIKFixture();removeRigBone(removed,'arm');assert.equal(removed.solvers.length,0);assert.equal(validSpriteRig(removed),true);
const many=makeIKFixture('ccd');many.bones=[];for(let i=0;i<24;i++)many.bones.push({...makeRigBone('Bone '+i,i?'b'+(i-1):''),id:'b'+i,position:i?[.1,0]:[0,0]});many.vertices.forEach(v=>v.weights=[{bone:'b0',weight:1}]);many.solvers=Array.from({length:32},(_,i)=>({...makeRigIKSolver(many,{name:'IK '+i,type:'ccd',root:'b0',effector:'b23'}),id:'ik_'+i,target:[.01,1],iterations:64,velocity:.01}));const bounded=new SpriteRigPose(many);bounded.ik.update();assert.ok(bounded.ik.solvers.some(s=>s.limited));assert.ok(bounded.ik.budget.left>=0);const waiting=bounded.ik.solvers.find(s=>s.limited),applied=waiting.iterations;bounded.ik.update();assert.ok(waiting.iterations>=applied,'limited solver retries as earlier solutions cache');bounded.dispose();
console.log('2D IK Limb/CCD/FABRIK, reach/limits/flip/rotation, weight, actor target, static cache, buffers, validation/removal: passed');
