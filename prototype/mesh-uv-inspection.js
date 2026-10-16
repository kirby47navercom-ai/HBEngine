const area=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
function overlaps(a,b){for(const t of[a,b])for(let i=0;i<3;i++){const p=t[i],q=t[(i+1)%3],axis=[q[1]-p[1],p[0]-q[0]],project=r=>r[0]*axis[0]+r[1]*axis[1],x=a.map(project),y=b.map(project);if(Math.min(Math.max(...x),Math.max(...y))-Math.max(Math.min(...x),Math.min(...y))<=Math.hypot(...axis)*1e-10)return false;}return true;}
export function inspectMeshUV(data,{channel=1,limit=256,comparisonBudget=2000000}={}){
 if(![0,1].includes(channel)||!Number.isInteger(limit)||limit<1||limit>4096||!Number.isInteger(comparisonBudget)||comparisonBudget<1||comparisonBudget>10000000)throw Error('UV 검사 채널·출력 수·비교 예산을 확인하세요.');
 const uvs=channel===1?data.uvs1:data.uvs,result={channel,present:!!uvs,triangles:data.indices.length/3,degenerate:0,outside:0,overlapPairs:0,comparisons:0,complete:true,faces:[],pairs:[]};if(!uvs)return {...result,validForLightmap:false};
 const bad=new Set(),triangles=[],grid=new Map(),side=Math.min(256,Math.max(8,Math.ceil(Math.sqrt(result.triangles)))),cell=v=>Math.max(0,Math.min(side-1,Math.floor(v*side)));
 for(let f=0;f<result.triangles;f++){const p=data.indices.slice(f*3,f*3+3).map(i=>uvs[i]);if(Math.abs(area(...p))<=1e-14){result.degenerate++;bad.add(f);continue;}if(p.some(v=>v.some(n=>n<-1e-10||n>1+1e-10))){result.outside++;bad.add(f);}triangles[f]=p;const min=[0,1].map(k=>cell(Math.min(...p.map(v=>v[k])))),max=[0,1].map(k=>cell(Math.max(...p.map(v=>v[k])))),seen=new Set();
  for(let y=min[1];y<=max[1];y++)for(let x=min[0];x<=max[0];x++){const key=y*side+x,list=grid.get(key)||[];for(const other of list){if(seen.has(other))continue;seen.add(other);if(++result.comparisons>comparisonBudget){result.complete=false;result.faces=[...bad].slice(0,limit);return {...result,validForLightmap:false,truncated:bad.size>limit};}if(overlaps(p,triangles[other])){result.overlapPairs++;bad.add(f);bad.add(other);if(result.pairs.length<limit)result.pairs.push([other,f]);}}list.push(f);grid.set(key,list);}
 }
 result.faces=[...bad].slice(0,limit);result.truncated=bad.size>limit||result.overlapPairs>limit;result.validForLightmap=!result.degenerate&&!result.outside&&!result.overlapPairs;return result;
}
