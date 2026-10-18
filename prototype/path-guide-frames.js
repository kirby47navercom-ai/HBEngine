import {Matrix4} from 'three';
// Only curved temporal filtering owns these six float4s per rigid instance.
export function guideFrames(triangles,previous,start,attributes,attributeStart,values,materialsOffset,previousNormals=null){
 const current=new Map(),normals=new Map();if(!previous)return {data:new Float32Array(0),current,normals,normalsChanged:false};
 for(const t of triangles)if(t.instanceID&&t.inverseWorld&&!t.deformed)current.set(t.instanceID,t.inverseWorld);
 const deformed=triangles.filter(t=>t.deformed&&t.normals);let normalsChanged=false;
 for(const t of deformed){if(!t.sourceID||t.normals.length!==3||t.normals.some(n=>n.length!==3||!n.every(Number.isFinite)))throw Error('이전 변형 법선을 확인하세요.');const next=Float32Array.from(t.normals.flat()),old=previousNormals?.get(t.sourceID);if(!next.every(Number.isFinite)||old&&(old.length!==9||!old.every(Number.isFinite)))throw Error('변형 법선 이력 범위를 확인하세요.');normals.set(t.sourceID,next);if(!old||next.some((v,i)=>v!==old[i]))normalsChanged=true;}
 const data=new Float32Array(current.size*24+deformed.length*12),pointers=new Map(),normalPointers=new Map();let cursor=0;
 for(const[id,inverse]of current){const forward=new Matrix4().fromArray(inverse).invert().elements,old=previous.get(id),row=(m,at)=>data.set([m[0],m[4],m[8],0,m[1],m[5],m[9],0,m[2],m[6],m[10],0],at);if(inverse.length!==16||!inverse.every(Number.isFinite)||old&&(old.length!==16||!old.every(Number.isFinite)))throw Error('광선 포즈 행렬을 확인하세요.');row(forward,cursor);if(old)row(old,cursor+12);pointers.set(id,[start+cursor/4,old?start+cursor/4+3:0]);cursor+=24;}
 for(const t of deformed){const old=previousNormals?.get(t.sourceID);normalPointers.set(t.sourceID,[-1,old?start+cursor/4:0]);if(old)for(let i=0;i<3;i++)data.set(old.subarray(i*3,i*3+3),cursor+i*4);cursor+=12;}
 if(!data.every(Number.isFinite))throw Error('광선 포즈 행렬이 float 범위를 넘었어요.');
 for(let i=0;i<triangles.length;i++){const pointer=values[(materialsOffset+i*2+1)*4+2],pair=normalPointers.get(triangles[i].sourceID)||pointers.get(triangles[i].instanceID);if(pointer>0&&pair){const at=(pointer-attributeStart)*4,material=triangles[i].rayMaterial,unsupported=material?.programs?.some((p,field)=>field!==3&&p.some(op=>[3,4,5].includes(op[0]))),unsafe=material?.normalConnected&&(material.programs?.[3]||[]).some(op=>[3,4,5].includes(op[0]));attributes[at+15]=unsupported?-2:unsafe?(pair[0]===-1?-3:-pair[0]):pair[0];attributes[at+19]=pair[1];}}
 return {data,current,normals,normalsChanged};
}
