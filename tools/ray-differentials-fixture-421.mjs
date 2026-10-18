import {differentialCases418,differentialOperations418} from './ray-differentials-fixture-418.mjs';
export const differentialOperations421=[...differentialOperations418,'floor','ceil','fraction','step','clamp','sign','length','squareRoot'];
function evaluate(key,[a,b,c]){switch(key){case'absolute':return a.map(Math.abs);case'min':return a.map((v,i)=>Math.min(v,b[i]));case'max':return a.map((v,i)=>Math.max(v,b[i]));case'sine':return a.map(Math.sin);case'cosine':return a.map(Math.cos);case'floor':return a.map(Math.floor);case'ceil':return a.map(Math.ceil);case'fraction':return a.map(v=>v-Math.floor(v));case'step':return a.map((v,i)=>b[i]>=v?1:0);case'clamp':return a.map((v,i)=>Math.min(c[i],Math.max(b[i],v)));case'sign':return a.map(Math.sign);case'length':return Array(4).fill(Math.hypot(...a));case'squareRoot':return a.map(v=>Math.sqrt(Math.max(v,0)));default:throw Error(key);}}
export function differentialCases421(){const rows=differentialCases418(),zero=()=>Array(4).fill(0),add=(key,values,delta,label)=>{values=values.map(r=>r.map(Math.fround));delta=delta.map(r=>r.map(Math.fround));const base=evaluate(key,values),shifted=evaluate(key,values.map((r,i)=>r.map((v,j)=>v+delta[i][j])));rows.push({key,label,values,delta,expected:shifted.map((v,i)=>v-base[i]),meta:[2,differentialOperations421.indexOf(key),0,0]});};
 for(const key of differentialOperations421.slice(20))for(let i=0;i<16;i++){const a=Array.from({length:4},(_,j)=>.2+Math.sin(i*.7+j)*.6),b=Array(4).fill(.1),c=Array(4).fill(.9),da=Array.from({length:4},(_,j)=>Math.cos(i+j)*.07);add(key,[a,b,c,zero()],[da,zero(),zero(),zero()],'ordinary421:'+i);}
 const large=[1e7,-1e7,1e7,-1e7],delta=[.078125,-.0390625,-.01953125,.009765625];
 for(const key of ['absolute','floor','ceil','fraction','length'])add(key,[large,zero(),zero(),zero()],[delta,zero(),zero(),zero()],'sub-ULP-large');
 for(const key of ['min','max','step'])add(key,[large,large,zero(),zero()],[delta,delta.map(v=>-v),zero(),zero()],'large-tie-crossing');
 add('clamp',[large,large,large.map(v=>v+10),zero()],[delta,delta.map(v=>-v),zero(),zero()],'large-clamp-crossing');
 add('squareRoot',[Array(4).fill(1e7),zero(),zero(),zero()],[Array(4).fill(.5),zero(),zero(),zero()],'sub-ULP-root');
 for(const key of ['sine','cosine'])add(key,[[10000,-10000,100000,-100000],zero(),zero(),zero()],[[.0002,-.0003,.0004,-.0005],zero(),zero(),zero()],'sub-ULP-phase');
 for(const [a,da,label,tolerance]of [
  [[0,0,0,0],[0,0,0,0],'zero',2e-5],
  [[2e-7,0,0,0],[-3e-7,1e-7,0,0],'epsilon-clamp',2e-5],
  [[2e-7,0,0,0],[2e-6,1e-6,0,0],'epsilon-crossing',2e-5],
  [[1e7,0,0,0],[0,.078125,0,0],'sub-ULP-normalization',1e-12]
 ]){const values=[a,zero(),zero(),zero()].map(r=>r.map(Math.fround)),delta=[da,zero(),zero(),zero()].map(r=>r.map(Math.fround)),normalize=v=>{const n=Math.max(Math.hypot(...v),1e-6);return v.map(x=>x/n);},base=normalize(values[0]),shift=normalize(values[0].map((v,i)=>v+delta[0][i]));rows.push({key:'normalize',label,values,delta,expected:shift.map((v,i)=>v-base[i]),meta:[2,differentialOperations421.indexOf('normalize'),0,4],tolerance});}
 for(const key of ['normalize','length'])for(const[a,da]of [[2,-3],[-2,3],[0,0],[1e7,.078125]]){const values=[Array(4).fill(a),zero(),zero(),zero()],delta=[Array(4).fill(da),zero(),zero(),zero()],fn=key==='normalize'?Math.sign:Math.abs;rows.push({key,label:'scalar-context',values,delta,expected:Array(4).fill(fn(a+da)-fn(a)),meta:[2,differentialOperations421.indexOf(key),0,1]});}
 return rows;
}
