import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as T from 'three';
import {probeVolumeFixture986} from './probe-volume-fixture-986.mjs';
import {reflectionProbeMeshBounds,reflectionProbeIntersectsBox} from '../prototype/reflection-probe-bounds.js';
import {selectReflectionProbes} from '../prototype/reflection-probes.js';

const cross=(a,b)=>new T.Vector3().crossVectors(a,b).normalize();
const cubeEdges=Array.from({length:8},(_,i)=>[0,1,2].filter(j=>!(i&(1<<j))).map(j=>[i,i|(1<<j)])).flat();
// Independent convex boundary oracle: containment, then clip each polyhedron's
// twelve segments against the other polyhedron's six world-space face planes.
function intersects(points,planes,box){
 const vertices=Array.from({length:8},(_,i)=>new T.Vector3(...[0,1,2].map(k=>i&(1<<k)?box.max.getComponent(k):box.min.getComponent(k))));
 const aabbPlanes=[0,1,2].flatMap(k=>[new T.Plane(new T.Vector3().setComponent(k,1),-box.max.getComponent(k)),new T.Plane(new T.Vector3().setComponent(k,-1),box.min.getComponent(k))]);
 const inside=(v,faces)=>faces.every(p=>p.distanceToPoint(v)<=1e-13);
 if(points.some(v=>inside(v,aabbPlanes))||vertices.some(v=>inside(v,planes)))return true;
 const segment=(a,b,faces)=>{let low=0,high=1;for(const p of faces){const start=p.distanceToPoint(a),slope=p.distanceToPoint(b)-start;if(slope===0){if(start>1e-13)return false;continue;}const t=-start/slope;if(slope>0)high=Math.min(high,t);else low=Math.max(low,t);if(low>high+1e-13)return false;}return true;};
 return cubeEdges.some(([a,b])=>segment(points[a],points[b],aabbPlanes)||segment(vertices[a],vertices[b],planes));
}
let seed=3409;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
let cases=0,originMisses=0,aabbFalsePositives=0;
for(const row of probeVolumeFixture986().rows.filter((r,i,a)=>i===0||a[i-1].index!==r.index)){
 const v=row.bounds,forward=new T.Matrix4().set(...[...v.localX,...v.localY,...v.localZ,0,0,0,1]).invert(),points=Array.from({length:8},(_,i)=>new T.Vector3(...[0,1,2].map(k=>i&(1<<k)?v.maximum[k]:v.minimum[k])).applyMatrix4(forward)),center=new T.Vector3(...v.worldCenter),worldBox=new T.Box3().setFromPoints(points),planes=[];
 for(let k=0;k<3;k++)for(const side of [0,1]){const at=side?1<<k:0,point=points[at],a=points[at^(1<<((k+1)%3))].clone().sub(point),b=points[at^(1<<((k+2)%3))].clone().sub(point),normal=cross(a,b);if(normal.dot(point.clone().sub(center))<0)normal.negate();planes.push(new T.Plane().setFromNormalAndCoplanarPoint(normal,point));}
 const probe={id:'probe',localBox:v,minimum:worldBox.min.toArray(),maximum:worldBox.max.toArray(),center:row.center,volume:v.volume,p:{importance:0,intensity:1,blendDistance:0,diffuseIntensity:0,boxProjection:true}},size=worldBox.getSize(new T.Vector3());
 for(let i=0;i<160;i++){const position=worldBox.min.toArray().map((n,k)=>n+size.getComponent(k)*(random()*1.8-.4)),extent=size.toArray().map(n=>n*(.01+random()*.35)),box=new T.Box3(new T.Vector3(...position.map((n,k)=>n-extent[k])),new T.Vector3(...position.map((n,k)=>n+extent[k]))),expected=intersects(points,planes,box),actual=reflectionProbeIntersectsBox(probe,box);assert.equal(actual,expected,JSON.stringify({index:row.index,position,extent,expected}));const selected=selectReflectionProbes([probe],position,box);assert.equal(selected.length,Number(expected));if(expected&&!selectReflectionProbes([probe],position).length)originMisses++;if(!expected&&worldBox.intersectsBox(box))aabbFalsePositives++;cases++;}
}
assert(originMisses>0&&aabbFalsePositives>0);
const geometry=new T.BoxGeometry(),mesh=new T.Mesh(geometry);let computations=0;const compute=geometry.computeBoundingBox.bind(geometry);geometry.computeBoundingBox=()=>{computations++;compute();};mesh.matrixWorld.makeScale(-2,3,4);const first=reflectionProbeMeshBounds(mesh).clone();for(let i=0;i<100;i++)assert(reflectionProbeMeshBounds(mesh).equals(first));assert.equal(computations,1);geometry.attributes.position.setX(0,4);geometry.attributes.position.needsUpdate=true;const changed=reflectionProbeMeshBounds(mesh);assert.equal(computations,2);assert(changed.min.x<first.min.x);mesh.matrixWorld.setPosition(4,2,1);reflectionProbeMeshBounds(mesh);assert.equal(computations,2);mesh.morphTargetInfluences=[.2];assert.equal(reflectionProbeMeshBounds(mesh),null);mesh.morphTargetInfluences=[0];mesh.isSkinnedMesh=true;assert.equal(reflectionProbeMeshBounds(mesh),null);delete mesh.isSkinnedMesh;mesh.isInstancedMesh=true;assert.equal(reflectionProbeMeshBounds(mesh),null);geometry.dispose();mesh.material.dispose();
const result={passed:true,cases,originMisses,aabbFalsePositives,unchangedFrames:100,boundRebuilds:computations,scope:'Independent world face/edge clipping versus affine-box/AABB SAT and original point-only selection. Static position/version bound caching, matrix-only reuse, active morph/skin/instance fallback. CPU selection only; renderer and actual SDK game checks separate.'};await fs.writeFile('native/build/probe-selection-1010.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
