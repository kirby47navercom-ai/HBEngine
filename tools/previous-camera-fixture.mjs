import * as THREE from 'three';
export function previousCameraFixtures(){
 const rows=[];for(const orthographic of[false,true])for(const zeroToOne of[false,true])for(const offset of[false,true]){
  const c=orthographic?new THREE.OrthographicCamera(-7,9,5,-3,.1,800):new THREE.PerspectiveCamera(63,16/9,.1,800);c.position.set(4,-3,7);c.lookAt(-2,1,-8);if(offset)c.setViewOffset(1600,900,210,130,1000,650);c.updateMatrixWorld(true);
  const vp=new THREE.Matrix4().multiplyMatrices(c.projectionMatrix,c.matrixWorldInverse);if(zeroToOne)vp.premultiply(new THREE.Matrix4().set(1,0,0,0,0,1,0,0,0,0,.5,.5,0,0,0,1));const inverse=vp.clone().invert(),coordinates=zeroToOne?[1,0,-2,1]:[2,-1,2,-1],at=[.78,.23],size=[640,360],world=(uv,d)=>new THREE.Vector3(uv[0]*2-1,uv[1]*coordinates[2]+coordinates[3],d*coordinates[0]+coordinates[1]).applyMatrix4(inverse),near=world(at,0),far=world(at,.9999),eye=c.getWorldPosition(new THREE.Vector3()),direction=far.clone().sub(eye).normalize(),dx=world([at[0]+1/size[0],at[1]],.9999).sub(eye).normalize(),dy=world([at[0],at[1]+1/size[1]],.9999).sub(eye).normalize(),width=orthographic?Math.max(world([at[0]+1/size[0],at[1]],0).distanceTo(near),world([at[0],at[1]+1/size[1]],0).distanceTo(near)):0,spread=orthographic?0:Math.max(dx.distanceTo(direction),dy.distanceTo(direction)),point=near.clone().lerp(far,.017).toArray(),expected=[...(orthographic?c.getWorldDirection(new THREE.Vector3()).negate():eye).toArray(),1,width,spread,0,0];
  rows.push({orthographic,zeroToOne,offset,vp:vp.toArray(),coordinates,size,point,expected});
 }return rows;
}
