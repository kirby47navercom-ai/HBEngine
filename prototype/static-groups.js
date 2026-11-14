// Static object groups (docs/CHANGE_TRACKING_DESIGN.md, off-screen skip). A watched group is the visual root of one
// scene object. While the object's transform/component revisions equal those of the group's last real matrix update,
// the group is clean: updateMatrixWorld returns at once (its subtree matrices are already current), and the renderer
// may skip visiting it when its cached bounding sphere misses the camera and every shadow frustum.
// Only eligible groups are clean: whitelisted components, a subtree of plain meshes (no skinning, morphs, instancing,
// LOD, lines, points, lights, cameras, particles, material programs, custom onBeforeRender except non-billboard engine
// sprites) under a parent whose world matrix is the identity.
// Safety net: one in SAMPLE_EVERY clean updates runs the real update and compares every subtree world matrix; a
// difference is reported and switches static skipping off (every group updates and is visited again).
import {Object3D,Sphere} from 'three';
import {objectRevision,reportRevisionMismatch,revisionConfig} from './object-revision.js';

export const staticConfig={enabled:true,sampleEvery:64,skippedUpdates:0};
const records=new WeakMap(),baseUpdate=Object3D.prototype.updateMatrixWorld,baseBeforeRender=Object3D.prototype.onBeforeRender;
const allowedComponents=new Set(['Transform','SpriteRenderer','MeshRenderer','BoxCollider','SphereCollider','CapsuleCollider','MeshCollider','BoxCollider2D','CircleCollider2D','CapsuleCollider2D','PolygonCollider2D','EdgeCollider2D','Rigidbody','Rigidbody2D']);
let samples=0;

function eligibleNode(node){
 if(node.isLight||node.isCamera||node.isLine||node.isPoints||node.isSprite||node.isLOD||node.isSkinnedMesh||node.isInstancedMesh||node.isBone)return false;
 if(node.userData.hbNativeParticle||node.userData.spriteSkin||node.userData.gameCamera)return false;
 if(node.isMesh){
  const g=node.geometry;if(!g||g.isInstancedBufferGeometry||Object.keys(g.morphAttributes||{}).length||node.morphTargetInfluences?.length)return false;
  for(const m of Array.isArray(node.material)?node.material:[node.material])if(!m||m.userData?.hbNativeProgram||m.isShaderMaterial)return false;
  if(node.onBeforeRender!==baseBeforeRender&&!(node.userData.sprite&&!node.userData.draw2d?.billboard))return false;
 }
 for(const child of node.children)if(!eligibleNode(child))return false;
 return true;
}
function eligible(group,object){
 if(!object||object.poolActive===false)return false;
 for(const c of object.components||[])if(!allowedComponents.has(c.type))return false;
 return eligibleNode(group);
}
const identity=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
function identityParent(group){const p=group.parent;if(!p)return false;const e=p.matrixWorld.elements;for(let i=0;i<16;i++)if(e[i]!==identity[i])return false;return true;}
function revisions(object){const r=objectRevision(object);return r?[r.transform,r.components]:[0,0];}
function clean(r,group){
 if(!staticConfig.enabled||revisionConfig.verify||group.matrixWorldNeedsUpdate)return false;
 const [t,c]=revisions(r.object);
 if(c!==r.eligibleComponents){r.eligible=eligible(group,r.object);r.eligibleComponents=c;}
 return r.eligible&&t===r.updatedTransform&&c===r.updatedComponents&&identityParent(group);
}
function snapshot(group){const out=[];group.traverse(n=>out.push(n,n.matrixWorld.elements.slice()));return out;}
function staticUpdateMatrixWorld(force){
 const r=records.get(this);
 if(r&&clean(r,this)){
  if(++samples%staticConfig.sampleEvery!==0){this.matrixWorldNeedsUpdate=false;staticConfig.skippedUpdates++;return;}
  const before=snapshot(this);baseUpdate.call(this,force);
  for(let i=0;i<before.length;i+=2){const now=before[i].matrixWorld.elements,old=before[i+1];for(let k=0;k<16;k++)if(now[k]!==old[k]){reportRevisionMismatch('staticGroup',r.object,{node:before[i].uuid});staticConfig.enabled=false;break;}if(!staticConfig.enabled)break;}
  return;
 }
 baseUpdate.call(this,force);
 if(r){[r.updatedTransform,r.updatedComponents]=revisions(r.object);r.sphereValid=false;}
}
// Called by the runtime for each object's visual root.
export function watchStaticGroup(group,object){
 if(!group||records.has(group))return;
 records.set(group,{object,eligible:false,eligibleComponents:-1,updatedTransform:-1,updatedComponents:-1,sphere:new Sphere(),sphereValid:false});
 Object.defineProperty(group,'updateMatrixWorld',{value:staticUpdateMatrixWorld,writable:true,configurable:true,enumerable:false});
}
const part=new Sphere();
// Bounding sphere of a clean group (world space, every mesh), or null when the group is not clean/eligible.
export function staticGroupSphere(group){
 const r=records.get(group);if(!r||!clean(r,group))return null;
 if(!r.sphereValid){r.sphere.makeEmpty();group.traverse(n=>{if(!n.isMesh)return;const g=n.geometry;if(g.boundingSphere===null)g.computeBoundingSphere();part.copy(g.boundingSphere).applyMatrix4(n.matrixWorld);if(r.sphere.isEmpty())r.sphere.copy(part);else r.sphere.union(part);});r.sphereValid=true;}
 return r.sphere.isEmpty()?null:r.sphere;
}
