import {mapSpriteRigChains} from './sprite-rig-chain-map.js';
import {rigIKChain} from './ik2d-assets.js';
import {retargetSceneTargets} from './retarget-scene-targets.js';
import {AnimationMixer,LoopOnce,Vector3,Quaternion,Euler} from 'three';
import {SpriteRigPose} from './sprite-rig-runtime.js';
import {validSpriteRig} from './sprite-rig-assets.js';

export function autoMapSpriteRig(source,target,{mode='exact'}={}){
 if(!validSpriteRig(source)||!validSpriteRig(target)||!['exact','hierarchy','chains'].includes(mode))throw Error('원본·대상 2D 리그와 자동 대응 모드를 확인하세요.');
 const normalize=name=>name.split(/[:/|]/).at(-1).toLowerCase().replace(/[^\p{L}\p{N}]/gu,''),side=name=>{name=name.split(/[:/|]/).at(-1);return /(^left|left$|^l[_ .-]|[_ .-]l$|왼)/i.test(name)?'left':/(^right|right$|^r[_ .-]|[_ .-]r$|오른)/i.test(name)?'right':'';},role=name=>{let key=normalize(name.split(/[:/|]/).at(-1).replace(/^(?:l|r)[_ .-]|[_ .-](?:l|r)$/gi,'')).replace(/^(left|right)/,'').replace(/(left|right)$/,'');for(const [pattern,value] of [[/^(pelvis|hips)$/,'hips'],[/^(upperarm|arm)$/,'arm'],[/^(lowerarm|forearm)$/,'forearm'],[/^(thigh|upperleg)$/,'thigh'],[/^(calf|shin|lowerleg)$/,'calf']])if(pattern.test(key))return value;return key;},pairs=new Map(),used=new Set(),depth=(bone,rig)=>{let n=bone,v=0;while(n.parent){v++;n=rig.bones.find(b=>b.id===n.parent);}return v;};
 for(const bone of [...source.bones].sort((a,b)=>depth(a,source)-depth(b,source))){let candidates=target.bones.filter(b=>!used.has(b.id)&&b.name===bone.name);if(!candidates.length&&mode!=='exact')candidates=target.bones.filter(b=>!used.has(b.id)&&side(b.name)===side(bone.name)&&role(b.name)===role(bone.name));if(candidates.length>1&&pairs.has(bone.parent))candidates=candidates.filter(b=>b.parent===pairs.get(bone.parent));if(candidates.length===1){pairs.set(bone.id,candidates[0].id);used.add(candidates[0].id);}}
 const result=[...pairs].map(([source,target])=>({source,target}));return mode==='chains'?mapSpriteRigChains(source,target,result):result;
}

// Bind-relative local tracks preserve authored turns and step keys; differing chain topology requires a pose solver.
export function retargetSpriteRigClip(source,target,{clip,mapMode='exact',mapping=autoMapSpriteRig(source,target,{mode:mapMode}),name,positionMode='boneLength'}={}){
 if(mapMode==='chains')throw Error('자동 체인 대응은 포즈 베이크를 선택하세요.');
 if(!validSpriteRig(source)||!validSpriteRig(target)||!['boneLength','relative','none'].includes(positionMode)||!Array.isArray(mapping)||!mapping.length)throw Error('2D 리그·뼈 대응·이동 모드를 확인하세요.');
 const original=source.clips.find(c=>c.id===clip);if(!original)throw Error('원본 리그 클립이 없어요.');
 const sources=new Map(source.bones.map(b=>[b.id,b])),targets=new Map(target.bones.map(b=>[b.id,b])),pairs=new Map(),used=new Set();
 for(const row of mapping){if(!row||!sources.has(row.source)||!targets.has(row.target)||pairs.has(row.source)||used.has(row.target))throw Error('뼈 대응은 중복 없이 지정하세요.');pairs.set(row.source,row.target);used.add(row.target);}
 for(const [from,to] of pairs){const a=sources.get(from),b=targets.get(to);if(a.parent?pairs.get(a.parent)!==b.parent:b.parent!=='')throw Error('대응한 뼈의 부모 계층이 달라요: '+a.name);}
 let nextName=name||original.name+' Retargeted';if(name===undefined){let n=2;while(target.clips.some(c=>c.name===nextName))nextName=original.name+' Retargeted '+n++;}
 const baked={id:'clip_'+crypto.randomUUID(),name:nextName,length:original.length,loop:original.loop,tracks:[]},skipped=[];
 for(const track of original.tracks){if(!pairs.has(track.bone)||track.property==='position'&&positionMode==='none'){skipped.push({bone:track.bone,property:track.property});continue;}
  const a=sources.get(track.bone),b=targets.get(pairs.get(track.bone)),factor=positionMode==='boneLength'?(a.parent?targets.get(b.parent).length/sources.get(a.parent).length:b.length/a.length):1;
  baked.tracks.push({bone:b.id,property:track.property,keys:track.keys.map(k=>({...k,value:track.property==='rotation'?b.rotation+k.value-a.rotation:k.value.map((v,i)=>track.property==='scale'?b.scale[i]*v/a.scale[i]:b.position[i]+(v-a.position[i])*factor)}))});
 }
 if(!baked.tracks.length)throw Error('옮길 애니메이션 트랙이 없어요.');
 if(!validSpriteRig({...target,clips:[...target.clips,baked]}))throw Error('리타게팅 결과의 이름·키 개수·값 범위를 확인하세요.');
 return {clip:baked,mapping:[...pairs].map(([source,target])=>({source,target})),skipped,positionMode};
}

export function bakeSpriteRigRetarget(source,target,{clip,mapMode='exact',mapping=autoMapSpriteRig(source,target,{mode:mapMode}),name='Retargeted Pose',fps=30,ik=true,sceneTargets={}}={}){
 if(!validSpriteRig(source)||!validSpriteRig(target)||!Number.isInteger(fps)||fps<1||fps>240||!Array.isArray(mapping)||!mapping.length||new Set(mapping.map(m=>m.source)).size!==mapping.length||new Set(mapping.map(m=>m.target)).size!==mapping.length)throw Error('포즈 베이크 리그·대응·FPS 오류');
 for(const pair of mapping)if(!source.bones.some(b=>b.id===pair.source)||!target.bones.some(b=>b.id===pair.target))throw Error('대응 뼈가 없어요.');
 const s=new SpriteRigPose(source),t=new SpriteRigPose(target),animation=s.animations.find(c=>c.name===source.clips.find(c=>c.id===clip)?.name);if(!animation){s.dispose();t.dispose();throw Error('원본 클립이 없어요.');}const mixer=new AnimationMixer(s.group),action=mixer.clipAction(animation);action.setLoop(LoopOnce,1);action.clampWhenFinished=true;action.play();let targets;try{targets=retargetSceneTargets(sceneTargets,s,t);}catch(error){mixer.stopAllAction();mixer.uncacheRoot(s.group);s.dispose();t.dispose();throw error;}const rest=pose=>new Map(pose.data.bones.map(b=>{const bone=pose.bones.get(b.id);return [b.id,{position:bone.getWorldPosition(new Vector3()),rotation:bone.getWorldQuaternion(new Quaternion()),scale:bone.getWorldScale(new Vector3())}];})),sr=rest(s),tr=rest(t),depth=id=>{let n=t.bones.get(id),v=0;for(;n?.parent&&n.parent!==t.group;n=n.parent)v++;return v;},pairs=[...mapping].sort((a,b)=>depth(a.target)-depth(b.target)),count=Math.ceil(animation.duration*fps)+1;
 const recorded=new Set(pairs.map(p=>p.target));if(ik)for(const solver of target.solvers||[])if(solver.enabled)for(const id of rigIKChain(target,solver.root,solver.effector))recorded.add(id);if(count*recorded.size*5>2000000){mixer.stopAllAction();s.dispose();t.dispose();throw Error('2D 베이크 메모리 예산 초과');}const result={id:'clip_'+crypto.randomUUID(),name,length:animation.duration,loop:source.clips.find(c=>c.id===clip).loop,tracks:[]};for(const id of recorded)for(const property of ['position','rotation','scale'])result.tracks.push({bone:id,property,keys:[]});
 try{for(let i=0;i<count;i++){const time=Math.min(animation.duration,i/fps);targets.sample(time);s.reset();mixer.setTime(time);s.update();if(ik)s.ik.update({alwaysUpdate:true,targetObject:targets.object});t.reset();for(const pair of pairs){const bone=t.bones.get(pair.target),from=s.bones.get(pair.source),a=sr.get(pair.source),b=tr.get(pair.target),ratio=target.bones.find(n=>n.id===pair.target).length/source.bones.find(n=>n.id===pair.source).length,position=from.getWorldPosition(new Vector3()).sub(a.position).multiplyScalar(ratio).add(b.position),rotation=from.getWorldQuaternion(new Quaternion()).multiply(a.rotation.clone().invert()).multiply(b.rotation);bone.position.copy(bone.parent.worldToLocal(position));const parent=bone.parent.getWorldQuaternion(new Quaternion());bone.quaternion.copy(parent.invert().multiply(rotation));const worldScale=from.getWorldScale(new Vector3()).divide(a.scale).multiply(b.scale),parentScale=bone.parent.getWorldScale(new Vector3());bone.scale.copy(worldScale.divide(parentScale));bone.updateWorldMatrix(true,true);}if(ik)t.ik.update({alwaysUpdate:true,targetObject:targets.object});for(const track of result.tracks){const pose=t.get(track.bone);let value=pose[track.property];if(track.property==='rotation'&&track.keys.length){const previous=track.keys.at(-1).value;while(value-previous>180)value-=360;while(value-previous< -180)value+=360;}track.keys.push({time,value,interpolation:'linear'});}}
 if(!validSpriteRig({...target,clips:[...target.clips,result]}))throw Error('2D 베이크 결과의 키·값 범위 오류');return {clip:result,mapping,positionMode:'pose',fps,ik};
 }finally{mixer.stopAllAction();mixer.uncacheRoot(s.group);s.dispose();t.dispose();}
}
