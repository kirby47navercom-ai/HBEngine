import * as THREE from 'three';
import {makeSceneComponent} from '../prototype/scene-components.js';
import {reflectionProbeVolume,reflectionProbeSphereVolume} from '../prototype/reflection-probe-volume.js';
import {probeInfluenceFields,probeInfluenceSettings} from '../prototype/reflection-probe-influence.js';

export const influenceFields1426=['center','minimum','maximum','options','localX','localY','localZ','faceScale','projectionMinimum','projectionMaximum','projectionX','projectionY','projectionZ',...probeInfluenceFields];
const clamp=x=>Math.max(0,Math.min(1,x));
// Independent plane-distance oracle. Production affine rows/weight routines are
// not used to calculate the expected distance or angular/normal mask.
export function probeInfluenceOracle1426(matrix,p,point,normal,ray,center){
 const v=x=>new THREE.Vector3(...x),at=v(point),box=new THREE.Box3(v([-2,-3,-4]),v([2,3,4])),local=at.clone().applyMatrix4(matrix.clone().invert());
 const advanced=p.volumeShape==='box'&&p.advancedBlend,planes=[];
 for(let i=0;i<3;i++){const n=new THREE.Vector3().setComponent(i,1);planes.push({axis:i,sign:1,plane:new THREE.Plane(n.clone().negate(),box.max.getComponent(i)).applyMatrix4(matrix)},{axis:i,sign:-1,plane:new THREE.Plane(n,-box.min.getComponent(i)).applyMatrix4(matrix)});}
 const distances=planes.map(f=>f.plane.distanceToPoint(at));
 const radial=at.distanceTo(v([0,0,0])),distance=p.volumeShape==='sphere'?4-radial:Math.min(...distances);if(distance < -1e-10)return 0;
 let spatial=advanced?Math.min(...planes.map((f,i)=>{const b=(f.sign>0?p.blendPositive:p.blendNegative)[f.axis];return b>0?clamp(Math.max(0,distances[i])/b):1;})):p.blendDistance>0?clamp(Math.max(0,distance)/p.blendDistance):1;
 if(advanced&&v(ray).lengthSq()>0){
  const direction=new THREE.Vector3(...[0,1,2].map(axis=>-planes[axis*2].plane.normal.dot(v(ray)))).normalize();let mask=0;
  for(let axis=0;axis<3;axis++){const d=direction.getComponent(axis);mask+=clamp((4*d-1)*p.fadePositive[axis])+clamp((-4*d-1)*p.fadeNegative[axis]);}spatial*=clamp(mask);
 }
 const np=advanced?p.blendNormalPositive:[p.blendNormalDistance,p.blendNormalDistance,p.blendNormalDistance],nn=advanced?p.blendNormalNegative:[p.blendNormalDistance,p.blendNormalDistance,p.blendNormalDistance];
 const inner=p.volumeShape==='sphere'?distance>=np[0]:planes.every((f,i)=>distances[i]>=(f.sign>0?np:nn)[f.axis]);
 if(!inner&&v(normal).lengthSq()>0&&at.distanceToSquared(v(center))>0){const cosine=v(normal).normalize().dot(at.clone().sub(v(center)).normalize());spatial*=clamp((.6-cosine)/.4);}
 return spatial;
}
export function probeInfluenceFixture1426(){
 const matrices=[new THREE.Matrix4(),new THREE.Matrix4().compose(new THREE.Vector3(1,-2,3),new THREE.Quaternion().setFromEuler(new THREE.Euler(.2,.5,-.4)),new THREE.Vector3(-2,.5,3)),new THREE.Matrix4().set(1,.2,.1,2,0,2,.3,1,0,0,-1,3,0,0,0,1)];
 const rows=[],directions=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1],[1,1,1],[.3,.4,.5],[0,0,0]],normals=[[1,0,0],[-1,0,0],[0,1,0],[0,0,1],[0,0,0]];
 for(let shape=0;shape<2;shape++)for(const matrix of shape?[new THREE.Matrix4()]:matrices)for(let mode=0;mode<4;mode++){
  const p=makeSceneComponent('ReflectionProbe',{volumeShape:shape?'sphere':'box',advancedBlend:!!(mode&1),blendDistance:.8,blendPositive:[0,2,3],blendNegative:[1,0,4],fadePositive:[0,.3,1],fadeNegative:[1,.7,0],blendNormalDistance:mode&2?2:0,blendNormalPositive:mode&2?[1,2,3]:[0,0,0],blendNormalNegative:mode&2?[3,2,1]:[0,0,0]}).properties;
  const b=shape?reflectionProbeSphereVolume([0,0,0],4):reflectionProbeVolume(matrix,[-2,-3,-4],[2,3,4]),center=shape?[.2,0,0]:new THREE.Vector3(.2,-.1,.4).applyMatrix4(matrix).toArray(),probe={p,localBox:b,center};
  for(const local of [[0,0,0],[1.9,0,0],[-1.9,1,0],[0,2.5,0],[0,0,3.5],[2.2,0,0],[4.2,0,0],[2,0,0]])for(const ray of directions)for(const normal of normals){
   if(!shape&&!matrix.equals(new THREE.Matrix4())&&local[0]===2)continue;
   const point=shape?local:new THREE.Vector3(...local).applyMatrix4(matrix).toArray(),expected=probeInfluenceOracle1426(matrix,p,point,normal,ray,center),influence=probeInfluenceSettings(p),settings={center:[...center,1],minimum:[...b.minimum,p.blendDistance],maximum:[...b.maximum,0],options:[1,0,1,shape?3:1],localX:b.localX,localY:b.localY,localZ:b.localZ,faceScale:b.faceScale,projectionMinimum:[-1,-1,-1,0],projectionMaximum:[1,1,1,0],projectionX:[1,0,0,0],projectionY:[0,1,0,0],projectionZ:[0,0,1,0],...influence};
   rows.push({probe,point,normal,ray,expected,settings});
  }
 }
 const count=rows.length,width=4096,height=Math.ceil(count*22/width),data=new Float32Array(width*height*4);
 rows.forEach((row,i)=>{for(let j=0;j<influenceFields1426.length;j++)data.set(row.settings[influenceFields1426[j]],(i*22+j)*4);data.set([...row.point,0],(i*22+19)*4);data.set([...row.normal,0],(i*22+20)*4);data.set([...row.ray,0],(i*22+21)*4);});
 return {count,width,height,data:[...data],fields:influenceFields1426,rows};
}
