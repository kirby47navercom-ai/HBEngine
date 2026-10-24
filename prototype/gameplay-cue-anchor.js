import {Matrix4,Vector3,Quaternion,Euler,MathUtils} from 'three';
import {skeletalBoneIndex} from './sequence-state.js';
import {sceneWorldMatrix} from './scene-runtime.js';
import {spawnTransformValid} from './runtime-spawn.js';
import {componentDefaultValues} from './scene-components.js';

const matrixTRS=value=>new Matrix4().compose(new Vector3(...value.position),new Quaternion().setFromEuler(new Euler(...value.rotation.map(MathUtils.degToRad))),new Vector3(...value.scale));
export function cueAnchorTRS(matrix){
 const position=new Vector3(),quaternion=new Quaternion(),scale=new Vector3();matrix.decompose(position,quaternion,scale);
 const check=new Matrix4().compose(position,quaternion,scale);if(matrix.elements.some((v,i)=>!Number.isFinite(v)||!Number.isFinite(check.elements[i])||Math.abs(v-check.elements[i])>1e-6*Math.max(1,Math.abs(v))))throw Error('VFX 부착 변환에 전단·특이 행렬이 있어요. 부모 크기·회전을 조정하세요.');
 const transform={position:position.toArray(),rotation:new Euler().setFromQuaternion(quaternion).toArray().slice(0,3).map(MathUtils.radToDeg),scale:scale.toArray()};if(!spawnTransformValid(transform))throw Error('Cue VFX 변환 범위를 확인하세요.');return transform;
}
// Cache only live bone references/ancestor edges. Pose matrices are sampled after
// animation/physics; this does not copy or traverse the whole skeleton each frame.
export class GameplayCueAnchor {
 constructor(row){this.row=row;this.group=null;this.bone=null;this.edges=[];}
 local(owner,group){
  const row=this.row;if(!row.vfxAnchor||row.vfxAnchor==='owner')return matrixTRS({position:row.vfxPosition,rotation:row.vfxRotation,scale:row.vfxScale});
  let socket;if(row.vfxAnchor==='socket'){const matches=(owner.components||[]).filter(c=>c.type==='SkeletalSocket'&&c.properties?.enabled!==false&&(c.properties?.socketName??'Socket')===row.vfxAnchorName);if(matches.length!==1)throw Error('고유한 활성 SkeletalSocket을 지정하세요: '+row.vfxAnchorName);socket={...componentDefaultValues('SkeletalSocket'),...matches[0].properties};}
  const name=socket?.bone||row.vfxAnchorName;if(!group?.isObject3D||group.userData.objectId&&group.userData.objectId!==owner.id)throw Error('Cue 뼈·소켓에는 준비된 소유 골격이 필요해요.');
  if(this.group!==group||this.bone?.name!==name||this.edges.some(([node,parent,id])=>node.parent!==parent||node.userData?.objectId!==id)){
   const bone=skeletalBoneIndex(group).get(name);if(!bone)throw Error('Cue 대상 뼈가 없어요: '+name);const edges=[];let node=bone;for(;node&&node!==group;node=node.parent)edges.push([node,node.parent,node.userData?.objectId]);if(node!==group)throw Error('Cue 뼈 소유자를 확인하세요.');this.group=group;this.bone=bone;this.edges=edges;
  }
  group.updateWorldMatrix(true,false);this.bone.updateWorldMatrix(true,false);if(!Number.isFinite(group.matrixWorld.determinant())||group.matrixWorld.determinant()===0)throw Error('Cue 골격 소유자의 크기를 확인하세요.');
  const matrix=group.matrixWorld.clone().invert().multiply(this.bone.matrixWorld);if(socket){const transform={position:socket.position,rotation:socket.rotation,scale:socket.scale};if(!spawnTransformValid(transform))throw Error('소켓 위치·회전·크기를 확인하세요.');matrix.multiply(matrixTRS(transform));}return matrix.multiply(matrixTRS({position:row.vfxPosition,rotation:row.vfxRotation,scale:row.vfxScale}));
 }
 transform(owner,objects,group){if(this.row.vfxAttach&&(!this.row.vfxAnchor||this.row.vfxAnchor==='owner'))return{position:[...this.row.vfxPosition],rotation:[...this.row.vfxRotation],scale:[...this.row.vfxScale]};const matrix=this.local(owner,group);return cueAnchorTRS(this.row.vfxAttach?matrix:sceneWorldMatrix(owner,objects).multiply(matrix));}
}
// A relative actor-name path selects an ordinary emitter actor. Its existing
// simulation/render snapshot stays actor-owned; no second hidden simulation.
export function gameplayCueEmitter(owner,vm,names=null){
 let object=owner;const chain=[owner],edges=[];for(const name of names||[]){const parent=object,matches=vm.objects.filter(o=>(o.parentId||o.parent)===parent.id&&o.name===name&&o.poolActive!==false);if(matches.length!==1)throw Error('고유한 활성 이미터 경로를 지정하세요: '+name);object=matches[0];chain.push(object);edges.push([object,parent,name]);}
 const components=(object.components||[]).filter(c=>c.type==='ParticleSystem'&&c.properties?.enabled!==false);if(!components.length||names&&components.length!==1)throw Error('Cue 이미터 대상에는 활성 ParticleSystem 하나가 필요해요.');const component=components[0],properties=component.properties;return{object,properties:{...componentDefaultValues('ParticleSystem'),...properties},chain,current:()=>chain.every(o=>vm.object(o.id)===o&&o.poolActive!==false)&&edges.every(([child,parent,name])=>(child.parentId||child.parent)===parent.id&&child.name===name)&&object.components?.includes(component)&&component.properties===properties&&component.properties?.enabled!==false};
}
