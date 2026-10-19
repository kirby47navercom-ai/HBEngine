// Independent frozen pre-change functions from a92dca1. Tests must remain
// runnable from a fresh checkout without ignored native/build snapshots.
export const fixedVectorReference846=Object.freeze({revision:'a92dca1',previousTrace:`vec4 hbPreviousGeometryTrace(vec3 origin,vec3 direction,float distance){
 if(!hbPreviousGeometryAvailable())return vec4(distance,-1,0,0);
 float pointer=hbGeometryLoad(hbPathFilter.w+1.0).w,count=hbGeometryLoad(hbPathFilter.w+2.0).w,node=0.0,closest=distance,triangle=-1.0;
 for(int priorWalk=0;priorWalk<min(4096,int(count));priorWalk++){
  if(node>=count)break;vec4 lower=hbGeometryLoad(pointer+node*3.0),upper=hbGeometryLoad(pointer+node*3.0+1.0),ids=hbGeometryLoad(pointer+node*3.0+2.0);float nearDistance=0.0,farDistance=closest;
  for(int axis=0;axis<3;axis++){if(abs(direction[axis])<1e-30){if(origin[axis]<lower[axis]||origin[axis]>upper[axis])farDistance=-1.0;}else{float a=(lower[axis]-origin[axis])/direction[axis],b=(upper[axis]-origin[axis])/direction[axis];nearDistance=max(nearDistance,min(a,b));farDistance=min(farDistance,max(a,b));}}
  if(nearDistance>farDistance){node=lower.w;continue;}
  for(int priorLeaf=0;priorLeaf<min(4,int(upper.w));priorLeaf++){float id=ids[priorLeaf],at=hbPathFilter.w+id*3.0;vec3 a=hbGeometryLoad(at).xyz,e1=hbGeometryLoad(at+1.0).xyz,e2=hbGeometryLoad(at+2.0).xyz,coordinates=hbRayTriangleCoordinates(e1,e2,origin-a,direction);{float x=coordinates.x,y=coordinates.y,t=coordinates.z;if(x>=0.0&&y>=0.0&&x+y<=1.0&&t>hbGeometryLimits.y&&t<closest){float cutoff=hbRayCutoff(id);if(cutoff<=0.0||hbRayPreviousField1TimeLod(id,origin+direction*t,-direction,0.0,vec2(hbForward.w,1)).w>=cutoff){closest=t;triangle=id;}}}}
  node+=1.0;
 }return vec4(closest,triangle,triangle>=0.0?1.0:0.0,node>=count?1.0:0.0);
}`,box:`vec2 hbRayBoxInterval(vec3 origin,vec3 direction,vec3 lower,vec3 upper,float distance){
 float nearAt=0.0,farAt=distance;
 for(int axis=0;axis<3;axis++){
  if(abs(direction[axis])<1e-30){if(origin[axis]<lower[axis]||origin[axis]>upper[axis])farAt=-1.0;}
  else{float a=(lower[axis]-origin[axis])/direction[axis],b=(upper[axis]-origin[axis])/direction[axis];nearAt=max(nearAt,min(a,b));farAt=min(farAt,max(a,b));}
 }return vec2(nearAt,farAt);
}`,previous:`vec3 hbRayPreviousSmoothNormalOffset(float id,vec3 point,vec3 offset){
 float at=hbRayAttributes(id);vec3 face=hbRayPreviousGeometric(id);if(at<=0.0)return face;float current=hbRayPreviousFramePointer(hbGeometryLoad(at+3.0).w),old=hbGeometryLoad(at+4.0).w;if(current== -2.0||old<=0.0)return vec3(0,0,0);
 vec3 weights=hbRayPreviousBaryOffset(id,point,offset),normal;
 if(current<-.5)normal=hbGeometryLoad(old).xyz*weights.x+hbGeometryLoad(old+1.0).xyz*weights.y+hbGeometryLoad(old+2.0).xyz*weights.z;
 else if(current>0.0){vec3 x=hbGeometryLoad(current).xyz,y=hbGeometryLoad(current+1.0).xyz,z=hbGeometryLoad(current+2.0).xyz,a=hbGeometryLoad(old).xyz,b=hbGeometryLoad(old+1.0).xyz,c=hbGeometryLoad(old+2.0).xyz;if(abs(dot(x,cross(y,z))*dot(a,cross(b,c)))<1e-20)return vec3(0,0,0);normal=vec3(0,0,0);for(int vertexIndex=0;vertexIndex<3;vertexIndex++){vec3 now=hbGeometryLoad(at+2.0+float(vertexIndex)).xyz,local=x*now.x+y*now.y+z*now.z,prior=a*local.x+b*local.y+c*local.z;if(dot(prior,prior)<1e-12)return vec3(0,0,0);normal+=normalize(prior)*weights[vertexIndex];}}
 else return face;
 if(dot(normal,normal)<1e-12)return face;normal=normalize(normal);return dot(normal,face)<0.0?-normal:normal;
}`});
export function restoreFixedVectorReference846(source,reference=fixedVectorReference846){
 let result=source,boxFunctions=0,previousFunctions=0,previousTraceFunctions=0;for(const key of ['previousTrace','previous','box']){const body=reference[key],signature=body.slice(0,body.indexOf('{')),token=signature.slice(0,signature.indexOf('(')+1);let cursor=0;while(true){const start=result.indexOf(token,cursor);if(start<0)break;const open=result.indexOf('{',start);if(result.slice(start,open)!==signature)throw Error('이전 벡터 검사의 함수 서명이 달라졌어요.');let depth=1,end=open+1;for(;end<result.length&&depth;end++){if(result[end]==='{')depth++;else if(result[end]==='}')depth--;}if(depth)throw Error('이전 벡터 검사의 함수가 닫히지 않았어요.');result=result.slice(0,start)+body+result.slice(end);cursor=start+body.length;if(key==='box')boxFunctions++;else if(key==='previous')previousFunctions++;else previousTraceFunctions++;}}return {source:result,boxFunctions,previousFunctions,previousTraceFunctions};
}
