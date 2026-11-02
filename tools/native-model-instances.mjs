import {deferredTexturePending,prepareDeferredTexture} from '../prototype/deferred-texture-source.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import {copyAnimationBindPose} from '../prototype/animation-skeleton.js';
import {beginSpriteTextureClone,registerSpriteTextureClone} from '../prototype/sprite-texture-source.js';

// Scene-local leases: decoded sources live only while instances use them.
// Skeletons, materials, geometry and UV state belong to each actor. Texture
// pixels use Three's immutable source sharing; replacing a map stays local.
export class NativeModelInstances {
 constructor(load,dispose){this.loadSource=load;this.disposeSource=dispose;this.entries=new Map();this.leases=new Set();this.closed=false;this.loads=0;this.hits=0;this.instances=0;}
 async acquire(name){
  if(this.closed)throw Error('모델 장면의 수명이 끝났어요.');
  let entry=this.entries.get(name);
  if(!entry){entry={refs:0,source:null,promise:null};this.entries.set(name,entry);this.loads++;entry.promise=Promise.resolve().then(()=>this.loadSource(name)).then(source=>{const owned=source.object.userData.headlessResources??=new Set();source.object.traverse(node=>{if(node.geometry)owned.add(node.geometry);if(node.isInstancedMesh||node.isLight)owned.add(node);if(node.skeleton)owned.add(node.skeleton);for(const material of node.material?(Array.isArray(node.material)?node.material:[node.material]):[]){owned.add(material);for(const value of Object.values(material))if(value?.isTexture)owned.add(value);}});const buffers=new Set();for(const resource of owned)if(resource.isTexture&&resource.image?.data?.buffer)buffers.add(resource.image.data.buffer);entry.pixelBytes=[...buffers].reduce((sum,buffer)=>sum+buffer.byteLength,0);entry.source=source;return source;},error=>{if(this.entries.get(name)===entry)this.entries.delete(name);throw error;});}else this.hits++;
  entry.refs++;let resources=new Set(),released=false,object,lease;
  const release=()=>{if(released)return;released=true;this.leases.delete(lease);for(const resource of resources)resource.dispose?.();resources.clear();this.instances-=object?1:0;if(--entry.refs===0){if(this.entries.get(name)===entry)this.entries.delete(name);if(entry.source)this.disposeSource(entry.source.object);entry.source=null;entry.promise=null;}};
  try{
   const source=await entry.promise;if(this.closed)throw Error('모델 장면의 수명이 끝났어요.');
   object=cloneSkeleton(source.object);this.instances++;copyAnimationBindPose(source.object,object);
   const geometries=new Map(),materials=new Map(),textures=new Map();
   const texture=value=>{if(!textures.has(value)){const state=beginSpriteTextureClone(value),copy=value.clone();registerSpriteTextureClone(copy,value,state);textures.set(value,copy);resources.add(copy);}return textures.get(value);};
   const material=value=>{if(!materials.has(value)){const copy=value.clone();for(const [key,item] of Object.entries(value))if(item?.isTexture)copy[key]=texture(item);materials.set(value,copy);resources.add(copy);}return materials.get(value);};
   object.traverse(node=>{delete node.userData.headlessResources;delete node.userData.hbModelInstanceLease;if(node.geometry){const original=node.geometry;if(!geometries.has(original)){const copy=original.clone();geometries.set(original,copy);resources.add(copy);}node.geometry=geometries.get(original);}if(node.material)node.material=Array.isArray(node.material)?node.material.map(material):material(node.material);if(node.skeleton)resources.add(node.skeleton);if(node.isInstancedMesh||node.isLight)resources.add(node);});
   lease={object,pendingTextures:[...textures.values()].some(deferredTexturePending),dispose:release};this.leases.add(lease);object.userData.hbModelInstanceLease=lease;object.userData.headlessResources=new Set([lease]);
   const originalNodes=[],instanceNodes=[],ids=new Map();source.object.traverse(node=>originalNodes.push(node));object.traverse(node=>instanceNodes.push(node));originalNodes.forEach((node,index)=>ids.set(node.uuid,instanceNodes[index].uuid));
   const animations=source.animations.map(clip=>{const copy=clip.clone();for(const track of copy.tracks)track.name=track.name.replace(/^([^.[\]]+)(?=[.[\]])/,name=>ids.get(name)||name);return copy;});object.animations=animations;
   return {...source,object,animations};
  }catch(error){release();throw error;}
 }
 prepareVisible(){const jobs=new Set();for(const lease of this.leases){if(!lease.pendingTextures)continue;let visible=true;for(let parent=lease.object;parent;parent=parent.parent)if(!parent.visible){visible=false;break;}if(!visible)continue;let pending=false;lease.object.traverse(node=>{for(const material of node.material?(Array.isArray(node.material)?node.material:[node.material]):[])for(const value of Object.values(material))if(value?.isTexture&&deferredTexturePending(value))pending=true;});if(!pending){lease.pendingTextures=false;continue;}lease.object.traverseVisible(node=>{for(const material of node.material?(Array.isArray(node.material)?node.material:[node.material]):[])for(const value of Object.values(material))if(value?.isTexture){const job=prepareDeferredTexture(value);if(job)jobs.add(job);}});}if(jobs.size)return Promise.all(jobs);}
 diagnostics(){return {sources:this.entries.size,instances:this.instances,sourceLoads:this.loads,sourceHits:this.hits,decodedPixelBytes:[...this.entries.values()].reduce((sum,entry)=>{const buffers=new Set();for(const resource of entry.source?.object.userData.headlessResources||[])if(resource.isTexture&&resource.image?.data?.buffer)buffers.add(resource.image.data.buffer);return sum+[...buffers].reduce((n,buffer)=>n+buffer.byteLength,0);},0)};}
 dispose(){this.closed=true;for(const lease of this.leases)lease.dispose();}
}
