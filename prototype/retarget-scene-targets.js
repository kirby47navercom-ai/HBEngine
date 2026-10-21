import {validActorScale} from './transform-scale.js';
import {Object3D,MathUtils} from 'three';
import {validValue,sampleTimeline,validTimeline} from './blueprint-model.js';
const transformOK=t=>validValue('transform',t)&&validActorScale(t.scale)&&['position','rotation','scale'].every(k=>t[k].every(v=>Math.abs(v)<=10000));
export function retargetSceneTargets({actors=[],sourceTargets=[],targetTargets=[],sourceTransform,targetTransform}={},source,target){
 if(!Array.isArray(actors)||actors.length>128||new Set(actors.map(a=>a?.id)).size!==actors.length)throw Error('리타게팅 외부 목표 목록 오류');
 const groups=new Map();for(const actor of actors){if(typeof actor.id!=='string'||!actor.id||actor.id.length>160||!transformOK(actor.transform)||actor.timeline!==undefined&&(!validTimeline(actor.timeline)||actor.timeline.tracks.some(t=>!['position','rotation','scale'].includes(t.id)||t.type!=='vec3')))throw Error('외부 목표의 변환·키를 확인하세요.');groups.set(actor.id,new Object3D());}
 for(const [pose,bindings] of [[source,sourceTargets],[target,targetTargets]]){if(!Array.isArray(bindings)||bindings.length>32||new Set(bindings.map(b=>b?.solver)).size!==bindings.length)throw Error('IK 목표 대응 오류');for(const row of bindings){if(!groups.has(row.actor))throw Error('IK 목표 오브젝트가 없어요: '+row.actor);pose.ik.bindTarget(row.solver,row.actor,row.offset||[0,0]);}}
 for(const [pose,transform] of [[source,sourceTransform],[target,targetTransform]])if(transform){if(!transformOK(transform))throw Error('리그 월드 변환 오류');pose.group.position.fromArray(transform.position);pose.group.rotation.set(...transform.rotation.map(MathUtils.degToRad));pose.group.scale.fromArray(transform.scale);pose.group.updateWorldMatrix(true,true);}
 return {object:id=>groups.get(id),sample(time){for(const actor of actors){const value=structuredClone(actor.transform);for(const track of actor.timeline?.tracks||[])if(track.keys.length)value[track.id]=sampleTimeline(track,time);if(!transformOK(value))throw Error('리타게팅 목표 키의 변환 범위 오류');const g=groups.get(actor.id);g.position.fromArray(value.position);g.rotation.set(...value.rotation.map(MathUtils.degToRad));g.scale.fromArray(value.scale);g.updateWorldMatrix(true,true);}}};
}
