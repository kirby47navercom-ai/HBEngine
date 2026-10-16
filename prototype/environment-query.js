import {validNavigationAsset} from './navigation-mesh.js';
import {hasGameplayTag} from './scene-systems.js';
export async function runEnvironmentQuery(data,{origin,context=origin,forward=[0,0,1],objects=[],trace=()=>false,project=p=>p}={}){
  if(!validNavigationAsset('environmentquery',data)||![origin,context,forward].every(v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite)))throw Error('환경 질의 값 오류');const candidates=[];
  if(data.generator==='actors'){for(const o of objects)if(o.poolActive!==false&&Math.hypot(...o.position.map((v,i)=>v-origin[i]))<=data.radius)candidates.push({position:[...o.position],actor:o.id,tags:o.tags||[]});}
  else if(data.generator==='ring')for(let i=0;i<data.count;i++){const a=i/data.count*Math.PI*2;candidates.push({position:[origin[0]+Math.cos(a)*data.radius,origin[1],origin[2]+Math.sin(a)*data.radius],actor:null,tags:[]});}
  else{const n=Math.floor(data.radius/data.spacing);if((n*2+1)**2>100000)throw Error('환경 질의 생성 예산 초과');for(let x=-n;x<=n;x++)for(let z=-n;z<=n;z++)if(Math.hypot(x,z)*data.spacing<=data.radius)candidates.push({position:[origin[0]+x*data.spacing,origin[1],origin[2]+z*data.spacing],actor:null,tags:[]});}
  let rows=[];for(const row of candidates){const p=await project(row.position);if(p)rows.push({...row,position:p,score:0});}
  for(const test of data.tests){const values=[];for(const row of rows){const reference=test.reference==='context'?context:origin,d=row.position.map((v,i)=>v-reference[i]),length=Math.hypot(...d);const value=test.type==='distance'?length:test.type==='height'?d[1]:test.type==='dot'?(length?d.reduce((s,v,i)=>s+v*forward[i],0)/(length*(Math.hypot(...forward)||1)):0):test.type==='tag'?Number(hasGameplayTag(row.tags,test.tag||'Target')):Number(await trace(reference,row.position));if(value>=test.min&&value<=test.max)values.push({row,value});}if(!values.length)return [];let min=Infinity,max=-Infinity;for(const r of values){min=Math.min(min,r.value);max=Math.max(max,r.value);}rows=values.map(({row,value})=>({...row,score:row.score+(max===min?0:(value-min)/(max-min))*test.weight}));}
  return rows.sort((a,b)=>b.score-a.score||String(a.actor).localeCompare(String(b.actor)));
}
