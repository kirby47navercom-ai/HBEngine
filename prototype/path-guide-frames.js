import {Matrix4} from 'three';
// Only curved temporal filtering owns these six float4s per rigid instance.
export function guideFrames(triangles,previous,start,attributes,attributeStart,values,materialsOffset){
 const current=new Map();if(!previous)return {data:new Float32Array(0),current};
 for(const t of triangles)if(t.instanceID&&t.inverseWorld&&!t.deformed)current.set(t.instanceID,t.inverseWorld);
 const data=new Float32Array(current.size*24),pointers=new Map();let cursor=0;
 for(const[id,inverse]of current){const forward=new Matrix4().fromArray(inverse).invert().elements,old=previous.get(id),row=(m,at)=>data.set([m[0],m[4],m[8],0,m[1],m[5],m[9],0,m[2],m[6],m[10],0],at);if(inverse.length!==16||!inverse.every(Number.isFinite)||old&&(old.length!==16||!old.every(Number.isFinite)))throw Error('광선 포즈 행렬을 확인하세요.');row(forward,cursor);if(old)row(old,cursor+12);pointers.set(id,[start+cursor/4,old?start+cursor/4+3:0]);cursor+=24;}
 if(!data.every(Number.isFinite))throw Error('광선 포즈 행렬이 float 범위를 넘었어요.');
 for(let i=0;i<triangles.length;i++){const pointer=values[(materialsOffset+i*2+1)*4+2],pair=pointers.get(triangles[i].instanceID);if(pointer>0&&pair){const at=(pointer-attributeStart)*4;attributes[at+15]=pair[0];attributes[at+19]=pair[1];}}
 return {data,current};
}
