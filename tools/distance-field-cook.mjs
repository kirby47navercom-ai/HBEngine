import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {OBJLoader} from 'three/addons/loaders/OBJLoader.js';
import {loadHeadlessModel,disposeHeadlessModel} from './headless-model.mjs';
import {pruneCookCache} from './cook-cache.mjs';
import {distanceFieldGeneratorHash,distanceFieldCacheKey,readCachedDistanceField} from './distance-field-cache.mjs';
import {distanceFieldWorldInputs} from './distance-world-source.mjs';
import {scenePrimitives} from '../prototype/scene-primitives.js';
import {defaultSurface} from '../prototype/model.js';
import {distanceFieldMeshEligible,distanceFieldMaterialEligible} from '../prototype/mesh-distance-field-scene.js';
import {distanceFieldVertices} from '../prototype/mesh-distance-field-upgrades.js';
import {prepareDistanceFieldMesh,bakeMeshDistanceField} from '../prototype/mesh-distance-field-core.js';
import {distanceFieldGeometryHash,encodeDistanceField,decodeDistanceField,distanceFieldCookVersion,distanceFieldCookDirectory,distanceFieldCookManifest} from '../prototype/mesh-distance-field-codec.js';
const hash=b=>createHash('sha256').update(b).digest('hex');
const release=object=>{disposeHeadlessModel(object);const resources=new Set();object.traverse(o=>{if(o.geometry)resources.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[])resources.add(m);});for(const r of resources)r.dispose();};

// Shared CookCache retention is applied by cookContent after this stage. Nothing
// is written to the editor profile, engine installation or runtime cache.
export async function cookDistanceFields(project,content,{signal,packageBudget=32*1024*1024}={}){
 signal?.throwIfAborted();if(!Number.isSafeInteger(packageBudget)||packageBudget<0)throw Error('거리장 패키지 예산을 확인하세요.');
 const scenes=[...content].filter(([name])=>name.endsWith('.hbscene.json')).map(([,b])=>JSON.parse(b)),resolutions=new Set();for(const scene of scenes)for(const o of scene.objects||[])for(const c of o.components||[]){const p=c.properties;if(c.type==='PostProcessVolume'&&p?.enabled!==false&&p?.aoEnabled&&p.aoMode==='distanceField'&&!p.pathTracingEnabled)resolutions.add(p.aoDistanceFieldResolution??24);}
 const report={version:distanceFieldCookVersion,manifest:'',fields:0,cacheHits:0,baked:0,packageBytes:0,packageBudget,geometryInputs:0,duplicateInputs:0,unsupported:0,deferred:0,examples:[],scope:'Static primitive/OBJ/glTF/GLB/world mesh/terrain triangles/foliage-source/all LOD-level local geometry; shared content hashes, exact requested resolution only; unsupported or absent quality uses owned runtime worker. No editor/driver cache.'};if(!resolutions.size)return report;
 if([...content.keys()].some(p=>p.startsWith(distanceFieldCookDirectory+'/')))throw Error('엔진 거리장 생성 경로와 프로젝트 에셋이 겹쳐요.');
 const generatorHash=await distanceFieldGeneratorHash();const folder=await project.resolve('Library/CookCache',true,false);await fs.mkdir(folder,{recursive:true});const fields=new Map(),seen=new Set();let payloadBytes=0,manifestBytes=Buffer.byteLength(JSON.stringify({version:distanceFieldCookVersion,fields:[]}));
 const example=(name,error)=>{if(report.examples.length<3)report.examples.push({path:name,message:String(error.message||error).slice(0,240)});};
 async function geometry(g,name){
  signal?.throwIfAborted();const pos=g.attributes.position,idx=g.index,start=g.drawRange.start,count=Math.floor((Math.min(idx?.count??pos.count,start+g.drawRange.count)-start)/3)*3;if(!Number.isSafeInteger(start)||start<0||!Number.isSafeInteger(count)||count<3||count*24>8*1024*1024){report.deferred++;return;}
  const vertices=distanceFieldVertices(pos,idx,start,count),geometry=await distanceFieldGeometryHash(vertices);report.geometryInputs++;if(seen.has(geometry)){report.duplicateInputs++;return;}seen.add(geometry);let mesh;
  for(const resolution of [...resolutions].sort((a,b)=>a-b)){
   signal?.throwIfAborted();const key=distanceFieldCacheKey(generatorHash,geometry,resolution),file=path.join(folder,key+'.bin');let bytes,field,hit=false;
   try{const analytic=await readCachedDistanceField(project,geometry,0,{signal,generatorHash});const stored=analytic?Buffer.concat([Buffer.from(hash(analytic.bytes),'ascii'),analytic.bytes]):await fs.readFile(file);if(stored.length<64||stored.subarray(0,64).toString('ascii')!==hash(stored.subarray(64)))throw Object.assign(Error('거리장 쿠킹 캐시 손상'),{code:'HB_CACHE_CORRUPT'});bytes=stored.subarray(64);try{field=decodeDistanceField(bytes,geometry);}catch(error){throw Object.assign(error,{code:'HB_CACHE_CORRUPT'});}if(!field.kind&&field.resolution!==resolution)throw Object.assign(Error('거리장 캐시 해상도 오류'),{code:'HB_CACHE_CORRUPT'});hit=true;if(!analytic)await fs.utimes(file,new Date(),new Date());}
   catch(error){if(!['ENOENT','HB_CACHE_CORRUPT'].includes(error.code))throw error;
    // A cache miss beyond the package budget never creates a throwaway bake.
    if(report.packageBytes+resolution**3*4+8192>packageBudget){report.deferred++;continue;}
    if(!mesh){const triangles=[];for(let i=0;i<vertices.length;i+=9)triangles.push({points:[vertices.subarray(i,i+3),vertices.subarray(i+3,i+6),vertices.subarray(i+6,i+9)]});mesh=prepareDistanceFieldMesh(triangles);}
    field=await bakeMeshDistanceField(mesh,{resolution,minimumResolution:resolution,preferAnalytic:true,byteBudget:64**3*4,signal});bytes=encodeDistanceField(field,geometry);const temp=file+'.'+randomUUID()+'.tmp';try{await fs.writeFile(temp,Buffer.concat([Buffer.from(hash(bytes),'ascii'),bytes]),{flag:'wx'});await fs.rename(temp,file);}finally{await fs.unlink(temp).catch(()=>{});}report.baked++;
   }
   if(hit)report.cacheHits++;const id=geometry+':'+field.resolution;if(fields.has(id))continue;const sha256=hash(bytes),name=distanceFieldCookDirectory+'/'+sha256+'.bin',row={geometry,resolution:field.resolution,path:name,sha256,bytes:bytes.length},nextManifest=manifestBytes+Buffer.byteLength(JSON.stringify(row))+(fields.size?1:0);if(nextManifest>4*1024*1024||payloadBytes+bytes.length+nextManifest>packageBudget){report.deferred++;continue;}fields.set(id,row);content.set(name,Buffer.from(bytes));payloadBytes+=bytes.length;manifestBytes=nextManifest;report.packageBytes=payloadBytes+manifestBytes;if(field.kind)break;
  }
 }
 async function object(root,name){const meshes=[];root.traverseVisible(o=>{if(distanceFieldMeshEligible(o)&&(Array.isArray(o.material)?o.material:[o.material]).every(distanceFieldMaterialEligible))meshes.push(o);});for(const o of meshes)await geometry(o.geometry,name);}
 const primitives=scenePrimitives(defaultSurface);try{
  for(const scene of [...scenes,...[...content].filter(([n])=>n.endsWith('.hbprefab.json')).map(([,b])=>JSON.parse(b))])for(const row of scene.objects||[]){signal?.throwIfAborted();const root=primitives.build(row);try{await object(root,row.id);}finally{for(const resource of root.userData.resources||[])resource.dispose();}}
  for(const name of [...content.keys()].filter(n=>/\.(?:gltf|glb|obj|fbx)$/i.test(n))){signal?.throwIfAborted();let root;try{if(/\.obj$/i.test(name)){const source=await project.read(name);if(source.size>8*1024*1024)throw Error('OBJ 거리장 쿠킹 입력 예산을 넘었어요.');root=new OBJLoader().parse(await fs.readFile(source.file,'utf8'));}else if(/\.(gltf|glb)$/i.test(name))root=(await loadHeadlessModel(project,name,{geometry:true})).object;else throw Error('FBX는 실행 중 거리장 생성 경로를 사용해요.');await object(root,name);}catch(error){if(signal?.aborted)throw signal.reason;report.unsupported++;example(name,error);}finally{if(root)release(root);}}
  report.world=await distanceFieldWorldInputs(content,geometry,{signal});report.deferred+=report.world.deferred;report.unsupported+=report.world.unsupported;for(const row of report.world.examples)example(row.path,row.message);
 }finally{primitives.dispose();report.retention=await pruneCookCache(folder);}
 if(fields.size){content.set(distanceFieldCookManifest,Buffer.from(JSON.stringify({version:distanceFieldCookVersion,fields:[...fields.values()]})));report.manifest=distanceFieldCookManifest;report.fields=fields.size;}return report;
}
