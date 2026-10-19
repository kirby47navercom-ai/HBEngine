import assert from 'node:assert/strict';
import * as G from 'three';
export const lensPixels662=Object.freeze([7,8,9].flatMap(y=>[7,8,9].map(x=>Object.freeze({x,y,uv:Object.freeze([(x+.5)/16,(y+.5)/16])}))));
// Independent analytic mirror plane followed by the room's inner front wall.
// Does not call production trace, coordinate, normal or footprint helpers.
export function expectedLensRadius662(backend,uv,scale=1){
 const camera=new G.PerspectiveCamera(60,1,.1*scale,30*scale);camera.coordinateSystem=backend==='webgl'?2000:2001;camera.position.set(.05*scale,.03*scale,4*scale);camera.lookAt(0,0,0);camera.updateProjectionMatrix();camera.updateMatrixWorld();
 const inverse=new G.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse).invert(),world=(p,d)=>new G.Vector3(p[0]*2-1,backend==='webgl'?p[1]*2-1:1-p[1]*2,backend==='webgl'?d*2-1:d).applyMatrix4(inverse),direction=p=>world(p,.9999).sub(camera.position).normalize(),d=direction(uv),near=world(uv,0),right=world([uv[0]+.01,uv[1]],0).sub(near).normalize(),up=right.clone().cross(camera.getWorldDirection(new G.Vector3())).normalize(),focus=camera.position.clone().addScaledVector(d,4*scale/d.dot(camera.getWorldDirection(new G.Vector3()))),normal=new G.Vector3(Math.sin(.12),0,Math.cos(.12));
 const receiver=(origin,ray)=>{const t=-normal.dot(origin)/normal.dot(ray),p=origin.clone().addScaledVector(ray,t),out=ray.clone().reflect(normal);assert(t>0&&Math.abs(p.y)<2*scale);const hit=p.clone().addScaledVector(out,(6.95*scale-p.z)/out.z);assert(Math.abs(hit.x)<4.95*scale&&Math.abs(hit.y)<4.95*scale,'analytic receiver must be the inner front wall');return hit;};
 const p=receiver(camera.position,d),x=receiver(camera.position,direction([uv[0]+1/16,uv[1]])).sub(p),y=receiver(camera.position,direction([uv[0],uv[1]+1/16])).sub(p),a=x.dot(x),b=x.dot(y),c=y.dot(y),det=a*c-b*b;
 const radii=[right,up].map(axis=>{const eye=camera.position.clone().addScaledVector(axis,.03*scale),hit=receiver(eye,focus.clone().sub(eye).normalize()).sub(p),u=(c*x.dot(hit)-b*y.dot(hit))/det,v=(a*y.dot(hit)-b*x.dot(hit))/det;return Math.hypot(u,v);});
 return Math.min(32,Math.max(...radii));
}
