// Mock hosts (JS packet checks): applies a drawTransforms resource (ids + float64 world/normal rows) like the native bridge.
export function applyDrawTransforms(draws,r){
 const bytes=Buffer.from(r.matrices,'base64'),m=new Float64Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
 if(m.length!==r.ids.length*32)throw Error('drawTransforms size');
 r.ids.forEach((id,i)=>{const d=draws.get(id);if(!d)throw Error('drawTransforms target missing '+id);d.world=Array.from(m.subarray(i*32,i*32+16));d.normal=Array.from(m.subarray(i*32+16,i*32+32));});
 return r.ids.length;
}
