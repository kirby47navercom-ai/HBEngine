import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {Matrix4,Scene,Mesh,PlaneGeometry,MeshPhysicalMaterial} from 'three';
import {collectGeometryGI} from '../prototype/geometry-gi.js';
import {rayTriangleNormal,rayTransformUsable} from '../prototype/ray-geometry-validity.js';
import {guideFrames,rayNormalPoseContract} from '../prototype/path-guide-frames.js';
import {raySurfaceHistoryContract} from '../prototype/path-surface-history.js';

const rows=[];
for(const scale of [1e-6,1,1e6])for(const mirror of [-1,1]){
 const matrix=new Matrix4().makeScale(mirror*scale,scale,scale);assert(rayTransformUsable(matrix));
 const normal=rayTriangleNormal([0,0,0],[mirror*scale,0,0],[scale,scale*1e-5,0]);assert(Math.max(...normal.map((v,i)=>Math.abs(v-[0,0,mirror][i])))<Number.EPSILON*2);
 const scene=new Scene(),geometry=new PlaneGeometry(),material=new MeshPhysicalMaterial(),mesh=new Mesh(geometry,material);mesh.scale.set(mirror*scale,scale,scale);scene.add(mesh);
 try{assert.equal(collectGeometryGI(scene,true,true).triangles.length,2);mesh.scale.y=0;assert.equal(collectGeometryGI(scene,true,true).triangles.length,0);}finally{geometry.dispose();material.dispose();}rows.push({scale,mirror});
}
for(const matrix of [new Matrix4().makeScale(0,1,1),new Matrix4().set(1,1,0,0,0,0,0,0,0,0,1,0,0,0,0,1)])assert(!rayTransformUsable(matrix));
assert.equal(rayTriangleNormal([0,0,0],[1,0,0],[2,0,0]),null);assert.equal(rayTriangleNormal([0,0,0],[0,0,0],[1,0,0]),null);assert.throws(()=>rayTriangleNormal([NaN,0,0],[1,0,0],[0,1,0]),/좌표/);
const normals=[[0,0,1],[.2,0,.98],[0,.2,.98]],triangle={sourceID:'owned-triangle',instanceID:'owned-instance',inverseWorld:new Matrix4().makeShear(1,0,0,0,0,0).scale({x:1,y:.001,z:1}).invert().elements,normals,rayMaterial:{programs:[]}},attributes=()=>new Float32Array(20),values=new Float32Array(8);values[6]=100;
const firstAttrs=attributes(),first=guideFrames([triangle],new Map(),200,firstAttrs,100,values,0);assert.equal(first.current.size,0);assert.equal(first.normals.size,1);assert.equal(firstAttrs[15],-1);assert.equal(firstAttrs[19],0);assert.equal(first.data.byteLength,48);
const nextAttrs=attributes(),next=guideFrames([triangle],first.current,200,nextAttrs,100,values,0,first.normals);assert.equal(nextAttrs[19],200);assert.equal(next.normalsChanged,false);for(let i=0;i<3;i++)assert.deepEqual([...next.data.subarray(i*4,i*4+3)],[...Float32Array.from(normals[i])]);
const changed=guideFrames([{...triangle,normals:[[0,1,0],...normals.slice(1)]}],first.current,200,attributes(),100,values,0,first.normals);assert.equal(changed.normalsChanged,true);
const identity=new Matrix4().elements,ordinary=guideFrames([{...triangle,inverseWorld:identity}],new Map([['owned-instance',identity]]),200,attributes(),100,values,0);assert.equal(ordinary.current.size,1);assert.equal(ordinary.normals.size,0);assert.equal(ordinary.data.byteLength,96);
const off=guideFrames([triangle],null,200,attributes(),100,values,0);assert.equal(off.data.byteLength,0);assert.equal(off.normals.size,0);
assert.equal(raySurfaceHistoryContract.normalPose,rayNormalPoseContract);assert(Object.isFrozen(rayNormalPoseContract));
const proof={passed:true,rows,singularAndDegenerateRejected:true,ordinaryPoseBytes:96,conditionedSnapshotBytes:48,snapshotCurrentChangedAndMissingPrevious:true,disabledBytes:0,immutableAIContract:true,newGPUResources:0,scope:'CPU collection relative validity and selective normal snapshot lifecycle; actual GL/WebGPU/HLSL normal/trace gates are separate.'};await fs.writeFile('native/build/ray-scale-652.json',JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
