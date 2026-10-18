import {differentialCases431,differentialOperations431} from './ray-differentials-fixture-431.mjs';
const added=['exp2','log2','smoothstep','normalMap','fresnel','radialGradient','linearGradient'];
export const differentialOperations443=[...differentialOperations431,...added];
function evaluate(key,[a,b,c,d]){const sat=v=>Math.min(1,Math.max(0,v)),unit=v=>{const n=Math.hypot(...v);return v.map(x=>x/n);};switch(key){
 case'exp2':return a.map(v=>2**v);case'log2':return a.map(v=>Math.log2(Math.max(v,1e-6)));case'power':return a.map((v,i)=>Math.max(v,0)**b[i]);
 case'smoothstep':return a.map((v,i)=>{const t=sat((c[i]-v)/Math.max(b[i]-v,1e-6));return t*t*(3-2*t);});
 case'normalMap':{const v=[(a[0]*2-1)*b[0],(a[1]*2-1)*b[0],a[2]*2-1],n=Math.hypot(...v);return [...(n>0?v.map(x=>x/Math.max(n,1e-20)):[0,0,1]),0];}
 case'fresnel':{const x=unit(a.slice(0,3)),y=unit(b.slice(0,3)),dot=x.reduce((s,v,i)=>s+v*y[i],0);return Array(4).fill(d[0]+(1-d[0])*(1-sat(dot))**Math.max(c[0],.0001));}
 case'radialGradient':return Array(4).fill(sat(1-Math.hypot(a[0]-b[0],a[1]-b[1])/Math.max(c[0],1e-6)));
 case'linearGradient':return Array(4).fill(sat((a[0]-.5)*Math.cos(b[0])+(a[1]-.5)*Math.sin(b[0])+.5));default:throw Error(key);
}}
export function differentialCases443(){const rows=differentialCases431(),z=()=>Array(4).fill(0),add=(key,values,delta,label,tolerance)=>{values=values.map(v=>v.map(Math.fround));delta=delta.map(v=>v.map(Math.fround));const old=evaluate(key,values),next=evaluate(key,values.map((v,i)=>v.map((x,k)=>x+delta[i][k]))),expected=next.map((v,i)=>v-old[i]);if(!expected.every(Number.isFinite))throw Error(label);rows.push({key,label,values,delta,expected,meta:[2,differentialOperations443.indexOf(key),0,4],...(tolerance?{tolerance}:{})});};
 for(const key of added)for(let i=0;i<16;i++){const values=Array.from({length:4},(_,n)=>Array.from({length:4},(_,j)=>.2+((i*.61803398875+n*.213+j*.117)%1)*.6)),delta=Array.from({length:4},(_,n)=>Array.from({length:4},(_,j)=>Math.sin(i+1+n*7+j*3)*.01));add(key,values,delta,'ordinary443:'+i);}
 for(const key of [...added,'power']){const values=[[.8,.6,.9,.4],[.3,.7,.2,.6],[.6,.7,.5,.8],[.1,.1,.1,.1]],delta=[[1e-8,-1e-8,1e-8,-1e-8],z(),z(),z()];if(key==='power'){values[0]=[2,2,2,2];values[1]=[3,3,3,3];}if(key==='smoothstep'){values[0]=[0,0,0,0];values[1]=[1,1,1,1];delta[0]=z();delta[2]=[1e-8,-1e-8,1e-8,-1e-8];}if(key==='fresnel'){values[0]=[1,0,0,0];values[1]=[.3,1,0,0];delta[0]=[0,1e-8,0,0];}add(key,values,delta,'sub-ULP443:'+key,1e-10);}
 add('log2',[[.9e-6,1.1e-6,-1,.5],[1,1,1,1],z(),z()],[[.2e-6,-.2e-6,2,-.4999],z(),z(),z()],'log-clamp-crossing');
 add('power',[[-.1,.1,0,.5],[2,2,2,-2],z(),z()],[[.2,-.2,.01,-.49],[.1,.1,.1,.1],z(),z()],'power-zero-crossing',2e-3);
 add('smoothstep',[[0,0,1,1],[1,1,0,1.0000001],[.99,-.01,.9999999,1.00000005],z()],[[.02,-.02,-.0000001,0],[-.02,.02,.0000001,0],[.04,.04,.0000003,.0000001],z()],'smooth-boundary');
 add('normalMap',[[.5,.5,.5,0],[1,0,0,0],z(),z()],[[.01,-.02,.03,0],[.5,0,0,0],z(),z()],'neutral-decode-exit');
 add('normalMap',[[.5,.5,.6,0],[-1,0,0,0],z(),z()],[z(),[.1,0,0,0],z(),z()],'negative-strength');
 add('exp2',[[-10,10,-1,1],z(),z(),z()],[[.2,-.2,.125,.12499],z(),z(),z()],'exponential-polynomial-boundary');
 return rows;
}
