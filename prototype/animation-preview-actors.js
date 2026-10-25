import {validateAnimationProgram} from './animation-graph-assets.js';
import {defaultsForObject} from './scene-components.js';
import {colliderTypes} from './physics-world.js';
import {groundProjectionDefaults} from './animation-ground-ik.js';
const parentId=o=>o.parentId||o.parent;
export function animationPreviewActors(data,objects,selected){
 const reachable=validateAnimationProgram(data),byId=new Map(objects.map(o=>[o.id,o]));if(byId.size!==objects.length)throw Error('미리보기 오브젝트 ID가 중복돼요.');
 const visualIds=new Set(selected?[selected]:[]),queries=[];for(const n of data.nodes){const p=n.properties||{};for(const key of ['targetActor','hintActor','sourceActor','plantAnchorActor'])if(p[key])visualIds.add(p[key]);for(const e of p.effectors||[])if(e.targetActor)visualIds.add(e.targetActor);if(reachable.has(n.id)&&n.type==='twoBoneIK'&&p.groundProjection?.enabled)queries.push({...groundProjectionDefaults(),...p.groundProjection});}
 const queryIds=new Set(),colliders=new Map();if(queries.length)for(const o of objects){if(o.collisionEnabled===false||o.poolActive===false||o.destroying)continue;const eligible=c=>colliderTypes.has(c.type)&&c.properties?.enabled!==false&&c.properties?.trigger!==true&&!['physics','none'].includes(c.properties?.collisionMode)&&queries.some(p=>(c.type.endsWith('2D')?2:3)===p.dimension&&((p.mask>>>0)&(1<<(c.properties?.layer??0)))!==0),components=(o.components??defaultsForObject(o.kind)).filter(eligible),tiles=(o.tileColliders||[]).filter(eligible);if(components.length||tiles.length){queryIds.add(o.id);colliders.set(o.id,{components,tiles});}}
 const parents=ids=>{for(const id of [...ids]){let o=byId.get(id);const seen=new Set();while(o){const parent=parentId(o);if(!parent||seen.has(parent))break;seen.add(parent);ids.add(parent);o=byId.get(parent);}}};parents(visualIds);const keep=new Set([...visualIds,...queryIds]);parents(keep);
 const result=[];let queryOnlyCount=0;for(const o of objects){if(!keep.has(o.id))continue;if(visualIds.has(o.id))result.push(structuredClone(o));else{queryOnlyCount++;const row=colliders.get(o.id),next={id:o.id,name:o.name||o.id,kind:'empty',visible:false,position:o.position,rotation:o.rotation,scale:o.scale,components:row?.components||[]};if(row?.tiles.length)next.tileColliders=row.tiles;for(const key of ['parent','parentId','collisionEnabled','poolActive'])if(o[key]!==undefined)next[key]=key==='parent'?parentId(o):o[key];result.push(structuredClone(next));}}
 result.sort((a,b)=>Number(b.id===selected)-Number(a.id===selected));return{objects:result,visualIds,queryOnlyCount};
}
