export function normalRangeFixture1030(){
 const inputs=[];for(const color of [[1,.5,.5],[.75,.25,.5],[.5,.5,.5],[.5,.5,0],[.5,.5,1],[.6,.3,.8],[.6,.3,.5]])for(const strength of [0,1,-1,1e-30,-1e-30,1e30,-1e30])inputs.push([...color,strength].map(Math.fround));
 const expected=inputs.map(v=>{const n=[(v[0]*2-1)*v[3],(v[1]*2-1)*v[3],v[2]*2-1],size=Math.hypot(...n);return [...(size?n.map(x=>x/size):[0,0,1]),1];});return{inputs,expected};
}
