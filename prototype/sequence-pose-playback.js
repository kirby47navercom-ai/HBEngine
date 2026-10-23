import {SkeletalPoseProgram,SkeletalPoseTrack,captureSkeletalPose,applySkeletalPose,captureSkeletalPosePage} from './sequence-state.js';

// Compiled keys belong to one loaded playback document. Weak keys release both
// metadata and old model bindings when that document/model is no longer used.
export class SequencePosePlayback{
 constructor(mesh){this.mesh=mesh;this.entries=new Map();this.programs=new WeakMap();this.bindings=new WeakMap();this.emptyGroup={};this.work={programsCompiled:0,keysValidated:0,poseRowsValidated:0,layoutsPrepared:0,bindingsCreated:0,bindingsRevalidated:0,samples:0,matrixRootsUpdated:0,batches:0,batchTargets:0,baselineCaptures:0,baselineRows:0,restorations:0,queries:0,queryRowsCopied:0};}
 capture(id){const pose=captureSkeletalPose(this.mesh(id));this.work.baselineCaptures++;this.work.baselineRows+=pose.length;return pose;}
 set(id,track,time,immediate=false){const previous=this.entries.get(id);if(!immediate&&previous?.track===track&&previous.group===this.mesh(id)){previous.binding.prepare(time);previous.time=time;return;}const entry=previous?.track===track?{...previous,time}:{track,time};this.prepare(id,entry);if(immediate)this.apply(entry);this.entries.set(id,entry);}
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
 apply(entry,updateMatrices=true){entry.binding.sample(entry.time,{updateMatrices});this.work.samples++;if(updateMatrices&&entry.group)this.work.matrixRootsUpdated++;}
 sample(id,entry=this.entries.get(id)){if(this.prepare(id,entry))this.apply(entry);}
 sampleAll(accept=()=>true){const prepared=[];for(const [id,entry]of this.entries)if(accept(id))prepared.push(this.prepare(id,entry));if(!prepared.length)return;for(const entry of prepared)this.apply(entry,false);const groups=new Set(prepared.map(e=>e.group).filter(Boolean));for(const group of groups){let covered=false;for(let p=group.parent;p;p=p.parent)if(groups.has(p)){covered=true;break;}if(!covered){group.updateWorldMatrix(true,true);this.work.matrixRootsUpdated++;}}this.work.batches++;this.work.batchTargets+=prepared.length;}
 restore(id,pose){applySkeletalPose(this.mesh(id),pose);this.entries.delete(id);this.work.restorations++;}
 clear(id){this.entries.delete(id);}
 inspect(id,options){const page=captureSkeletalPosePage(this.mesh(id),options),entry=this.entries.get(id);this.work.queries++;this.work.queryRowsCopied+=page.bones.length;return {actor:id,controlled:!!entry,time:entry?.time??null,...page,sampling:{...this.work,activeTargets:this.entries.size,scope:'Owned playback preparation/sample/query counts; no whole-frame FPS or heap measurement.'}};}
 dispose(){this.entries.clear();this.programs=new WeakMap();this.bindings=new WeakMap();}
}
