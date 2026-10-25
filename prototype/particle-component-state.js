import {Group} from 'three';
import {objectComponents,componentDefaultValues} from './scene-components.js';
const emptyComponents=Object.freeze([]);
export function particleComponents(o){if(o.poolActive===false)return emptyComponents;let rows;for(const c of objectComponents(o))if(c.type==='ParticleSystem'&&c.properties?.enabled!==false)(rows??=[]).push(c);return rows||emptyComponents;}
export function particleComponent(o,selector=''){
 if(typeof selector!=='string'||selector.length>160||/[\x00-\x1f]/.test(selector))throw Error('파티클 컴포넌트 ID·이름을 확인하세요.');
 const rows=particleComponents(o);if(!selector||selector==='ParticleSystem'){if(!rows.length)throw Error('활성 ParticleSystem 컴포넌트가 필요해요.');return rows[0];}
 const exact=rows.find(c=>c.id===selector);if(exact)return exact;const named=rows.filter(c=>c.name===selector);if(named.length!==1)throw Error('고유한 활성 파티클 컴포넌트를 지정하세요: '+selector);return named[0];
}
export const particleProperties=c=>({...componentDefaultValues('ParticleSystem'),...c.properties});
export function particleRenderGroup(root,component){
 const states=root.userData.particleStates??=new Map();if(states.has(component.id))throw Error('파티클 컴포넌트 표시가 중복돼요: '+component.id);
 let group=root;if(states.size){group=new Group();group.name='ParticleSystem:'+component.id;group.userData.objectId=root.userData.objectId;group.userData.resources=root.userData.resources??=new Set();Object.defineProperty(group.userData,'disposed',{get:()=>root.userData.disposed});root.add(group);}states.set(component.id,null);return group;
}
export function registerParticleVisual(root,group,component,state){
 Object.assign(state,{group,component:component.id,name:component.name||component.id});state.simulation.hbParticleComponent=component.id;state.simulation.hbParticleStates=root.userData.particleStates;state.simulation.hbParticleTrail=state.trail;const mesh=state.mesh||state.simulation.mesh;if(mesh){mesh.userData.particleComponent=component.id;if(group!==root)mesh.userData.draw2dId='particles:'+component.id;}root.userData.particleStates.set(component.id,state);if(!root.userData.particleState)root.userData.particleState=state;return state;
}
export const particleVisualStates=group=>group?.userData.particleStates?.values()||(group?.userData.particleState?[group.userData.particleState]:[]);
export const particleDebug=state=>state.debugState?.()||{count:state.particles.length,playing:state.playing,paused:state.paused};
export function publishParticleDebug(object,rows){const values=[];for(const c of particleComponents(object)){const state=rows.get(c.id);if(state)values.push({component:c.id,name:c.name,...particleDebug(state)});}object.gameplayDebug={...object.gameplayDebug,particles:values[0]?{...values[0]}:undefined,particleSystems:values};}
export const particleComponentContract=Object.freeze({identity:'One simulation, geometry/native ID, sorting and ribbon per active ParticleSystem component ID; duplicate names require ID. Legacy actor commands target the first active emitter.',commands:'Particles::PlayComponent/StopComponent/PauseComponent/EmitComponent/GetComponentCount and matching BP nodes select ID or unique name; old actor calls preserve first-component behavior.',rendering:'CPU/WebGPU/DirectX factories share ordinary child transform groups; no GPU positions read back for multi-emitter routing. Legacy two-argument visual hooks retain the registry through the returned simulation.',lifetime:'Component replacement, disable/removal, actor pooling and scene release retire only that component state. Group disposal releases every emitter-owned visual resource. No global registry or extra frame worker.'});
