import * as THREE from 'three';
import {timedNormalFixture} from './rendering-187-fixture.mjs';
export function normalHistoryFixture403(){
 const f=timedNormalFixture('normal');
 try{
  f.texture.type=THREE.FloatType;f.texture.image={data:new Float32Array([1,.5,.5,1,0,.5,.5,1]),width:2,height:1};f.texture.generateMipmaps=true;f.texture.minFilter=THREE.LinearMipmapLinearFilter;f.texture.magFilter=THREE.LinearFilter;f.texture.wrapS=f.texture.wrapT=THREE.RepeatWrapping;f.texture.needsUpdate=true;
  const pack=p=>({data:[...p.data],width:p.width,height:p.height,rayInfo:p.rayInfo,geometryInfo:[p.width,p.height,p.nodeCount,p.triangleOffset],geometryRecords:p.geometryRecords,transport:[p.materialsOffset,p.transportVersion,0,32],pathFilter:[.8,0,1,p.motionOffset],forward:[0,0,-1,p.previousMaterialTime??0]});
  const p=f.prepare(0),triangle=p.frameTriangles[0],source=triangle.sourceID,point=triangle.points.reduce((out,p,i)=>out.map((v,k)=>v+p[k]*[.1,.2,.7][i]),[0,0,0]),prior=pack(p);f.world.commit();f.mesh.position.set(1,.4,.2);f.mesh.rotation.set(.2,.5,-.3);f.mesh.scale.set(-1.2,.8,1.1);const now=f.prepare(.5);
  return {mode:'opposing-float-normal-mip',prior,current:pack(now),id:now.frameTriangles.findIndex(t=>t.sourceID===source),point,view:[0,0,1],width:2.125,currentWidth:.01};
 }finally{f.dispose();}
}
