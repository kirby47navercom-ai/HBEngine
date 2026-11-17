// Layer collision matrix: a box on layer 3 lands on a layer-0 floor normally, and falls through when the project
// matrix turns 0<->3 off, even though both colliders' own masks allow everything.
import assert from 'node:assert/strict';
import {createRigidPhysics} from '../prototype/physics-world.js';
import {makeSceneComponent} from '../prototype/scene-components.js';

const run=async matrix=>{
  const box={id:'box',name:'Box',kind:'empty',position:[0,2,0],rotation:[0,0,0],scale:[1,1,1],visible:true,components:[makeSceneComponent('Transform'),makeSceneComponent('Rigidbody'),makeSceneComponent('BoxCollider',{layer:3,extent:[.5,.5,.5]})]};
  const floor={id:'floor',name:'Floor',kind:'empty',position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],visible:true,components:[makeSceneComponent('Transform'),makeSceneComponent('BoxCollider',{layer:0,extent:[10,.2,10]})]};
  const physics=createRigidPhysics([box,floor],{gravity:[0,-9.81,0],...(matrix?{collisionMatrix:matrix}:{})});await physics.ready();
  try{for(let i=0;i<120;i++)physics.step(1/60);return box.position[1];}finally{physics.dispose?.();}
};
const all=Array(32).fill(4294967295),blocked=all.map((m,i)=>i===0?(m&~(1<<3))>>>0:i===3?(m&~1)>>>0:m);
const landed=await run(all),fell=await run(blocked);
assert.ok(landed>.3,'box rests on the floor ('+landed+')');assert.ok(fell< -1,'box falls through when the matrix blocks 0<->3 ('+fell+')');
assert.ok(await run(null)>.3,'no matrix: masks only');
console.log(JSON.stringify({passed:true,landed:+landed.toFixed(2),fell:+fell.toFixed(2)}));
