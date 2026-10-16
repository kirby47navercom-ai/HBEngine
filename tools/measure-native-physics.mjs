import fs from 'node:fs/promises';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {NativePhysicsQueries} from '../prototype/native-physics-query.js';
import {createRigidPhysics,validPhysicsSnapshot,loadPhysicsLibraries} from '../prototype/physics-world.js';
import {makeSceneComponent as c} from '../prototype/scene-components.js';
import {createWorldAsset,terrainMesh,meshColliderChunks} from '../prototype/world-assets.js';
import {retainTestEvidence} from './test-artifacts.mjs';
const work=await fs.mkdtemp(path.resolve('native/build/native-physics-measure-'));retainTestEvidence(work);
const actor=(id,components,position=[0,0,0])=>({id,name:id,kind:'empty',position,rotation:[0,0,0],scale:[1,1,1],components});
const boxes=Array.from({length:512},(_,i)=>actor('Box'+i,[c('BoxCollider')],[i%32,0,Math.floor(i/32)])),terrain=createWorldAsset('terrain','Mesh');terrain.resolution=[65,65];terrain.heights=Array(65*65).fill(0);terrain.weights=Array(65*65).fill(0).map(()=>[1]);const chunks=meshColliderChunks(terrainMesh(terrain)),mesh=actor('Terrain',[]);mesh.tileColliders=chunks.map((chunk,i)=>c('MeshCollider',{...chunk,mode:'mesh'},'mesh'+i));
const args={start:[0,5,0],end:[0,-5,0],dimension:3,mask:-1,includeTriggers:false,ignore:null},cases=[];
const clock=async fn=>{const begin=performance.now(),value=await fn();return{ms:performance.now()-begin,value};};
const load=await clock(()=>loadPhysicsLibraries());
for(const [name,objects]of [['512-primitives',boxes],['8192-mesh-triangles',[mesh]]]){
 const request={key:'physicsRaycastAll',args,objects},result={name,objects:objects.length,triangles:name.includes('mesh')?8192:0,validation:[],clone:[],newContext:[],sameContext:[],worldReady:[],narrowPhase:[]};
 for(let i=0;i<5;i++){
  result.validation.push((await clock(()=>validPhysicsSnapshot(objects))).ms);result.clone.push((await clock(()=>structuredClone(objects))).ms);
  const fresh=new NativePhysicsQueries(objects);try{result.newContext.push((await clock(()=>fresh.query(request))).ms);}finally{fresh.close();}
  const world=createRigidPhysics(structuredClone(objects),{queryOnly:true});try{result.worldReady.push((await clock(()=>world.ready())).ms);result.narrowPhase.push((await clock(()=>world.query(request.key,args))).ms);}finally{world.dispose();}
 }
 const repeated=new NativePhysicsQueries(objects);try{await repeated.query(request);for(let i=0;i<5;i++)result.sameContext.push((await clock(()=>repeated.query(request))).ms);}finally{repeated.close();}cases.push(result);
}
const report={version:1,work,libraryLoadMs:load.ms,cases,scope:'Node CPU isolated decomposition, five samples; not game FPS or mobile thermal measurements'};await fs.writeFile(path.join(work,'measurements.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
