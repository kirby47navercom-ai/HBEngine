import net from 'node:net';

export function nativeUIPipeHeader(frame,id){
 const {width,height,sequence,pixels}=frame,tiles=frame.encoding==='pipe-rgba8-premultiplied-tiles';
 if(!Number.isSafeInteger(id)||id<1||!Number.isSafeInteger(sequence)||sequence<1||!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>7680||height>4320||!Buffer.isBuffer(pixels)||(tiles?(sequence<2||pixels.length<4||pixels.length>=width*height*4):pixels.length!==width*height*4)||pixels.length>128*1024*1024)throw Error('Native binary UI frame invalid');
 const header=Buffer.alloc(40);header.writeUInt32LE(0x49554248,0);header.writeUInt32LE(1,4);header.writeBigUInt64LE(BigInt(id),8);header.writeBigUInt64LE(BigInt(sequence),16);header.writeUInt32LE(width,24);header.writeUInt32LE(height,28);header.writeUInt32LE(pixels.length,32);header.writeUInt32LE(tiles?2:0,36);return header;
}

export async function openNativeUIPipe(name){
 if(!name)return null;if(process.platform!=='win32'||!/^\\\\\.\\pipe\\HBEngine\.UI\.\d+\.\{[0-9a-f-]{36}\}$/i.test(name))throw Error('Native UI pipe path invalid');
 const socket=net.createConnection(name);let failed,closing=false;
 socket.on('error',error=>{failed=error;});await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{socket.destroy();reject(Error('Native UI pipe connection timeout'));},10000);socket.once('connect',()=>{clearTimeout(timer);resolve();});socket.once('error',error=>{clearTimeout(timer);reject(error);});});
 return {write(frame,id){const header=nativeUIPipeHeader(frame,id);if(closing)return Promise.reject(Error('Native UI pipe closed'));if(failed)return Promise.reject(failed);return new Promise((resolve,reject)=>{socket.cork();socket.write(header);socket.write(frame.pixels,error=>error?reject(error):resolve());socket.uncork();});},close(){if(closing)return;closing=true;if(failed||socket.destroyed){socket.destroy();return;}const header=Buffer.alloc(40);header.writeUInt32LE(0x49554248,0);header.writeUInt32LE(1,4);header.writeUInt32LE(1,36);socket.end(header);}};
}
