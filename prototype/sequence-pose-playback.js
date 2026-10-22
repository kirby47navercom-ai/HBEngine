import {SkeletalPoseProgram,SkeletalPoseTrack,captureSkeletalPose,applySkeletalPose,captureSkeletalPosePage} from './sequence-state.js';

// Compiled keys belong to one loaded playback document. Weak keys release both
// metadata and old model bindings when that document/model is no longer used.
export class SequencePosePlayback{
 constructor(mesh){this.mesh=mesh;this.entries=new Map();this.programs=new WeakMap();this.bindings=new WeakMap();this.emptyGroup={};this.work={programsCompiled:0,keysValidated:0,poseRowsValidated:0,layoutsPrepared:0,bindingsCreated:0,bindingsRevalidated:0,samples:0,baselineCaptures:0,baselineRows:0,restorations:0,queries:0,queryRowsCopied:0};}
 capture(id){const pose=captureSkeletalPose(this.mesh(id));this.work.baselineCaptures++;this.work.baselineRows+=pose.length;return pose;}
 set(id,track,time,immediate=false){let entry=this.entries.get(id);if(entry?.track!==track){entry={track,time};this.entries.set(id,entry);}entry.time=time;if(immediate)this.sample(id,entry);}
 sample(id,entry=this.entries.get(id)){
  if(!entry)return;const group=this.mesh(id);
  if(!entry.binding||entry.group!==group){
   let program=this.programs.get(entry.track.keys);if(!program){program=new SkeletalPoseProgram(entry.track.keys);this.programs.set(entry.track.keys,program);this.work.programsCompiled++;this.work.keysValidated+=program.keys.length;this.work.poseRowsValidated+=program.poseRows;this.work.layoutsPrepared+=program.layoutCount;}
   const key=group||this.emptyGroup;let bindings=this.bindings.get(key);if(!bindings){bindings=new WeakMap();this.bindings.set(key,bindings);}let binding=bindings.get(program);
   if(!binding){binding=new SkeletalPoseTrack(group,program,{time:entry.time});bindings.set(program,binding);this.work.bindingsCreated++;}
   else {binding.rebind(entry.time);this.work.bindingsRevalidated++;}
   entry.group=group;entry.binding=binding;
  }
  entry.binding.sample(entry.time);this.work.samples++;
 }
 restore(id,pose){this.entries.delete(id);applySkeletalPose(this.mesh(id),pose);this.work.restorations++;}
 clear(id){this.entries.delete(id);}
 inspect(id,options){const page=captureSkeletalPosePage(this.mesh(id),options),entry=this.entries.get(id);this.work.queries++;this.work.queryRowsCopied+=page.bones.length;return {actor:id,controlled:!!entry,time:entry?.time??null,...page,sampling:{...this.work,activeTargets:this.entries.size,scope:'Owned playback preparation/sample/query counts; no whole-frame FPS or heap measurement.'}};}
 dispose(){this.entries.clear();this.programs=new WeakMap();this.bindings=new WeakMap();}
}
