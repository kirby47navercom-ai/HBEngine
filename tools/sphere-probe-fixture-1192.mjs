const f=Math.fround,unit=v=>{const n=Math.hypot(...v);return n?v.map(x=>x/n):[0,0,0];};
export function sphereProbeFixture1192(){
 const cases=[],rays=[[1,0,0],[-1,0,0],[0,1,0],[0,0,-1],[1,2,-3],[1e-24,-2e-24,3e-24],[1e24,-2e24,3e24],[0,0,0],[4,-3,0],[4,-3+2**-20,0]],positions=[[0,0,0],[.5,.1,0],[.9,.1,.1],[1,0,0],[1.1,0,0],[.8,.8,0],[-.95,0,0],[.1,-.2,.3]];
 for(const rad of [.001,1,1e6])for(const origin of [[0,0,0],[3,-2,1]])for(const p of (rad===1e6?[...positions,[.6,.8,0],[-.6,-.8,0]]:positions))for(const dir of rays){
  const radius=f(rad),center=origin.map(f),point=p.map((n,i)=>f(center[i]+n*radius)),capture=center.map((v,i)=>f(v+[.2,-.1,.3][i]*radius)),ray=dir.map(f),blend=f(radius*.2),q=point.map((v,i)=>v-center[i]),inside=Math.hypot(...q)<=radius,weight=inside?Math.max(0,Math.min(1,(radius-Math.hypot(...q))/blend)):0,n=unit(ray);let projected=[...ray];
  if(inside&&Math.hypot(...ray)>0){const along=q.reduce((v,x,i)=>v+x*n[i],0),disc=Math.max(0,along*along+radius*radius-q.reduce((v,x)=>v+x*x,0)),distance=-along+Math.sqrt(disc),hit=point.map((v,i)=>v+n[i]*distance-capture[i]);if(Math.hypot(...hit)>1e-10)projected=hit;}
  cases.push({radius,center,point,capture,ray,blend,expected:[...unit(projected),weight]});
 }return cases;
}
