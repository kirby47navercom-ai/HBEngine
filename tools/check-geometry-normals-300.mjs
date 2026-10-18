import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import * as T from 'three';
import {collectGeometryGI,packGeometryGI,GeometryGIWorld} from '../prototype/geometry-gi.js';
import {retainTestEvidence} from './test-artifacts.mjs';

const work=await fs.mkdtemp(path.resolve('native/build/geometry-normals-300-'));retainTestEvidence(work);
const baselineRevision='de69030',legacy=execFileSync('git',['show',baselineRevision+':prototype/geometry-gi.js'],{encoding:'utf8'}).replaceAll("from './","from '"+new URL('../prototype/',import.meta.url).href).replaceAll("from 'three'","from '"+import.meta.resolve('three')+"'"),old=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(legacy)),scene=new T.Scene(),material=new T.MeshPhysicalMaterial(),resources=[],rows=[];
const add=(g,mesh=new T.Mesh(g,material))=>{resources.push(g);scene.add(mesh);return mesh;};
const sphere=add(new T.SphereGeometry(1,48,24));sphere.scale.set(-1.3,.7,1.8);sphere.rotation.set(.2,.4,.1);
const instGeometry=new T.SphereGeometry(1,12,8),instances=add(instGeometry,new T.InstancedMesh(instGeometry,material,5));for(let i=0;i<5;i++)instances.setMatrixAt(i,new T.Matrix4().compose(new T.Vector3(i*3,1,-2),new T.Quaternion().setFromEuler(new T.Euler(i*.1,.2,.3)),new T.Vector3(i%2?-1:1,.7+i*.1,1.2)));
const missing=new T.PlaneGeometry(2,2,2,2);missing.deleteAttribute('normal');add(missing).position.x=-4;
const zero=add(new T.BoxGeometry());zero.geometry.attributes.normal.setXYZ(0,0,0,0);
const nonIndexedSource=new T.BoxGeometry();add(nonIndexedSource.toNonIndexed()).rotation.set(.3,.1,.2);nonIndexedSource.dispose();
const geometry=new T.PlaneGeometry(2,2,4,4),count=geometry.attributes.position.count,weights=[],indices=[];for(let i=0;i<count;i++){weights.push(.25,.75,0,0);indices.push(0,1,0,1);}geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));geometry.morphAttributes.position=[geometry.attributes.position.clone()];geometry.morphAttributes.normal=[geometry.attributes.normal.clone()];for(let i=0;i<count;i++){geometry.morphAttributes.normal[0].setXYZ(i,.3,.2,.9);geometry.morphAttributes.position[0].setZ(i,Math.sin(i)*.1);}const skin=add(geometry,new T.SkinnedMesh(geometry,material)),root=new T.Bone(),tip=new T.Bone();root.add(tip);tip.position.y=.5;skin.add(root);skin.bind(new T.Skeleton([root,tip]));skin.position.set(1,2,3);skin.scale.set(.8,1.3,.6);skin.morphTargetInfluences[0]=.4;
try{
 for(const phase of['initial','pose-and-morph','normal-edit','relative-morph','bind-and-instance']){
  if(phase==='pose-and-morph'){skin.morphTargetInfluences[0]=.8;tip.rotation.set(.4,.2,-.3);sphere.rotation.z+=.3;}
  if(phase==='normal-edit'){geometry.attributes.normal.setXYZ(3,.1,.2,.8);geometry.attributes.normal.needsUpdate=true;sphere.geometry.attributes.normal.setXYZ(7,0,0,0);sphere.geometry.attributes.normal.needsUpdate=true;}
  if(phase==='relative-morph'){geometry.morphTargetsRelative=true;skin.morphTargetInfluences[0]=.2;}
  if(phase==='bind-and-instance'){skin.bindMatrix.makeTranslation(.1,.2,-.1);skin.bindMatrixInverse.copy(skin.bindMatrix).invert();instances.setMatrixAt(2,new T.Matrix4().makeScale(2,-.4,.7));instances.instanceMatrix.needsUpdate=true;}
  scene.updateMatrixWorld(true);const outputs=[],measurements=[];
  for(const collect of[old.collectGeometryGI,collectGeometryGI]){
   let normalMatrices=0;const original=T.Matrix3.prototype.getNormalMatrix;T.Matrix3.prototype.getNormalMatrix=function(...args){normalMatrices++;return original.apply(this,args);};
   const start=performance.now();try{outputs.push(collect(scene,true,true));}finally{T.Matrix3.prototype.getNormalMatrix=original;measurements.push({normalMatrices,elapsedMS:performance.now()-start});}
  }
  const keys=['points','localPoints','normals','normal','center','color','emission','uv','surface','sourceID','inverseWorld'];assert.equal(outputs[0].triangles.length,outputs[1].triangles.length);for(let n=0;n<outputs[0].triangles.length;n++)for(const key of keys)assert.deepEqual(outputs[1].triangles[n][key],outputs[0].triangles[n][key],phase+' '+n+' '+key);
  const packets=outputs.map(o=>packGeometryGI(o.triangles,o.lights,true,null,null,true,null,false,true));assert.deepEqual(packets[1].data,packets[0].data,'complete atlas bytes');assert.ok(measurements[1].normalMatrices<measurements[0].normalMatrices/100);const t=outputs[1].triangles.find(t=>t.instanceID.startsWith(sphere.uuid+':'));assert.notEqual(t.normals[0],t.normals[1]);rows.push({phase,triangles:outputs[1].triangles.length,legacy:measurements[0],current:measurements[1],atlasBytes:packets[0].data.byteLength,byteIdentical:true});
 }
 const invalidation=[];
 const verifyChange=(name,target,change)=>{
  const local=new T.Scene(),world=new GeometryGIWorld();local.add(target);
  try{const first=world.prepare(local,true),bytes=first.data.slice();change();const next=world.prepare(local,true);assert.notEqual(next,first,name+' cached packet');assert.notDeepEqual(next.data,bytes,name+' atlas');const fresh=collectGeometryGI(local,true,true);const byID=new Map(fresh.triangles.map(t=>[t.sourceID,t.normals]));for(const triangle of next.frameTriangles)assert.deepEqual(triangle.normals,byID.get(triangle.sourceID),name+' normals ' +triangle.sourceID);invalidation.push(name);}finally{world.dispose();scene.add(target);}
 };
 const morphGeometry=new T.PlaneGeometry(2,2),morph=add(morphGeometry);morphGeometry.morphAttributes.position=[morphGeometry.attributes.position.clone()];for(let i=0;i<4;i++)morphGeometry.morphAttributes.position[0].setZ(i,.4);morph.updateMorphTargets();morph.morphTargetInfluences[0]=.5;
 verifyChange('morph mode without changing weights/attributes',morph,()=>{morphGeometry.morphTargetsRelative=true;});
 skin.bindMode='detached';verifyChange('bind matrix without changing skeleton pose',skin,()=>{skin.bindMatrix.makeRotationX(.7);skin.bindMatrixInverse.copy(skin.bindMatrix).invert();});
 const interleaved=new T.InterleavedBuffer(new Float32Array(count*4),4);for(let i=0;i<count;i++)interleaved.array.set([1,0,0,0],i*4);geometry.setAttribute('skinWeight',new T.InterleavedBufferAttribute(interleaved,4,0));verifyChange('interleaved skin weight data version',skin,()=>{for(let i=0;i<count;i++)interleaved.array.set([0,1,0,0],i*4);interleaved.needsUpdate=true;});
 await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify({passed:true,baselineRevision,rows,invalidation,scope:'Independent previous collector and complete atlas byte comparison: indexed/mirrored/instanced geometry, zero/missing normals, absolute/relative morphs, skeleton poses, bind matrices and edits. Matrix method call counts are exact; wall times are single samples, not game FPS.',newPersistentCaches:0,newGPUResources:0},null,2));console.log(JSON.stringify({work,passed:true,rows,invalidation}));
}catch(error){await fs.writeFile(path.join(work,'failure.json'),JSON.stringify({error:error.stack,rows},null,2));throw error;}finally{material.dispose();for(const g of resources)g.dispose();skin.skeleton.dispose();}
