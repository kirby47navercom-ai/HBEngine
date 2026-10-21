export function defaultsFor(type){ return {bool:false,int:0,float:0,string:'',vec2:[0,0],vec3:[0,0,0],color:[1,1,1,1],transform:{position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]},object:null,hit:{hit:false,position:[0,0,0],normal:[0,1,0],actor:null}}[type]; }
export function validValue(type,value){
  const vector=(size)=>Array.isArray(value)&&value.length===size&&value.every(Number.isFinite);
  if(type==='bool')return typeof value==='boolean';if(type==='int')return Number.isInteger(value)&&value>=-2147483648&&value<=2147483647;if(type==='float')return Number.isFinite(value);if(type==='string')return typeof value==='string'&&value.length<=4096;
  if(type==='vec2')return vector(2);if(type==='vec3')return vector(3);if(type==='color')return vector(4)&&value.every(v=>v>=0&&v<=1);if(type==='object')return value===null||(typeof value==='string'&&value.length<=200);
  if(type==='transform')return value&&['position','rotation','scale'].every(k=>validValue('vec3',value[k]));if(type==='hit')return value&&validValue('bool',value.hit)&&validValue('vec3',value.position)&&validValue('vec3',value.normal)&&validValue('object',value.actor);return false;
}
