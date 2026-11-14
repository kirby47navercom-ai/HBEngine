// Partial physics sync (docs/CHANGE_TRACKING_DESIGN.md) must give the same simulation as full syncs: one scripted
// scenario runs with revisionTrust.physics=false (full sync every step) and with trust on (partial syncs); every
// object's position/rotation and the contact list must be identical after every step.
// node tools/check-physics-partial-sync.mjs
import assert from 'node:assert/strict';
import {createRigidPhysics} from '../prototype/physics-world.js';
import {createPlacedObject} from '../prototype/placement-catalog.js';
import {makeSceneComponent} from '../prototype/scene-components.js';
import {touchComponents,touchTransform,revisionTrust,revisionConfig} from '../prototype/object-revision.js';

revisionConfig.verify=false;
function scene(){
 const objects=[];
 for(let i=0;i<300;i++)objects.push(createPlacedObject('sprite',{id:'static'+i,position:[(i%30)-15,-2-Math.floor(i/30),0]}));
 const ground=createPlacedObject('sprite',{id:'ground',position:[0,-1,0]});ground.scale=[40,1,1];objects.push(ground);
 for(let i=0;i<12;i++){const box=createPlacedObject('sprite',{id:'box'+i,position:[i*1.5-8,3+i%3,0]});box.components.push(makeSceneComponent('Rigidbody2D'));objects.push(box);}
 const pushed=createPlacedObject('sprite',{id:'pushed',position:[6,6,0]});pushed.components.push(makeSceneComponent('Rigidbody2D'),Object.assign(makeSceneComponent('ConstantForce2D'),{properties:{...makeSceneComponent('ConstantForce2D').properties,force:[3,0,0]}}));objects.push(pushed);
 const mover=createPlacedObject('sprite',{id:'mover',position:[-12,0,0]});mover.components.push(Object.assign(makeSceneComponent('Rigidbody2D'),{properties:{...makeSceneComponent('Rigidbody2D').properties,isKinematic:true}}));objects.push(mover);
 const parent=createPlacedObject('sprite',{id:'parent',position:[10,2,0]}),child=createPlacedObject('sprite',{id:'child',position:[1,0,0]});child.parentId='parent';objects.push(parent,child);
 return objects;
}
async function run(trusted){
 revisionTrust.physics=trusted;const objects=scene(),physics=createRigidPhysics(objects,{staticCache:true,partialSync:true,profile:true});await physics.ready();
 const frames=[],find=id=>objects.find(o=>o.id===id);
 try{
  for(let step=0;step<240;step++){
   if(step===20){const o=find('mover');o.position=[-11,0.5,0];touchTransform(o);}
   if(step===40){const c=find('static5').components.find(c=>c.type==='BoxCollider2D');c.properties={...c.properties,size:[3,3,1]};touchComponents(find('static5'));}
   if(step===60){const o=find('static7');o.poolActive=false;touchComponents(o);}
   if(step===80){const o=find('static7');o.poolActive=true;touchComponents(o);touchTransform(o);}
   if(step===100)objects.push(createPlacedObject('sprite',{id:'spawned',position:[2,4,0]}));
   if(step===120){const i=objects.findIndex(o=>o.id==='static9');objects.splice(i,1);}
   if(step===140){const o=find('parent');o.position=[9,3,0];touchTransform(o);}
   if(step===160){const o=find('ground');o.collisionEnabled=false;touchComponents(o);}
   if(step===200){const o=find('ground');o.collisionEnabled=true;touchComponents(o);}
   // Scripts may set a (possibly sleeping) body's velocity without announcing: bodies with physics properties are always synced.
   if(step===150||step===220){const o=find('box3');o.velocity=[step===150?-2:2,6,0];}
   await physics.advance(1/60);
   frames.push(JSON.stringify([objects.map(o=>[o.id,o.position,o.rotation]),physics.contacts?.()?.map?.(c=>[c.a,c.b,c.trigger,c.normal,c.position,c.penetration])??null]));
  }
  return {frames,timing:physics.timings()};
 }finally{physics.dispose?.();}
}
const full=await run(false),partial=await run(true);
for(let i=0;i<full.frames.length;i++)assert.equal(partial.frames[i],full.frames[i],'step '+i);
// Safety net: an unannounced static move is found by the rotating sample window, reported, and trust switches off.
{revisionTrust.physics=true;const {revisionMismatches}=await import('../prototype/object-revision.js'),before=revisionMismatches.length,objects=scene(),physics=createRigidPhysics(objects,{staticCache:true,partialSync:true});await physics.ready();
 try{for(let i=0;i<5;i++)await physics.advance(1/60);const o=objects.find(o=>o.id==='static200');o.position=[40,40,0];let steps=0;while(revisionTrust.physics&&steps<40){await physics.advance(1/60);steps++;}
  assert.equal(revisionTrust.physics,false,'sample window finds the unannounced move');assert.equal(revisionMismatches.at(-1).object,'static200');assert(revisionMismatches.length>before);
  await physics.advance(1/60);assert.equal(physics.query('physicsOverlapSphere',{center:[40,40,0],radius:.05,dimension:2,mask:-1,includeTriggers:true}).length,1,'moved collider applied after detection');
 }finally{physics.dispose?.();}}
revisionTrust.physics=true;
assert.equal(full.timing.partialSyncs??0,0,'untrusted run never syncs partially');assert(partial.timing.partialSyncs>partial.timing.syncCalls*.8,'trusted run mostly syncs partially: '+JSON.stringify(partial.timing));
console.log(JSON.stringify({passed:true,steps:full.frames.length,partialTiming:partial.timing,scope:'Same scripted 2D scenario with full syncs vs partial syncs: identical positions, rotations and contacts every step.'}));
