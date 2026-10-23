export const skeletalSequenceKey=bone=>'skeletalPose:'+bone;
const batches=new WeakMap();
function skeletalBatch(hooks){if(!hooks.batchSkeletal)return;let batch=batches.get(hooks);if(!batch){batch=changes=>hooks.batchSkeletal(changes.map(({target,value})=>({id:target.id,...value})));batches.set(hooks,batch);}return batch;}
export function prepareSequencePoseChannels(channels,state,id,vm,hooks){
 const plans=new Map(),newBones=new Map();
 for(const track of state.sampleTracks){if(track.type!=='skeletalPose'||(track.poseWeight??1)<=0)continue;const target=state.spawns.resolve(track.target||id),object=vm.object(target);if(!object||!object.sequencePlayback&&state.targets.get(target)!==object)continue;const value=state.sampler.sample(track,state.time,{reference:true});if(value===undefined)continue;const bones=value.map(row=>row.bone);plans.set(track,{object,track,time:state.time,bones,value});for(const bone of bones)if(!channels.has(object,skeletalSequenceKey(bone))){let names=newBones.get(object);if(!names){names=new Set();newBones.set(object,names);}names.add(bone);}}
 const baselines=new Map();for(const [object,names]of newBones)baselines.set(object,hooks.captureSkeletal(object.id,[...names]));return {plans,baselines};
}
export async function writeSequencePoseChannels(channels,state,changes,baselines,vm,hooks,current){
 const active=new Map();for(const {object,track,time,bones}of changes){let names=active.get(object);if(!names){names=new Set();active.set(object,names);}for(const bone of bones){names.add(bone);await channels.write(state,object,skeletalSequenceKey(bone),{track,time,bone},()=>({read:()=>({baseline:baselines.get(object)??hooks.captureSkeletal(object.id,[bone]),bone}),apply:(sample,restoring)=>sample.baseline?hooks.restoreSkeletal?.(object.id,sample.baseline,sample.bone):hooks.sampleSkeletal(object.id,sample.track,sample.time,restoring,sample.bone),batch:skeletalBatch(hooks),empty:()=>hooks.clearSkeletal?.(object.id,bone),valid:()=>vm.object(object.id)===object}),track.completionMode);if(!current())return false;}}
 for(const [object,names]of state.poseFields||[])for(const bone of names)if(!active.get(object)?.has(bone)){await channels.releaseField(state,object,skeletalSequenceKey(bone),{defaultRestore:state.data.restoreState,forceRestore:state.data.forceRestore===true});if(!current())return false;}state.poseFields=active;return true;
}
