// Opposing filtered normals can cancel exactly. Use the neutral tangent normal
// instead of asking a driver to normalize a zero vector.
export const normalMapContract=Object.freeze({version:1,encoding:'RGB [0,1] to signed tangent XYZ; strength multiplies XY before normalization',zeroLength:'neutral tangent normal [0,0,1]',filtering:'normalize after filtering; do not normalize encoded RGB as color',backends:Object.freeze(['cpu','d3d11','webgl2','webgpu']),resources:'no additional textures, GPU targets, readbacks or per-frame CPU work'});
export function decodeNormalMap(value,strength=1){
 const n=[(value[0]*2-1)*strength,(value[1]*2-1)*strength,value[2]*2-1],length=Math.hypot(...n);
 return length>0?n.map(v=>v/length):[0,0,1];
}
export const normalMapGLSL='vec3 hbDecodeNormalMap(vec3 value,float strength){vec3 n=vec3((value.xy*2.0-1.0)*strength,value.z*2.0-1.0);float size=length(n);return size>0.0?n/max(size,1e-20):vec3(0,0,1);}\n';
export function normalMapNode(T,value,strength){
 const n=T.vec3(value.xy.mul(2).sub(1).mul(strength),value.z.mul(2).sub(1)),size=n.length();
 return size.greaterThan(0).select(n.div(size.max(1e-20)),T.vec3(0,0,1));
}
