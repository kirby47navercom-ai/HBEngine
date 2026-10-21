import {sequenceCurveType} from './sequence-curves.js';import {validGameplayAsset} from './gameplay-assets.js';import {validRetargetAsset} from './animation-retarget-assets.js';import {curveKeySelection} from './curve-clipboard.js';
export function editAssetCurveKeys(kind,data,params){
 if(!['sequenceasset','skeletalclip'].includes(kind))throw Error('곡선을 가진 문서 종류를 확인하세요.');
 const sequence=kind==='sequenceasset',rows=sequence?data.tracks:data.curves,track=rows?.find(t=>sequence?t.id===params.track:t.name===params.curve),type=sequence&&track?sequenceCurveType(track):'float';if(!track||!type||sequence&&track.quaternionInterpolation)throw Error('연속 값 곡선을 선택하세요.');
 const generic={...track,type,interpolation:track.interpolation||'linear'},result=curveKeySelection(generic,params,{length:sequence?data.length:data.duration,maxKeys:sequence?1024:65536}),updated={...track,keys:generic.keys},next={...data,[sequence?'tracks':'curves']:rows.map(t=>t===track?updated:t)};
 if(!(sequence?validGameplayAsset('sequenceasset',next):validRetargetAsset('skeletalclip',next)))throw Error('곡선 키의 자료형·범위·예산을 확인하세요.');if(params.operation!=='copy')track.keys=generic.keys;return result;
}
