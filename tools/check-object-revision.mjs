// docs/CHANGE_TRACKING_DESIGN.md stages 1-2: revisions never leak into saved/cloned data; verify mode reports static
// colliders that changed without an announced revision; trusted physics skips announced-unchanged colliders, and a
// sampled check catches an unannounced write, reports it and switches trust off (full checks again).
// node tools/check-object-revision.mjs
import assert from 'node:assert/strict';
globalThis.HB_VERIFY_REVISIONS=true;
const {touchComponents,touchTransform,objectRevision,revisionSnapshot,sameRevision,revisionMismatches,revisionConfig,revisionTrust}=await import('../prototype/object-revision.js');
const {createRigidPhysics}=await import('../prototype/physics-world.js');
const {createPlacedObject}=await import('../prototype/placement-catalog.js');
assert.equal(revisionConfig.verify,true);assert.equal(revisionTrust.physics,true);

// Revisions stay out of JSON, spreads and structured clones; a copy is "unknown".
const probe=createPlacedObject('sprite',{id:'probe',position:[0,0,0]});const before=JSON.stringify(probe);touchComponents(probe);touchTransform(probe);
assert.equal(JSON.stringify(probe),before);assert.equal(Object.keys(probe).length,Object.keys(JSON.parse(before)).length);
assert.equal(objectRevision({...probe}),null);assert.equal(objectRevision(structuredClone(probe)),null);
const snap=revisionSnapshot(probe);assert(sameRevision(snap,probe,'components')&&sameRevision(snap,probe,'transform'));touchComponents(probe);assert(!sameRevision(snap,probe,'components'));assert(sameRevision(snap,probe,'transform'));
assert(!sameRevision(revisionSnapshot({}),probe,'components'),'an unannounced object differs once it is announced');

const objects=[0,1,2,3,4,5].map(i=>createPlacedObject('sprite',{id:'sprite'+i,position:[i*3,0,0]}));
const physics=createRigidPhysics(objects,{staticCache:true,profile:true});await physics.ready();
const step=async n=>{for(let i=0;i<n;i++)await physics.advance(1/60);};
const box=o=>o.components.find(c=>c.type==='BoxCollider2D');
const overlap=(x,y)=>physics.query('physicsOverlapSphere',{center:[x,y,0],radius:.05,dimension:2,mask:-1,includeTriggers:true}).length;
try{
 // Verify mode: every static collider is fully checked.
 await step(3);assert.equal(revisionMismatches.length,0,'no writes, no reports');
 box(objects[0]).properties={...box(objects[0]).properties,size:[2,2,1]};await step(2);
 assert.deepEqual(revisionMismatches.map(m=>[m.kind,m.object,m.detail.components]),[['physicsStatic','sprite0',true]],'unannounced component write reported');
 box(objects[1]).properties={...box(objects[1]).properties,size:[3,1,1]};touchComponents(objects[1]);await step(2);
 assert.equal(revisionMismatches.length,1,'announced component write not reported');
 objects[2].position=[7,1,0];await step(2);
 assert.deepEqual(revisionMismatches.slice(1).map(m=>[m.object,m.detail.pose]),[['sprite2',true]],'unannounced move reported');
 objects[3].position=[11,2,0];touchTransform(objects[3]);await step(2);
 assert.equal(revisionMismatches.length,2,'announced move not reported');
 assert.equal(revisionTrust.physics,true,'verify mode keeps trust while collecting reports');

 // Trusted, no verify, sampling effectively off: announced writes apply, unannounced ones are skipped (stale).
 revisionConfig.verify=false;revisionConfig.sampleMask=(1<<30)-1;
 objects[4].position=[20,5,0];touchTransform(objects[4]);await step(2);
 assert.equal(overlap(20,5),1,'announced move applied');
 objects[5].position=[30,5,0];await step(2);
 assert.equal(overlap(30,5),0,'unannounced move skipped while trusted (this is why every writer must announce)');
 assert.equal(revisionMismatches.length,2);

 // Sampling on: the stale collider is found, reported, trust switches off and the collider is rebuilt.
 revisionConfig.sampleMask=0;await step(2);
 assert.deepEqual(revisionMismatches.slice(2).map(m=>[m.object,m.detail.pose]),[['sprite5',true]],'sampled check reports the unannounced move');
 assert.equal(revisionTrust.physics,false,'trust switched off');assert.equal(overlap(30,5),1,'stale collider rebuilt');
 objects[5].position=[32,5,0];await step(2);assert.equal(overlap(32,5),1,'untrusted: unannounced writes apply again');
}finally{physics.dispose?.();}
console.log(JSON.stringify({passed:true,mismatches:revisionMismatches.length,scope:'Revision isolation, physics verify mode, trusted skip, sampled fallback.'}));
