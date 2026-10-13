export function buildGeometryBVH(triangles,leafSize=4){
 const ordered=[],nodes=[];
 const build=list=>{const node={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity],start:0,count:0,skip:0};nodes.push(node);for(const t of list)for(const p of t.points)for(let j=0;j<3;j++){node.min[j]=Math.min(node.min[j],p[j]);node.max[j]=Math.max(node.max[j],p[j]);}
  if(list.length<=leafSize){node.start=ordered.length;node.count=list.length;ordered.push(...list);}else{const extent=node.max.map((n,i)=>n-node.min[i]),axis=extent.indexOf(Math.max(...extent));list.sort((a,b)=>a.center[axis]-b.center[axis]);const mid=Math.floor(list.length/2);build(list.slice(0,mid));build(list.slice(mid));}node.skip=nodes.length;};
 if(triangles.length)build([...triangles]);return {nodes,triangles:ordered};
}
const cost=nodes=>{const area=n=>{const d=n.max.map((v,i)=>Math.max(0,v-n.min[i]));return 2*(d[0]*d[1]+d[1]*d[2]+d[0]*d[2]);};return nodes.length?nodes.reduce((sum,n)=>sum+area(n)*(n.count||1),0)/Math.max(1e-30,area(nodes[0])):0;};
export function updatedBVH(triangles,old,leafSize=4){
 const ids=triangles.map(t=>t.sourceID);let tree,refit=false;
 if(old?.ids&&ids.length===old.ids.length&&ids.every((id,i)=>id&&id===old.ids[i])){
  const ordered=old.order.map(i=>triangles[i]),nodes=old.nodes.map(n=>({...n,min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]}));
  for(let i=nodes.length-1;i>=0;i--){const n=nodes[i];if(n.count){for(let t=n.start;t<n.start+n.count;t++)for(const p of ordered[t].points)for(let c=0;c<3;c++){n.min[c]=Math.min(n.min[c],p[c]);n.max[c]=Math.max(n.max[c],p[c]);}}else{const a=nodes[i+1],b=nodes[a.skip];for(let c=0;c<3;c++){n.min[c]=Math.min(a.min[c],b.min[c]);n.max[c]=Math.max(a.max[c],b.max[c]);}}}
  if(cost(nodes)<=old.cost*1.5){tree={nodes,triangles:ordered};refit=true;}
 }
 if(!tree)tree=buildGeometryBVH(triangles,leafSize);
 const index=refit?null:new Map(triangles.map((t,i)=>[t,i])),cache={ids:refit?old.ids:ids,order:refit?old.order:tree.triangles.map(t=>index.get(t)),nodes:tree.nodes,cost:refit?old.cost:cost(tree.nodes)};
 return {tree,cache,refit};
}
// World-space hit records keep material/UV/medium IDs compatible; local BLAS nodes are shared.
export function geometryHierarchy(triangles,old){
 if(!triangles.length||triangles.some(t=>!t.instanceID||!t.localPoints||!t.inverseWorld))return updatedBVH(triangles,old);
 const groups=new Map(),blases=new Map();let reused=0,refitted=0,built=0;
 for(const t of triangles){let g=groups.get(t.instanceID);if(!g){g={sourceID:t.instanceID,triangles:[],inverse:t.inverseWorld,blasID:t.blasID};groups.set(t.instanceID,g);}g.triangles.push(t);}
 if(groups.size<2)return updatedBVH(triangles,old);
 for(const g of groups.values()){
  const key=g.blasID+':'+g.triangles.map(t=>t.localID).join(','),previous=old?.blases?.get(key);let b=blases.get(key);
  if(!b){const points=g.triangles.flatMap(t=>t.localPoints.flat());if(previous&&points.length===previous.points.length&&points.every((v,i)=>v===previous.points[i])){b=previous;reused++;}else{const local=g.triangles.map(t=>({points:t.localPoints,center:t.localPoints[0].map((v,i)=>(v+t.localPoints[1][i]+t.localPoints[2][i])/3),sourceID:t.localID})),update=updatedBVH(local,previous?.cache);b={points,tree:update.tree,cache:update.cache};if(update.refit)refitted++;else built++;}blases.set(key,b);}g.blas=b;
  const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(const t of g.triangles)for(const p of t.points)for(let i=0;i<3;i++){lo[i]=Math.min(lo[i],p[i]);hi[i]=Math.max(hi[i],p[i]);}g.points=[lo,hi];g.center=lo.map((v,i)=>(v+hi[i])/2);
 }
 const top=updatedBVH([...groups.values()],old?.top,1),nodes=top.tree.nodes.map(n=>({...n})),ordered=[],roots=new Map(),topCount=nodes.length;
 for(const b of blases.values()){const start=nodes.length;roots.set(b,start);for(const n of b.tree.nodes)nodes.push({...n,skip:n.skip+start});}
 for(const g of top.tree.triangles){g.transform=nodes.length;const m=g.inverse;nodes.push({raw:[m[0],m[4],m[8],m[12],m[1],m[5],m[9],m[13],m[2],m[6],m[10],m[14]]});g.base=ordered.length;for(const i of g.blas.cache.order)ordered.push(g.triangles[i]);}
 for(let i=0;i<topCount;i++){const n=nodes[i];if(n.count){const g=top.tree.triangles[n.start];n.count=-1;n.start=roots.get(g.blas);n.meta=[g.transform,g.base,n.start+g.blas.tree.nodes.length];}else n.meta=[0,0,0];}
 return {tree:{nodes,triangles:ordered},cache:{top:top.cache,blases},refit:top.refit&&built===0,stats:{instances:groups.size,blas:blases.size,reusedBLAS:reused,refittedBLAS:refitted,builtBLAS:built,tlasNodes:topCount}};
}
