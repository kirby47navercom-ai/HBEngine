// Detach at render encoding, before the next simulation can edit the texture.
export class NativeUploadBytes {
 constructor(bytes){
  if(!ArrayBuffer.isView(bytes)||bytes.BYTES_PER_ELEMENT!==1)throw Error('Native upload byte view invalid');
  this.bytes=new Uint8Array(bytes);
 }
}

export function nativeBinaryUpload(resources,offset=0){
 const buffers=[];let size=offset;
 const json=JSON.stringify(resources,(_key,value)=>{
  if(!(value instanceof NativeUploadBytes))return value;
  const range=[size,value.bytes.byteLength];size+=range[1];buffers.push(value.bytes);return {$binary:range};
 });
 return {json,buffers,binaryBytes:size-offset};
}
