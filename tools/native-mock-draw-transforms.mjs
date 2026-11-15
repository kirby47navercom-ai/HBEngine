// Mock hosts (JS packet checks): applies a drawTransforms resource (ids + float64 world/normal rows) like the native bridge.
// Binary instance rows (float64, 44 per row) as the plain values array older mocks read.
export function instanceValues(r){if(r.values||!r.bytes)return r;const b=Buffer.from(r.bytes,'base64');return {...r,values:Array.from(new Float64Array(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)))};}
export function applyDrawTransforms(draws,r){
 const bytes=Buffer.from(r.matrices,'base64'),m=new Float64Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
 if(m.length!==r.ids.length*32)throw Error('drawTransforms size');
 r.ids.forEach((id,i)=>{const d=draws.get(id);if(!d)throw Error('drawTransforms target missing '+id);d.world=Array.from(m.subarray(i*32,i*32+16));d.normal=Array.from(m.subarray(i*32+16,i*32+32));});
 return r.ids.length;
}
