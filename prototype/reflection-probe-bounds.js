import {Box3} from 'three';

const geometryBounds=new WeakMap();
// Static geometry only: deformation/instances need their own current bounds.
// Cache by the position buffer/version; applying the world matrix visits eight
// corners, never every vertex during an unchanged frame.
export function reflectionProbeMeshBounds(mesh,target=new Box3()){
 const geometry=mesh.geometry,position=geometry?.attributes.position;
 if(!position||mesh.isSkinnedMesh||mesh.isInstancedMesh||mesh.morphTargetInfluences?.some(v=>v!==0))return null;
 const data=position.isInterleavedBufferAttribute?position.data:position;
 let cached=geometryBounds.get(geometry);
 if(!cached||cached.position!==position||cached.data!==data||cached.array!==data.array||cached.version!==data.version||cached.count!==position.count){
  geometry.computeBoundingBox();cached={position,data,array:data.array,version:data.version,count:position.count,box:geometry.boundingBox?.clone()};geometryBounds.set(geometry,cached);
 }
 if(!cached.box||cached.box.isEmpty())return null;
 target.copy(cached.box).applyMatrix4(mesh.matrixWorld);
 return [...target.min.toArray(),...target.max.toArray()].every(Number.isFinite)?target:null;
}

// Full separating-axis test: 3 AABB faces, 3 affine-box faces, 9 edge crosses.
// This is only candidate selection. GPU face tests still gate each fragment.
export function reflectionProbeIntersectsBox(probe,box){
 if(box.isEmpty()||box.max.x<probe.minimum[0]||box.min.x>probe.maximum[0]||box.max.y<probe.minimum[1]||box.min.y>probe.maximum[1]||box.max.z<probe.minimum[2]||box.min.z>probe.maximum[2])return false;
 const v=probe.localBox;if(!v?.worldCenter||!v.halfAxes)return true;
 const mx=(box.min.x+box.max.x)*.5,my=(box.min.y+box.max.y)*.5,mz=(box.min.z+box.max.z)*.5,ex=(box.max.x-box.min.x)*.5,ey=(box.max.y-box.min.y)*.5,ez=(box.max.z-box.min.z)*.5,dx=mx-v.worldCenter[0],dy=my-v.worldCenter[1],dz=mz-v.worldCenter[2],edges=v.halfAxes;
 // Relative tolerance is homogeneous in the axis. No normalization, temporary
 // axes, per-vertex work or absolute world-unit epsilon is required.
 const overlap=(x,y,z)=>{
  const radius=ex*Math.abs(x)+ey*Math.abs(y)+ez*Math.abs(z)+Math.abs(edges[0][0]*x+edges[0][1]*y+edges[0][2]*z)+Math.abs(edges[1][0]*x+edges[1][1]*y+edges[1][2]*z)+Math.abs(edges[2][0]*x+edges[2][1]*y+edges[2][2]*z),distance=Math.abs(dx*x+dy*y+dz*z),tolerance=16*Number.EPSILON*(radius+distance+Math.abs(x)*(Math.abs(mx)+Math.abs(v.worldCenter[0]))+Math.abs(y)*(Math.abs(my)+Math.abs(v.worldCenter[1]))+Math.abs(z)*(Math.abs(mz)+Math.abs(v.worldCenter[2])));
  return distance<=radius+tolerance;
 };
 if(!overlap(1,0,0)||!overlap(0,1,0)||!overlap(0,0,1))return false;
 for(const row of [v.localX,v.localY,v.localZ])if(!overlap(row[0],row[1],row[2]))return false;
 for(const e of edges)if(!overlap(0,e[2],-e[1])||!overlap(-e[2],0,e[0])||!overlap(e[1],-e[0],0))return false;
 return true;
}
