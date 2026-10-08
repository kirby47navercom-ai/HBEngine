import {AnimationMixer,LoopOnce} from 'three';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import {copyAnimationBindPose} from './animation-skeleton.js';
import {AnimationGraphPlayer} from './animation-graph-runtime.js';
import {createAnimationGraph,makeAnimationNode} from './animation-graph-assets.js';
import {validRetargetAsset} from './animation-retarget-assets.js';
export async function bakeRetargetClip({name='Retargeted',source,target,clip,retarget,sourceRig,targetRig,profile='',fps=30,start=0,end=clip?.duration}){
 if(!clip||!Number.isFinite(fps)||fps<1||fps>240||!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start||end>clip.duration||!source||!target)throw Error('베이크 클립·범위·FPS를 확인하세요.');
 const s=cloneSkeleton(source),t=cloneSkeleton(target);copyAnimationBindPose(source,s);copyAnimationBindPose(target,t);const objects=['source','target'].map(id=>({id,name:id,position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]})),data=createAnimationGraph('Bake'),node=makeAnimationNode('retargetPose');Object.assign(node.properties,{asset:'Retarget',sourceActor:'source',profile});node.inputs.pose=data.nodes[0].id;data.nodes.splice(1,0,node);data.nodes.at(-1).inputs.pose=node.id;const assets={Retarget:retarget,[retarget.sourceRig]:sourceRig,[retarget.targetRig]:targetRig},mixer=new AnimationMixer(s),action=mixer.clipAction(clip);action.setLoop(LoopOnce,1);action.clampWhenFinished=true;action.play();let player;
 try{player=await AnimationGraphPlayer.load(data,{object:objects[1],group:t,objects:()=>objects,mesh:id=>id==='source'?s:t,asset:async p=>p,readAsset:async p=>assets[p]});const count=Math.ceil((end-start)*fps-1e-9)+1,tracks=player.slots.map(slot=>({name:slot.binding.displayName,type:slot.type==='quaternion'?'quaternion':'vector',times:[],values:[]}));if(count*tracks.reduce((n,t)=>n+(t.type==='quaternion'?4:3),0)>8000000)throw Error('베이크 값 메모리 한도: FPS 또는 클립 범위를 줄이세요.');
  for(let i=0;i<count;i++){const time=i===count-1?end:Math.min(end,start+i/fps);mixer.setTime(time);s.updateMatrixWorld(true);const value=player.evaluate(0).pose;for(let n=0;n<tracks.length;n++){tracks[n].times.push(time-start);tracks[n].values.push(...value[n]);}if(i%128===127)await new Promise(resolve=>setTimeout(resolve,0));}
  const result={version:1,name,duration:end-start,tracks};if(!validRetargetAsset('skeletalclip',result))throw Error('베이크 골격 클립 검증 실패');return result;
 }finally{player?.dispose();mixer.stopAllAction();mixer.uncacheRoot(s);for(const root of [s,t]){root.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.dispose();});root.clear();}}
}
