import {SkeletalPoseProgram,SkeletalPoseTrack,captureSkeletalPosePage} from './sequence-state.js';
import {SequencePoseOwnership} from './sequence-pose-ownership.js';

// Programs/bindings are weak; active per-bone samples retain only current leases.
export class SequencePosePlayback{
 constructor(mesh){this.mesh=mesh;this.entries=new Map();this.programs=new WeakMap();this.bindings=new WeakMap();this.emptyGroup={};this.ownership=new SequencePoseOwnership();this.work={programsCompiled:0,keysValidated:0,poseRowsValidated:0,layoutsPrepared:0,bindingsCreated:0,bindingsRevalidated:0,samples:0,matrixRootsUpdated:0,batches:0,batchTargets:0,baselineCaptures:0,baselineRows:0,restorations:0,restoredBones:0,queries:0,queryRowsCopied:0};}
 capture(id,names){const {pose,rows,created}=this.ownership.capture(id,this.mesh(id),names);if(created)this.work.baselineCaptures++;this.work.baselineRows+=rows;return pose;}
 set(id,track,time,immediate=false,boneName){
  let previous=this.entries.get(id),entry;
  if(boneName===undefined){entry=previous?.track===track?previous:{track};entry.time=time;this.prepare(id,entry);if(immediate)this.apply(id,entry);this.entries.set(id,entry);return;}
  if(!previous?.slots){previous={slots:new Map(),tracks:new WeakMap(),time};this.entries.set(id,previous);}entry=previous.tracks.get(track);if(!entry){entry={track};previous.tracks.set(track,entry);}entry.time=previous.time=time;this.prepare(id,entry);if(immediate)this.apply(id,{...entry,names:new Set([boneName])});previous.slots.set(boneName,entry);
 }
 prepare(id,entry){
  if(!entry)return;const group=this.mesh(id);
  if(!entry.binding||entry.group!==group){
   let program=this.programs.get(entry.track.keys);if(!program){program=new SkeletalPoseProgram(entry.track.keys);this.programs.set(entry.track.keys,program);this.work.programsCompiled++;this.work.keysValidated+=program.keys.length;this.work.poseRowsValidated+=program.poseRows;this.work.layoutsPrepared+=program.layoutCount;}
   const key=group||this.emptyGroup;let bindings=this.bindings.get(key);if(!bindings){bindings=new WeakMap();this.bindings.set(key,bindings);}let binding=bindings.get(program);
   if(!binding){binding=new SkeletalPoseTrack(group,program,{time:entry.time});bindings.set(program,binding);this.work.bindingsCreated++;}
   else {binding.rebind(entry.time);this.work.bindingsRevalidated++;}
   entry.group=group;entry.binding=binding;
  }
  entry.binding.prepare(entry.time);return entry;
 }
 updateMatrices(groups){for(const group of groups){let covered=false;for(let p=group.parent;p;p=p.parent)if(groups.has(p)){covered=true;break;}if(!covered){group.updateWorldMatrix(true,true);this.work.matrixRootsUpdated++;}}}
 apply(id,entry,updateMatrices=true){entry.binding.validateBinding(entry.time);const bones=entry.names?entry.binding.bones.filter((bone,i)=>entry.names.has(entry.binding.signature.names[i])):entry.binding.bones;this.ownership.touch(id,bones);entry.binding.sample(entry.time,{updateMatrices:false,boneNames:entry.names,weight:entry.track.poseWeight??1,basis:bone=>this.ownership.basis(id,bone),validated:true});this.work.samples++;if(updateMatrices&&entry.group)this.updateMatrices(new Set([entry.group]));}
 sample(id,entry=this.entries.get(id)){if(entry?.slots){this.sampleAll(value=>value===id);return;}if(this.prepare(id,entry))this.apply(id,entry);}
 sampleAll(accept=()=>true,matrixGroups){
  const prepared=[];
  for(const [id,actor]of this.entries)if(accept(id)){
   if(!actor.slots){prepared.push({id,entry:this.prepare(id,actor)});continue;}
   const grouped=new Map();for(const [name,entry]of actor.slots){this.prepare(id,entry);let times=grouped.get(entry.track);if(!times){times=new Map();grouped.set(entry.track,times);}let sample=times.get(entry.time);if(!sample){sample={...entry,names:new Set()};times.set(entry.time,sample);prepared.push({id,entry:sample});}sample.names.add(name);}
  }
  if(!prepared.length)return;for(const {id,entry}of prepared)this.apply(id,entry,false);const groups=new Set(prepared.map(e=>e.entry.group).filter(Boolean));if(matrixGroups)for(const group of groups)matrixGroups.add(group);else this.updateMatrices(groups);this.work.batches++;this.work.batchTargets+=prepared.length;
 }
 restore(id,pose,name,updateMatrices=true){const result=this.ownership.restore(id,pose,this.mesh(id),name,updateMatrices);if(!result.accepted)return;if(result.first)this.work.restorations++;this.work.restoredBones+=result.bones;if(name instanceof Set)for(const bone of name)this.clear(id,bone);else this.clear(id,name);}
 batch(changes){const groups=new Set(),ids=new Set(),restores=new Map();for(const change of changes){if(change.baseline){let tokens=restores.get(change.id);if(!tokens){tokens=new Map();restores.set(change.id,tokens);}let names=tokens.get(change.baseline);if(!names){names=new Set();tokens.set(change.baseline,names);}names.add(change.bone);}else{this.set(change.id,change.track,change.time,false,change.bone);ids.add(change.id);}}for(const[id,tokens]of restores)for(const[token,names]of tokens){const group=this.mesh(id),before=this.work.restoredBones;this.restore(id,token,names,false);if(this.work.restoredBones!==before&&group)groups.add(group);}this.sampleAll(id=>ids.has(id),groups);this.updateMatrices(groups);}
 clear(id,name){const actor=this.entries.get(id);if(name!==undefined&&actor?.slots){actor.slots.delete(name);if(actor.slots.size)return;}this.entries.delete(id);this.ownership.clear(id);}
 inspect(id,options){const page=captureSkeletalPosePage(this.mesh(id),options),entry=this.entries.get(id),names=entry?.slots?entry.slots:new Set(entry?.binding?.signature.names||[]);this.work.queries++;this.work.queryRowsCopied+=page.bones.length;return {actor:id,controlled:!!entry,time:entry?.time??null,controlledBoneCount:names.size,controlledBones:page.bones.filter(b=>names.has(b.bone)).map(b=>b.bone),...page,sampling:{...this.work,activeTargets:this.entries.size,scope:'Owned playback preparation/sample/query counts; no whole-frame FPS or heap measurement.'}};}
 dispose(){this.entries.clear();this.programs=new WeakMap();this.bindings=new WeakMap();this.ownership.dispose();}
}
