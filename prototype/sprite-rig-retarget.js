import {validSpriteRig} from './sprite-rig-assets.js';

export function autoMapSpriteRig(source,target){
 if(!validSpriteRig(source)||!validSpriteRig(target))throw Error('원본·대상 2D 리그를 확인하세요.');
 const names=new Map(target.bones.map(b=>[b.name,b.id]));
 return source.bones.filter(b=>names.has(b.name)).map(b=>({source:b.id,target:names.get(b.name)}));
}

// Bind-relative local tracks preserve authored turns and step keys; differing chain topology requires a pose solver.
export function retargetSpriteRigClip(source,target,{clip,mapping=autoMapSpriteRig(source,target),name,positionMode='boneLength'}={}){
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
