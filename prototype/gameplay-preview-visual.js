import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import {copyAnimationBindPose} from './animation-skeleton.js';
// SpriteRigPose owns geometry, IK and cyclic runtime state. Rebuild that visual
// from authored components instead of serializing or sharing its live userData.
export function cloneGameplayPreviewVisual(original,object,primitives){
 let rebuild=false;original.traverse(node=>{if(node.userData.spriteSkin)rebuild=true;});
 if(rebuild)return {group:primitives.build(object),rebuild:true};
 const group=cloneSkeleton(original);copyAnimationBindPose(original,group);return {group,rebuild:false};
}
