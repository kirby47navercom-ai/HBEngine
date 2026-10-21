import {curveModes} from './curve-sampling.js';
import {componentDefinitions} from './scene-components.js';
export function sequenceCurveType(track){
 if(['position','rotation','scale'].includes(track.type))return 'vec3';
 if(['light','material','timeScale'].includes(track.type))return 'float';
 if(['variable','nativeProperty'].includes(track.type))return !track.array&&['float','vec2','vec3','color'].includes(track.valueType)?track.valueType:null;
 if(track.type==='component'){const p=componentDefinitions[track.componentType]?.properties[track.property];return p?.type==='number'&&p.step!==1?'float':['vec3','color'].includes(p?.type)?p.type:null;}
 return null;
}
export const sequenceCurveModes=curveModes.filter(m=>m!=='step');
export function validSequenceCurveTrack(track){
 const type=sequenceCurveType(track),shape=type==='float'?0:type==='vec2'?2:type==='vec3'?3:type==='color'?4:-1;
 const tangent=v=>shape===0?Number.isFinite(v)&&Math.abs(v)<=100000:Array.isArray(v)&&v.length===shape&&v.every(x=>Number.isFinite(x)&&Math.abs(x)<=100000);
 return track.keys.every(k=>(k.interpolation===undefined||curveModes.includes(k.interpolation))&&(!type?['arriveTangent','leaveTangent'].every(p=>k[p]===undefined)&&(!k.interpolation||['linear','step','constant'].includes(k.interpolation)):['arriveTangent','leaveTangent'].every(p=>k[p]===undefined||tangent(k[p])))&&(!track.quaternionInterpolation||!k.interpolation||['linear','constant','step'].includes(k.interpolation)));
}
export function configureSequenceCurve(data,{track:key,key:at,interpolation,arriveTangent,leaveTangent}={}){
 const track=data.tracks.find(t=>t.id===key);if(!track||!Number.isInteger(at)||at<0||at>=track.keys.length||!sequenceCurveType(track))throw Error('연속 값 트랙과 키를 선택하세요.');
 const keys=structuredClone(track.keys),k=keys[at];if(interpolation!==undefined){k.interpolation=interpolation;if(['auto','linear','constant','step'].includes(interpolation)){delete k.arriveTangent;delete k.leaveTangent;}}
 for(const [field,value]of Object.entries({arriveTangent,leaveTangent}))if(value!==undefined){if(value===null)delete k[field];else{k[field]=structuredClone(value);if(!['user','break'].includes(k.interpolation))k.interpolation='break';}}
 if(!validSequenceCurveTrack({...track,keys}))throw Error('보간 모드·탄젠트의 자료형을 확인하세요.');track.keys=keys;return k;
}
