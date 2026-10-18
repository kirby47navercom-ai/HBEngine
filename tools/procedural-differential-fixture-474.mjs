import {rayOperationExpressions} from '../prototype/ray-material-shader.js';import {checkerValue} from '../prototype/procedural-material.js';
import {rayDifferentialGLSL} from '../prototype/ray-program-differentials.js';
export function proceduralCases474(){
 const rows=[],zero=[0,0,0,0],add=(kind,a,b,da,db,label,extra={})=>rows.push({kind,a:a.map(Math.fround),b:b.map(Math.fround),da:da.map(Math.fround),db:db.map(Math.fround),label,...extra});
 for(let i=0;i<24;i++){const a=[i*.37-4.1,i*.19-1.7,0,0],b=[i%3+.7,i%4+.3,0,0],da=[Math.sin(i)*.8,Math.cos(i)*.6,0,0],db=[.013,-.021,0,0];add('checker',a,b,da,db,'cell/negative/scale:'+i);add('noise',a,b,da,db,'cell/negative/scale:'+i);}
 for(const x of [1e7,-1e7,16777216,-16777216])for(const dx of [-.125,.125,-1.125,1.125])add('checker',[x,0,0,0],[1,1,0,0],[dx,0,0,0],zero,'subULP checker:'+x+':'+dx,{expected:((Math.floor(dx)%2)+2)%2});
 for(const x of [0,1,-1])for(const dx of [-1e-10,1e-10])add('noise',[x,0,0,0],[1,1,0,0],[dx,0,0,0],zero,'tiny boundary:'+x+':'+dx,{tinyBoundary:true,tolerance:1e-24});
 for(const x of [1e7,-1e7])for(const dx of [-.125,.125])add('noise',[x,0,0,0],[1,1,0,0],[dx,0,0,0],zero,'subULP noise:'+x+':'+dx);
 for(const x of [33554432,-33554432])for(const y of [-1,1])add('checker',[x,y,0,0],[1,1,0,0],zero,zero,'large-axis parity:'+x+':'+y,{legacyWasWrong:true});
 for(let i=0;i<24;i++)add('cell',[.11+i*.023,.17+i*.013,0,0],[.1,.8,.3,.7],[Math.sin(i)*.12,Math.cos(i)*.15,0,0],zero,'polynomial:'+i,{dh:[.03,-.07,.02,-.01].map(Math.fround)});
 add('cell',[.375,.75,0,0],[.1,.8,.3,.7],[1e-10,-2e-10,0,0],zero,'subULP polynomial',{dh:zero,tolerance:1e-14});return rows;
}
const interp=(f,h)=>{const x=f[0]*f[0]*(3-2*f[0]),y=f[1]*f[1]*(3-2*f[1]);return h[0]*(1-x)*(1-y)+h[1]*x*(1-y)+h[2]*(1-x)*y+h[3]*x*y;},frac=x=>x-Math.floor(x),mod2=x=>x-2*Math.floor(x/2);
export function checkProcedural474(rows,values){
 const errors={checker:0,cell:0,noise:0},details=[];if(values.length!==rows.length*16)throw Error('procedural output count');for(let n=0;n<rows.length;n++){
  const r=rows[n],v=values.slice(n*16,(n+1)*16);if(!v.every(Number.isFinite))throw Error('nonfinite '+r.label);let expected;
  if(r.kind==='checker'){const p=[Math.fround(r.a[0]*r.b[0]),Math.fround(r.a[1]*r.b[1])],dp=p.map((_,k)=>r.a[k]*r.db[k]+r.da[k]*r.b[k]+r.da[k]*r.db[k]);const current=checkerValue(p,[1,1]);if(v[4]!==current)throw Error(JSON.stringify({label:r.label,current,actual:v[4]}));if(r.legacyWasWrong&&(current!==1||v[8]!==0))throw Error('legacy bug not reproduced '+r.label);expected=r.expected??checkerValue(p.map((v,k)=>v+dp[k]),[1,1])-current;}
  else if(r.kind==='cell')expected=interp([r.a[0]+r.da[0],r.a[1]+r.da[1]],r.b.map((v,k)=>v+r.dh[k]))-interp(r.a,r.b);
  else{const h=v.slice(4,8),next=v.slice(8,12),f=v.slice(12,14),dp=v.slice(14,16),p=[Math.fround(r.a[0]*r.b[0]),Math.fround(r.a[1]*r.b[0])],wanted=p.map(x=>Math.fround(frac(x)));if(f.some((x,k)=>x!==wanted[k]))throw Error('base coordinate changed '+r.label);const exactDP=p.map((_,k)=>r.a[k]*r.db[0]+r.da[k]*r.b[0]+r.da[k]*r.db[0]);if(dp.some((x,k)=>Math.abs(x-exactDP[k])>2e-6))throw Error('relative coordinate lost '+r.label);
   if(r.tinyBoundary){const epsilon=Math.abs(r.da[0]),weight=epsilon*epsilon*(3-2*epsilon);expected=(r.da[0]<0?next[0]-h[0]:h[1]-h[0])*weight;}else expected=interp([frac(f[0]+exactDP[0]),frac(f[1]+exactDP[1])],next)-interp(f,h);
  }
  const error=Math.max(...v.slice(0,4).map(x=>Math.abs(x-expected))),tolerance=r.tolerance??2e-5;if(error>tolerance)throw Error(JSON.stringify({kind:r.kind,label:r.label,actual:v.slice(0,4),expected,error,tolerance,controls:v.slice(4)}));errors[r.kind]=Math.max(errors[r.kind],error);details.push({kind:r.kind,label:r.label,expected,actual:v[0],error,...(r.kind==='checker'?{currentValue:v[4],legacyValue:v[8],legacyWasWrong:!!r.legacyWasWrong}:{})});
 }return{errors,details};
}
export function proceduralShader474(){return rayDifferentialGLSL+`
float hbRayMod(float a,float b){return a-b*floor(a/b);}
vec4 hbRayScalar(float v){return vec4(v,v,v,v);}

vec4 hbProceduralProbe(vec4 a,vec4 b,vec4 da,vec4 db,vec4 dh,int kind,int part){
 if(kind==0){if(part==1)return ${rayOperationExpressions.checker};if(part==2)return hbRayScalar(hbRayMod(dot(floor(a.xy*b.xy),vec2(1,1)),2.0));return vec4(hbRayDeltaChecker(a,b,da,db),hbRayDeltaChecker(a,b,da,db),hbRayDeltaChecker(a,b,da,db),hbRayDeltaChecker(a,b,da,db));}
 if(kind==1){float v=hbRayDeltaNoiseCell(a.xy,da.xy,b,dh);return vec4(v,v,v,v);}
 vec2 p=a.xy*b.x,dp=a.xy*db.x+da.xy*b.x+da.xy*db.x,cell=floor(p),f=fract(p),steps=floor(f+dp);if(part==1)return hbRayDeltaNoiseCorners(cell);if(part==2)return hbRayDeltaNoiseCorners(cell+steps);if(part==3)return vec4(f,dp);float v=hbRayDeltaNoise(a,b,da,db);return vec4(v,v,v,v);
}
`;}
