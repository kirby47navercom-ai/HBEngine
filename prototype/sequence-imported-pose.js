import {PropertyBinding,Quaternion} from 'three';
import {skeletalBoneIndex} from './sequence-state.js';

const sizes={position:3,quaternion:4,scale:3};
// Keep the importer's interpolants (including GLTF cubic splines) and buffers.
// Only complete bone TRS bindings enter the existing per-bone pose channels.
export class ImportedSequencePoseProgram{
 constructor(group,clip){this.clip=clip;this.bindings=new WeakMap();this.track={importedPose:this};this.bindings.set(group,new ImportedPoseBinding(group,this));}
 binding(group){let binding=this.bindings.get(group);if(!binding){binding=new ImportedPoseBinding(group,this);this.bindings.set(group,binding);}binding.validateBinding();return binding;}
}
class ImportedPoseBinding{
 constructor(group,program){this.group=group;this.program=program;this.q=new Quaternion();this.bind();}
 bind(){
  const rows=new Map(),tracks=new Set(),edges=new Map();let index;
  for(const track of this.program.clip.tracks){const parsed=PropertyBinding.parseTrackName(track.name);if(!sizes[parsed.propertyName]||parsed.propertyIndex!==undefined||track.getValueSize()/(track.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline?3:1)!==sizes[parsed.propertyName])continue;const binding=PropertyBinding.create(this.group,track.name);binding.bind();const bone=binding.targetObject;binding.unbind();if(!bone?.isBone)continue;index??=skeletalBoneIndex(this.group);if(index.get(bone.name)!==bone)continue;let row=rows.get(bone.name);if(!row){row={bone,fields:new Map()};rows.set(bone.name,row);}if(row.fields.has(parsed.propertyName))throw Error('같은 뼈 속성의 중복 클립 키를 확인하세요: '+track.name);row.fields.set(parsed.propertyName,track.createInterpolant(new Float64Array(sizes[parsed.propertyName])));tracks.add(track);for(let node=bone;node&&node!==this.group;node=node.parent){if(edges.has(node))break;edges.set(node,[node.parent,node.userData?.objectId]);}}
  this.rows=rows;this.tracks=tracks;this.signature={names:[...rows.keys()]};this.bones=[...rows.values()].map(row=>row.bone);this.edges=[...edges];this.owner=this.group?.userData?.objectId;
 }
 prepare(time){if(!Number.isFinite(time))throw Error('골격 시간 값을 확인하세요.');}
 rebind(){this.bind();}
 validateBinding(){if(this.owner!==this.group?.userData?.objectId||this.edges.some(([node,[parent,owner]])=>node.parent!==parent||node.userData?.objectId!==owner)||this.bones.some((bone,i)=>bone.name!==this.signature.names[i]))this.bind();}
 sampleBone(time,name,{basis,bone}={}){const row=this.rows.get(name);if(!row||bone&&bone!==row.bone)throw Error('클립 뼈의 수명이 바뀌었어요: '+name);bone=row.bone;const base=basis?.(bone)||{position:bone.position.toArray(),quaternion:bone.quaternion.toArray(),scale:bone.scale.toArray()},pose={bone};time=Math.max(0,Math.min(this.program.clip.duration,time));for(const field of ['position','quaternion','scale']){const sample=row.fields.get(field)?.evaluate(time);pose[field]=sample?Array.from(sample):base[field].slice();}if(Object.values(pose).some(value=>Array.isArray(value)&&value.some(n=>!Number.isFinite(n))))throw Error('클립 뼈의 값이 유한하지 않아요: '+name);if(Math.hypot(...pose.quaternion)<1e-12)throw Error('클립 뼈 회전이 올바르지 않아요: '+name);pose.quaternion=this.q.fromArray(pose.quaternion).normalize().toArray();return pose;}
 sample(time,{boneNames,basis,validated=false,updateMatrices=true}={}){if(!validated)this.validateBinding();const values=[];for(const name of this.signature.names)if(!boneNames||boneNames.has(name))values.push(this.sampleBone(time,name,{basis}));for(const value of values){value.bone.position.fromArray(value.position);value.bone.quaternion.fromArray(value.quaternion);value.bone.scale.fromArray(value.scale);}if(updateMatrices)this.group?.updateWorldMatrix(true,true);}
}
export const importedSequencePoseContract={channels:'Managed imported full position/quaternion/scale bone tracks use the same skeletalPose:<bone name> leases as recorded poses. Missing TRS components use the shared preanimated local pose; priority, normalized weight, authored order and completion are per bone.',storage:'Weak clip/group descriptors and importer interpolants reference original typed key buffers; no baked pose keys, extra evaluator, timer or new public C++ API.',remaining:['Imported root/object and renderer-property aliases','Indexed bone properties and unmanaged additional actions','Arbitrary external setter/notify rollback']};
