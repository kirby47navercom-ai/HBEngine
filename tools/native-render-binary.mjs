// Synchronous writes keep metadata and detached bytes contiguous with JSON RPC.
export function writeNativeRenderBinary(stream,text,buffers){
 const metadata=Buffer.from(text),size=buffers.reduce((sum,b)=>sum+b.byteLength,0);
 if(!metadata.length||!size||metadata.length+size>128*1024*1024||buffers.some(b=>!(b instanceof Uint8Array)))throw Error('Native binary upload size invalid');
 const header=Buffer.alloc(16);header.writeUInt32LE(0x52424800);header.writeUInt32LE(metadata.length,4);header.writeUInt32LE(size,8);header.writeUInt32LE(1,12);
 return new Promise((resolve,reject)=>{
  stream.cork();try{stream.write(header);stream.write(metadata);for(let i=0;i<buffers.length;i++)stream.write(buffers[i],i===buffers.length-1?error=>error?reject(error):resolve():undefined);}catch(error){reject(error);}finally{stream.uncork();}
 });
}
