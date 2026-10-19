import {vec3,vec4,float} from 'three/tsl';

// The ray parameter is unchanged by the affine transform. Intersect locally,
// then use that same distance on the world ray to address the captured cubemap.
export function gpuProbeVolumeNodes(u,point,ray,center){
 const p=vec4(point,1),local=vec3(u.localX.dot(p),u.localY.dot(p),u.localZ.dot(p)),direction=vec3(u.localX.xyz.dot(ray),u.localY.xyz.dot(ray),u.localZ.xyz.dot(ray)),edge=local.sub(u.minimum).min(u.maximum.sub(local)).mul(u.faceScale),distance=edge.x.min(edge.y).min(edge.z),outside=distance.lessThan(0),fade=outside.select(float(0),u.blend.greaterThan(0).select(distance.div(u.blend.greaterThan(0).select(u.blend,float(1))).clamp(0,1),float(1)));
 const exits=['x','y','z'].map(k=>{const r=direction[k],zero=r.equal(0),bound=r.greaterThan(0).select(u.maximum[k],u.minimum[k]);return zero.select(float(3.402823466e38),bound.sub(local[k]).div(zero.select(float(1),r)));}),hit=point.add(ray.mul(exits[0].min(exits[1]).min(exits[2]))).sub(center),projected=outside.select(ray,ray.x.notEqual(0).or(ray.y.notEqual(0)).or(ray.z.notEqual(0)).select(hit.dot(hit).greaterThan(1e-20).select(hit,ray),ray));return {local,direction,distance,fade,projected};
}
