import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {rayCoordinateInstructions,rayVaryingCoordinateInstructions,rayDifferentialOperations} from '../prototype/ray-mip.js';
import {rayProgramGLSL} from '../prototype/ray-material-shader.js';

const op=(code,dest,args=[],size=4)=>[code,dest,size,size,...Array.from({length:4},(_,i)=>args[i]??-1),0,0,0];
const texture=(dest,source)=>[9,dest,4,4,source,-1,-1,-1,0,0,8];
const store=source=>[8,-1,4,4,source,-1,-1,-1,0,4,4];
const cases=[
 {name:'time-driven-position',rows:[op(3,0),op(2,1),op(10,2,[0,1]),texture(3,2),store(3)],varying:[2,0],zero:[1]},
 {name:'uniform-clock-chain',rows:[op(2,0),op(0,1),op(12,2,[0,1]),texture(3,2),store(3)],varying:[],zero:[0,1,2]},
 {name:'constant-overwrites-coordinate',rows:[op(3,0),texture(1,0),op(0,0),texture(2,0),op(10,3,[1,2]),store(3)],varying:[0],zero:[2]},
 {name:'sampled-coordinate',rows:[op(1,0),texture(1,0),op(2,0),op(10,2,[1,0]),texture(3,2),store(3)],varying:[0,3,1],zero:[2]},
 {name:'normal-and-view',rows:[op(4,0),op(5,1),op(10,2,[0,1]),texture(3,2),store(3)],varying:[2,0],zero:[1]}
];
const rows=[];
for(const c of cases){const before=rayCoordinateInstructions(c.rows),needed=rayVaryingCoordinateInstructions(c.rows);assert.deepEqual([...needed].sort((a,b)=>a-b),c.varying.sort((a,b)=>a-b),c.name);for(const n of c.zero)assert(!needed.has(n));assert([...needed].every(n=>before.has(n)));const p={key:7,fields:[3],instructions:c.rows},source=rayProgramGLSL([p]);assert(!source.includes('undefined'));assert.deepEqual(rayDifferentialOperations([p]),[...new Set(c.varying.map(n=>c.rows[n][0]))].sort((a,b)=>a-b));rows.push({name:c.name,before:before.size,after:needed.size,sourceBytes:source.length});}
const overwritten=rayProgramGLSL([{key:7,fields:[3],instructions:cases[2].rows}]);assert(overwritten.includes('aX=rX0'));assert(overwritten.includes('aX=vec4(0,0,0,0)'));
const proof={passed:true,rows,scope:'Version-aware spatial invariance only; committed Time/base evaluation and material IR remain unchanged. Register overwrites and nested sampled coordinates retain dependencies. Actual GPU pixels, shader preparation and packaged C++ execution are separate gates.'};
await fs.mkdir('native/build',{recursive:true});await fs.writeFile('native/build/ray-invariant-724.json',JSON.stringify(proof,null,2));console.log(JSON.stringify(proof));
