import net from 'node:net';

export function nativeUIPipeHeader(frame,id,protocol=1){
 const {width,height,sequence,pixels}=frame,tiles=frame.encoding==='pipe-rgba8-premultiplied-tiles';
 if(![1,2].includes(protocol)||!Number.isSafeInteger(id)||id<1||!Number.isSafeInteger(sequence)||sequence<1||!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>7680||height>4320||!Buffer.isBuffer(pixels)||(tiles?(sequence<2||pixels.length<4||pixels.length>=width*height*4):pixels.length!==width*height*4)||pixels.length>128*1024*1024)throw Error('Native binary UI frame invalid');
 const header=Buffer.alloc(40);header.writeUInt32LE(0x49554248,0);header.writeUInt32LE(protocol,4);header.writeBigUInt64LE(BigInt(id),8);header.writeBigUInt64LE(BigInt(sequence),16);header.writeUInt32LE(width,24);header.writeUInt32LE(height,28);header.writeUInt32LE(pixels.length,32);header.writeUInt32LE(tiles?2:0,36);return header;
}

export async function openNativeUIPipe(name,{acknowledged=false}={}){
 if(!name)return null;if(process.platform!=='win32'||!/^\\\\\.\\pipe\\HBEngine\.UI\.\d+\.\{[0-9a-f-]{36}\}$/i.test(name))throw Error('Native UI pipe path invalid');
 const socket=net.createConnection(name);let failed,closing=false,closingJob,pending,input=Buffer.alloc(0);
 const fail=error=>{failed??=error;if(pending){const p=pending;pending=null;clearTimeout(p.timer);p.reject(failed);}};
 socket.on('error',fail);socket.on('close',()=>{if(!closing)fail(Error('Native UI pipe closed'));});
 socket.on('data',bytes=>{try{
  if(!acknowledged||!pending)throw Error('Native UI reply without request');input=input.length?Buffer.concat([input,bytes]):bytes;
  if(input.length>4136)throw Error('Native UI reply too large');if(input.length<40)return;
  const length=input.readUInt32LE(20);if(input.readUInt32LE(0)!==0x41554248||input.readUInt32LE(4)!==1||input.readBigUInt64LE(8)!==BigInt(pending.id)||input.readUInt32LE(16)>1||length>4096||input.length>40+length)throw Error('Native UI reply invalid');if(input.length<40+length)return;
  const p=pending,ok=input.readUInt32LE(16),decode=input.readDoubleLE(24),present=input.readDoubleLE(32);pending=null;clearTimeout(p.timer);const error=input.subarray(40).toString('utf8');input=Buffer.alloc(0);if(!ok)p.reject(Error(error||'Native UI presentation failed'));else if(!Number.isFinite(decode)||decode<0||!Number.isFinite(present)||present<0){p.reject(Error('Native UI timing invalid'));socket.destroy();}else p.resolve({ok:true,nativeUiDecodeMS:decode,nativeUiPresentMS:present});
 }catch(error){fail(error);socket.destroy();}});
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{socket.destroy();reject(Error('Native UI pipe connection timeout'));},10000);socket.once('connect',()=>{clearTimeout(timer);resolve();});socket.once('error',error=>{clearTimeout(timer);reject(error);});});
 return {write(frame,id){
  const header=nativeUIPipeHeader(frame,id,acknowledged?2:1);if(closing)return Promise.reject(Error('Native UI pipe closed'));if(failed)return Promise.reject(failed);if(pending)return Promise.reject(Error('Native UI frame already pending'));
  let response;if(acknowledged)response=new Promise((resolve,reject)=>{const timer=setTimeout(()=>{fail(Error('Native UI acknowledgment timeout'));socket.destroy();},30000);pending={id,resolve,reject,timer};});
  const written=new Promise((resolve,reject)=>{try{socket.cork();socket.write(header);socket.write(frame.pixels,error=>{if(error){fail(error);reject(error);}else resolve();});socket.uncork();}catch(error){fail(error);reject(error);}});if(acknowledged){written.catch(()=>{});return response;}return written;
 },close(){if(closing)return closingJob;closing=true;fail(Error('Native UI pipe closed'));if(socket.destroyed){socket.destroy();return Promise.resolve();}const header=Buffer.alloc(40);header.writeUInt32LE(0x49554248,0);header.writeUInt32LE(acknowledged?2:1,4);header.writeUInt32LE(1,36);return closingJob=new Promise(resolve=>{socket.end(header,()=>{socket.destroy();resolve();});socket.once('close',resolve);});}};
}
