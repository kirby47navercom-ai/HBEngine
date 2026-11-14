// Stage 1 of docs/CHANGE_TRACKING_DESIGN.md: revisions never leak into saved/cloned data, and verify mode reports a
// static collider whose values changed without an announced revision (and stays quiet for announced writes).
// node tools/check-object-revision.mjs
import assert from 'node:assert/strict';
globalThis.HB_VERIFY_REVISIONS=true;
const {touchComponents,touchTransform,objectRevision,revisionSnapshot,sameRevision,revisionMismatches,revisionVerify,revisionTrust}=await import('../prototype/object-revision.js');
const {createRigidPhysics}=await import('../prototype/physics-world.js');
const {createPlacedObject}=await import('../prototype/placement-catalog.js');
assert.equal(revisionVerify,true);assert.deepEqual(revisionTrust,{components:false,transform:false},'stage 1 trusts nothing');

// Revisions stay out of JSON, spreads and structured clones; a copy is "unknown".
const probe=createPlacedObject('sprite',{id:'probe',position:[0,0,0]});const before=JSON.stringify(probe);touchComponents(probe);touchTransform(probe);
assert.equal(JSON.stringify(probe),before);assert.equal(Object.keys(probe).length,Object.keys(JSON.parse(before)).length);
assert.equal(objectRevision({...probe}),null);assert.equal(objectRevision(structuredClone(probe)),null);
const snap=revisionSnapshot(probe);assert(sameRevision(snap,probe,'components')&&sameRevision(snap,probe,'transform'));touchComponents(probe);assert(!sameRevision(snap,probe,'components'));assert(sameRevision(snap,probe,'transform'));
assert(!sameRevision(revisionSnapshot({}),probe,'components'),'an unannounced object differs once it is announced');

// Physics static colliders: unannounced writes are reported, announced ones are not.
const objects=[0,1,2,3].map(i=>createPlacedObject('sprite',{id:'sprite'+i,position:[i*3,0,0]}));
const physics=createRigidPhysics(objects,{staticCache:true,profile:true});await physics.ready();
const step=async n=>{for(let i=0;i<n;i++)await physics.advance(1/60);};
try{
 await step(3);assert.equal(revisionMismatches.length,0,'no writes, no reports');
 const box=o=>o.components.find(c=>c.type==='BoxCollider2D');
 box(objects[0]).properties={...box(objects[0]).properties,size:[2,2,1]};await step(2);
 assert.deepEqual(revisionMismatches.map(m=>[m.kind,m.object,m.detail.components]),[['physicsStatic','sprite0',true]],'unannounced component write reported');
 box(objects[1]).properties={...box(objects[1]).properties,size:[3,1,1]};touchComponents(objects[1]);await step(2);
 assert.equal(revisionMismatches.length,1,'announced component write not reported');
 objects[2].position=[7,1,0];await step(2);
 assert.deepEqual(revisionMismatches.slice(1).map(m=>[m.object,m.detail.pose]),[['sprite2',true]],'unannounced move reported');
 objects[3].position=[11,2,0];touchTransform(objects[3]);await step(2);
 assert.equal(revisionMismatches.length,2,'announced move not reported');
}finally{physics.dispose?.();}
console.log(JSON.stringify({passed:true,mismatches:revisionMismatches.length,scope:'Revision symbol isolation and physics static verify mode (stage 1, nothing trusted).'}));
